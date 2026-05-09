// PlanTab — 計画タブ (S17 新規実装、作戦室方向 = Decision Companion)
//
// 役割 (REQUIREMENTS_v4 F3 の S17 再定義):
//   Plan = 「次の試合・練習に向けて何を準備するか」を 1 画面で確認・編集する作戦室
//   Sessions (過去事実) / Gear (道具情報) / Home (直近予定) と被らない、意思決定中心
//
// 経緯: 旧 PlanTab (Next Actions + 対戦相手シンプル一覧) は archive/legacy_planTab/ へ git mv 退避済 (2026-05-07)
//       ChatGPT レビュー 3 回経由でユーザー承認 (preview_s17_plan_p1 → p2 → p3)
//       詳細は DECISIONS_v4.md S17 節 / WIREFRAMES_v4.md §2.9 参照
//
// データモデル (Firestore: users/{uid}/data/plan、単一オブジェクト):
//   plan = {
//     targetTournamentId: null | string,   // tournaments[].id
//     targetGoal: "",                      // 短文 (20 字推奨、maxLength 30)
//     targetTheme: "",                     // 短文 (30 字推奨、maxLength 50)
//     strategy: [],                        // string[] 最大 5、各 maxLength 80 (30-40 字推奨)
//     resetPhrase: "",                     // 試合中チェンジオーバー用リセット文 (1〜2 行、maxLength 80) S17.x ChatGPT 整理で追加
//     gearChoice: {
//       main:    { racketId, stringMainId, stringCrossId, tension, reason },  // 必須段
//       sub:     { ... },                                                      // 任意段
//       pending: { ... },                                                      // 任意段
//       concern: "",                                                           // 全体懸念 (140 字目安、maxLength 200)
//     }
//   }
//
// Reset Phrase の役割 (ChatGPT 整理 / WIREFRAMES §2.9.5b):
//   試合中はゲームピッカー (GameTracker) を見るので、Plan の作戦を直接読まない。
//   チェンジオーバーで「次の 2 ゲーム」に集中するための短文 (= リセット文) を
//   Plan で事前作成し、GameTracker のチェンジオーバーカードに表示する。
//   例: 「リターン深く。バックで我慢しすぎない。」「次の 2 ゲーム: スコアを切る / まず深さ」
//
// UX 規律 (preview_s17_plan_p3 ベース):
//   - Target 未設定時、Strategy / Gear カードは opacity 0.45 + 上部 callout で誘導
//   - Strategy 行は line-clamp 2 行、3 行目以降省略記号
//   - 編集・削除アイコンは opacity 0.42 (PC hover 時 0.9)
//   - 件数表記は全角括弧「（4/5）」
//   - Bottom sheet モーダル、auto-save (S15.5.9 標準)、focus trap (S16 Round 5 Phase 1 標準)
//   - 過去日になっても自動削除しない (暗黙確定禁止 / `feedback_data_destruction_2026_05_03.md` 準拠)

const _PLAN_MAX_STRATEGY = 5;
const _PLAN_STRATEGY_MAX_LEN = 80;
const _PLAN_GOAL_MAX_LEN = 30;
const _PLAN_THEME_MAX_LEN = 50;
const _PLAN_CONCERN_MAX_LEN = 200;
const _PLAN_RESET_MAX_LEN = 80; // Reset Phrase: チェンジオーバー用 (1〜2 行に収まる目安)

// ── 残り日数計算 (今日 - target 日付、負なら過去)
const _planDaysRemaining = (targetDateIso, todayIso) => {
  if (!targetDateIso) return null;
  const a = new Date(targetDateIso).getTime();
  const b = new Date(todayIso).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
};

// ── 残り日数ラベル
const _planDaysLabel = (days) => {
  if (days === null || days === undefined) return null;
  if (days < 0) return `${Math.abs(days)} 日経過`;
  if (days === 0) return "本日";
  return `残り ${days} 日`;
};

// ── 大会形式ラベル (fixture の値は singles/doubles/mixed の複数形、v2/v3 旧 single/double にも互換)
const _planTournamentTypeLabel = (t) => {
  if (!t || !t.type) return "";
  const lower = String(t.type).toLowerCase();
  if (lower.startsWith("single")) return "シングルス";
  if (lower.startsWith("double")) return "ダブルス";
  if (lower.startsWith("mixed")) return "ミックス";
  return t.type;
};

// ── 文字数の警告レベル (Strategy 入力カウンタ用)
const _planCounterLevel = (len, recommended, max) => {
  if (len > max) return "danger";
  if (len > recommended) return "warn";
  return "normal";
};

// ── ターゲット未設定時の callout
function _PlanCallout({ message }) {
  return (
    <div style={{
      background: C.primaryLight,
      border: `1px solid rgba(0,122,255,0.25)`,
      borderRadius: 10,
      padding: "7px 10px",
      fontSize: 11,
      color: C.primary,
      lineHeight: 1.5,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: font,
    }}>
      <Icon name="info" size={14} />
      <span>{message}</span>
    </div>
  );
}

// ── Mini ボタン (Card 右上の操作)
function _PlanMiniBtn({ onClick, primary, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 30,
        padding: "0 10px",
        background: primary ? C.primary : C.panel,
        border: `1px solid ${primary ? C.primary : C.border}`,
        borderRadius: 8,
        color: primary ? "#fff" : C.textSecondary,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: font,
      }}
    >
      {icon && <Icon name={icon} size={12} color={primary ? "#fff" : C.textSecondary} />}
      {children}
    </button>
  );
}

// ===================================================================
// Target Event Card (次のターゲット)
// ===================================================================

function _PlanTargetCard({ plan, tournaments, todayIso, onEdit, onChange }) {
  const tid = plan?.targetTournamentId || null;
  const target = tid ? (tournaments || []).find(t => t && t.id === tid) : null;

  // 未設定 (空状態)
  if (!target) {
    return (
      <div style={_planCardStyle()}>
        <div style={_planCardHead()}>
          <div style={_planCardTitle()}>
            <Icon name="trophy" size={18} color={C.textMuted} />
            次のターゲット
          </div>
        </div>
        <div style={{
          background: C.panel2,
          border: `1.5px dashed ${C.border}`,
          borderRadius: 14,
          padding: "18px 16px",
          textAlign: "center",
          color: C.textMuted,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>
            次のターゲット未設定
          </div>
          <div style={{ fontSize: 11, marginBottom: 12 }}>
            向かう大会を 1 つ選んで、作戦とギアを準備しましょう
          </div>
          <_PlanMiniBtn primary onClick={onChange} icon="plus">大会を選ぶ</_PlanMiniBtn>
        </div>
      </div>
    );
  }

  // 設定済
  const days = _planDaysRemaining(target.date, todayIso);
  const daysLabel = _planDaysLabel(days);
  const isPast = days !== null && days < 0;
  const typeLabel = _planTournamentTypeLabel(target);

  return (
    <div style={_planCardStyle()}>
      <div style={_planCardHead()}>
        <div style={_planCardTitle()}>
          <Icon name="trophy" size={18} color={C.tournamentAccent} />
          次のターゲット
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <_PlanMiniBtn onClick={onChange} icon="refresh">大会変更</_PlanMiniBtn>
          <_PlanMiniBtn primary onClick={onEdit} icon="edit">編集</_PlanMiniBtn>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 6 }}>
        {target.name || "(名称未設定)"}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: C.textSecondary, marginBottom: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="calendar" size={12} />
          {target.date || "日付未設定"}
        </span>
        {typeLabel && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="user" size={12} />
            {typeLabel}
          </span>
        )}
        {target.level && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="medal" size={12} />
            {target.level}
          </span>
        )}
      </div>
      {plan.targetGoal && (
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 2 }}>
          <span style={{ color: C.textMuted, marginRight: 6, fontSize: 11 }}>目標</span>
          {plan.targetGoal}
        </div>
      )}
      {plan.targetTheme && (
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 2 }}>
          <span style={{ color: C.textMuted, marginRight: 6, fontSize: 11 }}>テーマ</span>
          {plan.targetTheme}
        </div>
      )}
      {daysLabel && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: isPast ? C.error : C.tournamentAccent,
          background: isPast ? C.errorLight : C.tournamentLight,
          padding: "3px 10px",
          borderRadius: 12,
          marginTop: 6,
          fontVariantNumeric: "tabular-nums",
        }}>
          <Icon name="clock" size={12} color={isPast ? C.error : C.tournamentAccent} />
          {daysLabel}
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Target Edit Modal (大会変更 + 目標・テーマ編集)
// ===================================================================

function _PlanTargetEditModal({ open, plan, tournaments, todayIso, onSave, onClose }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) {
      setForm({
        targetTournamentId: plan?.targetTournamentId || "",
        targetGoal: plan?.targetGoal || "",
        targetTheme: plan?.targetTheme || "",
      });
    }
  }, [open, plan?.targetTournamentId, plan?.targetGoal, plan?.targetTheme]);

  // 大会候補を未来順 → 過去順で sort (Rules of Hooks: early return より前で全 hook を呼ぶ)
  const sorted = useMemo(() => {
    const all = (tournaments || []).filter(t => t && t.id);
    const future = [], past = [];
    for (const t of all) {
      const d = t.date || "";
      if (d >= todayIso) future.push(t);
      else past.push(t);
    }
    future.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    past.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { future, past };
  }, [tournaments, todayIso]);

  if (!open) return null;

  const valid = !!form.targetTournamentId;

  return (
    <Modal open={open} onClose={onClose} title="次のターゲットを編集">
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>ターゲット大会</label>
        <select
          value={form.targetTournamentId || ""}
          onChange={(e) => setForm({ ...form, targetTournamentId: e.target.value })}
          style={{
            background: C.panel2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 13,
            color: C.text,
            fontFamily: font,
            width: "100%",
            boxSizing: "border-box",
            WebkitAppearance: "none",
            appearance: "none",
          }}
        >
          <option value="">— 選択してください —</option>
          {sorted.future.length > 0 && (
            <optgroup label="今後の大会">
              {sorted.future.map(t => (
                <option key={t.id} value={t.id}>
                  {t.date || "日付未設定"} {t.name || "(名称未設定)"}
                </option>
              ))}
            </optgroup>
          )}
          {sorted.past.length > 0 && (
            <optgroup label="過去の大会 (振り返り用)">
              {sorted.past.map(t => (
                <option key={t.id} value={t.id}>
                  {t.date || "日付未設定"} {t.name || "(名称未設定)"}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <Input
        label={`目標 (短く、${20} 字以内推奨)`}
        value={form.targetGoal || ""}
        onChange={(v) => setForm({ ...form, targetGoal: v.slice(0, _PLAN_GOAL_MAX_LEN) })}
        placeholder="例: 初戦突破"
      />

      <Input
        label={`テーマ (短く、${30} 字以内推奨)`}
        value={form.targetTheme || ""}
        onChange={(v) => setForm({ ...form, targetTheme: v.slice(0, _PLAN_THEME_MAX_LEN) })}
        placeholder="例: 攻撃力を落とさず安定"
      />

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onClose}
          style={_planModalBtn(false)}
        >キャンセル</button>
        <button
          onClick={() => valid && onSave({
            targetTournamentId: form.targetTournamentId,
            targetGoal: (form.targetGoal || "").trim(),
            targetTheme: (form.targetTheme || "").trim(),
          })}
          disabled={!valid}
          style={_planModalBtn(true, valid)}
        >
          <Icon name="check" size={16} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>
    </Modal>
  );
}

// ===================================================================
// Strategy Card (今回の作戦)
// ===================================================================

function _PlanStrategyCard({ strategy, dimmed, onAdd, onEditItem, onDeleteItem, onAiOrganize }) {
  const list = Array.isArray(strategy) ? strategy : [];
  const count = list.length;
  const titleColor = dimmed ? C.textMuted : C.primary;

  return (
    <div style={{ ..._planCardStyle(), ..._planDimmedStyle(dimmed) }}>
      <div style={_planCardHead()}>
        <div style={_planCardTitle()}>
          <Icon name="clipboard-text" size={18} color={titleColor} />
          今回の作戦
          {!dimmed && (
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginLeft: 2 }}>
              （{count}/{_PLAN_MAX_STRATEGY}）
            </span>
          )}
        </div>
        {!dimmed && (
          <_PlanMiniBtn onClick={onAiOrganize} icon="sparkle">AI 整理</_PlanMiniBtn>
        )}
      </div>

      {dimmed ? (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "8px 0" }}>
          ターゲット設定後に作戦メモを書き出します
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "16px 0" }}>
          まだ作戦がありません。試合中に見返すメモを短く書き出しましょう
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((text, idx) => (
            <_PlanStrategyRow
              key={idx}
              text={text}
              isLast={idx === list.length - 1}
              onEdit={() => onEditItem(idx, text)}
              onDelete={() => onDeleteItem(idx, text)}
            />
          ))}
        </div>
      )}

      {!dimmed && count < _PLAN_MAX_STRATEGY && (
        <button
          onClick={onAdd}
          style={{
            marginTop: 8,
            background: "transparent",
            border: `1px dashed ${C.border}`,
            borderRadius: 10,
            minHeight: 34,
            width: "100%",
            color: C.primary,
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          <Icon name="plus" size={12} color={C.primary} />
          項目を追加 (あと {_PLAN_MAX_STRATEGY - count} 項目)
        </button>
      )}
    </div>
  );
}

function _PlanStrategyRow({ text, isLast, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "14px 1fr auto",
        alignItems: "flex-start",
        columnGap: 8,
        padding: "7px 4px",
        borderBottom: isLast ? "none" : `1px dashed ${C.divider}`,
        fontSize: 13,
        color: C.text,
        lineHeight: 1.5,
        minHeight: 32,
      }}
    >
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: C.primary, justifySelf: "center", marginTop: 8,
      }} />
      <div style={{
        minWidth: 0,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
      }}>
        {text}
      </div>
      <div style={{
        display: "flex", gap: 2,
        opacity: hover ? 0.9 : 0.42,
        transition: "opacity 0.15s",
        alignSelf: "center",
      }}>
        <button
          onClick={onEdit}
          aria-label="編集"
          style={_planRowIconBtn()}
        >
          <Icon name="edit" size={13} color={C.textMuted} />
        </button>
        <button
          onClick={onDelete}
          aria-label="削除"
          style={_planRowIconBtn()}
        >
          <Icon name="trash-2" size={13} color={C.textMuted} />
        </button>
      </div>
    </div>
  );
}

// ===================================================================
// Strategy Edit Modal (1 項目編集、新規/既存共用)
// ===================================================================

function _PlanStrategyEditModal({ open, initialText, isNew, onSave, onClose }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText(initialText || "");
  }, [open, initialText]);
  if (!open) return null;
  const trimmed = text.trim();
  const valid = trimmed.length > 0 && trimmed.length <= _PLAN_STRATEGY_MAX_LEN;
  const len = text.length;
  const level = _planCounterLevel(len, 40, _PLAN_STRATEGY_MAX_LEN);
  const counterColor = level === "danger" ? C.error : level === "warn" ? C.warning : C.textMuted;

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "作戦を追加" : "作戦を編集"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
          作戦文 (試合中に見返せる短文、推奨 30〜40 字)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, _PLAN_STRATEGY_MAX_LEN))}
          placeholder="例: 序盤はバック側で無理に打ち合わない"
          rows={3}
          style={{
            background: C.panel2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            color: C.text,
            fontFamily: font,
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            lineHeight: 1.5,
            WebkitAppearance: "none",
            appearance: "none",
          }}
        />
        <div style={{
          fontSize: 11,
          color: counterColor,
          fontFamily: font,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          marginTop: 2,
        }}>
          {len} / {_PLAN_STRATEGY_MAX_LEN} {level === "danger" ? "(長すぎ)" : level === "warn" ? "(やや長い)" : ""}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={onClose} style={_planModalBtn(false)}>キャンセル</button>
        <button
          onClick={() => valid && onSave(trimmed)}
          disabled={!valid}
          style={_planModalBtn(true, valid)}
        >
          <Icon name="check" size={16} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>
    </Modal>
  );
}

// ===================================================================
// Reset Phrase Card (S17.x ChatGPT 整理: 試合中チェンジオーバー用)
//   試合中はゲームピッカー (GameTracker) が主、Plan の長文作戦は読まない。
//   チェンジオーバーで「次の 2 ゲーム」に集中するための短文 (1〜2 行) を Plan で作成し、
//   GameTracker のチェンジオーバーカードで表示する。
//   例: 「リターン深く。バックで我慢しすぎない。」「スコアを切る / まず深さ」
// ===================================================================

function _PlanResetCard({ resetPhrase, dimmed, onEdit, onAiGenerate }) {
  const titleColor = dimmed ? C.textMuted : C.appleMint;
  const hasContent = !!(resetPhrase || "").trim();
  return (
    <div style={{ ..._planCardStyle(), ..._planDimmedStyle(dimmed) }}>
      <div style={_planCardHead()}>
        <div style={_planCardTitle()}>
          <Icon name="repeat" size={18} color={titleColor} />
          チェンジオーバーで戻る
        </div>
        {!dimmed && (
          <div style={{ display: "inline-flex", gap: 6 }}>
            <_PlanMiniBtn onClick={onAiGenerate} icon="sparkle">AI 生成</_PlanMiniBtn>
            <_PlanMiniBtn primary onClick={onEdit} icon="edit">{hasContent ? "編集" : "作成"}</_PlanMiniBtn>
          </div>
        )}
      </div>
      {dimmed ? (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "8px 0" }}>
          ターゲット設定後にリセット文を作成します
        </div>
      ) : hasContent ? (
        <div style={{
          fontSize: 13, lineHeight: 1.55, color: C.text, whiteSpace: "pre-wrap",
          padding: "8px 12px", background: "rgba(0,199,190,0.06)",
          border: "1px solid rgba(0,199,190,0.25)", borderRadius: 12,
        }}>
          {resetPhrase}
        </div>
      ) : (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "8px 0", lineHeight: 1.5 }}>
          試合中のチェンジオーバーで自分を戻す短文を作成しましょう<br />
          <span style={{ fontSize: 11, color: C.textMuted, opacity: 0.7 }}>例: 「リターン深く。バックで我慢しすぎない。」</span>
        </div>
      )}
    </div>
  );
}

function _PlanResetEditModal({ open, initialText, onSave, onClose }) {
  const [text, setText] = useState(initialText || "");
  useEffect(() => { if (open) setText(initialText || ""); }, [open, initialText]);
  if (!open) return null;
  const len = text.length;
  const level = _planCounterLevel(len, 60, _PLAN_RESET_MAX_LEN);
  const counterColor = level === "danger" ? C.error : (level === "warn" ? "#b06b00" : C.textMuted);
  const handleSave = () => {
    const trimmed = (text || "").trim();
    onSave(trimmed);
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.panel, borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 600,
        padding: 16, paddingBottom: 32, fontFamily: font,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          チェンジオーバーで戻る短文
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 8, lineHeight: 1.5 }}>
          試合中のチェンジオーバー (GameTracker のリセット地点) で表示される文。<br />
          1〜2 行 (60 字以内推奨)、長文は試合中に読めません。
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, _PLAN_RESET_MAX_LEN))}
          placeholder="例: リターン深く。バックで我慢しすぎない。"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "10px 12px", fontSize: 14, fontFamily: font,
            background: C.panel, color: C.text, resize: "vertical",
            minHeight: 80,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: counterColor, fontVariantNumeric: "tabular-nums" }}>
            {len} / {_PLAN_RESET_MAX_LEN} 字
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={_planModalBtn(false, true)}>キャンセル</button>
          <button onClick={handleSave} style={_planModalBtn(true, true)}>
            <Icon name="check" size={16} color="#fff" />保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// AI Modals (S17.x 段階 1+2、Cloud Functions planAssist 経由)
// ===================================================================

// 段階 1: Strategy AI 整理 — 長文メモ → 5 項目以内に短文化
function _PlanAiOrganizeModal({ open, onAdopt, onClose, toast }) {
  const [longText, setLongText] = useState("");
  const [items, setItems] = useState([]);  // AI 結果候補
  const [picked, setPicked] = useState({}); // { idx: bool }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) { setLongText(""); setItems([]); setPicked({}); setBusy(false); setError(""); }
  }, [open]);
  if (!open) return null;
  const handleRun = async () => {
    setError(""); setBusy(true);
    try {
      const result = await aiOrganizeStrategy(longText);
      setItems(result);
      const pickAll = {};
      result.forEach((_, i) => { pickAll[i] = true; });
      setPicked(pickAll);
    } catch (e) {
      setError(e?.message || "AI 接続に失敗しました");
    } finally {
      setBusy(false);
    }
  };
  const adoptCount = Object.values(picked).filter(Boolean).length;
  const handleAdoptClick = () => {
    const adopted = items.filter((_, i) => picked[i]);
    if (adopted.length === 0) { if (toast) toast.show("採用する項目を選んでください", "warning"); return; }
    onAdopt(adopted);
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.panel, borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 600, maxHeight: "85%", overflowY: "auto",
        padding: 16, paddingBottom: 32, fontFamily: font,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="sparkle" size={16} color={C.primary} />AI で作戦を整理
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
          長めの作戦メモを 5 項目以内 (各 30 字以内) に短文化します。<br />
          採用前にユーザー確認、自動保存はしません。
        </div>
        {items.length === 0 ? (
          <>
            <textarea
              value={longText}
              onChange={(e) => setLongText(e.target.value.slice(0, 4000))}
              placeholder="作戦メモを長文で入力 (例: 序盤はバックで打ち合わない、フォアで先に展開、リターンはブロックで深さ優先...)"
              rows={6}
              disabled={busy}
              style={{
                width: "100%", boxSizing: "border-box",
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", fontSize: 13, fontFamily: font,
                background: busy ? C.panel2 : C.panel, color: C.text, resize: "vertical",
                minHeight: 120,
              }}
            />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginBottom: 10 }}>
              {longText.length} 文字 (30 字以上必要)
            </div>
            {error && (
              <div style={{ background: C.errorLight, color: C.error, padding: "8px 10px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={_planModalBtn(false, true)} disabled={busy}>キャンセル</button>
              <button onClick={handleRun} style={_planModalBtn(true, longText.trim().length >= 30 && !busy)} disabled={busy || longText.trim().length < 30}>
                <Icon name="sparkle" size={14} color="#fff" />{busy ? "整理中…" : "整理する"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>
              AI が {items.length} 項目に整理しました。採用するものをチェックして「採用」してください。<br />
              編集が必要なら、採用後に各行をタップで個別編集できます。
            </div>
            {items.map((item, i) => (
              <label key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 12px", marginBottom: 4,
                background: picked[i] ? C.primaryLight : C.panel2,
                border: `1px solid ${picked[i] ? C.primary : C.border}`,
                borderRadius: 8, cursor: "pointer",
              }}>
                <input type="checkbox" checked={!!picked[i]} onChange={(e) => setPicked(p => ({ ...p, [i]: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: C.primary, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</span>
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={onClose} style={_planModalBtn(false, true)}>破棄</button>
              <button onClick={() => { setItems([]); setPicked({}); }} style={_planModalBtn(false, true)}>もう一度</button>
              <button onClick={handleAdoptClick} style={_planModalBtn(true, adoptCount > 0)} disabled={adoptCount === 0}>
                <Icon name="check" size={14} color="#fff" />{adoptCount} 項目を採用
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 段階 2: Reset Phrase AI 生成 — 既存 strategy + targetGoal/Theme から試合中リセット文 1 つ
function _PlanAiResetGenModal({ open, strategy, targetGoal, targetTheme, onAdopt, onClose, toast }) {
  const [resultText, setResultText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setResultText(""); setError(""); setBusy(true);
    aiGenerateResetPhrase(strategy, targetGoal, targetTheme)
      .then(txt => { setResultText(txt); setBusy(false); })
      .catch(e => { setError(e?.message || "AI 接続に失敗しました"); setBusy(false); });
  }, [open]);
  if (!open) return null;
  const handleAdopt = () => {
    const t = (resultText || "").trim();
    if (!t) { if (toast) toast.show("リセット文が空です", "warning"); return; }
    onAdopt(t);
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.panel, borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 600,
        padding: 16, paddingBottom: 32, fontFamily: font,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="sparkle" size={16} color={C.appleMint} />AI でリセット文を生成
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
          現在の作戦 {strategy.length} 項目 + 目標・テーマから、試合中チェンジオーバー用の短文を 1 つ生成します。
        </div>
        {busy ? (
          <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: C.textSecondary }}>
            生成中…
          </div>
        ) : error ? (
          <div style={{ background: C.errorLight, color: C.error, padding: "10px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
            {error}
          </div>
        ) : (
          <>
            <textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value.slice(0, _PLAN_RESET_MAX_LEN))}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", fontSize: 14, fontFamily: font,
                background: C.panel, color: C.text, resize: "vertical",
                minHeight: 80,
              }}
            />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginBottom: 10 }}>
              {resultText.length} / {_PLAN_RESET_MAX_LEN} 字 (編集してから採用可)
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={_planModalBtn(false, true)}>破棄</button>
          {!busy && !error && resultText && (
            <button onClick={handleAdopt} style={_planModalBtn(true, true)}>
              <Icon name="check" size={14} color="#fff" />採用
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Gear Decision Card (今回のギア決定)
// ===================================================================

function _PlanGearCard({ gearChoice, rackets, strings, dimmed, onEdit }) {
  const gc = gearChoice || {};
  const titleColor = dimmed ? C.textMuted : C.applePeach;

  return (
    <div style={{ ..._planCardStyle(), ..._planDimmedStyle(dimmed) }}>
      <div style={_planCardHead()}>
        <div style={_planCardTitle()}>
          <Icon name="trophy" size={18} color={titleColor} />
          今回のギア決定
        </div>
        {!dimmed && (
          <_PlanMiniBtn primary onClick={onEdit} icon="edit">編集</_PlanMiniBtn>
        )}
      </div>

      {dimmed ? (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "8px 0" }}>
          ターゲット設定後にギアを決定します
        </div>
      ) : (
        <>
          <_PlanGearTier label="本命" tone="main" data={gc.main} rackets={rackets} strings={strings} required />
          <_PlanGearTier label="対抗" tone="sub" data={gc.sub} rackets={rackets} strings={strings} />
          <_PlanGearTier label="保留" tone="pending" data={gc.pending} rackets={rackets} strings={strings} />
          {gc.concern && gc.concern.trim() && (
            <div style={{
              marginTop: 8,
              padding: "8px 12px",
              background: C.warningLight,
              border: `1px solid rgba(251,188,4,0.3)`,
              borderRadius: 12,
              fontSize: 11,
              color: C.text,
              lineHeight: 1.5,
            }}>
              <span style={{ color: "#b06b00", fontWeight: 700, marginRight: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="alert-triangle" size={12} color="#b06b00" />
                全体の懸念
              </span>
              {gc.concern}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function _PlanGearTier({ label, tone, data, rackets, strings, required }) {
  const racket = (rackets || []).find(r => r && r.id === data?.racketId);
  const stringMain = (strings || []).find(s => s && s.id === data?.stringMainId);
  const stringCross = (strings || []).find(s => s && s.id === data?.stringCrossId);

  // tone 別の color / bg
  const toneStyles = {
    main: { labelColor: C.applePeach, bg: `linear-gradient(135deg, rgba(255,149,0,0.06) 0%, #fff 70%)`, border: `rgba(255,149,0,0.3)` },
    sub:  { labelColor: C.appleMint,  bg: `linear-gradient(135deg, rgba(0,199,190,0.06) 0%, #fff 70%)`,  border: `rgba(0,199,190,0.3)` },
    pending: { labelColor: C.textMuted, bg: C.panel2, border: C.border },
  };
  const t = toneStyles[tone] || toneStyles.pending;

  const isEmpty = !racket && !data?.racketId;

  return (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: "10px 14px",
      marginBottom: 6,
      background: t.bg,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: t.labelColor, marginBottom: 3 }}>
        {label}
      </div>
      {isEmpty ? (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
          {required ? "(本命未設定)" : "— 未設定 —"}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
            {racket?.name || "(削除済ラケット)"}
          </div>
          {(() => {
            // S17 Phase 1 wheel 拡張: tensionMain/tensionCross 優先表示、旧 tension 文字列は後方互換 fallback
            const tDisplay = [data?.tensionMain, data?.tensionCross].filter(Boolean).join("/") || data?.tension || "";
            if (!stringMain && !stringCross && !tDisplay) return null;
            return (
              <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>
                {stringMain?.name || "(縦糸未設定)"}
                {stringCross && stringCross.id !== stringMain?.id ? ` × ${stringCross.name}` : ""}
                {tDisplay && ` / ${tDisplay} lbs`}
              </div>
            );
          })()}
          {data?.reason && (
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.45 }}>
              <span style={{ color: C.textMuted, marginRight: 4 }}>理由</span>
              {data.reason}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===================================================================
// Gear Decision Edit Modal (3 段同時編集)
// ===================================================================

function _PlanGearEditModal({ open, gearChoice, rackets, strings, trials, tournaments, onSave, onClose }) {
  const [form, setForm] = useState({});
  // S17 Phase 4: 過去から 1 タップ流し込み Bottom sheet の対象段 (null=閉)
  //   試打/大会を時系列 mix で 1 リスト表示 (各行先頭にアイコンで区別、segment 切替なし = bundle 軽量化)
  const [loadFromTier, setLoadFromTier] = useState(null);
  useEffect(() => {
    if (open) {
      setForm({
        main:    { ...(gearChoice?.main || {}) },
        sub:     { ...(gearChoice?.sub || {}) },
        pending: { ...(gearChoice?.pending || {}) },
        concern: gearChoice?.concern || "",
      });
    }
  }, [open, gearChoice]);
  if (!open) return null;

  // S17 Phase 1-A: 引退ラケット / 除外ストリングを除外 + status 優先度 → order ASC で sort
  //   (DESIGN_SYSTEM §11.1、機材タブ Reorder Mode の並び順をここでも反映)
  const racketOpts = sortByStatusAndOrder((rackets || []).filter(r => r && r.status !== "retired"), RACKET_STATUS_PRIORITY);
  const stringOpts = sortByStatusAndOrder((strings || []).filter(s => s && s.status !== "rejected"), STRING_STATUS_PRIORITY);

  // 本命のみ必須
  const valid = !!form.main?.racketId;

  const updateTier = (tier, key, value) => {
    setForm(prev => ({ ...prev, [tier]: { ...(prev[tier] || {}), [key]: value } }));
  };

  // S17 Phase 1 (Q2): 過去 trial から該当段に 1 タップ流し込み
  //   trial の name (racketName / stringMain / stringCross) を master の id に変換
  //   master に該当が無ければ null (ユーザーは別途 master 追加が必要)、tension は string そのまま
  //   reason は維持 (既に書いていれば上書きしない)
  // S17 Phase 4: trial / tournament いずれもフィールド命名は同 (racketName / stringMain / stringCross / tensionMain / tensionCross)
  // 統一 handler で source 別の data.matches も取れる構造にしておく
  const handleApplyPastToTier = (src, tier) => {
    if (!src || !tier) return;
    const racket = (rackets || []).find(r => r && r.name === src.racketName);
    const stringMain = (strings || []).find(s => s && s.name === src.stringMain);
    const stringCross = (strings || []).find(s => s && s.name === src.stringCross);
    setForm(prev => ({
      ...prev,
      [tier]: {
        ...(prev[tier] || {}),
        racketId:      racket?.id || null,
        stringMainId:  stringMain?.id || null,
        stringCrossId: stringCross?.id || null,
        tensionMain:   src.tensionMain || "",
        tensionCross:  src.tensionCross || "",
        // reason は維持 (上書きしない)
      },
    }));
    setLoadFromTier(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="今回のギア決定を編集">
      {["main", "sub", "pending"].map(tier => {
        const labelMap = { main: "本命 (必須)", sub: "対抗 (任意)", pending: "保留 (任意)" };
        const data = form[tier] || {};
        return (
          <div key={tier} style={{
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 10,
          }}>
            {/* S17 Phase 4: 段ヘッダー + 「過去から」1 ボタン (trials/tournaments いずれかがあれば表示)。
                  シート内で 試打 / 大会 segment 切替 (シート高さ固定で外形不動) */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8, gap: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary }}>
                {labelMap[tier]}
              </div>
              {((trials || []).length > 0 || (tournaments || []).length > 0) && (
                <button
                  type="button"
                  onClick={() => setLoadFromTier(tier)}
                  style={{
                    minHeight: 28, padding: "0 10px",
                    background: C.primaryLight,
                    border: `1px solid ${C.primary}`,
                    borderRadius: 6,
                    color: C.primary,
                    fontSize: 11, fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontFamily: font,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="history" size={12} color={C.primary} />
                  過去から
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <_PlanGearSelect
                label="ラケット"
                value={data.racketId || ""}
                onChange={(v) => updateTier(tier, "racketId", v || null)}
                options={racketOpts}
                emptyLabel="— 選択してください —"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <_PlanGearSelect
                  label="縦糸"
                  value={data.stringMainId || ""}
                  onChange={(v) => updateTier(tier, "stringMainId", v || null)}
                  options={stringOpts}
                  emptyLabel="— 未選択 —"
                />
                <_PlanGearSelect
                  label="横糸"
                  value={data.stringCrossId || ""}
                  onChange={(v) => updateTier(tier, "stringCrossId", v || null)}
                  options={stringOpts}
                  emptyLabel="— 未選択 —"
                />
              </div>
              {/* S17 Phase 1 wheel 拡張: tension 単一 input → tensionMain/tensionCross の 2 NumWheel に分割 (機材タブ TrialEditForm 等と完全整合: gap "0 10px"、label「テンション縦/テンション横」) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                <NumWheel
                  label="テンション縦"
                  value={data.tensionMain || ""}
                  min={35} max={55} step={1}
                  onChange={(v) => updateTier(tier, "tensionMain", v)}
                />
                <NumWheel
                  label="テンション横"
                  value={data.tensionCross || ""}
                  min={35} max={55} step={1}
                  onChange={(v) => updateTier(tier, "tensionCross", v)}
                />
              </div>
              <Input
                label="採用理由 (短く)"
                value={data.reason || ""}
                onChange={(v) => updateTier(tier, "reason", v.slice(0, 120))}
                placeholder={tier === "main" ? "攻撃力の信頼感が高い" : "(任意)"}
              />
            </div>
          </div>
        );
      })}

      <Textarea
        label={`全体の懸念 (140 字目安)`}
        value={form.concern || ""}
        onChange={(v) => setForm({ ...form, concern: v.slice(0, _PLAN_CONCERN_MAX_LEN) })}
        placeholder="例: 後半に振り抜きが重くなる傾向"
        rows={3}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={onClose} style={_planModalBtn(false)}>キャンセル</button>
        <button
          onClick={() => valid && onSave({
            main:    form.main || {},
            sub:     form.sub || {},
            pending: form.pending || {},
            concern: (form.concern || "").trim(),
          })}
          disabled={!valid}
          style={_planModalBtn(true, valid)}
        >
          <Icon name="check" size={16} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>

      {/* S17 Phase 4 (B 案): 試打 + 大会 mix で 1 リスト、segment 切替なし (bundle 軽量化のため Phase 1 と同サイズ目標) */}
      {loadFromTier && (() => {
        const ts = (trials || []).filter(t => t && t.racketName).map(t => ({ ...t, _kind: "trial" }));
        const tn = (tournaments || []).filter(t => t && t.racketName).map(t => ({ ...t, _kind: "tour" }));
        const sorted = ts.concat(tn).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 50);
        const tierLabel = loadFromTier === "main" ? "本命" : loadFromTier === "sub" ? "対抗" : "保留";
        return (
          <div onClick={() => setLoadFromTier(null)} style={{
            position: "fixed", inset: 0, zIndex: 2500,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: C.panel, borderRadius: "20px 20px 0 0",
              width: "100%", maxWidth: 600, maxHeight: "75%", overflow: "auto",
              padding: 16, paddingBottom: 32, fontFamily: font,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{tierLabel} に流し込むセットを選ぶ</div>
                <button onClick={() => setLoadFromTier(null)} aria-label="閉じる" style={{
                  width: 32, height: 32, padding: 0, background: "transparent", border: "none",
                  color: C.textMuted, cursor: "pointer", borderRadius: 6,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}><Icon name="x" size={20} /></button>
              </div>
              {sorted.length === 0 ? (
                <div style={{ textAlign: "center", color: C.textMuted, padding: "24px 0", fontSize: 13 }}>過去のセットが見つかりません</div>
              ) : sorted.map(it => {
                const isT = it._kind === "tour";
                const sInfo = [it.stringMain, it.stringCross].filter(Boolean).join(" / ");
                const tInfo = [it.tensionMain, it.tensionCross].filter(Boolean).join(" / ");
                return (
                  <button key={it._kind + ":" + it.id} onClick={() => handleApplyPastToTier(it, loadFromTier)} style={{
                    width: "100%", background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: "10px 14px", marginBottom: 6,
                    cursor: "pointer", fontFamily: font, textAlign: "left",
                    display: "block", color: C.text,
                  }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, fontVariantNumeric: "tabular-nums" }}>
                      {isT ? "🏆" : "📜"} {it.date || "(日付不明)"}{isT && it.name ? ` · ${it.name}` : ""}{isT && it.overallResult ? ` · ${it.overallResult}` : ""}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{it.racketName}</div>
                    <div style={{ fontSize: 11, color: C.textSecondary }}>{sInfo || "(糸 未指定)"}{tInfo && ` / ${tInfo}`}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}

function _PlanGearSelect({ label, value, onChange, options, emptyLabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.panel2,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          color: C.text,
          fontFamily: font,
          width: "100%",
          boxSizing: "border-box",
          WebkitAppearance: "none",
          appearance: "none",
        }}
      >
        <option value="">{emptyLabel}</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>
    </div>
  );
}

// ===================================================================
// 共通スタイル helper
// ===================================================================

function _planCardStyle() {
  return {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: "14px 16px",
    marginBottom: 12,
  };
}
function _planCardHead() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  };
}
function _planCardTitle() {
  return {
    fontSize: 13,
    fontWeight: 700,
    color: C.text,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: font,
  };
}
function _planDimmedStyle(dimmed) {
  return dimmed ? { opacity: 0.45, pointerEvents: "none" } : {};
}
function _planRowIconBtn() {
  return {
    width: 24, height: 24, padding: 0,
    background: "transparent", border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: font,
  };
}
function _planModalBtn(primary, enabled) {
  const isEnabled = enabled !== false;
  return {
    flex: primary ? 1 : "0 0 100px",
    minHeight: 44,
    padding: "0 14px",
    background: primary ? (isEnabled ? C.primary : C.panel2) : C.panel,
    border: `1px solid ${primary ? (isEnabled ? C.primary : C.border) : C.border}`,
    borderRadius: 10,
    color: primary ? (isEnabled ? "#fff" : C.textMuted) : C.text,
    fontSize: primary ? 15 : 14,
    fontWeight: 700,
    cursor: isEnabled ? "pointer" : "not-allowed",
    fontFamily: font,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}

// ===================================================================
// PlanTab 本体
// ===================================================================

function PlanTab({ plan, tournaments, rackets, strings, trials, onPlanSave, toast, confirm }) {
  const todayIso = today();
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const tid = safePlan.targetTournamentId || null;
  const targetSet = !!tid && (tournaments || []).some(t => t && t.id === tid);

  // モーダル状態
  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [strategyEditTarget, setStrategyEditTarget] = useState(null); // null=閉、{idx,text} or {idx:-1, text:""}=新規
  const [gearEditOpen, setGearEditOpen] = useState(false);
  const [resetEditOpen, setResetEditOpen] = useState(false);
  // S17.x AI 段階 1+2 (Strategy AI 整理 / Reset Phrase AI 生成)
  const [aiOrganizeOpen, setAiOrganizeOpen] = useState(false);
  const [aiResetGenOpen, setAiResetGenOpen] = useState(false);

  // ── Target Edit ハンドラ
  const handleTargetEdit = () => setTargetEditOpen(true);
  const handleTargetChange = () => setTargetEditOpen(true);
  const handleTargetSave = (next) => {
    onPlanSave({ ...safePlan, ...next });
    setTargetEditOpen(false);
    toast.show("ターゲットを保存しました", "success");
  };

  // ── Strategy ハンドラ
  const handleStrategyAdd = () => setStrategyEditTarget({ idx: -1, text: "" });
  const handleStrategyEditItem = (idx, text) => setStrategyEditTarget({ idx, text });
  const handleStrategyDeleteItem = (idx, text) => {
    confirm.ask(
      `「${(text || "").slice(0, 30)}${(text || "").length > 30 ? "…" : ""}」を削除しますか？`,
      () => {
        const list = Array.isArray(safePlan.strategy) ? safePlan.strategy : [];
        const newList = list.filter((_, i) => i !== idx);
        onPlanSave({ ...safePlan, strategy: newList });
        toast.show("作戦を削除しました", "info");
      },
      { title: "作戦を削除", yesLabel: "削除", noLabel: "キャンセル", yesVariant: "danger" }
    );
  };
  const handleStrategySave = (text) => {
    const list = Array.isArray(safePlan.strategy) ? safePlan.strategy : [];
    const target = strategyEditTarget;
    let newList;
    if (target && target.idx >= 0) {
      newList = list.map((s, i) => i === target.idx ? text : s);
    } else {
      newList = [...list, text].slice(0, _PLAN_MAX_STRATEGY);
    }
    onPlanSave({ ...safePlan, strategy: newList });
    setStrategyEditTarget(null);
    toast.show(target && target.idx >= 0 ? "作戦を更新しました" : "作戦を追加しました", "success");
  };

  // ── Gear ハンドラ
  const handleGearEdit = () => setGearEditOpen(true);
  const handleResetSave = (txt) => {
    onPlanSave({ ...safePlan, resetPhrase: (txt || "").slice(0, _PLAN_RESET_MAX_LEN) });
    setResetEditOpen(false);
  };

  // AI 整理 結果採用: 既存 strategy に追加 (上限 5 項目)
  const handleAiOrganizeAdopt = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const existing = Array.isArray(safePlan.strategy) ? safePlan.strategy : [];
    const merged = [...existing, ...items].slice(0, _PLAN_MAX_STRATEGY);
    onPlanSave({ ...safePlan, strategy: merged });
    setAiOrganizeOpen(false);
  };
  // AI 生成 結果採用: resetPhrase に直接セット
  const handleAiResetAdopt = (txt) => {
    if (!txt) return;
    onPlanSave({ ...safePlan, resetPhrase: (txt || "").slice(0, _PLAN_RESET_MAX_LEN) });
    setAiResetGenOpen(false);
  };

  const handleGearSave = (gearChoice) => {
    onPlanSave({ ...safePlan, gearChoice });
    setGearEditOpen(false);
    toast.show("ギア決定を保存しました", "success");
  };

  const dimmed = !targetSet;

  return (
    <div style={{ padding: "12px 14px 24px", overflow: "auto", flex: 1 }}>
      {/* === 1. Target Event Card === */}
      <_PlanTargetCard
        plan={safePlan}
        tournaments={tournaments}
        todayIso={todayIso}
        onEdit={handleTargetEdit}
        onChange={handleTargetChange}
      />

      {/* === ターゲット未設定時の callout === */}
      {dimmed && (
        <_PlanCallout message="先にターゲットを設定すると、作戦・ギアを編集できます。" />
      )}

      {/* === 2. Strategy Card === */}
      <_PlanStrategyCard
        strategy={safePlan.strategy}
        dimmed={dimmed}
        onAdd={handleStrategyAdd}
        onEditItem={handleStrategyEditItem}
        onDeleteItem={handleStrategyDeleteItem}
        onAiOrganize={() => setAiOrganizeOpen(true)}
      />

      {/* === 2.5 Reset Phrase Card (S17.x ChatGPT 整理で追加: 試合中チェンジオーバー用) === */}
      <_PlanResetCard
        resetPhrase={safePlan.resetPhrase || ""}
        dimmed={dimmed}
        onEdit={() => setResetEditOpen(true)}
        onAiGenerate={() => setAiResetGenOpen(true)}
      />

      {/* === 3. Gear Decision Card === */}
      <_PlanGearCard
        gearChoice={safePlan.gearChoice}
        rackets={rackets}
        strings={strings}
        dimmed={dimmed}
        onEdit={handleGearEdit}
      />

      {/* === Modals === */}
      <_PlanTargetEditModal
        open={targetEditOpen}
        plan={safePlan}
        tournaments={tournaments}
        todayIso={todayIso}
        onSave={handleTargetSave}
        onClose={() => setTargetEditOpen(false)}
      />
      <_PlanStrategyEditModal
        open={!!strategyEditTarget}
        initialText={strategyEditTarget?.text || ""}
        isNew={strategyEditTarget?.idx === -1}
        onSave={handleStrategySave}
        onClose={() => setStrategyEditTarget(null)}
      />
      <_PlanGearEditModal
        open={gearEditOpen}
        gearChoice={safePlan.gearChoice}
        rackets={rackets}
        strings={strings}
        trials={trials}
        tournaments={tournaments}
        onSave={handleGearSave}
        onClose={() => setGearEditOpen(false)}
      />
      <_PlanResetEditModal
        open={resetEditOpen}
        initialText={safePlan.resetPhrase || ""}
        onSave={handleResetSave}
        onClose={() => setResetEditOpen(false)}
      />
      <_PlanAiOrganizeModal
        open={aiOrganizeOpen}
        onAdopt={handleAiOrganizeAdopt}
        onClose={() => setAiOrganizeOpen(false)}
        toast={toast}
      />
      <_PlanAiResetGenModal
        open={aiResetGenOpen}
        strategy={safePlan.strategy || []}
        targetGoal={safePlan.targetGoal || ""}
        targetTheme={safePlan.targetTheme || ""}
        onAdopt={handleAiResetAdopt}
        onClose={() => setAiResetGenOpen(false)}
        toast={toast}
      />
    </div>
  );
}
