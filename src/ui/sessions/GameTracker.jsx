// GameTracker — F1.4.1「ゲーム単位スコア + 状況メモ」(v2 移植 + v4 強化)
//
// 仕様:
//   - 私 +1 / 相手 +1 / ↩ ボタンでゲーム単位記録
//   - 奇数ゲーム終了後 (1, 3, 5, 7, 9, 11G) で自動 CO 入力プロンプト発動
//     → ITF Rule 11 / TENNIS_RULES.md §2.1 / §13、v2 の % 2 === 0 は誤実装
//   - CO 入力: メンタル 1-5 + フィジカル 1-5 + 一言メモ (任意) + スキップ可
//   - ゲーム log と CO 行の交互表示 (振り返り用)
//   - 修正経路:
//     A 直近撤回 (↩ ボタン): 直近ゲーム + 直後 CO を同時撤回
//     B ゲーム個別修正 (log 行タップ): 私/相手切替 or 削除
//     C CO 再編集 (CO 行タップ): 既存値プリフィルでモーダル再表示、削除可
//     D 全消去 (右上 🗑 ボタン): ConfirmDialog で確認後 games + changeovers 全削除
//
// props:
//   match: 現在の match オブジェクト ({ games, changeovers, ... })
//   onChange: 更新後の match を受ける callback
//   confirm: 親から渡される useConfirm() 互換オブジェクト ({ ask })。全消去で使う
//
// 罠:
//   - changeovers[].afterGame は 1-based、games は 0-based 配列
//   - サブコンポーネントは _gtXxx 命名でトップレベル定義 (CLAUDE.md §6.3)
//   - SessionDetailView の _dvXxx と命名衝突なし

// S15.5.8 hotfix: MENTAL_LABELS / PHYSICAL_LABELS が S11 から定義漏れで、
//   「次のゲーム」タップ → CO モーダル表示時に ReferenceError → 画面真っ白の致命的バグ。
//   ボタン下の小さい補助ラベル + 既存 CO 行の表示用 (5 段階の状態を一言で)。
const MENTAL_LABELS = {
  1: "崩壊",
  2: "焦り",
  3: "普通",
  4: "集中",
  5: "完全",
};
const PHYSICAL_LABELS = {
  1: "限界",
  2: "疲労",
  3: "普通",
  4: "余裕",
  5: "万全",
};

// ── Lucide アイコンのみで色は CSS 制御
function _gtSafeIcon({ name, size, color }) {
  return <Icon name={name} size={size} color={color} />;
}

// ── ゲーム log 1 行 (winner 表示 + クリックで編集ポップオーバー)
function _gtGameLogRow({ index, game, runningScore, onEdit }) {
  const isMe = game.winner === "me";
  const bg = isMe ? "#e6f4ea" : "#fce8e6";
  const borderColor = isMe ? "rgba(15,157,88,0.4)" : "rgba(217,48,37,0.4)";
  const winColor = isMe ? "#0a5b35" : "#a31511";
  return (
    <div
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 8, marginBottom: 4,
        fontSize: 12, background: bg, border: `1px solid ${borderColor}`,
        cursor: "pointer", minHeight: 36,
      }}
      title="タップで編集"
    >
      <span style={{ fontSize: 11, color: C.textSecondary, minWidth: 62, fontVariantNumeric: "tabular-nums" }}>ゲーム {index + 1}</span>
      <span style={{ flex: 1, fontWeight: 700, color: winColor }}>{isMe ? "✓ 私" : "✓ 相手"}</span>
      <span style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>{runningScore.me}-{runningScore.opp}</span>
      <Icon name="pencil" size={13} color={C.textMuted} />
    </div>
  );
}

// ── CO 表示行 (記録済) — タップで再編集
function _gtChangeoverRow({ co, onEdit }) {
  const mentalColor = co.mental >= 4 ? "#0a5b35" : co.mental >= 3 ? "#7e5d00" : "#a31511";
  const physicalColor = co.physical >= 4 ? "#0a5b35" : co.physical >= 3 ? "#7e5d00" : "#a31511";
  return (
    <div
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
      style={{
        padding: "8px 10px", background: C.primaryLight, border: `1px solid ${C.primary}`,
        borderRadius: 8, marginBottom: 4, cursor: "pointer", minHeight: 36,
      }}
      title="タップで再編集"
    >
      <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 0.4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        ⟳ チェンジオーバー（{co.afterGame} ゲーム後）
        <Icon name="pencil" size={12} color={C.primary} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: 6, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: mentalColor }}>
          <Icon name="brain" size={13} color={mentalColor} />
          {co.mental} {MENTAL_LABELS[co.mental] || ""}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: physicalColor }}>
          <Icon name="dumbbell" size={13} color={physicalColor} />
          {co.physical} {PHYSICAL_LABELS[co.physical] || ""}
        </span>
        {co.note && <span style={{ color: C.textSecondary, fontStyle: "italic", fontWeight: 500 }}>「{co.note}」</span>}
      </div>
    </div>
  );
}

// ── メンタル/フィジカル 5 ボタン (ラベル付、44px タップ領域)
function _gtMPButtons({ value, onSelect, labels }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            style={{
              minHeight: 44, borderRadius: 6,
              border: `1px solid ${on ? C.primary : C.border}`,
              background: on ? C.primary : C.panel,
              color: on ? "#fff" : C.textSecondary,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
              fontFamily: font,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>{n}</span>
            <span style={{ fontSize: 8, opacity: 0.85 }}>{labels[n] || ""}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── ゲーム log 行タップで開く編集ポップオーバー (私/相手切替 + 削除)
function _gtGameEditPopover({ index, current, onSwitchMe, onSwitchOpp, onDelete, onClose }) {
  return (
    <div style={{
      background: C.panel, border: `2px solid ${C.primary}`, borderRadius: 10,
      padding: 10, margin: "6px 0",
      boxShadow: "0 4px 12px rgba(26,115,232,.25)",
    }}>
      <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        ゲーム {index + 1} を修正
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4 }} aria-label="閉じる">
          <Icon name="x" size={16} color={C.textSecondary} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button
          onClick={onSwitchMe}
          disabled={current === "me"}
          style={{
            flex: 1, minHeight: 44, borderRadius: 8,
            border: `1.5px solid ${current === "me" ? "#dadce0" : "#0f9d58"}`,
            background: current === "me" ? "#fff" : "#e6f4ea",
            color: current === "me" ? C.textMuted : "#0a5b35",
            fontSize: 13, fontWeight: 700, cursor: current === "me" ? "default" : "pointer",
            fontFamily: font,
          }}
        >
          {current === "me" ? "私 ✓（現在）" : "私 ✓ に変更"}
        </button>
        <button
          onClick={onSwitchOpp}
          disabled={current === "opp"}
          style={{
            flex: 1, minHeight: 44, borderRadius: 8,
            border: `1.5px solid ${current === "opp" ? "#dadce0" : "#d93025"}`,
            background: current === "opp" ? "#fff" : "#fce8e6",
            color: current === "opp" ? C.textMuted : "#a31511",
            fontSize: 13, fontWeight: 700, cursor: current === "opp" ? "default" : "pointer",
            fontFamily: font,
          }}
        >
          {current === "opp" ? "相手 ✓（現在）" : "相手 ✓ に変更"}
        </button>
      </div>
      <button
        onClick={onDelete}
        style={{
          width: "100%", minHeight: 40, borderRadius: 8,
          border: `1px solid ${C.error}`, background: C.errorLight,
          color: C.error, fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          fontFamily: font,
        }}
      >
        <Icon name="trash-2" size={14} color={C.error} />
        このゲームを削除
      </button>
      <div style={{ fontSize: 10, color: "#7e5d00", background: C.warningLight, padding: "6px 8px", borderRadius: 4, marginTop: 6, lineHeight: 1.4 }}>
        ※ 削除すると以降のゲーム番号と CO の afterGame が再計算されます
      </div>
    </div>
  );
}

// ── pending/edit CO モーダル
function _gtCOModal({ open, initial, onSave, onSkip, onDelete, onClose, isEditMode }) {
  const [draft, setDraft] = useState(initial);
  // initial が変わったら draft をリセット (afterGame 違いの CO を編集する時)
  useEffect(() => { if (open) setDraft(initial); }, [open, initial?.afterGame]);
  if (!open || !draft) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="チェンジオーバー記録"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{
        background: C.panel, border: `1.5px solid ${C.primary}`, borderRadius: 12,
        padding: 14, maxWidth: 380, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 4px 16px rgba(26,115,232,.18)",
      }}>
        <div style={{ fontSize: 14, color: C.primary, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="rotate-ccw" size={16} color={C.primary} />
          チェンジオーバー記録（{draft.afterGame} ゲーム後）
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 6 }}>
              <Icon name="brain" size={14} color={C.text} />メンタル
            </label>
            <_gtMPButtons value={draft.mental} onSelect={(n) => setDraft(d => ({ ...d, mental: n }))} labels={MENTAL_LABELS} />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 6 }}>
              <Icon name="dumbbell" size={14} color={C.text} />フィジカル
            </label>
            <_gtMPButtons value={draft.physical} onSelect={(n) => setDraft(d => ({ ...d, physical: n }))} labels={PHYSICAL_LABELS} />
          </div>
        </div>
        <input
          type="text"
          value={draft.note || ""}
          onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))}
          placeholder="一言メモ（任意）: 集中切れた / 立て直したい / ネット寄ろう..."
          style={{
            width: "100%", minHeight: 44, padding: "10px 14px",
            border: `1px solid ${C.border}`, borderRadius: 8,
            fontFamily: font, fontSize: 14, color: C.text, background: C.panel,
            outline: "none", marginBottom: 10,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {isEditMode ? (
            <button
              type="button"
              onClick={onDelete}
              style={{
                flex: 1, minHeight: 44, borderRadius: 8,
                border: `1px solid ${C.error}`, background: C.errorLight, color: C.error,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >
              この CO を削除
            </button>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              style={{
                flex: 1, minHeight: 44, borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.panel, color: C.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}
            >
              スキップ
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(draft)}
            style={{
              flex: 2, minHeight: 44, borderRadius: 8,
              border: "none", background: C.primary, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: font,
            }}
          >
            <Icon name="check" size={16} color="#fff" />
            {isEditMode ? "更新" : "記録"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── メインコンポーネント
//   リク 30-e Phase A (S18): matchEnded prop で試合終了状態を受け取る (computeAutoMatchResult 結果)
//     - 試合終了バナー表示 (✓ 試合終了 + 自動セットスコア)
//     - 「次のゲーム」+ ボタンを隠す (誤入力防止)
//     - 「続けて記録する」展開で再開可能 (試合形式変更等の例外ケース対応)
function GameTracker({ match, onChange, confirm, matchEnded }) {
  const games = Array.isArray(match.games) ? match.games : [];
  const changeovers = Array.isArray(match.changeovers) ? match.changeovers : [];
  const setScores = Array.isArray(match.setScores) ? match.setScores : [];
  const score = computeRunningScore(games);

  // pending CO (新規発動): 奇数ゲーム後に自動で立ち上がる
  const [pending, setPending] = useState(null);
  // edit CO (既存タップ): 既存値プリフィルで開く
  const [editing, setEditing] = useState(null);
  // ゲーム log 行タップで開く編集ポップオーバー (index)
  const [gameEditIndex, setGameEditIndex] = useState(null);
  // リク 30-e Phase A: 試合終了後に「続けて記録する」を押した展開状態
  const [expandedAfterEnd, setExpandedAfterEnd] = useState(false);
  // 別 match の編集に切替時にリセット
  useEffect(() => { if (!matchEnded) setExpandedAfterEnd(false); }, [matchEnded]);
  // matchEnded で pending CO が立ち上がってる場合は自動 skip (バナー表示優先)
  useEffect(() => {
    if (matchEnded && !expandedAfterEnd && pending) setPending(null);
  }, [matchEnded, expandedAfterEnd, pending]);

  // ゲーム追加 (奇数ゲーム後で自動 CO 発動 — TENNIS_RULES.md §2.1)
  const handleAddGame = (winner) => {
    const { match: next, promptAfterGame } = addGame(match, winner);
    onChange(next);
    if (promptAfterGame !== null) {
      setPending({ afterGame: promptAfterGame, mental: 3, physical: 3, note: "" });
    }
  };

  // 直近撤回 (A 直近撤回): 直近ゲーム + 直後 CO を同時撤回
  const handleUndo = () => {
    if (games.length === 0) return;
    onChange(removeLastGame(match));
    // pending CO が立ち上がっていたらそれもキャンセル
    if (pending && pending.afterGame === games.length) setPending(null);
  };

  // pending CO 保存
  const handlePendingSave = (co) => {
    onChange(upsertChangeover(match, co));
    setPending(null);
  };
  const handlePendingSkip = () => setPending(null);

  // 既存 CO 編集モーダルから保存
  const handleEditSave = (co) => {
    onChange(upsertChangeover(match, co));
    setEditing(null);
  };
  const handleEditDelete = () => {
    if (!editing) return;
    onChange(removeChangeover(match, editing.afterGame));
    setEditing(null);
  };

  // ゲーム log 行: 私/相手切替
  const handleGameSwitch = (index, winner) => {
    onChange(replaceGameWinner(match, index, winner));
    setGameEditIndex(null);
  };
  // ゲーム log 行: 削除 (afterGame 再計算)
  const handleGameDelete = (index) => {
    onChange(removeGameAt(match, index));
    setGameEditIndex(null);
  };

  // 全消去 (D)
  const handleResetAll = () => {
    if (games.length === 0 && changeovers.length === 0) return;
    if (!confirm) {
      onChange(resetGameTracker(match));
      return;
    }
    confirm.ask(
      `この試合のゲーム記録（${games.length} ゲーム / CO ${changeovers.length} 件）をすべて削除します。この操作は取り消せません。`,
      () => onChange(resetGameTracker(match)),
      { title: "ゲーム記録を全消去", yesLabel: "全消去", yesVariant: "danger", icon: "trash-2" }
    );
  };

  // 表示行を組み立て: ゲーム N → (N が奇数なら) CO 行
  const rows = [];
  let running = { me: 0, opp: 0 };
  games.forEach((g, i) => {
    if (g.winner === "me") running = { ...running, me: running.me + 1 };
    else if (g.winner === "opp") running = { ...running, opp: running.opp + 1 };
    rows.push({ kind: "game", index: i, game: g, score: { ...running } });
    // 奇数ゲーム後 = i+1 が奇数 = (i+1) % 2 === 1
    if ((i + 1) % 2 === 1) {
      const co = changeovers.find(c => c.afterGame === i + 1) || null;
      rows.push({ kind: "co", afterGame: i + 1, co });
    }
  });

  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 12, marginTop: 6,
    }}>
      {/* ヘッダ: タイトル + 全消去ボタン */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="play-circle" size={14} color={C.primary} />
          ゲーム単位記録
        </div>
        {(games.length > 0 || changeovers.length > 0) && (
          <button
            type="button"
            onClick={handleResetAll}
            aria-label="ゲーム記録を全消去"
            title="全消去"
            style={{ background: "none", border: "none", color: C.error, cursor: "pointer", padding: 6, display: "flex", borderRadius: 6 }}
          >
            <Icon name="trash-2" size={16} color={C.error} />
          </button>
        )}
      </div>

      {/* リク 30-e Phase A (S18): 試合終了バナー + 「続けて記録する」展開ボタン
          matchEnded = true (computeAutoMatchResult で勝敗確定) の時に表示。
          展開後は警告色のバナーに切替えて、再 collapse で誤入力防止に戻れる */}
      {matchEnded && !expandedAfterEnd && (
        <div style={{
          background: C.successLight, border: `1px solid ${C.success}`,
          borderRadius: 8, padding: "10px 12px", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="check-circle" size={20} color={C.success} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0a5b35" }}>試合終了</div>
            {setScores.length > 0 && (
              <div style={{ fontSize: 12, color: "#0a5b35", fontVariantNumeric: "tabular-nums" }}>
                {setScores.join(" / ")}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpandedAfterEnd(true)}
            style={{
              fontSize: 11, padding: "6px 10px", borderRadius: 6,
              border: `1px solid ${C.success}`, background: C.panel, color: "#0a5b35",
              cursor: "pointer", fontFamily: font, fontWeight: 600, flexShrink: 0,
            }}
          >
            続けて記録する
          </button>
        </div>
      )}
      {matchEnded && expandedAfterEnd && (
        <div style={{
          background: C.warningLight, border: `1px solid ${C.warning}`,
          borderRadius: 8, padding: "8px 12px", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon name="info" size={14} color="#7e5d00" />
          <div style={{ flex: 1, fontSize: 12, color: "#7e5d00" }}>
            試合終了後の追加記録モード ({setScores.join(" / ")})
          </div>
          <button
            type="button"
            onClick={() => setExpandedAfterEnd(false)}
            style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 6,
              border: `1px solid ${C.warning}`, background: C.panel, color: "#7e5d00",
              cursor: "pointer", fontFamily: font, fontWeight: 600, flexShrink: 0,
            }}
          >
            戻す
          </button>
        </div>
      )}

      {/* スコア表示 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 10,
        padding: "10px 14px", marginBottom: 10,
      }}>
        <div style={{ textAlign: "center", flex: "0 0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#0a5b35", marginBottom: 2 }}>私</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.practiceAccent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score.me}</div>
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600 }}>—</div>
        <div style={{ textAlign: "center", flex: "0 0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#a31511", marginBottom: 2 }}>相手</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.error, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score.opp}</div>
        </div>
        {games.length > 0 && (
          <div style={{ flex: 1, maxWidth: 108, marginLeft: 14 }}>
            <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>推移</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {games.map((g, i) => (
                <div key={g.id || i} style={{
                  width: 16, height: 16, borderRadius: 3, color: "#fff",
                  fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  background: g.winner === "me" ? C.practiceAccent : C.error,
                }}>{i + 1}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ゲーム log + CO 交互表示 */}
      {rows.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {rows.map((row, idx) => {
            if (row.kind === "game") {
              const editing = gameEditIndex === row.index;
              return (
                <React.Fragment key={`g-${row.game.id || row.index}`}>
                  <_gtGameLogRow
                    index={row.index}
                    game={row.game}
                    runningScore={row.score}
                    onEdit={() => setGameEditIndex(editing ? null : row.index)}
                  />
                  {editing && (
                    <_gtGameEditPopover
                      index={row.index}
                      current={row.game.winner}
                      onSwitchMe={() => handleGameSwitch(row.index, "me")}
                      onSwitchOpp={() => handleGameSwitch(row.index, "opp")}
                      onDelete={() => handleGameDelete(row.index)}
                      onClose={() => setGameEditIndex(null)}
                    />
                  )}
                </React.Fragment>
              );
            }
            // CO 行
            if (row.co) {
              return (
                <_gtChangeoverRow
                  key={`co-${row.afterGame}`}
                  co={row.co}
                  onEdit={() => setEditing({ ...row.co })}
                />
              );
            }
            // CO 未記録 (空行) — pending と重複しない時だけ薄く表示
            if (pending && pending.afterGame === row.afterGame) return null;
            return (
              <div
                key={`co-empty-${row.afterGame}`}
                onClick={() => setEditing({ afterGame: row.afterGame, mental: 3, physical: 3, note: "" })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing({ afterGame: row.afterGame, mental: 3, physical: 3, note: "" }); } }}
                style={{
                  padding: "6px 10px", background: C.panel, border: `1px dashed ${C.border}`,
                  borderRadius: 8, marginBottom: 4, cursor: "pointer", minHeight: 30,
                  fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 4,
                }}
                title="タップで CO を記録"
              >
                ⟳ チェンジオーバー（{row.afterGame} ゲーム後・未記録、タップで追加）
              </div>
            );
          })}
        </div>
      )}

      {/* 次のゲーム入力 (ボタン 54px、間隙 10px、AAA)
          リク 30-e Phase A: 試合終了 (matchEnded) かつ非展開 (expandedAfterEnd=false) の時は + ボタンを隠す */}
      {!pending && !(matchEnded && !expandedAfterEnd) && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 84 }}>次のゲーム:</span>
          <button
            type="button"
            onClick={() => handleAddGame("me")}
            style={{
              flex: 1, minHeight: 54, borderRadius: 10,
              border: `1.5px solid ${C.practiceAccent}`, background: C.practiceLight,
              color: "#0a5b35", fontSize: 15, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: font,
            }}
          >
            <Icon name="check" size={18} color="#0a5b35" /> 私 ✓
          </button>
          <button
            type="button"
            onClick={() => handleAddGame("opp")}
            style={{
              flex: 1, minHeight: 54, borderRadius: 10,
              border: `1.5px solid ${C.error}`, background: C.errorLight,
              color: "#a31511", fontSize: 15, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: font,
            }}
          >
            <Icon name="check" size={18} color="#a31511" /> 相手 ✓
          </button>
          {games.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              aria-label="直近のゲームを撤回"
              title="直近撤回"
              style={{
                minWidth: 54, minHeight: 54, borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.panel,
                color: C.textSecondary, fontSize: 15, cursor: "pointer", fontFamily: font,
              }}
            >↩</button>
          )}
        </div>
      )}

      {/* 注釈: 奇数ゲーム後に CO 自動発動 */}
      <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.5, padding: "6px 8px", background: C.panel, borderRadius: 4, marginTop: 6 }}>
        CO は<b style={{ color: C.text }}>奇数ゲーム後</b>に自動発動（1, 3, 5, 7, 9, 11G）。各行タップで修正可。
      </div>

      {/* pending CO モーダル (奇数ゲーム後の自動発動) */}
      <_gtCOModal
        open={!!pending}
        initial={pending}
        onSave={handlePendingSave}
        onSkip={handlePendingSkip}
        onClose={handlePendingSkip}
        isEditMode={false}
      />

      {/* 既存 CO 編集モーダル (CO 行タップ) */}
      <_gtCOModal
        open={!!editing}
        initial={editing}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        onClose={() => setEditing(null)}
        isEditMode={true}
      />
    </div>
  );
}
