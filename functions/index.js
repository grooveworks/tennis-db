// Tennis DB v4 Cloud Functions
// summarizeMemo: メモ本文を Anthropic Claude Haiku で 1-2 行に要約する HTTPS Callable
//
// 設計方針:
//   - 認証: callable は context.auth で自動チェック (未ログインは reject)
//   - API キー: Firebase Functions secret として保存、env から読み出し (コードに埋め込まない)
//   - モデル: claude-haiku-4-5 (低コスト・低レイテンシ)
//   - 入出力: { memo: string, fieldType: string } → { summary: string, original: string }
//   - 失敗時: throw HttpsError、クライアント側は要約なしフォールバックで line-clamp 表示

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk").default;

// Anthropic API キーを Firebase secret として宣言
//   コンソールから値を入力する: `firebase functions:secrets:set ANTHROPIC_API_KEY`
//   ローカル emulator では .env で上書き可能
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// メモの種別 (フォーカス / コーチメモ / 総括 / 試合・メンタル など) ごとの要約スタイル指示
function _styleHint(fieldType) {
  switch (fieldType) {
    case "focus":      return "練習で意識した動作・狙いを 1 行で";
    case "coachNote":  return "コーチからの指摘の要点を 1 行で";
    case "goodNote":   return "良かった点・成功体験の核を 1 行で";
    case "improveNote":return "改善が必要だった点の核を 1 行で";
    case "mentalNote": return "メンタル・心理状態の要点を 1 行で";
    case "techNote":   return "技術メモの要点を 1 行で";
    case "opponentNote": return "対戦相手の特徴・戦略の要点を 1 行で";
    case "generalNote":return "総括・所感の中で次に活かすべき要点を 1 行で";
    case "strokeNote":
    case "serveNote":
    case "volleyNote": return "試打評価の核となる感触・特徴を 1 行で";
    case "note":       return "試合メモの要点を 1 行で";
    default:           return "テニスのメモを次に振り返る時に思い出すための要点を 1 行で";
  }
}

// ===================================================================
// planAssist: Plan タブの AI 補助 (S17.x 段階 1+2)
//   mode = "organizeStrategy"   : 長文メモ → 5 項目 (各 30 字以内) に短文化
//   mode = "generateResetPhrase": strategy[] + 目標/テーマ → チェンジオーバー用リセット文 1 つ
//   設計方針 (DECISIONS S17 + ChatGPT 整理):
//     - AI は補助役、決定はユーザー (採用 / 編集して採用 / 破棄)
//     - 不安を増やす表現を避ける、抽象論禁止
//     - 試合中に読める短文 (= iPhone 1〜2 行)
// ===================================================================
exports.planAssist = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: "asia-northeast1",
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const mode = String(request.data?.mode || "").trim();
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    if (mode === "organizeStrategy") {
      const longText = String(request.data?.longText || "").trim();
      if (longText.length < 30) {
        throw new HttpsError("invalid-argument", "メモが短すぎます (30 字以上)");
      }
      const clipped = longText.slice(0, 4000);
      const prompt = [
        "次のテニス試合の作戦メモを、試合中に見返せる短文 5 項目以内に整理してください。",
        "ルール (厳守):",
        "- 日本語",
        "- 1 項目 30 文字以内",
        "- 5 項目以内 (重要度順、足りなければそれ以下でOK)",
        "- 各項目は 1 行で完結",
        "- 試合中に汗を拭きながら一瞥で読める短さ",
        "- 抽象論や定型句は省く",
        "- 不安を増やす表現を避ける",
        "- 番号 (1. 2. ...) や bullet (・) を付けない、本文のみ",
        "- 出力は項目を改行で区切る (1 項目 = 1 行)",
        "",
        "元のメモ:",
        clipped,
      ].join("\n");
      let items = [];
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });
        const block = (response.content || []).find(b => b.type === "text");
        const text = (block?.text || "").trim();
        items = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 5);
      } catch (err) {
        console.error("Anthropic API error (organizeStrategy):", err?.message || err);
        throw new HttpsError("internal", "Strategy 整理に失敗しました", err?.message);
      }
      if (items.length === 0) throw new HttpsError("internal", "AI 出力が空でした");
      return { items, original: longText };
    }

    if (mode === "generateResetPhrase") {
      const strategy = Array.isArray(request.data?.strategy) ? request.data.strategy : [];
      const targetGoal = String(request.data?.targetGoal || "").trim();
      const targetTheme = String(request.data?.targetTheme || "").trim();
      if (strategy.length === 0) {
        throw new HttpsError("invalid-argument", "Strategy 項目が空です");
      }
      const promptLines = [
        "次の試合作戦から、試合中のチェンジオーバーで自分を戻すための短文を 1 つ作ってください。",
        "ルール (厳守):",
        "- 日本語",
        "- 60 文字以内 (絶対に超えないこと)",
        "- 1〜2 行に収まる長さ",
        "- 「次の 2 ゲーム」 に集中するための言葉",
        "- 試合中に汗を拭きながら一瞥で読める短さ",
        "- 抽象論禁止、具体的な動作 / 意識",
        "- 不安を増やす表現を避ける",
        "- 余計な前置き (「リセット文:」など) は付けない、本文のみ",
        "",
      ];
      if (targetGoal) promptLines.push(`目標: ${targetGoal}`);
      if (targetTheme) promptLines.push(`テーマ: ${targetTheme}`);
      promptLines.push("作戦:");
      strategy.forEach(s => promptLines.push(`- ${s}`));
      const prompt = promptLines.join("\n");
      let resetPhrase = "";
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });
        const block = (response.content || []).find(b => b.type === "text");
        resetPhrase = (block?.text || "").trim();
      } catch (err) {
        console.error("Anthropic API error (generateResetPhrase):", err?.message || err);
        throw new HttpsError("internal", "リセット文生成に失敗しました", err?.message);
      }
      if (!resetPhrase) throw new HttpsError("internal", "AI 出力が空でした");
      // 60 字以内に丸める (AI が超えた場合の保険)
      if (resetPhrase.length > 80) resetPhrase = resetPhrase.slice(0, 80);
      return { resetPhrase };
    }

    throw new HttpsError("invalid-argument", "Unknown mode: " + mode);
  }
);

exports.summarizeMemo = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: "asia-northeast1", // 東京リージョン (低レイテンシ)
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: true, // 同オリジンでない localhost や本番 GitHub Pages から呼ぶため
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const memo = String(request.data?.memo || "").trim();
    const fieldType = String(request.data?.fieldType || "").trim();

    // 短すぎるメモは要約不要 (そのまま返す)
    if (memo.length < 60) {
      return { summary: memo, original: memo, skipped: "too_short" };
    }
    // 長すぎるメモは安全のため切り詰め (1 メモで API コスト爆発を防ぐ)
    const clipped = memo.slice(0, 4000);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // リクエスト 31-2 補修 (B): 出力長を厳守させる (旧 60 文字 → 42 文字 = iPhone 縦表示で必ず 2 行以内)
    const prompt = [
      "次のテニスのメモを、後で振り返った時に思い出すための短い要約に直してください。",
      "ルール (厳守):",
      "- 日本語",
      "- 必ず 42 文字以内 (絶対に超えないこと)",
      "- iPhone の狭い画面で 1〜2 行に収まる長さ",
      "- 元のメモの中で「次に活かす要点」「印象に残る部分」を抜く",
      "- 装飾語句や定型句は省く",
      "- 余計な前置き (「要約:」など) は付けない、要約本文のみ返す",
      `- ${_styleHint(fieldType)}`,
      "",
      "元のメモ:",
      clipped,
    ].join("\n");

    let summary = "";
    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      const block = (response.content || []).find(b => b.type === "text");
      summary = (block?.text || "").trim();
    } catch (err) {
      console.error("Anthropic API error:", err?.message || err);
      throw new HttpsError("internal", "要約生成に失敗しました", err?.message);
    }

    if (!summary) {
      throw new HttpsError("internal", "要約が空でした");
    }

    return { summary, original: memo };
  }
);
