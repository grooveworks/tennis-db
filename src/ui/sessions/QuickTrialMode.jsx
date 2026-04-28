// QuickTrialMode — 試打カード式 簡易記録モード (S15.5、V2 移植 + v4 デザイン)
//
// 役割:
//   - REQUIREMENTS_v4 F1.3 の試打記録を、カード式で素早く実行 (大会会場での 3-4 ラケット試打用)
//   - V2 から移植 (v2_index.html line 2809 〜 3003)、v4 DESIGN_SYSTEM 準拠で再構築
//   - ChatGPT レビュー反映 (preview_s15.5_p2): タイトル黒固定 / 評価色 primary 統一 / 進捗カウンタ / 自然な文言
//
// props:
//   open:         boolean
//   cards:        quickTrialCards 配列 (親管理)
//   setCards:     (newCards) => void  追加 / 削除 / eval 中間保存に使用 (lsSave + Firestore も親側で実施)
//   rackets:      master rackets 配列 (status 色判定用)
//   stringNames:  string 候補配列 (追加フォーム select)
//   onSaveTrial:  ({card, eval}) => void  保存時 (親が trial 生成 + auto-link + trials 追加 + カード削除 + toast)
//   onClose:      () => void   ✕ で閉じる
//   confirm:      useConfirm() の戻り値  カード削除確認に使用
//   toast:        useToast() の戻り値    補助通知 (主は親側)
//
// 内部ロジック:
//   - selected = null: カード一覧 view、selected = cardId: 評価入力 view
//   - eval_, touched (Set) は selected 切替時に当該カードの eval/touched に保存 → 復元
//   - 進捗 = 各セクションで touched.has(key) の数 / 総数

// ── 評価項目グループ (V2 互換、SCHEMA trial 17 項目)
const _QTM_GROUPS = [
  {
    title: "性能", desc: "高い方が良い", icon: "gauge",
    items: [
      { key: "spin",         label: "スピン",       low: "弱い",     high: "強い"   },
      { key: "power",        label: "推進力",       low: "飛ばない", high: "飛ぶ"   },
      { key: "control",      label: "コントロール", low: "散る",     high: "狙える" },
      { key: "info",         label: "打感情報",     low: "感じない", high: "クリア" },
      { key: "maneuver",     label: "操作性",       low: "重い",     high: "軽快"   },
      { key: "swingThrough", label: "振り抜き",     low: "悪い",     high: "良い"   },
    ],
  },
  {
    title: "特性", desc: "中央が基準", icon: "sliders-horizontal",
    items: [
      { key: "trajectory", label: "弾道の高さ", low: "低い",     high: "高い"   },
      { key: "stiffness",  label: "打感",       low: "柔らかい", high: "硬い"   },
    ],
  },
  {
    title: "ショット別", desc: "高い方が良い", icon: "tennis",
    items: [
      { key: "shotForeAtk", label: "フォア (攻撃)" },
      { key: "shotForeDef", label: "フォア (守備)" },
      { key: "shotBackAtk", label: "バック (攻撃)" },
      { key: "shotBackDef", label: "バック (守備)" },
      { key: "shotSlice",   label: "スライス" },
      { key: "shotServe",   label: "サーブ" },
      { key: "shotVolley",  label: "ボレー" },
      { key: "shotReturn",  label: "リターン" },
    ],
  },
  {
    title: "総合", desc: "", icon: "seal-check",
    items: [
      { key: "confidence", label: "安心感", low: "不安", high: "振り切れる" },
    ],
  },
];

// ── 評価初期値 (3 = neutral、V2 互換)
const _qtmFreshEval = () => ({
  spin: 3, power: 3, control: 3, info: 3, maneuver: 3, swingThrough: 3,
  trajectory: 3, stiffness: 3,
  shotForeAtk: 3, shotForeDef: 3, shotBackAtk: 3, shotBackDef: 3,
  shotSlice: 3, shotServe: 3, shotVolley: 3, shotReturn: 3,
  confidence: 3,
  memo: "",
});

// ── status 別の色 + 表示ラベル (preview_s15.5_p2 で確定)
const _qtmStatusInfo = {
  active:      { left: "#FF9500", chipBg: "rgba(255,149,0,0.12)", chipColor: "#FF9500", label: "主力" },
  candidate:   { left: "#007AFF", chipBg: "#E1F0FF",              chipColor: "#007AFF", label: "検討中" },
  considering: { left: "#C7C7CC", chipBg: "#f1f3f4",              chipColor: "#5f6368", label: "待機" },
  support:     { left: "#0f9d58", chipBg: "#e6f4ea",              chipColor: "#0f9d58", label: "補助" },
};
const _qtmStatusOf = (card, racketsByName) => {
  const r = racketsByName.get(card?.racket);
  return _qtmStatusInfo[r?.status] || _qtmStatusInfo.considering;
};

// ── 簡易ガット候補抽出 (空 + master 名)
const _qtmStringOpts = (stringNames) => {
  const opts = [{ value: "", label: "-- 縦糸 --" }];
  (stringNames || []).forEach(n => { if (n) opts.push({ value: n, label: n }); });
  return opts;
};

// ── 本体
function QuickTrialMode({ open, cards, setCards, rackets, stringNames, onSaveTrial, onClose, confirm, toast }) {
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addF, setAddF] = useState({ racket: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "" });
  const [eval_, setEval] = useState(_qtmFreshEval);
  const [touched, setTouched] = useState(() => new Set());

  // S15.5.2 fix: popstate handler で eval_/touched の最新値を参照するため Ref で tracking
  const evalRef = useRef(eval_);
  const touchedRef = useRef(touched);
  useEffect(() => { evalRef.current = eval_; }, [eval_]);
  useEffect(() => { touchedRef.current = touched; }, [touched]);

  // S15.5.7: メモ textarea の auto-grow (内容に合わせて高さ自動拡張)
  const memoRef = useRef(null);
  useEffect(() => {
    const ta = memoRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [eval_.memo, selected]);

  // open 切替で内部 state リセット
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setAdding(false);
      setAddF({ racket: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "" });
      setEval(_qtmFreshEval());
      setTouched(new Set());
    }
  }, [open]);

  // S15.5.2 fix: open=true 時に history entry を 1 個積む (一覧 view 用)
  // これがないと iOS 左端スワイプ → history.back → 前のページ (Home) に飛ぶ問題
  useEffect(() => {
    if (!open) return;
    try { window.history.pushState({ tdb: "quickTrial-list" }, ""); } catch(_) {}
  }, [open]);

  // S15.5.2 fix: popstate (iOS 左端スワイプ / ブラウザ戻る) で内部 state 制御
  //   評価 view → 一覧 view、または 一覧 view → 閉じる
  //   eval/touched は Ref 経由で最新値を保存
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      if (selected) {
        // 評価値を current selected カードに焼き付けてから一覧へ
        const sel = selected;
        const e = { ...evalRef.current };
        const t = [...touchedRef.current];
        setCards(prev =>
          (prev || []).map(c => c.id === sel ? { ...c, eval: e, touched: t } : c)
        );
        setSelected(null);
      } else {
        onClose && onClose();
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, selected, onClose, setCards]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") {
      if (selected) backToList();
      else handleCloseClick();
    }};
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, selected]);

  if (!open) return null;

  // master rackets を name で索引化 (status 色判定)
  const racketsByName = new Map();
  (rackets || []).forEach(r => { if (r && r.name) racketsByName.set(r.name, r); });

  // 追加可能なラケット (retired を除外)
  const activeRackets = (rackets || []).filter(r => r && r.status !== "retired" && r.name);

  // 現在の eval/touched を card に書き戻す (関数形式で stale closure 回避)
  const persistCurrentEval = () => {
    if (!selected) return;
    const sel = selected;
    const e = { ...eval_ };
    const t = [...touched];
    setCards(prev =>
      (prev || []).map(c =>
        c.id === sel ? { ...c, eval: e, touched: t } : c
      )
    );
  };

  const selectCard = (id) => {
    persistCurrentEval();
    const card = (cards || []).find(c => c.id === id);
    setEval(card?.eval ? { ..._qtmFreshEval(), ...card.eval } : _qtmFreshEval());
    setTouched(new Set(card?.touched || []));
    // S15.5.2 fix: 評価 view 用 history entry を積む (戻ると popstate で 一覧 view へ)
    try { window.history.pushState({ tdb: "quickTrial-eval" }, ""); } catch(_) {}
    setSelected(id);
  };

  // S15.5.2 fix: backToList と handleCloseClick はどちらも history.back 経由に統一
  //   → popstate handler が selected/onClose を制御、ヘッダボタンも iOS 左端スワイプも同じ動作
  const backToList = () => {
    persistCurrentEval();
    try { window.history.back(); } catch(_) { setSelected(null); }
  };

  const handleCloseClick = () => {
    try { window.history.back(); } catch(_) { onClose && onClose(); }
  };

  const handleAddCard = () => {
    if (!addF.racket) {
      toast && toast.show("ラケットを選択してください", "warning");
      return;
    }
    const newCard = {
      id: genId(),
      racket: addF.racket,
      stringMain: addF.stringMain || "",
      stringCross: addF.stringCross || "",
      tensionMain: addF.tensionMain || "",
      tensionCross: addF.tensionCross || "",
    };
    setCards([...(cards || []), newCard]);
    setAddF({ racket: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "" });
    setAdding(false);
  };

  const handleDeleteCard = (cardId) => {
    if (!confirm) return;
    confirm.ask(
      "このカードを削除しますか？",
      () => {
        setCards((cards || []).filter(c => c.id !== cardId));
      },
      { title: "カード削除の確認", yesLabel: "削除", yesVariant: "danger", icon: "trash-2" }
    );
  };

  const setRating = (key, val) => {
    setEval(prev => ({ ...prev, [key]: val }));
    setTouched(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleSaveTrial = () => {
    const card = (cards || []).find(c => c.id === selected);
    if (!card) return;
    onSaveTrial && onSaveTrial({ card, eval: { ...eval_ } });
    setSelected(null);
    setEval(_qtmFreshEval());
    setTouched(new Set());
  };

  // ── 評価入力 view
  if (selected) {
    const card = (cards || []).find(c => c.id === selected);
    if (!card) {
      // 不正状態 → 一覧に戻す
      setSelected(null);
      return null;
    }
    const status = _qtmStatusOf(card, racketsByName);
    const stringInfo = [card.stringMain, card.stringCross].filter(Boolean).join(" / ");
    const tensionInfo = [card.tensionMain, card.tensionCross].filter(Boolean).join(" / ");

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="試打 評価入力"
        style={{
          position: "fixed", inset: 0, background: C.bg, zIndex: 200,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          height: 56, flex: "0 0 56px", display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.divider}`,
        }}>
          <button
            onClick={backToList}
            aria-label="一覧に戻る"
            style={{
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, color: C.primary,
            }}
          >
            <Icon name="arrow-left" size={24} ariaLabel="一覧に戻る" />
          </button>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.text }}>試打ノート</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>評価中</div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {/* ラケット見出し: タイトル黒固定 + 左帯 status 色 */}
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${status.left}`,
            borderRadius: 14, padding: "14px 16px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{card.racket}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {stringInfo}{tensionInfo ? ` / ${tensionInfo}` : ""}
            </div>
          </div>

          {/* 進捗バー (4 セクション、表示のみ) */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6, marginBottom: 14,
          }}>
            {_QTM_GROUPS.map(g => {
              const total = g.items.length;
              const done = g.items.filter(it => touched.has(it.key)).length;
              const complete = done === total;
              return (
                <div key={g.title} style={{
                  background: complete ? C.successLight : C.panel,
                  border: `1px solid ${complete ? C.success : C.border}`,
                  borderRadius: 10, padding: "6px 6px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {g.title}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, marginTop: 2,
                    color: complete ? C.success : C.text,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {done}/{total}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 評価セクション 4 個 */}
          {_QTM_GROUPS.map(g => (
            <div key={g.title} style={{ marginBottom: 18 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                borderBottom: `1px solid ${C.divider}`, paddingBottom: 6,
              }}>
                <Icon name={g.icon} size={16} color={C.textMuted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{g.title}</span>
                {g.desc && <span style={{ fontSize: 11, color: C.textMuted }}>{g.desc}</span>}
              </div>
              {g.items.map(it => (
                <div key={it.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>{it.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {it.low && (
                      <span style={{ fontSize: 10, color: C.textMuted, minWidth: 32, textAlign: "center", flexShrink: 0 }}>
                        {it.low}
                      </span>
                    )}
                    {[1,2,3,4,5].map(n => {
                      const sel = eval_[it.key] === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setRating(it.key, n)}
                          style={{
                            flex: 1, height: 40, borderRadius: 8,
                            border: `1px solid ${sel ? C.primary : C.border}`,
                            background: sel ? C.primaryLight : C.panel,
                            color: sel ? C.primary : C.textSecondary,
                            fontSize: 14, fontWeight: 600, cursor: "pointer",
                            fontFamily: font,
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                    {it.high && (
                      <span style={{ fontSize: 10, color: C.textMuted, minWidth: 32, textAlign: "center", flexShrink: 0 }}>
                        {it.high}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* メモ (S15.5.7: auto-grow + 文字サイズ scale 対応) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Icon name="note-pencil" size={14} color={C.textMuted} />
              <span>メモ</span>
            </div>
            <textarea
              ref={memoRef}
              value={eval_.memo}
              onChange={(e) => setEval(prev => ({ ...prev, memo: e.target.value }))}
              placeholder="気づいたことを一言..."
              rows={3}
              style={{
                width: "100%", borderRadius: 10, border: `1px solid ${C.border}`,
                padding: "12px",
                fontSize: "calc(16px * var(--memo-font-scale, 1))",
                lineHeight: 1.55,
                fontFamily: font,
                resize: "none", overflow: "hidden",
                color: C.text, background: C.panel,
                boxSizing: "border-box",
                minHeight: "calc(3 * 1.55em + 24px)",
                WebkitAppearance: "none", appearance: "none", outline: "none",
              }}
            />
          </div>

          {/* 保存 */}
          <button
            onClick={handleSaveTrial}
            style={{
              width: "100%", background: C.primary, border: "none", borderRadius: 12,
              padding: 14, fontSize: 15, fontWeight: 600, color: "#fff",
              cursor: "pointer", fontFamily: font, minHeight: 56,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Icon name="circle-check" size={18} color="#fff" /> 評価を保存
          </button>
        </div>
      </div>
    );
  }

  // ── カード一覧 view
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="試打ノート"
      style={{
        position: "fixed", inset: 0, background: C.bg, zIndex: 200,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        height: 56, flex: "0 0 56px", display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.divider}`,
      }}>
        <button
          onClick={handleCloseClick}
          aria-label="閉じる"
          style={{
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, color: C.primary,
          }}
        >
          <Icon name="x" size={24} ariaLabel="閉じる" />
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.text }}>試打ノート</div>
        <div style={{ fontSize: 12, color: C.textMuted }}>{(cards || []).length} 枚</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {(cards || []).length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>
            「+ 追加」で今日試打する<br />ラケット × セッティング を登録してください
          </div>
        )}

        {/* カード行 */}
        {(cards || []).map(card => {
          const status = _qtmStatusOf(card, racketsByName);
          const stringInfo = [card.stringMain, card.stringCross].filter(Boolean).join(" / ");
          const tensionInfo = [card.tensionMain, card.tensionCross].filter(Boolean).join(" / ");
          const meta = [stringInfo, tensionInfo].filter(Boolean).join(" / ");
          const evaluated = !!card.eval;
          return (
            <div
              key={card.id}
              onClick={() => selectCard(card.id)}
              role="button"
              tabIndex={0}
              style={{
                background: C.panel, border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${status.left}`,
                borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                cursor: "pointer", display: "grid",
                gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{card.racket}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{meta || "—"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap",
                    background: status.chipBg, color: status.chipColor,
                  }}>{status.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                    aria-label="このカードを削除"
                    style={{
                      width: 28, height: 28, padding: 0, display: "inline-flex",
                      alignItems: "center", justifyContent: "center",
                      background: "transparent", border: "none", color: C.textMuted,
                      cursor: "pointer", borderRadius: 6,
                    }}
                  >
                    <Icon name="x" size={16} ariaLabel="削除" />
                  </button>
                </div>
                {evaluated && (
                  <span style={{
                    fontSize: 10, color: C.textMuted, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                    <Icon name="circle-check" size={12} color={C.success} weight="fill" />
                    評価済
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* 追加 (フォーム or ボタン) */}
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            style={{
              width: "100%", background: C.panel, border: `1px dashed ${C.border}`,
              borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 500, color: C.textSecondary,
              cursor: "pointer", fontFamily: font, minHeight: 56,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Icon name="plus" size={18} color={C.textSecondary} /> 追加
          </button>
        ) : (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 14,
          }}>
            <select
              value={addF.racket}
              onChange={(e) => setAddF(p => ({ ...p, racket: e.target.value }))}
              aria-label="ラケットを選択"
              style={_qtmInputStyle}
            >
              <option value="">-- ラケット --</option>
              {activeRackets.map(r => (
                <option key={r.id || r.name} value={r.name}>
                  {r.name}{r.status ? ` (${r.status})` : ""}
                </option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <select
                value={addF.stringMain}
                onChange={(e) => setAddF(p => ({ ...p, stringMain: e.target.value }))}
                aria-label="縦糸"
                style={{ ..._qtmInputStyle, marginBottom: 0 }}
              >
                {_qtmStringOpts(stringNames).map(o => (
                  <option key={"sm-" + o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={addF.stringCross}
                onChange={(e) => setAddF(p => ({ ...p, stringCross: e.target.value }))}
                aria-label="横糸"
                style={{ ..._qtmInputStyle, marginBottom: 0 }}
              >
                <option value="">-- 横糸 (同じ) --</option>
                {(stringNames || []).map(n => n ? <option key={"sc-" + n} value={n}>{n}</option> : null)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <input
                value={addF.tensionMain}
                onChange={(e) => setAddF(p => ({ ...p, tensionMain: e.target.value }))}
                placeholder="縦テンション (例: 48)"
                inputMode="decimal"
                style={{ ..._qtmInputStyle, marginBottom: 0 }}
              />
              <input
                value={addF.tensionCross}
                onChange={(e) => setAddF(p => ({ ...p, tensionCross: e.target.value }))}
                placeholder="横テンション (同じなら空欄)"
                inputMode="decimal"
                style={{ ..._qtmInputStyle, marginBottom: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setAdding(false); setAddF({ racket: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "" }); }}
                style={{
                  flex: 1, background: C.panel2, border: "none", borderRadius: 10,
                  padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  color: C.textSecondary, fontFamily: font, minHeight: 44,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddCard}
                style={{
                  flex: 1, background: C.primary, border: "none", borderRadius: 10,
                  padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  color: "#fff", fontFamily: font, minHeight: 44,
                }}
              >
                追加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 共通入力スタイル (追加フォーム用)
const _qtmInputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #dadce0",
  borderRadius: 10,
  fontSize: 13,
  fontFamily: "-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif",
  background: "#fff",
  marginBottom: 8,
  minHeight: 44,
  boxSizing: "border-box",
  color: "#202124",
  WebkitAppearance: "none",
  appearance: "none",
  outline: "none",
};
