// WeeklySummary — Home タブ「今週サマリー」カード (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L245-270 / DECISIONS_v4.md S13.5 + ChatGPT 採用案準拠
//
// 4 統計 (Display tier 大数字 34px、tabular-nums):
//   - 練習: 直近 7 日の練習回数 (緑 #34C759)
//   - 大会: 直近 7 日の大会数 (橙 #FF9500)
//   - 平均/回: 直近 7 日 練習 duration の平均 (Apple Blue) + 「分」単位
//   - 直近: 全 matches の最新 10 試合 N勝N敗 (Apple Blue)
//
// フッタ: 「主力 X · 試合勝率 N%」 (主力 = 直近 30 日最多ラケット、勝率 = 全 matches)
//
// props: tournaments, practices

const _WS_DAY_MS = 1000 * 60 * 60 * 24;

// ISO YYYY-MM-DD で N 日前
const _wsDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

function _WSStat({ num, unit, label, color }) {
  return (
    <div style={{ flex: 1, textAlign: "center", position: "relative" }}>
      <div style={{
        fontSize: 34, fontWeight: 800, color: color || C.primary,
        lineHeight: 1, fontFeatureSettings: '"tnum"',
      }}>
        {num}
        {unit && (
          <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 1, color: "inherit" }}>{unit}</span>
        )}
      </div>
      <div style={{
        fontSize: 10, color: C.textMuted, fontWeight: 600,
        letterSpacing: 0.4, textTransform: "uppercase", marginTop: 4,
      }}>{label}</div>
    </div>
  );
}

// 縦区切り (a-stat::before の代替)
function _WSDivider() {
  return (
    <div style={{
      width: 1, alignSelf: "stretch", margin: "8px 0",
      background: C.bg,
    }} />
  );
}

function WeeklySummary({ tournaments = [], practices = [] }) {
  const todayIso = today();
  const weekStart = _wsDaysAgo(6); // 今日含む 7 日 = -6 日前から

  // 練習回数 / 平均/回
  const weekP = useMemo(() =>
    (practices || []).filter(p => {
      if (!p || !p.date) return false;
      const nd = normDate(p.date);
      return nd >= weekStart && nd <= todayIso;
    }), [practices, weekStart, todayIso]);

  // 大会数
  const weekT = useMemo(() =>
    (tournaments || []).filter(t => {
      if (!t || !t.date) return false;
      const nd = normDate(t.date);
      return nd >= weekStart && nd <= todayIso;
    }), [tournaments, weekStart, todayIso]);

  // 平均/回 (duration あり練習の平均)
  const avgMin = useMemo(() => {
    let total = 0, cnt = 0;
    weekP.forEach(p => {
      const n = parseInt(p.duration, 10);
      if (!isNaN(n) && n > 0) { total += n; cnt += 1; }
    });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [weekP]);

  // 直近 10 試合 N勝N敗 + 全試合勝率
  // H-9 (Phase A 監査): _normalizeMatchResult で勝敗表記揺れを統一吸収
  //   旧: "勝利"/"敗北" のみ拾い、V2 互換 "勝"/"win" 等が集計から漏れて勝率が低く出ていた
  //   新: "win"/"loss" に正規化してから集計
  const matchStats = useMemo(() => {
    const all = [];
    [...(tournaments || [])]
      .sort((a, b) => (normDate(b.date) || "").localeCompare(normDate(a.date) || ""))
      .forEach(t => {
        if (Array.isArray(t.matches)) {
          t.matches.forEach(m => {
            if (!m) return;
            const norm = _normalizeMatchResult(m.result);
            if (norm === "win" || norm === "loss") all.push(norm);
          });
        }
      });
    const last10 = all.slice(0, 10);
    const wins10 = last10.filter(r => r === "win").length;
    const loses10 = last10.filter(r => r === "loss").length;
    const winsAll = all.filter(r => r === "win").length;
    const losesAll = all.filter(r => r === "loss").length;
    const totalAll = winsAll + losesAll;
    const winRate = totalAll > 0 ? Math.round((winsAll * 100) / totalAll) : 0;
    return { wins10, loses10, winsAll, losesAll, winRate, hasMatches: totalAll > 0 };
  }, [tournaments]);

  // 主力ラケット (直近 30 日)
  const mainRacketName = useMemo(() => {
    const cutoff = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    })();
    const counts = {};
    [...(practices || []), ...(tournaments || [])].forEach(item => {
      if (!item || !item.racketName) return;
      const nd = normDate(item.date);
      if (nd >= cutoff && nd <= todayIso) {
        counts[item.racketName] = (counts[item.racketName] || 0) + 1;
      }
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [practices, tournaments, todayIso]);

  return (
    <div style={{ background: C.panel, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 }}>
      {/* ヘッダ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>今週サマリー</div>
        <div style={{
          fontSize: 10, color: C.textMuted, fontWeight: 600,
          background: C.bg, padding: "3px 8px", borderRadius: 6,
        }}>直近 7 日</div>
      </div>

      {/* 4 統計 (横 4 等分、区切り線) */}
      <div style={{ display: "flex", alignItems: "flex-end", padding: "6px 0 4px" }}>
        <_WSStat num={weekP.length} label="練習" color="#34C759" />
        <_WSDivider />
        <_WSStat num={weekT.length} label="大会" color="#FF9500" />
        <_WSDivider />
        <_WSStat num={avgMin} unit="分" label="平均/回" color={C.primary} />
        <_WSDivider />
        {matchStats.hasMatches ? (
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontSize: 34, fontWeight: 800, color: C.primary,
              lineHeight: 1, fontFeatureSettings: '"tnum"',
            }}>
              {matchStats.wins10}
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, marginLeft: 1 }}>勝</span>
              {matchStats.loses10}
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, marginLeft: 1 }}>敗</span>
            </div>
            <div style={{
              fontSize: 10, color: C.textMuted, fontWeight: 600,
              letterSpacing: 0.4, textTransform: "uppercase", marginTop: 4,
            }}>直近</div>
          </div>
        ) : (
          <_WSStat num="—" label="直近" color={C.textMuted} />
        )}
      </div>

      {/* フッタ: 主力 + 勝率 */}
      <div style={{
        fontSize: 11, color: C.textSecondary, textAlign: "center",
        marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bg}`,
        fontWeight: 500,
      }}>
        {mainRacketName ? (
          <>主力 <b style={{ color: C.primary, fontWeight: 700 }}>{mainRacketName}</b>{matchStats.hasMatches ? <> · 試合勝率 <b style={{ color: C.primary, fontWeight: 700 }}>{matchStats.winRate}%</b></> : null}</>
        ) : (
          matchStats.hasMatches ? <>試合勝率 <b style={{ color: C.primary, fontWeight: 700 }}>{matchStats.winRate}%</b></> : "データなし"
        )}
      </div>
    </div>
  );
}
