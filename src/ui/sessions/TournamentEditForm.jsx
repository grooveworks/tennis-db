// TournamentEditForm — 大会編集フォーム
// 統一フォーマット (preview_s11 §1):
//   ① 基本情報: 日付* / 大会名* / 形式 / クラス / 結果 / 開始-終了時刻
//   ② 会場 / 気象: 会場 / 気温 / 天気 (3 列)
//   ③ 機材: ラケット / テンション / 縦糸 / 横糸 (2x2)
//   ④ 試合記録: matches[] リスト + 追加ボタン → MatchEditModal
//   ⑤ メモ: 大会総括
//   ⑥ 公開設定: visibility (public/private)
//
// props:
//   form: 編集中の tournament (state は親 SessionEditView が持つ)
//   errors: バリデーションエラー (validation.js の getRequiredErrors 結果)
//   onChange(form): form 全体を返す
//   confirm: useConfirm() ({ ask })
//   toast: useToast() ({ show })

const _TYPE_OPTS    = [{ value: "singles", label: "シングルス" }, { value: "doubles", label: "ダブルス" }, { value: "mixed", label: "ミックス" }];
const _RESULT_OPTS  = [
  { value: "",         label: "— 未定 —" },
  { value: "優勝",     label: "優勝" },
  { value: "準優勝",   label: "準優勝" },
  { value: "3位",      label: "3位" },
  { value: "ベスト8",  label: "ベスト8" },
  { value: "ベスト16", label: "ベスト16" },
  { value: "予選突破", label: "予選突破" },
  { value: "敗退",     label: "敗退" },
  { value: "予選敗退", label: "予選敗退" },
];
const _WEATHER_OPTS = [{ value: "", label: "—" }, { value: "晴", label: "晴" }, { value: "曇", label: "曇" }, { value: "雨", label: "雨" }, { value: "屋内", label: "屋内" }];

// ── 番号付きセクション見出し
function _sectionHead({ num, label }) {
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

// ── 公開トグル (v3 VisibilityToggle 移植 + v4 デザイン)
function _visibilityToggle({ value, onChange }) {
  const cur = value || "public";
  const opts = [
    { v: "public",  label: "🌐 公開",   note: "プライマリ Cal" },
    { v: "private", label: "🔒 非公開", note: "仕事関係 Cal" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {opts.map(o => {
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

function TournamentEditForm({ form, errors = {}, onChange, confirm, toast, racketNames = [], stringNames = [], venueNames = [], opponentNames = [] }) {
  const set = (k, v) => onChange({ ...form, [k]: v });
  const matches = Array.isArray(form.matches) ? form.matches : [];
  const wins = matches.filter(m => m.result === "勝利").length;
  const losses = matches.filter(m => m.result === "敗北" || m.result === "棄権").length;

  // Match Modal state (新規 / 編集)
  const [matchModalState, setMatchModalState] = useState(null); // { match, isNew }

  const handleAddMatch = () => {
    setMatchModalState({ match: blankMatch(matches.length, form), isNew: true });
  };
  const handleEditMatch = (m) => {
    setMatchModalState({ match: m, isNew: false });
  };
  const handleSaveMatch = (newMatch) => {
    const exists = matches.find(m => m.id === newMatch.id);
    const newMatches = exists
      ? matches.map(m => m.id === newMatch.id ? newMatch : m)
      : [...matches, newMatch];
    onChange({ ...form, matches: newMatches });
    setMatchModalState(null);
  };
  const handleDeleteMatch = (id) => {
    confirm.ask(
      "この試合記録を削除しますか？",
      () => onChange({ ...form, matches: matches.filter(m => m.id !== id) }),
      { title: "試合記録を削除", yesLabel: "削除する", yesVariant: "danger", icon: "trash-2" }
    );
  };

  return (
    <>
      {/* ① 基本情報 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="1" label="基本情報" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="date" label="日付" required value={form.date || ""} onChange={(v) => set("date", v)} error={errors.date} />
          <Input label="大会名" required value={form.name || ""} onChange={(v) => set("name", v)} placeholder="例: 所沢ベテラン大会" error={errors.name} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Select label="形式" value={form.type || "singles"} onChange={(v) => set("type", v)} options={_TYPE_OPTS} />
          <Input label="クラス" value={form.level || ""} onChange={(v) => set("level", v)} placeholder="中上級" />
        </div>
        <Select label="結果" value={form.overallResult || ""} onChange={(v) => set("overallResult", v)} options={_RESULT_OPTS} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="time" label="開始時刻" value={form.startTime || ""} onChange={(v) => set("startTime", v)} />
          <Input type="time" label="終了時刻" value={form.endTime || ""} onChange={(v) => set("endTime", v)} />
        </div>
      </div>

      {/* ② 会場 / 気象 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="2" label="会場 / 気象" />
        <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="number" label="気温(℃)" value={form.temp || ""} onChange={(v) => set("temp", v)} placeholder="22" />
          <Select label="天気" value={form.weather || ""} onChange={(v) => set("weather", v)} options={_WEATHER_OPTS} />
        </div>
      </div>

      {/* ③ 機材 — ラケット 1 行 / 縦糸+横糸 / テンション縦+横 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="3" label="機材" />
        <MasterField label="ラケット" value={form.racketName || ""} onChange={(v) => set("racketName", v)} masterValues={racketNames} placeholder="-- ラケットを選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <MasterField label="縦糸" value={form.stringMain || ""} onChange={(v) => set("stringMain", v)} masterValues={stringNames} placeholder="-- 縦糸を選択 --" />
          <MasterField label="横糸" value={form.stringCross || ""} onChange={(v) => set("stringCross", v)} masterValues={stringNames} placeholder="-- 同じなら空欄 --" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input label="テンション縦" value={form.tensionMain || ""} onChange={(v) => set("tensionMain", v)} placeholder="46" />
          <Input label="テンション横" value={form.tensionCross || ""} onChange={(v) => set("tensionCross", v)} placeholder="43" />
        </div>
      </div>

      {/* ④ 試合記録 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="4" label={`試合記録${matches.length > 0 ? ` (${wins}勝${losses}敗 ・ ${matches.length}試合)` : ""}`} />
        {matches.length === 0 ? (
          <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px dashed ${C.border}`, fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 8 }}>
            「+ 試合を追加」から各試合を記録できます
          </div>
        ) : matches.map((m, i) => (
          <div key={m.id || i} style={{
            background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 6,
            display: "flex", alignItems: "center", gap: 8, minHeight: 44,
          }}>
            <span style={{ fontSize: 11, color: C.textSecondary, minWidth: 42, fontWeight: 600 }}>{m.round || "—"}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.opponent || "(対戦相手未入力)"}
              {m.opponent2 && <span style={{ color: C.textSecondary, fontWeight: 400 }}> / {m.opponent2}</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: m.result === "勝利" ? "#0a5b35" : m.result === "敗北" ? "#a31511" : C.textMuted }}>
              {m.result === "勝利" ? "○" : m.result === "敗北" ? "×" : m.result === "棄権" ? "棄" : "—"}
            </span>
            <span style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>
              {Array.isArray(m.setScores) ? m.setScores.join(", ") : ""}
            </span>
            <button
              type="button"
              onClick={() => handleEditMatch(m)}
              aria-label="試合を編集"
              style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", padding: 4, display: "flex", borderRadius: 4 }}
            >
              <Icon name="pencil" size={16} color={C.primary} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteMatch(m.id)}
              aria-label="試合を削除"
              style={{ background: "none", border: "none", color: C.error, cursor: "pointer", padding: 4, display: "flex", borderRadius: 4 }}
            >
              <Icon name="trash-2" size={16} color={C.error} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddMatch}
          style={{
            width: "100%", minHeight: 44, padding: 10,
            borderRadius: 8, border: `1px dashed ${C.primary}`, background: C.primaryLight, color: C.primary,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: font,
          }}
        >
          <Icon name="plus" size={16} color={C.primary} />試合を追加
        </button>
      </div>

      {/* ⑤ メモ */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="5" label="メモ" />
        <Textarea label="大会総括" value={form.generalNote || ""} onChange={(v) => set("generalNote", v)} placeholder="その日の大会を通じての気づき..." />
      </div>

      {/* ⑥ 公開設定 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="6" label="公開設定" />
        <_visibilityToggle value={form.visibility} onChange={(v) => set("visibility", v)} />
      </div>

      {/* Match Modal */}
      <MatchEditModal
        open={!!matchModalState}
        match={matchModalState?.match}
        trnType={form.type}
        racketNames={racketNames}
        stringNames={stringNames}
        opponentNames={opponentNames}
        confirm={confirm}
        onSave={handleSaveMatch}
        onClose={() => setMatchModalState(null)}
      />
    </>
  );
}
