// TwoWeekCalendar — Home タブ「カレンダー (2 週間)」カード (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L304-329 / DECISIONS_v4.md S13.5 + ChatGPT 採用「カレンダー下部凡例 1 行常設」
//
// 構成:
//   - ヘッダ: 「カレンダー」 + 右肩に「M/D 〜 M/D · 2 週間」 tag (grey)
//   - 7×2 グリッド (今日含む 14 日): aspect-ratio 1/1, radius 10
//   - 曜日見出し: 日 (赤) / 月-金 (grey) / 土 (Apple Blue)
//   - セル分類:
//     * today    : Apple Blue 塗り、白文字、bold
//     * tour     : tour bg #FFE6BD、右上に小 trophy 10px (橙)
//     * prac-acc : 練習 90 分以上、濃緑 #34C759 + 白文字
//     * prac-mid : 練習 60-89 分、中緑 #B7E1C9
//     * prac-light: 練習 < 60 分 or 単純練習 1 件、淡緑 #E6F4EA
//     * trial dot: 試打 (期間内に judgment 不問の trial レコード) があれば底中央に紫 dot 5×5
//   - フッタ: 「日付タップ → 詳細パネル展開 (色の意味も表示)」
//
// 日付タップ → onDayTap(iso, dayInfo) → app.jsx で HomeDayPanel を Glass overlay 表示
//
// props:
//   tournaments, practices, trials: 全件
//   onDayTap(iso, info): 日付タップで親に通知

const _TWC_DOW_LABELS = ["日","月","火","水","木","金","土"];
const _TWC_DOW_COLORS = ["#FF3B30", C.textMuted, C.textMuted, C.textMuted, C.textMuted, C.textMuted, C.primary];

// 今週日曜から N 日後 (Sessions CalendarView と同じ日曜始まり方針、ChatGPT 指摘で統一)
const _twcSundayPlusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + n); // 今週日曜から n 日
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// 「M/D 〜 M/D」表記
const _twcRangeLabel = (startIso, endIso) => {
  const s = startIso.match(/(\d{4})-(\d{2})-(\d{2})/);
  const e = endIso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!s || !e) return "";
  return `${parseInt(s[2])}/${parseInt(s[3])} 〜 ${parseInt(e[2])}/${parseInt(e[3])}`;
};

function TwoWeekCalendar({ tournaments = [], practices = [], trials = [], onDayTap }) {
  const todayIso = today();

  // 14 日分のセル状態を構築 (日曜始まり、今週日曜 〜 来週土曜の 2 週間固定)
  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const iso = _twcSundayPlusDays(i);
      const d = new Date(iso);
      const isPast = iso < todayIso;
      arr.push({
        iso,
        dayNum: d.getDate(),
        dow: d.getDay(),
        isPast,
        practiceCount: 0,
        practiceMin: 0,
        tournament: null,
        hasTrial: false,
      });
    }

    const idx = {};
    arr.forEach((c, i) => { idx[c.iso] = i; });

    (practices || []).forEach(p => {
      if (!p || !p.date) return;
      const i = idx[normDate(p.date)];
      if (i === undefined) return;
      arr[i].practiceCount += 1;
      const n = parseInt(p.duration, 10);
      if (!isNaN(n) && n > 0) arr[i].practiceMin += n;
    });
    (tournaments || []).forEach(t => {
      if (!t || !t.date) return;
      const i = idx[normDate(t.date)];
      if (i === undefined) return;
      if (!arr[i].tournament) arr[i].tournament = t;
    });
    (trials || []).forEach(tr => {
      if (!tr || !tr.date) return;
      const i = idx[normDate(tr.date)];
      if (i === undefined) return;
      arr[i].hasTrial = true;
    });

    return arr;
  }, [tournaments, practices, trials, todayIso]);

  const startIso = cells[0] ? cells[0].iso : todayIso;
  const endIso = cells[13] ? cells[13].iso : todayIso;

  // セル背景 / 文字色決定
  const cellStyle = (c) => {
    // 今日より前のセル (今週日曜含む過去日): 薄グレー背景塗り + 数字 textMuted
    // 他セル (今日=青塗 / 大会=橙塗 / 練習=緑塗 / 未来空白=白) と同じ「背景色で意味」一貫体系に統一
    if (c.isPast) {
      return {
        aspectRatio: "1 / 1",
        borderRadius: 10,
        background: "#F8F9FA",
        color: C.textMuted,
        cursor: "default",
        fontSize: 11,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 500,
      };
    }

    let bg = "transparent";
    let fg = C.text;
    let fontWeight = 500;

    if (c.iso === todayIso) {
      bg = C.primary;
      fg = "#fff";
      fontWeight = 700;
    } else if (c.tournament) {
      bg = "#FFE6BD";
      fg = "#7E4F00";
    } else if (c.practiceMin >= 90) {
      bg = "#34C759";
      fg = "#fff";
    } else if (c.practiceMin >= 60) {
      bg = "#B7E1C9";
    } else if (c.practiceCount > 0) {
      bg = "#E6F4EA";
    }

    return {
      aspectRatio: "1 / 1",
      borderRadius: 10,
      background: bg,
      color: fg,
      fontWeight,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      position: "relative",
      cursor: "pointer",
    };
  };

  const numColor = (c) => {
    if (c.isPast) return undefined; // 過去セル: cellStyle の C.appleGray4 を継承
    if (c.iso === todayIso) return "#fff";
    if (c.tournament) return "#7E4F00";  // 大会セル: 数字も橙茶
    if (c.practiceMin >= 90) return "#fff"; // 濃緑セル: 白文字
    if (c.dow === 0) return "#FF3B30";
    if (c.dow === 6) return C.primary;
    return undefined;
  };

  return (
    <div style={{ background: C.panel, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 }}>
      {/* ヘッダ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>カレンダー</div>
        <div style={{
          fontSize: 10, color: C.textMuted, fontWeight: 600,
          background: C.bg, padding: "3px 8px", borderRadius: 6,
        }}>{_twcRangeLabel(startIso, endIso)} · 2 週間</div>
      </div>

      {/* 曜日見出し (日曜始まり固定、Sessions CalendarView と統一) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {_TWC_DOW_LABELS.map((lbl, i) => (
          <div key={i} style={{
            fontSize: 9, fontWeight: 600,
            color: _TWC_DOW_COLORS[i],
            textAlign: "center", padding: "2px 0",
          }}>{lbl}</div>
        ))}
      </div>

      {/* 14 セル grid (日曜始まり、過去セルは empty) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((c, i) => (
          <div
            key={i}
            onClick={() => !c.isPast && onDayTap && onDayTap(c.iso, c)}
            style={cellStyle(c)}
          >
            {!c.isPast && c.tournament && (
              <span style={{ position: "absolute", top: 2, right: 2, lineHeight: 0 }}>
                <Icon name="trophy" size={10} color="#FF9500" />
              </span>
            )}
            <span style={{ color: numColor(c) || "inherit", lineHeight: 1.1 }}>
              {c.dayNum}
            </span>
            {!c.isPast && c.hasTrial && (
              <div style={{
                position: "absolute", bottom: 3,
                width: 5, height: 5, borderRadius: "50%",
                background: "#9334E0",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* フッタ */}
      <div style={{
        fontSize: 10, color: C.textMuted, textAlign: "center",
        marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bg}`,
      }}>
        日付タップ → 詳細パネル展開 (色の意味も表示)
      </div>
    </div>
  );
}
