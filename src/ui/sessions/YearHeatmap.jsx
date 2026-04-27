// YearHeatmap — Sessions タブ 年間俯瞰 view (v6 仕様: 12 月 × 5 週の週単位ヒートマップ)
// props:
//   items:       絞り込み済みエントリ配列 [{type:"tournament"|"practice", item}]
//   trialLinks:  {linkedTournamentIds:Set, linkedPracticeIds:Set} (週に試打リンクがあるか判定用)
//   onCardClick: (type, item) => void  WeekPanel ミニ行タップ時 (S10 で詳細画面に接続)
//   onPanelStateChange: (open:boolean) => void  WeekPanel 開閉を親に通知 (FAB 退避制御)
//
// やること:
//   - 縦 12 月 × 横 5 週 のマトリクス (月内の日を W1=1-7 / W2=8-14 / W3=15-21 / W4=22-28 / W5=29-31 で区切る)
//   - 各週セル: 練習合計分による色濃度 (activity-less/light/mid/accent) + 大会帯 (上部 4px オレンジ) + 試打ドット (右下紫)
//   - 前年/次年ナビ、現年以外は「今年」バッジ
//   - 初期表示で当年の今週を自動選択 (WeekPanel 展開)、同週再タップで閉じる、別週タップで切替
//   - 年ナビ時は選択解除 (前年/次年 = 今週マーク消える)、今年に戻ると今週を再選択
// やらないこと:
//   - 詳細画面遷移 (S10) — onCardClick で親に委譲
//   - 数値表示 (Insights タブの責務)

const _YH_MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// 月内日 d (1-31) → 週 index (0-4)
const _yhWeekOfMonth = (d) => {
  const idx = Math.floor((d - 1) / 7);
  return idx > 4 ? 4 : idx;
};

// y/m (1-12) の月内日数
const _yhDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

// 週 w (0-4) が月内に存在するか (dim < 週開始日 なら false)
const _yhWeekExists = (y, m, w) => {
  const start = w * 7 + 1;
  return start <= _yhDaysInMonth(y, m);
};

// 週ラベル: "4/22 - 4/28 (第4週)"
const _yhWeekLabel = (y, m, w) => {
  const dim = _yhDaysInMonth(y, m);
  const start = w * 7 + 1;
  const end = Math.min(start + 6, dim);
  return `${m}/${start} - ${m}/${end} (第${w + 1}週)`;
};

// 週合計分 (練習のみ集計) → 強度 0-3
const _yhWeekIntensity = (practices) => {
  const total = practices.reduce((s, e) => s + (Number(e.item.duration) || 0), 0);
  if (total <= 0) return 0;
  if (total < 60) return 1;
  if (total <= 180) return 2;
  return 3;
};

// 週に試打リンクがあるか
const _yhWeekHasTrial = (slot, trialLinks) => {
  if (!trialLinks) return false;
  if (slot.tournaments.some(e => trialLinks.linkedTournamentIds && trialLinks.linkedTournamentIds.has(e.item.id))) return true;
  if (slot.practices.some(e => trialLinks.linkedPracticeIds && trialLinks.linkedPracticeIds.has(e.item.id))) return true;
  return false;
};

// 週内のエントリを日付+時刻昇順でソート (WeekPanel 表示用)
const _yhBuildWeekItems = (slot) => {
  const items = [...slot.tournaments, ...slot.practices];
  items.sort((a, b) => {
    const dA = normDate(a.item.date);
    const dB = normDate(b.item.date);
    if (dA !== dB) return dA.localeCompare(dB);
    return String(a.item.startTime || "").localeCompare(String(b.item.startTime || ""));
  });
  return items;
};

function YearHeatmap({ items = [], trialLinks = { linkedTournamentIds: new Set(), linkedPracticeIds: new Set() }, onCardClick, onPanelStateChange }) {
  const todayInfo = useMemo(() => {
    const d = new Date();
    return {
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      w: _yhWeekOfMonth(d.getDate()),
    };
  }, []);

  const [year, setYear] = useState(todayInfo.y);
  // 初期選択: 当年なら今週、前年/次年なら null
  const [selected, setSelected] = useState(() =>
    todayInfo.y === year ? { m: todayInfo.m, w: todayInfo.w } : null
  );

  // パネル開閉を親に通知 (FAB 表示制御)
  useEffect(() => {
    if (onPanelStateChange) onPanelStateChange(!!selected);
  }, [selected, onPanelStateChange]);

  const isCurrentYear = year === todayInfo.y;

  // 年切替
  const goPrev = () => { setSelected(null); setYear(y => y - 1); };
  const goNext = () => { setSelected(null); setYear(y => y + 1); };
  const goThisYear = () => {
    setYear(todayInfo.y);
    setSelected({ m: todayInfo.m, w: todayInfo.w });
  };

  // 当年の {month -> { week -> { tournaments:[], practices:[] } }} を構築
  const yearMap = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 12; m++) {
      map[m] = {};
      for (let w = 0; w < 5; w++) map[m][w] = { tournaments: [], practices: [] };
    }
    const yearPrefix = `${year}-`;
    items.forEach(entry => {
      const nd = normDate(entry.item.date);
      if (!nd.startsWith(yearPrefix)) return;
      const parts = nd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!parts) return;
      const m = Number(parts[2]);
      const d = Number(parts[3]);
      if (m < 1 || m > 12) return;
      const w = _yhWeekOfMonth(d);
      if (entry.type === "tournament") map[m][w].tournaments.push(entry);
      else if (entry.type === "practice") map[m][w].practices.push(entry);
    });
    return map;
  }, [items, year]);

  // 年間合計件数 (ヘッダ表示用)
  const yearCount = useMemo(() => {
    let n = 0;
    for (let m = 1; m <= 12; m++) {
      for (let w = 0; w < 5; w++) {
        const slot = yearMap[m][w];
        n += slot.tournaments.length + slot.practices.length;
      }
    }
    return n;
  }, [yearMap]);

  const handleWeekClick = (m, w) => {
    setSelected(prev => (prev && prev.m === m && prev.w === w) ? null : { m, w });
  };

  // 選択中の情報 (WeekPanel に渡す)
  const selectedSlot = selected ? (yearMap[selected.m] && yearMap[selected.m][selected.w]) : null;
  const selectedLabel = selected ? _yhWeekLabel(year, selected.m, selected.w) : "";
  const selectedItems = selected && selectedSlot ? _yhBuildWeekItems(selectedSlot) : [];

  // S13.5 (2026-04-27 修正): WeekPanel が absolute overlay になったので、親に position: relative が必要。
  //   旧構造の Fragment + flex sibling → 単一 div コンテナに統合。
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 14px", background: C.bg, minHeight: 0, position: "relative" }}>
      <>
        {/* 年ヘッダ + 前後ナビ + 今年バッジ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0 8px", flexShrink: 0 }}>
          <button
            onClick={goPrev}
            aria-label="前年"
            style={{ width: 40, height: 40, border: "none", background: "transparent", color: C.textSecondary, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-left" size={22} color={C.textSecondary} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{year}年</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{yearCount}件</div>
            {!isCurrentYear && (
              <button
                onClick={goThisYear}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 12,
                  border: `1px solid ${C.primary}`,
                  background: "transparent", color: C.primary,
                  cursor: "pointer",
                }}
              >
                今年
              </button>
            )}
          </div>
          <button
            onClick={goNext}
            aria-label="次年"
            style={{ width: 40, height: 40, border: "none", background: "transparent", color: C.textSecondary, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="chevron-right" size={22} color={C.textSecondary} />
          </button>
        </div>

        {/* 横軸ヘッダ W1-W5 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `34px repeat(5, 1fr)`,
          columnGap: 3,
          padding: "0 0 5px",
          flexShrink: 0,
        }}>
          <div />
          {["W1","W2","W3","W4","W5"].map(l => (
            <div key={`dh-${l}`} style={{ fontSize: 11, color: C.textMuted, textAlign: "center", fontWeight: 600 }}>
              {l}
            </div>
          ))}
        </div>

        {/* 本体: 12 月 × 5 週 の grid (行高均等で画面残領域を使い切る) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `34px repeat(5, 1fr)`,
          gridTemplateRows: `repeat(12, 1fr)`,
          gap: 3,
          flex: 1,
          minHeight: 0,
        }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).flatMap(m => {
            const cells = [];
            const isCurMonth = (year === todayInfo.y && m === todayInfo.m);
            cells.push(
              <div
                key={`ml-${m}`}
                style={{
                  fontSize: 12,
                  color: isCurMonth ? C.primary : C.textMuted,
                  fontWeight: isCurMonth ? 700 : 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 4,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {_YH_MONTH_LABELS[m - 1]}
              </div>
            );
            for (let w = 0; w < 5; w++) {
              if (!_yhWeekExists(year, m, w)) {
                cells.push(<YearHeatmapCell key={`c-${m}-${w}`} kind="empty" month={m} week={w} />);
                continue;
              }
              const slot = yearMap[m][w];
              const intensity = _yhWeekIntensity(slot.practices);
              const hasTournament = slot.tournaments.length > 0;
              const hasTrial = _yhWeekHasTrial(slot, trialLinks);
              const isThisWeek = (year === todayInfo.y && m === todayInfo.m && w === todayInfo.w);
              const isSelected = !!(selected && selected.m === m && selected.w === w);
              cells.push(
                <YearHeatmapCell
                  key={`c-${m}-${w}`}
                  kind="in"
                  month={m}
                  week={w}
                  intensity={intensity}
                  hasTournament={hasTournament}
                  hasTrial={hasTrial}
                  isThisWeek={isThisWeek}
                  isSelected={isSelected}
                  onClick={handleWeekClick}
                />
              );
            }
            return cells;
          })}
        </div>

        {/* 凡例 (色スケール + 大会帯 + 試打ドット) */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px 10px",
          padding: "8px 2px 0",
          fontSize: 11,
          color: C.textMuted,
          flexShrink: 0,
          borderTop: `1px dashed ${C.divider}`,
          marginTop: 6,
        }}>
          <span>練習</span>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: C.panel2 }} />
          <span style={{ width: 14, height: 14, borderRadius: 3, background: C.practiceLight }} />
          <span style={{ width: 14, height: 14, borderRadius: 3, background: C.practiceMid }} />
          <span style={{ width: 14, height: 14, borderRadius: 3, background: C.practiceAccent }} />
          <span>多</span>
          <span style={{ marginLeft: 8, width: 14, height: 14, borderRadius: 3, background: C.practiceMid, position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: C.tournamentAccent }} />
          </span>
          <span>大会</span>
          <span style={{ marginLeft: 8, width: 8, height: 8, borderRadius: "50%", background: C.trialAccent, border: `1px solid #fff`, display: "inline-block", verticalAlign: "middle" }} />
          <span>試打</span>
        </div>
      </>

      {selected && selectedSlot && (
        <WeekPanel
          weekLabel={selectedLabel}
          items={selectedItems}
          onClose={() => setSelected(null)}
          onCardClick={onCardClick}
        />
      )}
    </div>
  );
}
