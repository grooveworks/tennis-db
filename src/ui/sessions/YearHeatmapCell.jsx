// YearHeatmapCell — 年間ヒートマップ 1 週セル (DESIGN_SYSTEM §8.5.8)
// props:
//   kind:          "empty" | "in" (empty = 月内に存在しない週、透明で領域のみ確保)
//   month:         月 (1-12)、onClick 伝達用
//   week:          週 index (0-4)、onClick 伝達用
//   intensity:     0-3 (0=活動なし=panel2, 1=light, 2=mid, 3=accent)
//   hasTournament: その週に大会ありなら true (上部 4px オレンジ帯を重ねる)
//   hasTrial:      その週に試打リンクありなら true (右下に紫ドット)
//   isThisWeek:    今週マス (inset 2px primary 枠)
//   isSelected:    選択中 (外周 2px primary リング + 軽い影)
//   onClick:       (month, week) を渡す (empty は無効)
//
// サイズは grid-template-rows: repeat(12, 1fr) + grid-template-columns: repeat(5, 1fr) で親が決める。
// width:100% / height:100% で grid track 全体を埋める (aspect-ratio は使わない = 行高が親の flex:1 で決まる)。

// 練習強度 → 背景色
const _yhCellBg = (intensity) => {
  if (intensity === 1) return C.practiceLight;
  if (intensity === 2) return C.practiceMid;
  if (intensity === 3) return C.practiceAccent;
  return C.panel2;
};

function YearHeatmapCell({
  kind = "in",
  month,
  week,
  intensity = 0,
  hasTournament = false,
  hasTrial = false,
  isThisWeek = false,
  isSelected = false,
  onClick,
}) {
  if (kind === "empty") {
    // 月内に存在しない週 (例: 2月 W5 が 29-日なし、4月 W5 が 29-30 で存在、等)
    return <div aria-hidden="true" style={{ width: "100%", height: "100%", background: "transparent" }} />;
  }

  // 枠線 優先度: selected > thisWeek > normal
  let boxShadow = "none";
  if (isSelected) {
    boxShadow = `0 0 0 2px ${C.primary}, 0 2px 6px rgba(26,115,232,0.3)`;
  } else if (isThisWeek) {
    boxShadow = `inset 0 0 0 2px ${C.primary}`;
  }

  const label = hasTournament
    ? `${month}月第${week + 1}週 (大会あり)`
    : `${month}月第${week + 1}週`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={isSelected}
      title={label}
      onClick={() => onClick && onClick(month, week)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(month, week);
        }
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: _yhCellBg(intensity),
        borderRadius: 5,
        cursor: "pointer",
        boxShadow,
        transition: "transform 120ms",
        zIndex: isSelected ? 2 : "auto",
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e)=> { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {hasTournament && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: C.tournamentAccent,
          borderRadius: "5px 5px 0 0",
          pointerEvents: "none",
        }} />
      )}
      {hasTrial && (
        <div style={{
          position: "absolute", bottom: 3, right: 3,
          width: 7, height: 7, borderRadius: "50%",
          background: C.trialAccent,
          border: `1px solid ${C.panel}`,
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}
