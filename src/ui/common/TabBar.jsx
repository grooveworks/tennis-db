// TabBar — 最下部ナビゲーション (5タブ固定)
// props:
//   tab: 現在のタブ ID
//   onTabChange: タブ変更コールバック
// DESIGN_SYSTEM §4.8 準拠
const TABS = [
  { id: "home",     label: "ホーム", icon: "house" },
  { id: "sessions", label: "記録",   icon: "list" },
  { id: "gear",     label: "機材",   icon: "backpack" },
  { id: "plan",     label: "計画",   icon: "notebook-pen" },
  { id: "insights", label: "分析",   icon: "bar-chart-3" },
];
function TabBar({ tab, onTabChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        background: C.panel,
        borderTop: `1px solid ${C.border}`,
        height: 56,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: active ? C.primary : "#80868b",
              background: active ? "#e8f0fe" : "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: font,
              fontWeight: active ? 600 : 400,
              transition: "background 150ms",
            }}
          >
            <Icon name={t.icon} size={24} color={active ? C.primary : "#80868b"} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
