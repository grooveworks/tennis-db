// CurrentContext — Home タブ「現在の状況」カード (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L217-243 / DECISIONS_v4.md S13.5 Current Context 生成ルール準拠
//
// 5 行構成:
//   1. 次の大会:     tournaments で normDate(date) >= today、最近 1 件
//   2. 課題:         next で done=false の優先度最上位 1 件 (priority 順)
//   3. 主力:         直近 30 日 (practices+tournaments) 使用最多のラケット
//                    5 回以上 → 「継続使用中」/ 1-4 回 → 「検討中」/ 0 回 → 「待機」
//   4. 検討中:       trials で judgment="採用候補" の最新 1 件
//                    主力と同じラケットでも表示する (DECISIONS S14 ユーザー判断 1)
//                    フォールバック: 該当無しなら行を非表示
//   5. 直近:         tournaments で date <= today かつ overallResult あり、最新 1 件
//                    フォールバック: 該当無しなら行を非表示
//
// props:
//   tournaments, practices, trials, next: 全データ
//
// ステータス pill:
//   status-keep   (緑): 「継続使用中」
//   status-trial  (紫): 「採用候補」「検討中」「待機」
//   status-result (橙): 大会結果ラベル (優勝/準優勝/3位/予選突破/ベスト8 等)

const _CTX_PRIORITY_ORDER = { "最高": 1, "高": 2, "中": 3, "低": 4, "参考": 5 };

// 30 日前の YYYY-MM-DD
const _ctxThirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// 「12 日後」など day diff 表記
const _ctxDayDiff = (iso, todayIso) => {
  if (!iso || !todayIso) return "";
  const a = new Date(iso); const b = new Date(todayIso);
  const ms = a.getTime() - b.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "今日";
  if (days < 0) return `${-days} 日前`;
  return `${days} 日後`;
};

// 長文省略ルール (ChatGPT 指摘 高 2 / 2026-04-27):
//   - val (主行): line-height 1.4 で最大 2 行折り返し許容、それ以上は WebkitLineClamp で省略
//   - sub (補助行): 1 行のみ、nowrap + ellipsis (横にはみ出さない)
//   - 長い大会名 / ラケット名にも耐える
function _CtxRow({ keyText, val, sub, status, statusKind, onClick }) {
  const statusStyle =
    statusKind === "keep"   ? { background: "#E6F4EA", color: "#0a5b35" } :
    statusKind === "trial"  ? { background: "#F3E8FD", color: "#6a25a8" } :
    statusKind === "result" ? { background: "#FFE6BD", color: "#7E4F00" } :
                              { background: C.panel2, color: C.textSecondary };
  // S15.5+: onClick あれば行全体を tappable に (cursor pointer + hover bg)
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick || undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "9px 6px",
        margin: "0 -6px",
        borderTop: `1px solid ${C.bg}`,
        borderRadius: 8,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, minWidth: 62, paddingTop: 1, letterSpacing: 0.2 }}>
        {keyText}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.4, minWidth: 0 }}>
        <span style={{
          display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {val}
          {status && (
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700,
              padding: "1px 7px", borderRadius: 6, marginLeft: 5,
              letterSpacing: 0.3, verticalAlign: 1,
              ...statusStyle,
            }}>{status}</span>
          )}
        </span>
        {sub && (
          <div style={{
            fontSize: 11, color: C.textMuted, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{sub}</div>
        )}
      </div>
      {clickable && (
        <Icon name="chevron-right" size={14} color={C.textMuted} style={{ alignSelf: "center", flexShrink: 0 }} />
      )}
    </div>
  );
}

function CurrentContext({ tournaments = [], practices = [], trials = [], next = [], onCardClick, onMainRacketClick }) {
  const todayIso = today();

  // 1. 次の大会
  const upcomingTournament = useMemo(() => {
    return (tournaments || [])
      .filter(t => t && t.date && normDate(t.date) >= todayIso)
      .sort((a, b) => (normDate(a.date) || "").localeCompare(normDate(b.date) || ""))[0] || null;
  }, [tournaments, todayIso]);

  // 2. 課題 (優先度最上位の OPEN)
  const topTask = useMemo(() => {
    const open = (next || []).filter(n => n && !n.done);
    open.sort((a, b) => (_CTX_PRIORITY_ORDER[a.priority] || 99) - (_CTX_PRIORITY_ORDER[b.priority] || 99));
    return open[0] || null;
  }, [next]);

  // 3. 主力ラケット (直近 30 日 練習+大会 使用回数最多)
  const mainRacket = useMemo(() => {
    const cutoff = _ctxThirtyDaysAgo();
    const counts = {};
    const tally = (item) => {
      if (!item || !item.racketName) return;
      const nd = normDate(item.date);
      if (nd >= cutoff && nd <= todayIso) {
        counts[item.racketName] = (counts[item.racketName] || 0) + 1;
      }
    };
    (practices || []).forEach(tally);
    (tournaments || []).forEach(tally);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    const [name, count] = entries[0];
    let status = "待機";
    if (count >= 5) status = "継続使用中";
    else if (count >= 1) status = "検討中";
    return { name, count, status };
  }, [practices, tournaments, todayIso]);

  // 4. 検討中 (trial 採用候補 最新)
  const candidate = useMemo(() => {
    const list = (trials || [])
      .filter(tr => tr && tr.judgment === "採用候補")
      .sort((a, b) => (normDate(b.date) || "").localeCompare(normDate(a.date) || ""));
    return list[0] || null;
  }, [trials]);

  // 5. 直近結果 (overallResult あり、最新)
  const recentResult = useMemo(() => {
    const list = (tournaments || [])
      .filter(t => t && t.date && normDate(t.date) <= todayIso && t.overallResult)
      .sort((a, b) => (normDate(b.date) || "").localeCompare(normDate(a.date) || ""));
    return list[0] || null;
  }, [tournaments, todayIso]);

  return (
    <div style={{ background: C.panel, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 }}>
      {/* ヘッダ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="map-pin" size={16} color={C.primary} />
          現在の状況
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.primary,
          background: C.primaryLight, padding: "3px 8px",
          borderRadius: 8, letterSpacing: 0.3,
        }}>CURRENT</span>
      </div>

      {/* 1. 次の大会 → tournament Detail へリンク */}
      <_CtxRow
        keyText="次の大会"
        val={upcomingTournament
          ? <>{fmtDate(upcomingTournament.date)} <b>{upcomingTournament.name || "(無題)"}</b></>
          : "予定なし"
        }
        sub={upcomingTournament
          ? `${_ctxDayDiff(normDate(upcomingTournament.date), todayIso)} · ${upcomingTournament.level || "—"} ${upcomingTournament.type === "doubles" ? "ダブルス" : upcomingTournament.type === "mixed" ? "ミックス" : "シングルス"}${upcomingTournament.startTime ? ` · ${upcomingTournament.startTime} 開始` : ""}`
          : null
        }
        onClick={upcomingTournament && onCardClick ? () => onCardClick("tournament", upcomingTournament) : null}
      />

      {/* 2. 課題 (S17 Plan タブ未実装、リンクなし) */}
      <_CtxRow
        keyText="課題"
        val={topTask ? topTask.label || "(無題)" : "未設定"}
      />

      {/* 3. 主力 → Sessions タブをそのラケットでフィルタした一覧へ */}
      <_CtxRow
        keyText="主力"
        val={mainRacket ? mainRacket.name : "未設定"}
        status={mainRacket ? mainRacket.status : null}
        statusKind={mainRacket && mainRacket.status === "継続使用中" ? "keep" : "trial"}
        sub={mainRacket
          ? `直近 30 日 ${mainRacket.count} 回`
          : null
        }
        onClick={mainRacket && onMainRacketClick ? () => onMainRacketClick(mainRacket.name) : null}
      />

      {/* 4. 検討中 → trial Detail へリンク (フォールバック: 行非表示) */}
      {candidate && (
        <_CtxRow
          keyText="検討中"
          val={candidate.racketName || "(無題)"}
          status="採用候補"
          statusKind="trial"
          sub={`${fmtDate(candidate.date)} 試打`}
          onClick={onCardClick ? () => onCardClick("trial", candidate) : null}
        />
      )}

      {/* 5. 直近結果 → tournament Detail へリンク (フォールバック: 行非表示) */}
      {recentResult && (
        <_CtxRow
          keyText="直近"
          val={<>{fmtDate(recentResult.date)} {recentResult.name || "(無題)"}</>}
          status={recentResult.overallResult}
          statusKind="result"
          onClick={onCardClick ? () => onCardClick("tournament", recentResult) : null}
        />
      )}
    </div>
  );
}
