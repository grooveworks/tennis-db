// Input — テキスト入力欄
// props:
//   label: ラベル
//   value, onChange
//   type: "text" | "number" | "date" | "time" (default "text")
//   placeholder
//   required
//   error: エラーメッセージ (指定で赤枠 + メッセージ)
// DESIGN_SYSTEM §4.4 準拠
function Input({ label, value, onChange, type = "text", placeholder, required, error, style: ext = {}, ...rest }) {
  const [focus, setFocus] = useState(false);
  const hasError = !!error;
  const borderColor = hasError ? "#d93025" : (focus ? C.primary : C.border);
  const shadow = focus ? `0 0 0 2px ${hasError ? "rgba(217,48,37,0.2)" : "#e8f0fe"}` : "none";
  return (
    <div style={{ marginBottom: 12, ...ext }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>
          {label}{required && <span style={{ color: "#d93025", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={hasError}
        style={{
          width: "100%",
          minHeight: 44,
          padding: "10px 14px",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 14,
          color: C.text,
          background: C.panel,
          outline: "none",
          boxShadow: shadow,
          transition: "border 150ms, box-shadow 150ms",
        }}
        {...rest}
      />
      {hasError && (
        <div style={{ fontSize: 12, color: "#d93025", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="circle-alert" size={14} color="#d93025" /> {error}
        </div>
      )}
    </div>
  );
}
