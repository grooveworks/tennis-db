// TimeGroupHeader — Sessions リストの時間軸見出し (DESIGN_SYSTEM §8.5.6)
// props:
//   level: "week" | "month" | "year"
//   label: 表示文字列 (例: "今週 (4/15-4/21)" / "2026年3月" / "2025年")
//   count: アイテム数 (省略可、省略時は件数表示なし)
//   collapsible: 折り畳み可能か (year/month は true、week は false)
//   collapsed: 折り畳み状態
//   onToggle: 折り畳み切替コールバック (collapsible=true の時)
//
// sticky: 親要素の scroll に追従、top 0 で固定

const LEVEL_STYLES = {
  week:  { fontSize: 12, fontWeight: 700, color: C.textSecondary, marginTop: 12 },
  month: { fontSize: 13, fontWeight: 700, color: C.textSecondary, marginTop: 16 },
  year:  { fontSize: 14, fontWeight: 700, color: C.text,          marginTop: 20 },
};

function TimeGroupHeader({ level = "month", label, count, collapsible = false, collapsed = false, onToggle }) {
  const s = LEVEL_STYLES[level] || LEVEL_STYLES.month;
  const clickable = collapsible;
  return (
    <div
      onClick={clickable ? onToggle : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-expanded={clickable ? !collapsed : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(e); } } : undefined}
      style={{
        ...s,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        padding: "4px 2px",
        position: "sticky",
        top: 0,
        background: C.bg,
        zIndex: 1,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <span>
        {label}
        {typeof count === "number" && count > 0 && (
          <span style={{ fontWeight: 500, color: C.textMuted, marginLeft: 6 }}>({count}件)</span>
        )}
      </span>
      {clickable && (
        <Icon
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={level === "year" ? 20 : 18}
          color={C.textMuted}
          ariaLabel={collapsed ? "展開" : "折り畳み"}
        />
      )}
    </div>
  );
}
