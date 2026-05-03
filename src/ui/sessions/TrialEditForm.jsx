// TrialEditForm — 試打編集フォーム
// 統一フォーマット (preview_s11):
//   ① 基本情報: 日付* / 判定 (大ボタン3連) / 開始-終了時刻
//   ② 会場 / 気象 (3 列、weather は空多めだが統一のため枠は確保)
//   ③ 機材 (2x2、ラケット必須*)
//   ④a 打感評価 (6 項目)
//   ④b 特性 (2 項目、1↔5)
//   ④c ショット別 (8 項目)
//   ④d 安心感 (1 項目)
//   ④e 連携先 (linkedPracticeId / linkedMatchId 張替)
//   ⑤ メモ: ストローク / サーブ / ボレー / 総括

const _TRIAL_WEATHER = [{ value: "", label: "—" }, { value: "晴", label: "晴" }, { value: "曇", label: "曇" }, { value: "雨", label: "雨" }, { value: "屋内", label: "屋内" }];

function _teSectionHead({ num, label, right }) {
  return (
    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "50%", background: C.primary, color: "#fff",
          fontSize: 10, fontWeight: 700,
        }}>{num}</span>
        {label}
      </span>
      {right}
    </div>
  );
}

// 試打評価用 5 ボタン
function _teRatingRow({ label, value, onChange, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, minWidth: 92 }}>
        {label}{sub && <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 3, fontWeight: 400 }}>{sub}</span>}
      </span>
      <div style={{ display: "flex", gap: 5, flex: 1, minWidth: 0 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                flex: 1, minWidth: 36, minHeight: 36, padding: "5px 0",
                borderRadius: 6, border: `1px solid ${on ? C.primary : C.border}`,
                background: on ? C.primary : C.panel,
                color: on ? "#fff" : C.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >{n}</button>
          );
        })}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

// 判定 3 連大ボタン (採用候補=緑 / 保留=黄 / 却下=赤)
function _teJudgmentRow({ value, onChange }) {
  const opts = [
    { v: "採用候補", on: { bg: "#e6f4ea", border: "#0f9d58", color: "#0a5b35" } },
    { v: "保留",     on: { bg: "#fef7e0", border: "#fbbc04", color: "#7e5d00" } },
    { v: "却下",     on: { bg: "#fce8e6", border: "#d93025", color: "#a31511" } },
  ];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
      {opts.map(o => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              flex: 1, minHeight: 48, padding: "0 4px",
              borderRadius: 8, border: `1px solid ${on ? o.on.border : C.border}`,
              background: on ? o.on.bg : C.panel,
              color: on ? o.on.color : C.textSecondary,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font,
            }}
          >{o.v}</button>
        );
      })}
    </div>
  );
}

function TrialEditForm({ form, errors = {}, onChange, practices, tournaments, trials = [], racketNames = [], stringNames = [], venueNames = [] }) {
  const set = (k, v) => onChange({ ...form, [k]: v });

  // S16.11 UX5: 履歴セット picker
  const recentSetups = useMemo(
    () => _computeRecentSetups(tournaments, practices, trials),
    [tournaments, practices, trials]
  );
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

  // 打感評価 6 項目
  const ratings = [
    { key: "spin",         label: "スピン" },
    { key: "power",        label: "推進力" },
    { key: "control",      label: "コントロール" },
    { key: "info",         label: "打感情報" },
    { key: "maneuver",     label: "操作性" },
    { key: "swingThrough", label: "振り抜き" },
  ];
  const ratingVals = ratings.map(r => Number(form[r.key]) || 0).filter(v => v > 0);
  const avg = ratingVals.length > 0 ? (ratingVals.reduce((s, v) => s + v, 0) / ratingVals.length).toFixed(1) : null;

  // ショット別 8 項目
  const shots = [
    { key: "shotForeAtk", label: "フォア攻撃" },
    { key: "shotForeDef", label: "フォア守備" },
    { key: "shotBackAtk", label: "バック攻撃" },
    { key: "shotBackDef", label: "バック守備" },
    { key: "shotServe",   label: "サーブ" },
    { key: "shotReturn",  label: "リターン" },
    { key: "shotVolley",  label: "ボレー" },
    { key: "shotSlice",   label: "スライス" },
  ];

  return (
    <>
      {/* ① 基本情報 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="1" label="基本情報" />
        <Input type="date" label="日付" required value={form.date || ""} onChange={(v) => set("date", v)} error={errors.date} />
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>判定</label>
          <_teJudgmentRow value={form.judgment || ""} onChange={(v) => set("judgment", v)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="time" label="開始時刻" value={form.startTime || ""} onChange={(v) => set("startTime", v)} />
          <Input type="time" label="終了時刻" value={form.endTime || ""} onChange={(v) => set("endTime", v)} />
        </div>
      </div>

      {/* ② 会場 / 気象 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="2" label="会場 / 気象" />
        <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="number" label="気温(℃)" value={form.temp || ""} onChange={(v) => set("temp", v)} placeholder="18" />
          <Select label="天気" value={form.weather || ""} onChange={(v) => set("weather", v)} options={_TRIAL_WEATHER} />
        </div>
      </div>

      {/* ③ 機材 (ラケット必須*) — ラケット 1 行 / 縦糸+横糸 / テンション縦+横 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="3" label="機材" />
        <MasterField label="ラケット" required value={form.racketName || ""} onChange={(v) => set("racketName", v)} masterValues={racketNames} error={errors.racketName} placeholder="-- ラケットを選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <MasterField label="縦糸" value={form.stringMain || ""} onChange={(v) => set("stringMain", v)} masterValues={stringNames} placeholder="-- 縦糸を選択 --" />
          <MasterField label="横糸" value={form.stringCross || ""} onChange={(v) => set("stringCross", v)} masterValues={stringNames} placeholder="-- 同じなら空欄 --" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input label="テンション縦" value={form.tensionMain || ""} onChange={(v) => set("tensionMain", v)} placeholder="46" />
          <Input label="テンション横" value={form.tensionCross || ""} onChange={(v) => set("tensionCross", v)} placeholder="43" />
        </div>
        {/* S16.11 UX5: 履歴セット picker */}
        <_SetupPickerButton recent={recentSetups} current={form} onApply={applySetup} />
      </div>

      {/* ④a 打感評価 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="4a" label={`打感評価 (6 項目${avg ? ` ・ 平均 ${avg}` : ""})`} />
        {ratings.map(r => (
          <_teRatingRow key={r.key} label={r.label} value={Number(form[r.key]) || 0} onChange={(n) => set(r.key, n)} />
        ))}
      </div>

      {/* ④b 特性 (1↔5) */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="4b" label="特性 (1 ↔ 5)" />
        <_teRatingRow label="弾道" sub="低↔高" value={Number(form.trajectory) || 0} onChange={(n) => set("trajectory", n)} />
        <_teRatingRow label="打感" sub="柔↔硬" value={Number(form.stiffness) || 0}  onChange={(n) => set("stiffness", n)} />
      </div>

      {/* ④c ショット別 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="4c" label="ショット別 (8 項目)" />
        {shots.map(s => (
          <_teRatingRow key={s.key} label={s.label} value={Number(form[s.key]) || 0} onChange={(n) => set(s.key, n)} />
        ))}
      </div>

      {/* ④d 安心感 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="4d" label="安心感" />
        <_teRatingRow label="振り切れるか" value={Number(form.confidence) || 0} onChange={(n) => set("confidence", n)} />
      </div>

      {/* ④e 連携先 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="4e" label="連携先（任意）" />
        <LinkedSessionPicker
          linkedPracticeId={form.linkedPracticeId || ""}
          linkedMatchId={form.linkedMatchId || ""}
          practices={practices}
          tournaments={tournaments}
          onChange={(next) => onChange({
            ...form,
            linkedPracticeId: next.linkedPracticeId,
            linkedMatchId: next.linkedMatchId,
            // F-A4: cascade.js は linkedMatchIds を優先参照するため、両方を整合させる
            linkedMatchIds: Array.isArray(next.linkedMatchIds) ? next.linkedMatchIds : (next.linkedMatchId ? [next.linkedMatchId] : []),
          })}
        />
      </div>

      {/* ⑤ メモ */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_teSectionHead num="5" label="メモ" />
        <Textarea label="ストロークメモ" value={form.strokeNote || ""} onChange={(v) => set("strokeNote", v)} placeholder="フォア / バック、飛び、弾道..." />
        <Textarea label="サーブメモ" value={form.serveNote || ""} onChange={(v) => set("serveNote", v)} placeholder="スピン量、コントロール..." />
        <Textarea label="ボレーメモ" value={form.volleyNote || ""} onChange={(v) => set("volleyNote", v)} placeholder="安定感、操作性..." />
        <Textarea label="総括" value={form.generalNote || ""} onChange={(v) => set("generalNote", v)} placeholder="全体の印象..." />
      </div>
    </>
  );
}
