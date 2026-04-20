// Badge — カテゴリ・状態表示
// props:
//   variant: tournament | practice | trial | success | warning | error | default
//   icon: Material Symbols 名 (省略可)
//   children: 表示テキスト
// DESIGN_SYSTEM §4.1 完全準拠、コントラストは AA 以上確保
// v4 カラー体系:
//   Sessions Category: tournament (Orange) / practice (Green) / trial (Purple)
//   Semantic: info (Blue=Primary) / success (Green) / warning (Yellow独立) / error (Red)
//   default: Gray
// 全てコントラスト AA 以上 (主要 AAA)
const BADGE_STYLES = {
  tournament: { bg: "#feefc3", text: "#a04f00", border: "rgba(160,79,0,0.35)" },   // Orange (大会カテゴリ)
  practice:   { bg: "#e6f4ea", text: "#0a5b35", border: "rgba(10,91,53,0.35)" },   // Green (練習カテゴリ)
  trial:      { bg: "#f3e8fd", text: "#6a25a8", border: "rgba(106,37,168,0.35)" }, // Purple (試打カテゴリ)
  info:       { bg: "#e8f0fe", text: "#0d47a1", border: "rgba(13,71,161,0.35)" },  // Blue (Primary 系, 準優勝など)
  success:    { bg: "#e6f4ea", text: "#0a5b35", border: "rgba(10,91,53,0.35)" },   // Green (予選突破など)
  warning:    { bg: "#fef7e0", text: "#7e5d00", border: "rgba(126,93,0,0.35)" },   // Yellow (ベスト8/16など、tournamentから独立)
  error:      { bg: "#fce8e6", text: "#a31511", border: "rgba(163,21,17,0.35)" },  // Red (敗退など)
  default:    { bg: "#f1f3f4", text: "#5f6368", border: "rgba(95,99,104,0.35)" },  // Gray (未設定など)
};
function Badge({ variant = "default", icon, children }) {
  const s = BADGE_STYLES[variant] || BADGE_STYLES.default;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      height: 22,
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1,
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      background: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
    }}>
      {icon && <Icon name={icon} size={13} color={s.text} />}
      {children}
    </span>
  );
}
