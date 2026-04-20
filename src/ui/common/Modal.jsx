// Modal — モーダル基本枠
// props:
//   open: boolean
//   onClose: 閉じる時のコールバック (オーバーレイクリック・Escキー・閉じるボタン)
//   title: モーダル内タイトル (省略可)
//   children: コンテンツ
// DESIGN_SYSTEM §4.5 準拠、閉じるボタンは左上固定（戻ると位置統一）
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: C.panel,
          borderRadius: 16,
          padding: 20,
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
          animation: "modalEnter 250ms ease-out",
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: C.textSecondary,
              cursor: "pointer",
            }}
          >
            <Icon name="x" size={24} />
          </button>
        )}
        {title && (
          <div id="modal-title" style={{ fontSize: 16, fontWeight: 600, textAlign: "center", marginTop: onClose ? 16 : 0, marginBottom: 12, color: C.text }}>
            {title}
          </div>
        )}
        <div style={{ marginTop: (onClose && !title) ? 16 : 0 }}>{children}</div>
      </div>
    </div>
  );
}
