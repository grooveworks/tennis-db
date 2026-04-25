// QuickAddModal — FAB から起動する最小フォーム (S12)
//
// 役割:
//   - FAB ミニメニューで「大会」「練習」が選ばれた時に表示
//   - 最小フィールド (大会 6 / 練習 7) のみ。詳細は作成後 Detail 画面 → 編集ボタンで追記
//   - SessionEditView を空起動するフルフォームより、出先 30 秒入力を優先
//   - 必須バリデーション: SCHEMA REQUIRED_FIELDS 駆動 (S11 と同じ)
//
// props:
//   open: boolean
//   type: "tournament" | "practice"
//   racketNames, stringNames, venueNames: master データ (会場 Select 用)
//   onSave(item): 「作成」ボタン → app.jsx の handleSave 経由
//   onClose: キャンセル / × / Esc / 背景タップ
//
// 罠:
//   - type 切替時は form を blankXxx() で再初期化 (前種別の値が残らないように)
//   - 練習の startTime/endTime 入力で duration 自動計算 (v3 互換)
//   - 必須未入力の form を保存しない (作成ボタンが disabled になっていれば不要だが防御)

// 番号付きセクション見出し (S11 各 form と同じパターン)
function _qaSectionHead({ num, label }) {
  return (
    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, borderRadius: "50%", background: C.primary, color: "#fff",
        fontSize: 10, fontWeight: 700,
      }}>{num}</span>
      {label}
    </div>
  );
}

// 公開トグル (S11 各 form と同じ)
function _qaVisibility({ value, onChange }) {
  const cur = value || "public";
  const opts = [
    { v: "public",  label: "🌐 公開",   note: "プライマリ Cal" },
    { v: "private", label: "🔒 非公開", note: "仕事関係 Cal" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {opts.map((o) => {
        const on = cur === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              flex: 1, minHeight: 44, padding: "8px 12px",
              borderRadius: 8, border: `1px solid ${on ? C.primary : C.border}`,
              background: on ? C.primaryLight : C.panel,
              color: on ? C.primary : C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              fontFamily: font,
            }}
          >
            <div>{o.label}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>{o.note}</div>
          </button>
        );
      })}
    </div>
  );
}

const _QA_TOUR_TYPE_OPTS = [
  { value: "singles", label: "シングルス" },
  { value: "doubles", label: "ダブルス" },
  { value: "mixed",   label: "ミックス" },
];
const _QA_PRAC_TYPE_OPTS = [
  { value: "スクール",   label: "スクール" },
  { value: "自主練",     label: "自主練" },
  { value: "練習会",     label: "練習会" },
  { value: "ゲーム練習", label: "ゲーム練習" },
  { value: "球出し",     label: "球出し" },
  { value: "練習試合",   label: "練習試合" },
  { value: "フィジカル", label: "フィジカル" },
];

function QuickAddModal({ open, type, racketNames = [], stringNames = [], venueNames = [], levelNames = [], onSave, onClose }) {
  const [form, setForm] = useState(null);

  // open / type 切替時に blank で再初期化 (前種別の値が残らないように)
  useEffect(() => {
    if (!open || !type) return;
    if (type === "tournament") setForm(blankTournament());
    else if (type === "practice") setForm(blankPractice());
    else setForm(null);
  }, [open, type]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !form || !type) return null;

  // setter (練習の時刻入力で duration 自動計算 - v3:2471-2481 移植)
  const set = (k, v) => {
    setForm((p) => {
      const n = { ...p, [k]: v };
      if (type === "practice" && (k === "startTime" || k === "endTime") && n.startTime && n.endTime) {
        const sParts = n.startTime.split(":").map(Number);
        const eParts = n.endTime.split(":").map(Number);
        if (!isNaN(sParts[0]) && !isNaN(eParts[0])) {
          const mins = (eParts[0] * 60 + (eParts[1] || 0)) - (sParts[0] * 60 + (sParts[1] || 0));
          if (mins > 0) n.duration = String(mins);
        }
      }
      return n;
    });
  };

  // バリデーション (SCHEMA 駆動)
  const errors = getRequiredErrors(type, form);
  const valid = Object.keys(errors).length === 0;

  const handleSaveClick = () => {
    if (!valid) return;
    onSave && onSave(form);
  };

  const titleText  = type === "tournament" ? "大会を追加" : "練習を追加";
  const titleColor = type === "tournament" ? "#a04f00" : "#0a5b35";
  const titleIcon  = type === "tournament" ? "trophy"   : "person-standing";
  const hint = type === "tournament"
    ? "まず作成 → 結果 / 機材 / 試合記録は後から編集ボタンで追記。30 秒で記録できます。"
    : "機材 / 体調 / メモは後から編集で追記。練習時間は時刻から自動計算。";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "20px 12px", overflowY: "auto",
      }}
    >
      <div style={{
        background: C.panel, borderRadius: 16, padding: 18,
        maxWidth: 420, width: "100%",
      }}>
        {/* ヘッダ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: titleColor, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={titleIcon} size={16} color={titleColor} />
            {titleText}
          </span>
          <button onClick={onClose} aria-label="閉じる" style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4, display: "flex" }}>
            <Icon name="x" size={18} color={C.textSecondary} />
          </button>
        </div>

        {/* 大会フォーム */}
        {type === "tournament" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
              <Input type="date" label="日付" required value={form.date || ""} onChange={(v) => set("date", v)} error={errors.date} />
              <Input label="大会名" required value={form.name || ""} onChange={(v) => set("name", v)} placeholder="例: 所沢ベテラン" error={errors.name} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
              <Select label="形式" value={form.type || "singles"} onChange={(v) => set("type", v)} options={_QA_TOUR_TYPE_OPTS} />
              <MasterField label="クラス" value={form.level || ""} onChange={(v) => set("level", v)} masterValues={levelNames} placeholder="-- クラスを選択 --" />
            </div>
            <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
            <div style={{ marginTop: 4 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>公開設定</label>
              <_qaVisibility value={form.visibility} onChange={(v) => set("visibility", v)} />
            </div>
          </>
        )}

        {/* 練習フォーム */}
        {type === "practice" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
              <Input type="date" label="日付" required value={form.date || ""} onChange={(v) => set("date", v)} error={errors.date} />
              <Select label="種別" value={form.type || ""} onChange={(v) => set("type", v)} options={_QA_PRAC_TYPE_OPTS} />
            </div>
            <Input label="イベント名" value={form.title || ""} onChange={(v) => set("title", v)} placeholder="例: ナイターレッスン中上級" />
            <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
              <Input type="time" label="開始時刻" value={form.startTime || ""} onChange={(v) => set("startTime", v)} />
              <Input type="time" label="終了時刻" value={form.endTime || ""} onChange={(v) => set("endTime", v)} />
            </div>
            <div style={{ marginTop: 4 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>公開設定</label>
              <_qaVisibility value={form.visibility} onChange={(v) => set("visibility", v)} />
            </div>
          </>
        )}

        {/* ヒント */}
        <div style={{
          fontSize: 11, color: C.textSecondary, background: C.panel2,
          borderLeft: `2px solid ${C.primary}`, padding: "8px 10px",
          borderRadius: 4, marginTop: 10, marginBottom: 10, lineHeight: 1.6,
        }}>
          {hint}
        </div>

        {/* アクション */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: 44, padding: "10px 20px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.panel, color: C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
            }}
          >キャンセル</button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!valid}
            title={valid ? "作成" : "必須項目が未入力です"}
            style={{
              minHeight: 44, padding: "10px 20px", borderRadius: 8,
              border: "none",
              background: valid ? C.primary : C.border,
              color: valid ? "#fff" : C.textMuted,
              fontSize: 13, fontWeight: 700,
              cursor: valid ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 6, fontFamily: font,
            }}
          >
            <Icon name="plus" size={16} color={valid ? "#fff" : C.textMuted} />作成
          </button>
        </div>
      </div>
    </div>
  );
}
