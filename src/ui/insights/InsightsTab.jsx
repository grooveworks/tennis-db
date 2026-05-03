// InsightsTab — 分析タブ (S18 初実装)
//
// 役割 (REQUIREMENTS_v4 F5):
//   F5.1 スタッツ集計 (勝率、種別別、期間別)
//   F5.2 メンタル・フィジカルの推移
//
// 構成 (上から順):
//   1. 期間チップ (今月 / 直近3ヶ月 / 全期間)
//   2. 全体サマリー (大会数 / 試合数 / 勝率 / 練習回数)
//   3. メンタル / フィジカル平均 (試合 mental・physical の avg)
//   4. 機材別勝率 (ラケット top 5、勝/負/勝率)
//   5. 対戦相手別戦績 (top 5 対戦数順、N勝 N敗)
//
// 設計方針:
//   - 純関数で集計 (useMemo で期間 / data 変化のみ再計算)
//   - 試合 (match) は tournaments[].matches[] から flat に走査
//   - 勝率は win/(win+loss)、棄権・null は除外
//   - 期間フィルタは tournament.date を基準 (matches に個別 date がないため)

const _IS_DAY_MS = 1000 * 60 * 60 * 24;
const _isToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const _isDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const _isMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
};

const _IS_PERIODS = [
  { v: "month",   label: "今月" },
  { v: "90d",     label: "直近 3 ヶ月" },
  { v: "all",     label: "全期間" },
];

// 期間範囲 [from, to] (両端 inclusive、ISO YYYY-MM-DD)
const _isPeriodRange = (period) => {
  const to = _isToday();
  if (period === "month") return [_isMonthStart(), to];
  if (period === "90d")   return [_isDaysAgo(89),  to];
  return ["0000-00-00", to]; // all
};

// 期間で session をフィルタ
const _isFilterByPeriod = (sessions, [from, to]) => {
  return (sessions || []).filter(s => {
    if (!s || !s.date) return false;
    const nd = normDate(s.date);
    return nd >= from && nd <= to;
  });
};

// 全試合を flat 配列で取得 (tournament の date を match に付与)
const _isFlattenMatches = (tournaments) => {
  const out = [];
  for (const t of (tournaments || [])) {
    if (!t || !Array.isArray(t.matches)) continue;
    for (const m of t.matches) {
      if (!m) continue;
      out.push({ ...m, _date: t.date, _tournamentName: t.name });
    }
  }
  return out;
};

// 勝率計算 (棄権 / null は除外)
const _isWinRate = (matches) => {
  let win = 0, loss = 0;
  for (const m of matches) {
    if (m.result === "勝利") win++;
    else if (m.result === "敗北") loss++;
  }
  const total = win + loss;
  return { win, loss, total, rate: total > 0 ? Math.round((win / total) * 100) : null };
};

// 平均値計算 (1-5 rating、無効値は除外)
const _isAvgRating = (items, key) => {
  let sum = 0, cnt = 0;
  for (const x of items) {
    const v = x && x[key];
    if (typeof v !== "number" || isNaN(v) || v < 1 || v > 5) continue;
    sum += v; cnt++;
  }
  return cnt > 0 ? (sum / cnt) : null;
};

// ── ラケット別集計 (試合数 ≥ 1)
const _isStatsByRacket = (matches) => {
  const map = new Map();
  for (const m of matches) {
    const name = (m.racketName || "").trim();
    if (!name) continue;
    let s = map.get(name);
    if (!s) { s = { name, win: 0, loss: 0 }; map.set(name, s); }
    if (m.result === "勝利") s.win++;
    else if (m.result === "敗北") s.loss++;
  }
  return [...map.values()]
    .map(s => ({ ...s, total: s.win + s.loss, rate: (s.win + s.loss) > 0 ? Math.round(s.win / (s.win + s.loss) * 100) : null }))
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);
};

// ── 対戦相手別集計
const _isStatsByOpponent = (matches) => {
  const map = new Map();
  for (const m of matches) {
    const opps = [m.opponent, m.opponent2].map(o => (o || "").trim()).filter(Boolean);
    for (const name of opps) {
      let s = map.get(name);
      if (!s) { s = { name, win: 0, loss: 0, lastDate: null }; map.set(name, s); }
      if (m.result === "勝利") s.win++;
      else if (m.result === "敗北") s.loss++;
      else continue;
      if (m._date && (!s.lastDate || m._date > s.lastDate)) s.lastDate = m._date;
    }
  }
  return [...map.values()]
    .map(s => ({ ...s, total: s.win + s.loss, rate: (s.win + s.loss) > 0 ? Math.round(s.win / (s.win + s.loss) * 100) : null }))
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);
};

// ── 月別勝率 (直近 6 ヶ月、棒グラフ用)
const _isMonthlyWinRate = (matches) => {
  const out = []; // [{ ym, win, loss, rate }]
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    let win = 0, loss = 0;
    for (const m of matches) {
      if (!m._date) continue;
      const md = normDate(m._date);
      if (!md || md.slice(0, 7) !== ym) continue;
      if (m.result === "勝利") win++;
      else if (m.result === "敗北") loss++;
    }
    const total = win + loss;
    out.push({
      ym, win, loss, total,
      rate: total > 0 ? Math.round(win / total * 100) : null,
      label: `${d.getMonth()+1}月`,
    });
  }
  return out;
};

// ── 共通: 大数字スタッツ
function _IsStatBox({ num, unit, label, color, sub }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "8px 4px" }}>
      <div style={{
        fontSize: 28, fontWeight: 800, color: color || C.text,
        lineHeight: 1, fontFeatureSettings: '"tnum"',
      }}>
        {num}
        {unit && <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 2, color: "inherit" }}>{unit}</span>}
      </div>
      <div style={{
        fontSize: 10, color: C.textMuted, fontWeight: 600,
        letterSpacing: 0.4, textTransform: "uppercase", marginTop: 6,
      }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ── レーティング (★型 → bar 型に簡略化)
function _IsRatingBar({ value, max = 5, color }) {
  const pct = value != null ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1, height: 6, background: C.bg, borderRadius: 3,
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: color || C.primary,
          transition: "width 200ms",
        }} />
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: C.text, minWidth: 36, textAlign: "right",
        fontFeatureSettings: '"tnum"',
      }}>
        {value != null ? value.toFixed(1) : "—"}
      </div>
    </div>
  );
}

// ── 月別勝率 mini chart (テキスト + bar)
function _IsMonthlyChart({ months }) {
  const maxRate = Math.max(...months.map(m => m.rate || 0), 50);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100, marginTop: 10 }}>
      {months.map(m => {
        const h = m.rate != null ? Math.max(4, Math.round((m.rate / 100) * 80)) : 4;
        const color = m.rate == null ? C.appleGray4
                   : m.rate >= 60 ? "#34C759"
                   : m.rate >= 40 ? "#FF9500"
                   :                "#FF3B30";
        return (
          <div key={m.ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              fontSize: 10, color: m.rate != null ? C.text : C.textMuted, fontWeight: 600,
              fontFeatureSettings: '"tnum"',
            }}>{m.rate != null ? `${m.rate}%` : "—"}</div>
            <div style={{
              width: "100%", height: h, background: color, borderRadius: 3,
              transition: "height 200ms",
            }} />
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── ランキング行 (ラケット / 対戦相手共通)
function _IsRankRow({ rank, name, win, loss, rate, sub }) {
  const rateColor = rate == null ? C.textMuted
                  : rate >= 60   ? "#34C759"
                  : rate >= 40   ? "#FF9500"
                  :                "#FF3B30";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 4px",
      borderBottom: `1px solid ${C.bg}`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        background: rank <= 3 ? C.primary : C.appleGray4,
        color: "#fff", fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, fontFeatureSettings: '"tnum"', minWidth: 56, textAlign: "right" }}>
        {win}勝 {loss}敗
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: rateColor, minWidth: 44, textAlign: "right",
        fontFeatureSettings: '"tnum"',
      }}>
        {rate != null ? `${rate}%` : "—"}
      </div>
    </div>
  );
}

// ── セクションヘッダ
function _IsSectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Icon name={icon} size={18} color={C.textSecondary} />
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginLeft: "auto" }}>{sub}</div>}
    </div>
  );
}

// ── カード共通
function _IsCard({ children }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "14px 16px 16px",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function InsightsTab({ tournaments = [], practices = [], trials = [] }) {
  const [period, setPeriod] = useState("90d");

  const range = useMemo(() => _isPeriodRange(period), [period]);
  const filteredTournaments = useMemo(() => _isFilterByPeriod(tournaments, range), [tournaments, range]);
  const filteredPractices   = useMemo(() => _isFilterByPeriod(practices, range),   [practices, range]);
  const allMatches          = useMemo(() => _isFlattenMatches(filteredTournaments), [filteredTournaments]);

  const totalStats = useMemo(() => _isWinRate(allMatches), [allMatches]);
  const mentalAvg  = useMemo(() => _isAvgRating(allMatches, "mental"),    [allMatches]);
  const physicalAvg= useMemo(() => _isAvgRating(allMatches, "physical"),  [allMatches]);
  const practiceCnt = filteredPractices.length;
  const trialCnt    = useMemo(() => _isFilterByPeriod(trials, range).length, [trials, range]);

  const racketStats   = useMemo(() => _isStatsByRacket(allMatches).slice(0, 5),   [allMatches]);
  const opponentStats = useMemo(() => _isStatsByOpponent(allMatches).slice(0, 5), [allMatches]);

  // 月別勝率は期間に関わらず直近 6 ヶ月固定 (推移の見やすさ優先)
  const monthlyWinRate = useMemo(() => _isMonthlyWinRate(_isFlattenMatches(tournaments)), [tournaments]);

  const periodLabel = _IS_PERIODS.find(p => p.v === period)?.label || "";

  return (
    <div style={{ padding: "12px 14px 24px", overflow: "auto", flex: 1 }}>
      {/* === 期間チップ === */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {_IS_PERIODS.map(opt => {
          const active = period === opt.v;
          return (
            <button
              key={opt.v}
              onClick={() => setPeriod(opt.v)}
              style={{
                minHeight: 32, padding: "0 12px",
                background: active ? C.primary : C.panel,
                border: `1px solid ${active ? C.primary : C.border}`, borderRadius: 16,
                color: active ? "#fff" : C.textSecondary,
                fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: font,
              }}
            >{opt.label}</button>
          );
        })}
      </div>

      {/* === 1. 全体サマリー === */}
      <_IsCard>
        <_IsSectionHeader icon="chart-bar" title="全体" sub={periodLabel} />
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <_IsStatBox num={filteredTournaments.length} label="大会" color="#FF9500" />
          <div style={{ width: 1, background: C.bg, margin: "8px 0" }} />
          <_IsStatBox num={totalStats.total} label="試合" color={C.primary}
            sub={totalStats.total > 0 ? `${totalStats.win}勝 ${totalStats.loss}敗` : null} />
          <div style={{ width: 1, background: C.bg, margin: "8px 0" }} />
          <_IsStatBox
            num={totalStats.rate != null ? totalStats.rate : "—"}
            unit={totalStats.rate != null ? "%" : null}
            label="勝率"
            color={totalStats.rate == null ? C.textMuted
                 : totalStats.rate >= 60 ? "#34C759"
                 : totalStats.rate >= 40 ? "#FF9500"
                 :                         "#FF3B30"} />
        </div>
        <div style={{ display: "flex", alignItems: "stretch", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bg}` }}>
          <_IsStatBox num={practiceCnt} label="練習" color="#34C759" />
          <div style={{ width: 1, background: C.bg, margin: "8px 0" }} />
          <_IsStatBox num={trialCnt} label="試打" color={C.trialAccent || "#AF52DE"} />
        </div>
      </_IsCard>

      {/* === 2. 月別勝率 (直近 6 ヶ月) === */}
      <_IsCard>
        <_IsSectionHeader icon="trending-up" title="月別勝率" sub="直近 6 ヶ月" />
        {monthlyWinRate.every(m => m.total === 0) ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "16px 0", textAlign: "center" }}>
            試合データがありません
          </div>
        ) : (
          <_IsMonthlyChart months={monthlyWinRate} />
        )}
      </_IsCard>

      {/* === 3. メンタル / フィジカル === */}
      <_IsCard>
        <_IsSectionHeader icon="activity" title="コンディション平均" sub={periodLabel} />
        {mentalAvg == null && physicalAvg == null ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0", textAlign: "center" }}>
            記録された試合データがありません
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, marginBottom: 4 }}>メンタル</div>
              <_IsRatingBar value={mentalAvg} color="#5856D6" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, marginBottom: 4 }}>フィジカル</div>
              <_IsRatingBar value={physicalAvg} color="#FF9500" />
            </div>
          </>
        )}
      </_IsCard>

      {/* === 4. ラケット別勝率 === */}
      <_IsCard>
        <_IsSectionHeader icon="backpack" title="ラケット別勝率" sub="試合数順 top 5" />
        {racketStats.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0", textAlign: "center" }}>
            試合データがありません
          </div>
        ) : (
          racketStats.map((s, i) => (
            <_IsRankRow
              key={s.name}
              rank={i + 1}
              name={s.name}
              win={s.win} loss={s.loss} rate={s.rate}
              sub={`${s.total} 試合`}
            />
          ))
        )}
      </_IsCard>

      {/* === 5. 対戦相手別戦績 === */}
      <_IsCard>
        <_IsSectionHeader icon="users" title="対戦相手別戦績" sub="対戦数順 top 5" />
        {opponentStats.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0", textAlign: "center" }}>
            対戦データがありません
          </div>
        ) : (
          opponentStats.map((s, i) => (
            <_IsRankRow
              key={s.name}
              rank={i + 1}
              name={s.name}
              win={s.win} loss={s.loss} rate={s.rate}
              sub={s.lastDate ? `最終 ${s.lastDate}` : null}
            />
          ))
        )}
      </_IsCard>

      <div style={{ fontSize: 10, color: C.textMuted, textAlign: "center", marginTop: 4 }}>
        棄権・未確定の試合は勝率計算から除外しています
      </div>
    </div>
  );
}
