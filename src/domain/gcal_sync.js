// gcal_sync.js — Google カレンダー自動同期の client 側 (Cloud Functions gcalSync 呼出)
//
// 設計 (DESIGN_LOG 2026-07-03):
//   - Function は読み取り専用プロキシ (fetch + 展開 + 仕分けのみ)。
//     Firestore への書き込みは app.jsx 側のマージ (新規 id のみ追加) が唯一の経路。
//   - 返却は calendar_import.json v30 互換 { tournaments, practices, trials, stats }
//   - URL は設定画面でユーザーが貼る (KEYS.gcalConfig に保存、コード埋め込み禁止)
//
// 失敗時: throw。呼び出し側 (app.jsx) が 手動=toast / 自動=console で処理。

async function gcalSyncFetch(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter((u) => u && u.trim());
  if (list.length === 0) {
    throw new Error("カレンダー URL が未設定です (設定画面で貼り付けてください)");
  }
  if (typeof fbFunctions === "undefined" || !fbFunctions) {
    throw new Error("Firebase Functions が初期化されていません");
  }
  const callable = fbFunctions.httpsCallable("gcalSync");
  const result = await callable({ urls: list });
  const data = result && result.data;
  if (!data || (!Array.isArray(data.tournaments) && !Array.isArray(data.practices))) {
    throw new Error("同期結果が空でした");
  }
  return {
    tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
    practices: Array.isArray(data.practices) ? data.practices : [],
    trials: Array.isArray(data.trials) ? data.trials : [],
    stats: data.stats || {},
  };
}
