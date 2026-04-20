// FAB — Floating Action Button (DESIGN_SYSTEM §8.5.9)
// props:
//   onClick: タップ時コールバック
//   icon: Lucide 名 (default "plus")
//   ariaLabel: スクリーンリーダー用 (必須)
//
// 画面右下に fixed、TabBar の上 16px に浮かぶ。

function FAB({ onClick, icon = "plus", ariaLabel = "追加" }) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        bottom: 72,            // TabBar (56) + 16
        right: 16,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: hover ? C.primaryHover : C.primary,
        color: "#ffffff",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: active
          ? "0 1px 3px rgba(0,0,0,0.15), 0 2px 6px rgba(26,115,232,0.3)"
          : "0 2px 6px rgba(0,0,0,0.15), 0 4px 12px rgba(26,115,232,0.3)",
        transform: active ? "scale(0.95)" : "scale(1)",
        transition: "background 150ms, transform 150ms, box-shadow 150ms",
        zIndex: 100,
      }}
    >
      <Icon name={icon} size={28} color="#ffffff" ariaLabel={ariaLabel} />
    </button>
  );
}
