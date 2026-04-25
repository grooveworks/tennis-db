// SessionsTab — Sessions タブ本体 (S9 年間濃淡 mode 追加、DESIGN_SYSTEM §8.5 / WIREFRAMES §2.2.0/§2.2.1/§2.2.2/§2.2.3)
// props:
//   tournaments, practices, trials: 配列 (親から渡る、normDate は親で正規化済みでも未正規化でも OK)
//   loading: ロード中
//   onCardClick: カードタップ (S10 で画面遷移に接続、S8-S9 は toast 表示のみ)
//   onFabClick:  FAB タップ (S12 で QuickAdd に接続、S8-S9 は toast 表示のみ)
// やること:
//   - 検索窓 (タイトル/会場/対戦相手/メモを横断) + 軸別絞り込みチップ (種類/ラケット/対戦相手/結果)
//   - サマリーヘッダ右端の表示モード切替 (リスト / カレンダー / 年間濃淡、localStorage 永続化)
//   - リスト mode: 時間軸密度可変リスト (週/月/年) + 結果の階層表現 (優勝=gold, 準優勝=silver, 3位=bronze)
//   - カレンダー mode: 月マス + 色濃度 + 大会トロフィー + 試打紫点、日タップで直下に DayPanel
//   - 年間濃淡 mode: 縦 12 月 × 横 31 日 の 365 マス、年切替、日タップで直下に DayPanel (S8 と同一)
//   - FAB 右下、絞り込みは全 mode に効く
//   - state は localStorage に保存 (v4-sessions-search / v4-sessions-filters / v4-sessions-viewmode)
// やらないこと (別 Stage): 詳細画面 slide-in (S10)

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

// ── 大会の形式 (singles/doubles/mixed) → カテゴリーバッジ
// v3 line 2746-2747, 2764 から移植 (S6 で漏れていた)。練習の種別バッジと対称に「③ 何の種類」を伝える。
// 色は v4 DESIGN_SYSTEM §1.2 準拠の tournament variant (オレンジ系) で統一、区別はアイコンで。
const _mapTournamentType = (t) => {
  if (!t) return null;
  const map = {
    "singles": { variant: "tournament", icon: "user",  label: "シングルス" },
    "doubles": { variant: "tournament", icon: "users", label: "ダブルス" },
    "mixed":   { variant: "tournament", icon: "users", label: "ミックス" },
  };
  return map[t] || null;
};

// ── 結果 → Badge + highlight マッピング (大会のみ)
const _mapTournamentResult = (result) => {
  if (!result) return { badge: null, highlight: null };
  const map = {
    "優勝":     { badge: { variant: "tournament", icon: "trophy", label: "優勝" },   highlight: "gold" },
    "準優勝":   { badge: { variant: "info",       icon: "medal",  label: "準優勝" }, highlight: "silver" },
    "3位":      { badge: { variant: "bronze",     icon: "award",  label: "3位" },    highlight: "bronze" },
    "ベスト8":   { badge: { variant: "warning", label: "ベスト8" },   highlight: null },
    "ベスト16":  { badge: { variant: "warning", label: "ベスト16" },  highlight: null },
    "予選突破": { badge: { variant: "success", label: "予選突破" }, highlight: null },
    "敗退":     { badge: { variant: "error",   label: "敗退" },     highlight: null },
    "予選敗退": { badge: { variant: "error",   label: "予選敗退" }, highlight: null },
  };
  return map[result] || { badge: { variant: "default", label: result }, highlight: null };
};

// ── 試打 judgment → sideBadge マッピング (S6 残置、将来の試打一覧で再利用予定)
const _mapTrialJudgment = (judgment) => {
  if (!judgment) return null;
  const map = {
    "採用候補": { variant: "success", icon: "badge-check", label: "採用候補" },
    "保留":     { variant: "warning", label: "保留" },
    "却下":     { variant: "error",   label: "却下" },
  };
  return map[judgment] || { variant: "trial", label: judgment };
};

// ── 練習 type → カテゴリーバッジ (「③ 何の種類」の役割を担う)
// 左の緑帯でカテゴリーは「練習」と分かるが、どの種別 (スクール/自主練/練習試合 等) かは
// バッジで明示しないと 800 件のスクロール中に視線が情報を掴めない。
// S8.5: マップ未登録の type (v2 Apple Watch import 等でカテゴリ未指定の generic "練習" 等) は
//       null 返却してバッジ抑制。左の緑帯だけで「これは練習」は伝わるので情報重複を避ける。
const _PRACTICE_TYPE_ICONS = {
  "スクール":   "graduation-cap",
  "自主練":     "person-standing",
  "練習会":     "users",
  "ゲーム練習": "swords",
  "球出し":     "target",
  "練習試合":   "trophy",
  "フィジカル": "dumbbell",
};
const _mapPracticeType = (t) => {
  if (!t) return null;
  if (!(t in _PRACTICE_TYPE_ICONS)) return null;
  return { variant: "practice", icon: _PRACTICE_TYPE_ICONS[t], label: t };
};

const _joinMeta = (parts) => parts.filter(x => x).join(" / ");

// ── 1 件を SessionCard props に変換
const _buildCardProps = (type, item) => {
  if (type === "tournament") {
    const typeBadge = _mapTournamentType(item.type);  // 形式 (S/D/Mix) を category badge に
    const { badge, highlight } = _mapTournamentResult(item.overallResult);
    const matches = Array.isArray(item.matches) ? item.matches : [];
    const wins = matches.filter(m => m.result === "勝利" || m.result === "win").length;
    const losses = matches.filter(m => m.result === "敗北" || m.result === "loss").length;
    const parts = [];
    // 形式 (singles/doubles/mixed) は category badge に出すので meta からは除外
    if (matches.length > 0) parts.push(`${wins}勝${losses}敗`);
    if (item.startTime) parts.push(item.startTime);   // 開始時刻 (「いつやるか」は一次情報)
    if (item.venue) parts.push(item.venue);
    return {
      type, date: item.date,
      title: item.name || "(無題の大会)",
      metaLine: _joinMeta(parts),
      highlight,
      sideBadge: typeBadge,
      resultBadge: badge,
    };
  }
  if (type === "practice") {
    const typeBadge = _mapPracticeType(item.type);
    const parts = [];
    // 時間帯 (start-end) は「いつやるか」の一次情報、meta 先頭に出す (v3 line 2788 相当)
    if (item.startTime) {
      parts.push(item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime);
    }
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
  // S11 暫定 (S16 まで): 試打を独立カードとして表示 (種類フィルタで明示選択時のみ呼ばれる)
  // S16 (Gear タブ完成) で削除予定
  if (type === "trial") {
    const judgmentBadge = _mapTrialJudgment(item.judgment);
    const ratings = ["spin", "power", "control", "info", "maneuver", "swingThrough"]
      .map(k => Number(item[k]) || 0).filter(v => v > 0);
    const avg = ratings.length > 0 ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1) : null;
    const parts = [];
    if (item.spin)   parts.push(`スピン${item.spin}`);
    if (item.power)  parts.push(`推進${item.power}`);
    if (avg)         parts.push(`平均 ${avg}`);
    if (item.venue)  parts.push(item.venue);
    const stringInfo = [item.stringMain, item.stringCross].filter(Boolean).join(" / ");
    return {
      type, date: item.date,
      title: item.racketName ? (stringInfo ? `${item.racketName} / ${stringInfo}` : item.racketName) : "(ラケット未選択)",
      metaLine: _joinMeta(parts),
      sideBadge: judgmentBadge,
    };
  }
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

// ── S7: 検索・絞り込み / S8: 表示モード ─────────────────────────────────
const LS_SEARCH   = "v4-sessions-search";
const LS_FILTERS  = "v4-sessions-filters";
const LS_VIEWMODE = "v4-sessions-viewmode";
const _loadViewMode = () => {
  try {
    const v = localStorage.getItem(LS_VIEWMODE);
    if (v === "calendar") return "calendar";
    if (v === "year") return "year";
    return "list";
  } catch { return "list"; }
};
const FILTER_AXES = ["type", "racket", "opponent", "result"];
const RESULT_OPTIONS = ["優勝","準優勝","3位","ベスト8","ベスト16","予選突破","敗退","予選敗退"];
// S11 暫定 (S16 で削除): 「試打」を種類フィルタに追加。
//   既定では試打を独立カードに出さない (WIREFRAMES §2.2.1) が、種類フィルタで「試打」を
//   選択した時のみ表示する。Gear タブ (S16) 完成で試打集約画面ができたら削除。
const TYPE_OPTIONS   = ["大会", "練習", "試打"];
const FILTER_CHIP_LABEL    = { type: "種類",        racket: "ラケット",        opponent: "対戦相手",        result: "結果" };
const FILTER_DRAWER_TITLE  = { type: "種類で絞り込む", racket: "ラケットで絞り込む", opponent: "対戦相手で絞り込む", result: "結果で絞り込む" };

const _emptyFilters = () => ({ type: [], racket: [], opponent: [], result: [] });
const _loadSearch = () => { try { return localStorage.getItem(LS_SEARCH) || ""; } catch { return ""; } };
const _loadFilters = () => {
  try {
    const raw = localStorage.getItem(LS_FILTERS);
    if (!raw) return _emptyFilters();
    const obj = JSON.parse(raw);
    const base = _emptyFilters();
    FILTER_AXES.forEach(k => {
      if (Array.isArray(obj[k])) base[k] = obj[k].filter(v => typeof v === "string" && v.length > 0);
    });
    return base;
  } catch { return _emptyFilters(); }
};

// ラケット候補: 大会/練習/試打の racketName + 試合 match.racketName の union
// S11 で trials も含めるよう拡張 (種類フィルタで「試打」選択時にもラケット絞り込みが効く)
const _extractRackets = (tournaments, practices, trials) => {
  const s = new Set();
  tournaments.forEach(t => {
    if (t.racketName) s.add(t.racketName);
    (Array.isArray(t.matches) ? t.matches : []).forEach(m => { if (m && m.racketName) s.add(m.racketName); });
  });
  practices.forEach(p => { if (p.racketName) s.add(p.racketName); });
  (trials || []).forEach(tr => { if (tr.racketName) s.add(tr.racketName); });
  return [...s].sort((a, b) => a.localeCompare(b, "ja"));
};

// 対戦相手候補: matches[].opponent / opponent2 の union (大会のみ)
const _extractOpponents = (tournaments) => {
  const s = new Set();
  tournaments.forEach(t => {
    (Array.isArray(t.matches) ? t.matches : []).forEach(m => {
      if (m && m.opponent)  s.add(m.opponent);
      if (m && m.opponent2) s.add(m.opponent2);
    });
  });
  return [...s].sort((a, b) => a.localeCompare(b, "ja"));
};

// 1 件のエントリから取り得るラケット名を配列で返す
const _entryRackets = (entry) => {
  const it = entry.item;
  const out = [];
  if (it.racketName) out.push(it.racketName);
  if (entry.type === "tournament") {
    (Array.isArray(it.matches) ? it.matches : []).forEach(m => { if (m && m.racketName) out.push(m.racketName); });
  }
  return out;
};

// 1 件のエントリから取り得る対戦相手名を配列で返す (大会のみ、練習は空)
const _entryOpponents = (entry) => {
  if (entry.type !== "tournament") return [];
  const out = [];
  (Array.isArray(entry.item.matches) ? entry.item.matches : []).forEach(m => {
    if (m && m.opponent)  out.push(m.opponent);
    if (m && m.opponent2) out.push(m.opponent2);
  });
  return out;
};

// 検索語 (q) がエントリのどこかに含まれるか (部分一致、大小英字無視)
const _matchesSearch = (entry, q) => {
  const trimmed = (q || "").trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  const hit = (s) => !!s && String(s).toLowerCase().includes(lower);
  const it = entry.item;
  if (entry.type === "tournament") {
    if (hit(it.name) || hit(it.venue) || hit(it.generalNote)) return true;
    const matches = Array.isArray(it.matches) ? it.matches : [];
    for (const m of matches) {
      if (!m) continue;
      if (hit(m.opponent) || hit(m.opponent2) || hit(m.opponentNote) || hit(m.mentalNote) || hit(m.techNote) || hit(m.note)) return true;
    }
    return false;
  }
  if (entry.type === "practice") {
    return hit(it.title) || hit(it.venue) || hit(it.coachNote) || hit(it.goodNote) || hit(it.improveNote) || hit(it.generalNote);
  }
  if (entry.type === "trial") {
    return hit(it.racketName) || hit(it.stringMain) || hit(it.stringCross) || hit(it.venue)
        || hit(it.strokeNote) || hit(it.serveNote) || hit(it.volleyNote) || hit(it.generalNote);
  }
  return false;
};

// 各絞り込み軸の判定 (全て AND、同一軸の複数値は OR)
const _matchesFilters = (entry, filters) => {
  if (filters.type.length > 0) {
    const label = entry.type === "tournament" ? "大会"
                : entry.type === "practice"   ? "練習"
                : entry.type === "trial"      ? "試打"
                : "";
    if (!filters.type.includes(label)) return false;
  } else {
    // S11 暫定 (S16 で削除): 既定 (type フィルタ未指定) では試打は独立カードとして出さない。
    // 「試打」を選択した時のみ表示する。WIREFRAMES §2.2.1 の方針を保ちつつ、
    // S16 (Gear タブ) 完成までの動線として暫定許可。
    if (entry.type === "trial") return false;
  }
  if (filters.racket.length > 0) {
    const rs = _entryRackets(entry);
    if (!filters.racket.some(r => rs.includes(r))) return false;
  }
  if (filters.opponent.length > 0) {
    const ops = _entryOpponents(entry);
    if (!filters.opponent.some(o => ops.includes(o))) return false;
  }
  if (filters.result.length > 0) {
    if (entry.type !== "tournament") return false;
    if (!filters.result.includes(entry.item.overallResult)) return false;
  }
  return true;
};

const _hasAnyFilter = (filters, search) => {
  if ((search || "").trim().length > 0) return true;
  return FILTER_AXES.some(k => (filters[k] || []).length > 0);
};

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

  // S7: 検索・絞り込み state (localStorage 永続化)
  const [search, setSearch] = useState(_loadSearch);
  const [filters, setFilters] = useState(_loadFilters);
  const [openDrawerAxis, setOpenDrawerAxis] = useState(null); // "type"|"racket"|"opponent"|"result"|null
  useEffect(() => { try { localStorage.setItem(LS_SEARCH, search || ""); } catch {} }, [search]);
  useEffect(() => { try { localStorage.setItem(LS_FILTERS, JSON.stringify(filters)); } catch {} }, [filters]);

  // S8-S9: 表示モード切替 (list / calendar / year、localStorage 永続化)
  const [viewMode, setViewMode] = useState(_loadViewMode);
  useEffect(() => { try { localStorage.setItem(LS_VIEWMODE, viewMode); } catch {} }, [viewMode]);
  // S8-S9: カレンダー/年間 mode で DayPanel が開いているか (FAB を退避させる)
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  // mode 切替で DayPanel state をリセット (list mode には DayPanel が無いため取り残し防止)
  useEffect(() => { setDayPanelOpen(false); }, [viewMode]);

  // 全アイテムを {type, item} にまとめて date desc ソート
  // 試打 (trial) は基本は付随活動 (バッジ表示) だが、S11 暫定で type フィルタ「試打」選択時のみ
  // 独立カードとして表示するため、allItems には含める。フィルタ判定 (_matchesFilters) で除外/許可。
  // S16 (Gear タブ) 完成で暫定削除予定。
  const allItems = useMemo(() => {
    const list = [];
    tournaments.forEach(it => list.push({ type: "tournament", item: it }));
    practices.forEach(it => list.push({ type: "practice", item: it }));
    trials.forEach(it => list.push({ type: "trial", item: it }));
    list.sort((a, b) => normDate(b.item.date).localeCompare(normDate(a.item.date)));
    return list;
  }, [tournaments, practices, trials]);

  // S7: 絞り込み軸の候補 (元データから動的抽出)
  const racketOptions   = useMemo(() => _extractRackets(tournaments, practices, trials), [tournaments, practices, trials]);
  const opponentOptions = useMemo(() => _extractOpponents(tournaments), [tournaments]);

  // S7: 検索 + 絞り込み適用後のアイテム
  const filteredItems = useMemo(
    () => allItems.filter(e => _matchesSearch(e, search) && _matchesFilters(e, filters)),
    [allItems, search, filters]
  );
  const filterActive = _hasAnyFilter(filters, search);

  // 試打の紐付き Set (元データ基準でバッジ判定、絞り込みには影響しない)
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

    filteredItems.forEach((entry) => {
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
  }, [filteredItems]);

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

  // S7: Drawer が現在開いている軸の選択肢
  const axisOptions =
    openDrawerAxis === "type"     ? TYPE_OPTIONS     :
    openDrawerAxis === "racket"   ? racketOptions    :
    openDrawerAxis === "opponent" ? opponentOptions  :
    openDrawerAxis === "result"   ? RESULT_OPTIONS   : [];
  const clearAxis = (axis) => setFilters(prev => ({ ...prev, [axis]: [] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SummaryHeader
        tournaments={tournaments}
        practices={practices}
        filtered={filterActive}
        filteredCount={filteredItems.length}
        totalCount={allItems.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* メイン領域: mode で list / calendar / year を切替 */}
      {viewMode === "calendar" ? (
        loading ? (
          <div style={{ flex: 1, textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            読み込み中...
          </div>
        ) : (
          <CalendarView
            items={filteredItems}
            trialLinks={trialLinks}
            onCardClick={onCardClick}
            onPanelStateChange={setDayPanelOpen}
          />
        )
      ) : viewMode === "year" ? (
        loading ? (
          <div style={{ flex: 1, textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            読み込み中...
          </div>
        ) : (
          <YearHeatmap
            items={filteredItems}
            trialLinks={trialLinks}
            onCardClick={onCardClick}
            onPanelStateChange={setDayPanelOpen}
          />
        )
      ) : (
      /* リスト mode (S7 までの内容) */
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 12px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            読み込み中...
          </div>
        ) : !hasAny ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
            {filterActive ? "条件に合う記録がありません" : "データがありません"}
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
      )}

      {/* S7: 操作帯 (画面下、TabBar 直上) — タップした直上に Drawer がせり上がる導線 */}
      <div style={{
        borderTop: `1px solid ${C.divider}`,
        background: C.bg,
        flexShrink: 0,
      }}>
        {/* 絞り込みチップ行 (横スクロール) */}
        <div style={{
          display: "flex", gap: 8,
          padding: "8px 16px",
          overflowX: "auto",
        }}>
          {FILTER_AXES.map(axis => (
            <FilterChip
              key={axis}
              label={FILTER_CHIP_LABEL[axis]}
              selectedValues={filters[axis]}
              onOpen={() => setOpenDrawerAxis(axis)}
              onClear={filters[axis].length > 0 ? () => clearAxis(axis) : undefined}
            />
          ))}
        </div>
        {/* 検索行 */}
        <div style={{ padding: "0 16px 8px" }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* FAB: 操作帯 (約 108px) + TabBar (56px) の上に浮かせる。
          カレンダー/年間 mode で DayPanel が開いている時は重なり回避のため非表示 (パネルを閉じれば再表示) */}
      {!((viewMode === "calendar" || viewMode === "year") && dayPanelOpen) && (
        <FAB onClick={onFabClick} ariaLabel="記録を追加" bottom={180} />
      )}

      {/* S7: 絞り込みドロワー (画面下シート) */}
      <FilterDrawer
        open={!!openDrawerAxis}
        title={openDrawerAxis ? FILTER_DRAWER_TITLE[openDrawerAxis] : ""}
        options={axisOptions}
        selected={openDrawerAxis ? (filters[openDrawerAxis] || []) : []}
        onApply={(newSel) => {
          if (openDrawerAxis) setFilters(prev => ({ ...prev, [openDrawerAxis]: newSel }));
          setOpenDrawerAxis(null);
        }}
        onClose={() => setOpenDrawerAxis(null)}
      />
    </div>
  );
}
