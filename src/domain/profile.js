// profile.js — v2 profile を v4 profile に変換するヘルパー (S17.x Phase A1、3 者議論で確定)
//
// 設計方針:
//   - v2 → v4: 全 key を spread でコピーし、racket / stringing だけ delete (= Gear master が正)
//   - gearPolicy (= ギア判断基準のテキスト) を新規追加
//   - _schemaVersion で v2/v4 判別
//   - racket / stringing は移植しない
//   - derivedStats / inferredLevel は Phase A1 では作らない
//   - legacyProfile はアプリ内に保持しない (履歴は Firestore で残る)
//   - bundle 増を最小化するため配列リテラル不使用、spread + delete で実装

function normalizeProfile(p) {
  if (!p || typeof p !== "object") return null;
  if (p._schemaVersion === "v4-1") return p;
  const v4 = { ...p };
  delete v4.racket;
  delete v4.stringing;
  if (v4.gearPolicy === undefined) v4.gearPolicy = "";
  v4._schemaVersion = "v4-1";
  return v4;
}
