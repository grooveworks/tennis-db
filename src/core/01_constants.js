// ── React Hooks 分解代入（全コンポーネントで useState/useEffect 等を使えるように）─
const {useState,useEffect,useRef,useCallback,useMemo}=React;

// ── 定数定義（色・キー・バージョン）─────────────
const APP_VERSION="4.4.0-S18";
const font="-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif";

// 色設計（DESIGN_SYSTEM_v4.md §1 + §10 S13.5 改訂準拠）
// 2026-04-27 S13.5: Material Blue (#1a73e8) → Apple System Blue (#007AFF) に置換
// Primary (Apple System Blue)、Sessions カテゴリ (Orange/Green/Purple) 維持、Apple System 補助色追加
const C={
  // Surface (§1.5、S13.5 で bg を Apple System Gray 6 に微調整)
  bg:"#F2F2F7",panel:"#ffffff",panel2:"#f1f3f4",border:"#dadce0",divider:"#e8eaed",
  // Text (§1.4)
  text:"#202124",textSecondary:"#5f6368",textMuted:"#80868b",
  // Primary (§1.1、S13.5 で Apple System Blue に置換)
  primary:"#007AFF",primaryHover:"#0062CC",primaryLight:"#E1F0FF",
  // Sessions カテゴリ (§1.2、維持) — 左端色帯・アイコン色に使用
  tournamentAccent:"#f9ab00",tournamentLight:"#feefc3",
  practiceAccent:"#0f9d58",practiceMid:"#b7e1c9",practiceLight:"#e6f4ea",
  trialAccent:"#9334e0",trialLight:"#f3e8fd",
  // Semantic (§1.3、Info を Primary 連動で更新)
  info:"#007AFF",infoLight:"#E1F0FF",
  success:"#0f9d58",successLight:"#e6f4ea",
  warning:"#fbbc04",warningLight:"#fef7e0",
  error:"#d93025",errorLight:"#fce8e6",
  // Apple System 補助色 (§10.1 S13.5 新設、装飾アクセント用)
  appleMint:"#00C7BE",appleIndigo:"#5856D6",applePeach:"#FF9500",
  appleGray4:"#C7C7CC",  // チェック circle 未チェック border、ニュートラル境界
};

// 角丸ヒエラルキー (§10.3 S13.5 新設)
const RADIUS={card:20,row:14,btn:12,btnSm:10,badge:6};

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

// H-24 (Phase A 監査): UI 永続化用 LS キーを集約 (旧: SessionsTab.jsx 内 const、
//   app.jsx 内ハードコード文字列で重複定義されていた)
//   キー文字列は既存ユーザー値の互換のため変更なし (v4-sessions-* のまま)
// リクエスト 3 (Phase B): activeTab を追加 (タブ状態を localStorage 保存して reload 後復元)
const LS_UI_KEYS={
  sessionsSearch:"v4-sessions-search",
  sessionsFilters:"v4-sessions-filters",
  sessionsViewMode:"v4-sessions-viewmode",
  sessionsSearchOpen:"v4-sessions-search-open",
  activeTab:"v4-active-tab",
};
