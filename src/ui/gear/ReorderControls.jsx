// 並び順編集 UI (汎用)
// DESIGN_SYSTEM_v4.md §11 / WIREFRAMES_v4.md §2.8 / DECISIONS_v4.md S16 Phase 1.5
//
// 各リスト行の右端に ▲▼ ミニボタンを配置。
// fromIndex===0 で ▲ 無効、fromIndex===length-1 で ▼ 無効。
// onMoveUp / onMoveDown は親の handler を呼ぶ (純関数 reorder.js を使う)。
// 32×22 縦 2 個並び = 32×46、行 padding と合わせて 44px tap 領域確保 (iOS HIG)。
function ReorderControls({ index, length, onMoveUp, onMoveDown }) {
  const isFirst = index <= 0;
  const isLast = index >= length - 1;
  const btnStyle = (disabled) => ({
    width: 32, height: 22,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: disabled ? C.panel2 : C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: disabled ? C.appleGray4 : C.primary,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0,
  });
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <button
        type="button"
        disabled={isFirst}
        onClick={(e) => { e.stopPropagation(); if (!isFirst) onMoveUp(index); }}
        style={btnStyle(isFirst)}
        aria-label="上に移動"
        title={isFirst ? "一番上" : "上に移動"}
      >
        <Icon name="caret-up" size={14} />
      </button>
      <button
        type="button"
        disabled={isLast}
        onClick={(e) => { e.stopPropagation(); if (!isLast) onMoveDown(index); }}
        style={btnStyle(isLast)}
        aria-label="下に移動"
        title={isLast ? "一番下" : "下に移動"}
      >
        <Icon name="caret-down" size={14} />
      </button>
    </div>
  );
}

// 「並べ替え」テキストリンク (通常モード時、セクションヘッダー内に置く)
// DESIGN_SYSTEM §11.6
function ReorderToggleLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        background: "transparent", border: "none", padding: 0,
        color: C.textSecondary, fontSize: 11, fontWeight: 600,
        cursor: "pointer",
      }}
      aria-label="並べ替えモードへ"
    >
      <Icon name="arrows-down-up" size={13} />
      並べ替え
    </button>
  );
}

// 「完了」ボタン (並び替えモード時、セクションヘッダー内に置く)
// DESIGN_SYSTEM §11.5
function ReorderDoneButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: C.primary, color: "#fff",
        border: "none", borderRadius: 8,
        padding: "4px 12px",
        fontSize: 11, fontWeight: 700,
        cursor: "pointer",
      }}
    >
      完了
    </button>
  );
}

// ヒント帯 (並び替えモード時のみ表示、リスト直前)
// DESIGN_SYSTEM §11.4
function ReorderHintBar({ children }) {
  return (
    <div style={{
      background: C.primaryLight,
      border: "1px solid #b8d8ff",
      borderRadius: 10,
      padding: "8px 12px",
      marginBottom: 10,
      fontSize: 11,
      color: C.primary,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <Icon name="info" size={14} />
      <span>{children}</span>
    </div>
  );
}
