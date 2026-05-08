// master_cleanup — master 整理 (マージ・置換) の汎用純関数 (S17 Phase 2 抜本対応)
//
// 役割: master 系 (venue / racketName / stringMain / stringCross / opponent / level) で
//   名前ゆれ・誤入力・存在しない entry を「source → target」に統合する処理を共通化
//
// 設計方針 (memory: feedback_data_destruction_2026_05_03.md 準拠):
//   - 純関数 (副作用なし、React 非依存)、tests/run.html で unit test 可能
//   - 値変換は「source 一致のみ target に置換」、それ以外は不変 (rounding/clamping 禁止)
//   - 影響セッションは事前算出 → ユーザーが個別チェックで選択 → 選択分のみ置換 (暗黙確定禁止)
//   - 複数 collection (tournaments / practices / trials) と複数 keyPath を統一処理
//
// 使い方:
//   const matches = findSessionsUsing(tournaments, ["venue"], "イトマンテニス");
//   // user が selectedIds を選ぶ (個別チェック)
//   const updated = applyCleanup(tournaments, ["venue"], "イトマンテニス", "イトマン新所沢", selectedIds);

// ── master 種別定義 (どの collection の どの keyPath を見るか)
//   keyPath: "venue" = 単純キー / "matches[].racketName" = ネスト配列のフィールド
const MASTER_CLEANUP_DEFS = {
  venue: {
    label: "会場",
    collections: [
      { key: "tournaments", keyPaths: ["venue"] },
      { key: "practices",   keyPaths: ["venue"] },
      { key: "trials",      keyPaths: ["venue"] },
    ],
  },
  racketName: {
    label: "ラケット",
    collections: [
      { key: "tournaments", keyPaths: ["racketName", "matches[].racketName"] },
      { key: "practices",   keyPaths: ["racketName"] },
      { key: "trials",      keyPaths: ["racketName"] },
    ],
  },
  stringMain: {
    label: "縦糸",
    collections: [
      { key: "tournaments", keyPaths: ["stringMain", "matches[].stringMain"] },
      { key: "practices",   keyPaths: ["stringMain"] },
      { key: "trials",      keyPaths: ["stringMain"] },
    ],
  },
  stringCross: {
    label: "横糸",
    collections: [
      { key: "tournaments", keyPaths: ["stringCross", "matches[].stringCross"] },
      { key: "practices",   keyPaths: ["stringCross"] },
      { key: "trials",      keyPaths: ["stringCross"] },
    ],
  },
  opponent: {
    label: "対戦相手",
    collections: [
      { key: "tournaments", keyPaths: ["matches[].opponent", "matches[].opponent2"] },
    ],
  },
  level: {
    label: "クラス",
    collections: [
      { key: "tournaments", keyPaths: ["level"] },
    ],
  },
};

// ── 1 セッションが masterName を keyPath で使っているかチェック
//   keyPath: "venue" or "matches[].racketName"
function _sessionMatchesMaster(session, keyPath, masterName) {
  if (!session || !keyPath || !masterName) return false;
  if (!keyPath.includes("[]")) {
    return session[keyPath] === masterName;
  }
  // ネスト: "matches[].racketName" → arrayKey="matches", rest="racketName"
  const [arrayKey, restKey] = keyPath.split("[].");
  const arr = session[arrayKey];
  if (!Array.isArray(arr)) return false;
  return arr.some(item => item && item[restKey] === masterName);
}

// ── items 配列 (1 collection 分) の中で、keyPaths のいずれかで masterName を使う session を抽出
//   戻り値: matched session の配列 (元の session オブジェクトをそのまま返す、副作用なし)
function findSessionsUsing(items, keyPaths, masterName) {
  if (!Array.isArray(items) || !Array.isArray(keyPaths) || !masterName) return [];
  return items.filter(s => keyPaths.some(kp => _sessionMatchesMaster(s, kp, masterName)));
}

// ── 全 collection を横断して、masterType を使う session を集める
//   tournaments/practices/trials を { collectionsByKey: {tournaments, practices, trials} } で受け取る
//   戻り値: { tournaments: [...], practices: [...], trials: [...] }、各 array は session 配列
//   masterType: "venue" | "racketName" | "stringMain" | "stringCross" | "opponent" | "level"
function findAllSessionsUsing(collectionsByKey, masterType, masterName) {
  const def = MASTER_CLEANUP_DEFS[masterType];
  if (!def || !masterName) return {};
  const result = {};
  for (const c of def.collections) {
    const items = collectionsByKey[c.key] || [];
    result[c.key] = findSessionsUsing(items, c.keyPaths, masterName);
  }
  return result;
}

// ── 1 session の keyPath を sourceName → targetName に置換した新 session を返す
//   選択されている前提 (selectedIds チェックは applyCleanup 側)
//   sourceName 一致のみ置換、それ以外は不変
function _replaceMasterInSession(session, keyPaths, sourceName, targetName) {
  if (!session) return session;
  let updated = session;
  for (const kp of keyPaths) {
    if (!kp.includes("[]")) {
      if (updated[kp] === sourceName) {
        updated = { ...updated, [kp]: targetName };
      }
    } else {
      const [arrayKey, restKey] = kp.split("[].");
      const arr = updated[arrayKey];
      if (!Array.isArray(arr)) continue;
      let changed = false;
      const newArr = arr.map(item => {
        if (item && item[restKey] === sourceName) {
          changed = true;
          return { ...item, [restKey]: targetName };
        }
        return item;
      });
      if (changed) {
        updated = { ...updated, [arrayKey]: newArr };
      }
    }
  }
  return updated;
}

// ── items の中で selectedIds に含まれる session のみ keyPaths で sourceName → targetName 置換
//   戻り値: 新 items 配列 (選択外 session はそのまま、選択された session は置換 or 不変)
function applyCleanup(items, keyPaths, sourceName, targetName, selectedIds) {
  if (!Array.isArray(items) || !Array.isArray(keyPaths) || !sourceName || !targetName) return items || [];
  const sel = (selectedIds instanceof Set) ? selectedIds : new Set(Array.isArray(selectedIds) ? selectedIds : []);
  return items.map(s => {
    if (!s || !s.id) return s;
    if (!sel.has(s.id)) return s;
    return _replaceMasterInSession(s, keyPaths, sourceName, targetName);
  });
}

// ── 全 collection に対して applyCleanup を一括実行
//   戻り値: { tournaments: [...], practices: [...], trials: [...] } の更新後配列
//   selectedIdsByCollection: { tournaments: Set, practices: Set, trials: Set }
function applyCleanupAll(collectionsByKey, masterType, sourceName, targetName, selectedIdsByCollection) {
  const def = MASTER_CLEANUP_DEFS[masterType];
  if (!def) return collectionsByKey;
  const result = {};
  for (const c of def.collections) {
    const items = collectionsByKey[c.key] || [];
    const sel = (selectedIdsByCollection || {})[c.key] || new Set();
    result[c.key] = applyCleanup(items, c.keyPaths, sourceName, targetName, sel);
  }
  return result;
}

// ── セッションのプレビュー文字列生成 (UI 用、type 別に主要メタを表示)
//   "2026-04-22 練習 90 分 心拍 116" のような短文
function describeSessionForCleanup(session, type) {
  if (!session) return "";
  const date = session.date || "(日付不明)";
  if (type === "tournaments") {
    const title = session.name || "(無題大会)";
    const result = session.overallResult ? ` ・ ${session.overallResult}` : "";
    return `${date} 大会 ${title}${result}`;
  }
  if (type === "practices") {
    const dur = session.duration ? `${session.duration}分` : "";
    const venue = session.venue ? ` ・ ${session.venue}` : "";
    const hr = session.heartRateAvg ? ` ・ 心拍 ${session.heartRateAvg}` : "";
    return `${date} 練習${dur ? " " + dur : ""}${venue}${hr}`.trim();
  }
  if (type === "trials") {
    const racket = session.racketName || "";
    const judgment = session.judgment ? ` (${session.judgment})` : "";
    return `${date} 試打 ${racket}${judgment}`;
  }
  return `${date} ${type}`;
}
