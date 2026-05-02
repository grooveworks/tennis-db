// summarize.js — Cloud Functions の summarizeMemo を呼ぶクライアント側ヘルパー
//
// 呼び出し方:
//   const result = await summarizeMemoText(text, fieldType);
//   result.summary が要約結果。失敗時は null を返す (呼び出し側で line-clamp フォールバック)
//
// 設計:
//   - メモが短い (60 文字未満) なら要約せず元の文をそのまま返す (Cloud Functions 側で同じ判定、ただし
//     ネットワーク往復を避けるためクライアント側でも先に判定)
//   - エラー時は null を返す。例外は呼び出し側に流さない (UX を止めない)
//   - 1 セッションに同一メモを重複呼びしないよう、簡易キャッシュ (in-memory Map) を持つ
//
// メモのフィールドタイプ別の要約スタイルは Cloud Functions 側で対応 (fieldType を渡すだけ)

const _summaryCache = new Map(); // key = `${fieldType}|${text}`, value = summary string

// S16.11 C5: auth 切替で cache を必ずクリア (前ユーザーの要約が後ユーザーに漏れる経路を遮断)
//   onAuthStateChanged を購読、別ユーザーのセッションに切替時即座に Map.clear()
if (typeof fbAuth !== "undefined" && fbAuth?.onAuthStateChanged) {
  fbAuth.onAuthStateChanged(() => {
    _summaryCache.clear();
  });
}

async function summarizeMemoText(text, fieldType) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  // 短いメモはそのまま (要約不要)
  if (trimmed.length < 60) return trimmed;

  const cacheKey = `${fieldType || ""}|${trimmed}`;
  if (_summaryCache.has(cacheKey)) return _summaryCache.get(cacheKey);

  try {
    const callable = fbFunctions.httpsCallable("summarizeMemo");
    const result = await callable({ memo: trimmed, fieldType: fieldType || "" });
    const summary = result?.data?.summary || null;
    if (summary) _summaryCache.set(cacheKey, summary);
    return summary;
  } catch (err) {
    console.error("summarizeMemo failed:", err?.message || err);
    return null;
  }
}

// セッション (tournament / practice / trial / match) の memo フィールドを一括要約
// 戻り値: { fieldKey: summaryString, ... } 失敗フィールドは含めない
//
// MEMO_FIELD_KEYS は type 別に「要約対象のフィールド名」を定義
const MEMO_FIELD_KEYS = {
  tournament: ["generalNote"],
  practice:   ["generalNote", "focus", "coachNote", "goodNote", "improveNote"],
  trial:      ["generalNote", "strokeNote", "serveNote", "volleyNote"],
  match:      ["mentalNote", "techNote", "opponentNote", "note"],
};

async function summarizeSessionMemos(type, item) {
  const keys = MEMO_FIELD_KEYS[type] || [];
  if (keys.length === 0) return {};

  const existing = item?.memoSummaries || {};
  const out = {};
  // 並列実行 (Promise.all)、各フィールド独立
  // 既に要約済 (existing[k] あり) のフィールドはスキップ (バックフィル時の API コスト節約)
  const tasks = keys.map(async (k) => {
    if (existing[k] && existing[k].trim()) return; // 既に要約済
    const text = item?.[k];
    if (!text || typeof text !== "string" || text.trim().length < 60) return;
    const summary = await summarizeMemoText(text, k);
    if (summary && summary !== text.trim()) {
      out[k] = summary;
    }
  });
  await Promise.all(tasks);
  return out;
}
