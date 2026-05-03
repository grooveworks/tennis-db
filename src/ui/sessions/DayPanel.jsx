// DayPanel — CalendarGrid 直下の選択日詳細パネル (DESIGN_SYSTEM §8.5.7.1)
// props:
//   dateISO:      "YYYY-MM-DD" (この日のセッションを表示)
//   tournaments:  当日の大会 entry 配列 (entry={type,item})
//   practices:    当日の練習 entry 配列
//   trialLinks:   {linkedTournamentIds:Set, linkedPracticeIds:Set} (試打バッジ判定用、現状ミニ行では未使用だが将来用)
//   onClose:      ✕ ボタン or ESC で呼ばれる
//   onCardClick:  ミニ行タップ時 (type, item) を渡す (S10 で詳細画面に接続)

const _DOW_LABELS = ["日","月","火","水","木","金","土"];

const _formatDateLabel = (dateISO) => {
  const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateISO;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return `${Number(mo)}月${Number(d)}日 (${_DOW_LABELS[dt.getDay()]})`;
};

// 大会の結果 → 結果バッジ用 (variant + label)。SessionsTab._mapTournamentResult と整合。
const _resultBadgeProps = (result) => {
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

// 大会の meta 行: 開始時刻 / 形式 / 勝敗
const _tournamentMeta = (item) => {
  const parts = [];
  if (item.startTime) parts.push(item.startTime);
  const typeLabel = { singles: "シングルス", doubles: "ダブルス", mixed: "ミックス" }[item.type];
  if (typeLabel) parts.push(typeLabel);
  const matches = Array.isArray(item.matches) ? item.matches : [];
  if (matches.length > 0) {
    // H-9 (Phase A 監査): _normalizeMatchResult で表記揺れ吸収 (勝/負/win/loss 等を含む)
    const wins = matches.filter(m => _normalizeMatchResult(m.result) === "win").length;
    const losses = matches.filter(m => _normalizeMatchResult(m.result) === "loss").length;
    parts.push(`${wins}勝${losses}敗`);
  }
  return parts.join(" / ");
};

// 練習の meta 行: 時間帯 / 分 / 心拍 / 会場
const _practiceMeta = (item) => {
  const parts = [];
  if (item.startTime) parts.push(item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime);
  if (item.duration) parts.push(`${item.duration}分`);
  if (item.heartRateAvg) parts.push(`心拍${item.heartRateAvg}`);
  return parts.join(" / ");
};

const DayPanelMiniRow = ({ entry, onClick }) => {
  const isTournament = entry.type === "tournament";
  const it = entry.item;
  const sideColor = isTournament ? C.tournamentAccent : C.practiceAccent;
  const title = isTournament
    ? (it.name || "(無題の大会)")
    : (it.title || it.venue || "(無題の練習)");
  const meta = isTournament ? _tournamentMeta(it) : _practiceMeta(it);
  const resultBadge = isTournament ? _resultBadgeProps(it.overallResult) : null;

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
        gap: 8,
        padding: 6,
        borderRadius: 8,
        cursor: "pointer",
        background: "transparent",
      }}
    >
      <div style={{ width: 4, height: 36, borderRadius: 2, background: sideColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title}
        </div>
        {meta && (
          <div style={{
            fontSize: 11, color: C.textMuted, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {meta}
          </div>
        )}
      </div>
      {resultBadge && (
        <Badge variant={resultBadge.variant}>{resultBadge.label}</Badge>
      )}
      <Icon name="chevron-right" size={16} color={C.textMuted} />
    </div>
  );
};

function DayPanel({ dateISO, tournaments = [], practices = [], onClose, onCardClick }) {
  // 並び順: 大会 → 練習 (大会内は startTime 昇順、練習も startTime 昇順)
  const ordered = useMemo(() => {
    const t = [...tournaments].sort((a, b) => String(a.item.startTime || "").localeCompare(String(b.item.startTime || "")));
    const p = [...practices].sort((a, b) => String(a.item.startTime || "").localeCompare(String(b.item.startTime || "")));
    return [...t, ...p];
  }, [tournaments, practices]);

  // ESC で閉じる
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const count = ordered.length;
  const label = _formatDateLabel(dateISO);

  // S13.5 (2026-04-27 修正): flex sibling → 親 (CalendarView container) の position: absolute オーバーレイ化。
  //   理由: 旧仕様ではカレンダーグリッドを縦に押し縮めていた。半透明 glass で重ねる形に変更。
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 220,
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
      {/* ヘッダ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: `1px solid ${C.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          {label}
          <span style={{ color: C.textMuted, fontWeight: 500, marginLeft: 6, fontSize: 12 }}>{count}件</span>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            width: 28, height: 28,
            border: "none", background: "transparent", color: C.textMuted,
            cursor: "pointer", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="x" size={18} color={C.textMuted} />
        </button>
      </div>
      {/* 本体 (スクロール) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 8px", minHeight: 0 }}>
        {count === 0 ? (
          <div style={{ textAlign: "center", padding: 16, color: C.textMuted, fontSize: 12 }}>
            この日のセッションはありません
          </div>
        ) : (
          ordered.map((entry, i) => (
            <DayPanelMiniRow key={`${entry.type}-${entry.item.id || i}`} entry={entry} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}
