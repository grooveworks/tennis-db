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
const loadSessionsFromFirestore = async (user) => {
  if (!user) return null;
  const keys = ["tournaments", "practices", "trials", "rackets", "strings", "venues", "opponents"];
  const results = {};
  for (const k of keys) {
    try {
      const ref = fbDb.collection("users").doc(user.uid).collection("data").doc(k);
      const doc = await ref.get();
      const data = doc.data();
      const items = data && data.items;
      results[k] = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error(`Failed to load ${k}:`, err);
      results[k] = [];
    }
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
  const [tab, setTab] = useState("sessions");
  const [tournaments, setTournaments] = useState([]);
  const [practices, setPractices] = useState([]);
  const [trials, setTrials] = useState([]);
  // S11: master データ (rackets/strings/venues/opponents) を Select の候補として読み込む
  const [rackets, setRackets]     = useState([]);
  const [strings, setStringsList] = useState([]);
  const [venues, setVenues]       = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null); // S10: { type, session, mode } | null
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
  }, []);

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
            // localStorage には正規化前の原データを保存 (v3 互換のため)
            lsSave(KEYS.tournaments, data.tournaments);
            lsSave(KEYS.practices, data.practices);
            lsSave(KEYS.trials, data.trials);
            lsSave(KEYS.rackets, data.rackets);
            lsSave(KEYS.strings, data.strings);
            lsSave(KEYS.venues, data.venues);
            lsSave(KEYS.opponents, data.opponents);
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
  const handleCardClick = (type, item) => {
    setDetail({ type, session: item, mode: "detail" });
  };

  const handleDetailClose = () => setDetail(null);

  // S10: 連携カード (紐づく試打 / 連携練習) のタップで別セッション詳細へ遷移
  //      key prop (session.id) が変わることで SessionDetailView が再マウント→slide-in 再発動
  const handleOpenLinkedSession = (nextType, nextSession) => {
    if (!nextSession || !nextSession.id) return;
    setDetail({ type: nextType, session: nextSession, mode: "detail" });
  };

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

  // S12: FAB ミニメニューで種別が選ばれたら QuickAddModal を開く
  //      "tournament" | "practice" のみ (試打は S14 Home 3 ボタン経由、DECISIONS_v4.md S12)
  const [quickAddType, setQuickAddType] = useState(null);
  const handleFabClick = (type) => {
    if (type === "tournament" || type === "practice") {
      setQuickAddType(type);
    }
  };
  const handleQuickAddClose = () => setQuickAddType(null);
  // QuickAdd 保存: handleSave (新規/更新両対応) を再利用 + Detail 画面で開く (閲覧モード)
  const handleQuickAddSave = (item) => {
    const type = quickAddType;
    if (!type || !item) return;
    handleSave(type, item);    // localStorage + Firestore 保存 + Detail 画面遷移 (mode: "detail")
    setQuickAddType(null);     // QuickAddModal を閉じる
  };

  // 認証状態判定完了前はスピナー
  if (!authReady) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
        読み込み中...
      </div>
    );
  }

  // 未ログイン: LoginScreen のみ
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
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
    tabContent = <PlaceholderTab name="ホーム" stage="S14" />;
  } else if (tab === "gear") {
    tabContent = <PlaceholderTab name="機材" stage="S16" />;
  } else if (tab === "plan") {
    tabContent = <PlaceholderTab name="計画" stage="S17" />;
  } else if (tab === "insights") {
    tabContent = <PlaceholderTab name="分析" stage="S18" />;
  }

  const tabTitles = { home: "ホーム", sessions: "Sessions", gear: "機材", plan: "計画", insights: "分析" };

  const logoutBtn = (
    <button
      onClick={handleLogout}
      aria-label="ログアウト"
      style={{
        width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8, border: "none", background: "transparent",
        color: C.textSecondary, cursor: "pointer",
      }}
    >
      <Icon name="log-out" size={22} ariaLabel="ログアウト" />
    </button>
  );

  return (
    <div style={{ height: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <Header
        title={tabTitles[tab] || "Tennis DB"}
        right={logoutBtn}
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
          onOpenLinkedSession={handleOpenLinkedSession}
          toast={toast}
          confirm={cfm}
        />
      )}
      {toast.el}
      {cfm.el}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB />);
