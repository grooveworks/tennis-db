// SyncStatusPopover — Header の ☁️ アイコン tap で開く同期状態詳細表示 (4.7.33-S17 D)
//
// 設計:
//   - モーダルではなく軽量な状態表示 (focus trap なし、ユーザー明示)
//   - tap で開閉、ESC で閉じる、外側 click で閉じる
//   - 内容: 現在の status、未同期 pending 件数と内訳、最後の同期時刻、直近エラー
//   - エラー赤色の解除は「次の成功 write」時のみ (app.jsx で auto-clear)、Popover 開閉では消さない
//
// props:
//   open: boolean
//   syncState: { status, pendingCount, pendingKeys, lastSyncAt, lastError, online }
//   onClose: () => void
function SyncStatusPopover({ open, syncState, onClose }) {
  const rootRef = useRef(null);

  // ESC で閉じる + 外側 click で閉じる (focus trap は入れない、ユーザー明示)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    // click は次の tick で登録 (= 開いたタップ自体で閉じるのを回避)
    const t = setTimeout(() => document.addEventListener("click", onDocClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !syncState) return null;

  const status = syncState.status || "idle";
  const pendingKeys = Array.isArray(syncState.pendingKeys) ? syncState.pendingKeys : [];
  const lastSyncAt = syncState.lastSyncAt;
  const lastError = syncState.lastError;

  const statusLabel = status === "error" ? "同期エラー"
    : status === "offline" ? "オフライン"
    : status === "syncing" ? "同期中"
    : "同期済み";
  const statusColor = status === "error" ? C.error
    : status === "offline" ? C.textMuted
    : status === "syncing" ? C.warning
    : C.success;

  // pendingKeys の件数集計 (同 key が直列化で 1 件にまとめられる仕様)
  const keyCounts = {};
  pendingKeys.forEach(k => { keyCounts[k] = (keyCounts[k] || 0) + 1; });

  const fmtTime = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) { return "—"; }
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="同期状態"
      data-popover="sync-status"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0) + 52px)",
        right: 8,
        minWidth: 240,
        maxWidth: 320,
        background: C.panel,
        border: `1px solid ${C.divider}`,
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        padding: 12,
        fontFamily: font,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          width: 10, height: 10, borderRadius: 5, background: statusColor, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{statusLabel}</span>
      </div>

      {pendingKeys.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>未同期 {pendingKeys.length} 件</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {Object.keys(keyCounts).map(k => (
              <li key={k} style={{ fontSize: 12, color: C.text, padding: "2px 0" }}>
                • {k} ({keyCounts[k]})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 6 }}>
        最後の同期: {fmtTime(lastSyncAt)}
      </div>

      {lastError && (
        <div style={{
          fontSize: 11, color: C.error,
          background: C.errorLight || "rgba(255,59,48,0.08)",
          padding: "6px 8px", borderRadius: 6, marginBottom: 6,
          wordBreak: "break-word",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>直近エラー</div>
          <div>{lastError.key}: {lastError.message}</div>
        </div>
      )}

      {status === "offline" && (
        <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.45 }}>
          端末には保存されています。<br />
          オンラインに戻ると自動同期されます。
        </div>
      )}
    </div>
  );
}
