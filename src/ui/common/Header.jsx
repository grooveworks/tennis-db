// Header — 画面上部共通ヘッダ
// props:
//   title: 画面タイトル
//   onBack: 戻るコールバック (省略時は戻るボタン非表示)
//   onMenu: メニューコールバック (省略時はメニューボタン非表示)
//   right: 右側にカスタム要素 (onMenu の代わり、例: 保存ボタン)
// DESIGN_SYSTEM §4.9 準拠、左上=戻る・右上=メニュー の位置固定
function Header({ title, onBack, onMenu, right }) {
  const iconBtn = (icon, onClick, label) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: C.textSecondary,
        cursor: "pointer",
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.panel2; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <Icon name={icon} size={24} ariaLabel={label} />
    </button>
  );
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 56,
      padding: "0 16px",
      background: C.panel,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ width: 40, height: 40 }}>
        {onBack && iconBtn("arrow-left", onBack, "戻る")}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </div>
      <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {right ? right : (onMenu && iconBtn("more-vertical", onMenu, "メニュー"))}
      </div>
    </header>
  );
}
