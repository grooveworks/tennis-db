// 比較ページ/リーダーのデータを、本人しか読めない Firestore パスへ分割アップロード
// パス: users/{uid}/cloudpages/{name}__meta / {name}__{i}
// 既存ルール (users/{uid} 配下は本人のみ R/W) にそのまま乗る = ルール変更不要
// 使い方: node .claude/cloud-upload.js "<adminキーのパス>" [--apply]  (既定は dry-run)
const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));

const KEY = process.argv[2];
const APPLY = process.argv.includes("--apply");
const UID = "wsJSwhZSbKgwCFP3589KFrghB7F2"; // 本人 (data-latest.json の _uid・メール一致確認済み)
const CHUNK = 300 * 1024; // 文字数基準。日本語=UTF-8で3バイト/文字 → 最大約900KB = Firestore 1MB制限内

function extractData(file) {
  const h = fs.readFileSync(file, "utf-8");
  // var DATA (従来ページ) / window.SC_DATA (デザイン方式のストリングPC版) の両対応
  const m = h.match(/(?:var DATA|window\.SC_DATA) = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("DATA/SC_DATA が見つからない: " + file);
  return m[1];
}

const ROOT = path.join(__dirname, "..");
const BLOBS = {
  strings: extractData(path.join(ROOT, "gear", "racketpedia", "string_compare.html")),
  rackets: extractData(path.join(ROOT, "gear", "racketpedia", "racket_compare.html")),
  reader: extractData(path.join(ROOT, "gear", "tennisone", "reader.html")),
};

(async () => {
  console.log("対象uid:", UID, APPLY ? "(本適用)" : "(dry-run)");
  let plan = [];
  for (const [name, json] of Object.entries(BLOBS)) {
    const parts = [];
    for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
    plan.push({ name, bytes: json.length, parts: parts.length });
    if (APPLY) {
      admin.apps.length || admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
      const col = admin.firestore().collection("users").doc(UID).collection("cloudpages");
      for (let i = 0; i < parts.length; i++) {
        await col.doc(`${name}__${i}`).set({ part: parts[i] });
      }
      await col.doc(`${name}__meta`).set({
        total: parts.length, bytes: json.length,
        updatedAt: new Date().toISOString(),
      });
      console.log(`  アップロード完了: ${name} (${parts.length}分割)`);
    }
  }
  console.table(plan);
  if (!APPLY) console.log("dry-run のみ。実行は --apply を付ける");
  process.exit(0);
})().catch(e => { console.error("エラー:", e.message); process.exit(1); });
