// SessionsTab — Sessions タブ本体 (S6 作り直し、DESIGN_SYSTEM §8.5 / WIREFRAMES §2.2.1)
// props:
//   tournaments, practices, trials: 配列 (親から渡る、normDate は親で正規化済みでも未正規化でも OK)
//   loading: ロード中
//   onCardClick: カードタップ (S10 で画面遷移に接続、S6 は toast 表示のみ)
//   onFabClick:  FAB タップ (S12 で QuickAdd に接続、S6 は toast 表示のみ)
// やること:
//   - サマリーヘッダ + 時間軸密度可変リスト (週/月/年)
//   - 結果の階層表現を反映 (優勝=gold, 準優勝=silver, 3位=bronze, 他=通常)
//   - FAB 右下
// やらないこと (別 Stage): 検索 (S7), 絞り込みチップ (S7), 表示切替 (S8), カレンダー (S8), 年間濃淡 (S9), 詳細画面 (S10)

// ── 時間軸密度化ヘルパー (カレンダー通りの日曜始まり)
const _getSundayOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun, 6=Sat
  x.setDate(x.getDate() - day); // 同じ週の日曜へ
  x.setHours(0, 0, 0, 0);
  return x;
};
const _toDateISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const _weekLabel = (weekStartISO, now) => {
  const start = new Date(weekStartISO + "T00:00:00");
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const currentWeekStart = _getSundayOfWeek(now);
  const dayDiff = Math.round((currentWeekStart - start) / (1000 * 60 * 60 * 24));
  const weekOffset = Math.round(dayDiff / 7);
  const range = `${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`;
  if (weekOffset === 0)  return `今週 (${range})`;
  if (weekOffset === 1)  return `先週 (${range})`;
  if (weekOffset === -1) return `来週 (${range})`;
  return range;
};
const _monthLabel = (key) => {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[1]}年${Number(m[2])}月` : key;
};
const _yearLabel = (key) => `${key}年`;

// ── 結果 → Badge + highlight マッピング (大会のみ)
const _mapTournamentResult = (result) => {
  if (!result) return { badge: null, highlight: null };
  const map = {
    "優勝":     { badge: { variant: "tournament", icon: "trophy", label: "優勝" },   highlight: "gold" },
    "準優勝":   { badge: { variant: "info",       icon: "medal",  label: "準優勝" }, highlight: "silver" },
    "3位":      { badge: { variant: "trial",      icon: "award",  label: "3位" },    highlight: "bronze" },
    "ベスト8":   { badge: { variant: "warning", label: "ベスト8" },   highlight: null },
    "ベスト16":  { badge: { variant: "warning", label: "ベスト16" },  highlight: null },
    "予選突破": { badge: { variant: "success", label: "予選突破" }, highlight: null },
    "敗退":     { badge: { variant: "error",   label: "敗退" },     highlight: null },
    "予選敗退": { badge: { variant: "error",   label: "予選敗退" }, highlight: null },
  };
  return map[result] || { badge: { variant: "default", label: result }, highlight: null };
};

// ── 試打 judgment → sideBadge マッピング
const _mapTrialJudgment = (judgment) => {
  if (!judgment) return null;
  const map = {
    "採用候補": { variant: "success", icon: "badge-check", label: "採用候補" },
    "保留":     { variant: "warning", label: "保留" },
    "却下":     { variant: "error",   label: "却下" },
  };
  return map[judgment] || { variant: "trial", label: judgment };
};

// ── 練習 type → sideBadge マッピング (S6 revision: 種別を一目で分かるよう復活)
const _mapPracticeType = (t) => {
  if (!t) return null;
  const iconMap = {
    "スクール":   "graduation-cap",
    "自主練":     "person-standing",
    "練習会":     "users",
    "ゲーム練習": "swords",
    "球出し":     "target",
    "練習試合":   "trophy",
    "フィジカル": "dumbbell",
  };
  return { variant: "practice", icon: iconMap[t], label: t };
};

const _joinMeta = (parts) => parts.filter(x => x).join(" / ");

// ── 1 件を SessionCard props に変換
const _buildCardProps = (type, item) => {
  if (type === "tournament") {
    const { badge, highlight } = _mapTournamentResult(item.overallResult);
    const matches = Array.isArray(item.matches) ? item.matches : [];
    const wins = matches.filter(m => m.result === "勝利" || m.result === "win").length;
    const losses = matches.filter(m => m.result === "敗北" || m.result === "loss").length;
    const parts = [];
    if (item.type) parts.push(item.type);
    if (matches.length > 0) parts.push(`${wins}勝${losses}敗`);
    if (item.venue) parts.push(item.venue);
    return {
      type, date: item.date,
      title: item.name || "(無題の大会)",
      metaLine: _joinMeta(parts),
      highlight, resultBadge: badge,
    };
  }
  if (type === "practice") {
    const typeBadge = _mapPracticeType(item.type);
    const parts = [];
    // 種別は badge に移したので meta からは外す
    if (item.duration) parts.push(`${item.duration}分`);
    if (item.heartRateAvg) parts.push(`心拍${item.heartRateAvg}`);
    if (item.venue && item.title !== item.venue) parts.push(item.venue);
    return {
      type, date: item.date,
      title: item.title || item.venue || "(無題の練習)",
      metaLine: _joinMeta(parts),
      sideBadge: typeBadge,
    };
  }
  // 試打は Sessions 一覧には表示しない (大会/練習へのリンクバッジ経由)
  return { type, date: item.date, title: "" };
};

// ── 試打の紐付きを逆引き: tournament.id / practice.id ごとに「この日に試打あり」を示す Set
const _buildTrialLinkedSets = (tournaments, practices, trials) => {
  const linkedTournamentIds = new Set();
  const linkedPracticeIds = new Set();
  // tournament の match id → tournament id の逆引きマップ
  const matchToTournament = new Map();
  tournaments.forEach(t => {
    const matches = Array.isArray(t.matches) ? t.matches : [];
    matches.forEach(m => { if (m.id) matchToTournament.set(m.id, t.id); });
  });
  trials.forEach(tr => {
    if (tr.linkedMatchId) {
      const tId = matchToTournament.get(tr.linkedMatchId);
      if (tId) linkedTournamentIds.add(tId);
    }
    if (tr.linkedPracticeId) {
      linkedPracticeIds.add(tr.linkedPracticeId);
    }
  });
  return { linkedTournamentIds, linkedPracticeIds };
};

const TRIAL_BADGE = { variant: "trial", icon: "badge-check", label: "試打" };

// ── 本体
function SessionsTab({ tournaments = [], practices = [], trials = [], loading = false, onCardClick, onFabClick }) {
  const [collapsedYears, setCollapsedYears] = useState(() => {
    try { return JSON.parse(localStorage.getItem("v4-sessions-collapsed-years") || "{}"); }
    catch { return {}; }
  });
  const toggleYear = (key) => {
    setCollapsedYears(prev => {
      // undefined を折り畳みとして扱う (初期状態は折り畳み)
      const currentlyCollapsed = prev[key] !== false;
      const next = { ...prev, [key]: currentlyCollapsed ? false : true };
      try { localStorage.setItem("v4-sessions-collapsed-years", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  // 予定セクションの折り畳み状態 (既定は折り畳み、明示展開時のみ false)
  const [futureCollapsed, setFutureCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem("v4-sessions-future-collapsed");
      return v === null ? true : JSON.parse(v);
    } catch { return true; }
  });
  const toggleFuture = () => {
    setFutureCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("v4-sessions-future-collapsed", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // 全アイテムを {type, item} にまとめて date desc ソート
  // 試打 (trial) は大会/練習への付随活動なので一覧からは除外 (バッジで示す)
  const allItems = useMemo(() => {
    const list = [];
    tournaments.forEach(it => list.push({ type: "tournament", item: it }));
    practices.forEach(it => list.push({ type: "practice", item: it }));
    list.sort((a, b) => normDate(b.item.date).localeCompare(normDate(a.item.date)));
    return list;
  }, [tournaments, practices]);

  // 試打の紐付き Set
  const trialLinks = useMemo(() => _buildTrialLinkedSets(tournaments, practices, trials), [tournaments, practices, trials]);

  // 時間軸密度でグループ化 (未来/週/月/年の 4 バケット、週はカレンダー通り日曜始まり)
  const grouped = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentWeekStart = _getSundayOfWeek(now); // 今週の日曜
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999); // 今週の土曜夜
    const fourWeeksBefore = new Date(currentWeekStart);
    fourWeeksBefore.setDate(fourWeeksBefore.getDate() - 28); // 4 週前の日曜
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const future = [];                         // 今週の土曜より後
    const weeks = {}, months = {}, years = {};
    const weekOrder = [], monthOrder = [], yearOrder = [];

    allItems.forEach((entry) => {
      const nd = normDate(entry.item.date);
      const m = nd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return;
      const date = new Date(nd + "T00:00:00");
      if (isNaN(date)) return;

      if (date > currentWeekEnd) {
        // 来週以降の予定
        future.push(entry);
      } else if (date >= fourWeeksBefore) {
        // 今週含む直近 4 週 (今週の未来日も同じ週に含める)
        const sunday = _getSundayOfWeek(date);
        const key = _toDateISO(sunday);
        if (!weeks[key]) { weeks[key] = []; weekOrder.push(key); }
        weeks[key].push(entry);
      } else if (date >= oneYearAgo) {
        const key = `${m[1]}-${m[2]}`;
        if (!months[key]) { months[key] = []; monthOrder.push(key); }
        months[key].push(entry);
      } else {
        const yKey = m[1], mKey = `${m[1]}-${m[2]}`;
        if (!years[yKey]) { years[yKey] = { total: 0, months: {}, monthOrder: [] }; yearOrder.push(yKey); }
        if (!years[yKey].months[mKey]) { years[yKey].months[mKey] = []; years[yKey].monthOrder.push(mKey); }
        years[yKey].months[mKey].push(entry);
        years[yKey].total++;
      }
    });

    weekOrder.sort((a, b) => b.localeCompare(a));
    monthOrder.sort((a, b) => b.localeCompare(a));
    yearOrder.sort((a, b) => b.localeCompare(a));
    future.sort((a, b) => normDate(a.item.date).localeCompare(normDate(b.item.date)));

    return { future, weeks, weekOrder, months, monthOrder, years, yearOrder, now };
  }, [allItems]);

  const renderCard = (entry, i) => {
    const props = _buildCardProps(entry.type, entry.item);
    // その日に紐付いた試打がある場合はリンクバッジを付与
    const id = entry.item.id;
    const hasTrialLink =
      (entry.type === "tournament" && trialLinks.linkedTournamentIds.has(id)) ||
      (entry.type === "practice"   && trialLinks.linkedPracticeIds.has(id));
    if (hasTrialLink) props.trialBadge = TRIAL_BADGE;
    return (
      <SessionCard
        key={`${entry.type}-${id || i}`}
        {...props}
        onClick={onCardClick ? () => onCardClick(entry.type, entry.item) : undefined}
      />
    );
  };

  const hasAny = grouped.future.length > 0 || grouped.weekOrder.length > 0 || grouped.monthOrder.length > 0 || grouped.yearOrder.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SummaryHeader
        tournaments={tournaments}
        practices={practices}
      />

      {/* スクロール領域 */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            読み込み中...
          </div>
        ) : !hasAny ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            データがありません
          </div>
        ) : (
          <>
            {/* 未来の予定 (既定で折り畳み、今週を画面上部に出すため) */}
            {grouped.future.length > 0 && (
              <div>
                <TimeGroupHeader
                  level="month"
                  label="予定（未来）"
                  count={grouped.future.length}
                  collapsible={true}
                  collapsed={futureCollapsed}
                  onToggle={toggleFuture}
                />
                {!futureCollapsed && grouped.future.map(renderCard)}
              </div>
            )}

            {/* 直近 4 週 (週ごと) */}
            {grouped.weekOrder.map((wk) => (
              <div key={`w-${wk}`}>
                <TimeGroupHeader level="week" label={_weekLabel(wk, grouped.now)} />
                {grouped.weeks[wk].map(renderCard)}
              </div>
            ))}

            {/* 4 週 〜 1 年 (月ごと) */}
            {grouped.monthOrder.map((mo) => (
              <div key={`m-${mo}`}>
                <TimeGroupHeader level="month" label={_monthLabel(mo)} count={grouped.months[mo].length} />
                {grouped.months[mo].map(renderCard)}
              </div>
            ))}

            {/* 1 年以上前 (年ごと、既定で折り畳み) */}
            {grouped.yearOrder.map((y) => {
              const yr = grouped.years[y];
              // デフォルト動作: 未設定 = 折り畳み (true)、明示的に展開された時だけ false
              const collapsed = collapsedYears[y] !== false;
              return (
                <div key={`y-${y}`}>
                  <TimeGroupHeader
                    level="year"
                    label={_yearLabel(y)}
                    count={yr.total}
                    collapsible={true}
                    collapsed={collapsed}
                    onToggle={() => toggleYear(y)}
                  />
                  {!collapsed && yr.monthOrder.map((mo) => (
                    <div key={`y-${y}-m-${mo}`}>
                      <TimeGroupHeader level="month" label={_monthLabel(mo)} count={yr.months[mo].length} />
                      {yr.months[mo].map(renderCard)}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      <FAB onClick={onFabClick} ariaLabel="記録を追加" />
    </div>
  );
}
