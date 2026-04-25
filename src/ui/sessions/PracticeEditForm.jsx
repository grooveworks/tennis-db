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

function PracticeEditForm({ form, errors = {}, onChange, racketNames = [], stringNames = [], venueNames = [] }) {
  // 開始/終了時刻入力時に duration を自動計算 (v3:2471-2481 移植)
  const set = (k, v) => {
    const n = { ...form, [k]: v };
    if ((k === "startTime" || k === "endTime") && n.startTime && n.endTime) {
      const sParts = n.startTime.split(":").map(Number);
      const eParts = n.endTime.split(":").map(Number);
      if (!isNaN(sParts[0]) && !isNaN(eParts[0])) {
        const mins = (eParts[0] * 60 + (eParts[1] || 0)) - (sParts[0] * 60 + (sParts[1] || 0));
        if (mins > 0) n.duration = String(mins);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
          <Input type="time" label="開始" value={form.startTime || ""} onChange={(v) => set("startTime", v)} />
          <Input type="time" label="終了" value={form.endTime || ""} onChange={(v) => set("endTime", v)} />
          <Input type="number" label="時間(分)" value={form.duration || ""} onChange={(v) => set("duration", v)} placeholder="90" />
        </div>
      </div>

      {/* ② 会場 / 気象 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="2" label="会場 / 気象" />
        <MasterField label="会場" value={form.venue || ""} onChange={(v) => set("venue", v)} masterValues={venueNames} placeholder="-- 会場を選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input type="number" label="気温(℃)" value={form.temp || ""} onChange={(v) => set("temp", v)} placeholder="18" />
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
          <Input label="テンション縦" value={form.tensionMain || ""} onChange={(v) => set("tensionMain", v)} placeholder="46" />
          <Input label="テンション横" value={form.tensionCross || ""} onChange={(v) => set("tensionCross", v)} placeholder="43" />
        </div>
      </div>

      {/* ④ 体調・集中 + Apple Watch */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="4" label="体調・集中" />
        <_peRatingRow label="体調" value={Number(form.physical) || 0} onChange={(n) => onChange({ ...form, physical: n })} />
        <_peRatingRow label="集中" value={Number(form.focus) || 0} onChange={(n) => onChange({ ...form, focus: n })} />
      </div>
      <_peAppleWatchPanel form={form} />

      {/* ⑤ メモ — focus は rating (集中度、上のセクション)、textarea は SCHEMA に無いので作らない */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="5" label="メモ" />
        <Textarea label="コーチメモ" value={form.coachNote || ""} onChange={(v) => onChange({ ...form, coachNote: v })} placeholder="コーチから言われたこと..." />
        <Textarea label="良かった点" value={form.goodNote || ""} onChange={(v) => onChange({ ...form, goodNote: v })} placeholder="できるようになったこと..." />
        <Textarea label="改善点" value={form.improveNote || ""} onChange={(v) => onChange({ ...form, improveNote: v })} placeholder="次回意識したいこと..." />
        <Textarea label="メモ" value={form.generalNote || ""} onChange={(v) => onChange({ ...form, generalNote: v })} placeholder="その他気づき..." />
      </div>

      {/* ⑥ 公開設定 */}
      <div style={{ background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <_peSectionHead num="6" label="公開設定" />
        <_peVisibility value={form.visibility} onChange={(v) => onChange({ ...form, visibility: v })} />
      </div>
    </>
  );
}
