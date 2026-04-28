// Textarea — 複数行入力 (S15.5.7: auto-grow + 文字サイズ scale 対応)
// props:
//   label, value, onChange, rows (default 3 = 最小行数), placeholder, required, error
//
// auto-grow: 入力に合わせて textarea の高さが scrollHeight に追随、長文でも文末まで見える
// 文字サイズ: CSS var --memo-font-scale を使い、Settings の選択 (1.0/1.15/1.30) で拡大
function Textarea({ label, value, onChange, rows = 3, placeholder, required, error, style: ext = {} }) {
  const [focus, setFocus] = useState(false);
  const ref = useRef(null);
  const hasError = !!error;
  const borderColor = hasError ? "#d93025" : (focus ? C.primary : C.border);
  const shadow = focus ? `0 0 0 2px ${hasError ? "rgba(217,48,37,0.2)" : C.primaryLight}` : "none";

  // auto-grow: value 変化のたびに高さを scrollHeight に合わせる
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [value]);

  return (
    <div style={{ marginBottom: 10, ...ext }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>
          {label}{required && <span style={{ color: "#d93025", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        rows={rows}
        aria-required={required}
        aria-invalid={hasError}
        style={{
          width: "100%",
          boxSizing: "border-box",
          // S15.5.7: minHeight は rows × line-height に応じて確保 (auto-grow と整合)
          minHeight: `calc(${rows} * 1.55em + 24px)`,
          padding: "12px",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          // S15.5.7: 13 → 16 ベース + scale 倍率 (老眼配慮、設定 Modal で 1.0/1.15/1.30 切替)
          fontSize: "calc(16px * var(--memo-font-scale, 1))",
          lineHeight: 1.55,
          color: C.text,
          background: C.panel,
          outline: "none",
          boxShadow: shadow,
          resize: "none",   // auto-grow なので手動 resize 不要
          overflow: "hidden",
          transition: "border 150ms, box-shadow 150ms",
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
      {hasError && (
        <div style={{ fontSize: 12, color: "#d93025", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="circle-alert" size={14} color="#d93025" /> {error}
        </div>
      )}
    </div>
  );
}
