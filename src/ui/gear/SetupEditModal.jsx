// SetupEditModal — セッティング組合せ (stringSetups) の追加・編集
// S17 Phase 2 #1: Phase 4-D で実装予定だった master CRUD UI を消化
//
// 編集対象: label / stringMain / stringCross / status (active/archived) / note
// SCHEMA: src/core/05_schema.js の stringSetup type
const _SETUP_STATUS_OPTIONS = [
  { value: "active",   label: "✅ 使用中" },
  { value: "archived", label: "📦 アーカイブ" },
];

function SetupEditModal({ open, item, stringNames, onSave, onClose, onDelete, confirm }) {
  const [label, setLabel] = useState("");
  const [stringMain, setStringMain] = useState("");
  const [stringCross, setStringCross] = useState("");
  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(item?.label || "");
      setStringMain(item?.stringMain || "");
      setStringCross(item?.stringCross || "");
      setStatus(item?.status || "active");
      setNote(item?.note || "");
      setError("");
    }
  }, [open, item]);

  const isNew = !item || !item.id;

  const handleSave = () => {
    const trimmedLabel = (label || "").trim();
    if (!trimmedLabel) { setError("ラベルは必須です"); return; }
    const next = {
      ...(item || {}),
      id:          item?.id || `setup${genId()}`,
      label:       trimmedLabel,
      stringMain:  (stringMain || "").trim(),
      stringCross: (stringCross || "").trim(),
      status,
      note:        (note || "").trim(),
    };
    onSave(next, isNew);
  };

  const handleDelete = () => {
    if (!item || !item.id) return;
    confirm.ask(
      `「${item.label}」を削除します。よろしいですか?`,
      () => onDelete(item.id),
      { title: "セッティング削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "セッティング 追加" : "セッティング 編集"}>
      <Input
        label="ラベル"
        value={label}
        onChange={setLabel}
        placeholder="例: 攻撃用 Blast×PTP"
        required
        error={error}
      />
      <MasterField
        label="縦糸"
        value={stringMain}
        onChange={setStringMain}
        masterValues={stringNames || []}
        placeholder="-- 縦糸を選択 --"
      />
      <MasterField
        label="横糸"
        value={stringCross}
        onChange={setStringCross}
        masterValues={stringNames || []}
        placeholder="-- 横糸を選択 (同じなら空) --"
      />
      <Select
        label="ステータス"
        value={status}
        onChange={setStatus}
        options={_SETUP_STATUS_OPTIONS}
      />
      <Textarea
        label="メモ"
        value={note}
        onChange={setNote}
        placeholder="使用シーン、テンション、所感など..."
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
