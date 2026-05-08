// SetupsSection — Manage Masters のセッティング組合せセクション
// S17 Phase 2 #1: stringSetups CRUD UI (Phase 4-D 予定だった機能を消化)
// S17 Phase 2 補完: デフォルト折りたたみ (縦長対策)

const _STP_LABELS = {
  active:   "使用中",
  archived: "アーカイブ",
};

function SetupsSection({ stringSetups, onUpdate, onEdit, onAdd, toast }) {
  const [collapsed, setCollapsed] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // 並べ替えモードでは archived も全件表示
  const visible = reorderMode || showAll
    ? sortByStatusAndOrder(stringSetups || [], SETUP_STATUS_PRIORITY)
    : sortByStatusAndOrder((stringSetups || []).filter(s => s.status !== "archived"), SETUP_STATUS_PRIORITY);

  const archivedCount = (stringSetups || []).filter(s => s.status === "archived").length;
  const totalCount = (stringSetups || []).length;

  const handleMove = (newList) => onUpdate(newList);

  const setupColor = (status) => status === "active" ? C.primary : C.appleGray4;

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
        onClick={() => !reorderMode && setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, flexWrap: "wrap",
          cursor: reorderMode ? "default" : "pointer",
          padding: collapsed ? 0 : "0 0 10px",
        }}
      >
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name={collapsed ? "caret-right" : "caret-down"} size={14} color={C.textMuted} />
          <Icon name="stack" size={16} color={C.textSecondary} />
          セッティング組合せ
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            {totalCount}
          </span>
        </div>
        {!collapsed && (
          <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
            {!reorderMode && (
              <>
                {!showAll && archivedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    style={{
                      background: "transparent", border: "none", padding: 0,
                      color: C.textMuted, fontSize: 11, fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    アーカイブ +{archivedCount}
                  </button>
                )}
                {showAll && (
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    style={{
                      background: "transparent", border: "none", padding: 0,
                      color: C.textMuted, fontSize: 11, fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    アーカイブを隠す
                  </button>
                )}
                <ReorderToggleLink onClick={() => setReorderMode(true)} />
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
              </>
            )}
            {reorderMode && (
              <ReorderDoneButton onClick={() => setReorderMode(false)} />
            )}
          </div>
        )}
      </div>

      {/* 折りたたみ内容 */}
      {!collapsed && (
        <>
          {/* 並び替え時のヒント帯 */}
          {reorderMode && (
            <ReorderHintBar>
              上下ボタンで順序を変えると Select の表示順にも反映されます
            </ReorderHintBar>
          )}

          {/* リスト */}
          {visible.length === 0 ? (
            <div style={{
              padding: "20px 0",
              textAlign: "center",
              color: C.textMuted,
              fontSize: 12,
            }}>
              セッティング組合せが登録されていません
            </div>
          ) : (
            visible.map((s, i) => {
              const isMuted = s.status === "archived";
              const handleRowClick = () => {
                if (reorderMode) return;
                onEdit(s);
              };
              const swapWithVisible = (otherIdx) => {
                const other = visible[otherIdx];
                if (!other || s.id === other.id) return;
                const newList = (stringSetups || []).map(x => {
                  if (x.id === s.id) return { ...x, order: other.order };
                  if (x.id === other.id) return { ...x, order: s.order };
                  return x;
                });
                handleMove(newList);
              };
              const handleMoveUp = () => { if (i > 0) swapWithVisible(i - 1); };
              const handleMoveDown = () => { if (i < visible.length - 1) swapWithVisible(i + 1); };
              const stringInfo = [s.stringMain, s.stringCross].filter(Boolean).join(" × ") || "(糸 未指定)";
              return (
                <div
                  key={s.id}
                  onClick={handleRowClick}
                  style={{
                    background: reorderMode ? C.panel2 : (isMuted ? C.panel2 : C.panel),
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS.row,
                    padding: "11px 14px",
                    marginBottom: 8,
                    display: "grid",
                    gridTemplateColumns: reorderMode ? "auto 1fr auto" : "auto 1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                    cursor: reorderMode ? "default" : "pointer",
                    opacity: isMuted && !reorderMode ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 6, height: 28,
                    borderRadius: 3,
                    background: setupColor(s.status),
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {s.label || "(無名)"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>
                      {stringInfo} · {_STP_LABELS[s.status] || "—"}
                    </div>
                  </div>
                  {!reorderMode && (
                    <>
                      <div style={{ width: 0 }} />
                      <Icon name="caret-right" size={16} color={C.textMuted} />
                    </>
                  )}
                  {reorderMode && (
                    <ReorderControls
                      index={i}
                      length={visible.length}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
