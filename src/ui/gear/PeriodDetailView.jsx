// PeriodDetailView — Setting History の 1 期間をタップで開く詳細画面 (slide-in)
//
// 役割:
//   - その期間に行われた tournament / practice / trial のカードを月見出し付きで時系列に並べる
//   - 各カードに type 別の色帯 (大会オレンジ / 練習グリーン / 試打パープル)
//   - メモは line-clamp 2 行で省略表示、長文は「タップで全文を見る」リンクで SessionDetailView 遷移
//   - メモが無いカードは何も付随表示しない
//   - 各カード本体タップ → 既存 SessionDetailView を開く
//
// props:
//   open: boolean
//   period: { startDate, endDate, isCurrent, settingLabel, settingSig, sessions[] } | null
//   racket: { id, name, ... }
//   tournaments / practices / trials: 全 sessions (memo参照のため)
//   onClose(): 閉じる
//   onSessionClick(type, item): その session の詳細画面を開く

const _MEMO_FIELDS = {
  tournament: [
    { key: "generalNote", label: "総括" },
  ],
  practice: [
    { key: "generalNote", label: "総括" },
    { key: "focus", label: "フォーカス" },
    { key: "coachNote", label: "コーチメモ" },
    { key: "goodNote", label: "良かった点" },
    { key: "improveNote", label: "改善点" },
  ],
  trial: [
    { key: "generalNote", label: "総合メモ" },
    { key: "strokeNote", label: "ストロークメモ" },
    { key: "serveNote", label: "サーブメモ" },
    { key: "volleyNote", label: "ボレーメモ" },
  ],
  match: [
    { key: "mentalNote", label: "メンタル" },
    { key: "techNote", label: "技術" },
    { key: "opponentNote", label: "相手" },
    { key: "note", label: "試合メモ" },
  ],
};

// 試合結果バッジの variant 判定 (DESIGN_SYSTEM §4.1)
function _resultBadge(result) {
  if (!result) return null;
  const r = String(result).trim();
  if (r === "優勝") return { label: "🏆 優勝", bg: "#fff", color: "#a04f00", border: "rgba(160,79,0,0.4)" };
  if (r === "準優勝") return { label: "🥈 準優勝", bg: "#fff", color: "#0d47a1", border: "rgba(13,71,161,0.4)" };
  if (r === "3位") return { label: "🥉 3位", bg: "#fff", color: "#6a25a8", border: "rgba(106,37,168,0.4)" };
  if (r.includes("ベスト")) return { label: r, bg: C.warningLight, color: "#7e5d00" };
  if (r === "予選突破") return { label: r, bg: C.successLight, color: "#0a5b35" };
  if (r.includes("敗退")) return { label: r, bg: C.errorLight, color: "#a31511" };
  if (r === "棄権") return { label: r, bg: C.panel2, color: C.textSecondary };
  return { label: r, bg: C.panel2, color: C.textSecondary };
}

// match の setScores を "6-4, 7-5" に整形
function _formatScores(setScores) {
  if (!Array.isArray(setScores) || setScores.length === 0) return "";
  return setScores
    .map(s => (s && s.me != null && s.opp != null) ? `${s.me}-${s.opp}` : null)
    .filter(Boolean)
    .join(", ");
}

// 月見出し: "2026-03"
function _monthKey(dateStr) {
  return (dateStr || "").substring(0, 7);
}

function _dateMD(dateStr) {
  // "2026-03-22" → "3/22"
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

function PeriodDetailView({ open, period, racket, tournaments, practices, trials, onClose, onSessionClick }) {
  // history.pushState 連動 (Racket Detail と同じ pattern)
  useEffect(() => {
    if (!open) return;
    try { window.history.pushState({ tdb: "gear-period" }, ""); } catch (_) {}
    const handler = () => { onClose && onClose(); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, period?.startDate]);

  const handleBack = () => {
    try { window.history.back(); } catch (_) { onClose && onClose(); }
  };

  if (!open || !period || !racket) return null;

  // sessions を type 別に拾う (settingHistory.sessions の各要素は {type, date, sessionId, item})
  // ただし item は履歴計算時のスナップショットなので、最新データに置き換える (memo 編集対応)
  const enriched = (period.sessions || []).map(s => {
    let liveItem = null;
    if (s.type === "tournament" || s.type === "tournament-match") {
      liveItem = (tournaments || []).find(t => t.id === s.sessionId) || s.item;
    } else if (s.type === "practice") {
      liveItem = (practices || []).find(p => p.id === s.sessionId) || s.item;
    } else if (s.type === "trial") {
      liveItem = (trials || []).find(t => t.id === s.sessionId) || s.item;
    }
    return { ...s, item: liveItem };
  });

  // 新しい順 (period detail 内も新しい日付が上)
  enriched.sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  // 月ごとにグループ化
  const monthGroups = [];
  let curMonth = null;
  for (const s of enriched) {
    const m = _monthKey(s.date);
    if (m !== curMonth) {
      curMonth = m;
      monthGroups.push({ month: m, sessions: [] });
    }
    monthGroups[monthGroups.length - 1].sessions.push(s);
  }

  // 統計 (期間サマリ用)
  const tCount = period.tournamentCount || 0;
  const pCount = period.practiceCount || 0;
  const trCount = period.trialCount || 0;
  let wins = 0, losses = 0;
  enriched.forEach(s => {
    if (s.type === "tournament" || s.type === "tournament-match") {
      const t = s.item;
      (t?.matches || []).forEach(m => {
        if (m && m.racketName === racket.name) {
          const r = (m.result || "").toLowerCase();
          if (r === "win" || r === "勝" || r === "勝利") wins++;
          else if (r === "lose" || r === "loss" || r === "負" || r === "敗") losses++;
        }
      });
    }
  });

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: C.bg,
      zIndex: 50, // TabBar (60) より下、TabBar 表示維持
      display: "flex", flexDirection: "column",
      animation: "modalEnter 250ms ease-out",
    }}>
      {/* Header */}
      <div style={{
        height: 56, flex: "0 0 56px",
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 8px",
        background: C.panel,
        borderBottom: `1px solid ${C.divider}`,
      }}>
        <button
          onClick={handleBack}
          aria-label="戻る"
          style={{
            width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            borderRadius: 8, color: C.text,
          }}
        >
          <Icon name="arrow-left" size={22} />
        </button>
        <div style={{
          flex: 1, fontSize: 14, fontWeight: 600, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {_formatPeriodTitle(period)}
        </div>
        <div style={{
          fontSize: 11, color: C.textMuted, paddingRight: 12,
          maxWidth: 120,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {racket.name}
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflow: "auto", padding: 14,
        paddingBottom: "calc(14px + 56px + env(safe-area-inset-bottom, 0))",
        background: C.bg,
      }}>
        {/* 期間サマリ (薄め) */}
        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.card,
          padding: "14px 16px",
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.textSecondary,
            fontVariantNumeric: "tabular-nums",
            marginBottom: 4,
          }}>
            {_formatPeriodTitle(period)}
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700, color: C.text,
            lineHeight: 1.35,
            marginBottom: 6,
            ...(period.settingSig === "__empty__" ? { color: C.textMuted } : {}),
          }}>
            {period.settingLabel}
          </div>
          <div style={{
            fontSize: 12, color: C.textSecondary,
            fontVariantNumeric: "tabular-nums",
          }}>
            {_summaryStats(pCount, tCount, trCount, wins, losses)}
          </div>
        </div>

        {/* Sessions 月ごとに */}
        {monthGroups.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: C.textMuted, fontSize: 12 }}>
            この期間の記録はありません
          </div>
        ) : (
          monthGroups.map(g => (
            <div key={g.month}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: C.textMuted,
                margin: "14px 0 6px",
                paddingLeft: 4,
                fontVariantNumeric: "tabular-nums",
              }}>
                {g.month}
              </div>
              {g.sessions.map(s => (
                <_SessionCard
                  key={s.sessionId}
                  type={s.type}
                  item={s.item}
                  racketName={racket.name}
                  onClick={() => onSessionClick(s.type === "tournament-match" ? "tournament" : s.type, s.item)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 期間タイトル整形 ("2025-08 〜 2026-04 (8 ヶ月)")
function _formatPeriodTitle(period) {
  if (!period) return "";
  const start = (period.startDate || "").substring(0, 7);
  if (period.isCurrent) return `${start} 〜 現在`;
  const end = (period.endDate || "").substring(0, 7);
  return start === end ? start : `${start} 〜 ${end}`;
}

// 統計サマリ ("練習 6 · 試合 4 · 2 勝 2 敗")
function _summaryStats(p, t, tr, wins, losses) {
  const parts = [];
  if (p > 0) parts.push(`練習 ${p}`);
  if (t > 0) parts.push(`試合 ${t}`);
  if (tr > 0) parts.push(`試打 ${tr}`);
  if (wins + losses > 0) parts.push(`${wins} 勝 ${losses} 敗`);
  return parts.join(" · ") || "—";
}

// session カード本体
function _SessionCard({ type, item, racketName, onClick }) {
  if (!item) return null;
  const stripColor = type === "trial" ? C.trialAccent
    : (type === "practice" ? C.practiceAccent : C.tournamentAccent);
  const iconName = type === "trial" ? "tennis-ball"
    : (type === "practice" ? "person-simple-run" : "trophy");

  // 表示タイトル
  let title = "";
  if (type === "tournament" || type === "tournament-match") {
    title = item.name || "(無題の大会)";
    if (item.level) title += ` ${item.level}`;
  } else if (type === "practice") {
    title = item.title || item.type || "練習";
  } else if (type === "trial") {
    const setting = [item.stringMain, item.stringCross].filter(Boolean).join(" / ");
    title = `${item.racketName}${setting ? ` × ${setting}` : ""}`;
  }

  // メタ行
  const metaParts = [];
  if (type === "tournament" || type === "tournament-match") {
    // 試合のスコアを集約 (このラケットで打った試合のみ)
    const matches = (item.matches || []).filter(m => m && (!racketName || m.racketName === racketName));
    if (matches.length > 0) {
      const scoreStrs = matches.map(m => _formatScores(m.setScores)).filter(Boolean);
      if (scoreStrs.length > 0) metaParts.push(scoreStrs.join(" / "));
    }
    if (item.venue) metaParts.push(item.venue);
  } else if (type === "practice") {
    if (item.duration) metaParts.push(`${item.duration} min`);
    if (item.venue) metaParts.push(item.venue);
  } else if (type === "trial") {
    // H-3 (Phase A 監査): UX4 で導入された linkedMatchIds[] も含めて連携判定
    const hasLinkedMatch = item.linkedMatchId || (Array.isArray(item.linkedMatchIds) && item.linkedMatchIds.length > 0);
    if (item.linkedPracticeId || hasLinkedMatch) metaParts.push("連携あり");
    if (item.venue) metaParts.push(item.venue);
  }

  // 結果バッジ (大会のみ)
  let badge = null;
  if (type === "tournament" || type === "tournament-match") {
    badge = _resultBadge(item.overallResult);
  }

  // 試打スコア (4 指標)
  let trialScores = null;
  if (type === "trial") {
    const fields = [
      { k: "confidence", label: "安心" },
      { k: "spin", label: "スピン" },
      { k: "power", label: "推進" },
      { k: "maneuver", label: "操作" },
    ];
    const vals = fields.filter(f => typeof item[f.k] === "number" && !isNaN(item[f.k]));
    if (vals.length > 0) trialScores = vals;
  }

  // メモ (type 別の memo フィールドを順に拾う、空でないもの)
  // S16 Phase 4-C-3: AI 要約 (memoSummaries.{fieldKey}) があれば本文の代わりにそれを表示
  //   要約は元の長い文を 1-2 行に圧縮したもの。なければ元の文を line-clamp 2 行で表示。
  const memos = [];
  const itemSummaries = item?.memoSummaries || {};
  const fields = _MEMO_FIELDS[type === "tournament-match" ? "tournament" : type] || [];
  fields.forEach(f => {
    const v = item[f.key];
    if (v && String(v).trim()) {
      const summary = itemSummaries[f.key];
      const display = summary && summary.trim() ? summary.trim() : String(v).trim();
      memos.push({ label: f.label, text: display, isSummary: !!(summary && summary.trim()) });
    }
  });
  // tournament の matches[] のメンタルメモなど (このラケットで打った match 由来のみ)
  if (type === "tournament" || type === "tournament-match") {
    (item.matches || []).forEach(m => {
      if (!m || (racketName && m.racketName !== racketName)) return;
      const matchSummaries = m?.memoSummaries || {};
      _MEMO_FIELDS.match.forEach(f => {
        const v = m[f.key];
        if (v && String(v).trim()) {
          const summary = matchSummaries[f.key];
          const display = summary && summary.trim() ? summary.trim() : String(v).trim();
          memos.push({
            label: `試合・${f.label}${m.round ? ` (${m.round})` : ""}`,
            text: display,
            isSummary: !!(summary && summary.trim()),
          });
        }
      });
    });
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${stripColor}`,
        borderRadius: RADIUS.row,
        padding: "11px 14px",
        marginBottom: 8,
        cursor: "pointer",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 3,
      }}>
        <Icon name={iconName} size={14} color={stripColor} weight="fill" />
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.textSecondary,
          fontVariantNumeric: "tabular-nums",
        }}>
          {_dateMD(item.date)}
        </span>
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 700, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 4,
            background: badge.bg, color: badge.color,
            ...(badge.border ? { border: `1px solid ${badge.border}` } : {}),
            whiteSpace: "nowrap",
          }}>
            {badge.label}
          </span>
        )}
      </div>
      {metaParts.length > 0 && (
        <div style={{
          fontSize: 11, color: C.textSecondary, lineHeight: 1.4,
        }}>
          {metaParts.join(" · ")}
        </div>
      )}
      {trialScores && (
        <div style={{
          marginTop: 4,
          fontSize: 11, color: C.textSecondary,
          fontVariantNumeric: "tabular-nums",
        }}>
          {trialScores.map((f, i) => (
            <span key={f.k}>
              {f.label} <span style={{ color: C.text, fontWeight: 600 }}>{Math.round(item[f.k] * 10) / 10}</span>
              {i < trialScores.length - 1 && <span style={{ color: C.textMuted }}> · </span>}
            </span>
          ))}
        </div>
      )}
      {memos.map((m, i) => (
        <div
          key={i}
          style={{
            marginTop: 6,
            padding: "6px 8px",
            background: C.panel2,
            borderRadius: 6,
            fontSize: "calc(11px * var(--memo-font-scale, 1))",
            color: C.text,
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <span style={{
            display: "inline-block",
            fontSize: "calc(9px * var(--memo-font-scale, 1))",
            fontWeight: 700,
            color: m.isSummary ? C.primary : C.textSecondary,
            marginRight: 5,
            letterSpacing: 0.04,
          }}>
            {m.isSummary ? "✨ " : ""}{m.label}
          </span>
          {m.text}
        </div>
      ))}
    </div>
  );
}
