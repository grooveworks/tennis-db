// HomeTab — Home タブ (S14 P1 本実装、Apple-flavored Material 路線)
//
// 構成 (preview_s13.5.html FINAL 準拠、6 カード):
//   - HomeQuickAdd: 大会 / 練習 / 試打 の 3 大ボタン (グラデ + Phosphor アイコン + 配線)
//   - CurrentContext:  現在の状況 (5 行: 次の大会 / 課題 / 主力 / 検討中 / 直近)
//   - WeeklySummary:   今週サマリー (Display tier 大数字、4 統計 + フッタ)
//   - NextActions:     次のアクション top 3 (Apple Reminders 風 check circle + priority dot)
//   - TwoWeekCalendar: 2 週間カレンダー (14 セル + 練習濃淡 + 大会 + 試打 dot)
//   - RecentResults:   最近の好成績 (REQUIREMENTS F4.4、S16 で実装漏れを追加)
//   - HomeDayPanel:    カレンダーマス タップで Glass overlay (本 component 内部で state 管理)
//
// 配線:
//   - onQuickAdd(type): app.jsx → setQuickAddType(type) → 既存 QuickAddModal 起動 (trial 含む)
//   - onCardClick(type, item): DayPanel 内のセッションタップ → app.jsx → SessionDetailView
//
// props:
//   tournaments, practices, trials, next: 全データ (Firestore からの正規化済)
//   onQuickAdd(type): 大会/練習/試打 ボタンタップ
//   onCardClick(type, session): DayPanel 内行タップ

function HomeTab({
  tournaments = [],
  practices = [],
  trials = [],
  next = [],
  onQuickAdd,
  onCardClick,
  onMainRacketClick,
}) {
  // DayPanel: 選択日 (iso) を内部 state で持つ。null なら閉
  const [dayPanelIso, setDayPanelIso] = useState(null);

  const handleDayTap = useCallback((iso) => {
    setDayPanelIso(iso);
  }, []);
  const handleDayPanelClose = useCallback(() => {
    setDayPanelIso(null);
  }, []);
  const handleDayItemClick = useCallback((type, item) => {
    setDayPanelIso(null);
    if (onCardClick) onCardClick(type, item);
  }, [onCardClick]);

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      padding: "8px 14px 12px",
      background: C.bg,
    }}>
      {/* Quick Add 3 ボタン */}
      <HomeQuickAdd onQuickAdd={onQuickAdd} />

      {/* 1. 現在の状況 */}
      <CurrentContext
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        next={next}
        onCardClick={onCardClick}
        onMainRacketClick={onMainRacketClick}
      />

      {/* 2. 今週サマリー */}
      <WeeklySummary
        tournaments={tournaments}
        practices={practices}
      />

      {/* 3. 次のアクション */}
      <NextActions next={next} />

      {/* 4. 2 週間カレンダー */}
      <TwoWeekCalendar
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        onDayTap={handleDayTap}
      />

      {/* 5. 最近の好成績 (REQUIREMENTS F4.4 / WIREFRAMES §2.1)
            実装漏れだった F4.4 を S16 で追加。優勝/準優勝/3位/ベスト8/ベスト16/予選突破 に限定。 */}
      <RecentResults
        tournaments={tournaments}
        onCardClick={onCardClick}
      />

      {/* DayPanel (Glass overlay、選択日のセッション一覧) */}
      <HomeDayPanel
        open={!!dayPanelIso}
        iso={dayPanelIso}
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        onClose={handleDayPanelClose}
        onItemClick={handleDayItemClick}
      />
    </div>
  );
}
