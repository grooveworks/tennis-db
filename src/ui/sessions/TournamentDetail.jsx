// TournamentDetail — 大会セッション詳細の body セクション群
// SessionDetailView から session prop を受け取り、Header/ActionBar は呼び出し側で描画
// 共通 helper (_dvSection / _dvInfoCell / _dvResultBadgeProps / _dvTournamentHighlight)
// は SessionDetailView.jsx で定義 (関数宣言なので巻き上げで見える)
function TournamentDetail({ session, onMatchClick }) {
  const t = session || {};
  const hl = _dvTournamentHighlight(t.overallResult);
  const resultBadge = _dvTournamentResultBadgeProps(t.overallResult);
  const typeBadge = _dvTournamentTypeBadgeProps(t.type);
  const matches = Array.isArray(t.matches) ? t.matches : [];
  const wins = matches.filter(m => m.result === "勝利").length;
  const losses = matches.filter(m => m.result === "敗北" || m.result === "棄権").length;

  return (
    <>
      {/* Title (優勝 gold highlight) */}
      <_dvSection variant={hl}>
        {(resultBadge || typeBadge) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {resultBadge && <Badge variant={resultBadge.variant} icon={resultBadge.icon}>{resultBadge.label}</Badge>}
            {typeBadge && <Badge variant={typeBadge.variant} icon={typeBadge.icon}>{typeBadge.label}</Badge>}
          </div>
        )}
        <div style={{ fontSize: 17, fontWeight: hl ? 700 : 600, color: C.text, lineHeight: 1.4, marginBottom: 4 }}>
          {t.name || "(無題の大会)"}
        </div>
        {matches.length > 0 && (
          <div style={{ fontSize: 13, color: C.textSecondary }}>
            {wins}勝{losses}敗 ・ {matches.length}試合
          </div>
        )}
      </_dvSection>

      {/* 会場 / 気象 */}
      {(t.venue || t.temp || t.weather) && (
        <_dvSection title="会場 / 気象">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
            <_dvInfoCell label="会場" value={t.venue} />
            <_dvInfoCell label="気温" value={t.temp ? t.temp + "℃" : ""} />
            <_dvInfoCell label="天気" value={t.weather} />
          </div>
        </_dvSection>
      )}

      {/* 機材 */}
      {(t.racketName || t.stringMain || t.stringCross || t.tensionMain || t.tensionCross) && (
        <_dvSection title="機材">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
            <_dvInfoCell label="ラケット" value={t.racketName} />
            <_dvInfoCell label="テンション" value={_dvFmtTension(t.tensionMain, t.tensionCross)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <_dvInfoCell label="縦糸" value={t.stringMain} />
            <_dvInfoCell label="横糸" value={t.stringCross} />
          </div>
        </_dvSection>
      )}

      {/* 試合記録 (実件数のみ) */}
      {matches.length > 0 && (
        <_dvSection title={`試合記録 (${matches.length}試合)`}>
          {matches.map((m, i) => (
            <div
              key={m.id || i}
              onClick={() => onMatchClick && onMatchClick(m)}
              style={{
                background: C.bg,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: i < matches.length - 1 ? 6 : 0,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: onMatchClick ? "pointer" : "default",
                transition: "background 150ms ease-out",
                minHeight: 44,
              }}
              onMouseEnter={(e) => onMatchClick && (e.currentTarget.style.background = C.panel2)}
              onMouseLeave={(e) => onMatchClick && (e.currentTarget.style.background = C.bg)}
            >
              <span style={{ fontSize: 11, color: C.textSecondary, minWidth: 36, fontWeight: 600 }}>{m.round || "—"}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>
                {m.opponent || "(対戦相手 未入力)"}{m.opponent2 ? " / " + m.opponent2 : ""}
              </span>
              <span style={{ fontSize: 12, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                {Array.isArray(m.setScores) ? m.setScores.filter(Boolean).join(" ") : ""}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: m.result === "勝利" ? C.practiceAccent : m.result === "敗北" ? C.error : C.textMuted }}>
                {m.result === "勝利" ? "勝" : m.result === "敗北" ? "負" : m.result === "棄権" ? "棄" : "—"}
              </span>
              {onMatchClick && <Icon name="chevron-right" size={14} color={C.textMuted} />}
            </div>
          ))}
        </_dvSection>
      )}

      {/* 総括メモ */}
      {t.generalNote && (
        <_dvSection title="総括メモ">
          <_dvMemoItem label="大会総括" text={t.generalNote} summary={t.memoSummaries?.generalNote} />
        </_dvSection>
      )}
    </>
  );
}
