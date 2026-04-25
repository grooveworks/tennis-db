// SessionEditView — 全画面編集モード (大会/練習/試打)
//
// 役割:
//   - SessionDetailView と同じ overlay 内で表示 (再 mount せず、Detail ↔ Edit toggle)
//   - Header: 戻る (未保存時は ConfirmDialog) / タイトル / 保存ボタン (必須未入力で disabled)
//   - Body: type に応じて TournamentEditForm / PracticeEditForm / TrialEditForm
//   - 必須バリデーション: SCHEMA REQUIRED_FIELDS 駆動 (validation.js)
//
// props:
//   type: "tournament" | "practice" | "trial"
//   session: 編集対象 (=initial form)
//   practices, tournaments: 試打の linkedXxx 候補生成用
//   onCancel(): 編集破棄して Detail に戻る (= 親が detail mode に戻す)
//   onSave(updated): 保存ボタン (親が Firestore + state 更新)
//   confirm: useConfirm() ({ ask })
//   toast: useToast() ({ show })

function SessionEditView({ type, session, practices, tournaments, racketNames, stringNames, venueNames, opponentNames, onCancel, onSave, confirm, toast }) {
  const [form, setForm] = useState(() => ({ ...session }));
  const [dirty, setDirty] = useState(false);

  // session id 変化時 (別セッションの編集に切替) は state リセット
  useEffect(() => {
    setForm({ ...session });
    setDirty(false);
  }, [session?.id]);

  const handleChange = (newForm) => {
    setForm(newForm);
    setDirty(true);
  };

  const errors = getRequiredErrors(type, form);
  const valid = Object.keys(errors).length === 0;

  // 戻るタップ: 未保存変更があれば確認
  const handleBack = () => {
    if (!dirty) { onCancel && onCancel(); return; }
    confirm.ask(
      "編集内容が保存されていません。破棄してよろしいですか？",
      () => onCancel && onCancel(),
      { title: "未保存の変更があります", yesLabel: "破棄する", noLabel: "編集に戻る", yesVariant: "danger", icon: "triangle-alert" }
    );
  };

  // Esc で戻る (CLAUDE.md §N1a.4)
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleBack(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dirty, form]);

  const handleSaveClick = () => {
    if (!valid) {
      toast.show("必須項目が未入力です", "warning");
      return;
    }
    onSave && onSave(form);
  };

  const screenTitle = type === "tournament" ? "大会を編集" : type === "practice" ? "練習を編集" : "試打を編集";
  const stripColor = type === "tournament" ? C.tournamentAccent : type === "practice" ? C.practiceAccent : C.trialAccent;

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, display: "flex", flexDirection: "column", zIndex: 1 }}>
      {/* 左端 3px 色帯 (Detail と同じ) */}
      <div style={{ position: "absolute", left: 0, top: 56, bottom: 0, width: 3, background: stripColor, zIndex: 2, pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ height: 56, flex: "0 0 56px", display: "flex", alignItems: "center", gap: 8, padding: "0 8px", background: C.panel, borderBottom: `1px solid ${C.divider}` }}>
        <button
          onClick={handleBack}
          aria-label="戻る (編集を破棄)"
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, color: C.text }}
        >
          <Icon name="arrow-left" size={24} ariaLabel="戻る" />
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.text }}>
          {screenTitle}
          {form.date && <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400, marginLeft: 8 }}>{fmtDate(form.date)}</span>}
        </div>
        <button
          onClick={handleSaveClick}
          aria-label="保存"
          disabled={!valid}
          title={valid ? "保存" : "必須項目が未入力です"}
          style={{
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", borderRadius: 8,
            color: valid ? C.primary : C.textMuted,
            cursor: valid ? "pointer" : "not-allowed",
          }}
        >
          <Icon name="save" size={24} color={valid ? C.primary : C.textMuted} />
        </button>
      </div>

      {/* Body (scrollable) */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {type === "tournament" && (
          <TournamentEditForm
            form={form} errors={errors} onChange={handleChange}
            racketNames={racketNames} stringNames={stringNames} venueNames={venueNames} opponentNames={opponentNames}
            confirm={confirm} toast={toast}
          />
        )}
        {type === "practice" && (
          <PracticeEditForm
            form={form} errors={errors} onChange={handleChange}
            racketNames={racketNames} stringNames={stringNames} venueNames={venueNames}
          />
        )}
        {type === "trial" && (
          <TrialEditForm
            form={form} errors={errors} onChange={handleChange}
            practices={practices} tournaments={tournaments}
            racketNames={racketNames} stringNames={stringNames} venueNames={venueNames}
          />
        )}
      </div>
    </div>
  );
}
