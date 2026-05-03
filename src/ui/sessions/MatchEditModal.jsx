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
// リクエスト 30-b: デフォルト「勝利」を「未定」(空文字 = placeholder) に変更
const RESULT_OPTS = [
  { value: "", label: "-- 未定 --" },
  { value: "勝利", label: "勝利" },
  { value: "敗北", label: "敗北" },
  { value: "棄権", label: "棄権" },
];

// S15.5.9: Match 編集中の auto-save (localStorage 下書き)
//   Safari バックグラウンド破棄や React レンダリングエラーで入力データロストする問題への対処。
//   form の変化のたびに localStorage に下書き保存、Modal 開く時に下書きあれば復元。
//   保存・破棄 (キャンセル) の確定操作で下書きクリア。
const _matchDraftKey = (id) => `${LS_PREFIX}match-draft-${id}-v1`;
const _loadMatchDraft = (id) => {
  if (!id) return null;
  try {
    const v = localStorage.getItem(_matchDraftKey(id));
    if (!v) return null;
    return JSON.parse(v);
  } catch (_) { return null; }
};
const _saveMatchDraft = (id, form) => {
  if (!id) return;
  try { localStorage.setItem(_matchDraftKey(id), JSON.stringify(form)); }
  catch (_) {}
};
const _clearMatchDraft = (id) => {
  if (!id) return;
  try { localStorage.removeItem(_matchDraftKey(id)); } catch (_) {}
};

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

function MatchEditModal({ open, match, trnType, racketNames = [], stringNames = [], opponentNames = [], recentSetups = [], confirm, onSave, onClose }) {
  // S15.5.9: 起動時に下書きがあればそちらを優先
  const [form, setForm] = useState(() => {
    if (!match || !match.id) return match;
    const draft = _loadMatchDraft(match.id);
    return draft || match;
  });
  const [dirty, setDirty] = useState(() => match?.id ? _loadMatchDraft(match.id) !== null : false);
  const [restored, setRestored] = useState(() => match?.id ? _loadMatchDraft(match.id) !== null : false);

  // open のたびに最新の match を反映 (別 match を編集する時の対応、S15.5.9 で下書き優先)
  useEffect(() => {
    if (!open) return;
    const draft = match?.id ? _loadMatchDraft(match.id) : null;
    if (draft) {
      setForm(draft);
      setDirty(true);     // 下書きあり = 未保存とみなす (キャンセル時 confirm 経由)
      setRestored(true);
    } else {
      setForm(match);
      setDirty(false);
      setRestored(false);
    }
  }, [open, match?.id]);

  // S15.5.9: form 変化のたびに localStorage に auto-save (dirty な間のみ)
  //   debounce なし即時、Match の form は数 KB なので localStorage 書き込みは高速
  useEffect(() => {
    if (!open || !form || !form.id || !dirty) return;
    _saveMatchDraft(form.id, form);
  }, [open, form, dirty]);

  // 未保存変更がある時は閉じる前に確認 (S15.5.9: 確定で下書きクリア)
  const handleClose = useCallback(() => {
    const clearDraft = () => { if (form?.id) _clearMatchDraft(form.id); };
    if (!dirty) { clearDraft(); onClose && onClose(); return; }
    if (!confirm) { clearDraft(); onClose && onClose(); return; }
    confirm.ask(
      "編集内容が保存されていません。破棄してよろしいですか？",
      () => { clearDraft(); onClose && onClose(); },
      { title: "未保存の変更があります", yesLabel: "破棄する", noLabel: "編集に戻る", yesVariant: "danger", icon: "triangle-alert" }
    );
  }, [dirty, confirm, onClose, form]);

  // S15.5.9: 保存ボタン (下書きクリア + 親に渡す)
  // S16.11 F5: 必須項目 validation (空 form 保存防止) — opponent と result が必須
  //   - 空の場合は保存ボタン無効化 + toast 警告
  const _isMatchValid = (f) => {
    if (!f) return false;
    if (!(f.opponent || "").trim()) return false;
    if (!(f.result || "").trim()) return false;
    return true;
  };
  const handleSaveClick = useCallback(() => {
    if (!_isMatchValid(form)) {
      // toast がない場合は handleSaveClick を caller 側 (onSave 内) で警告するが、ここで disabled にしているので通常は到達しない
      return;
    }
    if (form?.id) _clearMatchDraft(form.id);
    onSave && onSave(form);
  }, [form, onSave]);

  // S15.5.9: GameTracker からの onChange を dirty 追跡 + auto-save 連動
  //   従来 onChange={setForm} で dirty が立たず auto-save も走らなかったバグの解消
  // H-17 (Phase A 監査): result 手動変更後の自動上書き抑止フラグを useRef で保持。
  //   useState/form に乗せると Firestore に永続化されてしまうため、UI-only の状態として ref で管理。
  //   open=true 切替 (新規モーダル起動) でリセット。
  const manualResultLockRef = useRef(false);
  useEffect(() => {
    if (open) manualResultLockRef.current = false; // モーダル起動時にクリア
  }, [open]);

  // S16.11 UX2/UX3: games[] 変化時に setScores と result を自動計算して反映
  //   - games から計算したセットスコアを setScores に同期 (重複入力撤廃)
  //   - 2 セット先取で result を自動 "勝利" / "敗北" 設定
  // H-17: manualResultLockRef.current が true なら自動上書きを完全に skip
  //   旧の `next.result === autoResult` 条件は、手動敗北→games で勝利に偏っても上書きされない
  //   という偶然動作。今は「手動で result を選んだ後は二度と自動上書きしない」明確な仕様。
  const handleGameTrackerChange = useCallback((next) => {
    const games = Array.isArray(next.games) ? next.games : [];
    const autoSetScores = computeSetScoresFromGames(games);
    const autoResult = computeAutoMatchResult(games);
    const merged = { ...next, setScores: autoSetScores };
    if (autoResult && !manualResultLockRef.current) {
      merged.result = autoResult;
    }
    setForm(merged);
    setDirty(true);
  }, []);

  // Esc で閉じる (未保存確認経由)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  if (!open || !form) return null;

  // setter で dirty フラグを立てる
  // H-17: result の手動変更時に manualResultLockRef を立てて自動上書きを抑止
  const set = (k, v) => {
    if (k === "result") manualResultLockRef.current = true;
    setForm(p => ({ ...p, [k]: v }));
    setDirty(true);
  };
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

        {/* S15.5.9: 下書き復元バナー (Safari 破棄/クラッシュ後の再開時) */}
        {restored && (
          <div style={{
            background: C.warningLight, color: "#7e5d00",
            border: `1px solid ${C.warning}`,
            padding: "8px 10px", borderRadius: 8,
            fontSize: 12, marginBottom: 12, lineHeight: 1.5,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <Icon name="info" size={14} color="#7e5d00" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <b>下書きを復元しました</b><br />
              前回の編集が保存されずに中断された内容です。続けるか、不要なら「キャンセル」で破棄してください。
            </div>
            <button
              onClick={() => setRestored(false)}
              aria-label="この通知を閉じる"
              style={{
                background: "none", border: "none", color: "#7e5d00",
                cursor: "pointer", padding: 2, flexShrink: 0,
              }}
            >
              <Icon name="x" size={14} color="#7e5d00" />
            </button>
          </div>
        )}

        {/* リクエスト 30-c (preview_req30c_p1.html 案 X 承認済): 順序再配置
              ① 基本 → ② スコア (セットスコア + GameTracker をまとめる) →
              ③ コンディション (メンタル/フィジカル) → ④ 機材 → ⑤ メモ
            旧: スコアと GameTracker の間にメンタル/機材が挟まり情報分断 */}

        {/* ① 基本: ラウンド / 結果 / 対戦相手 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Select label="ラウンド" value={form.round || "1回戦"} onChange={(v) => set("round", v)} options={ROUND_OPTS} />
          <Select label="結果" value={form.result ?? ""} onChange={(v) => set("result", v)} options={RESULT_OPTS} />
        </div>
        <MasterField label="対戦相手" value={form.opponent || ""} onChange={(v) => set("opponent", v)} masterValues={opponentNames} placeholder="-- 対戦相手を選択 --" />
        {showOpponent2 && (
          <MasterField label="対戦相手 2 (ダブルス)" value={form.opponent2 || ""} onChange={(v) => set("opponent2", v)} masterValues={opponentNames} placeholder="-- 対戦相手 2 を選択 --" />
        )}

        {/* ② スコア (セットスコア + ゲーム単位記録) — 関連グループとして枠で囲う */}
        <div style={{
          background: C.bg, border: `1px solid ${C.divider}`,
          borderRadius: 10, padding: "10px 12px", marginTop: 10, marginBottom: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.primary,
            display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8,
          }}>
            <Icon name="trophy" size={13} color={C.primary} />スコア
          </div>
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
          {/* ゲーム単位記録 (F1.4.1)、S15.5.9 で onChange を dirty 追跡型に変更 */}
          <GameTracker match={form} onChange={handleGameTrackerChange} confirm={confirm} />
        </div>

        {/* ③ コンディション (メンタル / フィジカル) */}
        <div style={{
          background: C.bg, border: `1px solid ${C.divider}`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.success,
            display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8,
          }}>
            <Icon name="pulse" size={13} color={C.success} />コンディション
          </div>
          <_meRatingRow label="メンタル" value={form.mental || 3} onChange={(n) => set("mental", n)} />
          <_meRatingRow label="フィジカル" value={form.physical || 3} onChange={(n) => set("physical", n)} />
        </div>

        {/* ④ 機材 — ラケット 1 行 / 縦糸+横糸 / テンション縦+横 */}
        <div style={{
          background: C.bg, border: `1px solid ${C.divider}`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.trialAccent,
            display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8,
          }}>
            <Icon name="backpack" size={13} color={C.trialAccent} />機材
          </div>
          <MasterField label="ラケット" value={form.racketName || ""} onChange={(v) => set("racketName", v)} masterValues={racketNames} placeholder="-- ラケットを選択 --" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
            <MasterField label="縦糸" value={form.stringMain || ""} onChange={(v) => set("stringMain", v)} masterValues={stringNames} placeholder="-- 縦糸を選択 --" />
            <MasterField label="横糸" value={form.stringCross || ""} onChange={(v) => set("stringCross", v)} masterValues={stringNames} placeholder="-- 同じなら空欄 --" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
            <Input label="テンション縦" value={form.tensionMain || ""} onChange={(v) => set("tensionMain", v)} placeholder="46" />
            <Input label="テンション横" value={form.tensionCross || ""} onChange={(v) => set("tensionCross", v)} placeholder="43" />
          </div>
          {/* S16.11 UX5: 履歴セット picker (5 フィールド一括入力で 90 秒チェンジオーバー対応) */}
          <_SetupPickerButton
            recent={recentSetups}
            current={form}
            onApply={(s) => {
              if (!s) return;
              setForm(prev => ({
                ...prev,
                racketName: s.racketName || "",
                stringMain: s.stringMain || "",
                stringCross: s.stringCross || "",
                tensionMain: s.tensionMain || "",
                tensionCross: s.tensionCross || "",
              }));
              setDirty(true);
            }}
          />
        </div>

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
            onClick={handleSaveClick}
            disabled={!_isMatchValid(form)}
            title={_isMatchValid(form) ? "保存" : "対戦相手と結果は必須です"}
            style={{
              minHeight: 44, padding: "10px 20px", borderRadius: 8,
              border: "none",
              background: _isMatchValid(form) ? C.primary : C.textMuted,
              color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: _isMatchValid(form) ? "pointer" : "not-allowed",
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
