// RecentResults — Home タブ「最近の好成績」カード (REQUIREMENTS_v4.md F4.4 / WIREFRAMES_v4.md §2.1)
//
// S18: 実装漏れの追加実装。設計書には定義されていたが S14 P1 で実装が抜けていた。
//
// 表示:
//   - tournaments で overallResult が「好成績」(優勝/準優勝/3位/ベスト8/ベスト16/予選突破)
//     のものを日付降順で最大 5 件
//   - 「敗退」「予選敗退」は対象外 (好成績限定)
//   - 0 件なら「まだ好成績の記録なし」プレースホルダ表示
//   - 各行タップで Session Detail (大会) へ
//
// props:
//   tournaments: 全大会配列
//   onCardClick(type, item): 行タップ時に大会詳細へ遷移

// 「好成績」と認める overallResult 値 (敗退・予選敗退は除外)
const _RR_GOOD_RESULTS = new Set([
  "優勝",
  "準優勝",
  "3位",
  "ベスト8",
  "ベスト16",
  "予選突破",
]);

// overallResult に対応する Badge variant + icon を返す (SessionDetailView と整合)
function _rrBadgeProps(result) {
  const map = {
    "優勝":     { variant: "tournament", icon: "trophy", label: "優勝" },
    "準優勝":   { variant: "info",       icon: "medal",  label: "準優勝" },
    "3位":      { variant: "bronze",     icon: "award",  label: "3位" },
    "ベスト8":   { variant: "warning", label: "ベスト8" },
    "ベスト16":  { variant: "warning", label: "ベスト16" },
    "予選突破": { variant: "success", label: "予選突破" },
  };
  return map[result] || { variant: "default", label: result };
}

// 1 行 (CurrentContext._CtxRow と同パターン)
function _RRRow({ tournament, onClick }) {
  const badge = _rrBadgeProps(tournament.overallResult);
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 6px",
        margin: "0 -6px",
        borderTop: `1px solid ${C.bg}`,
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
        minHeight: 44,
      }}
    >
      <Badge variant={badge.variant} icon={badge.icon} minWidth={64}>{badge.label}</Badge>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {tournament.name || "(無題の大会)"}
        </div>
        <div style={{
          fontSize: 11, color: C.textMuted, marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {fmtDate(tournament.date)}
        </div>
      </div>
      {onClick && (
        <Icon name="chevron-right" size={14} color={C.textMuted} style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

function RecentResults({ tournaments = [], onCardClick }) {
  const todayIso = today();

  const goodResults = useMemo(() => {
    return (tournaments || [])
      .filter(t => t && t.date && _RR_GOOD_RESULTS.has(t.overallResult) && normDate(t.date) <= todayIso)
      .sort((a, b) => (normDate(b.date) || "").localeCompare(normDate(a.date) || ""))
      .slice(0, 5);
  }, [tournaments, todayIso]);

  return (
    <div style={{ background: C.panel, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 }}>
      {/* ヘッダ */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="trophy" size={16} color={C.tournamentAccent} />
          最近の好成績
        </div>
        <span style={{
          marginLeft: "auto",
          fontSize: 10, color: C.textMuted, fontWeight: 600,
          background: C.bg, padding: "3px 8px", borderRadius: 6,
        }}>最大 5 件</span>
      </div>

      {/* 行 */}
      {goodResults.length === 0 ? (
        <div style={{
          padding: "16px 8px", textAlign: "center",
          fontSize: 12, color: C.textMuted, lineHeight: 1.6,
        }}>
          まだ好成績の記録なし<br />
          <span style={{ fontSize: 11 }}>(優勝 / 準優勝 / 3位 / ベスト8 / ベスト16 / 予選突破)</span>
        </div>
      ) : (
        goodResults.map(t => (
          <_RRRow
            key={t.id || `${t.date}-${t.name}`}
            tournament={t}
            onClick={onCardClick ? () => onCardClick("tournament", t) : null}
          />
        ))
      )}
    </div>
  );
}
