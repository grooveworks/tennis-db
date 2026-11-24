// MeasurementEditModal — 既存 racket.measurements[] へ個体ごとの実測履歴を保存する。
// 未入力の過去項目は空欄のまま保持し、測定日時・状態を後から推測して埋めない。
function MeasurementEditModal({ open, item, racketName, onSave, onClose, onDelete, confirm }) {
  const isNew = !item || !item.id;
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const change = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));
  useEffect(() => {
    if (!open) return;
    const d = new Date();
    const today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    setForm({
      measuredAt: isNew ? today : (item?.measuredAt || ""),
      state: item?.state || "",
      weight: item?.weight || "",
      balance: item?.balance || "",
      swingWeight: item?.swingWeight || "",
      twistWeight: item?.twistWeight || "",
      gripW: item?.gripW || "",
      gripT: item?.gripT || "",
      gripSetup: item?.gripSetup || "",
      stringState: item?.stringState || "",
      lead3: item?.lead3 || "",
      lead9: item?.lead9 || "",
      fixture: item?.fixture || "",
      current: !!item?.current,
      note: item?.note || "",
    });
    setError("");
  }, [open, item]);

  const handleSave = () => {
    const txt = (v) => String(v == null ? "" : v).trim();
    if (form.measuredAt && !/^\d{4}-\d{2}-\d{2}$/.test(txt(form.measuredAt))) {
      setError("測定日は YYYY-MM-DD 形式で入力してください");
      return;
    }
    for (const key of ["swingWeight", "twistWeight", "lead3", "lead9"]) {
      const value = txt(form[key]);
      if (value && !/^\d+(?:\.\d+)?$/.test(value)) {
        setError("SW・TW・加重は数字だけで入力してください（単位は不要）");
        return;
      }
    }
    if (isNew && !["state","weight","balance","swingWeight","twistWeight","gripW","gripT","gripSetup","stringState","lead3","lead9","fixture","note"].some(k => txt(form[k]))) {
      setError("測定値または状態を入力してください");
      return;
    }
    const next = { ...(item || {}), id: item?.id || genId(), current: !!form.current };
    for (const key of ["measuredAt","state","weight","balance","swingWeight","twistWeight","gripW","gripT","gripSetup","stringState","lead3","lead9","fixture","note"]) {
      next[key] = txt(form[key]);
    }
    onSave(next, isNew);
  };
  const handleDelete = () => {
    if (!item?.id) return;
    confirm.ask("この実測値を削除します。よろしいですか?", () => onDelete(item.id),
      { title: "実測値削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" });
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "実測値 追加" : "実測値 編集"}>
      {racketName && <div style={{fontSize:12,color:C.textSecondary,marginBottom:12,textAlign:"center"}}>{racketName}</div>}
      <Input label="測定日（YYYY-MM-DD）" value={form.measuredAt || ""} onChange={change("measuredAt")} placeholder="2026-11-24" />
      <Input label="状態" value={form.state || ""} onChange={change("state")} placeholder="例：新品未加工・未張り" />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
        <Input label="重量 (g)" value={form.weight || ""} onChange={change("weight")} placeholder="例：305.5" />
        <Input label="バランス (mm)" value={form.balance || ""} onChange={change("balance")} placeholder="例：315" />
        <Input label="スイングウェイト SW" value={form.swingWeight || ""} onChange={change("swingWeight")} placeholder="例：318.4" />
        <Input label="ツイストウェイト TW" value={form.twistWeight || ""} onChange={change("twistWeight")} placeholder="例：13.2" />
        <Input label="グリップ幅 (mm)" value={form.gripW || ""} onChange={change("gripW")} placeholder="例：33.5" />
        <Input label="グリップ厚 (mm)" value={form.gripT || ""} onChange={change("gripT")} placeholder="例：29.7" />
        <Input label="3時加重 (g)" value={form.lead3 || ""} onChange={change("lead3")} placeholder="例：1" />
        <Input label="9時加重 (g)" value={form.lead9 || ""} onChange={change("lead9")} placeholder="例：1" />
      </div>
      <Input label="グリップ構成" value={form.gripSetup || ""} onChange={change("gripSetup")} placeholder="例：純正グリップ・OGなし" />
      <Input label="ストリング状態" value={form.stringState || ""} onChange={change("stringState")} placeholder="例：未張り / ALU 46/43 PSなし" />
      <Input label="SW/TW測定時の固定条件" value={form.fixture || ""} onChange={change("fixture")} placeholder="例：固定強・OGあり" />
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.panel2,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <div style={{fontSize:13,color:C.text}}>現行ゲームレディ
          <div style={{fontSize:11,color:C.textSecondary}}>この個体の現行実測値として扱う（1件のみ）</div>
        </div>
        <button type="button" onClick={() => change("current")(!form.current)} aria-pressed={!!form.current} aria-label="現行ゲームレディ切替"
          style={{background:form.current?C.success:C.appleGray4,border:"none",borderRadius:12,width:44,height:24,cursor:"pointer",flexShrink:0}}>
          <span style={{display:"block",width:20,height:20,marginLeft:form.current?22:2,background:"#fff",borderRadius:"50%",transition:"margin-left 150ms"}} />
        </button>
      </div>
      <Textarea label="メモ" value={form.note || ""} onChange={change("note")} placeholder="施工方法・測定時の状況・感触" rows={2} />
      {error && <div role="alert" style={{color:"#b3261e",fontSize:13,marginBottom:8}}>{error}</div>}
      <div style={{display:"flex",gap:8,marginTop:16}}>
        {!isNew && <Button variant="danger" onClick={handleDelete}><Icon name="trash" size={14} /> 削除</Button>}
        <div style={{flex:1}} />
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={handleSave}>保存</Button>
      </div>
    </Modal>
  );
}
