// MatchDetailView — 大会内 Match の閲覧専用 view (S17 追加、棚上げ解消)
//
// 経緯:
//   従来は TournamentDetail の matches 行 click → 直接 MatchEditModal が開く構造
//   = 「見るだけ」のつもりが編集 modal に入る → 誤キャンセル/データ消失リスク
//   2026-05-09 ユーザー報告 (試合スコア付けて閉じたら消えた) の根本原因
//
// 構造:
//   - position: fixed の overlay (zIndex 1100、MatchEditModal と同じ階層)
//   - ヘッダー: 戻る + 編集 + 削除
//   - body: ① 基本 / ② スコア (セット + game-by-game) / ③ コンディション / ④ 機材 / ⑤ メモ
//   - popstate 自階層チェック (Phase 3.5b の pattern)
//
// props:
//   open: boolean
//   match: 表示対象 match
//   tournament: 親大会 (= 試合形式の継承表示用)
//   onClose(): 戻る (= history.back 経由)
//   onEdit(match): 編集ボタン (= MatchEditModal を開く)
//   onDelete(match): 削除ボタン

function MatchDetailView({ open, match, tournament, onClose, onEdit, onDelete, confirm }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  // popstate 自階層チェック (= 子階層を持たないが pattern 統一のため)
  useEffect(() => {
    if (!open) return;
    try { window.history.pushState({ tdb: "match-detail" }, ""); } catch (_) {}
    const handler = (e) => {
      if (e && e.state && e.state.tdb === "match-detail") return;
      const fn = onCloseRef.current; if (fn) fn();
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, match?.id]);

  const handleBack = () => {
    try { window.history.back(); } catch (_) { onClose && onClose(); }
  };

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") handleBack(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  if (!open || !match) return null;

  const m = match;
  const isDouble = (tournament?.type === "doubles" || tournament?.type === "mixed");
  const setScoresStr = Array.isArray(m.setScores) ? m.setScores.filter(Boolean).join(" / ") : (m.setScores || "");
  const tensionStr = [m.tensionMain, m.tensionCross].filter(Boolean).join("/");

  // 結果バッジ
  const resultColor = m.result === "勝利" ? C.practiceAccent : (m.result === "敗北" ? C.error : C.textMuted);
  const resultLabel = m.result || "未判定";

  const handleEditClick = () => onEdit && onEdit(m);
  const handleDeleteClick = () => {
    if (!onDelete) return;
    if (confirm) {
      confirm.ask(
        `「${m.opponent || "(対戦相手未入力)"}」 戦の記録を削除します。よろしいですか?`,
        () => onDelete(m),
        { title: "試合 削除", yesLabel: "削除", noLabel: "キャンセル", icon: "trash", yesVariant: "danger" }
      );
    } else {
      onDelete(m);
    }
  };

  const _row = (label, value) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{value || <span style={{ color: C.textMuted }}>—</span>}</div>
    </div>
  );

  const _sec = (title, body) => (
    <div style={{
      background: C.panel, border: `1px solid ${C.divider}`, borderRadius: 12,
      padding: "12px 14px", marginBottom: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {title}
      </div>
      {body}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="試合詳細"
      onClick={(e) => { if (e.target === e.currentTarget) handleBack(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "20px 12px", overflowY: "auto",
      }}
    >
      <div style={{
        background: C.bg, borderRadius: 16, padding: 16,
        maxWidth: 480, width: "100%",
      }}>
        {/* ヘッダ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
          <button onClick={handleBack} aria-label="戻る" style={{
            width: 36, height: 36, padding: 0, background: "transparent", border: "none",
            color: C.text, cursor: "pointer", borderRadius: 6,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="arrow-left" size={20} color={C.text} />
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.text }}>
            {m.round || "試合"} <span style={{ color: resultColor, marginLeft: 4 }}>({resultLabel})</span>
          </div>
          <button onClick={handleEditClick} aria-label="編集" style={{
            minHeight: 36, padding: "6px 12px",
            background: C.primary, border: "none", borderRadius: 8,
            color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: font,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Icon name="pencil-simple-line" size={14} color="#fff" />編集
          </button>
        </div>

        {/* ① 基本: 結果 / 対戦相手 / セットスコア */}
        {_sec("基本", (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {_row("ラウンド", m.round)}
              {_row("結果", <span style={{ color: resultColor, fontWeight: 700 }}>{resultLabel}</span>)}
            </div>
            {_row("対戦相手", isDouble && m.opponent2 ? `${m.opponent || "—"} / ${m.opponent2}` : m.opponent)}
            {_row("セットスコア", setScoresStr)}
          </>
        ))}

        {/* ② ゲーム単位記録 (game-by-game) */}
        {Array.isArray(m.games) && m.games.length > 0 && _sec(`ゲーム単位記録 (${m.games.length}試合)`, (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
            {m.games.map((g, i) => {
              const w = g && (g.winner === "me" || g.winner === "私" || g.winner === true);
              const opp = g && (g.winner === "opp" || g.winner === "相手" || g.winner === false);
              const label = w ? "私" : opp ? "相手" : "—";
              const labelColor = w ? C.practiceAccent : opp ? C.error : C.textMuted;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", background: C.panel2, borderRadius: 6,
                  fontSize: 12, color: C.text,
                }}>
                  <span style={{ fontWeight: 600, minWidth: 56 }}>ゲーム {i + 1}</span>
                  <span style={{ color: labelColor, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{label}</span>
                  <span style={{ color: C.textSecondary, fontVariantNumeric: "tabular-nums", minWidth: 50, textAlign: "right" }}>
                    {g.meScore != null && g.oppScore != null ? `${g.meScore}-${g.oppScore}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* ③ コンディション */}
        {(m.mental != null || m.physical != null) && _sec("コンディション", (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {_row("メンタル", m.mental ? `${m.mental} / 5` : null)}
            {_row("フィジカル", m.physical ? `${m.physical} / 5` : null)}
          </div>
        ))}

        {/* ④ 機材 */}
        {(m.racketName || m.stringMain || m.stringCross || tensionStr) && _sec("機材", (
          <>
            {_row("ラケット", m.racketName)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {_row("縦糸", m.stringMain)}
              {_row("横糸", m.stringCross)}
            </div>
            {_row("テンション", tensionStr ? `${tensionStr} lbs` : null)}
          </>
        ))}

        {/* ⑤ メモ */}
        {(m.mentalNote || m.techNote || m.opponentNote || m.note) && _sec("メモ", (
          <>
            {m.mentalNote && _row("メンタルメモ", <div style={{ whiteSpace: "pre-wrap" }}>{m.mentalNote}</div>)}
            {m.techNote && _row("技術メモ", <div style={{ whiteSpace: "pre-wrap" }}>{m.techNote}</div>)}
            {m.opponentNote && _row("相手メモ", <div style={{ whiteSpace: "pre-wrap" }}>{m.opponentNote}</div>)}
            {m.note && _row("総括", <div style={{ whiteSpace: "pre-wrap" }}>{m.note}</div>)}
          </>
        ))}

        {/* アクション (危険な削除は最下に置く) */}
        {onDelete && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={handleDeleteClick} style={{
              minHeight: 40, padding: "8px 14px",
              background: C.panel, border: `1px solid ${C.error}`, borderRadius: 8,
              color: C.error, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: font,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Icon name="trash" size={14} color={C.error} />削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
