// ── React Hooks 分解代入（全コンポーネントで useState/useEffect 等を使えるように）─
const {useState,useEffect,useRef,useCallback,useMemo}=React;

// ── 定数定義（色・キー・バージョン）─────────────
const APP_VERSION="4.0.0-S7";
const font="-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif";

// 色設計（DESIGN_SYSTEM_v4.md §1 準拠）
// Primary (青) を主色、Sessions カテゴリ (Orange/Green/Purple)、Semantic (Info/Success/Warning/Error)
const C={
  // Surface (§1.5)
  bg:"#f8f9fa",panel:"#ffffff",panel2:"#f1f3f4",border:"#dadce0",divider:"#e8eaed",
  // Text (§1.4)
  text:"#202124",textSecondary:"#5f6368",textMuted:"#80868b",
  // Primary (§1.1)
  primary:"#1a73e8",primaryHover:"#1765cc",primaryLight:"#e8f0fe",
  // Sessions カテゴリ (§1.2) — 左端色帯・アイコン色に使用
  tournamentAccent:"#f9ab00",tournamentLight:"#feefc3",
  practiceAccent:"#0f9d58",practiceLight:"#e6f4ea",
  trialAccent:"#9334e0",trialLight:"#f3e8fd",
  // Semantic (§1.3)
  info:"#1a73e8",infoLight:"#e8f0fe",
  success:"#0f9d58",successLight:"#e6f4ea",
  warning:"#fbbc04",warningLight:"#fef7e0",
  error:"#d93025",errorLight:"#fce8e6",
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
