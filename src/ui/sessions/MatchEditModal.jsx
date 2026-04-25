// MatchEditModal — 大会内 Match の追加/編集 Modal
// props:
//   open: boolean
//   match: 編集対象 (新規時は blankMatch() を渡す)
//   trnType: 親大会の type ("singles" | "doubles" | "mixed") — opponent2 表示判定
//   tournamentDefaults: 大会の機材 (新規 match の初期値に使う)
//   confirm: useConfirm() 互換 ({ ask })
//   onSave(form): 保存ボタン
//   onClose(): キャンセル / × / Esc / 背景タップ
// 統一フォーマット (S11 preview 仕様):
//   ① 基本: ラウンド / 結果 / 対戦相手 / (opponent2) / セットスコア
//   ② 評価: メンタル / フィジカル
//   ③ 機材: ラケット / テンション / 縦糸 / 横糸
//   ④ ゲーム単位記録: GameTracker
//   ⑤ メモ: メンタル / 技術 / 相手 / 総括

const ROUND_OPTS = [
  { value: "1回戦",   label: "1回戦" },
  { value: "2回戦",   label: "2回戦" },
  { value: "3回戦",   label: "3回戦" },
  { value: "準々決勝", label: "準々決勝" },
  { value: "準決勝",   label: "準決勝" },
  { value: "決勝",     label: "決勝" },
  { value: "予選",     label: "予選" },
  { value: "エキシビション", label: "エキシビション" },
];
const RESULT_OPTS = [
  { value: "勝利", label: "勝利" },
  { value: "敗北", label: "敗北" },
  { value: "棄権", label: "棄権" },
];

// rating row (5 ボタン) — 編集フォーム共通スタイル
function _meRatingRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, minWidth: 88 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                flex: 1, minWidth: 40, minHeight: 36, padding: "6px 0",
                borderRadius: 6, border: `1px solid ${on ? C.primary : C.border}`,
                background: on ? C.primary : C.panel,
                color: on ? "#fff" : C.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >{n}</button>
          );
        })}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function MatchEditModal({ open, match, trnType, racketNames = [], stringNames = [], opponentNames = [], confirm, onSave, onClose }) {
  const [form, setForm] = useState(match || null);
  const [dirty, setDirty] = useState(false);
  // open のたびに最新の match を反映 (別 match を編集する時の対応)
  useEffect(() => { if (open) { setForm(match); setDirty(false); } }, [open, match?.id]);

  // 未保存変更がある時は閉じる前に確認
  const handleClose = useCallback(() => {
    if (!dirty) { onClose && onClose(); return; }
    if (!confirm) { onClose && onClose(); return; }
    confirm.ask(
      "編集内容が保存されていません。破棄してよろしいですか？",
      () => onClose && onClose(),
      { title: "未保存の変更があります", yesLabel: "破棄する", noLabel: "編集に戻る", yesVariant: "danger", icon: "triangle-alert" }
    );
  }, [dirty, confirm, onClose]);

  // Esc で閉じる (未保存確認経由)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  if (!open || !form) return null;

  // setter で dirty フラグを立てる
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };
  const setScoresInput = Array.isArray(form.setScores) ? form.setScores.join(", ") : (form.setScores || "");
  const isDouble = trnType === "doubles" || trnType === "mixed";
  const showOpponent2 = isDouble;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="試合を編集"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "20px 12px", overflowY: "auto",
      }}
    >
      <div style={{
        background: C.panel, borderRadius: 16, padding: 18,
        maxWidth: 480, width: "100%",
      }}>
        {/* ヘッダ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>試合の詳細を記録</span>
          <button onClick={handleClose} aria-label="閉じる" style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4, display: "flex" }}>
            <Icon name="x" size={18} color={C.textSecondary} />
          </button>
        </div>

        {/* ① 基本 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Select label="ラウンド" value={form.round || "1回戦"} onChange={(v) => set("round", v)} options={ROUND_OPTS} />
          <Select label="結果" value={form.result || "勝利"} onChange={(v) => set("result", v)} options={RESULT_OPTS} />
        </div>
        <MasterField label="対戦相手" value={form.opponent || ""} onChange={(v) => set("opponent", v)} masterValues={opponentNames} placeholder="-- 対戦相手を選択 --" />
        {showOpponent2 && (
          <MasterField label="対戦相手 2 (ダブルス)" value={form.opponent2 || ""} onChange={(v) => set("opponent2", v)} masterValues={opponentNames} placeholder="-- 対戦相手 2 を選択 --" />
        )}
        <Input
          label="セットスコア"
          value={setScoresInput}
          onChange={(v) => set("setScores", v.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="例: 6-3, 6-4"
        />

        {/* matchStats が CSV 取込済みの場合の注記 (S11 範囲外、表示のみ) */}
        {form.matchStats && form.matchStats.stats && (
          <div style={{
            fontSize: 11, color: "#7e5d00", background: C.warningLight,
            border: `1px solid ${C.warning}`, borderRadius: 6,
            padding: "6px 10px", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Icon name="bar-chart-3" size={13} color="#7e5d00" />
            <span><b>データテニス CSV 取込済み</b> ({form.matchStats?.points?.length || 0} ポイント)。スタッツ編集はスコープ外（CSV 再取込で更新）</span>
          </div>
        )}

        {/* ② 評価 */}
        <div style={{ marginTop: 4 }}>
          <_meRatingRow label="メンタル" value={form.mental || 3} onChange={(n) => set("mental", n)} />
          <_meRatingRow label="フィジカル" value={form.physical || 3} onChange={(n) => set("physical", n)} />
        </div>

        {/* ③ 機材 — ラケット 1 行 / 縦糸+横糸 / テンション縦+横 */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>機材</div>
        <MasterField label="ラケット" value={form.racketName || ""} onChange={(v) => set("racketName", v)} masterValues={racketNames} placeholder="-- ラケットを選択 --" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <MasterField label="縦糸" value={form.stringMain || ""} onChange={(v) => set("stringMain", v)} masterValues={stringNames} placeholder="-- 縦糸を選択 --" />
          <MasterField label="横糸" value={form.stringCross || ""} onChange={(v) => set("stringCross", v)} masterValues={stringNames} placeholder="-- 同じなら空欄 --" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input label="テンション縦" value={form.tensionMain || ""} onChange={(v) => set("tensionMain", v)} placeholder="46" />
          <Input label="テンション横" value={form.tensionCross || ""} onChange={(v) => set("tensionCross", v)} placeholder="43" />
        </div>

        {/* ④ ゲーム単位記録 (F1.4.1) */}
        <GameTracker match={form} onChange={setForm} confirm={confirm} />

        {/* ⑤ メモ */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>メモ</div>
        <Textarea label="メンタルメモ" value={form.mentalNote || ""} onChange={(v) => set("mentalNote", v)} placeholder="この試合でのメンタルの状態..." />
        <Textarea label="技術メモ" value={form.techNote || ""} onChange={(v) => set("techNote", v)} placeholder="フォーム、戦術、改善点..." />
        <Textarea label="相手メモ" value={form.opponentNote || ""} onChange={(v) => set("opponentNote", v)} placeholder="相手のスタイル、強かった点..." />
        <Textarea label="総括" value={form.note || ""} onChange={(v) => set("note", v)} placeholder="この試合で学んだこと..." />

        {/* アクション */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              minHeight: 44, padding: "10px 20px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.panel, color: C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
            }}
          >キャンセル</button>
          <button
            type="button"
            onClick={() => onSave && onSave(form)}
            style={{
              minHeight: 44, padding: "10px 20px", borderRadius: 8,
              border: "none", background: C.primary, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, fontFamily: font,
            }}
          >
            <Icon name="save" size={16} color="#fff" />保存
          </button>
        </div>
      </div>
    </div>
  );
}
