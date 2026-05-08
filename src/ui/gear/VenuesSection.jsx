// VenuesSection — Manage Masters の会場セクション (S17 Phase 2 #6 + 抜本対応)
// 過去 Stage で「後で」棚上げされた会場 master CRUD UI を消化
// venues は文字列 array で運用 (既存)、行表示は alphabetical sort (日本語 locale)
//
// S17 Phase 2 補完:
//   - デフォルト折りたたみ (50+ 件で縦長になる対策)
//   - 「使用中の会場を取り込み」ボタン (tournaments/practices/trials の venue 文字列を master 化)
//   - 各行に「整理」ボタン (Master Cleanup Modal で他 venue とマージ可能)

function VenuesSection({ venues, onEdit, onAdd, onBulkImport, onCleanupStart }) {
  const [collapsed, setCollapsed] = useState(true);

  // 文字列 array → name 配列に正規化 (オブジェクト混在に互換性)
  const names = (venues || [])
    .map(v => typeof v === "string" ? v : (v?.name || ""))
    .filter(Boolean);
  // alphabetical (日本語 localeCompare)
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "ja"));

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
          <Icon name="map-pin" size={16} color={C.textSecondary} />
          会場
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            {sorted.length}
          </span>
        </div>
        {!collapsed && (
          <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
            {onBulkImport && (
              <button
                type="button"
                onClick={onBulkImport}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  color: C.textMuted, fontSize: 11, fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                取り込み
              </button>
            )}
            <button
              type="button"
              onClick={onAdd}
              style={{
                background: "transparent", border: "none", padding: 0,
                color: C.primary, fontSize: 11, fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}
            >
              <Icon name="plus" size={13} /> 追加
            </button>
          </div>
        )}
      </div>

      {/* 折りたたみ内容 */}
      {!collapsed && (
        sorted.length === 0 ? (
          <div style={{
            padding: "16px 0",
            textAlign: "center",
            color: C.textMuted,
            fontSize: 12,
          }}>
            会場が登録されていません <br/>
            {onBulkImport && (
              <button
                type="button"
                onClick={onBulkImport}
                style={{
                  marginTop: 8,
                  background: "transparent", border: `1px solid ${C.primary}`,
                  borderRadius: 8, padding: "6px 14px",
                  color: C.primary, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                使用中の会場を取り込む
              </button>
            )}
          </div>
        ) : (
          sorted.map((name) => (
            <div
              key={name}
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.row,
                padding: "11px 14px",
                marginBottom: 6,
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                onClick={() => onEdit(name)}
                style={{
                  fontSize: 13, fontWeight: 500, color: C.text,
                  cursor: "pointer", minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
              {/* 整理 (マージ) ボタン */}
              {onCleanupStart && (
                <button
                  type="button"
                  onClick={() => onCleanupStart("venue", name)}
                  aria-label="他の会場と整理 (マージ)"
                  title="他の会場と整理 (マージ)"
                  style={{
                    width: 28, height: 28, padding: 0,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none", color: C.textMuted,
                    cursor: "pointer", borderRadius: 6,
                  }}
                >
                  <Icon name="git-merge" size={14} />
                </button>
              )}
              <div onClick={() => onEdit(name)} style={{ cursor: "pointer" }}>
                <Icon name="caret-right" size={16} color={C.textMuted} />
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}
