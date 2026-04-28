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
  const keys = ["tournaments", "practices", "trials", "rackets", "strings", "venues", "opponents", "next", "quickTrialCards"];
  const results = {};
  for (const k of keys) results[k] = []; // 既定値 (取得失敗時用)
  try {
    const snap = await fbDb.collection("users").doc(user.uid).collection("data").get();
    snap.forEach(doc => {
      const id = doc.id;
      if (!keys.includes(id)) return;
      const data = doc.data();
      const items = data && data.items;
      if (Array.isArray(items)) results[id] = items;
    });
  } catch (err) {
    console.error("Firestore batch load error:", err);
  }
  return results;
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

function TennisDB() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState("home"); // S14: default tab を home に変更 (DECISIONS S13.5 §10.9)
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
  }, []);

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

  // 認証状態監視 + リアルタイム同期
  useEffect(() => {
    let unsubSnapshot = null;
    const unsubAuth = fbAuth.onAuthStateChanged(async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        // 前回の snapshot があれば解除 (再ログイン時の二重購読防止)
        if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
        setLoading(true);
        try {
          // 1) 初回読み込み
          const data = await loadSessionsFromFirestore(u);
          if (data) {
            const t = normalizeItems(data.tournaments);
            const p = normalizeItems(data.practices);
            const tr = normalizeItems(data.trials);
            setTournaments(t); setPractices(p); setTrials(tr);
            // S11: master データもセット
            setRackets(data.rackets || []);
            setStringsList(data.strings || []);
            setVenues(data.venues || []);
            setOpponents(data.opponents || []);
            // S14: next も
            setNext(data.next || []);
            // S15.5: quickTrialCards も
            setQuickTrialCards(data.quickTrialCards || []);
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
            toast.show("クラウドから読み込みました", "success");
          }
          // 2) リアルタイム同期 (v3 と同じ collection レベル onSnapshot)
          const dataRef = fbDb.collection("users").doc(u.uid).collection("data");
          unsubSnapshot = dataRef.onSnapshot((snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type !== "modified" && change.type !== "added") return;
              const key = change.doc.id;
              const docData = change.doc.data() || {};
              const val = docData.items;
              if (!Array.isArray(val)) return;
              const normalized = normalizeItems(val);
              if (key === "tournaments") setTournaments(normalized);
              else if (key === "practices") setPractices(normalized);
              else if (key === "trials") setTrials(normalized);
              else if (key === "rackets")  setRackets(val);
              else if (key === "strings")  setStringsList(val);
              else if (key === "venues")   setVenues(val);
              else if (key === "opponents") setOpponents(val);
              else if (key === "next") setNext(val);
              else if (key === "quickTrialCards") setQuickTrialCards(val);
              else return;
              lsSave(key, val);
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

    lsSave(KEYS[key], newItems);
    if (cascadeCount > 0) lsSave(KEYS.trials, newTrials);

    // Firestore は core/03_storage.js の save() で 800ms デバウンス書き込み
    save(KEYS[key], newItems);
    if (cascadeCount > 0) save(KEYS.trials, newTrials);

    // Detail に戻る、最新データで再描画
    setDetail({ type, session: updated, mode: "detail" });
    const msg = cascadeCount > 0
      ? `保存しました (試合削除に伴い試打 ${cascadeCount} 件の連携を外しました)`
      : "保存しました";
    toast.show(msg, "success");
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
  const persistQuickTrialCards = (newCardsOrFn) => {
    if (typeof newCardsOrFn === "function") {
      setQuickTrialCards(prev => {
        const newCards = newCardsOrFn(prev);
        lsSave(KEYS.quickTrialCards, newCards);
        save(KEYS.quickTrialCards, newCards);
        return newCards;
      });
    } else {
      setQuickTrialCards(newCardsOrFn);
      lsSave(KEYS.quickTrialCards, newCardsOrFn);
      save(KEYS.quickTrialCards, newCardsOrFn);
    }
  };

  const handleQuickTrialSave = ({ card, eval: e }) => {
    if (!card || !card.id || !e) return;
    const todayDate = today();
    // 同日 practice → linkedPracticeId + temp/venue/weather 自動コピー (V2 互換 + weather 拡張)
    const matchingP = (practices || []).find(p => normDate(p.date) === todayDate);
    // 同日 tournament の最後の match → linkedMatchId
    let linkedMtchId = "";
    (tournaments || []).forEach(trn => {
      if (normDate(trn.date) === todayDate) {
        const lastM = (trn.matches || []).slice(-1)[0];
        if (lastM && lastM.id) linkedMtchId = lastM.id;
      }
    });
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
      linkedMatchId: linkedMtchId,
    };
    const newTrials = [trial, ...(trials || [])];
    setTrials(newTrials);
    lsSave(KEYS.trials, newTrials);
    save(KEYS.trials, newTrials);
    // 使ったカードを削除
    const newCards = (quickTrialCards || []).filter(c => c.id !== card.id);
    persistQuickTrialCards(newCards);
    // toast (連携状況をユーザーに通知)
    const linked = !!matchingP || !!linkedMtchId;
    const linkMsg = linkedMtchId && matchingP ? "練習＋試合と紐付け"
                  : linkedMtchId ? "試合と紐付け"
                  : matchingP   ? "練習と紐付け" : "";
    toast.show(linked ? `試打を保存 → ${linkMsg}` : "試打を保存", "success");
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
      />
    );
  } else if (tab === "gear") {
    tabContent = <PlaceholderTab name="機材" stage="S16" />;
  } else if (tab === "plan") {
    tabContent = <PlaceholderTab name="計画" stage="S17" />;
  } else if (tab === "insights") {
    tabContent = <PlaceholderTab name="分析" stage="S18" />;
  }

  const tabTitles = { home: "ホーム", sessions: "記録 (Sessions)", gear: "機材", plan: "計画", insights: "分析" };

  return (
    <div style={{
      height: "100dvh", background: C.bg, display: "flex", flexDirection: "column",
      // S13.5 (2026-04-27 修正): TabBar が position: fixed になったため、コンテンツが TabBar の裏に隠れないよう下余白を確保
      // 100vh は iPhone Safari で URL バー込みの値を返すため、見える範囲より大きくなり検索欄等が画面外に押し出される。
      // 100dvh は見える範囲の高さなので、WeekPanel/DayPanel が glass overlay 化されて heatmap を押し縮めない今、再採用が安全。
      paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0))",
    }}>
      {/* S13.5 共通 Header: Tennis*DB* + version + ☁️ + 🌤 + 👤 (§10.8 / DECISIONS S13.5) */}
      <Header
        tabTitle={tabTitles[tab] || ""}
        onLogoClick={() => setTab("home")}
        user={user}
        syncing={loading}
        onLogout={handleLogout}
        weather={weather}
        onWeatherClick={handleWeatherClick}
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
