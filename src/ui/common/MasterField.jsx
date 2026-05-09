// MasterField — 自前 Combobox (input + dropdown 候補) で「候補補助 + 自由入力可」
//                マスター候補が無い時は通常 Input にフォールバック
//
// 経緯 (S17):
//   旧版 1: master があると Select 強制 → 新規対戦相手登録不可 (regression)
//   旧版 2: <input list> + <datalist> → iPhone Safari で候補ドロップダウンが出ない問題
//   現版: 自前実装で iPhone Safari でも確実に候補表示
//
// 動作:
//   - フォーカス時に下に候補リスト dropdown 表示
//   - 入力中の文字で候補を prefix/contains フィルタ
//   - 候補タップで input value 更新 + dropdown 閉じる
//   - input は自由入力可 (master に無い名前を入力 → そのまま value)
//
// props:
//   label, value, onChange, placeholder, required, error
//   masterValues: string[] — master データの name 配列 (空なら通常 Input)

function MasterField({ label, value, onChange, masterValues = [], placeholder, required, error, style: ext = {} }) {
  const [focus, setFocus] = useState(false);
  const blurTimerRef = useRef(null);
  // datalist が無いケース (master 空) は Input にフォールバック
  if (!masterValues || masterValues.length === 0) {
    return <Input label={label} value={value} onChange={onChange} placeholder={placeholder} required={required} error={error} style={ext} />;
  }
  const hasError = !!error;
  const borderColor = hasError ? "#d93025" : (focus ? C.primary : C.border);
  const shadow = focus ? `0 0 0 2px ${hasError ? "rgba(217,48,37,0.2)" : C.primaryLight}` : "none";
  // 候補リスト: 重複・空除外
  // S17 修繕方針:
  //   value が空 → 全候補表示
  //   value が master 候補と完全一致 (= 既存値を変更したい状況) → 全候補表示
  //   value が部分一致 → filter で絞り込み
  //   value が master のどれにも一致しない (= 自由入力中 / master 外の長い既存値) → 全候補 fallback 表示
  const v = (value || "").toLowerCase();
  const opts = Array.from(new Set(masterValues.filter(Boolean)));
  const isExactMatch = opts.some(o => o === value);
  let filtered;
  if (!v || isExactMatch) {
    filtered = opts;
  } else {
    const matched = opts.filter(o => o.toLowerCase().includes(v));
    filtered = matched.length > 0 ? matched : opts;
  }
  const showDropdown = focus && filtered.length > 0;
  return (
    <div style={{ marginBottom: 10, position: "relative", ...ext }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>
          {label}{required && <span style={{ color: "#d93025", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
          setFocus(true);
        }}
        onBlur={() => {
          // 候補クリック完了を待つため遅延で閉じる (mousedown で preventDefault しているが念のため)
          blurTimerRef.current = setTimeout(() => setFocus(false), 150);
        }}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={hasError}
        style={{
          width: "100%",
          boxSizing: "border-box",
          WebkitAppearance: "none",
          appearance: "none",
          minHeight: 44,
          padding: "10px 12px",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 13,
          color: C.text,
          background: C.panel,
          outline: "none",
          boxShadow: shadow,
          transition: "border 150ms, box-shadow 150ms",
        }}
      />
      {showDropdown && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 2px)", left: 0, right: 0,
            zIndex: 10,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.slice(0, 30).map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt);
                setFocus(false);
                if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                background: opt === value ? C.primaryLight : "transparent",
                border: "none",
                borderBottom: `1px solid ${C.divider}`,
                textAlign: "left",
                fontFamily: font,
                fontSize: 13,
                color: C.text,
                cursor: "pointer",
              }}
            >{opt}</button>
          ))}
        </div>
      )}
      {hasError && (
        <div style={{ fontSize: 12, color: "#d93025", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="circle-alert" size={14} color="#d93025" /> {error}
        </div>
      )}
    </div>
  );
}
