// racket_string_compat — racket の現在のセッティング (string/tension) スキーマ互換ヘルパ
//
// 経緯 (S17 Phase 3.5):
//   v2/v3/初期 v4 では racket オブジェクトに `currentString` / `currentTension` を
//   1 フィールドずつ文字列で保持していた (例: "Blast 1.25 / PTP 1.25" / "47/45")。
//   試打/練習/大会 form は 4 フィールド (stringMain/stringCross/tensionMain/tensionCross)
//   で UI も Combobox + NumWheel で運用しており、racket だけ取り残されていた。
//   S17 Phase 3.5 で 4 フィールドに統一 (currentStringMain/Cross, currentTensionMain/Cross)。
//
// 互換戦略 (戦略 2 = 新フィールドのみ書く + 旧 fallback):
//   - 保存時: 新 4 フィールドのみ書く (旧 currentString/currentTension は触らない)
//   - 読み込み時: 新フィールドが空なら旧フィールドから split 推定
//   - V3 共有運用は基本不要 (V4 が主、不具合時のみ V2/V3 を触る) なので
//     旧フィールドを書き換えなくても実害なし。

function _splitStringPair(s) {
  if (!s) return { main: "", cross: "" };
  const parts = String(s).split(/[\/／]/).map(t => t.trim()).filter(Boolean);
  if (parts.length === 0) return { main: "", cross: "" };
  if (parts.length === 1) return { main: parts[0], cross: "" };
  return { main: parts[0], cross: parts[1] };
}

function _splitTensionPair(s) {
  if (s === undefined || s === null || s === "") return { main: "", cross: "" };
  const str = String(s);
  // "47/45" "47p/45p" "47 / 45" 等 (区切り = / または ／)
  const m = str.match(/(\d+(?:\.\d+)?)\s*[\/／]\s*(\d+(?:\.\d+)?)/);
  if (m) return { main: m[1], cross: m[2] };
  // 単一値 "43" "43p" → 縦のみ採用、横は空
  const single = str.match(/(\d+(?:\.\d+)?)/);
  if (single) return { main: single[1], cross: "" };
  return { main: "", cross: "" };
}

// 現在のストリング: 新 4 フィールド > 旧 currentString > V2 string の順で fallback
// (V2 の rackets は `string` / `tension` だけのデータが Firestore に残っているケースあり)
function getRacketString(racket) {
  if (!racket) return { main: "", cross: "" };
  if (racket.currentStringMain || racket.currentStringCross) {
    return {
      main: racket.currentStringMain || "",
      cross: racket.currentStringCross || "",
    };
  }
  if (racket.currentString) return _splitStringPair(racket.currentString);
  if (racket.string || racket.stringCross) {
    // V2 形式: stringCross が独立フィールドであることもあれば、string に "A / B" で結合済もある
    if (racket.stringCross) {
      return { main: racket.string || "", cross: racket.stringCross || "" };
    }
    return _splitStringPair(racket.string);
  }
  return { main: "", cross: "" };
}

// 現在のテンション: 新 4 フィールド > 旧 currentTension > V2 tension の順で fallback
function getRacketTension(racket) {
  if (!racket) return { main: "", cross: "" };
  if (racket.currentTensionMain || racket.currentTensionCross) {
    return {
      main: racket.currentTensionMain || "",
      cross: racket.currentTensionCross || "",
    };
  }
  if (racket.currentTension) return _splitTensionPair(racket.currentTension);
  if (racket.tension) return _splitTensionPair(racket.tension);
  return { main: "", cross: "" };
}

// 表示用に "メイン / クロス" or "メイン" を返す (cross が空 or main と同じなら main のみ)
function formatRacketStringDisplay(racket) {
  const { main, cross } = getRacketString(racket);
  if (!main && !cross) return "";
  if (!cross || cross === main) return main;
  return `${main} / ${cross}`;
}

// 表示用に "47/45" or "47" を返す (cross が空 or main と同じなら main のみ)
function formatRacketTensionDisplay(racket) {
  const { main, cross } = getRacketTension(racket);
  if (!main && !cross) return "";
  if (!cross || cross === main) return main;
  return `${main}/${cross}`;
}
