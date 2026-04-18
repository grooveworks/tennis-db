// ── 定数定義（色・キー・バージョン）─────────────
const APP_VERSION="4.0.0-S1";
const font="-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif";

// 色設計（v3 の WCAG 違反を反省し、3段階の情報階層を明示）
// text: 主情報 AAA 16.5:1 (on white)
// textSecondary: 副情報 AAA 11.7:1
// textMuted: 補助情報 AA+ 6.1:1（v3 の textMuted/textDim を統合）
const C={
  bg:"#f2f2f7",panel:"#fff",panel2:"#f5f5f7",border:"#e0e0e4",
  text:"#1a1a1a",
  textSecondary:"#3a3a3c",
  textMuted:"#5a5a5f",
  accent:"#00b87a",accentBg:"rgba(0,184,122,0.08)",
  red:"#dc2626",redBg:"#fef2f2",
  blue:"#2563eb",blueBg:"rgba(37,99,235,0.08)",
  yellow:"#f59e0b",yellowBg:"rgba(245,158,11,0.08)",
  purple:"#7c3aed",purpleBg:"rgba(124,58,237,0.08)",
};

// localStorage プレフィックス（v2 時代から継承。変更禁止）
const LS_PREFIX="yuke-";

// データ種別キー（v3 と同一。Firestore パス users/{uid}/data/{KEY} と一致）
const KEYS={
  tournaments:"tournaments",practices:"practices",trials:"trials",
  rackets:"rackets",strings:"strings",measurements:"measurements",
  mental:"mental",next:"next",profile:"profile",
  venues:"venues",stringSetups:"stringSetups",
  quickTrialCards:"quickTrialCards",opponents:"opponents",
};
