// StringEditModal — ストリング在庫の追加・編集 (V2 互換)
// 編集対象: name / qty / status / note
// V2 status 6 種: confirmed / good / testing / candidate / hold / rejected
// SCHEMA: src/core/05_schema.js の string type
const _STRING_STATUS_OPTIONS = [
  { value: "confirmed", label: "✅ 確定" },
  { value: "good",      label: "👍 好印象" },
  { value: "testing",   label: "🔬 検証中" },
  { value: "candidate", label: "💡 候補" },
  { value: "hold",      label: "⏸ 保留" },
  { value: "rejected",  label: "❌ 除外" },
];

function StringEditModal({ open, item, onSave, onClose, onDelete, confirm }) {
  // open=true で初期化、null item は新規作成
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [status, setStatus] = useState("hold");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(item?.name || "");
      setQty(item?.qty || "");
      setStatus(item?.status || "hold");
      setNote(item?.note || "");
      setError("");
    }
  }, [open, item]);

  const isNew = !item || !item.id;

  const handleSave = () => {
    const trimmed = (name || "").trim();
    if (!trimmed) { setError("ストリング名は必須です"); return; }
    const next = {
      ...(item || {}),
      id: item?.id || `s${genId()}`,
      name: trimmed,
      qty: (qty || "").trim(),
      status,
      note: (note || "").trim(),
      // order は呼び出し側で維持 / 新規時は親が末尾に追加
    };
    onSave(next, isNew);
  };

  const handleDelete = () => {
    if (!item || !item.id) return;
    confirm.ask(
      `「${item.name}」を削除します。よろしいですか?`,
      () => onDelete(item.id),
      { title: "ストリング削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "ストリング 追加" : "ストリング 編集"}>
      <Input
        label="ストリング名"
        value={name}
        onChange={setName}
        placeholder="例: Babolat Blast 1.25"
        required
        error={error}
      />
      <Input
        label="在庫量"
        value={qty}
        onChange={setQty}
        placeholder="例: 大量 / 1張り / 200m"
      />
      <Select
        label="ステータス"
        value={status}
        onChange={setStatus}
        options={_STRING_STATUS_OPTIONS}
      />
      <Textarea
        label="メモ"
        value={note}
        onChange={setNote}
        placeholder="使用用途、評価など..."
        rows={3}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
