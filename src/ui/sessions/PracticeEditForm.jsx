// PracticeEditForm — 練習編集フォーム
// 統一フォーマット (preview_s11):
//   ① 基本: 日付* / 種別 / イベント名 / 開始-終了-duration
//   ② 会場 / 気象 (3 列)
//   ③ 機材 (2x2)
//   ④ 体調・集中 (rating) + Apple Watch (表示のみ)
//   ⑤ メモ: フォーカス / コーチ / 良かった / 改善 / メモ
//   ⑥ 公開設定

const _PRAC_TYPE_OPTS = [
  { value: "",         label: "—" },
  { value: "スクール",   label: "スクール" },
  { value: "自主練",     label: "自主練" },
  { value: "練習会",     label: "練習会" },
  { value: "ゲーム練習", label: "ゲーム練習" },
  { value: "球出し",     label: "球出し" },
  { value: "練習試合",   label: "練習試合" },
  { value: "フィジカル", label: "フィジカル" },
];
const _PRAC_WEATHER = [{ value: "", label: "—" }, { value: "晴", label: "晴" }, { value: "曇", label: "曇" }, { value: "雨", label: "雨" }, { value: "屋内", label: "屋内" }];

// section head (TournamentEditForm の _sectionHead と同じ機能、命名衝突避ける)
function _peSectionHead({ num, label }) {
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

// 5 ボタン rating (体調・集中用)
function _peRatingRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, minWidth: 60 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                flex: 1, minWidth: 40, minHeight: 36, padding: "6px 0",
                borderRadius: 6, border: `1px solid ${on ? C.primary : C.border}`,
                background: on ? C.primary : C.panel,
                color: on ? "#fff" : C.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >{n}</button>
          );
        })}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

// Apple Watch 表示専用 (input なし)
function _peAppleWatchPanel({ form }) {
  const has = !!(form.heartRateAvg || form.calories || form.totalCalories || form.duration || form.hrZone1);
  if (!has) return null;
  return (
    <div style={{ background: C.warningLight, border: `1.5px solid ${C.warning}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon name="watch" size={15} color="#7e5d00" ariaLabel="Apple Watch" />
        <span style={{ fontSize: 13, color: "#7e5d00", fontWeight: 700 }}>Apple Watch</span>
        <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400 }}>(表示のみ・編集不可)</span>
      </div>
      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>
        {form.duration && <span>時間 {form.duration}分 ・ </span>}
        {form.calories && <span>Active {form.calories}kcal ・ </span>}
        {form.heartRateAvg && <span>平均 {form.heartRateAvg}bpm ・ </span>}
        {form.totalCalories && <span>合計 {form.totalCalories}kcal</span>}
        {form.timeRange && <div>計測時間 {form.timeRange}</div>}
        {form.workoutLocation && <div>位置 {form.workoutLocation}</div>}
        {form.recoveryHR && <div>回復心拍 {form.recoveryHR}</div>}
      </div>
      <div style={{ fontSize: 11, color: "#7e5d00", marginTop: 6, paddingTop: 6, borderTop: `1px dashed rgba(126,93,0,0.3)` }}>
        ※ 編集不可。スクショ → Claude → JSON → インポートで更新（S19 で実装予定）
      </div>
    </div>
  );
}

// 公開トグル (Tournament と同等、命名衝突避け _peVisibility)
function _peVisibility({ value, onChange }) {
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

function PracticeEditForm({ form, errors = {}, onChange, racketNames = [], stringNames = [], venueNames = [], opponentNames = [], tournaments = [], practices = [], trials = [], confirm }) {
  // S16.11 UX5: 履歴セット picker
  const recentSetups = useMemo(
    () => _computeRecentSetups(tournaments, practices, trials),
    [tournaments, practices, trials]
  );

  // S18 Issue 2: 練習にも matches[] を持たせる (案 3' 採用、preview_s18_p13 確定)
  //   練習試合 / ゲーム練習 など、type 不問でゲーム記録できるように
  //   matches[] が空 = メモ下に小さい + ボタン
  //   matches[] が 1 件以上 = ⑥ 試合記録 セクション展開
  const matches = Array.isArray(form.matches) ? form.matches : [];
  const wins = matches.filter(m => m.result === "勝利").length;
  const losses = matches.filter(m => m.result === "敗北" || m.result === "棄権").length;
  const [matchModalState, setMatchModalState] = useState(null);
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
    if (!confirm) {
      onChange({ ...form, matches: matches.filter(m => m.id !== id) });
      return;
    }
    confirm.ask(
      "この試合記録を削除します。よろしいですか?",
      () => onChange({ ...form, matches: matches.filter(m => m.id !== id) }),
      { title: "試合記録を削除", yesLabel: "削除する", yesVariant: "danger", icon: "trash-2" }
    );
  };
  const applySetup = (s) => {
    if (!s) return;
    onChange({
      ...form,
      racketName: s.racketName || "",
      stringMain: s.stringMain || "",
      stringCross: s.stringCross || "",
      tensionMain: s.tensionMain || "",
      tensionCross: s.tensionCross || "",
    });
  };
  // 開始/終了時刻入力時に duration を自動計算 (v3:2471-2481 移植)
  // S16.11 F2 ガード: Apple Watch 取込み済 duration を時刻編集で上書きしない
  //   - form.duration が存在し、かつ form.heartRateAvg / calories 等の Watch 由来フィールドがあれば
  //     duration は Watch 実測値として保護、時刻計算で上書きしない
  //   - Watch 由来でない (手動入力) duration の場合は従来通り計算結果で更新
  const set = (k, v) => {
    const n = { ...form, [k]: v };
    if ((k === "startTime" || k === "endTime") && n.startTime && n.endTime) {
      const sParts = n.startTime.split(":").map(Number);
      const eParts = n.endTime.split(":").map(Number);
      if (!isNaN(sParts[0]) && !isNaN(eParts[0])) {
        const mins = (eParts[0] * 60 + (eParts[1] || 0)) - (sParts[0] * 60 + (sParts[1] || 0));
        if (mins > 0) {
          const isWatchDuration = !!(form.heartRateAvg || form.calories || form.totalCalories || form.hrZone1);
          if (!isWatchDuration) {
            n.duration = String(mins);
          }
          // Watch 由来 duration は保護、上書きしない
        }
      }
    }
    onChange(n);
  };

  return (
    <>
      {/* ① 基本情報 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="1" label="基本情報" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="date" label="日付" required value={form.date || ""} onChange={(v) => set("date", v)} error={errors.date} />
          <Select label="種別" value={form.type || ""} onChange={(v) => set("type", v)} options={_PRAC_TYPE_OPTS} />
        </div>
        <Input label="イベント名" value={form.title || ""} onChange={(v) => set("title", v)} placeholder="例: ナイターレッスン中上級" />
        {/* リク 30-* (S18 Phase B) Wheel picker 復活: 時刻 + 時間(分) を立体ホイール化
            既存値の rounding/clamping は禁止 (preserved で保持)、背景タップ/ESC = キャンセル */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
          <TimeWheel label="開始" value={form.startTime || ""} onChange={(v) => set("startTime", v)} />
          <TimeWheel label="終了" value={form.endTime || ""} onChange={(v) => set("endTime", v)} />
          <NumWheel label="時間(分)" value={form.duration || ""} min={0} max={720} step={5} onChange={(v) => set("duration", v)} />
        </div>
      </div>

      {/* ② 会場 / 気象 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="2" label="会場 / 気象" />
        <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <NumWheel label="気温(℃)" value={form.temp || ""} min={-5} max={40} step={1} onChange={(v) => set("temp", v)} />
          <Select label="天気" value={form.weather || ""} onChange={(v) => set("weather", v)} options={_PRAC_WEATHER} />
        </div>
      </div>

      {/* ③ 機材 — ラケット 1 行 / 縦糸+横糸 / テンション縦+横 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="3" label="機材" />
        <MasterField label="ラケット" value={form.racketName || ""} onChange={(v) => set("racketName", v)} masterValues={racketNames} placeholder="-- ラケットを選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <MasterField label="縦糸" value={form.stringMain || ""} onChange={(v) => set("stringMain", v)} masterValues={stringNames} placeholder="-- 縦糸を選択 --" />
          <MasterField label="横糸" value={form.stringCross || ""} onChange={(v) => set("stringCross", v)} masterValues={stringNames} placeholder="-- 同じなら空欄 --" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <NumWheel label="テンション縦" value={form.tensionMain || ""} min={35} max={55} step={1} onChange={(v) => set("tensionMain", v)} />
          <NumWheel label="テンション横" value={form.tensionCross || ""} min={35} max={55} step={1} onChange={(v) => set("tensionCross", v)} />
        </div>
        {/* S16.11 UX5: 履歴セット picker */}
        <_SetupPickerButton recent={recentSetups} current={form} onApply={applySetup} />
      </div>

      {/* ④ 体調 + Apple Watch */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="4" label="体調" />
        <_peRatingRow label="体調" value={Number(form.physical) || 0} onChange={(n) => onChange({ ...form, physical: n })} />
      </div>
      <_peAppleWatchPanel form={form} />

      {/* ⑤ メモ (focus はテキスト、v2/v3 と同じ「今日のテーマ」フィールド) */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="5" label="メモ" />
        <Textarea
          label="フォーカス"
          value={typeof form.focus === "string" ? form.focus : ""}
          onChange={(v) => onChange({ ...form, focus: v })}
          placeholder="今日のテーマ / ラケットダウン / フォロースルー拡大..."
        />
        <Textarea label="コーチメモ" value={form.coachNote || ""} onChange={(v) => onChange({ ...form, coachNote: v })} placeholder="コーチから言われたこと..." />
        <Textarea label="良かった点" value={form.goodNote || ""} onChange={(v) => onChange({ ...form, goodNote: v })} placeholder="できるようになったこと..." />
        <Textarea label="改善点" value={form.improveNote || ""} onChange={(v) => onChange({ ...form, improveNote: v })} placeholder="次回意識したいこと..." />
        <Textarea label="メモ" value={form.generalNote || ""} onChange={(v) => onChange({ ...form, generalNote: v })} placeholder="その他気づき..." />
        {/* S18 Issue 2 案 3': 0 件は控えめな + ボタンのみ (普段は無視できる主張)
            1 件以上は下のフルセクション展開 */}
        {matches.length === 0 && (
          <button
            type="button"
            onClick={handleAddMatch}
            style={{
              width: "100%", minHeight: 36, padding: "8px 10px",
              borderRadius: 8, border: `1px dashed ${C.border}`,
              background: "transparent", color: C.textSecondary,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 10, fontFamily: font,
              transition: "background 150ms, color 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.primaryLight;
              e.currentTarget.style.color = C.primary;
              e.currentTarget.style.borderColor = C.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.textSecondary;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            <Icon name="plus" size={14} color={C.textSecondary} />
            試合記録を追加
          </button>
        )}
      </div>

      {/* ⑥ 試合記録 (matches[] が 1 件以上の時のみ展開、案 3' 採用、preview_s18_p13) */}
      {matches.length > 0 && (
        <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <_peSectionHead num="6" label={`試合記録 (${wins}勝${losses}敗 ・ ${matches.length}試合)`} />
          {matches.map((m, i) => (
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
              <button type="button" onClick={() => handleEditMatch(m)} aria-label="試合を編集"
                style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, flexShrink: 0 }}>
                <Icon name="pencil" size={16} color={C.primary} />
              </button>
              <button type="button" onClick={() => handleDeleteMatch(m.id)} aria-label="試合を削除"
                style={{ background: "none", border: "none", color: C.error, cursor: "pointer", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, flexShrink: 0 }}>
                <Icon name="trash-2" size={16} color={C.error} />
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddMatch}
            style={{
              width: "100%", minHeight: 44, padding: 10,
              borderRadius: 8, border: `1px dashed ${C.primary}`, background: C.primaryLight, color: C.primary,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: font,
            }}>
            <Icon name="plus" size={16} color={C.primary} />試合を追加
          </button>
        </div>
      )}

      {/* ⑦ 公開設定 (matches あれば 7、なければ実質 6 だが番号は固定 6 のまま) */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num={matches.length > 0 ? "7" : "6"} label="公開設定" />
        <_peVisibility value={form.visibility} onChange={(v) => onChange({ ...form, visibility: v })} />
      </div>

      {/* Match Modal (大会と共通の MatchEditModal を流用) */}
      <MatchEditModal
        open={!!matchModalState}
        match={matchModalState?.match}
        trnType="practice"
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
