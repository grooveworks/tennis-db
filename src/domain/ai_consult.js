// ai_consult.js — Cloud Functions の aiConsult を呼ぶ client helper (B = 文脈つき AI 相談)
//
// 使い方:
//   const { answer } = await aiConsult(question, history, mode);
//
//   - question : string  (必須)
//   - history  : [{role:"user"|"assistant", content:string}]  (任意、多ターン用)
//   - mode     : "fast"(既定, 試合中・速い/安い haiku) | "deep"(深掘り sonnet)
//
// 仕組み:
//   functions/index.js の aiConsult endpoint が、Firestore の文脈(決定/状態 + 現データ)を
//   関数側で読み、ユーザーの議論原則を焼いた system prompt で答える。
//   クライアントは質問(と会話履歴)だけ送る = ゼロ摩擦。
//
// Cloud Functions deploy が必要 (= ユーザー作業):
//   firebase deploy --only functions
//   (未 deploy だと NOT_FOUND エラー。summarizeMemo / planAssist と同じ仕組み)
//
// 失敗時:
//   throw する。呼び出し側で catch して UI に「AI相談に失敗しました」を表示。
async function aiConsult(question, history, mode) {
  const q = (question || "").trim();
  if (!q) throw new Error("質問が空です");
  if (typeof fbFunctions === "undefined" || !fbFunctions) {
    throw new Error("Firebase Functions が初期化されていません (オフライン時は相談不可)");
  }
  const callable = fbFunctions.httpsCallable("aiConsult");
  const result = await callable({
    question: q,
    history: Array.isArray(history) ? history.slice(-20) : [],
    mode: mode === "deep" ? "deep" : "fast",
  });
  const answer = (result?.data?.answer || "").trim();
  if (!answer) throw new Error("AI出力が空でした");
  return {
    answer,
    model: result?.data?.model || "",
    usage: result?.data?.usage || null,
  };
}
