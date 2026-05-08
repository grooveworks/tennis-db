// MasterCleanupModal — master 整理 (マージ・置換) の共通 UI (S17 Phase 2 抜本対応)
//
// master 種別 (venue / racketName / stringMain / stringCross / opponent / level) を props で切替、
// 1 つの modal で全 master の整理を統一処理。
//
// props:
//   open: boolean
//   masterType: "venue" | "racketName" | "stringMain" | "stringCross" | "opponent" | "level"
//   sourceName: string  整理対象の現在名
//   availableTargets: string[]  target 候補 (self 除外して渡す)
//   collectionsByKey: { tournaments, practices, trials }  影響範囲計算 + 置換用
//   onConfirm: (sourceName, targetName, selectedIdsByCollection) => void
//   onClose: () => void
//
// 設計方針 (memory: feedback_data_destruction_2026_05_03.md 準拠):
//   - 「中身がわかる」ユーザー要求対応: 各影響 session に describeSessionForCleanup の文字列表示
//   - 個別チェック式: default 全選択、ユーザーがチェック外せる (誤入力 session を除外可能)
//   - 暗黙確定禁止: target 選択 + 1 件以上 + 「マージ実行」ボタン明示タップで初めて実行

function MasterCleanupModal({ open, masterType, sourceName, availableTargets, collectionsByKey, onConfirm, onClose }) {
  const [targetName, setTargetName] = useState("");
  // selectedIds を collection ごとに管理 (Set)
  const [selectedIdsByCollection, setSelectedIdsByCollection] = useState({});

  // 影響セッション一覧 (open のたびに再計算、純関数)
  const matched = useMemo(() => {
    if (!open || !sourceName) return {};
    return findAllSessionsUsing(collectionsByKey || {}, masterType, sourceName);
  }, [open, masterType, sourceName, collectionsByKey]);

  // open 時に default で全選択
  useEffect(() => {
    if (!open) return;
    const init = {};
    for (const k of Object.keys(matched)) {
      init[k] = new Set((matched[k] || []).map(s => s.id).filter(Boolean));
    }
    setSelectedIdsByCollection(init);
    setTargetName("");
  }, [open, matched]);

  if (!open) return null;

  const def = MASTER_CLEANUP_DEFS[masterType] || { label: "master" };

  const toggleSelected = (collKey, id) => {
    setSelectedIdsByCollection(prev => {
      const next = { ...prev };
      const cur = new Set(next[collKey] || []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      next[collKey] = cur;
      return next;
    });
  };

  const toggleAllInCollection = (collKey) => {
    const sessions = matched[collKey] || [];
    const cur = selectedIdsByCollection[collKey] || new Set();
    const allSelected = sessions.every(s => cur.has(s.id));
    setSelectedIdsByCollection(prev => {
      const next = { ...prev };
      if (allSelected) {
        next[collKey] = new Set();
      } else {
        next[collKey] = new Set(sessions.map(s => s.id).filter(Boolean));
      }
      return next;
    });
  };

  // 選択件数の合計
  const totalSelected = Object.values(selectedIdsByCollection).reduce(
    (sum, set) => sum + (set instanceof Set ? set.size : 0), 0
  );
  const totalMatched = Object.values(matched).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  );

  const valid = !!targetName && targetName !== sourceName && totalSelected > 0;

  return (
    <Modal open={open} onClose={onClose} title={`${def.label} 整理`}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>整理対象 (現在の名前)</div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: C.text,
          padding: "8px 12px",
          background: C.warningLight,
          border: `1px solid rgba(251,188,4,0.3)`,
          borderRadius: 8,
        }}>{sourceName}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Select
          label="統合先 (この名前に置き換え)"
          value={targetName}
          onChange={setTargetName}
          options={[
            { value: "", label: "-- 統合先を選択 --" },
            ...((availableTargets || []).filter(n => n && n !== sourceName).map(n => ({ value: n, label: n }))),
          ]}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>影響セッション ({totalSelected} / {totalMatched} 件選択)</span>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>チェックを外すと置換しない</span>
        </div>

        {totalMatched === 0 ? (
          <div style={{
            padding: "16px 0", textAlign: "center",
            color: C.textMuted, fontSize: 12,
          }}>
            影響セッションはありません (master からの削除のみ)
          </div>
        ) : (
          Object.entries(matched).map(([collKey, sessions]) => {
            if (!sessions || sessions.length === 0) return null;
            const collLabels = { tournaments: "大会", practices: "練習", trials: "試打" };
            const sel = selectedIdsByCollection[collKey] || new Set();
            const allSelected = sessions.every(s => sel.has(s.id));
            return (
              <div key={collKey} style={{ marginBottom: 12 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: 11, fontWeight: 700, color: C.textSecondary,
                  marginBottom: 4, padding: "4px 8px",
                  background: C.panel2, borderRadius: 6,
                }}>
                  <span>{collLabels[collKey] || collKey} ({sessions.length} 件)</span>
                  <button
                    type="button"
                    onClick={() => toggleAllInCollection(collKey)}
                    style={{
                      background: "transparent", border: "none", padding: 0,
                      color: C.primary, fontSize: 10, fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {allSelected ? "すべて外す" : "すべて選択"}
                  </button>
                </div>
                <div style={{
                  maxHeight: 220, overflow: "auto",
                  border: `1px solid ${C.border}`, borderRadius: 8,
                }}>
                  {sessions.map(s => {
                    const isChecked = sel.has(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "8px 10px",
                          borderBottom: `1px dashed ${C.divider}`,
                          fontSize: 12, cursor: "pointer",
                          background: isChecked ? "#fff" : C.panel2,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelected(collKey, s.id)}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <span style={{
                          flex: 1, minWidth: 0,
                          color: isChecked ? C.text : C.textMuted,
                          lineHeight: 1.5,
                        }}>
                          {describeSessionForCleanup(s, collKey)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* preview サマリ */}
      <div style={{
        background: C.primaryLight,
        border: `1px solid rgba(0,122,255,0.25)`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 12,
        fontSize: 12, color: C.text, lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2, color: C.primary }}>実行内容のプレビュー</div>
        {valid ? (
          <>
            選択した {totalSelected} 件の {def.label} 名を <b>「{sourceName}」</b> → <b>「{targetName}」</b> に置換、master から「{sourceName}」を削除します。
            <br/>
            <span style={{ fontSize: 11, color: C.textMuted }}>過去のセッション記録は文字列として残ります (失われません)。</span>
          </>
        ) : (
          <span style={{ color: C.textMuted }}>統合先を選択し、置換するセッションを 1 件以上チェックしてください。</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <div style={{ flex: 1 }} />
        <Button variant="primary" onClick={() => valid && onConfirm(sourceName, targetName, selectedIdsByCollection)} disabled={!valid}>
          <Icon name="check" size={14} /> マージ実行
        </Button>
      </div>
    </Modal>
  );
}
