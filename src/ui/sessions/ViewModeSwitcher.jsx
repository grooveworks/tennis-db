// ViewModeSwitcher — Sessions タブの表示モード切替トグル (DESIGN_SYSTEM §8.5.4 拡張)
// props:
//   value: "list" | "calendar" | "year"
//   onChange: (next) => void
// SummaryHeader 右端に常駐。S9 で list / calendar / year の 3 択化 (S8 まで 2 択)。

function ViewModeSwitcher({ value = "list", onChange }) {
  const btn = (mode, iconName, label) => {
    const active = value === mode;
    return (
      <button
        type="button"
        onClick={() => !active && onChange && onChange(mode)}
        aria-label={label}
        aria-pressed={active}
        style={{
          width: 26, height: 22,
          border: "none",
          background: active ? C.primary : "transparent",
          color: active ? "#ffffff" : C.primary,
          borderRadius: 4,
          cursor: active ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <Icon name={iconName} size={16} color={active ? "#ffffff" : C.primary} />
      </button>
    );
  };
  return (
    <div
      role="group"
      aria-label="表示モード切替"
      style={{
        display: "inline-flex",
        gap: 2,
        background: "#ffffff",
        borderRadius: 6,
        padding: 2,
        border: `1px solid rgba(26,115,232,0.3)`,
        flexShrink: 0,
      }}
    >
      {btn("list", "list", "リスト表示")}
      {btn("calendar", "calendar", "カレンダー表示")}
      {btn("year", "calendar-range", "年間濃淡表示")}
    </div>
  );
}
