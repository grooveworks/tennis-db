// StringsSection — Manage Masters のストリング在庫セクション
// WIREFRAMES_v4.md §2.8.4 / DESIGN_SYSTEM_v4.md §8.6.9 / §11
//
// 機能: 一覧表示 + 並び順編集モード + 追加ボタン + 行タップで編集 Modal
// status 6 種で左 6px 帯を色分け、rejected は muted (opacity 0.55)
// 並び替えモードは reorder.js の純関数 (moveItemUp/moveItemDown) を使う
// 永続化: 親 (app.jsx) の handleStringsUpdate で localStorage + Firestore 即時 write

const _STK_COLORS = {
  confirmed: "var(--practiceAccent)",
  good:      "var(--primary)",
  testing:   "var(--warning)",
  candidate: "var(--trialAccent)",
  hold:      "var(--appleGray4)",
  rejected:  "var(--errorLight)",
};
const _STK_LABELS = {
  confirmed: "確定",
  good:      "好印象",
  testing:   "検証中",
  candidate: "候補",
  hold:      "保留",
  rejected:  "除外",
};

function StringsSection({ strings, onUpdate, onEdit, onAdd, toast }) {
  const [reorderMode, setReorderMode] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // 並べ替えモードでは除外も全件表示 (順序の見通しのため)
  const visible = reorderMode || showAll
    ? sortByStatusAndOrder(strings || [], STRING_STATUS_PRIORITY)
    : sortByStatusAndOrder((strings || []).filter(s => s.status !== "rejected"), STRING_STATUS_PRIORITY);

  const rejectedCount = (strings || []).filter(s => s.status === "rejected").length;

  const handleMove = (newList) => {
    onUpdate(newList);
  };

  const stockingColor = (status) => {
    return ({
      confirmed: C.practiceAccent,
      good: C.primary,
      testing: C.warning,
      candidate: C.trialAccent,
      hold: C.appleGray4,
      rejected: C.errorLight,
    })[status] || C.appleGray4;
  };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px 16px",
      marginBottom: 12,
    }}>
      {/* セクションヘッダー */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, gap: 8, flexWrap: "wrap",
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name="line-segments" size={16} color={C.textSecondary} />
          ストリング在庫
        </div>
        <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
          {!reorderMode && (
            <>
              {!showAll && rejectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  style={{
                    background: "transparent", border: "none", padding: 0,
                    color: C.textMuted, fontSize: 11, fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  除外 +{rejectedCount}
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
                  除外を隠す
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
      </div>

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
          ストリングが登録されていません
        </div>
      ) : (
        visible.map((s, i) => {
          // visible 内の index と元 strings 配列の index は異なる場合があるので、id ベースで原 index を取得
          const originalIdx = (strings || []).findIndex(x => x.id === s.id);
          const isMuted = s.status === "rejected";
          const handleRowClick = () => {
            if (reorderMode) return;
            onEdit(s);
          };
          const handleMoveUp = () => {
            // visible リスト内の前の要素の元 index と入れ替え
            if (i <= 0) return;
            const prevId = visible[i - 1].id;
            const prevOrig = (strings || []).findIndex(x => x.id === prevId);
            if (originalIdx < 0 || prevOrig < 0) return;
            handleMove(reorderItems(strings, originalIdx, prevOrig));
          };
          const handleMoveDown = () => {
            if (i >= visible.length - 1) return;
            const nextId = visible[i + 1].id;
            const nextOrig = (strings || []).findIndex(x => x.id === nextId);
            if (originalIdx < 0 || nextOrig < 0) return;
            handleMove(reorderItems(strings, originalIdx, nextOrig));
          };
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
                opacity: isMuted && !reorderMode ? 0.55 : 1,
              }}
            >
              {/* status 色帯 */}
              <div style={{
                width: 6, height: 28,
                borderRadius: 3,
                background: stockingColor(s.status),
              }} />
              {/* 名前 + メタ */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {s.name || "(無名)"}
                </div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>
                  {_STK_LABELS[s.status] || "—"}{s.note ? " · " + s.note : ""}
                </div>
              </div>
              {/* 通常モード: 数量 + 編集アイコン */}
              {!reorderMode && (
                <>
                  <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
                    {s.qty || "—"}
                  </div>
                  <Icon name="caret-right" size={16} color={C.textMuted} />
                </>
              )}
              {/* 並び替えモード: ▲▼ */}
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

      {/* 凡例 (並び替えモードでは非表示) */}
      {!reorderMode && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8,
          fontSize: 10, color: C.textMuted,
        }}>
          {Object.entries(_STK_LABELS).map(([k, label]) => (
            <span key={k} style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 6px",
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 999,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2,
                background: stockingColor(k),
                display: "inline-block",
              }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
