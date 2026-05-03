// SessionDetailView — Session 詳細画面 (DESIGN_SYSTEM §8.5.10 / ROADMAP S10)
// 役割:
//   - slide-in 250ms / slide-out 200ms overlay (position:fixed で親 SessionsTab を unmount しない → scrollTop 保持 §N1.2)
//   - Header (戻る + 画面名 + 日付), Body (type で TournamentDetail/PracticeDetail/TrialDetail 分岐), Action bar
//   - Claude コピー (§F8.1): formatXxxForClaude → copyToClipboard → toast
//   - 削除: 親 onDelete(type, session) 経由 (確認ダイアログ + Firestore 書き込みは親責務)
//   - 編集: onEdit があれば呼び出し、なければ placeholder toast
// 共通 helper (_dv...) は関数宣言で巻き上げ、TournamentDetail/PracticeDetail/TrialDetail から参照

// ── 共通 helper (純関数) ────────────────────────
function _dvScColor(v) {
  const n = Number(v) || 0;
  if (n >= 4) return C.practiceAccent;  // 緑
  if (n >= 3) return C.warning;          // 黄
  return C.error;                        // 赤
}

function _dvFmtTension(main, cross) {
  const m = main ? String(main).trim() : "";
  const c = cross ? String(cross).trim() : "";
  if (m && c && m !== c) return `${m} / ${c} lbs`;
  if (m) return `${m} lbs`;
  if (c) return `${c} lbs`;
  return "";
}

function _dvParseMin(s) {
  if (!s) return 0;
  const pp = String(s).split(":");
  return (parseInt(pp[0], 10) || 0) + (parseInt(pp[1], 10) || 0) / 60;
}

function _dvZoneTotalMin(zones) {
  return zones.reduce((sum, z) => sum + _dvParseMin(z.val), 0);
}

// ── Badge mapping helper ───────────────────────
function _dvTournamentResultBadgeProps(result) {
  if (!result) return null;
  const map = {
    "優勝":     { variant: "tournament", icon: "trophy", label: "優勝" },
    "準優勝":   { variant: "info",       icon: "medal",  label: "準優勝" },
    "3位":      { variant: "bronze",     icon: "award",  label: "3位" },
    "ベスト8":   { variant: "warning", label: "ベスト8" },
    "ベスト16":  { variant: "warning", label: "ベスト16" },
    "予選突破": { variant: "success", label: "予選突破" },
    "敗退":     { variant: "error",   label: "敗退" },
    "予選敗退": { variant: "error",   label: "予選敗退" },
  };
  return map[result] || { variant: "default", label: result };
}

function _dvTournamentTypeBadgeProps(t) {
  if (!t) return null;
  const map = {
    "singles": { variant: "tournament", icon: "user",  label: "シングルス" },
    "doubles": { variant: "tournament", icon: "users", label: "ダブルス" },
    "mixed":   { variant: "tournament", icon: "users", label: "ミックス" },
  };
  return map[t] || null;
}

function _dvTrialJudgmentBadgeProps(judgment) {
  if (!judgment) return null;
  const map = {
    "採用候補": { variant: "success", icon: "badge-check", label: "採用候補" },
    "保留":     { variant: "warning", label: "保留" },
    "却下":     { variant: "error",   label: "却下" },
  };
  return map[judgment] || { variant: "default", label: judgment };
}

function _dvPracticeTypeBadgeProps(t) {
  if (!t) return null;
  const iconMap = {
    "スクール":   "graduation-cap",
    "自主練":     "person-standing",
    "練習会":     "users",
    "ゲーム練習": "swords",
    "球出し":     "target",
    "練習試合":   "trophy",
    "フィジカル": "dumbbell",
  };
  return { variant: "practice", icon: iconMap[t], label: t };
}

function _dvTournamentHighlight(result) {
  const map = { "優勝": "gold", "準優勝": "silver", "3位": "bronze" };
  return map[result] || null;
}

// ── 共通 UI component ──────────────────────────
function _dvSection({ title, titleRight, variant, children, style }) {
  const bg = variant === "gold"   ? C.tournamentLight
           : variant === "silver" ? C.primaryLight
           : variant === "bronze" ? C.trialLight
           : C.panel;
  const border = variant === "gold"   ? `1.5px solid ${C.tournamentAccent}`
               : variant === "silver" ? `1.5px solid ${C.primary}`
               : variant === "bronze" ? `1.5px solid ${C.trialAccent}`
               : `1px solid ${C.divider}`;
  return (
    <div style={{ background: bg, border, borderRadius: 12, padding: 14, marginBottom: 12, ...(style || {}) }}>
      {(title || titleRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          {title && <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</div>}
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}

function _dvInfoCell({ label, value }) {
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", minHeight: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.3, wordBreak: "break-all" }}>
        {value || <span style={{ color: C.textMuted, fontWeight: 400 }}>—</span>}
      </div>
    </div>
  );
}

function _dvRatingRow({ label, sub, value }) {
  const v = Number(value) || 0;
  const c = _dvScColor(v);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 24px", gap: 10, alignItems: "center", marginBottom: 6, fontSize: 12 }}>
      <div style={{ color: C.text, fontWeight: 500 }}>
        {label}
        {sub && <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 4, fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ background: C.divider, borderRadius: 4, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${v * 20}%`, height: "100%", background: c, borderRadius: 4, transition: "width 200ms" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", color: c }}>{v || "—"}</span>
    </div>
  );
}

function _dvLinkCard({ kind, title, meta, onClick }) {
  const bg = kind === "trial" ? C.trialLight : C.practiceLight;
  const borderCol = kind === "trial" ? "rgba(147,52,224,0.35)" : "rgba(15,157,88,0.35)";
  const iconColor = kind === "trial" ? C.trialAccent : C.practiceAccent;
  const iconName = kind === "trial" ? "badge-check" : "person-standing";
  return (
    <div
      onClick={onClick || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        background: bg, border: `1px solid ${borderCol}`, borderRadius: 10,
        padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
        cursor: onClick ? "pointer" : "default", minHeight: 44,
        transition: "background 150ms ease-out",
      }}
    >
      <Icon name={iconName} size={20} color={iconColor} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2, wordBreak: "break-all" }}>{title}</div>
        <div style={{ fontSize: 11, color: C.textSecondary }}>{meta}</div>
      </div>
      {onClick && <Icon name="chevron-right" size={16} color={C.textMuted} />}
    </div>
  );
}

function _dvWatchCell({ label, value, unit }) {
  return (
    <div style={{ background: C.primaryLight, borderRadius: 8, padding: 8, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>
        {value}<span style={{ fontSize: 10, color: C.textSecondary, marginLeft: 2, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

function _dvMemoItem({ label, text, summary }) {
  // S15.5.7: 老眼配慮で fontSize 13 → 16 + memo-font-scale CSS var で 1.0/1.15/1.30 倍率対応
  //   全文表示 (line-clamp は元から無し、whiteSpace pre-wrap で改行保持)
  // S16.10d: AI 要約があれば本文の上に ✨ 付きで先頭表示 (本文も省略せず下に出す)
  const hasSummary = summary && String(summary).trim();
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {hasSummary && (
        <div style={{
          fontSize: "calc(13px * var(--memo-font-scale, 1))",
          lineHeight: 1.5,
          color: C.primary, fontWeight: 600,
          background: C.primaryLight, borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 6,
          // リクエスト 31-2 補修 (A): 視覚的に 2 行で固定 (3 行目以降は「...」)
          //   元文は下にフル表示なので情報損失なし
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
          overflow: "hidden",
        }}>
          ✨ {String(summary).trim()}
        </div>
      )}
      <div style={{
        fontSize: "calc(16px * var(--memo-font-scale, 1))",
        lineHeight: 1.65,
        color: C.text, whiteSpace: "pre-wrap",
        background: C.bg, borderRadius: 10,
        padding: "12px 14px",
      }}>{text}</div>
    </div>
  );
}

// ── メインコンポーネント ────────────────────────
// S11: mode prop で Detail (既定) と Edit (編集モード) を切替。
//      Edit モード時は SessionEditView で置換し、slide-in overlay は維持 (再 mount せず scrollTop 保持)
function SessionDetailView({ type, session, mode = "detail", tournaments, trials, practices, racketNames, stringNames, venueNames, opponentNames, levelNames, onClose, onEdit, onEditCancel, onSave, onDelete, onMerge, onCreateCard, onOpenLinkedSession, toast, confirm }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  // リク 30-a: 大会詳細から直接「+ 試合を追加」する用の Match Modal state
  //   { match: blankMatch+defaults } | null
  const [addMatchState, setAddMatchState] = useState(null);
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // リク 30-a: 履歴セット picker 用 (TournamentEditForm と同じロジック)
  const recentSetups = useMemo(
    () => _computeRecentSetups(tournaments, practices, trials),
    [tournaments, practices, trials]
  );

  // enter アニメ: mount 後 1 frame で translateX(100%) → translateX(0)
  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const handleClose = useCallback(() => {
    if (reduced) { onClose && onClose(); return; }
    setClosing(true);
    setTimeout(() => { onClose && onClose(); }, 200);
  }, [onClose, reduced]);

  // Esc で閉じる (キーボード操作 §N1a.4)
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  // S13: 自作スワイプを削除。ブラウザの左端スワイプ (popstate) を app.jsx で受けて閉じる
  // → iOS Safari OS レベルのスワイプ動作と競合しなくなる

  const handleClaudeCopy = async () => {
    let text = "";
    if (type === "tournament")    text = formatTournamentAllForClaude(session);
    else if (type === "practice") text = formatPracticeForClaude(session);
    else if (type === "trial")    text = formatTrialForClaude(session);
    const ok = await copyToClipboard(text);
    if (ok) toast.show("Claude 用にコピーしました", "success");
    else toast.show("コピーに失敗しました", "error");
  };

  const handleDeleteClick = () => {
    if (onDelete) onDelete(type, session);
  };

  const handleEditClick = () => {
    if (onEdit) onEdit(type, session);
    else toast.show("編集ハンドラ未接続", "warning");
  };

  const handleMergeClick = () => {
    if (onMerge) onMerge(type, session);
    else toast.show("マージハンドラ未接続", "warning");
  };

  // リク 30-a: 詳細画面の「+ 試合を追加」ボタンから直接 MatchEditModal を開く
  //   blankMatch のデフォルト = 直前の試合 (あれば)、無ければ大会レベル機材
  const handleAddMatchClick = useCallback(() => {
    if (type !== "tournament" || !session) return;
    const matches = Array.isArray(session.matches) ? session.matches : [];
    const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;
    setAddMatchState({ match: blankMatch(matches.length, lastMatch || session) });
  }, [type, session]);

  // 保存: session.matches に append → 親 onSave で永続化、モーダル閉じる (詳細画面はそのまま残す)
  const handleAddMatchSave = useCallback((newMatch) => {
    if (!session) return;
    const updated = { ...session, matches: [...(Array.isArray(session.matches) ? session.matches : []), newMatch] };
    if (onSave) onSave(type, updated);
    setAddMatchState(null);
  }, [session, type, onSave]);

  // linked セッション算出
  const linkedTrials = (type === "practice" && session)
    ? (trials || []).filter(tr => tr.linkedPracticeId === session.id)
    : [];
  const linkedPractice = (type === "trial" && session && session.linkedPracticeId)
    ? (practices || []).find(p => p.id === session.linkedPracticeId)
    : null;

  const stripColor = type === "tournament" ? C.tournamentAccent
                   : type === "practice"   ? C.practiceAccent
                   : type === "trial"      ? C.trialAccent
                   : C.border;
  const screenTitle = type === "tournament" ? "大会詳細"
                    : type === "practice"   ? "練習詳細"
                    : type === "trial"      ? "試打詳細"
                    : "詳細";

  const slideTransform = (closing || !visible) ? "translateX(100%)" : "translateX(0)";
  const transitionStyle = reduced ? "none" : `transform ${closing ? 200 : 250}ms cubic-bezier(0.4,0,0.2,1)`;

  // S11: Edit モード時は overlay 内を SessionEditView で置換 (slide-in 共有、再 mount しない)
  if (mode === "edit") {
    return (
      <div
        role="dialog"
        aria-label={screenTitle + " (編集)"}
        style={{
          position: "fixed", inset: 0, background: C.bg, zIndex: 100,
          display: "flex", flexDirection: "column",
          transform: slideTransform, transition: transitionStyle,
        }}
      >
        <SessionEditView
          type={type}
          session={session}
          practices={practices}
          tournaments={tournaments}
          trials={trials}
          racketNames={racketNames}
          stringNames={stringNames}
          venueNames={venueNames}
          opponentNames={opponentNames}
          levelNames={levelNames}
          onCancel={onEditCancel}
          onSave={(updated) => onSave && onSave(type, updated)}
          confirm={confirm}
          toast={toast}
        />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={screenTitle}
      style={{
        position: "fixed", inset: 0, background: C.bg, zIndex: 100,
        display: "flex", flexDirection: "column",
        transform: slideTransform, transition: transitionStyle,
      }}
    >
      {/* 左端 3px 色帯 */}
      <div style={{ position: "absolute", left: 0, top: 56, bottom: 64, width: 3, background: stripColor, zIndex: 2, pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ height: 56, flex: "0 0 56px", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.divider}` }}>
        <button
          onClick={handleClose}
          aria-label="戻る"
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, color: C.text }}
        >
          <Icon name="arrow-left" size={24} ariaLabel="戻る" />
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.text }}>
          {screenTitle}
          {session?.date && <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 400, marginLeft: 8 }}>{fmtDate(session.date)}</span>}
        </div>
      </div>

      {/* Body (scrollable) */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {type === "tournament" && (
          <TournamentDetail
            session={session}
            onMatchClick={() => toast.show("試合詳細は次 Stage で実装予定", "info")}
            onAddMatch={handleAddMatchClick}
          />
        )}
        {type === "practice" && (
          <PracticeDetail
            session={session}
            linkedTrials={linkedTrials}
            onLinkedTrialClick={(tr) => onOpenLinkedSession && onOpenLinkedSession("trial", tr)}
          />
        )}
        {type === "trial" && (
          <TrialDetail
            session={session}
            linkedPractice={linkedPractice}
            onLinkedPracticeClick={(pp) => onOpenLinkedSession && onOpenLinkedSession("practice", pp)}
            onCreateCard={onCreateCard ? () => onCreateCard(session) : null}
          />
        )}
      </div>

      {/* Action bar (S15 で 3 → 4 ボタン化: 編集 / マージ / Claude / 削除、危険度の昇順) */}
      <div style={{ flex: "0 0 64px", background: C.panel, borderTop: `1px solid ${C.divider}`, display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
        <button
          onClick={handleEditClick}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, padding: "10px 6px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="pencil" size={16} /> 編集
        </button>
        <button
          onClick={handleMergeClick}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, padding: "10px 6px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="git-merge" size={16} /> マージ
        </button>
        <button
          onClick={handleClaudeCopy}
          aria-label={type === "tournament" ? "Claudeに全試合をコピー" : "Claudeにコピー"}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44, padding: "10px 12px", borderRadius: 8, border: `1px solid rgba(147,52,224,0.5)`, background: C.trialLight, color: C.trialAccent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="clipboard-copy" size={18} ariaLabel={type === "tournament" ? "Claudeに全試合をコピー" : "Claudeにコピー"} />
        </button>
        <button
          onClick={handleDeleteClick}
          aria-label="削除"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44, padding: "10px 12px", borderRadius: 8, border: `1px solid rgba(217,48,37,0.5)`, background: C.errorLight, color: C.error, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="trash-2" size={18} ariaLabel="削除" />
        </button>
      </div>

      {/* リク 30-a: 詳細画面から直接「+ 試合を追加」する用の MatchEditModal */}
      {addMatchState && type === "tournament" && (
        <MatchEditModal
          open={true}
          match={addMatchState.match}
          trnType={session?.type}
          tournament={session}
          racketNames={racketNames}
          stringNames={stringNames}
          opponentNames={opponentNames}
          recentSetups={recentSetups}
          confirm={confirm}
          onSave={handleAddMatchSave}
          onClose={() => setAddMatchState(null)}
        />
      )}
    </div>
  );
}
