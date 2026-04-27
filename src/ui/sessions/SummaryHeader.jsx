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
  // S13.5 (2026-04-27): text タップで詳細 Modal を開く。
  //   サマリー帯が幅狭で省略されていた問題への対応。最小情報 (件数 + 勝敗) のみ、将来 Insights 統合時にリッチ化可能。
  const [summaryOpen, setSummaryOpen] = useState(false);

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
    cursor: filtered ? "default" : "pointer",
    // タップ領域確保のための padding (clickable な時のみ visual hint)
    padding: filtered ? 0 : "2px 4px",
    margin: filtered ? 0 : "-2px -4px",
    borderRadius: 4,
    transition: "background 150ms",
  };

  // 絞り込み中は count 表示で完結、Modal 不要 (S13.5: 詳細は今月数値のみ表示)
  const handleTextClick = filtered ? undefined : () => setSummaryOpen(true);

  let textNode;
  if (filtered) {
    textNode = <div style={textStyle}>絞り込み結果: {filteredCount}件 / {totalCount}件</div>;
  } else {
    const parts = [];
    parts.push(`今月: ${monthStats.total}件`);
    if (monthStats.total > 0) parts.push(`（練${monthStats.p} / 大${monthStats.t}）`);
    const line1 = parts.join("");
    const line2 = recent.count > 0 ? `直近${recent.count}試合 ${recent.wins}勝${recent.losses}敗` : "";
    textNode = (
      <div
        style={textStyle}
        onClick={handleTextClick}
        role={handleTextClick ? "button" : undefined}
        tabIndex={handleTextClick ? 0 : undefined}
        aria-label={handleTextClick ? "今月のサマリー詳細を開く" : undefined}
        onKeyDown={handleTextClick ? (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTextClick(); }
        } : undefined}
      >
        {line1}{line2 && ` ・ ${line2}`}
      </div>
    );
  }

  // S13.5: 勝率計算 (Modal 内で表示)
  const winRate = recent.wins + recent.losses > 0
    ? Math.round((recent.wins / (recent.wins + recent.losses)) * 100)
    : null;

  return (
    <>
      <div style={wrapStyle}>
        {textNode}
        {onViewModeChange && (
          <ViewModeSwitcher value={viewMode} onChange={onViewModeChange} />
        )}
      </div>

      {/* S13.5: 今月のサマリー詳細 Modal (text タップで開く)
          最小情報のみ。将来リッチ化候補 (主力ラケット / 平均練習時間 / 月次推移) は Insights タブ完成後に統合 */}
      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title="今月のサマリー">
        <div style={{ padding: "4px 4px 8px", fontSize: 14, color: C.text }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              活動: {monthStats.total} 件
            </div>
            <div style={{ paddingLeft: 14, color: C.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
              練習 {monthStats.p} 回 / 大会 {monthStats.t} 回
            </div>
          </div>
          {recent.count > 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                直近 {recent.count} 試合: {recent.wins} 勝 {recent.losses} 敗
              </div>
              <div style={{ paddingLeft: 14, color: C.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
                勝率 {winRate}%
              </div>
            </div>
          )}
          {monthStats.total === 0 && recent.count === 0 && (
            <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>
              今月のデータはまだありません
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
