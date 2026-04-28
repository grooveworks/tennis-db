// MergePartnerPicker — マージ相手 (B 候補) 選択モーダル (S15)
//
// 役割:
//   - REQUIREMENTS_v4 F1.10 セッションのマージ — 「同タイプの 2 件目を選ぶ」フェーズ
//   - SessionDetailView の「マージ」ボタンから起動
//   - 同タイプの全件から 1 件を選ぶ → onSelect で MergeModal へ橋渡し
//
// props:
//   open:        boolean
//   type:        "tournament" | "practice" | "trial"
//   sourceItem:  A (統合元、自身は候補から除外)
//   candidates:  同タイプ全件配列 (sourceItem を含むまま渡してよい、内部で除外)
//   onSelect:    (item) => void   候補選択時 (= B 確定)
//   onClose:     () => void       キャンセル
//
// UX:
//   - 検索 (タイトル / 会場 部分一致)
//   - 並び順: 日付差 0 (同日) 最上部 → 日付近い順
//   - 同日候補は primaryLight 背景 + primary border で強調
//   - 日付ずれ ≤ 7 日は黄色警告

function MergePartnerPicker({ open, type, sourceItem, candidates, onSelect, onClose }) {
  const [search, setSearch] = useState("");

  // open 切替時に検索リセット
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  if (!open || !sourceItem) return null;

  const typeLabel = type === "tournament" ? "大会"
                  : type === "practice"   ? "練習"
                  : type === "trial"      ? "試打"
                  : "セッション";

  const labelOf = (item) => {
    if (!item) return "(不明)";
    if (type === "tournament") return item.name || "(無題の大会)";
    if (type === "practice")   return item.title || item.venue || "(無題の練習)";
    if (type === "trial")      return item.racketName || "(ラケット未指定)";
    return "(不明)";
  };

  const metaOf = (item) => {
    if (!item) return "";
    const parts = [];
    parts.push(normDate(item.date) || "(日付なし)");
    if (item.startTime) parts.push(item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime);
    if (item.venue && item.venue !== labelOf(item)) parts.push(item.venue);
    if (type === "practice" && item.heartRateAvg) parts.push(`心拍 ${item.heartRateAvg}`);
    return parts.join(" / ");
  };

  // 自分自身を除外
  const list = (candidates || []).filter(c => c && c.id && c.id !== sourceItem.id);

  // 検索フィルタ (タイトル + 会場)
  const lower = search.trim().toLowerCase();
  const filtered = lower
    ? list.filter(c =>
        labelOf(c).toLowerCase().includes(lower) ||
        (c.venue || "").toLowerCase().includes(lower)
      )
    : list;

  // 日付差でソート (同日 = 0、日付パース不可 = Infinity)
  const sourceDate = normDate(sourceItem.date);
  const daysDiff = (dateStr) => {
    const a = normDate(dateStr);
    if (!a || !sourceDate) return Infinity;
    const da = new Date(a + "T00:00:00");
    const ds = new Date(sourceDate + "T00:00:00");
    if (isNaN(da) || isNaN(ds)) return Infinity;
    return Math.abs(Math.round((da - ds) / (1000 * 60 * 60 * 24)));
  };

  const sorted = filtered
    .map(c => ({ item: c, diff: daysDiff(c.date) }))
    .sort((a, b) => a.diff - b.diff);

  const sourceLabel = labelOf(sourceItem);

  return (
    <Modal open={open} onClose={onClose} title={`マージ相手を選択 (${typeLabel})`}>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
        統合元: <b style={{ color: C.text }}>{sourceLabel}</b>
        <br />
        この{typeLabel}にまとめる相手を選んでください。
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 タイトル / 会場で絞り込み"
        aria-label="候補を検索"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: RADIUS.btnSm,
          border: `1px solid ${C.border}`,
          background: C.panel2,
          fontSize: 13,
          fontFamily: font,
          marginBottom: 8,
          boxSizing: "border-box",
          minHeight: 44,
          WebkitAppearance: "none",
          appearance: "none",
          color: C.text,
          outline: "none",
        }}
      />

      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>
        全 {list.length} 件 / 表示 {sorted.length} 件 (日付近い順)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
        {sorted.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
            {list.length === 0
              ? `他の${typeLabel}が見つかりません`
              : "検索条件に一致する候補がありません"}
          </div>
        ) : (
          sorted.map(({ item, diff }) => {
            const isSameDay = diff === 0;
            const isClose = diff > 0 && diff <= 7;
            return (
              <button
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: RADIUS.row,
                  background: isSameDay ? C.primaryLight : C.panel2,
                  border: `1px solid ${isSameDay ? C.primary : C.border}`,
                  cursor: "pointer",
                  fontFamily: font,
                  minHeight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{labelOf(item)}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{metaOf(item)}</div>
                {!isSameDay && diff !== Infinity && (
                  <div style={{
                    fontSize: 11,
                    color: isClose ? "#7e5d00" : C.textMuted,
                    marginTop: 2,
                  }}>
                    {isClose ? "⚠ " : ""}日付が {diff} 日ずれ
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
