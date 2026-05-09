// plan_assist.js — Plan タブの AI 補助 (Cloud Functions planAssist 呼出)
//
// 段階導入計画 (DECISIONS_v4.md S17 / ChatGPT 整理):
//   段階 1: aiOrganizeStrategy(longText) → 5 項目以内の短文配列
//   段階 2: aiGenerateResetPhrase(strategy, targetGoal, targetTheme) → 試合中リセット文 1 つ
//
// API キー:
//   functions/index.js の planAssist endpoint で Anthropic Claude Haiku を呼ぶ。
//   Firebase Functions secret に ANTHROPIC_API_KEY 設定済 (summarizeMemo と同パターン)。
//
// Cloud Functions deploy が必要 (= ユーザー作業):
//   firebase deploy --only functions
//
// 失敗時:
//   throw HttpsError されたら呼び出し側で catch、UI に「AI 接続に失敗しました」表示。

async function aiOrganizeStrategy(longText) {
  const trimmed = (longText || "").trim();
  if (trimmed.length < 30) {
    throw new Error("メモが短すぎます (30 文字以上必要)");
  }
  if (typeof fbFunctions === "undefined" || !fbFunctions) {
    throw new Error("Firebase Functions が初期化されていません");
  }
  const callable = fbFunctions.httpsCallable("planAssist");
  const result = await callable({ mode: "organizeStrategy", longText: trimmed });
  const items = Array.isArray(result?.data?.items) ? result.data.items : [];
  if (items.length === 0) throw new Error("AI 出力が空でした");
  return items;
}

async function aiGenerateResetPhrase(strategy, targetGoal, targetTheme) {
  const arr = Array.isArray(strategy) ? strategy.filter(s => s && s.trim()) : [];
  if (arr.length === 0) {
    throw new Error("作戦項目が空です (先に Strategy を作成してください)");
  }
  if (typeof fbFunctions === "undefined" || !fbFunctions) {
    throw new Error("Firebase Functions が初期化されていません");
  }
  const callable = fbFunctions.httpsCallable("planAssist");
  const result = await callable({
    mode: "generateResetPhrase",
    strategy: arr,
    targetGoal: (targetGoal || "").trim(),
    targetTheme: (targetTheme || "").trim(),
  });
  const resetPhrase = (result?.data?.resetPhrase || "").trim();
  if (!resetPhrase) throw new Error("AI 出力が空でした");
  return resetPhrase;
}
