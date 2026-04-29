// MeasurementEditModal — ラケットの実測値 (measurements[] のネスト要素) 追加・編集
// SCHEMA: src/core/05_schema.js の measurement type
// state / weight / balance / gripW / gripT / current / note
//
// 「現行」フラグ (current=true) は 1 ラケット 1 件のみ。新規/編集で current=true を選ぶと
// 親 (RacketDetailView) が他の measurement の current を false にリセットする。

function MeasurementEditModal({ open, item, racketName, onSave, onClose, onDelete, confirm }) {
  const isNew = !item || !item.id;
  const [state, setState] = useState("");
  const [weight, setWeight] = useState("");
  const [balance, setBalance] = useState("");
  const [gripW, setGripW] = useState("");
  const [gripT, setGripT] = useState("");
  const [current, setCurrent] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setState(item?.state || "");
    setWeight(item?.weight || "");
    setBalance(item?.balance || "");
    setGripW(item?.gripW || "");
    setGripT(item?.gripT || "");
    setCurrent(!!item?.current);
    setNote(item?.note || "");
  }, [open, item]);

  const handleSave = () => {
    const next = {
      ...(item || {}),
      id: item?.id || `ms${Date.now()}`,
      state: (state || "").trim(),
      weight: (weight || "").trim(),
      balance: (balance || "").trim(),
      gripW: (gripW || "").trim(),
      gripT: (gripT || "").trim(),
      current: !!current,
      note: (note || "").trim(),
    };
    onSave(next, isNew);
  };

  const handleDelete = () => {
    if (!item || !item.id) return;
    confirm.ask(
      "この実測値を削除します。よろしいですか?",
      () => onDelete(item.id),
      { title: "実測値削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "実測値 追加" : "実測値 編集"}>
      {racketName && (
        <div style={{
          fontSize: 11, color: C.textMuted,
          marginTop: -6, marginBottom: 10,
          textAlign: "center",
        }}>
          {racketName}
        </div>
      )}
      <Input
        label="状態"
        value={state}
        onChange={setState}
        placeholder="例: PPシム+KGL164+OG込み (ゲームレディ)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
        <Input label="重量" value={weight} onChange={setWeight} placeholder="333.9g" />
        <Input label="バランス" value={balance} onChange={setBalance} placeholder="321.5mm" />
        <Input label="グリップ幅" value={gripW} onChange={setGripW} placeholder="33.5mm" />
        <Input label="グリップ厚" value={gripT} onChange={setGripT} placeholder="29.7mm" />
      </div>
      {/* 現行ゲームレディ トグル */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", background: C.panel2, borderRadius: 8,
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, color: C.text }}>
          現行ゲームレディ
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
            このラケットの現在の実測値として記録 (1 件のみ)
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCurrent(!current)}
          aria-pressed={current}
          aria-label="現行ゲームレディ切替"
          style={{
            background: current ? C.success : C.appleGray4,
            border: "none",
            borderRadius: 12,
            width: 44, height: 24,
            position: "relative",
            cursor: "pointer",
            transition: "background 150ms",
          }}
        >
          <div style={{
            position: "absolute", top: 2,
            left: current ? 22 : 2,
            width: 20, height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 150ms",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </button>
      </div>
      <Textarea label="メモ" value={note} onChange={setNote} placeholder="グリップ施工方法 / 評価など..." rows={2} />
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
