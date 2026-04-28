// MergeModal — セッションマージ確定モーダル (S15、2 ステップ式)
//
// 役割:
//   - REQUIREMENTS_v4 F1.10 — 同タイプ 2 件の統合 (A 残し B 削除)
//   - Step 1 (compare): 競合 (赤、ラジオ) → 補完 (緑、自動採用) → 一致/A のみ/両方空 (折り畳み)
//   - Step 2 (confirm): 削除される B / 統合後 A を 2 列で全フィールド比較 + 連携試打 N 件の付け替え通知
//
// props:
//   open:        boolean
//   type:        "tournament" | "practice" | "trial"
//   itemA:       残す側 (Detail で開いている方)
//   itemB:       削除される側 (MergePartnerPicker で選んだ方)
//   trials:      全試打配列 (relink 件数算出用)
//   onConfirm:   (mergedItem, removedItem, choices) => void
//   onCancel:    () => void
//
// 依存: domain/merge.js (computeMergeDiff / applyMerge / countRelinks)、SCHEMA、isEmptyVal

// ── ヘルパー: 値を表示文字列化 (空 / 配列 / オブジェクトを判別)
function _mergeFmtVal(v) {
  if (v === undefined || v === null || v === "") return "(空)";
  if (Array.isArray(v)) return `[${v.length} 件]`;
  if (typeof v === "object") {
    try { return JSON.stringify(v).slice(0, 60); }
    catch { return "(オブジェクト)"; }
  }
  return String(v);
}

// ── ヘルパー: type → 表示ラベル
function _mergeTypeLabel(type) {
  return type === "tournament" ? "大会"
       : type === "practice"   ? "練習"
       : type === "trial"      ? "試打"
       : "セッション";
}

// ── ヘルパー: item → ユーザーに見せる短い名称
function _mergeItemLabel(item, type) {
  if (!item) return "(不明)";
  if (type === "tournament") return item.name || "(無題の大会)";
  if (type === "practice")   return item.title || item.venue || "(無題の練習)";
  if (type === "trial")      return item.racketName || "(ラケット未指定)";
  return "(不明)";
}

// ── ステップインジケータ (1 比較 → 2 確認)
function _MergeStepDot({ active, done, num }) {
  const bg = done ? C.success : (active ? C.primary : C.panel2);
  const color = (done || active) ? "#fff" : C.textMuted;
  return (
    <span style={{
      width: 18, height: 18, borderRadius: "50%",
      background: bg, color: color, fontSize: 11, fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {done ? <Icon name="check" size={11} color="#fff" /> : num}
    </span>
  );
}

// ── 競合行 (ラジオ A/B/結合)
function _MergeConflictRow({ conflict, choice, onChange }) {
  const c = conflict;
  return (
    <div style={{
      background: C.errorLight,
      padding: "8px 10px",
      borderRadius: RADIUS.btnSm,
      marginBottom: 4,
      fontSize: 12,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 1fr", gap: 6, alignItems: "start" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, paddingTop: 2 }}>{c.label}</div>
        <div style={{ color: C.text, wordBreak: "break-all", lineHeight: 1.45 }}>{_mergeFmtVal(c.aValue)}</div>
        <div style={{ color: C.text, wordBreak: "break-all", lineHeight: 1.45 }}>{_mergeFmtVal(c.bValue)}</div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6, fontSize: 11, flexWrap: "wrap" }}>
        <_MergeRadioOption name={`r-${c.key}`} checked={choice === "a"} onChange={() => onChange("a")} label="A 採用" />
        <_MergeRadioOption name={`r-${c.key}`} checked={choice === "b"} onChange={() => onChange("b")} label="B 採用" />
        {c.combinable && (
          <_MergeRadioOption name={`r-${c.key}`} checked={choice === "combined"} onChange={() => onChange("combined")} label="結合" />
        )}
      </div>
    </div>
  );
}

function _MergeRadioOption({ name, checked, onChange, label }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
      padding: "5px 10px", borderRadius: 8,
      border: `1px solid ${checked ? C.primary : C.border}`,
      background: checked ? C.primary : C.panel,
      color: checked ? "#fff" : C.text,
      minHeight: 32,
      fontFamily: font,
      fontSize: 11,
      fontWeight: 500,
    }}>
      <input
        type="radio" name={name} checked={checked} onChange={onChange}
        style={{ margin: 0, cursor: "pointer" }}
      />
      {label}
    </label>
  );
}

// ── 補完行 (B → A 自動採用、緑帯)
function _MergeComplementRow({ comp }) {
  return (
    <div style={{
      background: C.successLight,
      padding: "8px 10px",
      borderRadius: RADIUS.btnSm,
      marginBottom: 4,
      fontSize: 12,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 1fr", gap: 6, alignItems: "start" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, paddingTop: 2 }}>{comp.label}</div>
        <div style={{ color: C.textMuted, fontStyle: "italic", lineHeight: 1.45 }}>(空)</div>
        <div style={{
          display: "inline-block",
          background: C.primary, color: "#fff",
          padding: "2px 6px", borderRadius: 6,
          wordBreak: "break-all", lineHeight: 1.45,
          fontWeight: 600,
        }}>{_mergeFmtVal(comp.value)} →</div>
      </div>
    </div>
  );
}

// ── 折り畳み行 (一致 / A のみ値 / 両方空)
function _MergeCollapsedRow({ keyName, label, itemA, itemB }) {
  const av = itemA ? itemA[keyName] : undefined;
  const bv = itemB ? itemB[keyName] : undefined;
  return (
    <div style={{
      background: C.panel2,
      padding: "6px 10px",
      borderRadius: RADIUS.btnSm,
      marginBottom: 3,
      fontSize: 11,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 1fr", gap: 6, alignItems: "start" }}>
        <div style={{ fontSize: 10, color: C.textSecondary, paddingTop: 1 }}>{label}</div>
        <div style={{ color: isEmptyVal(av) ? C.textMuted : C.text, lineHeight: 1.4, fontStyle: isEmptyVal(av) ? "italic" : "normal" }}>{_mergeFmtVal(av)}</div>
        <div style={{ color: isEmptyVal(bv) ? C.textMuted : C.text, lineHeight: 1.4, fontStyle: isEmptyVal(bv) ? "italic" : "normal" }}>{_mergeFmtVal(bv)}</div>
      </div>
    </div>
  );
}

// ── 確認画面の片方カラム (削除される B / 統合後 A)
function _MergeFinalCol({ title, tone, item, type, highlightFromB, highlightConflictB }) {
  const isRemoved = tone === "removed";
  const fields = SCHEMA[type] || [];
  const fromBSet = new Set(highlightFromB || []);
  const conflictBSet = new Set(highlightConflictB || []);
  return (
    <div style={{
      borderRadius: RADIUS.row, padding: 10,
      border: `1px solid ${isRemoved ? C.error : C.primary}`,
      background: isRemoved ? "#fff5f5" : "#f5fbff",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, marginBottom: 8,
        color: isRemoved ? C.error : C.primary,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <Icon name={isRemoved ? "trash" : "circle-check"} size={14} color={isRemoved ? C.error : C.primary} />
        {title}
      </div>
      <dl style={{ margin: 0, fontSize: 11 }}>
        {fields.map(f => {
          const v = item ? item[f.key] : undefined;
          if (f.key === "matches") {
            const cnt = Array.isArray(v) ? v.length : 0;
            return (
              <React.Fragment key={f.key}>
                <dt style={{ color: C.textSecondary, fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</dt>
                <dd style={{ margin: "1px 0 0", color: cnt === 0 ? C.textMuted : C.text, fontStyle: cnt === 0 ? "italic" : "normal" }}>
                  {cnt === 0 ? "(なし)" : `${cnt} 件`}
                </dd>
              </React.Fragment>
            );
          }
          const empty = isEmptyVal(v);
          let valColor = empty ? C.textMuted : C.text;
          let valWeight = "normal";
          if (!isRemoved && !empty) {
            if (fromBSet.has(f.key)) { valColor = C.success; valWeight = "bold"; }
            else if (conflictBSet.has(f.key)) { valColor = C.primary; valWeight = "bold"; }
          }
          return (
            <React.Fragment key={f.key}>
              <dt style={{ color: C.textSecondary, fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</dt>
              <dd style={{
                margin: "1px 0 0",
                color: valColor, fontWeight: valWeight,
                fontStyle: empty ? "italic" : "normal",
                wordBreak: "break-all",
                lineHeight: 1.4,
              }}>{_mergeFmtVal(v)}</dd>
            </React.Fragment>
          );
        })}
      </dl>
    </div>
  );
}

// ── 本体
function MergeModal({ open, type, itemA, itemB, trials, onConfirm, onCancel }) {
  const [step, setStep] = useState("compare");
  const [choices, setChoices] = useState({});
  const [showCollapsed, setShowCollapsed] = useState(false);

  // open / itemB 切替時にリセット (競合のデフォルト = "a")
  useEffect(() => {
    if (open && itemA && itemB) {
      setStep("compare");
      const diff = computeMergeDiff(itemA, itemB, type);
      const init = {};
      diff.conflicts.forEach(c => { init[c.key] = "a"; });
      setChoices(init);
      setShowCollapsed(false);
    }
  }, [open, itemA && itemA.id, itemB && itemB.id, type]);

  // Esc キー
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel && onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open || !itemA || !itemB) return null;

  const diff = computeMergeDiff(itemA, itemB, type);
  const merged = applyMerge(itemA, itemB, choices, type);
  const relinkCount = countRelinks(trials || [], itemB, type);

  const typeLabel = _mergeTypeLabel(type);
  const removedLabel = _mergeItemLabel(itemB, type);
  const keptLabel = _mergeItemLabel(itemA, type);

  // 補完: B → A のみ表示。A のみ値あり (from=a) は折りたたみ行きへ
  const complementFromB = diff.complement.filter(c => c.from === "b");
  const collapsedItems = [
    ...diff.match.map(m => ({ key: m.key, label: m.label })),
    ...diff.complement.filter(c => c.from === "a").map(c => ({ key: c.key, label: c.label })),
  ];

  // ── Step 1: 比較ビュー
  const renderCompare = () => (
    <>
      <div style={{
        display: "grid", gridTemplateColumns: "84px 1fr 1fr", gap: 6,
        padding: "6px 10px", fontSize: 10, fontWeight: 700, color: C.textSecondary,
        borderBottom: `1px solid ${C.divider}`, marginBottom: 8,
        position: "sticky", top: 0, background: C.panel, zIndex: 1,
      }}>
        <div>項目</div>
        <div style={{ color: C.primary }}>A (残す)</div>
        <div style={{ color: C.error }}>B (削除)</div>
      </div>

      {/* 競合 */}
      {diff.conflicts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.error,
            marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            <Icon name="warning" size={14} color={C.error} />
            競合 {diff.conflicts.length} 件 — 選択してください
          </div>
          {diff.conflicts.map(c => (
            <_MergeConflictRow
              key={c.key}
              conflict={c}
              choice={choices[c.key] || "a"}
              onChange={(val) => setChoices(prev => ({ ...prev, [c.key]: val }))}
            />
          ))}
        </div>
      )}

      {/* 補完 (B → A、自動) */}
      {complementFromB.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.success,
            marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            <Icon name="plus-circle" size={14} color={C.success} />
            補完 {complementFromB.length} 件 — 自動採用 (B → A)
          </div>
          {complementFromB.map(c => (
            <_MergeComplementRow key={c.key} comp={c} />
          ))}
        </div>
      )}

      {/* 折りたたみ */}
      {collapsedItems.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setShowCollapsed(prev => !prev)}
            style={{
              width: "100%", background: C.panel2,
              border: `1px dashed ${C.border}`,
              borderRadius: RADIUS.row, padding: "10px 12px",
              fontSize: 11, color: C.textSecondary, cursor: "pointer",
              textAlign: "center", fontFamily: font, minHeight: 40,
            }}
          >
            <Icon name={showCollapsed ? "chevron-down" : "chevron-right"} size={12} color={C.textSecondary} />
            {" "}一致 / A のみ値あり / 両方空 を {showCollapsed ? "折りたたむ" : "表示"} ({collapsedItems.length} 件)
          </button>
          {showCollapsed && (
            <div style={{ marginTop: 8 }}>
              {collapsedItems.map(item => (
                <_MergeCollapsedRow
                  key={item.key}
                  keyName={item.key}
                  label={item.label}
                  itemA={itemA}
                  itemB={itemB}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {diff.conflicts.length === 0 && complementFromB.length === 0 && !showCollapsed && (
        <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
          選択が必要な競合も、自動補完も見つかりませんでした。<br />
          そのまま「次へ」で統合できます。
        </div>
      )}
    </>
  );

  // ── Step 2: 最終確認
  const renderConfirm = () => (
    <>
      <div style={{
        background: C.errorLight, borderRadius: RADIUS.row,
        padding: 12, marginBottom: 12,
        fontSize: 12, lineHeight: 1.55, color: "#a31511",
      }}>
        <div style={{ fontWeight: 700, color: C.error, marginBottom: 4 }}>
          <Icon name="warning" size={14} color={C.error} /> この操作は取り消せません
        </div>
        B「{removedLabel}」を削除して、A「{keptLabel}」に統合します。
      </div>

      {relinkCount > 0 && (
        <div style={{
          background: C.primaryLight, borderRadius: RADIUS.btnSm,
          padding: "10px 12px", marginBottom: 12,
          fontSize: 11, color: "#003a7a", lineHeight: 1.5,
          display: "flex", alignItems: "flex-start", gap: 6,
        }}>
          <Icon name="link" size={16} color={C.primary} />
          <div>
            連携している試打 <b>{relinkCount} 件</b> の参照先 (linkedXxx) が <b>B → A</b> に自動で付け替わります。試打自体は残ります。
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <_MergeFinalCol
          title="削除される B" tone="removed"
          item={itemB} type={type}
        />
        <_MergeFinalCol
          title="統合後 A" tone="kept"
          item={merged} type={type}
          highlightFromB={complementFromB.map(c => c.key)}
          highlightConflictB={Object.entries(choices).filter(([_, v]) => v === "b").map(([k]) => k)}
        />
      </div>

      <div style={{ fontSize: 10, color: C.textSecondary, textAlign: "center", lineHeight: 1.6 }}>
        <span style={{ color: C.primary, fontWeight: 700 }}>青字</span> = 競合で B を採用 /{" "}
        <span style={{ color: C.success, fontWeight: 700 }}>緑字</span> = B から補完
      </div>
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${typeLabel}のマージ`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel && onCancel(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1100,
      }}
    >
      <div style={{
        background: C.panel,
        borderRadius: RADIUS.card,
        width: "100%", maxWidth: 560,
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        animation: "modalEnter 250ms ease-out",
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${C.divider}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            マージ ({typeLabel})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 11, color: C.textSecondary }}>
            <_MergeStepDot active={step === "compare"} done={step === "confirm"} num={1} />
            <span>比較</span>
            <span style={{ color: C.textMuted }}>→</span>
            <_MergeStepDot active={step === "confirm"} done={false} num={2} />
            <span>確認</span>
          </div>
        </div>

        {/* Body (scroll) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 18px" }}>
          {step === "compare" ? renderCompare() : renderConfirm()}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px 14px",
          borderTop: `1px solid ${C.divider}`,
          display: "flex", justifyContent: "space-between", gap: 8,
          flexShrink: 0,
        }}>
          {step === "compare" ? (
            <>
              <Button variant="ghost" onClick={onCancel}>キャンセル</Button>
              <Button variant="primary" onClick={() => setStep("confirm")}>
                次へ <Icon name="caret-right" size={16} color="#fff" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("compare")}>
                <Icon name="caret-left" size={16} color={C.primary} /> 戻る
              </Button>
              <Button variant="danger" onClick={() => onConfirm && onConfirm(merged, itemB, choices)}>
                <Icon name="trash" size={16} color="#fff" /> 削除して統合
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
