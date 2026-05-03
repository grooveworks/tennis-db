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

// H-23 (Phase A 監査): domain/match_helpers.js computeRacketUsage に集約済
//   旧の inline 実装は H-9 の result 正規化反映漏れ + RacketDetailView と微妙な差異があった
//   現在は単一の純関数を共有 (計算結果の一貫性保証)

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
        <div style={{ fontSize: 11, marginTop: 2 }}>下の「ラケット一覧」でステータスを「主力」に設定してください</div>
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
        現在の主力
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

// 試打サマリ行 (Recent Trials)
function _RecentTrialRow({ trial, onClick }) {
  const dateMD = (() => {
    if (!trial?.date) return "";
    const parts = trial.date.split("-");
    if (parts.length < 3) return trial.date;
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  })();
  const setting = [trial.stringMain, trial.stringCross].filter(Boolean).join(" / ");
  const ttl = setting ? `${trial.racketName || ""} × ${setting}` : (trial.racketName || "(無名)");
  // 4 指標
  const metrics = [
    { k: "confidence", label: "安心" },
    { k: "spin",       label: "スピン" },
    { k: "power",      label: "推進" },
    { k: "maneuver",   label: "操作" },
  ].filter(m => typeof trial[m.k] === "number" && !isNaN(trial[m.k]));
  // 判定 chip
  const judg = trial.judgment || "";
  const judgStyle = judg === "採用候補" ? { bg: C.primaryLight, color: C.primary }
                  : judg === "採用" ? { bg: C.successLight, color: "#0a5b35" }
                  : judg === "却下" ? { bg: C.errorLight, color: C.error }
                  : { bg: C.panel2, color: C.textSecondary };
  return (
    <div
      onClick={onClick}
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.row,
        padding: "11px 14px",
        marginBottom: 8,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums", width: 36, flexShrink: 0 }}>{dateMD}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3,
          lineHeight: 1.35, wordBreak: "break-word" }}>
          {ttl}
        </div>
        {metrics.length > 0 && (
          <div style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: "tabular-nums",
            lineHeight: 1.5, wordBreak: "keep-all" }}>
            {metrics.map((m, i) => (
              <span key={m.k} style={{ whiteSpace: "nowrap" }}>
                {m.label} <span style={{ color: C.text, fontWeight: 600 }}>{Math.round(trial[m.k] * 10) / 10}</span>
                {i < metrics.length - 1 && <span style={{ color: C.textMuted }}> · </span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {judg && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
          background: judgStyle.bg, color: judgStyle.color, whiteSpace: "nowrap",
        }}>{judg}</span>
      )}
    </div>
  );
}

// 機材関連の Next 項目を判定
//   - ラケット名 / ストリング名は **トークン分割で部分一致**
//     (ユーザーは「HEAD Boom Pro 2026」のフルネームでなく「Boom Pro」のような短縮形で書く)
//     全角スペース・半角スペース・「/」「+」「・」で分割、3 文字以上のトークンを比較対象
//   - 機材キーワード (ラケット / テンション / 試打 / 張替 等) も拾う
function _isGearRelatedNext(item, rackets, strings) {
  if (!item) return false;
  const text = `${item.label || ""} ${item.detail || ""} ${item.category || ""}`.toLowerCase();
  if (!text.trim()) return false;

  const tokenize = (s) => String(s || "")
    .toLowerCase()
    .split(/[\s\/\+・]+/)
    .filter(t => t && t.length >= 3);

  for (const r of (rackets || [])) {
    if (!r?.name) continue;
    for (const tok of tokenize(r.name)) {
      if (text.includes(tok)) return true;
    }
  }
  for (const s of (strings || [])) {
    if (!s?.name) continue;
    for (const tok of tokenize(s.name)) {
      if (text.includes(tok)) return true;
    }
  }
  if (text.includes("ラケット") || text.includes("テンション")
   || text.includes("ストリング") || text.includes("ガット")
   || text.includes("試打") || text.includes("張替")
   || text.includes("実打") || text.includes("検証")) return true;
  return false;
}

function GearTab({
  rackets, strings, stringSetups, trials, tournaments, practices, next,
  onStringsUpdate, onStringEdit, onStringAdd,
  onRacketRowClick, onRacketAdd,
  onCardClick,
  toast,
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  // S16.9 perf: 重い計算 (全 session 走査) を useMemo でキャッシュ。
  //   依存変数が変わった時だけ再計算、毎レンダーでの再走査を防ぐ。
  const mainRacket = useMemo(() => _findMainRacket(rackets), [rackets]);
  const mainUsage = useMemo(
    () => mainRacket ? computeRacketUsage(mainRacket.name, tournaments, practices) : { past30: 0, total: 0, winRate: null },
    [mainRacket?.name, tournaments, practices]
  );
  const sortedRackets = useMemo(
    () => sortByStatusAndOrder(rackets || [], RACKET_STATUS_PRIORITY),
    [rackets]
  );
  const filteredRackets = useMemo(
    () => statusFilter === "all" ? sortedRackets : sortedRackets.filter(r => r && r.status === statusFilter),
    [sortedRackets, statusFilter]
  );

  // Recent Trials: 最新 3 件 (date 降順)
  const recentTrials = useMemo(() => {
    return (trials || []).filter(t => t && t.date)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : (a.date > b.date ? -1 : 0)))
      .slice(0, 3);
  }, [trials]);

  // Open Questions: 機材関連の next 項目 (未完了)
  const openQuestions = useMemo(() => {
    return (next || []).filter(n => n && !n.done && _isGearRelatedNext(n, rackets, strings));
  }, [next, rackets, strings]);

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
            ラケット一覧
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

      {/* 3. Recent Trials (最新 3 件、新しい順) */}
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
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="tennis-ball" size={16} color={C.textSecondary} />
            最近の試打
          </div>
        </div>
        {recentTrials.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0", textAlign: "center" }}>試打の記録はまだありません</div>
        ) : (
          recentTrials.map(tr => (
            <_RecentTrialRow key={tr.id} trial={tr} onClick={() => onCardClick && onCardClick("trial", tr)} />
          ))
        )}
      </div>

      {/* 4. Open Questions (next state を機材関連でフィルタ、未完了のみ) */}
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
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="question" size={16} color={C.textSecondary} />
            未解決の課題
          </div>
        </div>
        {openQuestions.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0", textAlign: "center" }}>未解決の機材判断はありません</div>
        ) : (
          openQuestions.map(n => (
            <div key={n.id} style={{
              background: C.warningLight,
              border: "1px solid #f7d77a",
              borderRadius: RADIUS.row,
              padding: "11px 14px",
              marginBottom: 8,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}>
              <Icon name="warning-circle" size={16} color="#7e5d00" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                  {n.label || "(タイトル未設定)"}
                </div>
                {(n.detail || n.category) && (
                  <div style={{ fontSize: 10, color: "#7e5d00", marginTop: 2, lineHeight: 1.4,
                    overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {n.detail || n.category}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Manage Masters - Phase 4-A: Strings 動作 / Phase 4-D: Setups + Retired */}
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: C.textMuted,
        textTransform: "uppercase", letterSpacing: 0.04,
        margin: "8px 4px 8px 4px",
      }}>
        マスタ管理
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
