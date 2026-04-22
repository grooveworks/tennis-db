// Badge — カテゴリ・状態表示
// props:
//   variant: tournament | practice | trial | success | warning | error | default
//   icon: Material Symbols 名 (省略可)
//   minWidth: 最小幅 px (省略可)。指定時は中央寄せで並んだ時のリズムを作る
//            (v3 の minWidth=32/60/96 パターンを移植、v4 は役割ごとに SessionCard で指定)
//   children: 表示テキスト
// DESIGN_SYSTEM §4.1 完全準拠、コントラストは AA 以上確保
// v4 カラー体系:
//   Sessions Category: tournament (Orange) / practice (Green) / trial (Purple)
//   Semantic: info (Blue=Primary) / success (Green) / warning (Yellow独立) / error (Red)
//   default: Gray
// 全てコントラスト AA 以上 (主要 AAA)
const BADGE_STYLES = {
  // S7 改訂: 大会形式 [シングルス] と 優勝 (どちらも tournament variant) は白背景に。
  // 同じく info (準優勝) も白背景。優勝 card / 準優勝 card の tinted bg と被らず輪郭が出る。
  tournament: { bg: "#ffffff", text: "#a04f00", border: "rgba(160,79,0,0.7)" },    // 大会カテゴリ + 優勝 (白)
  practice:   { bg: "#e6f4ea", text: "#0a5b35", border: "rgba(10,91,53,0.35)" },   // Green (練習カテゴリ)
  trial:      { bg: "#f3e8fd", text: "#6a25a8", border: "rgba(106,37,168,0.35)" }, // Purple (試打リンクバッジ専用、3位 とは分離)
  bronze:     { bg: "#ffffff", text: "#6a25a8", border: "rgba(106,37,168,0.7)" },  // 3位 専用 (白、文字は紫系維持)
  info:       { bg: "#ffffff", text: "#0d47a1", border: "rgba(13,71,161,0.7)" },   // 準優勝 (白)
  success:    { bg: "#e6f4ea", text: "#0a5b35", border: "rgba(10,91,53,0.35)" },   // Green (予選突破など)
  warning:    { bg: "#fef7e0", text: "#7e5d00", border: "rgba(126,93,0,0.35)" },   // Yellow (ベスト8/16など、tournamentから独立)
  error:      { bg: "#fce8e6", text: "#a31511", border: "rgba(163,21,17,0.35)" },  // Red (敗退など)
  default:    { bg: "#f1f3f4", text: "#5f6368", border: "rgba(95,99,104,0.35)" },  // Gray (未設定など)
};
function Badge({ variant = "default", icon, minWidth, children }) {
  const s = BADGE_STYLES[variant] || BADGE_STYLES.default;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: minWidth ? "center" : "flex-start",
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
      minWidth: minWidth ? `${minWidth}px` : undefined,
    }}>
      {icon && <Icon name={icon} size={13} color={s.text} />}
      {children}
    </span>
  );
}
