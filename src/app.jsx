// v4 アプリ本体 (Stage S6: Sessions リスト基盤)
// 機能範囲:
//   - ログイン前: LoginScreen 表示
//   - ログイン後: Firestore から tournaments/practices/trials を読み取り + リアルタイム同期 + 日付正規化
//   - Sessions タブで表示 (新カード + サマリー + 時間軸密度)
//   - 他タブは S13-S18 のプレースホルダ
// S6 は読み取り専用。カードタップ/FAB は placeholder toast。

// ── 日付正規化 (core/04_id.js の normDate を経由、v4 canonical は YYYY-MM-DD)
//    v3 の古い YYYY/M/D データを読んだ時、表示・比較用にメモリ内だけで正規化
//    (Firestore への書き戻しは S11 編集時に行う = 遅延マイグレーション、ROADMAP 方針)
const normalizeItems = (items) => (items || []).map(it => ({ ...it, date: normDate(it.date) }));

// ── Firestore 読み取り: セッション 3 種 + master データ 4 種 (S11 で master 追加)
//    master (rackets/strings/venues/opponents) は v3 と Firestore collection 共有、編集画面の Select で利用
//    v3 と同じく collection 全体を 1 回で取得 (S13: 7 個 await の sequential を batch に変更、5-10x 高速化)
const loadSessionsFromFirestore = async (user) => {
  if (!user) return null;
  // S14: next も読込追加 (Home Current Context / Next Actions で使用)
  // S16 Phase 4-A: stringSetups を読込追加 (Manage Masters セッティング組合せ用、現状は読込のみ、UI は Phase 4-B)
  const keys = ["tournaments", "practices", "trials", "rackets", "strings", "venues", "opponents", "next", "quickTrialCards", "stringSetups"];
  const results = {};
  for (const k of keys) results[k] = []; // 既定値 (取得失敗時用)
  try {
    // S15.5.3 fix: Chrome で Firestore get が永遠に pending になるケースで Sessions タブが
    //   「読み込み中」のまま固まる問題に対応 → 15 秒で timeout、ローカルデータで表示続行
    const snap = await Promise.race([
      fbDb.collection("users").doc(user.uid).collection("data").get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("FIRESTORE_GET_TIMEOUT_15S")), 15000)),
    ]);
    snap.forEach(doc => {
      const id = doc.id;
      if (!keys.includes(id)) return;
      const data = doc.data();
      const items = data && data.items;
      if (Array.isArray(items)) results[id] = items;
    });
    return results;
  } catch (err) {
    console.error("Firestore batch load error:", err);
    return null;  // null を返すことで呼び出し側で「ローカルデータ維持」分岐へ
  }
};

// master データ → Select の options 用に name 配列を抽出
// item は {name, ...} オブジェクト or 文字列の両方に対応
const _extractName = (item) => (typeof item === "string" ? item : (item?.name || ""));
const _extractNames = (list) => (list || []).map(_extractName).filter(Boolean);

// 大会クラス: v3 標準 7 オプション + 既存 tournament[].level から動的抽出 (重複除去)
//   ユーザー独自のクラス名 (S 級 / 県大会 等) にも MasterField 経由で対応
const _TOURNAMENT_LEVEL_DEFAULTS = ["中上級", "オープン", "中級", "市民大会", "一般", "交流戦", "草トー"];
const _extractLevels = (tournaments) => {
  const set = new Set(_TOURNAMENT_LEVEL_DEFAULTS);
  (tournaments || []).forEach(t => { if (t.level) set.add(t.level); });
  return [..._TOURNAMENT_LEVEL_DEFAULTS, ...[...set].filter(v => !_TOURNAMENT_LEVEL_DEFAULTS.includes(v))];
};

// ── プレースホルダタブ (S13-S18 で実装)
function PlaceholderTab({ name, stage }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      color: C.textMuted,
      textAlign: "center",
    }}>
      <Icon name="clock" size={40} color={C.textMuted} />
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12, color: C.textSecondary }}>
        {name}タブ
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        {stage} で実装予定
      </div>
    </div>
  );
}

// ── Dev モード (Phase B 検証用) ────────────────────────────────────────
//   URL に ?dev=1 を付けると Google SSO をスキップして fixture JSON を localStorage に展開、
//   Firestore 接続せず純粋にローカルで動かす。本番データには絶対に触らない。
//   ?dev=1&reset=1 で localStorage を全クリアして fixture を再ロード。
//
//   なぜ存在するか: Claude (私) が動作確認するための擬似環境。
//   通常ユーザーは ?dev=1 を付けない限り影響なし。
const _isDevMode = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("dev") === "1";
  } catch (_) { return false; }
};
const _isDevReset = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("reset") === "1";
  } catch (_) { return false; }
};
const _devFakeUser = { uid: "dev-local-user", displayName: "Dev", email: "dev@local" };
// fixture を localStorage に展開 (既存値は上書きしない、reset=1 の時のみ全クリア後に展開)
const _loadDevFixture = async () => {
  // KEYS と fixture フィールド名のマップ (fixture は v3 互換 export 形式)
  const fields = ["tournaments", "practices", "trials", "rackets", "strings", "venues", "opponents", "next", "stringSetups", "quickTrialCards"];
  const alreadyLoaded = (lsLoad(KEYS.tournaments) || []).length > 0;
  if (alreadyLoaded && !_isDevReset()) return false;
  // reset=1: 関連 LS キーを全クリア
  if (_isDevReset()) {
    fields.forEach(k => {
      try { localStorage.removeItem(LS_PREFIX + k + "-v1"); } catch (_) {}
    });
  }
  try {
    const res = await fetch("/v4/dev-fixture.json");
    if (!res.ok) throw new Error("dev-fixture.json not found");
    const data = await res.json();
    fields.forEach(k => {
      const v = data[k];
      if (Array.isArray(v)) lsSave(k, v);
    });
    return true;
  } catch (err) {
    console.error("Dev fixture load failed:", err);
    return false;
  }
};

function TennisDB() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  // リクエスト 3 (Phase B): タブ状態を localStorage 保存して reload 後復元。
  //   旧: 必ず home に戻る (デフォルト) → ユーザーが Sessions タブ作業中の reload で home に飛ぶ
  //   新: 最後のタブを LS_UI_KEYS.activeTab に保存、初期化時にそこから復元
  //   許可タブ集合に該当しない値が入っていた場合は home にフォールバック (将来タブ削除時の安全策)
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_UI_KEYS.activeTab);
      const VALID_TABS = ["home", "sessions", "gear", "plan", "insights"];
      return saved && VALID_TABS.includes(saved) ? saved : "home";
    } catch (_) { return "home"; }
  });
  useEffect(() => {
    try { localStorage.setItem(LS_UI_KEYS.activeTab, tab); } catch (_) {}
  }, [tab]);
  const [tournaments, setTournaments] = useState([]);
  const [practices, setPractices] = useState([]);
  const [trials, setTrials] = useState([]);
  // S11: master データ (rackets/strings/venues/opponents) を Select の候補として読み込む
  const [rackets, setRackets]     = useState([]);
  const [strings, setStringsList] = useState([]);
  const [venues, setVenues]       = useState([]);
  const [opponents, setOpponents] = useState([]);
  // S14: next (Home の Current Context / Next Actions で使用)
  const [next, setNext] = useState([]);
  // S15.5: quickTrialCards (試打カード式 QuickTrialMode で使用)
  const [quickTrialCards, setQuickTrialCards] = useState([]);
  const [quickTrial, setQuickTrial] = useState(false); // QuickTrialMode 表示
  // S16 Phase 4-A: stringSetups (Manage Masters セッティング組合せ。Phase 4-A では読込のみ、UI は Phase 4-D)
  const [stringSetups, setStringSetups] = useState([]);
  // S16 Phase 4-A: Gear タブ Strings 編集 Modal の対象 (null=閉じている、{}=新規追加、{id,...}=編集)
  const [stringEditTarget, setStringEditTarget] = useState(null);
  // S16 Phase 4-B: Racket Detail (slide-in) と Racket / Measurement の編集 Modal
  const [racketDetail, setRacketDetail] = useState(null);     // 開いている racket オブジェクト or null
  const [racketEditTarget, setRacketEditTarget] = useState(null); // null=閉、{}=新規、{id,..}=編集
  const [measurementEditTarget, setMeasurementEditTarget] = useState(null); // {racketId, item} or null
  // S16 Phase 4-C-1: Setting History の期間タップ → Period Detail (slide-in)
  const [periodDetail, setPeriodDetail] = useState(null); // { racket, period } or null
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null); // S10: { type, session, mode } | null
  const [weather, setWeather] = useState(null); // S13.5: Open-Meteo 当日気温 { temp, code } | null
  const toast = useToast();
  const cfm = useConfirm();

  // 初回: localStorage からロード (ログイン前でも日付正規化して表示可)
  useEffect(() => {
    setTournaments(normalizeItems(lsLoad(KEYS.tournaments) || []));
    setPractices(normalizeItems(lsLoad(KEYS.practices) || []));
    setTrials(normalizeItems(lsLoad(KEYS.trials) || []));
    setRackets(lsLoad(KEYS.rackets)     || []);
    setStringsList(lsLoad(KEYS.strings) || []);
    setVenues(lsLoad(KEYS.venues)       || []);
    setOpponents(lsLoad(KEYS.opponents) || []);
    // S14: next もローカルから初期ロード
    setNext(lsLoad(KEYS.next) || []);
    // S15.5: quickTrialCards もローカルから
    setQuickTrialCards(lsLoad(KEYS.quickTrialCards) || []);
    // S16 Phase 4-A: stringSetups もローカルから (assignDefaultOrders で order 遅延付与、in-memory 整形のみ、書き戻し無し)
    setStringSetups(assignDefaultOrders(lsLoad(KEYS.stringSetups) || []));
  }, []);

  // S16.11: 起動時 localStorage 自動 snapshot
  //   - 1 日 1 回、`${LS_PREFIX}snapshot-${YYYY-MM-DD}` キーで保存
  //   - 7 日より古い snapshot は削除
  //   - データ消失時の復旧経路 (export と組み合わせて 7 日以内なら復元可能)
  //   - 既存データを変更しない (新キーへの書き込みのみ)
  useEffect(() => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayKey = `${LS_PREFIX}snapshot-${yyyy}-${mm}-${dd}-v1`;
      // S16.11.1 fix: 今日の snapshot 既存時もクリーンアップは実行する (snapshot 作成と分離)
      // 1) 今日の snapshot がなければ作成
      if (!localStorage.getItem(todayKey)) {
        const snapshot = {
          snapshotAt: today.toISOString(),
          tournaments:     lsLoad(KEYS.tournaments)     || [],
          practices:       lsLoad(KEYS.practices)       || [],
          trials:          lsLoad(KEYS.trials)          || [],
          rackets:         lsLoad(KEYS.rackets)         || [],
          strings:         lsLoad(KEYS.strings)         || [],
          venues:          lsLoad(KEYS.venues)          || [],
          opponents:       lsLoad(KEYS.opponents)       || [],
          next:            lsLoad(KEYS.next)            || [],
          quickTrialCards: lsLoad(KEYS.quickTrialCards) || [],
          stringSetups:    lsLoad(KEYS.stringSetups)    || [],
        };
        localStorage.setItem(todayKey, JSON.stringify(snapshot));
      }
      // 2) 7 日より古い snapshot を削除 (毎起動で実行、新規作成有無に関わらず)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const keysToRemove = [];
      const prefix = `${LS_PREFIX}snapshot-`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        // キー形式: yuke-snapshot-YYYY-MM-DD-v1
        const m = k.match(/snapshot-(\d{4})-(\d{2})-(\d{2})-v1$/);
        if (!m) continue;
        const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
        if (d < cutoff) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      // localStorage Quota 超過などは silent では NG だが、起動時なので toast 未初期化
      console.error("Auto snapshot failed:", err);
    }
  }, []);

  // S16.11 F8: lsSave / Firestore save エラーを toast で通知 (silent fail 廃止)
  //   storage.js の notifySaveError から listener 経由で受信 → 即時 toast
  useEffect(() => {
    const unsubscribe = onSaveError((errInfo) => {
      const msg = `保存エラー (${errInfo.key}): ${errInfo.message}`;
      console.error(msg);
      toast.show(msg, "error");
    });
    return unsubscribe;
  }, [toast]);

  // S14: 天気取得 拡張 (Open-Meteo、key 不要、CORS 対応)
  //   current: 気温 / 天気コード / 降水確率 / 風速 / 体感気温
  //   hourly:  気温 / 天気コード / 降水確率 (24 時間分)
  //   daily:   最高 / 最低気温 (1 日分)
  //   wind_speed_unit=ms で m/s 単位 (テニス UI に合わせる)
  // 位置は埼玉県固定 (35.85, 139.65)。profile から取得は後 Stage で
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = "https://api.open-meteo.com/v1/forecast"
          + "?latitude=35.85&longitude=139.65"
          + "&current=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,apparent_temperature"
          + "&hourly=temperature_2m,weather_code,precipitation_probability"
          + "&daily=temperature_2m_max,temperature_2m_min"
          + "&timezone=Asia%2FTokyo"
          + "&forecast_days=1"
          + "&wind_speed_unit=ms";
        const r = await fetch(url);
        if (!r.ok) return;
        const data = await r.json();
        const cur = data && data.current;
        if (!cur || typeof cur.temperature_2m !== "number") return;
        const daily = data && data.daily;
        const hData = data && data.hourly;
        // hourly: array index 0..23 = 当日各時刻 (timezone=Asia/Tokyo)
        const hourly = [];
        if (hData && Array.isArray(hData.time)) {
          for (let i = 0; i < hData.time.length; i++) {
            const ts = String(hData.time[i] || "");
            const m = ts.match(/T(\d{2}):/);
            if (!m) continue;
            const h = parseInt(m[1], 10);
            if (h < 0 || h > 23) continue;
            hourly[h] = {
              temp: hData.temperature_2m ? hData.temperature_2m[i] : null,
              code: hData.weather_code   ? hData.weather_code[i]   : null,
              rain: hData.precipitation_probability ? hData.precipitation_probability[i] : null,
            };
          }
        }
        setWeather({
          temp:          cur.temperature_2m,
          code:          cur.weather_code,
          precipitation: cur.precipitation_probability,
          wind:          cur.wind_speed_10m,
          apparent:      cur.apparent_temperature,
          todayHigh:     daily && daily.temperature_2m_max ? daily.temperature_2m_max[0] : null,
          todayLow:      daily && daily.temperature_2m_min ? daily.temperature_2m_min[0] : null,
          hourly,
        });
      } catch (err) {
        console.warn("Weather fetch error:", err);
      }
    };
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 30 * 60 * 1000); // 30 分ごとに更新
    return () => clearInterval(intervalId);
  }, []);

  // S14 P2: 天気詳細 Modal の開閉
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const handleWeatherClick = () => { if (weather) setWeatherModalOpen(true); };
  const handleWeatherClose = () => setWeatherModalOpen(false);

  // S15.5.7: 設定 Modal + 文字サイズ scale (メモ系のみ適用)
  //   localStorage 永続化、CSS variable 経由で子コンポーネントに伝播
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(LS_PREFIX + "memo-font-scale-v1"));
      if (v === 1.0 || v === 1.15 || v === 1.30) return v;
    } catch (_) {}
    return 1.0;
  });
  const handleSettingsClick = () => setSettingsOpen(true);
  const handleSettingsClose = () => setSettingsOpen(false);
  const handleFontScaleChange = (scale) => {
    setFontScale(scale);
    try { localStorage.setItem(LS_PREFIX + "memo-font-scale-v1", String(scale)); } catch (_) {}
  };

  // Google カレンダーインポート: JSON から tournaments[] / practices[] を id ベースで dedupe マージ
  //   既存と同じ id があれば skip (上書きしない、ユーザー編集を保護)
  //   新規 id のみ追加、save() 経由で Firestore + localStorage に反映
  // 入力は (a) File オブジェクト or (b) なし → アプリ同一ドメインの calendar_import.json を fetch
  const handleImportCalendarJson = useCallback(async (file) => {
    try {
      let text;
      if (file) {
        text = await file.text();
      } else {
        // ファイル選択なし → 標準パスから fetch (Google カレンダーから生成された最新の JSON)
        const res = await fetch("./calendar_import.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`calendar_import.json 読み込み失敗 (HTTP ${res.status})`);
        text = await res.text();
      }
      const data = JSON.parse(text);
      const importedTour = Array.isArray(data.tournaments) ? data.tournaments : [];
      const importedPrac = Array.isArray(data.practices) ? data.practices : [];

      const existingTourIds = new Set((tournaments || []).map(t => t && t.id).filter(Boolean));
      const existingPracIds = new Set((practices || []).map(p => p && p.id).filter(Boolean));

      const newTour = importedTour.filter(t => t && t.id && !existingTourIds.has(t.id));
      const newPrac = importedPrac.filter(p => p && p.id && !existingPracIds.has(p.id));
      const skipTour = importedTour.length - newTour.length;
      const skipPrac = importedPrac.length - newPrac.length;

      if (newTour.length === 0 && newPrac.length === 0) {
        toast.show(`インポートする新規データなし (重複 ${skipTour + skipPrac} 件は skip)`, "info");
        return;
      }

      if (newTour.length > 0) {
        const merged = [...newTour, ...(tournaments || [])];
        setTournaments(merged);
        save(KEYS.tournaments, merged);
      }
      if (newPrac.length > 0) {
        const merged = [...newPrac, ...(practices || [])];
        setPractices(merged);
        save(KEYS.practices, merged);
      }

      toast.show(
        `インポート完了: 大会 +${newTour.length} / 練習 +${newPrac.length} (重複 skip ${skipTour + skipPrac} 件)`,
        "success"
      );
    } catch (err) {
      console.error("Import failed:", err);
      toast.show(`インポート失敗: ${err?.message || err}`, "error");
    }
  }, [tournaments, practices, toast]);

  // 31-2: 既存セッションのメモを一括 AI 要約
  //   全 tournaments / practices / trials を走査、memoSummaries 未保存の field を summarizeSessionMemos で要約
  //   Cloud Functions 呼出は逐次 (rate limit 配慮)、進捗は state で UI に伝播
  const [bulkSummarizeProgress, setBulkSummarizeProgress] = useState({ running: false, done: 0, total: 0, lastLabel: "" });
  const handleBulkSummarize = useCallback(async () => {
    // 対象アイテムを集める (memoSummaries に未登録の field がある & memo > 60 文字 の組み合わせ)
    const _hasUnsummarizedMemo = (item, fields) => {
      if (!item) return false;
      const sums = item.memoSummaries || {};
      for (const f of fields) {
        const v = item[f];
        if (typeof v === "string" && v.trim().length >= 60 && !(sums[f] && sums[f].trim())) return true;
      }
      return false;
    };
    const tournamentFields = ["generalNote"];
    const matchFields = ["mentalNote", "techNote", "opponentNote", "note"];
    const practiceFields = ["generalNote", "focus", "coachNote", "goodNote", "improveNote"];
    const trialFields = ["generalNote", "strokeNote", "serveNote", "volleyNote"];

    const targets = [];
    (tournaments || []).forEach(t => {
      if (_hasUnsummarizedMemo(t, tournamentFields)) targets.push({ type: "tournament", id: t.id, label: `大会: ${t.name || t.date}` });
      (t.matches || []).forEach(m => {
        if (_hasUnsummarizedMemo(m, matchFields)) targets.push({ type: "match", parentId: t.id, matchId: m.id, label: `試合: ${m.opponent || m.round || ""}` });
      });
    });
    (practices || []).forEach(p => {
      if (_hasUnsummarizedMemo(p, practiceFields)) targets.push({ type: "practice", id: p.id, label: `練習: ${p.title || p.date}` });
    });
    (trials || []).forEach(tr => {
      if (_hasUnsummarizedMemo(tr, trialFields)) targets.push({ type: "trial", id: tr.id, label: `試打: ${tr.racketName || tr.date}` });
    });

    if (targets.length === 0) {
      toast.show("AI 要約対象のメモはありません (全て要約済 or 60 文字未満)", "info");
      return;
    }

    setBulkSummarizeProgress({ running: true, done: 0, total: targets.length, lastLabel: "開始..." });

    let updatedTournaments = [...(tournaments || [])];
    let updatedPractices = [...(practices || [])];
    let updatedTrials = [...(trials || [])];
    let successCount = 0, failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const tgt = targets[i];
      setBulkSummarizeProgress({ running: true, done: i, total: targets.length, lastLabel: tgt.label });
      try {
        if (tgt.type === "tournament") {
          const item = updatedTournaments.find(x => x.id === tgt.id);
          if (!item) continue;
          const sums = await summarizeSessionMemos("tournament", item);
          if (sums && Object.keys(sums).length > 0) {
            const merged = { ...item, memoSummaries: { ...(item.memoSummaries || {}), ...sums } };
            updatedTournaments = updatedTournaments.map(x => x.id === tgt.id ? merged : x);
            successCount++;
          }
        } else if (tgt.type === "match") {
          const parent = updatedTournaments.find(x => x.id === tgt.parentId);
          if (!parent) continue;
          const m = (parent.matches || []).find(x => x.id === tgt.matchId);
          if (!m) continue;
          const sums = await summarizeSessionMemos("match", m);
          if (sums && Object.keys(sums).length > 0) {
            const newMatches = (parent.matches || []).map(x => x.id === tgt.matchId
              ? { ...x, memoSummaries: { ...(x.memoSummaries || {}), ...sums } } : x);
            const newParent = { ...parent, matches: newMatches };
            updatedTournaments = updatedTournaments.map(x => x.id === tgt.parentId ? newParent : x);
            successCount++;
          }
        } else if (tgt.type === "practice") {
          const item = updatedPractices.find(x => x.id === tgt.id);
          if (!item) continue;
          const sums = await summarizeSessionMemos("practice", item);
          if (sums && Object.keys(sums).length > 0) {
            const merged = { ...item, memoSummaries: { ...(item.memoSummaries || {}), ...sums } };
            updatedPractices = updatedPractices.map(x => x.id === tgt.id ? merged : x);
            successCount++;
          }
        } else if (tgt.type === "trial") {
          const item = updatedTrials.find(x => x.id === tgt.id);
          if (!item) continue;
          const sums = await summarizeSessionMemos("trial", item);
          if (sums && Object.keys(sums).length > 0) {
            const merged = { ...item, memoSummaries: { ...(item.memoSummaries || {}), ...sums } };
            updatedTrials = updatedTrials.map(x => x.id === tgt.id ? merged : x);
            successCount++;
          }
        }
      } catch (err) {
        console.error("Bulk summarize error:", tgt, err);
        failCount++;
      }
    }

    setBulkSummarizeProgress({ running: true, done: targets.length, total: targets.length, lastLabel: "保存中..." });

    // 全件処理後に state + Firestore に保存
    if (updatedTournaments !== tournaments) {
      setTournaments(updatedTournaments);
      save(KEYS.tournaments, updatedTournaments);
    }
    if (updatedPractices !== practices) {
      setPractices(updatedPractices);
      save(KEYS.practices, updatedPractices);
    }
    if (updatedTrials !== trials) {
      setTrials(updatedTrials);
      save(KEYS.trials, updatedTrials);
    }

    setBulkSummarizeProgress({ running: false, done: 0, total: 0, lastLabel: "" });
    toast.show(`AI 要約完了: 成功 ${successCount} 件 / 失敗 ${failCount} 件`, failCount > 0 ? "warning" : "success");
  }, [tournaments, practices, trials, toast]);

  // 認証状態監視 + リアルタイム同期
  useEffect(() => {
    // Dev モード分岐: Firestore / Auth に一切繋がず、fixture をローカル展開して即起動
    //   通常ユーザーは ?dev=1 を付けない限りこの分岐に入らない
    if (_isDevMode()) {
      (async () => {
        await _loadDevFixture();
        // localStorage から各 state を再読み込み (既存の初回ロード経路と同じ)
        setTournaments(normalizeItems(lsLoad(KEYS.tournaments) || []));
        setPractices(normalizeItems(lsLoad(KEYS.practices) || []));
        setTrials(normalizeItems(lsLoad(KEYS.trials) || []));
        setRackets(assignDefaultOrders(lsLoad(KEYS.rackets) || []));
        setStringsList(assignDefaultOrders(lsLoad(KEYS.strings) || []));
        setVenues(lsLoad(KEYS.venues) || []);
        setOpponents(lsLoad(KEYS.opponents) || []);
        setNext(lsLoad(KEYS.next) || []);
        setQuickTrialCards(lsLoad(KEYS.quickTrialCards) || []);
        setStringSetups(assignDefaultOrders(lsLoad(KEYS.stringSetups) || []));
        setUser(_devFakeUser);
        setAuthReady(true);
      })();
      return; // unsubAuth / unsubSnapshot 設定なし
    }

    let unsubSnapshot = null;
    const unsubAuth = fbAuth.onAuthStateChanged(async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        // 前回の snapshot があれば解除 (再ログイン時の二重購読防止)
        if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
        // S15.5.6 fix: localStorage にデータがあれば「読み込み中」表示せず即表示
        //   Chrome で Firestore 読み込みが遅い時 (15 秒待ち等) のユーザー体験改善
        //   Firestore 取得完了後に state を静かに更新 (差分があれば反映)
        //   初回ログイン (localStorage 空) のみ loading 表示 → 15 秒 timeout で諦め
        const hasLocalData = (lsLoad(KEYS.tournaments) || []).length > 0
                          || (lsLoad(KEYS.practices) || []).length > 0
                          || (lsLoad(KEYS.trials) || []).length > 0;
        if (!hasLocalData) setLoading(true);
        try {
          // 1) 初回読み込み
          const data = await loadSessionsFromFirestore(u);
          if (data) {
            const t = normalizeItems(data.tournaments);
            const p = normalizeItems(data.practices);
            const tr = normalizeItems(data.trials);
            setTournaments(t); setPractices(p); setTrials(tr);
            // S11: master データもセット
            // S16 Phase 4-A: rackets / strings に assignDefaultOrders を適用 (in-memory 整形、書き戻しは reorder UI 操作時のみ)
            setRackets(assignDefaultOrders(data.rackets || []));
            setStringsList(assignDefaultOrders(data.strings || []));
            setVenues(data.venues || []);
            setOpponents(data.opponents || []);
            // S14: next も
            setNext(data.next || []);
            // S15.5: quickTrialCards も
            setQuickTrialCards(data.quickTrialCards || []);
            // S16 Phase 4-A: stringSetups (Phase 4-A 読込のみ、UI 編集は Phase 4-B)
            setStringSetups(assignDefaultOrders(data.stringSetups || []));
            // localStorage には正規化前の原データを保存 (v3 互換のため)
            lsSave(KEYS.tournaments, data.tournaments);
            lsSave(KEYS.practices, data.practices);
            lsSave(KEYS.trials, data.trials);
            lsSave(KEYS.rackets, data.rackets);
            lsSave(KEYS.strings, data.strings);
            lsSave(KEYS.venues, data.venues);
            lsSave(KEYS.opponents, data.opponents);
            lsSave(KEYS.next, data.next);
            lsSave(KEYS.quickTrialCards, data.quickTrialCards);
            lsSave(KEYS.stringSetups, data.stringSetups);
            toast.show("クラウドから読み込みました", "success");
          } else {
            // S15.5.3 fix: data=null = Firestore get が timeout/error
            //   localStorage は既にロード済 (97-111 行) なので、そのデータで継続表示
            //   onSnapshot は別途設定するので、後で接続できれば自動同期
            toast.show("クラウド読み込みエラー (ローカルデータで表示中、回線確認を)", "warning");
          }
          // 2) リアルタイム同期 (v3 と同じ collection レベル onSnapshot)
          const dataRef = fbDb.collection("users").doc(u.uid).collection("data");
          unsubSnapshot = dataRef.onSnapshot((snap) => {
            snap.docChanges().forEach((change) => {
              // F-A1 (Phase A 監査): removed change を明示的に通知。
              //   旧: removed を silent skip → 別端末で誤削除されたことに気付けない
              //   新: 警告 toast + log で通知、state はそのまま (ローカルデータを保護)
              //   通常の save() は ref.set() で書くだけなので、removed は管理コンソール直接操作 / Firestore Rules 異常時のみ
              if (change.type === "removed") {
                console.error(`Firestore doc removed unexpectedly: ${change.doc.id}`);
                if (toast) toast.show(`同期異常検知: ${change.doc.id} がサーバ側で削除されました (ローカルデータは保護)`, "warning");
                return;
              }
              if (change.type !== "modified" && change.type !== "added") return;
              const key = change.doc.id;
              const docData = change.doc.data() || {};
              const val = docData.items;
              if (!Array.isArray(val)) return;

              // S16.11 F1 ガード: hasPendingWrites の自 echo は無視
              //   (closure stale 回避のため、ローカル件数比較は setX(prev=>...) 内で行う)
              if (change.doc.metadata?.hasPendingWrites === true) return;

              // F1 ガード本体: prev (現 state) と val (server) を比較して、空上書き / 急減を拒否
              //   - 拒否時は prev をそのまま返す (state 変更なし、lsSave も skip)
              //   - 拒否を toast で通知
              //   - 受け入れる時のみ lsSave 実行
              const guardAndApply = (prev, transform) => {
                const prevArr = Array.isArray(prev) ? prev : [];
                // F-A2 (Phase A 監査): 閾値 5 → 1 に下げる。
                //   旧: 5 件未満の master (venues/opponents/next 等) が空配列で来た時に無防備
                //   新: 1 件以上ローカルにあるなら、サーバ側 0 件は無条件で拒否
                if (prevArr.length >= 1 && val.length === 0) {
                  console.error(`F1 GUARD: Refused empty array overwrite for ${key} (local=${prevArr.length}, server=0)`);
                  if (toast) toast.show(`同期異常検知: ${key} がサーバ側で空のため保護`, "warning");
                  return prev;
                }
                // 50% 急減: 閾値 10 → 4 に下げる (5 件→2 件のような小規模急減も拾う)
                if (prevArr.length >= 4 && val.length < prevArr.length * 0.5) {
                  console.error(`F1 GUARD: Refused 50% reduction for ${key} (local=${prevArr.length}, server=${val.length})`);
                  if (toast) toast.show(`同期異常検知: ${key} が ${prevArr.length}→${val.length} 件に急減、保護`, "warning");
                  return prev;
                }
                lsSave(key, val);
                return transform(val);
              };

              if (key === "tournaments") setTournaments(prev => guardAndApply(prev, normalizeItems));
              else if (key === "practices") setPractices(prev => guardAndApply(prev, normalizeItems));
              else if (key === "trials") setTrials(prev => guardAndApply(prev, normalizeItems));
              // S16 Phase 4-A: rackets / strings / stringSetups は assignDefaultOrders を通す
              else if (key === "rackets")  setRackets(prev => guardAndApply(prev, assignDefaultOrders));
              else if (key === "strings")  setStringsList(prev => guardAndApply(prev, assignDefaultOrders));
              else if (key === "stringSetups") setStringSetups(prev => guardAndApply(prev, assignDefaultOrders));
              else if (key === "venues")   setVenues(prev => guardAndApply(prev, v => v));
              else if (key === "opponents") setOpponents(prev => guardAndApply(prev, v => v));
              else if (key === "next") setNext(prev => guardAndApply(prev, v => v));
              else if (key === "quickTrialCards") setQuickTrialCards(prev => guardAndApply(prev, v => v));
            });
          }, (err) => {
            console.error("Firestore snapshot error:", err);
          });
        } catch (err) {
          console.error("Firestore load error:", err);
          toast.show("クラウド読み込みエラー (ローカルデータで表示)", "warning");
        } finally {
          setLoading(false);
        }
      } else {
        // ログアウト時: snapshot 解除 + state リセット
        if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
        setTournaments([]); setPractices([]); setTrials([]);
      }
    });
    return () => {
      if (unsubSnapshot) unsubSnapshot();
      unsubAuth();
    };
  }, []);

  const handleLogout = () => {
    cfm.ask(
      "ログアウトします。クラウドとの同期が止まり、ローカルデータの表示だけになります。",
      async () => {
        try {
          await fbAuth.signOut();
          toast.show("ログアウトしました", "info");
        } catch (e) {
          toast.show("ログアウト失敗: " + e.message, "error");
        }
      },
      { title: "ログアウトの確認", yesLabel: "ログアウト", noLabel: "キャンセル", icon: "log-out", yesVariant: "primary" }
    );
  };

  // S10: カードタップで詳細 overlay を開く
  //      SessionsTab はマウントしたまま position:fixed で上から覆う (§N1.2 scrollTop 保持)
  // S13: ブラウザ戻る (左端スワイプ含む) で閉じられるよう history.pushState で履歴 entry 追加
  const handleCardClick = (type, item) => {
    setDetail({ type, session: item, mode: "detail" });
    try { window.history.pushState({ tdb: "detail" }, ""); } catch(_) {}
  };

  // ブラウザ戻る経由 (popstate) で setDetail(null) するため、ヘッダ戻るボタンも history.back() を呼ぶ
  // (history.back() → popstate → setDetail(null) の経路に統一して 1 entry きれいに消す)
  const handleDetailClose = () => {
    try { window.history.back(); } catch(_) { setDetail(null); }
  };

  // S10: 連携カード (紐づく試打 / 連携練習) のタップで別セッション詳細へ遷移
  //      key prop (session.id) が変わることで SessionDetailView が再マウント→slide-in 再発動
  const handleOpenLinkedSession = (nextType, nextSession) => {
    if (!nextSession || !nextSession.id) return;
    setDetail({ type: nextType, session: nextSession, mode: "detail" });
    try { window.history.pushState({ tdb: "detail" }, ""); } catch(_) {}
  };

  // S13: ブラウザ戻る / 左端スワイプ で詳細を閉じる (popstate listener)
  useEffect(() => {
    const onPop = () => setDetail(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // S16.10c: TabBar でタブを切り替えたら開いている詳細を閉じる
  //   ただし「編集中」(detail.mode === "edit") の試合・練習・試打詳細は閉じない
  //   = 試合中のメモ書きかけがタブ誤タップで消えないようにする
  //   ラケット詳細・期間詳細は中身を編集する画面ではないので無条件で閉じる
  useEffect(() => {
    setDetail(prev => prev?.mode === "edit" ? prev : null);
    setRacketDetail(null);
    setPeriodDetail(null);
  }, [tab]);

  // S11: 編集モードに切替 (再 mount せず、SessionDetailView 内で SessionEditView 表示)
  const handleEdit = (type, item) => {
    if (!item) return;
    setDetail({ type, session: item, mode: "edit" });
  };
  // S11: 編集破棄 → Detail に戻る
  const handleEditCancel = () => {
    setDetail(prev => prev ? { ...prev, mode: "detail" } : null);
  };

  // S11: 編集保存 (新規/更新両対応、S12 でも再利用予定)
  //      core/03_storage.js の save() を使用 (cleanForFirestore + 800ms debounce、v3 互換)
  // S13: tournament 編集中に matches[] が削除されていたら、紐付く trial.linkedMatchId を cascade クリア
  //      (cascade は保存時に確定 = 編集破棄なら trials も変更されない)
  const handleSave = async (type, updated) => {
    if (!updated || !updated.id) return;
    const key = type === "tournament" ? "tournaments" : type === "practice" ? "practices" : "trials";
    const current = type === "tournament" ? tournaments : type === "practice" ? practices : trials;
    const exists = (current || []).find(x => x.id === updated.id);
    const newItems = exists
      ? current.map(x => x.id === updated.id ? updated : x)
      : [updated, ...(current || [])];

    // S13: match 削除に伴う trial cascade (tournament 更新時のみ、新規追加には適用しない)
    let newTrials = trials;
    let cascadeCount = 0;
    if (type === "tournament" && exists && Array.isArray(exists.matches) && Array.isArray(updated.matches)) {
      const newIds = new Set(updated.matches.map(m => m && m.id).filter(Boolean));
      const removedMatches = exists.matches.filter(m => m && m.id && !newIds.has(m.id));
      for (const removed of removedMatches) {
        const c = computeCascade({ type: "match", item: removed, trials: newTrials });
        if (c.count > 0) {
          newTrials = applyCascadeToTrials(newTrials, c.affectedTrials);
          cascadeCount += c.count;
        }
      }
    }

    // 即時 state 更新 (onSnapshot 到来前に UI 反映)
    if (type === "tournament") setTournaments(newItems);
    else if (type === "practice") setPractices(newItems);
    else setTrials(newItems);
    if (cascadeCount > 0) setTrials(newTrials);

    // F-A5 (Phase A 監査): save() に統一して summarize background の write と同じ chain に直列化
    //   旧: Promise.all + 直接 ref.set() → summarize background の save() (別 chain) と race
    //        順序逆転で summary 結果が古い state で上書きされる可能性
    //   新: save() 経由で _pendingWrites[k] chain に乗せる → 同 key の write は厳密に順序保証
    //   lsSave は save() 内部でも呼ぶが、上の即時 lsSave() で UI 反映を最優先しているのでそのまま残す
    save(KEYS[key], newItems);
    if (cascadeCount > 0) save(KEYS.trials, newTrials);

    // Detail に戻る、最新データで再描画
    setDetail({ type, session: updated, mode: "detail" });
    const msg = cascadeCount > 0
      ? `保存しました (試合削除に伴い試打 ${cascadeCount} 件の連携を外しました)`
      : "保存しました";
    toast.show(msg, "success");

    // S16 Phase 4-C-3: 裏で AI 要約 (Claude Haiku) を呼ぶ
    //   保存自体は既に完了済 (UI ブロックしない)、要約完了次第 memoSummaries フィールドを更新
    //   失敗しても黙って無視 (line-clamp フォールバックで表示できる)
    summarizeSessionMemos(type, updated).then(summaries => {
      if (!summaries || Object.keys(summaries).length === 0) return;
      const setter = type === "tournament" ? setTournaments : type === "practice" ? setPractices : setTrials;
      setter(prev => {
        const live = (prev || []).find(x => x.id === updated.id);
        if (!live) return prev;
        const merged = { ...live, memoSummaries: { ...(live.memoSummaries || {}), ...summaries } };
        const newList = prev.map(x => x.id === updated.id ? merged : x);
        lsSave(KEYS[key], newList);
        save(KEYS[key], newList);
        return newList;
      });
    }).catch(err => { console.error("summarize background error:", err); });
  };

  // S13: 削除 + cascade (REQUIREMENTS N2.2)
  //      tournament 削除 → 紐付く trial.linkedMatchId を空に
  //      practice 削除 → 紐付く trial.linkedPracticeId を空に
  //      試打自体は残す。ConfirmDialog に件数を事前提示し、toast で結果報告。
  //      cascade 計算は src/domain/cascade.js (純関数)
  const handleDelete = (type, item) => {
    if (!item || !item.id) return;
    const typeLabel = type === "tournament" ? "大会" : type === "practice" ? "練習" : "試打";
    const key = type === "tournament" ? "tournaments" : type === "practice" ? "practices" : "trials";

    // S13: 削除前に cascade 影響を計算 (削除対象が trial の場合は count=0)
    const cascade = computeCascade({ type, item, trials });
    const desc = describeCascadeMessage(type, cascade.count);
    const messageNode = (
      <span style={{ display: "inline-block" }}>
        {desc.body}
        {desc.note && (<><br/><span style={{ fontSize: 12, color: C.textMuted }}>{desc.note}</span></>)}
        <br/><span style={{ fontSize: 12, color: C.textMuted }}>{desc.warn}</span>
      </span>
    );

    cfm.ask(
      messageNode,
      async () => {
        const current = type === "tournament" ? tournaments : type === "practice" ? practices : trials;
        const newItems = (current || []).filter(x => x.id !== item.id);
        // cascade 適用後の trials (削除対象が trial 自身、または影響 0 件のときは現状維持)
        const cascadeApplied = (type !== "trial" && cascade.count > 0);
        const newTrials = cascadeApplied ? applyCascadeToTrials(trials, cascade.affectedTrials) : trials;

        // 即時 state 更新 (onSnapshot 到来前に UI 反映)
        if (type === "tournament") setTournaments(newItems);
        else if (type === "practice") setPractices(newItems);
        else setTrials(newItems);
        if (cascadeApplied) setTrials(newTrials);

        // localStorage
        lsSave(KEYS[key], newItems);
        if (cascadeApplied) lsSave(KEYS.trials, newTrials);

        // Firestore 書き込み (削除対象 + cascade 後 trials を並行)
        if (user) {
          try {
            const writes = [
              fbDb.collection("users").doc(user.uid).collection("data").doc(key)
                .set({ items: cleanForFirestore(newItems) }, { merge: false }),
            ];
            if (cascadeApplied) {
              writes.push(
                fbDb.collection("users").doc(user.uid).collection("data").doc("trials")
                  .set({ items: cleanForFirestore(newTrials) }, { merge: false })
              );
            }
            await Promise.all(writes);
          } catch (e) {
            console.error("Firestore delete error:", e);
            toast.show("クラウド同期失敗 (ローカルは削除済み)", "warning");
            setDetail(null);
            return;
          }
        }
        setDetail(null);
        // toast: cascade 件数が 0 なら従来文言、>0 なら追記
        const msg = cascadeApplied
          ? `${typeLabel}を削除しました (試打 ${cascade.count} 件の連携を外しました)`
          : `${typeLabel}を削除しました`;
        toast.show(msg, "success");
      },
      { title: desc.title, yesLabel: "削除", yesVariant: "danger", icon: "trash-2" }
    );
  };

  // S15: マージ機能 (Sessions マージ — REQUIREMENTS F1.10)
  //   1. Detail のマージボタン → handleMergeStart で setMergeStarting({type, sourceItem})
  //   2. MergePartnerPicker で B を選ぶ → setMergePartner(itemB)
  //   3. MergeModal で choices 確定 → handleMergeConfirm で applyMerge + relinkAfterMerge + 物理削除 + Firestore 保存
  //   4. 統合後 A を Detail で再描画
  const [mergeStarting, setMergeStarting] = useState(null); // { type, sourceItem } | null
  const [mergePartner, setMergePartner] = useState(null);   // B (MergeModal の itemB)

  const handleMergeStart = (type, item) => {
    if (!item || !item.id) return;
    setMergeStarting({ type, sourceItem: item });
    setMergePartner(null);
  };
  const handlePartnerSelect = (itemB) => {
    if (!itemB || !itemB.id) return;
    setMergePartner(itemB);
  };
  const handleMergeCancel = () => {
    setMergeStarting(null);
    setMergePartner(null);
  };
  const handleMergeConfirm = async (merged, removed, choices) => {
    if (!mergeStarting || !merged || !removed) return;
    const type = mergeStarting.type;
    const key = type === "tournament" ? "tournaments" : type === "practice" ? "practices" : "trials";
    const current = type === "tournament" ? tournaments : type === "practice" ? practices : trials;

    // A を merged に置き換え + B を物理削除
    const newItems = (current || [])
      .filter(x => x.id !== removed.id)
      .map(x => x.id === merged.id ? merged : x);

    // trial.linkedXxx の付け替え (practice 同士のマージのみ実効果)
    const newTrials = relinkAfterMerge(trials, removed, merged, type);
    const trialsChanged = newTrials !== trials;
    const relinkCount = countRelinks(trials, removed, type);

    // 即時 state 反映 (onSnapshot 到来前に UI 更新)
    if (type === "tournament") setTournaments(newItems);
    else if (type === "practice") setPractices(newItems);
    else setTrials(newItems);
    if (trialsChanged) setTrials(newTrials);

    // localStorage
    lsSave(KEYS[key], newItems);
    if (trialsChanged) lsSave(KEYS.trials, newTrials);

    // Firestore (A 更新 + trials 更新を並行書き込み、handleDelete と同じパターン)
    if (user) {
      try {
        const writes = [
          fbDb.collection("users").doc(user.uid).collection("data").doc(key)
            .set({ items: cleanForFirestore(newItems) }, { merge: false }),
        ];
        if (trialsChanged) {
          writes.push(
            fbDb.collection("users").doc(user.uid).collection("data").doc("trials")
              .set({ items: cleanForFirestore(newTrials) }, { merge: false })
          );
        }
        await Promise.all(writes);
      } catch (e) {
        console.error("Firestore merge error:", e);
        toast.show("クラウド同期失敗 (ローカルは統合済み)", "warning");
      }
    }

    // Modal/Picker を閉じ、Detail を merged で再描画 (key 同じ id なので mode 維持)
    setMergeStarting(null);
    setMergePartner(null);
    setDetail({ type, session: merged, mode: "detail" });

    const typeLabel = type === "tournament" ? "大会" : type === "practice" ? "練習" : "試打";
    const msg = relinkCount > 0
      ? `${typeLabel}を統合しました (試打 ${relinkCount} 件の連携も付け替え)`
      : `${typeLabel}を統合しました`;
    toast.show(msg, "success");
  };

  // S12-S14: QuickAdd 起動 (Sessions FAB / Home 3 ボタン共用)
  //   Sessions FAB = "tournament" | "practice" (試打は除外、DECISIONS S12)
  //   Home 3 ボタン = "tournament" | "practice" | "trial" (S14、QuickAddModal trial 拡張)
  const [quickAddType, setQuickAddType] = useState(null);
  const handleFabClick = (type) => {
    if (type === "tournament" || type === "practice") {
      setQuickAddType(type);
    }
  };
  // S15.5+: Home の「現在の状況」 → 主力ラケット行タップ → Sessions タブをそのラケットでフィルタ
  //   localStorage に Sessions タブの filters を書き込み + setTab("sessions") で遷移
  //   SessionsTab は mount 時に _loadFilters で localStorage から filters 読み込むため、unmount → mount で反映
  const handleMainRacketClick = (racketName) => {
    if (!racketName) return;
    try {
      const filters = { type: [], racket: [racketName], opponent: [], result: [] };
      // H-24 (Phase A 監査): キーを LS_UI_KEYS から参照、SessionsTab.jsx と単一の真実に統一
      localStorage.setItem(LS_UI_KEYS.sessionsFilters, JSON.stringify(filters));
    } catch (_) {}
    setTab("sessions");
  };

  // S14: Home Quick Add 3 ボタン用
  // S15.5 fix: 試打 (trial) の起動先を QuickAddModal → QuickTrialMode (カード式) に切り替え
  //   フォーム入力経路は Home からは廃止 (DECISIONS S15.5、ユーザー判断)
  const handleHomeQuickAdd = (type) => {
    if (type === "trial") {
      setQuickTrial(true);
    } else if (type === "tournament" || type === "practice") {
      setQuickAddType(type);
    }
  };
  const handleQuickAddClose = () => setQuickAddType(null);
  // S15.5: QuickTrialMode (試打カード式) のカード state 永続化 + 保存ハンドラ
  //   - persistQuickTrialCards: state + lsSave + Firestore (debounced save)
  //   - handleQuickTrialSave: ({card, eval}) → trial 生成 (auto-link) → trials 追加 → カード削除 → toast
  //   - handleCreateCardFromTrial: TrialDetail から「試打カードに追加」 → 既存試打のラケット情報を新カードとして追加
  // S15.5.2: 関数形式 (prev => newCards) と直接形式 (newCards) の両方に対応
  //   QuickTrialMode の persistCurrentEval は stale closure 回避で関数形式を使う
  // S15.5.3 fix: Chrome の Background Tab Throttling で save() の setTimeout(800) が
  //   背景タブで発火されない問題に対応 → debounce を bypass して即時 Firestore write。
  //   handleDelete / handleMergeConfirm と同じ Promise.all/直接 set パターンに統一。
  //   (試打カード操作は頻繁ではないので debounce 最適化は不要)
  // F-A3 (Phase A 監査): save() を使用してシリアライズ + エラー通知を統一
  //   旧: 各 persistX が独自 queueMicrotask で fire-and-forget → 連続 save の到達順非保証
  //   新: save() の _pendingWrites chain で key 単位直列化、エラーは global onSaveError listener で toast
  const persistQuickTrialCards = (newCardsOrFn) => {
    setQuickTrialCards(prev => {
      const newCards = typeof newCardsOrFn === "function"
        ? newCardsOrFn(prev)
        : newCardsOrFn;
      save(KEYS.quickTrialCards, newCards);
      return newCards;
    });
  };

  const handleQuickTrialSave = async ({ card, eval: e }) => {
    if (!card || !card.id || !e) return;
    const todayDate = today();
    // 同日 practice → linkedPracticeId + temp/venue/weather 自動コピー (V2 互換 + weather 拡張)
    const matchingP = (practices || []).find(p => normDate(p.date) === todayDate);
    // 同日 tournament の最後の match → linkedMatchId
    // S16.11 C7: 候補が複数 (大会複数 OR match 複数) ある場合は誤紐付け防止のため自動推定しない
    //   = ユーザーが TrialDetail から手動で選び直す経路へ誘導 (linkedMatchId は空のまま保存)
    // S16.11 UX4: 後方互換として linkedMatchId も書く、新コードは linkedMatchIds 優先で読む
    let linkedMtchId = "";
    let linkedMtchIds = [];
    const sameDayTournaments = (tournaments || []).filter(trn => normDate(trn.date) === todayDate);
    if (sameDayTournaments.length === 1) {
      const onlyTrn = sameDayTournaments[0];
      const matches = Array.isArray(onlyTrn.matches) ? onlyTrn.matches : [];
      if (matches.length === 1 && matches[0]?.id) {
        linkedMtchId = matches[0].id;
        linkedMtchIds = [matches[0].id];
      }
      // matches.length が 2 以上 or 0 のときは未紐付け (ユーザーが手動でリンクする)
    }
    // sameDayTournaments.length === 0 or >= 2 のとき: linkedMtchId は "" のまま
    const trial = {
      id: genId(),
      date: todayDate,
      racketName: card.racket || "",
      stringMain: card.stringMain || "",
      stringCross: card.stringCross || "",
      tensionMain: card.tensionMain || "",
      tensionCross: card.tensionCross || "",
      temp: matchingP?.temp || "",
      venue: matchingP?.venue || "",
      weather: matchingP?.weather || "",
      judgment: "保留",
      spin: e.spin, power: e.power, control: e.control, info: e.info,
      maneuver: e.maneuver, swingThrough: e.swingThrough,
      trajectory: e.trajectory, stiffness: e.stiffness,
      shotForeAtk: e.shotForeAtk, shotForeDef: e.shotForeDef,
      shotBackAtk: e.shotBackAtk, shotBackDef: e.shotBackDef,
      shotSlice: e.shotSlice, shotServe: e.shotServe,
      shotVolley: e.shotVolley, shotReturn: e.shotReturn,
      confidence: e.confidence,
      strokeNote: "", serveNote: "", volleyNote: "",
      generalNote: e.memo || "",
      linkedPracticeId: matchingP?.id || "",
      linkedMatchId: linkedMtchId,        // 後方互換、旧コードはこちらを読む
      linkedMatchIds: linkedMtchIds,      // S16.11 UX4 新、配列で複数連携対応
    };
    const newTrials = [trial, ...(trials || [])];
    const newCards = (quickTrialCards || []).filter(c => c.id !== card.id);
    // 即時 state 更新 + localStorage
    setTrials(newTrials);
    setQuickTrialCards(newCards);
    lsSave(KEYS.trials, newTrials);
    lsSave(KEYS.quickTrialCards, newCards);
    // S15.5.3 fix: Chrome Background Throttling 回避のため、trials も quickTrialCards も
    //   即時 Firestore write (handleDelete と同じ Promise.all パターン)
    if (user) {
      try {
        await Promise.all([
          fbDb.collection("users").doc(user.uid).collection("data").doc(KEYS.trials)
            .set({ items: cleanForFirestore(newTrials), updatedAt: new Date().toISOString() }),
          fbDb.collection("users").doc(user.uid).collection("data").doc(KEYS.quickTrialCards)
            .set({ items: cleanForFirestore(newCards), updatedAt: new Date().toISOString() }),
        ]);
      } catch (err) {
        console.error("Firestore quickTrial save error:", err);
        toast.show("クラウド同期失敗 (ローカルは保存済み)", "warning");
        return;
      }
    }
    // toast (連携状況をユーザーに通知)
    const linked = !!matchingP || !!linkedMtchId;
    const linkMsg = linkedMtchId && matchingP ? "練習＋試合と紐付け"
                  : linkedMtchId ? "試合と紐付け"
                  : matchingP   ? "練習と紐付け" : "";
    toast.show(linked ? `試打を保存 → ${linkMsg}` : "試打を保存", "success");

    // S16.9: 試打カード経由でも AI 要約を裏で実行 (handleSave と同じ pattern)
    summarizeSessionMemos("trial", trial).then(summaries => {
      if (!summaries || Object.keys(summaries).length === 0) return;
      setTrials(prev => {
        const live = (prev || []).find(x => x.id === trial.id);
        if (!live) return prev;
        const merged = { ...live, memoSummaries: { ...(live.memoSummaries || {}), ...summaries } };
        const newList = prev.map(x => x.id === trial.id ? merged : x);
        lsSave(KEYS.trials, newList);
        save(KEYS.trials, newList);
        return newList;
      });
    }).catch(err => { console.error("trial summarize background error:", err); });

    // S16.11 UX1: 試打カード保存後、保存した試打を **編集モードで直接開く** (階層浅化)
    //   旧: QuickTrial → 詳細表示 → 編集ボタンタップ → 編集 (3 タップ)
    //   新: QuickTrial → 編集モード (0 タップ、保存直後に編集開始可能)
    //   ユーザーの「試打を保存した後すぐにメモ追加したい」フローを直接化
    setQuickTrial(false);
    setDetail({ type: "trial", session: trial, mode: "edit" });
    try { window.history.pushState({ tdb: "detail" }, ""); } catch(_) {}
  };

  // S15.5: 既存試打を試打カードに昇格 (TrialDetail から呼ぶ、毎回同じ設定の再利用に便利)
  const handleCreateCardFromTrial = (trial) => {
    if (!trial || !trial.racketName) return;
    // 同じ racket+string+tension のカードが既にあればスキップ (重複追加防止)
    const dupExists = (quickTrialCards || []).some(c =>
      c.racket === (trial.racketName || "")
      && (c.stringMain || "") === (trial.stringMain || "")
      && (c.stringCross || "") === (trial.stringCross || "")
      && (c.tensionMain || "") === (trial.tensionMain || "")
      && (c.tensionCross || "") === (trial.tensionCross || "")
    );
    if (dupExists) {
      toast.show("同じ設定のカードが既にあります", "info");
      return;
    }
    const newCard = {
      id: genId(),
      racket: trial.racketName || "",
      stringMain: trial.stringMain || "",
      stringCross: trial.stringCross || "",
      tensionMain: trial.tensionMain || "",
      tensionCross: trial.tensionCross || "",
    };
    persistQuickTrialCards([newCard, ...(quickTrialCards || [])]);
    toast.show("試打カードに追加しました", "success");
  };

  // QuickAdd 保存: handleSave (新規/更新両対応) を再利用 + Detail 画面で開く (閲覧モード)
  // S15.1 fix: handleCardClick と同じく history.pushState を 1 個積む。
  //   これがないと、新規追加 → Detail → 戻る で Tennis DB の前のページ (Google 等) に飛んでしまう
  //   (popstate listener が setDetail(null) するが、空回りで一覧表示にならない)
  const handleQuickAddSave = (item) => {
    const type = quickAddType;
    if (!type || !item) return;
    try { window.history.pushState({ tdb: "detail" }, ""); } catch(_) {}
    handleSave(type, item);    // localStorage + Firestore 保存 + Detail 画面遷移 (mode: "detail")
    setQuickAddType(null);     // QuickAddModal を閉じる
  };

  // S16 Phase 4-A: Gear タブ ストリング在庫の永続化
  // F-A3: save() に統一して直列化 + エラー通知を一元化
  const persistStrings = (newList) => {
    setStringsList(newList);
    save(KEYS.strings, newList);
  };

  // 並び順編集 ▲▼ タップ: reorder.js の reorderItems が返した新リストをそのまま永続化
  const handleStringsUpdate = (newList) => {
    persistStrings(assignDefaultOrders(newList));
  };

  // ストリング編集 Modal: 行タップで開く (item={id,name,...})、追加ボタンで item={} (新規)
  const handleStringEdit = (item) => setStringEditTarget(item || {});
  const handleStringAdd = () => setStringEditTarget({});
  const handleStringEditClose = () => setStringEditTarget(null);

  const handleStringSave = (item, isNew) => {
    if (isNew) {
      // 新規: 末尾に追加 (order = 既存最大 + 1)
      const maxOrder = (strings || []).reduce((m, s) => Math.max(m, typeof s.order === "number" ? s.order : -1), -1);
      const next = { ...item, order: maxOrder + 1 };
      persistStrings([...(strings || []), next]);
      toast.show("ストリングを追加しました", "success");
    } else {
      // 編集: id 一致を上書き (order は既存維持)
      const existing = (strings || []).find(s => s.id === item.id);
      const next = { ...item, order: typeof existing?.order === "number" ? existing.order : item.order };
      persistStrings((strings || []).map(s => s.id === item.id ? next : s));
      toast.show("ストリングを更新しました", "success");
    }
    setStringEditTarget(null);
  };

  const handleStringDelete = (id) => {
    persistStrings((strings || []).filter(s => s.id !== id));
    setStringEditTarget(null);
    toast.show("ストリングを削除しました", "info");
  };

  // S16 Phase 4-B: Racket 永続化 (F-A3 で save() に統一、直列化済)
  const persistRackets = (newList) => {
    setRackets(newList);
    save(KEYS.rackets, newList);
  };

  // S17: Plan タブ用永続化 (F-A3 で save() に統一、直列化済)
  const persistNext = (newList) => {
    setNext(newList);
    save(KEYS.next, newList);
  };
  const persistOpponents = (newList) => {
    setOpponents(newList);
    save(KEYS.opponents, newList);
  };

  // Racket Detail (slide-in)
  const handleRacketRowClick = (racket) => setRacketDetail(racket);
  const handleRacketDetailClose = () => setRacketDetail(null);
  // popstate で Detail が閉じられた時、racketDetail を null にするのは RacketDetailView 内部の onClose で行う

  // Racket 編集 Modal
  const handleRacketEdit = (racket) => setRacketEditTarget(racket || {});
  const handleRacketAdd = () => setRacketEditTarget({});
  const handleRacketEditClose = () => setRacketEditTarget(null);

  const handleRacketSave = (item, isNew) => {
    if (isNew) {
      const maxOrder = (rackets || []).reduce((m, r) => Math.max(m, typeof r.order === "number" ? r.order : -1), -1);
      const next = { ...item, order: maxOrder + 1 };
      persistRackets([...(rackets || []), next]);
      toast.show("ラケットを追加しました", "success");
    } else {
      const existing = (rackets || []).find(r => r.id === item.id);
      const next = { ...item, order: typeof existing?.order === "number" ? existing.order : item.order };
      persistRackets((rackets || []).map(r => r.id === item.id ? next : r));
      // 開いている Detail も更新
      if (racketDetail && racketDetail.id === item.id) setRacketDetail(next);
      toast.show("ラケットを更新しました", "success");
    }
    setRacketEditTarget(null);
  };

  const handleRacketDelete = (idOrItem) => {
    const id = typeof idOrItem === "string" ? idOrItem : idOrItem?.id;
    if (!id) return;
    persistRackets((rackets || []).filter(r => r.id !== id));
    setRacketEditTarget(null);
    if (racketDetail && racketDetail.id === id) {
      setRacketDetail(null);
      try { window.history.back(); } catch (_) {}
    }
    toast.show("ラケットを削除しました", "info");
  };

  // 引退化 / 復帰 (Detail Action bar)
  const handleRacketRetire = (racket) => {
    if (!racket || !racket.id) return;
    const isRetired = racket.status === "retired";
    const next = { ...racket, status: isRetired ? "candidate" : "retired" };
    persistRackets((rackets || []).map(r => r.id === racket.id ? next : r));
    if (racketDetail && racketDetail.id === racket.id) setRacketDetail(next);
    toast.show(isRetired ? "ラケットを復帰させました" : "ラケットを引退化しました", "info");
  };

  // Detail から「試打追加」 → QuickTrialMode を開く
  // S16.4 fix: history.back() を削除。
  //   原因: history.back() で popstate を非同期 queue した直後に setQuickTrial(true) で
  //   QuickTrialMode が mount → 自身の popstate handler 登録 + history.pushState。
  //   queue に残った popstate が QuickTrialMode の handler に発火し、selected=null かつ
  //   open 直後なので onClose() が呼ばれて QuickTrialMode が即閉じる = 「画面が飛ぶ」。
  //   修正: setRacketDetail(null) で Detail を閉じる + setQuickTrial(true) のみ。
  //   gear-detail history entry は orphan として残るが、QuickTrialMode 終了時に back() で
  //   一段消費されるので実害なし。
  const handleRacketAddTrial = (racket) => {
    setRacketDetail(null);
    setQuickTrial(true);
  };

  // S16 Phase 4-C-1: Setting History の 1 期間タップで Period Detail を開く
  const handlePeriodClick = (racket, period) => {
    setPeriodDetail({ racket, period });
  };
  const handlePeriodDetailClose = () => setPeriodDetail(null);
  // Period Detail 内の session カードタップで、そのセッションの SessionDetailView を開く
  const handlePeriodSessionClick = (type, item) => {
    setPeriodDetail(null);
    setRacketDetail(null); // racket detail も閉じる (深いネストを避ける)
    handleCardClick(type, item);
  };

  // Measurement (racket.measurements[] のネスト編集)
  const handleMeasurementEdit = (racket, m) => setMeasurementEditTarget({ racketId: racket.id, item: m || null });
  const handleMeasurementAdd = (racket) => setMeasurementEditTarget({ racketId: racket.id, item: null });
  const handleMeasurementClose = () => setMeasurementEditTarget(null);

  const handleMeasurementSave = (m, isNew) => {
    const racketId = measurementEditTarget?.racketId;
    if (!racketId) return;
    // S16.11 F-01: m.current=true を保存する時、既存の current フラグが外される件数を数えて toast 通知
    //   暗黙の上書きを silent にしない (ユーザーが「他の current が消えた」と気付ける)
    let droppedCurrentCount = 0;
    const updated = (rackets || []).map(r => {
      if (r.id !== racketId) return r;
      const list = Array.isArray(r.measurements) ? [...r.measurements] : [];
      // current=true は 1 件のみ → 他をすべて false に
      let normalized;
      if (m.current) {
        droppedCurrentCount = list.filter(x => x.id !== m.id && x.current).length;
        normalized = list.map(x => ({ ...x, current: false }));
      } else {
        normalized = list;
      }
      const idx = normalized.findIndex(x => x.id === m.id);
      if (idx >= 0) normalized[idx] = m;
      else normalized.push(m);
      return { ...r, measurements: normalized };
    });
    persistRackets(updated);
    if (racketDetail && racketDetail.id === racketId) {
      setRacketDetail(updated.find(r => r.id === racketId));
    }
    setMeasurementEditTarget(null);
    if (droppedCurrentCount > 0) {
      toast.show(`実測値を${isNew ? "追加" : "更新"}しました (他の現行 ${droppedCurrentCount} 件を非現行に変更)`, "success");
    } else {
      toast.show(isNew ? "実測値を追加しました" : "実測値を更新しました", "success");
    }
  };

  const handleMeasurementDelete = (mId) => {
    const racketId = measurementEditTarget?.racketId;
    if (!racketId || !mId) return;
    const updated = (rackets || []).map(r => {
      if (r.id !== racketId) return r;
      return { ...r, measurements: (r.measurements || []).filter(x => x.id !== mId) };
    });
    persistRackets(updated);
    if (racketDetail && racketDetail.id === racketId) {
      setRacketDetail(updated.find(r => r.id === racketId));
    }
    setMeasurementEditTarget(null);
    toast.show("実測値を削除しました", "info");
  };

  // 認証状態判定完了前はスピナー
  if (!authReady) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
        読み込み中...
      </div>
    );
  }

  // 未ログイン: LoginScreen のみ
  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column" }}>
        <LoginScreen />
        {toast.el}
      </div>
    );
  }

  // タブ中身
  let tabContent;
  if (tab === "sessions") {
    tabContent = (
      <SessionsTab
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        loading={loading}
        onCardClick={handleCardClick}
        onFabClick={handleFabClick}
      />
    );
  } else if (tab === "home") {
    tabContent = (
      <HomeTab
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        next={next}
        onQuickAdd={handleHomeQuickAdd}
        onCardClick={handleCardClick}
        onMainRacketClick={handleMainRacketClick}
      />
    );
  } else if (tab === "gear") {
    // S16 Phase 4-A: GearTab (Decision Hub 骨組 + StringsSection 完全動作)
    // Phase 4-B/C/D で他セクション (Current Setup / Racket Board / Recent Trials / Open Questions / Setups / Retired) を埋める
    tabContent = (
      <GearTab
        rackets={rackets}
        strings={strings}
        stringSetups={stringSetups}
        trials={trials}
        tournaments={tournaments}
        practices={practices}
        next={next}
        onStringsUpdate={handleStringsUpdate}
        onStringEdit={handleStringEdit}
        onStringAdd={handleStringAdd}
        onRacketRowClick={handleRacketRowClick}
        onRacketAdd={handleRacketAdd}
        onRacketsReorder={persistRackets}
        onCardClick={handleCardClick}
        toast={toast}
      />
    );
  } else if (tab === "plan") {
    tabContent = (
      <PlanTab
        next={next}
        opponents={opponents}
        tournaments={tournaments}
        onNextUpdate={persistNext}
        onOpponentsUpdate={persistOpponents}
        toast={toast}
        confirm={cfm}
      />
    );
  } else if (tab === "insights") {
    tabContent = (
      <InsightsTab
        tournaments={tournaments}
        practices={practices}
        trials={trials}
      />
    );
  }

  const tabTitles = { home: "ホーム", sessions: "記録 (Sessions)", gear: "機材", plan: "計画", insights: "分析" };

  return (
    <div style={{
      height: "100dvh", background: C.bg, display: "flex", flexDirection: "column",
      // S13.5 (2026-04-27 修正): TabBar が position: fixed になったため、コンテンツが TabBar の裏に隠れないよう下余白を確保
      // 100vh は iPhone Safari で URL バー込みの値を返すため、見える範囲より大きくなり検索欄等が画面外に押し出される。
      // 100dvh は見える範囲の高さなので、WeekPanel/DayPanel が glass overlay 化されて heatmap を押し縮めない今、再採用が安全。
      paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0))",
      // S15.5.7: メモ系文字サイズの scale を CSS variable で子コンポーネントへ伝播
      "--memo-font-scale": String(fontScale),
    }}>
      {/* Dev モードバナー: ?dev=1 で起動時のみ表示。本番には絶対書き込まないことを可視化 */}
      {_isDevMode() && (
        <div style={{
          background: "#fbbc04", color: "#202124",
          padding: "6px 12px", fontSize: 12, fontWeight: 600,
          textAlign: "center", borderBottom: "1px solid #f59e0b",
          flexShrink: 0,
        }}>
          DEV MODE — ローカル fixture で動作中、本番 Firestore には書き込みません (URL に &reset=1 で初期化)
        </div>
      )}
      {/* S13.5 共通 Header: Tennis*DB* + version + ☁️ + 🌤 + 👤 (§10.8 / DECISIONS S13.5) */}
      <Header
        tabTitle={tabTitles[tab] || ""}
        onLogoClick={() => setTab("home")}
        user={user}
        syncing={loading}
        onLogout={handleLogout}
        weather={weather}
        onWeatherClick={handleWeatherClick}
        onSettingsClick={handleSettingsClick}
      />
      {tabContent}
      <TabBar tab={tab} onTabChange={setTab} />
      {/* S12: QuickAddModal (FAB ミニメニュー → 大会/練習 選択時) */}
      <QuickAddModal
        open={!!quickAddType}
        type={quickAddType}
        racketNames={_extractNames(rackets)}
        stringNames={_extractNames(strings)}
        venueNames={_extractNames(venues)}
        levelNames={_extractLevels(tournaments)}
        onSave={handleQuickAddSave}
        onClose={handleQuickAddClose}
      />
      {detail && (
        <SessionDetailView
          key={detail.session.id}
          type={detail.type}
          session={detail.session}
          mode={detail.mode || "detail"}
          tournaments={tournaments}
          trials={trials}
          practices={practices}
          racketNames={_extractNames(rackets)}
          stringNames={_extractNames(strings)}
          venueNames={_extractNames(venues)}
          opponentNames={_extractNames(opponents)}
          levelNames={_extractLevels(tournaments)}
          onClose={handleDetailClose}
          onEdit={handleEdit}
          onEditCancel={handleEditCancel}
          onSave={handleSave}
          onDelete={handleDelete}
          onMerge={handleMergeStart}
          onCreateCard={handleCreateCardFromTrial}
          onOpenLinkedSession={handleOpenLinkedSession}
          toast={toast}
          confirm={cfm}
        />
      )}
      {/* S15: マージ相手選択 (Detail マージボタン → 起動、相手未選択時のみ) */}
      <MergePartnerPicker
        open={!!mergeStarting && !mergePartner}
        type={mergeStarting?.type}
        sourceItem={mergeStarting?.sourceItem}
        candidates={
          mergeStarting?.type === "tournament" ? tournaments
          : mergeStarting?.type === "practice"  ? practices
          : mergeStarting?.type === "trial"     ? trials
          : []
        }
        onSelect={handlePartnerSelect}
        onClose={handleMergeCancel}
      />
      {/* S15: マージ本体 (相手選択完了 → 比較ビュー → 最終確認) */}
      <MergeModal
        open={!!mergeStarting && !!mergePartner}
        type={mergeStarting?.type}
        itemA={mergeStarting?.sourceItem}
        itemB={mergePartner}
        trials={trials}
        onConfirm={handleMergeConfirm}
        onCancel={handleMergeCancel}
      />
      {/* S14 P2: 天気詳細 Modal (Header 天気タップで開く) */}
      <WeatherModal
        open={weatherModalOpen}
        weather={weather}
        onClose={handleWeatherClose}
      />
      {/* S15.5.7: 設定 Modal (Header ⚙️ タップで開く) — 文字サイズ + バージョン表示 */}
      <SettingsModal
        open={settingsOpen}
        fontScale={fontScale}
        onFontScaleChange={handleFontScaleChange}
        onClose={handleSettingsClose}
        toast={toast}
        onBulkSummarize={handleBulkSummarize}
        bulkSummarizeProgress={bulkSummarizeProgress}
        onImportCalendarJson={handleImportCalendarJson}
      />
      {/* S16 Phase 4-A: ストリング編集 Modal (Gear タブ Manage Masters → 行タップ / + 追加 で起動) */}
      <StringEditModal
        open={!!stringEditTarget}
        item={stringEditTarget}
        onSave={handleStringSave}
        onDelete={handleStringDelete}
        onClose={handleStringEditClose}
        confirm={cfm}
      />
      {/* S16 Phase 4-B: Racket Detail (slide-in、6 セクション + 履歴) */}
      <RacketDetailView
        open={!!racketDetail}
        racket={racketDetail}
        rackets={rackets}
        trials={trials}
        tournaments={tournaments}
        practices={practices}
        onClose={handleRacketDetailClose}
        onEdit={handleRacketEdit}
        onDelete={handleRacketDelete}
        onRetire={handleRacketRetire}
        onAddTrial={handleRacketAddTrial}
        onMeasurementEdit={handleMeasurementEdit}
        onMeasurementAdd={handleMeasurementAdd}
        onPeriodClick={handlePeriodClick}
      />
      {/* S16 Phase 4-C-1: Period Detail (履歴 1 期間の sessions 一覧 slide-in) */}
      <PeriodDetailView
        open={!!periodDetail}
        period={periodDetail?.period}
        racket={periodDetail?.racket}
        tournaments={tournaments}
        practices={practices}
        trials={trials}
        onClose={handlePeriodDetailClose}
        onSessionClick={handlePeriodSessionClick}
      />
      {/* S16 Phase 4-B: Racket 編集 Modal (auto-save 付き V2 互換) */}
      <RacketEditModal
        open={!!racketEditTarget}
        item={racketEditTarget}
        onSave={handleRacketSave}
        onDelete={handleRacketDelete}
        onClose={handleRacketEditClose}
        confirm={cfm}
        toast={toast}
      />
      {/* S16 Phase 4-B: 実測値編集 Modal (ネスト) */}
      <MeasurementEditModal
        open={!!measurementEditTarget}
        item={measurementEditTarget?.item}
        racketName={(rackets || []).find(r => r.id === measurementEditTarget?.racketId)?.name}
        onSave={handleMeasurementSave}
        onDelete={handleMeasurementDelete}
        onClose={handleMeasurementClose}
        confirm={cfm}
      />
      {/* S15.5: QuickTrialMode (試打カード式、Home 試打ボタン → これが起動) */}
      <QuickTrialMode
        open={quickTrial}
        cards={quickTrialCards}
        setCards={persistQuickTrialCards}
        rackets={rackets}
        stringNames={_extractNames(strings)}
        onSaveTrial={handleQuickTrialSave}
        onClose={() => setQuickTrial(false)}
        confirm={cfm}
        toast={toast}
      />
      {toast.el}
      {cfm.el}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB />);
