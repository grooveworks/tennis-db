// LoginScreen — 未ログイン時の画面 (Google ログイン)
// props:
//   onLogin: 成功時コールバック (省略可、onAuthStateChanged で検知するため必須ではない)
//   onError: エラーメッセージ文字列を通知 (省略可)
// v3 の signInWithPopup → signInWithRedirect フォールバックと同等
function LoginScreen({ onLogin, onError }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async () => {
    setErr("");
    setBusy(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await fbAuth.signInWithPopup(provider);
      if (onLogin) onLogin();
    } catch (e) {
      if (e && e.code === "auth/popup-blocked") {
        try {
          await fbAuth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
          return;
        } catch (e2) {
          const msg = "ログイン失敗: " + (e2.message || String(e2));
          setErr(msg);
          if (onError) onError(msg);
        }
      } else {
        const msg = "ログイン失敗: " + ((e && e.message) || String(e));
        setErr(msg);
        if (onError) onError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      background: C.bg,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎾</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>
        Tennis DB
      </div>
      <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 32 }}>
        v{APP_VERSION}
      </div>
      <div style={{ fontSize: 14, color: C.textSecondary, marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>
        Google アカウントでログインすると、記録がクラウドに同期されます。
      </div>
      <Button variant="primary" icon="log-in" onClick={handleLogin} disabled={busy} style={{ minWidth: 220 }}>
        {busy ? "ログイン中..." : "Google でログイン"}
      </Button>
      {err && (
        <div role="alert" style={{ marginTop: 16, fontSize: 12, color: C.error, maxWidth: 320 }}>
          {err}
        </div>
      )}
      <div style={{ marginTop: 48, fontSize: 11, color: C.textMuted, lineHeight: 1.6, maxWidth: 320 }}>
        v3 と同じアカウントでログインすると、同じデータが表示されます。
      </div>
    </div>
  );
}
