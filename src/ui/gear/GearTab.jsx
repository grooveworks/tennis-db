// GearTab — 機材タブ (S16)
// WIREFRAMES_v4.md §2.8 / DECISIONS_v4.md S16 Phase 1 / Phase 4-A / Phase 4-B
//
// Decision Hub 方針: 「機材管理画面」ではなく「機材判断 Hub」。
// 5 セクション (上=判断、下=管理):
//   1. Current Setup           — Phase 4-B 実装済 (主力ラケット 1 件 + Display tier 数字 3)
//   2. Racket Board            — Phase 4-B 実装済 (status 6 種 segment + 行カード一覧)
//   3. Recent Trials           — Phase 4-C 実装予定
//   4. Open Questions          — Phase 4-C 実装予定
//   5. Manage Masters          — Phase 4-A で Strings 完全動作 / セッティング・引退は Phase 4-D

const _RACKET_STATUS_OPTIONS_FILTER = [
  { key: "all",         label: "すべて" },
  { key: "active",      label: "主力" },
  { key: "candidate",   label: "候補" },
  { key: "considering", label: "検討中" },
  { key: "sub",         label: "予備" },
  { key: "support",     label: "用途別" },
  { key: "retired",     label: "引退" },
];
const _RACKET_STATUS_LABELS = {
  active: "主力", sub: "予備", candidate: "候補", considering: "検討中", support: "用途別", retired: "引退",
};
const _RACKET_STATUS_BORDER = {
  active:      C.applePeach,
  sub:         C.appleMint,
  candidate:   C.primary,
  considering: C.appleGray4,
  support:     C.appleIndigo,
  retired:     C.textMuted,
};
const _RACKET_STATUS_CHIP_BG = {
  active:      "rgba(255,149,0,0.12)",
  sub:         "rgba(0,199,190,0.14)",
  candidate:   C.primaryLight,
  considering: C.panel2,
  support:     "rgba(88,86,214,0.10)",
  retired:     C.panel2,
};
const _RACKET_STATUS_CHIP_COLOR = {
  active: "#B26B00", sub: "#006B66", candidate: C.primary,
  considering: C.textSecondary, support: C.appleIndigo, retired: C.textMuted,
};

// 主力ラケットを 1 件特定 (status 優先度 → order ASC で先頭)
function _findMainRacket(rackets) {
  if (!Array.isArray(rackets) || rackets.length === 0) return null;
  const sorted = sortByStatusAndOrder(rackets, RACKET_STATUS_PRIORITY);
  return sorted[0] || null;
}

// 直近 30 日 / 通算 / 試合勝率 (RacketDetailView と同等のロジックを inline で計算)
function _computeUsage(racketName, tournaments, practices) {
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
      if (!m || m.racketName !== racketName) return;
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
  return { past30, total, winRate };
}

// CurrentSetupCard (主力ラケットの大カード、Display tier 数字 3)
function _CurrentSetupCard({ racket, usage }) {
  if (!racket) {
    return (
      <div style={{
        background: C.panel,
        border: `1px dashed ${C.border}`,
        borderRadius: RADIUS.card,
        padding: "16px 18px",
        marginBottom: 12,
        textAlign: "center",
        color: C.textMuted,
      }}>
        <Icon name="tennis-ball" size={20} color={C.textMuted} />
        <div style={{ fontSize: 12, marginTop: 6 }}>主力ラケットが未設定です</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>下の Racket Board でステータスを「主力」に設定してください</div>
      </div>
    );
  }
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.primaryLight} 0%, #fff 60%)`,
      border: `1px solid ${C.primaryLight}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px 16px",
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.04,
        color: C.primary, textTransform: "uppercase",
        marginBottom: 4,
      }}>
        Current Setup
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 2 }}>
        {racket.name || "(無名)"}
      </div>
      {(racket.currentString || racket.currentTension) && (
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>
          {[racket.currentString, racket.currentTension].filter(Boolean).join(" / ")}
        </div>
      )}
      <div style={{
        display: "flex", gap: 14,
        paddingTop: 10,
        borderTop: `1px solid rgba(0,122,255,0.18)`,
      }}>
        <_StatNum num={usage.past30} lbl="直近30日" />
        <_StatNum num={usage.total} lbl="通算使用" />
        <_StatNum num={usage.winRate == null ? null : `${usage.winRate}%`} lbl="試合勝率" />
      </div>
    </div>
  );
}

function _StatNum({ num, lbl }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {num == null || num === "" ? "—" : num}
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{lbl}</div>
    </div>
  );
}

// Status segment (横スクロール pill)
function _StatusSegment({ rackets, current, onChange }) {
  const counts = (status) => {
    if (status === "all") return (rackets || []).length;
    return (rackets || []).filter(r => r && r.status === status).length;
  };
  return (
    <div style={{
      display: "flex", gap: 6,
      overflowX: "auto",
      margin: "-2px -2px 10px", padding: 2,
      scrollbarWidth: "none",
    }}>
      {_RACKET_STATUS_OPTIONS_FILTER.map(opt => {
        const active = current === opt.key;
        const c = counts(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              flexShrink: 0,
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: active ? C.primary : C.panel2,
              color: active ? "#fff" : C.textSecondary,
              border: "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {opt.label}
            <span style={{ opacity: active ? 0.85 : 0.6, marginLeft: 3, fontWeight: 500 }}>{c}</span>
          </button>
        );
      })}
    </div>
  );
}

// RacketRow (中行カード、border-left status 色)
function _RacketRow({ racket, onClick }) {
  const status = racket.status || "candidate";
  const isMuted = status === "retired";
  const showNextCheck = (status === "candidate" || status === "considering") && (racket.nextCheck || "").trim();

  return (
    <div
      onClick={onClick}
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${_RACKET_STATUS_BORDER[status]}`,
        borderRadius: RADIUS.row,
        padding: "12px 14px",
        marginBottom: 8,
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
        opacity: isMuted ? 0.65 : 1,
      }}
    >
      <div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: C.text,
          marginBottom: 3, display: "flex", alignItems: "center", gap: 6,
        }}>
          {racket.name || "(無名)"}
          <span style={{
            fontSize: 10, fontWeight: 600,
            padding: "2px 7px", borderRadius: 6,
            background: _RACKET_STATUS_CHIP_BG[status],
            color: _RACKET_STATUS_CHIP_COLOR[status],
          }}>
            {_RACKET_STATUS_LABELS[status] || status}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.4 }}>
          {[racket.currentString, racket.currentTension].filter(Boolean).join(" / ") || (racket.role || "")}
        </div>
        {showNextCheck && (
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.primary,
            marginTop: 5, display: "inline-flex", alignItems: "center", gap: 4,
            letterSpacing: -0.01,
          }}>
            <Icon name="target" size={13} color={C.primary} />
            次: {racket.nextCheck}
          </div>
        )}
      </div>
      <Icon name="caret-right" size={18} color={C.textMuted} />
    </div>
  );
}

function GearTab({
  rackets, strings, stringSetups, trials, tournaments, practices, next,
  onStringsUpdate, onStringEdit, onStringAdd,
  onRacketRowClick, onRacketAdd,
  toast,
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const mainRacket = _findMainRacket(rackets);
  const mainUsage = mainRacket ? _computeUsage(mainRacket.name, tournaments, practices) : { past30: 0, total: 0, winRate: null };

  // 表示用にソート (status 優先度 → order ASC) + status filter
  const sortedRackets = sortByStatusAndOrder(rackets || [], RACKET_STATUS_PRIORITY);
  const filteredRackets = statusFilter === "all"
    ? sortedRackets
    : sortedRackets.filter(r => r && r.status === statusFilter);

  return (
    <div style={{
      flex: 1,
      overflow: "auto",
      padding: 14,
      background: C.bg,
    }}>
      {/* 1. Current Setup */}
      <_CurrentSetupCard racket={mainRacket} usage={mainUsage} />

      {/* 2. Racket Board */}
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.card,
        padding: "14px 16px 16px",
        marginBottom: 12,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10, gap: 8, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="list-bullets" size={16} color={C.textSecondary} />
            Racket Board
          </div>
          <button
            type="button"
            onClick={onRacketAdd}
            style={{
              background: "transparent", border: "none", padding: 0,
              color: C.primary, fontSize: 11, fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}
          >
            <Icon name="plus" size={13} /> 追加
          </button>
        </div>
        <_StatusSegment rackets={rackets} current={statusFilter} onChange={setStatusFilter} />
        {filteredRackets.length === 0 ? (
          <div style={{
            padding: "20px 0", textAlign: "center",
            color: C.textMuted, fontSize: 12,
          }}>
            {(rackets || []).length === 0
              ? "ラケットがまだ登録されていません"
              : `「${_RACKET_STATUS_OPTIONS_FILTER.find(o => o.key === statusFilter)?.label || statusFilter}」 のラケットはありません`}
          </div>
        ) : (
          filteredRackets.map(r => (
            <_RacketRow key={r.id} racket={r} onClick={() => onRacketRowClick(r)} />
          ))
        )}
      </div>

      {/* 3. Recent Trials (Phase 4-C) */}
      <_GearPlaceholderCard icon="tennis-ball" title="Recent Trials" stage="Phase 4-C" />

      {/* 4. Open Questions (Phase 4-C) */}
      <_GearPlaceholderCard icon="question" title="Open Questions" stage="Phase 4-C" />

      {/* 5. Manage Masters - Phase 4-A: Strings 動作 / Phase 4-D: Setups + Retired */}
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: C.textMuted,
        textTransform: "uppercase", letterSpacing: 0.04,
        margin: "8px 4px 8px 4px",
      }}>
        Manage Masters
      </div>

      <StringsSection
        strings={strings}
        onUpdate={onStringsUpdate}
        onEdit={onStringEdit}
        onAdd={onStringAdd}
        toast={toast}
      />

      {/* セッティング組合せ + 引退ラケット は Phase 4-D で実装 */}
      <_GearPlaceholderCard icon="stack" title="セッティング組合せ" stage="Phase 4-D" />
      <_GearPlaceholderCard icon="archive" title="引退ラケット" stage="Phase 4-D" />
    </div>
  );
}

function _GearPlaceholderCard({ icon, title, stage }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px dashed ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "16px 18px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: C.textMuted,
    }}>
      <Icon name={icon} size={20} color={C.textMuted} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>{title}</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>{stage} で実装予定</div>
      </div>
    </div>
  );
}
