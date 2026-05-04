// LinkedSessionPicker — 試打 (trial) の linkedPracticeId / linkedMatchId 張替セレクタ
//
// 役割:
//   - 試打編集画面で「連携先 (任意)」セクションに表示
//   - 既存リンクがある場合は紫カードで表示、× で解除
//   - 新規追加ボタンで全 practices / 全 tournament[].matches から候補を選択
//   - 誤った自動リンク (QuickTrial 同日マッチ判定) を手動修正できる動線
//
// props:
//   linkedPracticeId, linkedMatchId: 現在の値
//   practices: 全 practice 配列
//   tournaments: 全 tournament 配列 (matches[] 抽出に必要)
//   onChange({ linkedPracticeId, linkedMatchId }): 変更通知
//
// 罠:
//   - linkedMatchId は match.id 単位、tournament.id ではない (v3 互換)
//   - 1 試打に対して practice / match 同時リンクは可 (両方 set される運用も v3 にあった)

// 既存リンクを 1 件のオブジェクトに解決
function _lpResolveLink({ linkedPracticeId, linkedMatchId, practices, tournaments }) {
  const out = { practice: null, matchInfo: null };
  if (linkedPracticeId) {
    out.practice = (practices || []).find(p => p.id === linkedPracticeId) || null;
  }
  if (linkedMatchId) {
    for (const t of (tournaments || [])) {
      const matches = Array.isArray(t.matches) ? t.matches : [];
      const m = matches.find(mm => mm.id === linkedMatchId);
      if (m) {
        out.matchInfo = { tournament: t, match: m };
        break;
      }
    }
  }
  return out;
}

// 候補シートで 1 行を表示
function _lpCandidateRow({ kind, label, sub, onPick }) {
  const iconName = kind === "practice" ? "person-standing" : "trophy";
  const accent = kind === "practice" ? C.practiceAccent : C.tournamentAccent;
  return (
    <div
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", minHeight: 56,
        borderBottom: `1px solid ${C.divider}`,
        cursor: "pointer", background: C.panel,
      }}
    >
      <Icon name={iconName} size={18} color={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 11, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
      <Icon name="chevron-right" size={16} color={C.textMuted} />
    </div>
  );
}

// 連携先選択シート (画面下からせり上がる)
function _lpPickerSheet({ open, mode, practices, tournaments, onPick, onClose }) {
  const trapRef = useFocusTrap(open); // Round 5 a11y: focus trap (再点検追加)
  if (!open) return null;
  // mode === "practice" or "match" でフィルタ
  let candidates = [];
  if (mode === "practice") {
    candidates = (practices || []).slice().sort((a, b) => normDate(b.date).localeCompare(normDate(a.date)));
    candidates = candidates.map(p => ({
      key: `p-${p.id}`,
      kind: "practice",
      label: p.title || p.venue || "(無題の練習)",
      sub: `${(p.type || "練習")} ・ ${fmtDate(p.date)} ・ ${p.venue || ""}`,
      pick: () => onPick({ practice: p }),
    }));
  } else if (mode === "match") {
    const list = [];
    (tournaments || []).forEach(t => {
      const matches = Array.isArray(t.matches) ? t.matches : [];
      matches.forEach(m => {
        list.push({
          key: `m-${m.id}`,
          kind: "match",
          label: `${t.name || "(無題の大会)"} - ${m.round || "試合"}`,
          sub: `${m.opponent ? "vs " + m.opponent : "対戦相手未入力"} ・ ${fmtDate(t.date)} ・ ${m.result || ""}`,
          pick: () => onPick({ matchInfo: { tournament: t, match: m } }),
        });
      });
    });
    list.sort((a, b) => 0); // 既にトーナメント単位、UI 単純化のため特に並び替えしない
    candidates = list;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="連携先を選択"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1300,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div ref={trapRef} style={{
        background: C.panel, borderRadius: "16px 16px 0 0",
        width: "100%", maxWidth: 500, maxHeight: "70vh",
        display: "flex", flexDirection: "column",
        animation: "drawerEnter 250ms ease-out",
      }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "8px auto 4px" }} />
        <div style={{ display: "flex", alignItems: "center", padding: "8px 8px 8px 16px", borderBottom: `1px solid ${C.divider}` }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text }}>
            {mode === "practice" ? "連携練習を選択" : "連携試合を選択"}
          </div>
          <button onClick={onClose} aria-label="閉じる" style={{
            width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer", color: C.textSecondary, padding: 0, borderRadius: 8,
          }}>
            <Icon name="x" size={22} color={C.textSecondary} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {candidates.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: C.textMuted }}>
              候補がありません
            </div>
          ) : candidates.map(c => (
            <_lpCandidateRow key={c.key} kind={c.kind} label={c.label} sub={c.sub} onPick={c.pick} />
          ))}
        </div>
      </div>
    </div>
  );
}

// メイン: 既存リンク表示 + 解除 + 追加ボタン
// F-A4 (Phase A 監査): UX4 で linkedMatchId 単数 → linkedMatchIds[] 配列に移行したが、
//   onChange で配列を更新していなかったため cascade.js が古い配列を参照していた。
//   全 onChange で linkedMatchId と linkedMatchIds の両方を整合させる。
function LinkedSessionPicker({ linkedPracticeId, linkedMatchId, practices, tournaments, onChange }) {
  const [pickerMode, setPickerMode] = useState(null); // "practice" | "match" | null
  const { practice, matchInfo } = _lpResolveLink({ linkedPracticeId, linkedMatchId, practices, tournaments });

  // 単数 linkedMatchId から配列 linkedMatchIds を導出 (空文字なら空配列)
  const _toIds = (id) => id ? [id] : [];

  const handlePick = (picked) => {
    if (picked.practice) {
      onChange({ linkedPracticeId: picked.practice.id, linkedMatchId: linkedMatchId || "", linkedMatchIds: _toIds(linkedMatchId) });
    } else if (picked.matchInfo) {
      const newMatchId = picked.matchInfo.match.id;
      onChange({ linkedPracticeId: linkedPracticeId || "", linkedMatchId: newMatchId, linkedMatchIds: _toIds(newMatchId) });
    }
    setPickerMode(null);
  };

  const handleClearPractice = () => onChange({ linkedPracticeId: "", linkedMatchId: linkedMatchId || "", linkedMatchIds: _toIds(linkedMatchId) });
  const handleClearMatch = () => onChange({ linkedPracticeId: linkedPracticeId || "", linkedMatchId: "", linkedMatchIds: [] });

  return (
    <div>
      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 6 }}>
        紐づける練習または試合を選択。誤リンクの張替も可能。
      </div>

      {/* 既存リンク (practice) */}
      {practice && (
        <div style={{
          background: C.practiceLight, border: `1px solid rgba(15,157,88,0.35)`, borderRadius: 10,
          padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
        }}>
          <Icon name="person-standing" size={18} color={C.practiceAccent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {practice.title || practice.venue || "(無題の練習)"}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary }}>
              {(practice.type || "練習")} ・ {fmtDate(practice.date)} ・ {practice.venue || ""}
            </div>
          </div>
          <button onClick={handleClearPractice} aria-label="連携練習を解除" title="解除" style={{
            background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", borderRadius: 4,
          }}>
            <Icon name="x" size={16} color={C.error} />
          </button>
        </div>
      )}

      {/* 既存リンク (match) */}
      {matchInfo && (
        <div style={{
          background: C.tournamentLight, border: `1px solid rgba(249,171,0,0.35)`, borderRadius: 10,
          padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
        }}>
          <Icon name="trophy" size={18} color={C.tournamentAccent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {matchInfo.tournament.name || "(無題の大会)"} - {matchInfo.match.round || "試合"}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary }}>
              {matchInfo.match.opponent ? "vs " + matchInfo.match.opponent : "対戦相手未入力"} ・ {fmtDate(matchInfo.tournament.date)}
            </div>
          </div>
          <button onClick={handleClearMatch} aria-label="連携試合を解除" title="解除" style={{
            background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", borderRadius: 4,
          }}>
            <Icon name="x" size={16} color={C.error} />
          </button>
        </div>
      )}

      {/* 追加ボタン (practice / match それぞれ) */}
      <div style={{ display: "flex", gap: 8 }}>
        {!practice && (
          <button
            type="button"
            onClick={() => setPickerMode("practice")}
            style={{
              flex: 1, minHeight: 44, padding: 10, borderRadius: 8,
              border: `1px dashed ${C.practiceAccent}`, background: C.panel, color: C.practiceAccent,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: font,
            }}
          >
            <Icon name="link-2" size={14} color={C.practiceAccent} />連携練習を追加
          </button>
        )}
        {!matchInfo && (
          <button
            type="button"
            onClick={() => setPickerMode("match")}
            style={{
              flex: 1, minHeight: 44, padding: 10, borderRadius: 8,
              border: `1px dashed ${C.tournamentAccent}`, background: C.panel, color: C.tournamentAccent,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: font,
            }}
          >
            <Icon name="link-2" size={14} color={C.tournamentAccent} />連携試合を追加
          </button>
        )}
      </div>

      <_lpPickerSheet
        open={!!pickerMode}
        mode={pickerMode}
        practices={practices}
        tournaments={tournaments}
        onPick={handlePick}
        onClose={() => setPickerMode(null)}
      />
    </div>
  );
}
