// _NumWheel.jsx — Wheel picker components (S16 Phase B 復活、preview_s18_p10/p12 承認デザイン)
//
// 提供するコンポーネント (PracticeEditForm 等から使用):
//   TimeWheel       : 2 列ホイール (時 0-23 + 分 5 分刻み 0-55)、HH:MM 形式
//   DurationWheel   : 2 列ホイール (時間 0-12 + 分 5 分刻み 0-55)、startTime + duration から endTime 計算
//   NumWheel        : 1 列汎用 (テンション / 気温 / duration 単独 等)
//
// 内部コンポーネント (アンダースコア接頭):
//   _WheelButton    : Input.jsx 準拠のトリガー button (44px / 13px / ▾ + 保持バッジ)
//   _WheelSheet     : Bottom sheet コンテナ (FilterDrawer 準拠 + #fafafa 背景)
//   _WheelColumn    : 3D 立体 column (rotateX / scale / blur / mask) + scroll-snap
//
// 設計原則 (memory: feedback_data_destruction_2026_05_03.md 準拠):
//   ❌ 値変換ロジック禁止 (rounding/clamping を絶対に書き戻さない)
//   ❌ 暗黙確定禁止 (背景タップ・ESC・✕ = キャンセル、明示「完了」のみ)
//   ✅ 範囲外 / 非 5 分刻みの既存値は option 配列に追加して保持 (オレンジバッジ表示)
//   ✅ 完了時 draft === original なら No-op (onChange 呼ばない)
//
// preview 履歴:
//   p7 = button デザイン (Input 準拠)
//   p10 = Bottom sheet + v17 立体ホイール 融合
//   p12 = center weight 400 + ガラス帯 0.18 (F 案、iOS native 哲学) 採用

// ── スタイル定数 ────────────────────────
const _WHEEL_ITEM_H  = 36;
const _WHEEL_AREA_H  = 280;
const _WHEEL_PAD     = (280 - 36) / 2; // 122 (両端 padding で初期/末尾項目を center 可能に)
const _WHEEL_FONT_C  = 32;             // center font-size
const _WHEEL_FONT_E  = 26;             // edge font-size
const _WHEEL_WEIGHT  = 400;            // F 案: regular (太字なし)
const _WHEEL_BAR_BG  = "rgba(120,120,128,0.18)"; // F 案: 0.18 (薄め)

// ── _WheelButton (Input.jsx 準拠) ────────────────────────
//   props: label (string), displayValue (string|null), isPreserved (bool), onClick, error (string|null)
function _WheelButton({ label, displayValue, isPreserved, onClick, error, required }) {
  const hasError = !!error;
  const borderColor = hasError ? C.error : C.border;
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>
          {label}{required && <span style={{ color: C.error, marginLeft: 4 }}>*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-invalid={hasError}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 44,
          padding: "10px 12px",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 13,
          color: C.text,
          background: C.panel,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          outline: "none",
          transition: "border 150ms",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center" }}>
          {displayValue ? (
            <>
              <span>{displayValue}</span>
              {isPreserved && (
                <span style={{
                  display: "inline-block",
                  fontSize: 9, fontWeight: 700,
                  background: C.warningLight, color: "#875700",
                  padding: "1px 5px", borderRadius: 3,
                  marginLeft: 6,
                }}>保持</span>
              )}
            </>
          ) : (
            <span style={{ color: C.textMuted, fontWeight: 400 }}>未入力</span>
          )}
        </span>
        <span style={{ color: C.textMuted, fontSize: 11 }}>▾</span>
      </button>
      {hasError && (
        <div style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

// ── _WheelSheet (Bottom sheet コンテナ、FilterDrawer 準拠) ────────────────────────
//   props: open, title, hint, onClose (背景タップ/ESC/✕/キャンセル), onConfirm (完了)
function _WheelSheet({ open, title, hint, onClose, onConfirm, children }) {
  const trapRef = useFocusTrap(open);
  // ESC = キャンセル
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "ピッカー"}
      // 背景タップ = キャンセル (絶対 onConfirm 呼ばない)
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1300,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        ref={trapRef}
        style={{
          background: "#fafafa", // panel-soft (v17 由来、浮かせ感)
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          animation: "drawerEnter 250ms ease-out",
        }}
      >
        {/* ドラッグハンドル (視覚のみ) */}
        <div style={{
          width: 40, height: 4,
          background: C.border, borderRadius: 2,
          margin: "8px auto 4px",
        }} />

        {/* ヘッダ */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "8px 8px 8px 16px",
          borderBottom: `1px solid ${C.divider}`,
        }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              width: 40, height: 40,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", cursor: "pointer",
              color: C.textSecondary, padding: 0, borderRadius: 8,
            }}
          >
            <Icon name="x" size={22} color={C.textSecondary} />
          </button>
        </div>

        {/* コンテンツ (Wheel 列) */}
        <div style={{ padding: "8px 16px 4px" }}>
          {children}
        </div>

        {/* ヒント */}
        {hint && (
          <div style={{
            fontSize: 11, color: C.textSecondary,
            textAlign: "center",
            padding: "6px 14px",
          }}>
            {hint}
          </div>
        )}

        {/* フッター: キャンセル + 完了 */}
        <div style={{
          display: "flex", gap: 8,
          padding: "10px 14px 14px",
          borderTop: `1px solid ${C.divider}`,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, minHeight: 44,
              border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.panel, color: C.textSecondary,
              fontFamily: font, fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 2, minHeight: 44,
              border: "none", borderRadius: 8,
              background: C.primary, color: "#fff",
              fontFamily: font, fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,122,255,0.3)",
            }}
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}

// ── _WheelColumn (scroll + snap + 3D 立体 depth) ────────────────────────
//   props: items [{value, label, preserved?}], value (current), onChange(newValue)
//   scroll-snap で各項目に snap、center は font-size 32px regular、周辺は rotateX/scale/blur で奥行
function _WheelColumn({ items, value, onChange }) {
  const ref = useRef(null);
  const tmRef = useRef(null);
  const initialIdx = useMemo(() => {
    const i = items.findIndex(it => String(it.value) === String(value));
    return i >= 0 ? i : 0;
  }, [items, value]);
  const [centerIdx, setCenterIdx] = useState(initialIdx);

  // 初期スクロール位置 (open のたびに value 位置へ)
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = initialIdx * _WHEEL_ITEM_H;
      setCenterIdx(initialIdx);
    }
  }, [initialIdx]);

  // スクロール中: centerIdx 更新 + 停止後 snap + 親通知
  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / _WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    setCenterIdx(clamped);
    if (tmRef.current) clearTimeout(tmRef.current);
    tmRef.current = setTimeout(() => {
      const target = clamped * _WHEEL_ITEM_H;
      if (Math.abs(el.scrollTop - target) > 0.5) el.scrollTop = target;
      const newVal = items[clamped]?.value;
      if (newVal !== undefined && String(newVal) !== String(value)) {
        onChange(newVal);
      }
    }, 100);
  };

  // 距離別スタイル (v17 spec、F 案: center weight 400)
  const itemStyle = (dist, isPreserved) => {
    const base = {
      flex: `0 0 ${_WHEEL_ITEM_H}px`,
      lineHeight: `${_WHEEL_ITEM_H}px`,
      fontFamily: font,
      fontVariantNumeric: "tabular-nums",
      color: C.text,
      userSelect: "none",
      transformOrigin: "center",
      backfaceVisibility: "hidden",
      textAlign: "center",
      width: "100%",
      scrollSnapAlign: "center",
    };
    if (dist === 0) {
      // center: 拡大 + regular weight + 保持時オレンジ
      const c = {
        ...base,
        fontSize: _WHEEL_FONT_C,
        fontWeight: _WHEEL_WEIGHT, // F 案: 400
        opacity: 1,
      };
      if (isPreserved) {
        return {
          ...c,
          color: "#875700",
          background: "rgba(251,188,4,0.18)",
          borderRadius: 8,
        };
      }
      return c;
    }
    // 周辺: rotateX + scale + blur (上=正、下=負)
    const sign = dist < 0 ? 1 : -1; // 上にあるなら正回転
    const abs = Math.abs(dist);
    const map = {
      1: { opacity: 0.75, scale: 0.92, deg: 20, blur: 0.3 },
      2: { opacity: 0.45, scale: 0.82, deg: 40, blur: 0.7 },
      3: { opacity: 0.20, scale: 0.70, deg: 60, blur: 1.2 },
    };
    const m = map[abs];
    if (m) {
      return {
        ...base,
        fontSize: _WHEEL_FONT_E,
        fontWeight: 400,
        opacity: m.opacity,
        transform: `rotateX(${sign * m.deg}deg) scale(${m.scale})`,
        filter: `blur(${m.blur}px)`,
      };
    }
    // それ以遠は非表示 (mask-image でフェードするのでこれは保険)
    return { ...base, fontSize: _WHEEL_FONT_E, opacity: 0 };
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="wheel-col-scroll"
      style={{
        height: _WHEEL_AREA_H,
        overflowY: "auto",
        overflowX: "hidden",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        position: "relative",
        // 修正: perspective を outer (visible viewport) に移動 → 消失点を viewport 中心に固定
        //   旧: 長い inner div (5000px+) に付けていたので消失点がズレ、項目位置によって見え方が非対称になっていた
        perspective: "1000px",
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div style={{
        paddingTop: _WHEEL_PAD,
        paddingBottom: _WHEEL_PAD,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transformStyle: "preserve-3d",
      }}>
        {items.map((item, i) => (
          <div key={`${item.value}-${i}`} style={itemStyle(i - centerIdx, item.preserved)}>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── _WheelColsContainer: 1 列 / 2 列共通の中央ガラス帯付きラッパー ────────────────────────
function _WheelColsContainer({ cols, children }) {
  return (
    <div style={{
      position: "relative",
      display: "grid",
      gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
      gap: 0,
    }}>
      {children}
      {/* ガラス帯 (F 案 0.18) */}
      <div style={{
        position: "absolute",
        left: 8, right: 8,
        top: "calc(50% - 22px)",
        height: 44,
        background: _WHEEL_BAR_BG,
        borderRadius: 10,
        pointerEvents: "none",
        zIndex: 2,
      }} />
    </div>
  );
}

// ── TimeWheel (時 + 分、HH:MM) ────────────────────────
//   props: label, value (HH:MM or ""), onChange (HH:MM)
//   範囲外 hour / 非 5 分刻み min は option に追加して保持
function TimeWheel({ label, value, onChange, error, required }) {
  const [open, setOpen] = useState(false);
  const cur = (value || "").trim();

  // 元値をパース (NaN なら null)
  const [origH, origM] = useMemo(() => {
    const parts = cur.split(":");
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    return [
      isNaN(hh) ? null : hh,
      isNaN(mm) ? null : mm,
    ];
  }, [cur]);

  // draft state — 開いたときに元値で初期化
  const [draftH, setDraftH] = useState(origH ?? 10);
  const [draftM, setDraftM] = useState(origM ?? 0);

  const handleOpen = () => {
    setDraftH(origH ?? 10);
    setDraftM(origM ?? 0);
    setOpen(true);
  };

  // option 配列 — 範囲外/非 5 分刻みの既存値は option に追加して保持 (preserved=true)
  const hourItems = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 23; i++) arr.push({ value: i, label: String(i) });
    if (origH !== null && origH !== undefined && (origH < 0 || origH > 23)) {
      arr.push({ value: origH, label: String(origH), preserved: true });
      arr.sort((a, b) => a.value - b.value);
    }
    return arr;
  }, [origH]);

  const minItems = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 55; i += 5) arr.push({ value: i, label: String(i).padStart(2, "0") });
    if (origM !== null && origM !== undefined && (origM < 0 || origM > 55 || origM % 5 !== 0)) {
      arr.push({ value: origM, label: String(origM).padStart(2, "0"), preserved: true });
      arr.sort((a, b) => a.value - b.value);
    }
    return arr;
  }, [origM]);

  // 完了: draft === original なら No-op
  const handleConfirm = () => {
    if (draftH === origH && draftM === origM) {
      setOpen(false);
      return;
    }
    const out = `${String(draftH).padStart(2, "0")}:${String(draftM).padStart(2, "0")}`;
    onChange(out);
    setOpen(false);
  };

  const display = cur;
  const isPreserved = origM !== null && origM !== undefined && origM % 5 !== 0;

  return (
    <>
      <_WheelButton label={label} displayValue={display} isPreserved={isPreserved} onClick={handleOpen} error={error} required={required} />
      <_WheelSheet
        open={open}
        title={label || "時刻"}
        hint="背景タップ = キャンセル / 触らず完了 = 値変更なし"
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      >
        <_WheelColsContainer cols={2}>
          <_WheelColumn items={hourItems} value={draftH} onChange={setDraftH} />
          <_WheelColumn items={minItems} value={draftM} onChange={setDraftM} />
        </_WheelColsContainer>
      </_WheelSheet>
    </>
  );
}

// ── DurationWheel (時間 + 分、startTime + duration → endTime) ────────────────────────
//   props: label, startTime (HH:MM 必須)、value (現在の endTime HH:MM)、onChange (新 endTime)
//   既存 endTime と startTime から duration を計算、範囲外 (>12h) はそのまま保持
function DurationWheel({ label, startTime, value, onChange, error, required }) {
  const [open, setOpen] = useState(false);

  const computeDuration = (start, end) => {
    if (!start || !end) return [null, null];
    const [sh, sm] = start.split(":").map(n => parseInt(n, 10));
    const [eh, em] = end.split(":").map(n => parseInt(n, 10));
    if (isNaN(sh) || isNaN(eh)) return [null, null];
    let mins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    if (mins < 0) mins += 24 * 60; // 日跨ぎ
    return [Math.floor(mins / 60), mins % 60];
  };

  const [origH, origM] = useMemo(() => computeDuration(startTime, value), [startTime, value]);
  const [draftH, setDraftH] = useState(origH ?? 1);
  const [draftM, setDraftM] = useState(origM ?? 30);

  const handleOpen = () => {
    setDraftH(origH ?? 1);
    setDraftM(origM ?? 30);
    setOpen(true);
  };

  // 時間 0..12 + 既存値が範囲外なら追加保持
  const hourItems = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 12; i++) arr.push({ value: i, label: String(i) });
    if (origH !== null && origH !== undefined && origH > 12) {
      arr.push({ value: origH, label: String(origH), preserved: true });
    }
    return arr;
  }, [origH]);

  // 分 5 分刻み + 非 5 分刻み既存値は追加保持
  const minItems = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 55; i += 5) arr.push({ value: i, label: String(i).padStart(2, "0") });
    if (origM !== null && origM !== undefined && (origM < 0 || origM > 55 || origM % 5 !== 0)) {
      arr.push({ value: origM, label: String(origM).padStart(2, "0"), preserved: true });
      arr.sort((a, b) => a.value - b.value);
    }
    return arr;
  }, [origM]);

  const handleConfirm = () => {
    if (draftH === origH && draftM === origM) {
      setOpen(false);
      return;
    }
    if (!startTime) {
      // startTime が無いと endTime 計算不可、何もしない
      setOpen(false);
      return;
    }
    const [sh, sm] = startTime.split(":").map(n => parseInt(n, 10));
    let total = (sh * 60 + (sm || 0)) + (draftH * 60 + draftM);
    total = total % (24 * 60);
    const out = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    onChange(out);
    setOpen(false);
  };

  const display = (() => {
    if (origH === null || origM === null) return "";
    if (origH === 0 && origM === 0) return "0 分";
    if (origH === 0) return `${origM} 分`;
    if (origM === 0) return `${origH} 時間`;
    return `${origH} 時間 ${origM} 分`;
  })();

  const isPreserved = (origH !== null && origH > 12) || (origM !== null && origM % 5 !== 0);

  return (
    <>
      <_WheelButton label={label} displayValue={display} isPreserved={isPreserved} onClick={handleOpen} error={error} required={required} />
      <_WheelSheet
        open={open}
        title={label || "時間"}
        hint={`基準 startTime: ${startTime || "(未設定)"}`}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      >
        <_WheelColsContainer cols={2}>
          <_WheelColumn items={hourItems} value={draftH} onChange={setDraftH} />
          <_WheelColumn items={minItems} value={draftM} onChange={setDraftM} />
        </_WheelColsContainer>
      </_WheelSheet>
    </>
  );
}

// ── NumWheel (1 列汎用、テンション/気温/duration 単独 等) ────────────────────────
//   props: label, value, min, max, step (default 1), unit (表示単位)、onChange
//   範囲外/step 非整合の既存値は option に追加して保持
function NumWheel({ label, value, min, max, step = 1, unit = "", onChange, error, required }) {
  const [open, setOpen] = useState(false);
  const cur = (value === null || value === undefined ? "" : String(value)).trim();

  const items = useMemo(() => {
    const arr = [];
    for (let i = min; i <= max; i += step) arr.push({ value: String(i), label: String(i) });
    if (cur && !arr.find(a => a.value === cur)) {
      // 範囲外既存値を保持
      arr.push({ value: cur, label: cur, preserved: true });
      arr.sort((a, b) => Number(a.value) - Number(b.value));
    }
    return arr;
  }, [min, max, step, cur]);

  const [draft, setDraft] = useState(cur);
  const orig = cur;

  const handleOpen = () => {
    setDraft(cur);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (draft === orig) {
      setOpen(false);
      return;
    }
    onChange(draft);
    setOpen(false);
  };

  const display = cur ? `${cur}${unit}` : "";
  // preserved 判定: 範囲外 or step 非整合
  const numCur = parseInt(cur, 10);
  const isPreserved = !!cur && (
    isNaN(numCur) || numCur < min || numCur > max || (numCur - min) % step !== 0
  );

  return (
    <>
      <_WheelButton label={label} displayValue={display} isPreserved={isPreserved} onClick={handleOpen} error={error} required={required} />
      <_WheelSheet
        open={open}
        title={label || "数値"}
        hint={`範囲 ${min} 〜 ${max}${unit ? ` (${unit.trim()})` : ""}`}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      >
        <_WheelColsContainer cols={1}>
          <_WheelColumn items={items} value={draft} onChange={setDraft} />
        </_WheelColsContainer>
      </_WheelSheet>
    </>
  );
}
