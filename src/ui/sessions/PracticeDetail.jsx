// PracticeDetail — 練習セッション詳細 (v5, 2026-04-24 更新)
// Apple Watch: warning 色体系 + 4 セル (時間/Active/平均/合計) + 積層バー + BPM range + % + 分秒 + 回復心拍
// 統一レイアウト: 会場/気象 3 列 + 機材 2x2 (大会・試打と同じ)、体調は練習のみ
// 共通 helper (_dv*) は SessionDetailView.jsx で定義、関数宣言巻き上げで参照可能

// "52:03" (分:秒) → "52分3秒" / "52分"
function _pdToMinSecLabel(s) {
  if (!s) return "—";
  const pp = String(s).split(":");
  const m = parseInt(pp[0], 10) || 0;
  const sec = parseInt(pp[1], 10) || 0;
  return sec > 0 ? `${m}分${sec}秒` : `${m}分`;
}

function _pdParseMin(s) {
  if (!s) return 0;
  const pp = String(s).split(":");
  return (parseInt(pp[0], 10) || 0) + (parseInt(pp[1], 10) || 0) / 60;
}

// Read-only rating display (5 ボタン横並び、編集画面 _peRatingRow と同じ見た目)
function _pdRatingDisplay({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, minWidth: 60 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <div
              key={n}
              style={{
                flex: 1, minWidth: 40, minHeight: 36, padding: "6px 0",
                borderRadius: 6, border: `1px solid ${on ? C.primary : C.border}`,
                background: on ? C.primary : C.panel,
                color: on ? "#fff" : C.textSecondary,
                fontSize: 13, fontWeight: 600, fontFamily: font,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >{n}</div>
          );
        })}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

// Apple Watch 4 セル内の 1 セル
function _pdWatchSumCell({ icon, label, value, unit, valueColor }) {
  if (value == null || value === "") return <span />;
  return (
    <div style={{ background: C.panel, borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ fontSize: 10, color: "#5f4c00", fontWeight: 600, display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
        <Icon name={icon} size={11} color="#5f4c00" />
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: valueColor || C.text }}>
        {value}{unit && <span style={{ fontSize: 10, color: C.textSecondary, marginLeft: 2, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function PracticeDetail({ session, linkedTrials, onLinkedTrialClick }) {
  const p = session || {};
  const typeBadge = _dvPracticeTypeBadgeProps(p.type);
  const trials = Array.isArray(linkedTrials) ? linkedTrials : [];

  const hasWatchSummary = !!(p.heartRateAvg || p.calories || p.totalCalories || p.duration);
  const zones = [
    { label: "ウォームアップ", bpm: "<122",    time: p.hrZone1, color: "#3b82f6" },
    { label: "脂肪燃焼",       bpm: "123-134", time: p.hrZone2, color: "#06b6d4" },
    { label: "有酸素",         bpm: "135-147", time: p.hrZone3, color: "#eab308" },
    { label: "無酸素",         bpm: "148-159", time: p.hrZone4, color: "#f97316" },
    { label: "最大心拍",       bpm: "160+",    time: p.hrZone5, color: "#ef4444" },
  ];
  const zoneMinutes = zones.map(z => _pdParseMin(z.time));
  const totalMin = zoneMinutes.reduce((s, v) => s + v, 0);
  const hasZones = totalMin > 0;

  return (
    <>
      {/* Title */}
      <_dvSection>
        {typeBadge && (
          <div style={{ marginBottom: 8 }}>
            <Badge variant={typeBadge.variant} icon={typeBadge.icon}>{typeBadge.label}</Badge>
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 4 }}>
          {p.title || p.venue || "(無題の練習)"}
        </div>
        {(p.startTime || p.duration) && (
          <div style={{ fontSize: 12, color: C.textSecondary }}>
            {p.startTime || ""}{p.endTime ? "–" + p.endTime : ""}{p.duration ? ` ・ ${p.duration}分` : ""}
          </div>
        )}
      </_dvSection>

      {/* Apple Watch (warning 色体系で強調 + V3 同等情報量) */}
      {(hasWatchSummary || hasZones) && (
        <div style={{ background: "#fef7e0", border: "1.5px solid #fbbc04", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          {/* ヘッダ: watch + title + timeRange + location */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Icon name="watch" size={15} color="#7e5d00" ariaLabel="Apple Watch" />
            <span style={{ fontSize: 13, color: "#7e5d00", fontWeight: 700 }}>Apple Watch</span>
            {p.timeRange && <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{p.timeRange}</span>}
            {p.workoutLocation && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.text, fontWeight: 600 }}>
                <Icon name="map-pin" size={12} color={C.text} />
                {p.workoutLocation}
              </span>
            )}
          </div>

          {/* 4 セル サマリー */}
          {hasWatchSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: hasZones ? 10 : 0 }}>
              <_pdWatchSumCell icon="clock"       label="時間"   value={p.duration}      unit="分" valueColor={C.primary} />
              <_pdWatchSumCell icon="flame"       label="Active" value={p.calories}      valueColor="#c2410c" />
              <_pdWatchSumCell icon="heart-pulse" label="平均"   value={p.heartRateAvg}  valueColor={C.error} />
              <_pdWatchSumCell icon="flame"       label="合計"   value={p.totalCalories} valueColor="#c2410c" />
            </div>
          )}

          {/* 心拍ゾーン */}
          {hasZones && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7e5d00", fontWeight: 700, marginBottom: 8 }}>
                <Icon name="heart-pulse" size={14} color="#7e5d00" />
                心拍ゾーン
              </div>
              {/* 積層バー (5 色比率) */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                {zones.map((z, i) => {
                  const pct = (zoneMinutes[i] / totalMin) * 100;
                  return <div key={i} style={{ width: `${pct}%`, background: z.color, minWidth: zoneMinutes[i] > 0 ? 2 : 0 }} />;
                })}
              </div>
              {/* 5 ゾーン詳細行 */}
              {zones.map((z, i) => {
                const pct = (zoneMinutes[i] / totalMin) * 100;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                    <div style={{ width: 72, color: C.text, fontWeight: 600, flexShrink: 0 }}>{z.label}</div>
                    <div style={{ width: 48, fontSize: 10, color: C.text, fontWeight: 600, flexShrink: 0 }}>{z.bpm}</div>
                    <div style={{ flex: 1, background: "#e5e7eb", borderRadius: 3, height: 16, overflow: "hidden", minWidth: 0 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: z.color, borderRadius: 3, minWidth: zoneMinutes[i] > 0 ? 3 : 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4 }}>
                        {pct > 12 && <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>{Math.round(pct)}%</span>}
                      </div>
                    </div>
                    <div style={{ width: 56, fontSize: 10, color: z.color, fontWeight: 700, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                      {_pdToMinSecLabel(z.time)}
                    </div>
                  </div>
                );
              })}
              {/* 回復心拍 */}
              {p.recoveryHR && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.text, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="heart" size={12} color={C.text} />
                  回復心拍
                  <span style={{ color: C.practiceAccent, fontWeight: 700 }}>{p.recoveryHR}</span>
                  <span style={{ color: C.textSecondary }}>bpm</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 統一: 会場 / 気象 3 列 */}
      {(p.venue || p.temp || p.weather) && (
        <_dvSection title="会場 / 気象">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 6 }}>
            <_dvInfoCell label="会場" value={p.venue} />
            <_dvInfoCell label="気温" value={p.temp ? p.temp + "℃" : ""} />
            <_dvInfoCell label="天気" value={p.weather} />
          </div>
        </_dvSection>
      )}

      {/* 体調 (練習のみ、編集画面と同じ 5 ボタン表示) */}
      {p.physical ? (
        <_dvSection title="体調">
          <_pdRatingDisplay label="体調" value={Number(p.physical) || 0} />
        </_dvSection>
      ) : null}

      {/* 統一: 機材 2x2 */}
      {(p.racketName || p.stringMain || p.stringCross || p.tensionMain || p.tensionCross) && (
        <_dvSection title="機材">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <_dvInfoCell label="ラケット" value={p.racketName} />
            <_dvInfoCell label="テンション" value={_dvFmtTension(p.tensionMain, p.tensionCross)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <_dvInfoCell label="縦糸" value={p.stringMain} />
            <_dvInfoCell label="横糸" value={p.stringCross} />
          </div>
        </_dvSection>
      )}

      {/* 紐づく試打 (タップで試打詳細へ) */}
      {trials.length > 0 && (
        <_dvSection title="紐づく試打">
          {trials.map(tr => (
            <_dvLinkCard
              key={tr.id}
              kind="trial"
              title={`${tr.racketName || ""}${tr.stringMain ? " / " + tr.stringMain : ""}${tr.stringCross ? " / " + tr.stringCross : ""}`}
              meta={`${tr.judgment || "試打"} ・ ${tr.date}`}
              onClick={onLinkedTrialClick ? () => onLinkedTrialClick(tr) : null}
            />
          ))}
        </_dvSection>
      )}

      {/* メモ (focus はテキスト = v2/v3 と同形式、文字列以外は表示しない = legacy 数値の防御) */}
      {((typeof p.focus === "string" && p.focus) || p.coachNote || p.goodNote || p.improveNote || p.generalNote) && (
        <_dvSection title="メモ">
          {typeof p.focus === "string" && p.focus && <_dvMemoItem label="フォーカス"  text={p.focus} />}
          {p.coachNote   && <_dvMemoItem label="コーチメモ"  text={p.coachNote} />}
          {p.goodNote    && <_dvMemoItem label="良かった点"  text={p.goodNote} />}
          {p.improveNote && <_dvMemoItem label="改善点"      text={p.improveNote} />}
          {p.generalNote && <_dvMemoItem label="メモ"        text={p.generalNote} />}
        </_dvSection>
      )}
    </>
  );
}
