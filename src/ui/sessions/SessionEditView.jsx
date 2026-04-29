// SessionEditView — 全画面編集モード (大会/練習/試打)
//
// 役割:
//   - SessionDetailView と同じ overlay 内で表示 (再 mount せず、Detail ↔ Edit toggle)
//   - Header: 戻る (未保存時は ConfirmDialog) / タイトル / 保存ボタン (必須未入力で disabled)
//   - Body: type に応じて TournamentEditForm / PracticeEditForm / TrialEditForm
//   - 必須バリデーション: SCHEMA REQUIRED_FIELDS 駆動 (validation.js)
//   - S15.5.9: localStorage 下書き auto-save (Safari 破棄 / 戻る誤操作からの救済)
//
// props:
//   type: "tournament" | "practice" | "trial"
//   session: 編集対象 (=initial form)
//   practices, tournaments: 試打の linkedXxx 候補生成用
//   trials: 大会編集 match 削除時の cascade 件数プレビュー用 (S13)
//   onCancel(): 編集破棄して Detail に戻る (= 親が detail mode に戻す)
//   onSave(updated): 保存ボタン (親が Firestore + state 更新)
//   confirm: useConfirm() ({ ask })
//   toast: useToast() ({ show })

// S15.5.9: 編集中の form を localStorage に下書き保存。type と id でユニーク。
const _sessionDraftKey = (type, id) => `${LS_PREFIX}session-draft-${type}-${id}-v1`;
const _loadSessionDraft = (type, id) => {
  if (!type || !id) return null;
  try {
    const v = localStorage.getItem(_sessionDraftKey(type, id));
    if (!v) return null;
    return JSON.parse(v);
  } catch (_) { return null; }
};
const _saveSessionDraft = (type, id, form) => {
  if (!type || !id) return;
  try { localStorage.setItem(_sessionDraftKey(type, id), JSON.stringify(form)); }
  catch (_) {}
};
const _clearSessionDraft = (type, id) => {
  if (!type || !id) return;
  try { localStorage.removeItem(_sessionDraftKey(type, id)); } catch (_) {}
};

function SessionEditView({ type, session, practices, tournaments, trials, racketNames, stringNames, venueNames, opponentNames, levelNames, onCancel, onSave, confirm, toast }) {
  // S15.5.9: 起動時に下書きがあれば優先 (Safari 破棄 / 戻る誤操作からの復元)
  const [form, setForm] = useState(() => {
    if (!session?.id) return { ...session };
    const draft = _loadSessionDraft(type, session.id);
    return draft || { ...session };
  });
  const [dirty, setDirty] = useState(() => session?.id ? _loadSessionDraft(type, session.id) !== null : false);
  const [restored, setRestored] = useState(() => session?.id ? _loadSessionDraft(type, session.id) !== null : false);

  // session id 変化時 (別セッションの編集に切替) は state リセット (下書き優先)
  useEffect(() => {
    if (!session?.id) return;
    const draft = _loadSessionDraft(type, session.id);
    if (draft) {
      setForm(draft);
      setDirty(true);
      setRestored(true);
    } else {
      setForm({ ...session });
      setDirty(false);
      setRestored(false);
    }
  }, [session?.id, type]);

  // S15.5.9: form 変化のたびに auto-save (dirty な間のみ)
  useEffect(() => {
    if (!form?.id || !dirty) return;
    _saveSessionDraft(type, form.id, form);
  }, [type, form, dirty]);

  const handleChange = (newForm) => {
    setForm(newForm);
    setDirty(true);
  };

  const errors = getRequiredErrors(type, form);
  const valid = Object.keys(errors).length === 0;

  // 戻るタップ: 未保存変更があれば確認 (S15.5.9: 確定で下書きクリア)
  const handleBack = () => {
    const clearDraft = () => { if (form?.id) _clearSessionDraft(type, form.id); };
    if (!dirty) { clearDraft(); onCancel && onCancel(); return; }
    confirm.ask(
      "編集内容が保存されていません。破棄してよろしいですか？",
      () => { clearDraft(); onCancel && onCancel(); },
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
    // S15.5.9: 保存確定で下書きクリア
    if (form?.id) _clearSessionDraft(type, form.id);
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

      {/* S15.5.9: 下書き復元バナー (Safari 破棄 / 戻る誤操作後の再開時) */}
      {restored && (
        <div style={{
          background: C.warningLight, color: "#7e5d00",
          borderBottom: `1px solid ${C.warning}`,
          padding: "10px 14px",
          fontSize: 12, lineHeight: 1.5,
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <Icon name="info" size={14} color="#7e5d00" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <b>下書きを復元しました</b><br />
            前回の編集が保存されずに中断された内容です。続けるか、不要なら「戻る → 破棄する」で破棄してください。
          </div>
          <button
            onClick={() => setRestored(false)}
            aria-label="この通知を閉じる"
            style={{
              background: "none", border: "none", color: "#7e5d00",
              cursor: "pointer", padding: 2, flexShrink: 0,
            }}
          >
            <Icon name="x" size={14} color="#7e5d00" />
          </button>
        </div>
      )}

      {/* Body (scrollable) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 80px" }}>
        {type === "tournament" && (
          <TournamentEditForm
            form={form} errors={errors} onChange={handleChange}
            racketNames={racketNames} stringNames={stringNames} venueNames={venueNames} opponentNames={opponentNames} levelNames={levelNames}
            trials={trials}
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

      {/* 下部アクションバー (スマホで親指届く位置に保存・戻るを配置) */}
      <div style={{
        flex: "0 0 64px", height: 64,
        display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
        background: C.panel, borderTop: `1px solid ${C.divider}`,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
      }}>
        <button
          onClick={handleBack}
          aria-label="戻る (編集を破棄)"
          style={{
            flex: "0 0 96px", minHeight: 44, padding: "0 14px",
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          <Icon name="arrow-left" size={16} />
          戻る
        </button>
        <button
          onClick={handleSaveClick}
          aria-label="保存"
          disabled={!valid}
          title={valid ? "保存" : "必須項目が未入力です"}
          style={{
            flex: 1, minHeight: 44, padding: "0 14px",
            background: valid ? C.primary : C.panel2,
            border: `1px solid ${valid ? C.primary : C.border}`, borderRadius: 8,
            color: valid ? "#fff" : C.textMuted,
            fontSize: 15, fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed", fontFamily: font,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Icon name="save" size={18} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>
    </div>
  );
}
