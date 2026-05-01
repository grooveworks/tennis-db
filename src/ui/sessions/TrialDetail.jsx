// TrialDetail — 試打セッション詳細 (v5, 2026-04-24 更新)
// 統一レイアウト: 会場/気象 3 列 + 機材 2x2 (大会・練習と同じ)
// 評価: 打感評価 6 項目 + 平均 / 特性 2 項目 / ショット別 8 項目 / 安心感 1 項目 (v3 踏襲)
// 評価項目は Lucide マッピング未登録につきアイコンなし、ラベル+バー+数値で構成
function TrialDetail({ session, linkedPractice, onLinkedPracticeClick, onCreateCard }) {
  const t = session || {};
  const judgmentBadge = _dvTrialJudgmentBadgeProps(t.judgment);

  // 打感評価 6 項目
  const ratings = [
    { key: "spin",         label: "スピン",       v: t.spin },
    { key: "power",        label: "推進力",       v: t.power },
    { key: "control",      label: "コントロール", v: t.control },
    { key: "info",         label: "打感情報",     v: t.info },
    { key: "maneuver",     label: "操作性",       v: t.maneuver },
    { key: "swingThrough", label: "振り抜き",     v: t.swingThrough },
  ];
  const ratingVals = ratings.map(r => r.v).filter(v => v > 0);
  const avg = ratingVals.length > 0
    ? (ratingVals.reduce((s, v) => s + v, 0) / ratingVals.length).toFixed(1)
    : null;
  const avgColor = avg ? _dvScColor(parseFloat(avg)) : C.textMuted;

  const hasFeatures = !!(t.trajectory || t.stiffness);

  const shots = [
    { label: "フォア攻撃", v: t.shotForeAtk },
    { label: "フォア守備", v: t.shotForeDef },
    { label: "バック攻撃", v: t.shotBackAtk },
    { label: "バック守備", v: t.shotBackDef },
    { label: "サーブ",     v: t.shotServe },
    { label: "リターン",   v: t.shotReturn },
    { label: "ボレー",     v: t.shotVolley },
    { label: "スライス",   v: t.shotSlice },
  ];
  const hasShots = shots.some(s => s.v);

  return (
    <>
      {/* Title (判定バッジ + ラケット + ストリング) */}
      <_dvSection>
        {judgmentBadge && (
          <div style={{ marginBottom: 8 }}>
            <Badge variant={judgmentBadge.variant} icon={judgmentBadge.icon}>{judgmentBadge.label}</Badge>
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 4 }}>
          {t.racketName || ""}{t.stringMain ? ` / ${t.stringMain}` : ""}{t.stringCross ? ` / ${t.stringCross}` : ""}
        </div>
        {_dvFmtTension(t.tensionMain, t.tensionCross) && (
          <div style={{ fontSize: 12, color: C.textSecondary }}>
            {_dvFmtTension(t.tensionMain, t.tensionCross)}
          </div>
        )}
      </_dvSection>

      {/* 統一: 会場 / 気象 3 列 (試打では venue/temp のみ、weather は "—") */}
      <_dvSection title="会場 / 気象">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 6 }}>
          <_dvInfoCell label="場所" value={t.venue} />
          <_dvInfoCell label="気温" value={t.temp ? t.temp + "℃" : ""} />
          <_dvInfoCell label="天気" value="" />
        </div>
      </_dvSection>

      {/* 統一: 機材 2x2 */}
      <_dvSection title="機材">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
          <_dvInfoCell label="ラケット" value={t.racketName} />
          <_dvInfoCell label="テンション" value={_dvFmtTension(t.tensionMain, t.tensionCross)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <_dvInfoCell label="縦糸" value={t.stringMain} />
          <_dvInfoCell label="横糸" value={t.stringCross} />
        </div>
        {/* S15.5: この設定を試打カードに 1 タップ複製 (主役は試打閲覧、これは補助 CTA) */}
        {onCreateCard && t.racketName && (
          <button
            onClick={onCreateCard}
            style={{
              width: "100%", marginTop: 12,
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 14px",
              fontSize: 13, fontWeight: 500, color: C.primary,
              cursor: "pointer", fontFamily: "inherit", minHeight: 44,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Icon name="plus-circle" size={16} color={C.primary} /> 試打カードに追加
          </button>
        )}
      </_dvSection>

      {/* 打感評価 6 項目 + 平均 */}
      {ratingVals.length > 0 && (
        <_dvSection
          title="打感評価"
          titleRight={<span style={{ fontSize: 12, fontWeight: 700, color: avgColor, fontVariantNumeric: "tabular-nums" }}>平均 {avg} / 5</span>}
        >
          {ratings.map(r => r.v ? <_dvRatingRow key={r.key} label={r.label} value={r.v} /> : null)}
        </_dvSection>
      )}

      {/* 特性 (1↔5) */}
      {hasFeatures && (
        <_dvSection title="特性 (1 ↔ 5)">
          {t.trajectory ? <_dvRatingRow label="弾道" sub="低↔高" value={t.trajectory} /> : null}
          {t.stiffness  ? <_dvRatingRow label="打感" sub="柔↔硬" value={t.stiffness} /> : null}
        </_dvSection>
      )}

      {/* ショット別 8 項目 */}
      {hasShots && (
        <_dvSection title="ショット別">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
            {shots.map((s, i) => s.v ? (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: C.text, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: _dvScColor(s.v), fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{s.v}</span>
                </div>
                <div style={{ background: C.divider, borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div style={{ width: `${s.v * 20}%`, height: "100%", background: _dvScColor(s.v), borderRadius: 4 }} />
                </div>
              </div>
            ) : null)}
          </div>
        </_dvSection>
      )}

      {/* 安心感 */}
      {t.confidence ? (
        <_dvSection title="安心感">
          <_dvRatingRow label="振り切れるか" value={t.confidence} />
        </_dvSection>
      ) : null}

      {/* メモ */}
      {(t.strokeNote || t.serveNote || t.volleyNote || t.generalNote) && (
        <_dvSection title="メモ">
          {t.strokeNote  && <_dvMemoItem label="ストローク" text={t.strokeNote}  summary={t.memoSummaries?.strokeNote} />}
          {t.serveNote   && <_dvMemoItem label="サーブ"     text={t.serveNote}   summary={t.memoSummaries?.serveNote} />}
          {t.volleyNote  && <_dvMemoItem label="ボレー"     text={t.volleyNote}  summary={t.memoSummaries?.volleyNote} />}
          {t.generalNote && <_dvMemoItem label="総括"       text={t.generalNote} summary={t.memoSummaries?.generalNote} />}
        </_dvSection>
      )}

      {/* 連携練習 (タップで練習詳細へ) */}
      {linkedPractice && (
        <_dvSection title="連携練習">
          <_dvLinkCard
            kind="practice"
            title={linkedPractice.title || linkedPractice.venue || "(無題の練習)"}
            meta={`${linkedPractice.type || "練習"} ・ ${linkedPractice.date}`}
            onClick={onLinkedPracticeClick ? () => onLinkedPracticeClick(linkedPractice) : null}
          />
        </_dvSection>
      )}
    </>
  );
}
