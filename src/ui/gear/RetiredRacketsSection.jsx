// RetiredRacketsSection — Manage Masters の引退ラケット archive UI (S17 Phase 2 #9)
// WIREFRAMES_v4.md §2.8.4 で記載されていた未実装セクションを消化
//
// rackets[] の status="retired" のみ表示。行タップで既存 RacketEditModal 起動 (status 変更で復帰可)。
// 並び順: order ASC (機材タブの並び替え mode で順序変更されたら反映)
// S17 Phase 2 補完: デフォルト折りたたみ (縦長対策)

function RetiredRacketsSection({ rackets, onEdit }) {
  const [collapsed, setCollapsed] = useState(true);

  const retired = (rackets || [])
    .filter(r => r && r.status === "retired")
    .sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : 999;
      const ob = typeof b.order === "number" ? b.order : 999;
      if (oa !== ob) return oa - ob;
      return (a.name || "").localeCompare(b.name || "", "ja");
    });

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      {/* セクションヘッダー (タップで折りたたみ切替) */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, cursor: "pointer",
          padding: collapsed ? 0 : "0 0 10px",
        }}
      >
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name={collapsed ? "caret-right" : "caret-down"} size={14} color={C.textMuted} />
          <Icon name="archive" size={16} color={C.textSecondary} />
          引退ラケット
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            {retired.length}
          </span>
        </div>
      </div>

      {/* 折りたたみ内容 */}
      {!collapsed && (
        <>
          {retired.length > 0 && (
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
              行タップで編集 → ステータスを変更すると復帰できます
            </div>
          )}
          {retired.length === 0 ? (
            <div style={{
              padding: "16px 0",
              textAlign: "center",
              color: C.textMuted,
              fontSize: 12,
            }}>
              引退中のラケットはありません
            </div>
          ) : (
            retired.map((r) => (
              <div
                key={r.id}
                onClick={() => onEdit(r)}
                style={{
                  background: C.panel2,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.row,
                  padding: "11px 14px",
                  marginBottom: 6,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  cursor: "pointer",
                  opacity: 0.75,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {r.name || "(無名)"}
                  </div>
                  {(r.role || r.note) && (
                    <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.role || r.note}
                    </div>
                  )}
                </div>
                <Icon name="caret-right" size={16} color={C.textMuted} />
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
