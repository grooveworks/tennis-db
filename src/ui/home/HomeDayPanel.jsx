// HomeDayPanel — Home タブ「カレンダーマス」タップ時の Glass DayPanel (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L406-431 / DECISIONS_v4.md S13.5 §10.5 Glass morphism (floating パネル限定)
//
// 配置・スタイル:
//   - position: fixed (or absolute on parent), 画面下端 bottom: 74px (TabBar 14px 上)
//   - left/right: 14px, border-radius: 22px
//   - Glass: rgba(255,255,255,0.72) + backdrop-filter saturate(180%) blur(28px)
//   - 背景に半透明 overlay (#000 18%) を全画面で
//
// 行構造 (各イベント):
//   - 色帯 4×32 (橙=大会 / 緑=練習)
//   - title 13px 600 + meta 11px grey
//   - バッジ (大会のみ overallResult や「予定」、Apple-flavored 橙系)
//
// 凡例フッタ: 「━ 緑: 練習 / 橙: 大会 / 紫点: 試打」(ChatGPT 採用)
//
// props:
//   open: boolean
//   iso: 表示対象日付 (YYYY-MM-DD)
//   tournaments, practices, trials: 全件
//   onClose, onItemClick(type, item)

const _HDP_DOW_LABELS = ["日","月","火","水","木","金","土"];

// 「5月9日(土)」表記
const _hdpDateLabel = (iso) => {
  if (!iso) return "";
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(iso);
  return `${parseInt(m[2])}月${parseInt(m[3])}日(${_HDP_DOW_LABELS[d.getDay()]})`;
};

function HomeDayPanel({ open, iso, tournaments = [], practices = [], trials = [], onClose, onItemClick }) {
  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !iso) return null;

  const dayItems = [];
  (tournaments || []).forEach(t => {
    if (t && normDate(t.date) === iso) dayItems.push({ type: "tournament", item: t });
  });
  (practices || []).forEach(p => {
    if (p && normDate(p.date) === iso) dayItems.push({ type: "practice", item: p });
  });
  (trials || []).forEach(tr => {
    if (tr && normDate(tr.date) === iso) dayItems.push({ type: "trial", item: tr });
  });

  return (
    <>
      {/* 背景 dim overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 9,
        }}
      />
      {/* Glass Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${_hdpDateLabel(iso)} の予定`}
        style={{
          position: "fixed",
          left: 14, right: 14,
          bottom: "calc(74px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "saturate(180%) blur(28px)",
          WebkitBackdropFilter: "saturate(180%) blur(28px)",
          borderRadius: 22,
          padding: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,.12)",
          border: "1px solid rgba(255,255,255,0.5)",
          zIndex: 10,
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* ヘッダ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {_hdpDateLabel(iso)} · {dayItems.length} 件
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              width: 28, height: 28, borderRadius: 14,
              background: "rgba(120,120,128,.16)", color: C.text,
              border: "none", display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 14,
            }}
          >
            <Icon name="x" size={14} color={C.text} />
          </button>
        </div>

        {/* 行リスト */}
        {dayItems.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0", textAlign: "center" }}>
            この日には予定がありません
          </div>
        ) : (
          dayItems.map((d, i) => {
            const isT = d.type === "tournament";
            const isTr = d.type === "trial";
            const stripColor = isT ? "#FF9500" : isTr ? "#9334E0" : "#34C759";
            const item = d.item;

            const title = isT
              ? (item.name || "(無題)")
              : isTr
                ? (item.racketName || "(試打)")
                : (item.title || item.type || "練習");

            const meta = (() => {
              if (isT) {
                const parts = [];
                if (item.startTime) parts.push(item.startTime);
                if (item.type) parts.push(item.type === "doubles" ? "ダブルス" : item.type === "mixed" ? "ミックス" : "シングルス");
                if (item.level) parts.push(item.level);
                return parts.join(" · ") + " · 大会";
              }
              if (isTr) {
                const parts = [];
                if (item.judgment) parts.push(item.judgment);
                if (item.venue) parts.push(item.venue);
                return parts.join(" · ") + " · 試打";
              }
              const parts = [];
              if (item.startTime && item.endTime) parts.push(`${item.startTime}-${item.endTime}`);
              else if (item.startTime) parts.push(item.startTime);
              if (item.duration) parts.push(`${item.duration} 分`);
              if (item.type) parts.push(item.type);
              return parts.join(" · ") + " · 練習";
            })();

            const badge = isT
              ? (item.overallResult || "予定")
              : null;

            return (
              <div
                key={i}
                onClick={() => onItemClick && onItemClick(d.type, item)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.08)",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 4, height: 32,
                  borderRadius: 2, background: stripColor,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{title}</div>
                  <div style={{
                    fontSize: 11, color: C.textMuted, marginTop: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{meta}</div>
                </div>
                {badge && (
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 6,
                    background: "#FFE6BD", color: "#7E4F00",
                  }}>{badge}</div>
                )}
              </div>
            );
          })
        )}

        {/* 凡例フッタ */}
        <div style={{
          fontSize: 10, color: C.textMuted,
          marginTop: 8, paddingTop: 8,
          borderTop: "1px solid rgba(0,0,0,0.08)",
          textAlign: "center",
        }}>
          ━ 緑: 練習 / 橙: 大会 / 紫点: 試打
        </div>
      </div>
    </>
  );
}
