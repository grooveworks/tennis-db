// SettingsModal — アプリ設定 (S15.5.7、Header の ⚙️ から起動)
//
// 役割:
//   - 文字サイズ調整 (標準 / 大 / 特大、メモ系テキストの拡大率を localStorage 永続化)
//   - アプリバージョン表示 (Header からは削除、ここで常設表示)
//   - 将来の設定追加用の入れ物 (通知 / 表示モード / バックアップ等)
//
// props:
//   open:            boolean
//   fontScale:       1.0 | 1.15 | 1.30
//   onFontScaleChange: (scale) => void  state + lsSave
//   onClose:         () => void
//
// 文字サイズ scale 適用範囲 (S15.5.7 時点):
//   - メモ系のみ (Textarea / _dvMemoItem / QuickTrialMode メモ)
//   - 本文 / ラベル / 数字は将来 Stage で段階拡張 (DESIGN_SYSTEM 全体改訂が必要なため)

const _SCALE_OPTIONS = [
  { value: 1.0,  label: "標準", desc: "16 px (現行)" },
  { value: 1.15, label: "大",   desc: "18 px" },
  { value: 1.30, label: "特大", desc: "21 px" },
];

function SettingsModal({ open, fontScale, onFontScaleChange, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const scale = typeof fontScale === "number" ? fontScale : 1.0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="アプリ設定"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000,
      }}
    >
      <div style={{
        background: C.panel,
        borderRadius: RADIUS.card,
        width: "100%", maxWidth: 420,
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative",
        animation: "modalEnter 250ms ease-out",
        padding: 20,
      }}>
        {/* 閉じる */}
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            position: "absolute", top: 12, left: 12,
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, border: "none", background: "transparent",
            color: C.textSecondary, cursor: "pointer",
          }}
        >
          <Icon name="x" size={24} />
        </button>

        {/* タイトル */}
        <div style={{
          fontSize: 16, fontWeight: 700, textAlign: "center",
          marginTop: 16, marginBottom: 18, color: C.text,
          display: "inline-flex", width: "100%",
          alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon name="settings" size={18} color={C.text} />
          設定
        </div>

        {/* 文字サイズ (メモ系) */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
          }}>
            メモ欄の文字サイズ
          </div>
          <div style={{
            fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5,
          }}>
            試打評価のメモ・編集画面のメモ・試打詳細のメモ表示に適用 (老眼配慮)。
            本文やラベルは現行サイズ維持。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {_SCALE_OPTIONS.map(opt => {
              const sel = Math.abs(scale - opt.value) < 0.01;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFontScaleChange && onFontScaleChange(opt.value)}
                  aria-pressed={sel}
                  style={{
                    flex: 1, minHeight: 60,
                    border: `1.5px solid ${sel ? C.primary : C.border}`,
                    background: sel ? C.primaryLight : C.panel,
                    color: sel ? C.primary : C.textSecondary,
                    borderRadius: 12, cursor: "pointer", padding: "8px 6px",
                    fontFamily: font, fontWeight: 700,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: sel ? C.primary : C.textMuted }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* プレビュー */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6,
          }}>
            プレビュー
          </div>
          <div style={{
            fontSize: `${16 * scale}px`,
            lineHeight: 1.55,
            color: C.text,
            background: C.bg,
            borderRadius: 10,
            padding: "12px 14px",
            whiteSpace: "pre-wrap",
          }}>
            サーブの打感が良い、ストロークもブレない。フォアの攻撃時に握りが少し緩む。次は手の内側を意識する。
          </div>
        </div>

        {/* バージョン情報 */}
        <div style={{
          borderTop: `1px solid ${C.divider}`,
          paddingTop: 14, marginTop: 4,
          fontSize: 12, color: C.textSecondary,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>アプリバージョン</span>
          <span style={{ fontFeatureSettings: '"tnum"', color: C.text, fontWeight: 600 }}>
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
}
