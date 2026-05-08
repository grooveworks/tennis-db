// SetupPickerButton — stringSetups (セッティング組合せ master) から 1 タップで縦糸/横糸を流し込む共通ボタン
// S17 Phase 2 #4: stringSetups 活用経路 (CRUD UI を作っただけでは使われない、活用が必要)
//
// 配置先: TrialEditForm / TournamentEditForm / PracticeEditForm の機材セクション
//
// props:
//   stringSetups: [{id, label, stringMain, stringCross, status, order}]
//   onApply: (stringMain, stringCross) => void  選択時に form の stringMain / stringCross を更新

function SetupPickerButton({ stringSetups, onApply }) {
  const [open, setOpen] = useState(false);

  // active のみ表示 (archived は除外)、order ASC
  const visible = (stringSetups || [])
    .filter(s => s && s.status !== "archived")
    .sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : 999;
      const ob = typeof b.order === "number" ? b.order : 999;
      return oa - ob;
    });

  if (!stringSetups || stringSetups.length === 0) return null;  // setups 未登録時は非表示

  const handlePick = (setup) => {
    onApply && onApply(setup.stringMain || "", setup.stringCross || "");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          minHeight: 36,
          padding: "6px 12px",
          background: C.primaryLight,
          border: `1px solid ${C.primary}`,
          borderRadius: 8,
          color: C.primary,
          fontSize: 12, fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontFamily: font,
          marginBottom: 10,
        }}
      >
        <Icon name="stack" size={14} color={C.primary} />
        セッティングから選ぶ ({visible.length})
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.panel, borderRadius: "20px 20px 0 0",
              width: "100%", maxWidth: 600, maxHeight: "70%", overflow: "auto",
              padding: 16, paddingBottom: 32, fontFamily: font,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                セッティング組合せから選ぶ
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                style={{
                  width: 32, height: 32, padding: 0, background: "transparent", border: "none",
                  color: C.textMuted, cursor: "pointer", borderRadius: 6,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            {visible.length === 0 ? (
              <div style={{ textAlign: "center", color: C.textMuted, padding: "24px 0", fontSize: 13 }}>
                使用中のセッティング組合せがありません<br/>
                (機材タブ → マスタ管理 → セッティング組合せ で追加)
              </div>
            ) : (
              visible.map(s => {
                const stringInfo = [s.stringMain, s.stringCross].filter(Boolean).join(" × ") || "(糸 未指定)";
                return (
                  <button
                    key={s.id}
                    onClick={() => handlePick(s)}
                    style={{
                      width: "100%", background: C.panel, border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "10px 14px", marginBottom: 6,
                      cursor: "pointer", fontFamily: font, textAlign: "left",
                      display: "block", color: C.text,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: C.textSecondary }}>
                      {stringInfo}{s.note ? ` · ${s.note}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
