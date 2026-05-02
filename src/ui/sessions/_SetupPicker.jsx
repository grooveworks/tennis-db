// _SetupPicker — 履歴セット bottom sheet ピッカー (S16.11 UX5)
//
// 機能: 過去の (racket + stringMain + stringCross + tensionMain + tensionCross) 5-tuple を
//       タップ 1 回で 5 フィールド一括入力。試合中の 90 秒チェンジオーバー対策。
//
// 仕様 (preview_s17_p7.html、ユーザー承認済):
//   - 機材セクション最下部の小ボタン: "🔁 履歴セットから選ぶ (N 件)"
//   - タップ → 下から bottom sheet (絞り込み入力 + リスト)
//   - 各項目: 上=ラケット名 (太字、フル名)、下=ストリング縦糸/横糸 · テンション縦/横
//   - 直近 1 件は「前回」バッジ
//   - タップで 5 フィールド一括反映 + シート閉じる
//   - × ボタン or 背景タップで キャンセル (値変更なし)
//   - 「個別に入力」項目は廃止 (背景タップで同等動作)
//   - データ無破壊: 元の値を一切変換しない、フル名そのまま表示

// 直近 setup を計算 (date 降順、racket 必須、5-tuple で dedupe)
const _computeRecentSetups = (tournaments = [], practices = [], trials = []) => {
  const items = [];
  const push = (date, src) => {
    if (!src || !src.racketName) return;
    items.push({
      date: date || "",
      racketName:   src.racketName   || "",
      stringMain:   src.stringMain   || "",
      stringCross:  src.stringCross  || "",
      tensionMain:  src.tensionMain  || "",
      tensionCross: src.tensionCross || "",
    });
  };
  (tournaments || []).forEach(t => {
    if (!t) return;
    push(t.date, t);
    (t.matches || []).forEach(m => push(t.date, m));
  });
  (practices || []).forEach(p => push(p?.date, p));
  (trials || []).forEach(tr => push(tr?.date, tr));
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const k = _setupKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(it);
  }
  return unique;
};

const _setupKey = (s) => {
  if (!s) return "";
  return [s.racketName || "", s.stringMain || "", s.stringCross || "", s.tensionMain || "", s.tensionCross || ""].join("|");
};

// シート項目の 2 行目: ストリング縦/横 · テンション縦/横
const _setupSubLabel = (s) => {
  const strs = [s.stringMain, s.stringCross].map(v => (v == null ? "" : String(v).trim())).filter(Boolean).join(" / ");
  const tens = [s.tensionMain, s.tensionCross].map(v => (v == null ? "" : String(v).trim())).filter(Boolean).join("/");
  if (!strs && !tens) return "";
  if (!strs) return tens;
  if (!tens) return strs;
  return `${strs} · ${tens}`;
};

// ── ボタン (機材セクション最下部に配置)
function _SetupPickerButton({ recent = [], current, onApply }) {
  const [open, setOpen] = useState(false);
  if (!Array.isArray(recent) || recent.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%", minHeight: 36, padding: "6px 10px",
          border: `1px dashed ${C.primary}`, borderRadius: 6,
          background: C.primaryLight, color: C.primary,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          marginTop: 4,
        }}
      >
        <Icon name="clock-counter-clockwise" size={14} color={C.primary} />
        履歴セットから選ぶ ({recent.length} 件)
      </button>
      <_SetupPickerSheet
        open={open}
        recent={recent}
        current={current}
        onApply={onApply}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── ボトムシート
function _SetupPickerSheet({ open, recent = [], current, onApply, onClose }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const curKey = _setupKey(current);
  const firstKey = recent[0] ? _setupKey(recent[0]) : "";
  const q = search.trim().toLowerCase();
  const filtered = !q
    ? recent
    : recent.filter(s => {
        const fullText = [s.racketName, s.stringMain, s.stringCross, s.tensionMain, s.tensionCross]
          .filter(Boolean).join(" ").toLowerCase();
        return fullText.includes(q);
      });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="履歴セットから選ぶ"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end",
        zIndex: 1200,
      }}
    >
      <div style={{
        background: C.panel,
        borderRadius: "16px 16px 0 0",
        width: "100%", maxWidth: 480, margin: "0 auto",
        maxHeight: "75vh",
        display: "flex", flexDirection: "column",
        animation: "modalEnter 250ms ease-out",
      }}>
        {/* head */}
        <div style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${C.divider}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            履歴セットから選ぶ ({recent.length} 件)
          </span>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, display: "flex",
            }}
          >
            <Icon name="x" size={18} color={C.textSecondary} />
          </button>
        </div>

        {/* search */}
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.divider}` }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="絞り込み (ラケット名・数字など)"
            style={{
              width: "100%", minHeight: 36, padding: "6px 10px",
              border: `1px solid ${C.border}`, borderRadius: 6,
              fontSize: 13, fontFamily: font, background: C.bg,
              color: C.text,
            }}
          />
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: "20px 14px", color: C.textMuted,
              textAlign: "center", fontSize: 12,
            }}>
              該当なし
            </div>
          ) : filtered.map((s, i) => {
            const k = _setupKey(s);
            const isCurrent = k === curKey;
            const isFirst = k === firstKey;
            const sub = _setupSubLabel(s);
            return (
              <button
                key={k + ":" + i}
                type="button"
                onClick={() => {
                  if (onApply) onApply(s);
                  onClose();
                }}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: isCurrent ? C.primaryLight : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${C.divider}`,
                  textAlign: "left", cursor: "pointer", fontFamily: font,
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{
                  width: 16, flexShrink: 0,
                  color: C.primary, fontSize: 14, textAlign: "center",
                }}>
                  {isCurrent ? "✓" : ""}
                </span>
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: C.text,
                    wordBreak: "break-word",
                  }}>
                    {s.racketName}
                    {isFirst && (
                      <span style={{
                        display: "inline-block",
                        fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 3,
                        background: C.primary, color: "#fff",
                        marginLeft: 6, letterSpacing: 0.04, verticalAlign: 1,
                      }}>前回</span>
                    )}
                  </div>
                  {sub && (
                    <div style={{
                      fontSize: 12, color: C.textSecondary,
                      wordBreak: "break-word", marginTop: 2,
                    }}>
                      {sub}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
