// RacketEditModal — ラケットの追加・編集 (V2 互換 + S15.5.9 auto-save 標準方針)
//
// 編集対象 (SCHEMA: src/core/05_schema.js の racket type):
//   基本: name / role / status / face / beam / weight / balance / currentString / currentTension / note
//   Decision Notes: decisionKeep / decisionWorry / decisionNext (3 つの textarea)
//   nextCheck: 候補・検討中時のみ表示する 1 行 (例: 「次: 5/12 大会で実戦投入確認」)
//   measurements / order: ここでは触らない (measurements は Detail から、order は親が維持)
//
// auto-save: S15.5.9 と同パターン、draft key = yuke-racket-draft-{id}-v1
//   保存確定 / 削除 / キャンセル(破棄) で draft クリア

const _RACKET_STATUS_OPTIONS = [
  { value: "active",      label: "✓ 主力" },
  { value: "sub",         label: "② 予備" },
  { value: "candidate",   label: "★ 候補" },
  { value: "considering", label: "? 検討中" },
  { value: "support",     label: "○ 用途別" },
  { value: "retired",     label: "× 引退" },
];

const _racketDraftKey = (id) => `${LS_PREFIX}racket-draft-${id}-v1`;
const _loadRacketDraft = (id) => {
  if (!id) return null;
  try {
    const v = localStorage.getItem(_racketDraftKey(id));
    return v ? JSON.parse(v) : null;
  } catch (_) { return null; }
};
const _saveRacketDraft = (id, form) => {
  if (!id) return;
  try { localStorage.setItem(_racketDraftKey(id), JSON.stringify(form)); } catch (_) {}
};
const _clearRacketDraft = (id) => {
  if (!id) return;
  try { localStorage.removeItem(_racketDraftKey(id)); } catch (_) {}
};

function RacketEditModal({ open, item, onSave, onClose, onDelete, confirm, toast }) {
  const isNew = !item || !item.id;
  // 起動時 draft 復元 (S15.5.9 標準)
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const itemId = item?.id;
    if (itemId) {
      const draft = _loadRacketDraft(itemId);
      if (draft) {
        setForm(draft); setDirty(true); setRestored(true);
      } else {
        setForm({ ...item }); setDirty(false); setRestored(false);
      }
    } else {
      // 新規: id を即座に発行 (auto-save の draft key に使う)
      setForm({
        id: genId(),
        name: "", role: "", status: "candidate",
        face: "", beam: "", weight: "", balance: "",
        currentString: "", currentTension: "",
        note: "",
        decisionKeep: "", decisionWorry: "", decisionNext: "",
        nextCheck: "",
        measurements: [],
      });
      setDirty(false); setRestored(false);
    }
    setError("");
  }, [open, item?.id]);

  // form 変化のたび auto-save (dirty 中のみ)
  useEffect(() => {
    if (!open || !form?.id || !dirty) return;
    _saveRacketDraft(form.id, form);
  }, [open, form, dirty]);

  const update = (k) => (v) => { setForm(prev => ({ ...prev, [k]: v })); setDirty(true); };

  const handleSave = () => {
    const trimmed = (form.name || "").trim();
    if (!trimmed) { setError("ラケット名は必須です"); return; }
    const next = { ...form, name: trimmed };
    if (form.id) _clearRacketDraft(form.id);
    onSave(next, isNew);
  };

  const handleClose = () => {
    if (!dirty) {
      if (form.id) _clearRacketDraft(form.id);
      onClose();
      return;
    }
    confirm.ask(
      "編集内容が保存されていません。破棄してよろしいですか?",
      () => {
        if (form.id) _clearRacketDraft(form.id);
        onClose();
      },
      { title: "未保存の変更", yesLabel: "破棄する", noLabel: "編集に戻る", yesVariant: "danger", icon: "triangle-alert" }
    );
  };

  const handleDelete = () => {
    if (!item || !item.id) return;
    confirm.ask(
      `「${item.name || "(無名)"}」を削除します。よろしいですか?`,
      () => {
        _clearRacketDraft(item.id);
        onDelete(item.id);
      },
      { title: "ラケット削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
    );
  };

  // 「次の確認」1 行は候補 / 検討中 のラケットのみ表示
  const showNextCheck = form.status === "candidate" || form.status === "considering";

  return (
    <Modal open={open} onClose={handleClose} title={isNew ? "ラケット 追加" : "ラケット 編集"}>
      {restored && (
        <div style={{
          background: C.warningLight,
          border: `1px solid ${C.warning}`,
          color: C.text,
          fontSize: 12,
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <Icon name="info" size={14} color={C.warning} />
          下書きを復元しました
        </div>
      )}
      <Input
        label="ラケット名"
        value={form.name}
        onChange={update("name")}
        placeholder="例: HEAD Boom Pro 2026"
        required
        error={error}
      />
      <Select
        label="ステータス"
        value={form.status || "candidate"}
        onChange={update("status")}
        options={_RACKET_STATUS_OPTIONS}
      />
      <Input
        label="役割"
        value={form.role}
        onChange={update("role")}
        placeholder="例: 次期エース候補 / フォーム習得用"
      />
      {showNextCheck && (
        <Input
          label="次の確認 (1 行)"
          value={form.nextCheck}
          onChange={update("nextCheck")}
          placeholder="例: 5/12 大会で実戦投入確認"
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
        <Input label="フェイス" value={form.face} onChange={update("face")} placeholder="例: 100in²" />
        <Input label="ビーム" value={form.beam} onChange={update("beam")} placeholder="例: 26mm" />
        <Input label="フレーム重量" value={form.weight} onChange={update("weight")} placeholder="例: 307g" />
        <Input label="フレームバランス" value={form.balance} onChange={update("balance")} placeholder="例: 310mm" />
        <Input label="現在のストリング" value={form.currentString} onChange={update("currentString")} placeholder="例: Blast 1.25 / PTP 1.25" />
        <Input label="現在のテンション" value={form.currentTension} onChange={update("currentTension")} placeholder="例: 43p" />
      </div>
      <Textarea label="メモ" value={form.note} onChange={update("note")} placeholder="フレーム特性、試打履歴など..." rows={3} />
      <div style={{ marginTop: 14, marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.04 }}>
        判断メモ
      </div>
      <Textarea label="継続理由" value={form.decisionKeep} onChange={update("decisionKeep")} placeholder="このラケットを使い続ける理由..." rows={2} />
      <Textarea label="不安点" value={form.decisionWorry} onChange={update("decisionWorry")} placeholder="気になる構造的弱点 / 移行検討理由..." rows={2} />
      <Textarea label="次回確認" value={form.decisionNext} onChange={update("decisionNext")} placeholder="次の練習・大会で確認することは..." rows={2} />
      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
        {!isNew && (
          <Button variant="danger" onClick={handleDelete}>
            <Icon name="trash" size={14} /> 削除
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="ghost" onClick={handleClose}>キャンセル</Button>
        <Button variant="primary" onClick={handleSave}>保存</Button>
      </div>
    </Modal>
  );
}
