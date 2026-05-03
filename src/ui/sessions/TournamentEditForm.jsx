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

function TournamentEditForm({ form, errors = {}, onChange, confirm, toast, racketNames = [], stringNames = [], venueNames = [], opponentNames = [], levelNames = [], trials = [], tournaments = [], practices = [] }) {
  const set = (k, v) => onChange({ ...form, [k]: v });
  const matches = Array.isArray(form.matches) ? form.matches : [];
  const wins = matches.filter(m => m.result === "勝利").length;
  const losses = matches.filter(m => m.result === "敗北" || m.result === "棄権").length;

  // S16.11 UX5: 履歴セット picker 用に直近 setup を計算
  const recentSetups = useMemo(
    () => _computeRecentSetups(tournaments, practices, trials),
    [tournaments, practices, trials]
  );
  const applySetup = (s) => {
    if (!s) return;
    onChange({
      ...form,
      racketName:   s.racketName   || "",
      stringMain:   s.stringMain   || "",
      stringCross:  s.stringCross  || "",
      tensionMain:  s.tensionMain  || "",
      tensionCross: s.tensionCross || "",
    });
  };

  // Match Modal state (新規 / 編集)
  const [matchModalState, setMatchModalState] = useState(null); // { match, isNew }

  // S16.11 UX5: 試合追加時のデフォルト機材を「直前の試合」優先 (大会レベル form フォールバック)
  const handleAddMatch = () => {
    const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;
    setMatchModalState({ match: blankMatch(matches.length, lastMatch || form), isNew: true });
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
    // S13: 削除対象の match に linkedMatchId で紐付く試打件数をプレビュー (実 cascade は保存時、app.jsx handleSave)
    const cascade = computeCascade({ type: "match", item: { id }, trials });
    const desc = describeCascadeMessage("match", cascade.count);
    const messageNode = (
      <span style={{ display: "inline-block" }}>
        {desc.body}
        {desc.note && (<><br/><span style={{ fontSize: 12, color: C.textMuted }}>{desc.note}</span></>)}
        <br/><span style={{ fontSize: 12, color: C.textMuted }}>{desc.warn}</span>
      </span>
    );
    confirm.ask(
      messageNode,
      () => onChange({ ...form, matches: matches.filter(m => m.id !== id) }),
      { title: desc.title, yesLabel: "削除する", yesVariant: "danger", icon: "trash-2" }
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
          <MasterField label="クラス" value={form.level || ""} onChange={(v) => set("level", v)} masterValues={levelNames} placeholder="-- クラスを選択 --" />
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
        {/* S16.11 UX5: 履歴セット picker (5 フィールド一括入力) */}
        <_SetupPickerButton recent={recentSetups} current={form} onApply={applySetup} />
      </div>

      {/* ④ 試合形式 (リク 30-e S18: 大会のデフォルト試合形式)
          1set / 3set / 6game / 4game の 4 プリセット + 3set 時の 1-1 10pt TB トグル */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="4" label="試合形式" />
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
          各試合のセット数や勝敗条件のデフォルト。試合ごとに上書きも可。
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {[
            { v: "1set",  l: "1セット" },
            { v: "3set",  l: "3セット" },
            { v: "6game", l: "6ゲーム先取" },
            { v: "4game", l: "4ゲーム先取" },
          ].map(opt => {
            const cur = form.matchFormat?.preset || "3set";
            const active = cur === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => {
                  const finalSetMode = form.matchFormat?.finalSetMode || "normal";
                  set("matchFormat", formatFromPreset(opt.v, finalSetMode, form.matchFormat?.noAd || false));
                }}
                style={{
                  flex: "1 1 auto", minHeight: 40, padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${active ? C.primary : C.border}`,
                  background: active ? C.primary : C.panel,
                  color: active ? "#fff" : C.text,
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: font,
                }}
              >
                {opt.l}
              </button>
            );
          })}
        </div>
        {/* 3set 選択時のみ: 1-1 で 10pt TB トグル */}
        {(form.matchFormat?.preset || "3set") === "3set" && (
          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px",
            background: C.primaryLight, border: `1px solid ${C.primary}`,
            borderRadius: 8, cursor: "pointer", marginBottom: 8,
          }}>
            <input
              type="checkbox"
              checked={form.matchFormat?.finalSetMode === "matchTiebreak10"}
              onChange={(e) => {
                const next = formatFromPreset("3set", e.target.checked ? "matchTiebreak10" : "normal", form.matchFormat?.noAd || false);
                set("matchFormat", next);
              }}
              style={{ width: 18, height: 18, accentColor: C.primary, margin: 0 }}
            />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
              最終セット (1-1) は 10 ポイントマッチタイブレークで決着
            </span>
          </label>
        )}
        <div style={{
          fontSize: 11, color: C.textSecondary, lineHeight: 1.6,
          background: C.bg, border: `1px solid ${C.divider}`,
          borderRadius: 6, padding: "6px 10px",
        }}>
          <strong style={{ color: C.text, marginRight: 4 }}>{formatLabel(form.matchFormat || DEFAULT_MATCH_FORMAT)}:</strong>
          {formatRuleSummary(form.matchFormat || DEFAULT_MATCH_FORMAT)}
        </div>
      </div>

      {/* ⑤ 試合記録 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="5" label={`試合記録${matches.length > 0 ? ` (${wins}勝${losses}敗 ・ ${matches.length}試合)` : ""}`} />
        {matches.length === 0 ? (
          <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px dashed ${C.border}`, fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 8 }}>
            「+ 試合を追加」から各試合を記録できます
          </div>
        ) : matches.map((m, i) => (
          // H-19 (Phase A 監査、preview_h19_p2.html 案 C 承認済):
          //   - 編集/削除ボタンを 24×24 → 44×44 (iOS HIG 準拠、削除誤押下リスク低減)
          //   - 行内 gap を 8 → 4 に詰めて対戦相手の表示幅 (~100px) を確保
          //   - 行高 64px / 対戦相手 minWidth: 0 で flexbox truncation を保証
          <div key={m.id || i} style={{
            background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 6,
            display: "flex", alignItems: "center", gap: 4, minHeight: 44,
          }}>
            <span style={{ fontSize: 11, color: C.textSecondary, minWidth: 42, fontWeight: 600, flexShrink: 0 }}>{m.round || "—"}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.opponent || "(対戦相手未入力)"}
              {m.opponent2 && <span style={{ color: C.textSecondary, fontWeight: 400 }}> / {m.opponent2}</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: m.result === "勝利" ? "#0a5b35" : m.result === "敗北" ? "#a31511" : C.textMuted }}>
              {m.result === "勝利" ? "○" : m.result === "敗北" ? "×" : m.result === "棄権" ? "棄" : "—"}
            </span>
            <span style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {Array.isArray(m.setScores) ? m.setScores.join(", ") : ""}
            </span>
            <button
              type="button"
              onClick={() => handleEditMatch(m)}
              aria-label="試合を編集"
              style={{
                background: "none", border: "none", color: C.primary, cursor: "pointer",
                width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, flexShrink: 0,
              }}
            >
              <Icon name="pencil" size={16} color={C.primary} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteMatch(m.id)}
              aria-label="試合を削除"
              style={{
                background: "none", border: "none", color: C.error, cursor: "pointer",
                width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, flexShrink: 0,
              }}
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
        <_sectionHead num="6" label="メモ" />
        <Textarea label="大会総括" value={form.generalNote || ""} onChange={(v) => set("generalNote", v)} placeholder="その日の大会を通じての気づき..." />
      </div>

      {/* ⑥ 公開設定 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_sectionHead num="7" label="公開設定" />
        <_visibilityToggle value={form.visibility} onChange={(v) => set("visibility", v)} />
      </div>

      {/* Match Modal */}
      <MatchEditModal
        open={!!matchModalState}
        match={matchModalState?.match}
        trnType={form.type}
        tournament={form}
        racketNames={racketNames}
        stringNames={stringNames}
        opponentNames={opponentNames}
        recentSetups={recentSetups}
        confirm={confirm}
        onSave={handleSaveMatch}
        onClose={() => setMatchModalState(null)}
      />
    </>
  );
}
