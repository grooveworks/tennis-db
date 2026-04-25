// QuickAddFab — FAB + ミニメニュー (S12)
//
// 役割:
//   - SessionsTab で従来の <FAB> の代わりに使う
//   - タップ → ミニメニュー (大会 / 練習) を直上に表示
//   - メニュー開いている時は FAB アイコンが × に変わる (再タップで閉じる)
//   - 試打は除外 (S14 Home 3 ボタンに集約、DECISIONS_v4.md S12)
//
// props:
//   onSelect(type): "tournament" | "practice" を返す
//   bottom: FAB の bottom 値 (省略時 180px、SessionsTab 既定値と同じ)
//   ariaLabel: FAB の aria-label
//
// 罠:
//   - z-index: FAB(100) と menu(100) を別レイヤー扱い、menu を上にする
//   - 背景タップで menu を閉じる (透明オーバーレイで実装)

const _QAF_ITEMS = [
  { type: "tournament", icon: "trophy",          label: "大会", color: "#f9ab00", textColor: "#a04f00" },
  { type: "practice",   icon: "person-standing", label: "練習", color: "#0f9d58", textColor: "#0a5b35" },
];

function QuickAddFab({ onSelect, bottom = 180, ariaLabel = "記録を追加" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleFabTap = () => setMenuOpen((v) => !v);
  const handleSelect = (type) => {
    setMenuOpen(false);
    onSelect && onSelect(type);
  };
  const handleBackdropClick = () => setMenuOpen(false);

  // Esc で閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  return (
    <>
      {/* 背景透明オーバーレイ (menu 開いている時のみ、外側タップで閉じる) */}
      {menuOpen && (
        <div
          onClick={handleBackdropClick}
          style={{
            position: "fixed", inset: 0, background: "transparent", zIndex: 99,
          }}
        />
      )}

      {/* ミニメニュー (FAB の上に表示) */}
      {menuOpen && (
        <div
          role="menu"
          style={{
            position: "fixed",
            right: 16,
            bottom: bottom + 64, // FAB(56) + gap(8)
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            width: 200,
            overflow: "hidden",
            zIndex: 101,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            animation: "drawerEnter 200ms ease-out",
          }}
        >
          {_QAF_ITEMS.map((item) => (
            <button
              key={item.type}
              role="menuitem"
              type="button"
              onClick={() => handleSelect(item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                minHeight: 56,
                width: "100%",
                background: C.panel,
                border: "none",
                borderBottom: item.type === "tournament" ? `1px solid ${C.divider}` : "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: item.textColor,
                fontFamily: font,
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.panel2)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.panel)}
            >
              <Icon name={item.icon} size={20} color={item.color} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <Icon name="chevron-right" size={16} color={C.textMuted} />
            </button>
          ))}
        </div>
      )}

      {/* FAB 本体 */}
      <button
        onClick={handleFabTap}
        aria-label={menuOpen ? "閉じる" : ariaLabel}
        aria-expanded={menuOpen}
        style={{
          position: "fixed",
          bottom,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: menuOpen ? C.textSecondary : C.primary,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
          zIndex: 100,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15), 0 4px 12px rgba(26,115,232,0.3)",
          transition: "background 150ms",
        }}
      >
        <Icon name={menuOpen ? "x" : "plus"} size={28} color="#fff" />
      </button>
    </>
  );
}
