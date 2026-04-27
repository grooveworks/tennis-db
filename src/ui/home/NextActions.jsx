// NextActions — Home タブ「次のアクション」カード (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L272-302 / DECISIONS_v4.md S13.5 + Apple Reminders 風 check circle
//
// 構成:
//   - ヘッダ: flag アイコン + 「次のアクション」 + 右肩に「N / M」進捗 tag (橙)
//   - 行 (top 3): priority dot 6×6 + label/meta + check circle 22×22 (右)
//
// priority dot 色判定 (DECISIONS S13.5):
//   - 赤 (#FF3B30): dueDate が 7 日以内
//   - 橙 (#FF9500): 期限なし継続課題 (デフォルト)
//   - 灰 (#C7C7CC): priority="低" or category="参考"
//
// check circle (Apple Reminders 風、DECISIONS §10.6):
//   - 未チェック: 22px 円、border 2px Apple Blue、ニュートラル白
//   - チェック済: 22px 塗り Apple Blue + 中央に白 check
//   - タップ領域 44px 以上 (周辺 padding)
//
// S14 P1 では「読み取りのみ」(タップ完了化は S17 Plan タブで実装)
// 本 P1 ではタップで何もしない (将来 onToggle prop を生やす)
//
// props: next (全件)、onToggle (将来用、未実装で OK)

const _NA_PRIORITY_ORDER = { "最高": 1, "高": 2, "中": 3, "低": 4, "参考": 5 };

// priority dot 色決定
const _naDotColor = (n, todayIso) => {
  if (n.priority === "低" || n.category === "参考") return C.appleGray4;
  if (n.dueDate) {
    const due = normDate(n.dueDate);
    if (due) {
      const a = new Date(due).getTime();
      const b = new Date(todayIso).getTime();
      const days = Math.round((a - b) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 7) return "#FF3B30";
    }
  }
  return "#FF9500";
};

function _NACheckCircle({ checked, onClick }) {
  if (checked) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="完了済"
        style={{
          width: 22, height: 22, borderRadius: 11,
          background: C.primary, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, cursor: onClick ? "pointer" : "default",
          padding: 0,
        }}
      >
        <Icon name="check" size={12} color="#fff" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="未完了"
      style={{
        width: 22, height: 22, borderRadius: 11,
        background: C.panel, border: `1.5px solid ${C.appleGray4}`,
        flexShrink: 0, cursor: onClick ? "pointer" : "default",
        padding: 0,
      }}
    />
  );
}

function NextActions({ next = [], onToggle }) {
  const todayIso = today();

  const open = useMemo(() => {
    return (next || []).filter(n => n && !n.done).slice().sort(
      (a, b) => (_NA_PRIORITY_ORDER[a.priority] || 99) - (_NA_PRIORITY_ORDER[b.priority] || 99)
    );
  }, [next]);

  const top3 = open.slice(0, 3);

  return (
    <div style={{ background: C.panel, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 }}>
      {/* ヘッダ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="flag" size={16} color={C.textMuted} />
          次のアクション
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: "#FF9500", background: "rgba(255,149,0,0.10)",
          padding: "3px 8px", borderRadius: 8, letterSpacing: 0.3,
        }}>{top3.length} / {open.length}</span>
      </div>

      {/* 行 (top 3) */}
      {top3.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0", textAlign: "center" }}>
          未完了のアクションはありません
        </div>
      ) : (
        top3.map((n, i) => {
          const dot = _naDotColor(n, todayIso);
          const due = n.dueDate ? normDate(n.dueDate) : null;
          const meta = due
            ? `${due} まで`
            : (n.category || "継続課題");
          return (
            <div key={n.id || i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 0",
              borderTop: i === 0 ? "none" : `1px solid ${C.bg}`,
            }}>
              {/* priority dot */}
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: dot, flexShrink: 0,
              }} />
              {/* body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: C.text,
                  lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {n.label || "(無題)"}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {meta}
                </div>
              </div>
              {/* check circle (S14 P1 ではタップ動作なし、S17 Plan タブで実装) */}
              <_NACheckCircle checked={false} onClick={onToggle ? () => onToggle(n.id) : null} />
            </div>
          );
        })
      )}
    </div>
  );
}
