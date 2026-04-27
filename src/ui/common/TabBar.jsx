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
  // S13.5 (2026-04-27 修正): position: fixed で画面下端に貼り付け。
  //   理由: 100vh コンテナが iPhone Safari で URL バーの裏に押し出されると、flex 最下段の TabBar が見切れる。
  //   貼り付け表示にすると Safari URL バー有無 / PWA standalone / PC ブラウザ全環境で常時下端可視。
  return (
    <div
      role="tablist"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        height: 56,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        zIndex: 60,
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
              background: active ? C.primaryLight : "transparent",
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
