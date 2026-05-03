// CalendarView — Sessions タブ カレンダー mode (DESIGN_SYSTEM §8.5.7 / WIREFRAMES §2.2.2)
// props:
//   items:       絞り込み済みエントリ配列 [{type:"tournament"|"practice", item}]
//                試打 (trial) は item に直接含まれず、trialLinks 経由でドット表示。
//   trialLinks:  {linkedTournamentIds:Set, linkedPracticeIds:Set}
//   onCardClick: (type, item) => void  日詳細パネルのミニ行タップ時 (S10 で詳細画面に接続)
//   onPanelStateChange: (open:boolean) => void  DayPanel 開閉を親に通知 (FAB 退避制御に使う)
//
// やること:
//   - 月のマス目 (日曜始まり)、前月/次月/今月ナビ、今日強調、選択中外周リング
//   - 当日タップで CalendarGrid 直下に DayPanel を表示 (B 版、§8.5.7.1)
//   - 同じ日の再タップで閉じる、月切替時は選択解除
// やらないこと:
//   - 詳細画面遷移 (S10) — onCardClick で親に委譲
//   - 試打のみの日のセル描画 (試打は付随活動として大会/練習にリンク表示)

const _DOW_LABELS_FULL = ["日","月","火","水","木","金","土"];

// "YYYY-MM-DD" フォーマット
const _toISO = (y, m1, d) =>
  `${y}-${String(m1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// 月オブジェクト (y, m=0-11) からその月の日数 / 1日の曜日を求める
const _monthMeta = (y, m) => ({
  daysInMonth: new Date(y, m + 1, 0).getDate(),
  firstDow: new Date(y, m, 1).getDay(),  // 0=日, 6=土
});

// 今日 ISO (ローカル日付)
const _todayISO = () => {
  const d = new Date();
  return _toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

function CalendarView({ items = [], trialLinks = { linkedTournamentIds: new Set(), linkedPracticeIds: new Set() }, onCardClick, onPanelStateChange }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null); // 1-31 (現在表示中の月内の日付)
  // H-14 (Phase A 監査): DayPanel に渡す onClose を useCallback で安定化 (ESC リスナー再登録防止)
  const handleDayPanelClose = useCallback(() => setSelectedDay(null), []);
  // パネル開閉を親に通知 (FAB 表示制御)
  useEffect(() => {
    if (onPanelStateChange) onPanelStateChange(!!selectedDay);
  }, [selectedDay, onPanelStateChange]);

  // 当月の日付プレフィックス (YYYY-MM)
  const monthPrefix = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;
  const monthLabel = `${month.y}年${month.m + 1}月`;
  const todayISO = _todayISO();

  // 月切替で選択解除
  const goPrev = () => { setSelectedDay(null); setMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }); };
  const goNext = () => { setSelectedDay(null); setMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }); };
  const goToday = () => {
    const d = new Date();
    setSelectedDay(null);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const isCurrentMonth = (() => {
    const d = new Date();
    return d.getFullYear() === month.y && d.getMonth() === month.m;
  })();

  // 当月の日 → entry 配列 のマップを構築
  const dayMap = useMemo(() => {
    const map = {};  // { day(1-31): { tournaments:[], practices:[] } }
    items.forEach(entry => {
      const nd = normDate(entry.item.date);
      if (!nd.startsWith(monthPrefix + "-")) return;
      const dayMatch = nd.match(/-(\d{2})$/);
      if (!dayMatch) return;
      const day = Number(dayMatch[1]);
      if (!map[day]) map[day] = { tournaments: [], practices: [] };
      if (entry.type === "tournament") map[day].tournaments.push(entry);
      else if (entry.type === "practice") map[day].practices.push(entry);
    });
    return map;
  }, [items, monthPrefix]);

  // 各日に試打リンクがあるか (大会/練習いずれかが trialLinks に含まれるか)
  const hasTrialOnDay = (day) => {
    const slot = dayMap[day];
    if (!slot) return false;
    if (slot.tournaments.some(e => trialLinks.linkedTournamentIds.has(e.item.id))) return true;
    if (slot.practices.some(e => trialLinks.linkedPracticeIds.has(e.item.id))) return true;
    return false;
  };

  const { daysInMonth, firstDow } = _monthMeta(month.y, month.m);

  // 月外マス (前月末) を含めたセル配列を構築
  const cells = [];
  const prevLast = new Date(month.y, month.m, 0).getDate();
  for (let i = firstDow; i > 0; i--) {
    cells.push({ kind: "outside", day: prevLast - i + 1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ kind: "in", day: d });
  }
  while (cells.length % 7 !== 0) {
    const after = cells.length - daysInMonth - firstDow + 1;
    cells.push({ kind: "outside", day: after });
  }

  const handleCellClick = (day) => {
    setSelectedDay(prev => prev === day ? null : day);
  };

  // 選択日の dateISO + 当日 entries (DayPanel に渡す)
  const selectedISO = selectedDay ? _toISO(month.y, month.m + 1, selectedDay) : null;
  const selectedSlot = selectedDay ? (dayMap[selectedDay] || { tournaments: [], practices: [] }) : null;

  // S13.5 (2026-04-27 修正): DayPanel が absolute overlay になったので、親に position: relative が必要。
  //   旧構造の Fragment + flex sibling → 単一 div コンテナに統合。
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "8px 12px 12px", background: C.bg, minHeight: 0, position: "relative" }}>
        {/* 月ヘッダ + 前後ナビ + 今日へジャンプ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px 10px" }}>
          <button
            onClick={goPrev}
            aria-label="前月"
            style={{ width: 40, height: 40, border: "none", background: "transparent", color: C.textSecondary, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-left" size={22} color={C.textSecondary} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{monthLabel}</div>
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 12,
                  border: `1px solid ${C.primary}`,
                  background: "transparent", color: C.primary,
                  cursor: "pointer",
                }}
              >
                今日
              </button>
            )}
          </div>
          <button
            onClick={goNext}
            aria-label="次月"
            style={{ width: 40, height: 40, border: "none", background: "transparent", color: C.textSecondary, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-right" size={22} color={C.textSecondary} />
          </button>
        </div>

        {/* 曜日ヘッダ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, padding: "0 0 4px" }}>
          {_DOW_LABELS_FULL.map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: 10, fontWeight: 600,
                padding: "2px 0",
                color: i === 0 ? "#dc2626" : i === 6 ? C.primary : C.textMuted,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* グリッド本体 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((cell, i) => {
            const dow = i % 7;
            if (cell.kind === "outside") {
              return (
                <CalendarDayCell
                  key={`out-${i}`}
                  day={cell.day}
                  dow={dow}
                  isOutside={true}
                />
              );
            }
            const slot = dayMap[cell.day] || { tournaments: [], practices: [] };
            const dayISO = _toISO(month.y, month.m + 1, cell.day);
            return (
              <CalendarDayCell
                key={`in-${cell.day}`}
                day={cell.day}
                dow={dow}
                isToday={dayISO === todayISO}
                isSelected={selectedDay === cell.day}
                tournaments={slot.tournaments}
                practices={slot.practices}
                hasTrial={hasTrialOnDay(cell.day)}
                onClick={handleCellClick}
              />
            );
          })}
        </div>

      {/* 選択中の日詳細パネル (S13.5: absolute overlay でカレンダーグリッドを覆う) */}
      {selectedDay && selectedISO && selectedSlot && (
        <DayPanel
          dateISO={selectedISO}
          tournaments={selectedSlot.tournaments}
          practices={selectedSlot.practices}
          onClose={handleDayPanelClose}
          onCardClick={onCardClick}
        />
      )}
    </div>
  );
}
