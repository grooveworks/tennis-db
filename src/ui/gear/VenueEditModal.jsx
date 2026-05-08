// VenueEditModal — 会場 (venues) master の追加・編集
// S17 Phase 2 #6: 過去 Stage で「後で」棚上げされた会場 master 管理 UI を消化
// S17 Phase 2 補完:
//   - 削除前に「使用セッション数」を表示 (削除影響を可視化)
//   - 「他の会場と統合する」ボタン (Master Cleanup Modal を起動)
//
// venues は文字列 array で運用 (既存運用継承、互換性維持)

function VenueEditModal({ open, item, allVenues, tournaments, practices, trials, onSave, onClose, onDelete, onMerge, confirm }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(typeof item === "string" ? item : (item?.name || ""));
      setError("");
    }
  }, [open, item]);

  // item が文字列 (既存 venues)、または null/"" (新規追加)
  const isNew = item == null || item === "";
  const oldName = typeof item === "string" ? item : (item?.name || "");

  // 削除影響件数 (open でかつ既存編集の場合のみ計算)
  const usageCount = useMemo(() => {
    if (isNew || !oldName || typeof findAllSessionsUsing !== "function") return null;
    const matched = findAllSessionsUsing(
      { tournaments: tournaments || [], practices: practices || [], trials: trials || [] },
      "venue",
      oldName
    );
    const t = (matched.tournaments || []).length;
    const p = (matched.practices || []).length;
    const tr = (matched.trials || []).length;
    return { tournaments: t, practices: p, trials: tr, total: t + p + tr };
  }, [isNew, oldName, tournaments, practices, trials, open]);

  const handleSave = () => {
    const trimmed = (name || "").trim();
    if (!trimmed) { setError("会場名は必須です"); return; }
    const existing = (allVenues || []).map(v => typeof v === "string" ? v : (v?.name || "")).filter(Boolean);
    const duplicate = existing.some(v => v === trimmed && v !== oldName);
    if (duplicate) { setError("同じ名前の会場が既に登録されています"); return; }
    onSave(trimmed, oldName, isNew);
  };

  const handleDelete = () => {
    if (isNew) return;
    const c = usageCount || { total: 0, tournaments: 0, practices: 0, trials: 0 };
    let body;
    if (c.total > 0) {
      body = `「${oldName}」を master から削除します。\n\nこの会場を使用しているセッション: ${c.total} 件 (大会 ${c.tournaments} / 練習 ${c.practices} / 試打 ${c.trials})\n\nセッション側の文字列は残ります (失われません)、master の選択肢から外れるだけです。`;
    } else {
      body = `「${oldName}」を削除します。よろしいですか?\n\n使用しているセッションはありません。`;
    }
    confirm.ask(
      body,
      () => onDelete(oldName),
      { title: "会場削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
    );
  };

  const handleMergeClick = () => {
    if (isNew || !onMerge) return;
    onClose();
    // 親で onMerge → handleCleanupStart で Master Cleanup Modal が起動
    setTimeout(() => onMerge(oldName), 50);
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "会場 追加" : "会場 編集"}>
      <Input
        label="会場名"
        value={name}
        onChange={setName}
        placeholder="例: 航空公園テニスコート"
        required
        error={error}
      />

      {/* 削除影響件数表示 (既存編集時のみ) */}
      {!isNew && usageCount && (
        <div style={{
          background: usageCount.total > 0 ? C.warningLight : C.panel2,
          border: `1px solid ${usageCount.total > 0 ? "rgba(251,188,4,0.3)" : C.border}`,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 11, lineHeight: 1.6,
          color: C.textSecondary,
        }}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>
            この会場を使用しているセッション: {usageCount.total} 件
          </div>
          {usageCount.total > 0 && (
            <div>
              大会 {usageCount.tournaments} / 練習 {usageCount.practices} / 試打 {usageCount.trials}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {!isNew && onMerge && (
          <Button variant="ghost" onClick={handleMergeClick}>
            <Icon name="git-merge" size={14} /> 他の会場と統合
          </Button>
        )}
        {!isNew && (
          <Button variant="danger" onClick={handleDelete}>
            <Icon name="trash" size={14} /> 削除
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={handleSave}>保存</Button>
      </div>
    </Modal>
  );
}
