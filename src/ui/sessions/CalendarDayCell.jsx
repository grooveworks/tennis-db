// CalendarDayCell — カレンダー 1 マス (DESIGN_SYSTEM §8.5.7)
// props:
//   day:      日 (1-31)
//   dow:      曜日 (0=日, 6=土)
//   isOutside: 月外マス (前月末 / 翌月頭)
//   isToday:   今日マス (2px primary border)
//   isSelected: 選択中マス (外周リング)
//   tournaments: 当日の大会 entry 配列 (entry={type:"tournament",item})
//   practices:   当日の練習 entry 配列
//   hasTrial:   当日のいずれかが試打にリンクされているか
//   onClick:    タップ時 (day を渡す、isOutside の場合は無効)

// 練習の合計分から濃度バケツを決める
const _practiceDensity = (practices) => {
  const total = practices.reduce((s, e) => s + (Number(e.item.duration) || 0), 0);
  if (total <= 0) return null;
  if (total < 30) return "light";
  if (total <= 60) return "mid";
  return "accent";
};

function CalendarDayCell({
  day,
  dow = 0,
  isOutside = false,
  isToday = false,
  isSelected = false,
  tournaments = [],
  practices = [],
  hasTrial = false,
  onClick,
}) {
  // 共通スタイル
  const baseStyle = {
    aspectRatio: "1 / 1.05",
    minHeight: 44,
    borderRadius: 8,
    padding: isToday ? 3 : 4,
    border: isToday ? `2px solid ${C.primary}` : `1px solid ${C.divider}`,
    boxShadow: isSelected ? `0 0 0 2px ${C.primary}, 0 4px 8px rgba(26,115,232,0.18)` : "none",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    cursor: isOutside ? "default" : "pointer",
    transition: "transform 150ms",
    background: C.panel,
    zIndex: isSelected ? 1 : "auto",
  };

  // 月外マス
  if (isOutside) {
    return (
      <div
        style={{ ...baseStyle, background: C.panel2, cursor: "default", border: `1px solid ${C.divider}` }}
        aria-hidden="true"
      >
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.1 }}>{day}</div>
      </div>
    );
  }

  // 大会日: 全面 tournamentLight + 右上 trophy
  const hasTournament = tournaments.length > 0;
  const density = _practiceDensity(practices);

  let bg = C.panel;
  let dayColor;
  if (hasTournament) {
    bg = C.tournamentLight;
  } else if (density === "light")  bg = C.practiceLight;
  else if (density === "mid")     bg = C.practiceMid;
  else if (density === "accent")  { bg = C.practiceAccent; dayColor = "#ffffff"; }

  // 日付文字色: 練習濃 (白) > 曜日色 > 通常
  if (!dayColor) {
    if (dow === 0)      dayColor = "#dc2626";
    else if (dow === 6) dayColor = C.primary;
    else                dayColor = C.text;
  }

  // 下部ドット (大会日に練習が重なる時 + 試打リンク時)
  const dots = [];
  if (hasTournament && practices.length > 0) {
    dots.push({ key: "prac", color: C.practiceAccent });
  }
  if (hasTrial) {
    dots.push({ key: "trial", color: C.trialAccent });
  }

  // 件数 (a11y 用)
  const count = tournaments.length + practices.length;
  const aria = count > 0 ? `${day}日 ${count}件` : `${day}日`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={aria}
      aria-pressed={isSelected}
      onClick={() => onClick && onClick(day)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(day);
        }
      }}
      style={{ ...baseStyle, background: bg }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e)=> { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.1, color: dayColor }}>{day}</div>
      {hasTournament && (
        <div style={{ position: "absolute", top: 2, right: 2, color: C.tournamentAccent, lineHeight: 0 }}>
          <Icon name="trophy" size={14} color={C.tournamentAccent} />
        </div>
      )}
      {dots.length > 0 && (
        <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
          {dots.map(d => (
            <span key={d.key} style={{ width: 5, height: 5, borderRadius: "50%", background: d.color }} />
          ))}
        </div>
      )}
    </div>
  );
}
