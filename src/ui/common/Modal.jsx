// useFocusTrap — モーダルが open の間、focus をモーダル内に閉じ込める (Round 5 a11y)
//   - 開いた瞬間: 直前の active 要素を記憶 + モーダル内最初の focusable 要素に focus
//   - Tab / Shift+Tab: 末尾↔先頭で循環 (capture phase で他リスナより先に処理)
//   - close: 直前の active 要素に focus を戻す
// 使い方: const ref = useFocusTrap(open); ... <div ref={ref}>{...}</div>
// 注: hoisting により Modal.jsx 以外のモーダル (SettingsModal 等) からも使用可
function useFocusTrap(open) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const FOCUSABLE_SEL = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusables = () => {
      const el = containerRef.current;
      if (!el) return [];
      return [...el.querySelectorAll(FOCUSABLE_SEL)].filter(n => n.offsetParent !== null);
    };
    const rafId = requestAnimationFrame(() => {
      const list = getFocusables();
      if (list.length > 0) list[0].focus();
      else if (containerRef.current) {
        containerRef.current.setAttribute("tabindex", "-1");
        containerRef.current.focus();
      }
    });
    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const list = getFocusables();
      if (list.length === 0) { e.preventDefault(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (containerRef.current && !containerRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab, true);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleTab, true);
      if (prevFocus && typeof prevFocus.focus === "function") {
        try { prevFocus.focus(); } catch (_) {}
      }
    };
  }, [open]);
  return containerRef;
}

// Modal — モーダル基本枠
// props:
//   open: boolean
//   onClose: 閉じる時のコールバック (オーバーレイクリック・Escキー・閉じるボタン)
//   title: モーダル内タイトル (省略可)
//   children: コンテンツ
// DESIGN_SYSTEM §4.5 準拠、閉じるボタンは左上固定（戻ると位置統一）
function Modal({ open, onClose, title, children }) {
  const trapRef = useFocusTrap(open);
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
        ref={trapRef}
        style={{
          background: C.panel,
          borderRadius: RADIUS.card, // S13.5: 16 → 20 (Apple ライク、§10.3)
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
