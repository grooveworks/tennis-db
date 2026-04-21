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

// ── Firestore 読み取り: 指定 key 3 種を個別取得
const loadSessionsFromFirestore = async (user) => {
  if (!user) return null;
  const keys = ["tournaments", "practices", "trials"];
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
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const cfm = useConfirm();

  // 初回: localStorage からロード (ログイン前でも日付正規化して表示可)
  useEffect(() => {
    setTournaments(normalizeItems(lsLoad(KEYS.tournaments) || []));
    setPractices(normalizeItems(lsLoad(KEYS.practices) || []));
    setTrials(normalizeItems(lsLoad(KEYS.trials) || []));
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
            // localStorage には正規化前の原データを保存 (v3 互換のため)
            lsSave(KEYS.tournaments, data.tournaments);
            lsSave(KEYS.practices, data.practices);
            lsSave(KEYS.trials, data.trials);
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

  const handleCardClick = (type, item) => {
    toast.show("詳細画面は S10 で実装予定", "info");
  };

  const handleFabClick = () => {
    toast.show("新規追加は S12 で実装予定", "info");
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
      {toast.el}
      {cfm.el}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB />);
