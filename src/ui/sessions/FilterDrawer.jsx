// FilterDrawer — 画面下からせり上がる候補選択シート (DESIGN_SYSTEM §8.5.2 補助)
// props:
//   open: boolean
//   title: シート見出し (例: 「ラケットで絞り込む」)
//   options: string[] (選択肢)
//   selected: string[] (現在選択中)
//   onApply: 新しい選択配列を親に通知
//   onClose: シートを閉じる
// 挙動:
//   - 開くと下から 250ms でスライドイン (drawerEnter キーフレーム)
//   - チェックリスト (複数選択可)、タップでトグル
//   - 下部に「クリア」「適用 (N)」ボタン
//   - オーバーレイタップ / Esc / × で閉じる (draft は破棄)

function FilterDrawer({ open, title, options = [], selected = [], onApply, onClose }) {
  const [draft, setDraft] = useState(selected);

  // open のたびに最新の selected を draft に取り込む (親が外で変えても追従)
  useEffect(() => { if (open) setDraft(selected); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (v) => {
    setDraft(d => d.includes(v) ? d.filter(x => x !== v) : [...d, v]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: C.panel,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 500,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          animation: "drawerEnter 250ms ease-out",
        }}
      >
        {/* ドラッグハンドル (視覚のみ) */}
        <div style={{
          width: 40, height: 4,
          background: C.border, borderRadius: 2,
          margin: "8px auto 4px",
        }} />

        {/* ヘッダ */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "8px 8px 8px 16px",
          borderBottom: `1px solid ${C.divider}`,
        }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              width: 40, height: 40,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", cursor: "pointer",
              color: C.textSecondary, padding: 0, borderRadius: 8,
            }}
          >
            <Icon name="x" size={22} color={C.textSecondary} />
          </button>
        </div>

        {/* 候補リスト */}
        <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
          {options.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: C.textMuted }}>
              候補がありません
            </div>
          ) : options.map((opt) => {
            const on = draft.includes(opt);
            return (
              <div
                key={opt}
                role="checkbox"
                aria-checked={on}
                tabIndex={0}
                onClick={() => toggle(opt)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(opt); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px",
                  minHeight: 44,
                  cursor: "pointer",
                  color: on ? C.primary : C.text,
                  fontWeight: on ? 600 : 400,
                  fontSize: 14,
                  background: on ? C.primaryLight : "transparent",
                  transition: "background 120ms",
                }}
              >
                <Icon name={on ? "check-square" : "square"} size={20} color={on ? C.primary : C.textSecondary} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
              </div>
            );
          })}
        </div>

        {/* フッタ */}
        <div style={{
          display: "flex", gap: 8,
          padding: 12,
          borderTop: `1px solid ${C.divider}`,
        }}>
          <button
            onClick={() => setDraft([])}
            style={{
              flex: 1, minHeight: 44,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              background: C.panel,
              color: C.textSecondary,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            クリア
          </button>
          <button
            onClick={() => onApply && onApply(draft)}
            style={{
              flex: 2, minHeight: 44,
              border: "none",
              borderRadius: 8,
              background: C.primary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            適用{draft.length > 0 ? ` (${draft.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
