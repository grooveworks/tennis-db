// SettingHistorySection — Racket Detail 内のストリングセッティング履歴セクション
// settingHistory.js (純関数 computeSettingHistory) で集約した塊を行表示
// 行タップで Period Detail (slide-in) が開く

function SettingHistorySection({ racket, tournaments, practices, trials, onPeriodClick }) {
  const history = computeSettingHistory(racket?.name, tournaments, practices, trials);

  if (history.length === 0) {
    return (
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.card,
        padding: "14px 16px 16px",
        marginBottom: 12,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 6,
          fontSize: 13, fontWeight: 700, color: C.text,
        }}>
          <Icon name="clock-counter-clockwise" size={16} color={C.textSecondary} />
          張替の履歴
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0", textAlign: "center" }}>
          このラケットの使用記録はまだありません
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px 16px",
      marginBottom: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name="clock-counter-clockwise" size={16} color={C.textSecondary} />
          張替の履歴
        </div>
        <span style={{ fontSize: 11, color: C.textMuted }}>{history.length} 期間</span>
      </div>

      {history.map((h, idx) => (
        <div
          key={`${h.startDate}-${h.endDate}-${idx}`}
          onClick={() => onPeriodClick(racket, h)}
          style={{
            background: h.isCurrent
              ? `linear-gradient(135deg, rgba(0,122,255,0.06) 0%, #fff 70%)`
              : C.panel,
            border: `1px solid ${h.isCurrent ? "rgba(0,122,255,0.25)" : C.border}`,
            borderRadius: RADIUS.row,
            padding: "11px 14px",
            marginBottom: 8,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: 3,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: C.textSecondary,
                fontVariantNumeric: "tabular-nums",
              }}>
                {_formatPeriod(h.startDate, h.endDate, h.isCurrent)}
              </span>
              {h.isCurrent && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  background: C.primary,
                  padding: "2px 6px", borderRadius: 4,
                  letterSpacing: 0.04,
                }}>
                  使用中
                </span>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: C.text,
              lineHeight: 1.35,
              marginBottom: 2,
              ...(h.settingSig === "__empty__" ? { color: C.textMuted } : {}),
            }}>
              {h.settingLabel}
            </div>
            <div style={{
              fontSize: 11, color: C.textSecondary,
              fontVariantNumeric: "tabular-nums",
            }}>
              {_formatStats(h)}
            </div>
          </div>
          <Icon name="caret-right" size={16} color={C.textMuted} />
        </div>
      ))}
    </div>
  );
}

// 期間表示: "2026-04 〜 現在" or "2025-08 〜 2026-04"
function _formatPeriod(startDate, endDate, isCurrent) {
  const start = (startDate || "").substring(0, 7); // YYYY-MM
  if (isCurrent) return `${start} 〜 現在`;
  const end = (endDate || "").substring(0, 7);
  return start === end ? start : `${start} 〜 ${end}`;
}

// 統計表示: "練習 6 · 試合 4 · 試打 2"
function _formatStats(h) {
  const parts = [];
  if (h.practiceCount > 0) parts.push(`練習 ${h.practiceCount}`);
  if (h.tournamentCount > 0) parts.push(`試合 ${h.tournamentCount}`);
  if (h.trialCount > 0) parts.push(`試打 ${h.trialCount}`);
  return parts.join(" · ") || "—";
}
