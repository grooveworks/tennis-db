// SessionCard — Sessions 一覧の1枚カード (DESIGN_SYSTEM §8.5.5 準拠、S6 仕様)
// props:
//   type: "tournament" | "practice" (trial は一覧表示から除外、リンクバッジ経由で表示)
//   date: 日付文字列 (YYYY-MM-DD / YYYY/M/D 両対応、内部で normDate)
//   title: メイン見出し (例: 大会名/会場)
//   metaLine: サブ行 (例: "シングルス 3勝0敗")
//   highlight: 結果の階層表現 "gold" | "silver" | "bronze" | null (優勝/準優勝/3位)
//   resultBadge: 結果バッジ (優勝・ベスト8 等、省略可)
//   sideBadge: 補助バッジ (練習の種別等、省略可)
//   trialBadge: 試打リンクバッジ (同日に紐付いた試打がある場合、省略可)
//   onClick: タップ時 (S10 で画面遷移、S6 では placeholder toast)
//
// 結果階層:
//   gold (優勝)   → tournamentLight 背景 + 1.5px tournamentAccent 枠 + 淡い shadow
//   silver (準優勝) → primaryLight 背景 + 1.5px primary 枠
//   bronze (3位)  → trialLight 背景 + 1.5px trialAccent 枠
//   null        → 通常カード
//
// 使う色は C.tournamentAccent 等を経由 (独自スタイル禁止)
//
// S7 で残した拡張: 日付 span に minWidth (4 文字日付でも潰れない揃え)、
//                  Badge 呼び出しに minWidth を渡してカード間で右端を揃える

const SESSION_TYPE_ACCENT = {
  tournament: { accent: C.tournamentAccent, light: C.tournamentLight },
  practice:   { accent: C.practiceAccent,   light: C.practiceLight },
  trial:      { accent: C.trialAccent,      light: C.trialLight },
};

// S8.5: フラットデザイン原則 (DESIGN_SYSTEM §0 / §181) に合わせ gold の shadow を撤去。
// 優勝の視覚強調は tinted bg + 1.5px accent border + font-weight 700 (SessionCard のタイトル行) のみで表現。
const HIGHLIGHT_STYLES = {
  gold:   { bg: C.tournamentLight, border: C.tournamentAccent, shadow: "none" },
  silver: { bg: C.primaryLight,    border: C.primary,          shadow: "none" },
  bronze: { bg: C.trialLight,      border: C.trialAccent,      shadow: "none" },
};

function SessionCard({ type, date, title, metaLine, highlight, resultBadge, sideBadge, trialBadge, onClick }) {
  const accent = SESSION_TYPE_ACCENT[type] || SESSION_TYPE_ACCENT.tournament;
  const hl = highlight ? HIGHLIGHT_STYLES[highlight] : null;
  const [hover, setHover] = useState(false);
  const clickable = !!onClick;

  const bg = hl ? hl.bg : (clickable && hover ? C.panel2 : C.panel);
  const border = hl ? `1.5px solid ${hl.border}` : `1px solid ${C.border}`;
  const shadow = hl ? hl.shadow : "none";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        position: "relative",
        background: bg,
        border,
        borderRadius: 12,
        padding: "10px 14px 10px 18px",
        marginBottom: 4,
        cursor: clickable ? "pointer" : "default",
        transition: "background 150ms ease-out, transform 150ms",
        boxShadow: shadow,
        overflow: "hidden",
      }}
    >
      {/* 左端 3px 色帯 */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: accent.accent,
        borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
      }} />

      {/* 1 行目: 日付 + カテゴリー (sideBadge) + 結果 (resultBadge) + 試打 (trialBadge) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.textSecondary,
          minWidth: 42,      // 「4/11」(4文字) でも潰れず、「4/8」(3文字) でも幅を確保
          flexShrink: 0,     // バッジ増えても日付が圧縮されない
        }}>
          {fmtDate(date)}
        </span>
        {/* minWidth は役割ごとに固定: 並んだカードでバッジ右端を揃えてリズムを作る */}
        {sideBadge && (
          <Badge variant={sideBadge.variant} icon={sideBadge.icon} minWidth={96}>{sideBadge.label}</Badge>
        )}
        {resultBadge && (
          <Badge variant={resultBadge.variant} icon={resultBadge.icon} minWidth={80}>{resultBadge.label}</Badge>
        )}
        {trialBadge && (
          <Badge variant={trialBadge.variant} icon={trialBadge.icon} minWidth={60}>{trialBadge.label}</Badge>
        )}
      </div>

      {/* 2 行目: タイトル (S8.5: 長 title の壁化防止のため 2 行で省略) */}
      <div style={{
        fontSize: 15,
        fontWeight: highlight ? 700 : 600,
        color: C.text,
        lineHeight: 1.3,
        marginBottom: metaLine ? 2 : 0,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        wordBreak: "break-word",
      }}>
        {title || "(無題)"}
      </div>

      {/* 3 行目: メタ */}
      {metaLine && (
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>
          {metaLine}
        </div>
      )}
    </div>
  );
}
