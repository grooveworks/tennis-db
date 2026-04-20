// Toast — 操作フィードバック (画面下、3秒自動消失)
// props:
//   message: 表示メッセージ
//   type: success | warning | error | info (default success)
//   duration: ms (default 3000)
//   onDismiss: 消失時コールバック
// DESIGN_SYSTEM §4.6 準拠
const TOAST_ICONS = {
  success: { icon: "circle-check", color: "#6fcc8d" },
  warning: { icon: "triangle-alert", color: "#fbc02d" },
  error:   { icon: "circle-alert", color: "#ef5350" },
  info:    { icon: "info", color: "#82b1ff" },
};
function Toast({ message, type = "success", duration = 3000, onDismiss }) {
  useEffect(() => {
    if (!onDismiss) return;
    const t = setTimeout(() => onDismiss(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);
  if (!message) return null;
  const s = TOAST_ICONS[type] || TOAST_ICONS.success;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      style={{
        position: "fixed",
        bottom: 72,  // TabBar の上 (TabBar 56px + 16px)
        left: "50%",
        transform: "translateX(-50%)",
        background: "#202124",
        color: "#ffffff",
        borderRadius: 6,
        padding: "12px 16px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 2000,
        maxWidth: "calc(100vw - 40px)",
      }}
    >
      <Icon name={s.icon} size={18} color={s.color} />
      <span>{message}</span>
    </div>
  );
}

// フック: useToast()
// show(message, type?, duration?) で表示
function useToast() {
  const [state, setState] = useState(null);
  const show = (message, type = "success", duration = 3000) => {
    setState({ message, type, duration });
  };
  const el = state ? (
    <Toast
      message={state.message}
      type={state.type}
      duration={state.duration}
      onDismiss={() => setState(null)}
    />
  ) : null;
  return { show, el };
}
