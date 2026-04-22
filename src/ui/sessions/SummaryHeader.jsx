// SummaryHeader — Sessions タブ上部のサマリー帯 (DESIGN_SYSTEM §8.5.4)
// props:
//   tournaments, practices, trials: 各配列
//   filtered: 絞り込み中フラグ
//   filteredCount, totalCount: 絞り込み中の件数 (filtered=true の時)
//   viewMode, onViewModeChange: S8 で追加 ("list"|"calendar"、右端トグル)
//
// 通常: 「今月: 18件（練15 / 大2）・直近10試合 7勝3敗」
// 絞り込み中: 「絞り込み結果: 12件 / 950件」
// 右端: ViewModeSwitcher (リスト/カレンダー)

function _formatMonthCounts(tournaments, practices) {
  // 試打は大会/練習に付随する活動なのでセッション総数には数えない
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inThisMonth = (item) => normDate(item.date).startsWith(thisMonth);
  const t = tournaments.filter(inThisMonth).length;
  const p = practices.filter(inThisMonth).length;
  return { total: t + p, t, p };
}

function _formatRecentRecord(tournaments) {
  // 直近の大会 10 試合分の勝敗 (matches.result === "勝利" / "敗北")
  const sorted = [...tournaments].sort((a, b) => normDate(b.date).localeCompare(normDate(a.date)));
  const recentMatches = [];
  for (const t of sorted) {
    const matches = Array.isArray(t.matches) ? t.matches : [];
    for (const m of matches) {
      if (m.result) recentMatches.push(m.result);
      if (recentMatches.length >= 10) break;
    }
    if (recentMatches.length >= 10) break;
  }
  const wins = recentMatches.filter(r => r === "勝利" || r === "win").length;
  const losses = recentMatches.filter(r => r === "敗北" || r === "loss").length;
  return { count: recentMatches.length, wins, losses };
}

function SummaryHeader({ tournaments = [], practices = [], filtered = false, filteredCount = 0, totalCount = 0, viewMode = "list", onViewModeChange }) {
  const monthStats = useMemo(() => _formatMonthCounts(tournaments, practices), [tournaments, practices]);
  const recent = useMemo(() => _formatRecentRecord(tournaments), [tournaments]);

  const wrapStyle = {
    padding: "8px 16px",
    background: C.primaryLight,
    color: C.primary,
    fontSize: 13,
    fontWeight: 500,
    borderTop: `1px solid ${C.divider}`,
    borderBottom: `1px solid ${C.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  };
  const textStyle = {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  let textNode;
  if (filtered) {
    textNode = <div style={textStyle}>絞り込み結果: {filteredCount}件 / {totalCount}件</div>;
  } else {
    const parts = [];
    parts.push(`今月: ${monthStats.total}件`);
    if (monthStats.total > 0) parts.push(`（練${monthStats.p} / 大${monthStats.t}）`);
    const line1 = parts.join("");
    const line2 = recent.count > 0 ? `直近${recent.count}試合 ${recent.wins}勝${recent.losses}敗` : "";
    textNode = <div style={textStyle}>{line1}{line2 && ` ・ ${line2}`}</div>;
  }

  return (
    <div style={wrapStyle}>
      {textNode}
      {onViewModeChange && (
        <ViewModeSwitcher value={viewMode} onChange={onViewModeChange} />
      )}
    </div>
  );
}
