// RacketDetailView — Racket の詳細画面 (slide-in、Sessions の SessionDetailView と同じ overlay パターン)
// WIREFRAMES_v4.md §2.8.3 / DESIGN_SYSTEM_v4.md §8.6 / DECISIONS S16
//
// 順序 (上から):
//   1. Summary (status 背景の大カード、tagline)
//   2. Current Setting (kv-grid)
//   3. Trial Summary (avg-bar 4 指標)
//   4. Decision Notes (継続理由 / 不安点 / 次回確認、3 種色帯)
//   5. Usage (Display tier 数字 3 つ: 直近30日 / 通算 / 試合勝率)
//   6. Measurements (現行 1 件は緑強調、履歴一覧、追加・編集・削除)
//
// Action bar 下部: 編集 / 試打追加 / 引退化 / 削除 (危険度の昇順)
//
// 「次の確認」の 1 行は候補 / 検討中 のみ Summary 内に表示。

const _STATUS_BG = {
  active:      `linear-gradient(135deg, rgba(255,149,0,0.10) 0%, #fff 60%)`,
  sub:         `linear-gradient(135deg, rgba(0,199,190,0.10) 0%, #fff 60%)`,
  candidate:   `linear-gradient(135deg, rgba(0,122,255,0.10) 0%, #fff 60%)`,
  considering: `linear-gradient(135deg, rgba(199,199,204,0.18) 0%, #fff 60%)`,
  support:     `linear-gradient(135deg, rgba(88,86,214,0.10) 0%, #fff 60%)`,
  retired:     `linear-gradient(135deg, rgba(128,134,139,0.10) 0%, #fff 60%)`,
};
const _STATUS_BORDER = {
  active:      `rgba(255,149,0,0.20)`,
  sub:         `rgba(0,199,190,0.20)`,
  candidate:   `rgba(0,122,255,0.20)`,
  considering: `rgba(199,199,204,0.30)`,
  support:     `rgba(88,86,214,0.20)`,
  retired:     `rgba(128,134,139,0.20)`,
};
const _STATUS_LABELS = {
  active: "主力", sub: "予備", candidate: "候補", considering: "検討中", support: "用途別", retired: "引退",
};
const _STATUS_CHIP_BG = {
  active:      "rgba(255,149,0,0.16)",
  sub:         "rgba(0,199,190,0.18)",
  candidate:   "var(--primaryLight)",
  considering: "var(--panel2)",
  support:     "rgba(88,86,214,0.14)",
  retired:     "var(--panel2)",
};
const _STATUS_CHIP_COLOR = {
  active: "#B26B00", sub: "#006B66", candidate: "var(--primary)",
  considering: "var(--textSec)", support: "var(--appleIndigo)", retired: "var(--textMuted)",
};

// Trial 17 項目から「判断に効く」4 指標を平均化 (DESIGN_SYSTEM §8.6.6 / WIREFRAMES §2.8.3)
function _computeTrialAvgs(trials, racketName) {
  if (!racketName) return { n: 0, confidence: null, power: null, spin: null, maneuver: null };
  const matched = (trials || []).filter(t => t && t.racketName === racketName);
  if (matched.length === 0) return { n: 0, confidence: null, power: null, spin: null, maneuver: null };
  const avg = (key) => {
    const vals = matched.map(t => t[key]).filter(v => typeof v === "number" && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    n: matched.length,
    confidence: avg("confidence"),
    power: avg("power"),
    spin: avg("spin"),
    maneuver: avg("maneuver"),
  };
}

// Usage 統計 (Sessions から逆引き)
//   - past30: 直近 30 日の使用回数 (tournaments + practices, racketName 一致)
//   - total: 通算回数
//   - winRate: tournaments の matches[] で result === "win" / "勝" 率 (% 整数、null なら "—")
function _computeRacketUsage(racketName, tournaments, practices) {
  if (!racketName) return { past30: 0, total: 0, winRate: null };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t30 = new Date(today); t30.setDate(t30.getDate() - 30);
  const inLast30 = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= t30;
  };

  let past30 = 0, total = 0, wins = 0, matchTotal = 0;
  (tournaments || []).forEach(t => {
    const used = (t.racketName === racketName)
      || (Array.isArray(t.matches) && t.matches.some(m => m && m.racketName === racketName));
    if (used) {
      total++;
      if (inLast30(t.date)) past30++;
    }
    (t.matches || []).forEach(m => {
      if (!m) return;
      if (m.racketName !== racketName) return;
      matchTotal++;
      const r = (m.result || "").toLowerCase();
      if (r === "win" || r === "勝" || r === "勝利") wins++;
    });
  });
  (practices || []).forEach(p => {
    if (p.racketName !== racketName) return;
    total++;
    if (inLast30(p.date)) past30++;
  });
  const winRate = matchTotal > 0 ? Math.round((wins / matchTotal) * 100) : null;
  return { past30, total, winRate, matchTotal };
}

// avg-bar (Trial Summary 用)
function _AvgBar({ label, value, max = 5 }) {
  const filled = value == null ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 30px", gap: 10, alignItems: "center", marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: C.textSecondary }}>{label}</div>
      <div style={{ height: 6, background: C.panel2, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${filled}%`, background: C.primary, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 11, color: C.text, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {value == null ? "—" : value.toFixed(1)}
      </div>
    </div>
  );
}

// Decision Note item
function _DeciNote({ kind, label, icon, value }) {
  const colorMap = {
    keep: C.practiceAccent, worry: "#7e5d00", next: C.primary,
  };
  const color = colorMap[kind];
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      padding: "8px 10px 8px 12px",
      borderRadius: "0 10px 10px 0",
      marginBottom: 8,
      background: C.panel2,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon name={icon} size={12} color={color} />
        {label}
      </div>
      <div style={{
        fontSize: "calc(12px * var(--memo-font-scale, 1))",
        color: C.text,
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
      }}>
        {value || <span style={{ color: C.textMuted }}>—</span>}
      </div>
    </div>
  );
}

// SectionCard (大カード)
function _SecCard({ icon, title, more, onMore, children }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px 16px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {icon && <Icon name={icon} size={16} color={C.textSecondary} />}
          {title}
        </div>
        {more && (
          <button type="button" onClick={onMore} style={{
            fontSize: 11, color: C.primary, fontWeight: 600,
            background: "transparent", border: "none", padding: 0, cursor: "pointer",
          }}>
            {more}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RacketDetailView({
  open, racket,
  rackets, trials, tournaments, practices,
  onClose, onEdit, onDelete, onRetire, onAddTrial,
  onMeasurementEdit, onMeasurementAdd,
}) {
  // history.pushState 連動 (Sessions と同じ pattern)
  // open=true のときに pushState、popstate で onClose
  useEffect(() => {
    if (!open) return;
    try { window.history.pushState({ tdb: "gear-detail" }, ""); } catch (_) {}
    const handler = (e) => { onClose && onClose(); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, racket?.id]);

  const handleBack = () => {
    try { window.history.back(); } catch (_) { onClose && onClose(); }
  };

  if (!open || !racket) return null;

  const status = racket.status || "candidate";
  const trialAvgs = _computeTrialAvgs(trials, racket.name);
  const usage = _computeRacketUsage(racket.name, tournaments, practices);

  // Measurements: current=true を最上段に、その他は配列順で
  const measurements = Array.isArray(racket.measurements) ? racket.measurements : [];
  const sortedMeas = [
    ...measurements.filter(m => m && m.current),
    ...measurements.filter(m => !m || !m.current),
  ];

  // 「次の確認」1 行は候補 / 検討中 のみ
  const showNextCheck = (status === "candidate" || status === "considering") && (racket.nextCheck || "").trim();

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: C.bg,
      zIndex: 100, // TabBar (zIndex 60) より上に重ねる、SessionDetailView と統一
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
          fontSize: 14, fontWeight: 600, color: C.text,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {racket.name || "(無名)"}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, paddingRight: 12 }}>
          機材 / 詳細
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflow: "auto", padding: 14, background: C.bg,
      }}>
        {/* 1. Summary */}
        <div style={{
          background: _STATUS_BG[status] || _STATUS_BG.candidate,
          border: `1px solid ${_STATUS_BORDER[status] || _STATUS_BORDER.candidate}`,
          borderRadius: RADIUS.card,
          padding: "14px 16px 14px",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>
            {racket.name || "(無名)"}
          </div>
          {(racket.role || "").trim() && (
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
              {racket.role}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
              background: _STATUS_CHIP_BG[status],
              color: _STATUS_CHIP_COLOR[status],
            }}>
              {_STATUS_LABELS[status] || status}
            </span>
            {(racket.face || racket.beam) && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
                background: C.panel2, color: C.textSecondary,
              }}>
                {[racket.face, racket.beam].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {showNextCheck && (
            <div style={{
              marginTop: 10,
              fontSize: 12, fontWeight: 600, color: C.primary,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Icon name="target" size={14} color={C.primary} />
              次: {racket.nextCheck}
            </div>
          )}
        </div>

        {/* 2. Current Setting */}
        <_SecCard icon="gear-six" title="Current Setting">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            <_KV k="ストリング" v={racket.currentString} />
            <_KV k="テンション" v={racket.currentTension} />
            <_KV k="フェイス" v={racket.face} />
            <_KV k="ビーム" v={racket.beam} />
            <_KV k="フレーム重量" v={racket.weight} />
            <_KV k="フレームバランス" v={racket.balance} />
          </div>
        </_SecCard>

        {/* 3. Trial Summary */}
        <_SecCard icon="chart-bar" title="Trial Summary" more={trialAvgs.n ? `n = ${trialAvgs.n}` : null}>
          {trialAvgs.n === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "8px 0" }}>
              このラケットの試打評価はまだありません
            </div>
          ) : (
            <>
              <_AvgBar label="安心感" value={trialAvgs.confidence} />
              <_AvgBar label="推進力" value={trialAvgs.power} />
              <_AvgBar label="スピン" value={trialAvgs.spin} />
              <_AvgBar label="操作性" value={trialAvgs.maneuver} />
            </>
          )}
        </_SecCard>

        {/* 4. Decision Notes (Usage より上、判断主役) */}
        <_SecCard icon="note-pencil" title="Decision Notes" more="編集" onMore={() => onEdit(racket)}>
          <_DeciNote kind="keep"  label="継続理由" icon="check-circle" value={racket.decisionKeep} />
          <_DeciNote kind="worry" label="不安点"   icon="warning"      value={racket.decisionWorry} />
          <_DeciNote kind="next"  label="次回確認" icon="arrow-bend-up-right" value={racket.decisionNext} />
        </_SecCard>

        {/* 5. Usage */}
        <_SecCard icon="chart-line" title="Usage">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <_StatBlock num={usage.past30} unit="回" lbl="直近30日" />
            <_StatBlock num={usage.total} unit="回" lbl="通算" />
            <_StatBlock num={usage.winRate} unit="%" lbl={`試合勝率${usage.matchTotal ? ` (${usage.matchTotal})` : ""}`} />
          </div>
        </_SecCard>

        {/* 6. Measurements */}
        <_SecCard icon="ruler" title="Measurements" more="+ 追加" onMore={() => onMeasurementAdd(racket)}>
          {sortedMeas.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "8px 0" }}>
              実測値の記録はまだありません
            </div>
          ) : (
            sortedMeas.map((m) => (
              <div
                key={m.id}
                onClick={() => onMeasurementEdit(racket, m)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 8,
                  padding: m.current ? "8px 10px" : "8px 0",
                  margin: m.current ? "0 -10px 6px" : "0",
                  borderTop: m.current ? "none" : `1px solid ${C.divider}`,
                  borderRadius: m.current ? 8 : 0,
                  background: m.current ? C.successLight : "transparent",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
                  {m.state || "(状態未入力)"}
                  {m.current && (
                    <span style={{
                      display: "inline-block", marginLeft: 4,
                      fontSize: 9, fontWeight: 700, color: C.success,
                      background: "rgba(15,157,88,0.14)",
                      padding: "1px 5px", borderRadius: 4,
                    }}>
                      CURRENT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {[m.weight, m.balance, (m.gripW && m.gripT) ? `${m.gripW}×${m.gripT}` : null].filter(Boolean).join(" / ") || "—"}
                </div>
                <Icon name="pencil-simple-line" size={16} color={C.textMuted} />
              </div>
            ))
          )}
        </_SecCard>

        {/* Action bar (危険度の昇順) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          padding: "10px 0 24px",
        }}>
          <_ActBtn icon="pencil-simple-line" label="編集" onClick={() => onEdit(racket)} />
          <_ActBtn icon="tennis-ball" label="試打追加" onClick={() => onAddTrial(racket)} />
          <_ActBtn icon="archive" label={status === "retired" ? "復帰" : "引退化"} onClick={() => onRetire(racket)} />
          <_ActBtn icon="trash" label="削除" danger onClick={() => onDelete(racket)} />
        </div>
      </div>
    </div>
  );
}

function _KV({ k, v }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 1 }}>{k}</div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v || "—"}</div>
    </div>
  );
}

function _StatBlock({ num, unit, lbl }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {num == null ? "—" : num}
        {num != null && unit && <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{lbl}</div>
    </div>
  );
}

function _ActBtn({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "10px 4px",
        background: C.panel2,
        border: "none",
        borderRadius: 12,
        color: danger ? C.error : C.text,
        fontSize: 10, fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={18} color={danger ? C.error : C.textSecondary} />
      {label}
    </button>
  );
}
