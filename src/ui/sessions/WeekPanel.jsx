// WeekPanel — 年間ヒートマップ 週タップ時の日別セッション一覧パネル (DESIGN_SYSTEM §8.5.7.2)
// props:
//   weekLabel:   "4/22 - 4/28 (第4週)" 等の表示用ラベル
//   items:       その週のエントリ配列 [{type:"tournament"|"practice", item}] (日付昇順でソート済み)
//   onClose:     ✕ ボタン or ESC で呼ばれる
//   onCardClick: ミニ行タップ時 (type, item) を渡す (S10 詳細画面に接続)
//
// パネル高 198px 固定 (v6 プロトタイプ確定寸法)。
// 3 件完全表示、4 件以上は内部 scroll。左右 (件数差) でパネル高が変動しない = heatmap 領域が一定。

const _DOW_LABELS_SHORT = ["日","月","火","水","木","金","土"];

const _formatWeekRowDate = (dateISO) => {
  const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateISO;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return `${Number(mo)}/${Number(d)} (${_DOW_LABELS_SHORT[dt.getDay()]})`;
};

// 大会の結果 → 結果バッジ (DayPanel と同じマッピング)
const _wpResultBadge = (result) => {
  if (!result) return null;
  const map = {
    "優勝":     { variant: "tournament", label: "優勝" },
    "準優勝":   { variant: "info",       label: "準優勝" },
    "3位":      { variant: "bronze",     label: "3位" },
    "ベスト8":  { variant: "warning",    label: "ベスト8" },
    "ベスト16": { variant: "warning",    label: "ベスト16" },
    "予選突破": { variant: "success",    label: "予選突破" },
    "敗退":     { variant: "error",      label: "敗退" },
    "予選敗退": { variant: "error",      label: "予選敗退" },
  };
  return map[result] || { variant: "default", label: result };
};

const _wpTournamentMeta = (item) => {
  const parts = [];
  if (item.startTime) parts.push(item.startTime);
  const typeLabel = { singles: "シングルス", doubles: "ダブルス", mixed: "ミックス" }[item.type];
  if (typeLabel) parts.push(typeLabel);
  const matches = Array.isArray(item.matches) ? item.matches : [];
  if (matches.length > 0) {
    const wins = matches.filter(m => m.result === "勝利" || m.result === "win").length;
    const losses = matches.filter(m => m.result === "敗北" || m.result === "loss").length;
    parts.push(`${wins}勝${losses}敗`);
  }
  return parts.join(" / ");
};

const _wpPracticeMeta = (item) => {
  const parts = [];
  if (item.startTime) parts.push(item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime);
  if (item.duration) parts.push(`${item.duration}分`);
  if (item.heartRateAvg) parts.push(`心拍${item.heartRateAvg}`);
  return parts.join(" / ");
};

const WeekPanelMiniRow = ({ entry, onClick }) => {
  const isTournament = entry.type === "tournament";
  const it = entry.item;
  const sideColor = isTournament ? C.tournamentAccent : C.practiceAccent;
  const datePrefix = _formatWeekRowDate(normDate(it.date));
  const rawTitle = isTournament
    ? (it.name || "(無題の大会)")
    : (it.title || it.venue || "(無題の練習)");
  const title = `${datePrefix} ${rawTitle}`;
  const meta = isTournament ? _wpTournamentMeta(it) : _wpPracticeMeta(it);
  const resultBadge = isTournament ? _wpResultBadge(it.overallResult) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(entry.type, it)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(entry.type, it);
        }
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.panel2; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: "transparent",
        marginTop: 2,
      }}
    >
      <div style={{ width: 4, height: 36, borderRadius: 2, background: sideColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title}
        </div>
        {meta && (
          <div style={{
            fontSize: 12, color: C.textMuted, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {meta}
          </div>
        )}
      </div>
      {resultBadge && (
        <Badge variant={resultBadge.variant}>{resultBadge.label}</Badge>
      )}
      <Icon name="chevron-right" size={18} color={C.textMuted} />
    </div>
  );
};

function WeekPanel({ weekLabel, items = [], onClose, onCardClick }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const count = items.length;

  // S13.5 (2026-04-27 修正): flex sibling → 親 (YearHeatmap container) の position: absolute オーバーレイ化。
  //   理由: 旧仕様では heatmap を縦に押し縮めていた。半透明 glass で重ねる形に変更し、
  //         heatmap は 12 月分常時フルサイズ表示を維持。iPhone 通知センター方式。
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 198,
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "saturate(180%) blur(28px)",
        WebkitBackdropFilter: "saturate(180%) blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.5)",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        animation: "dayPanelSlideUp 200ms ease-out",
        zIndex: 30,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 18px",
        borderBottom: `1px solid ${C.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
          {weekLabel}
          <span style={{ color: C.textMuted, fontWeight: 500, marginLeft: 8, fontSize: 13 }}>{count}件</span>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            width: 32, height: 32,
            border: "none", background: "transparent", color: C.textMuted,
            cursor: "pointer", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="x" size={20} color={C.textMuted} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 14px 4px", minHeight: 0 }}>
        {count === 0 ? (
          <div style={{ textAlign: "center", padding: 14, color: C.textMuted, fontSize: 12 }}>
            この週のセッションはありません
          </div>
        ) : (
          items.map((entry, i) => (
            <WeekPanelMiniRow key={`${entry.type}-${entry.item.id || i}`} entry={entry} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}
