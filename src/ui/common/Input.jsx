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
  const shadow = focus ? `0 0 0 2px ${hasError ? "rgba(217,48,37,0.2)" : C.primaryLight}` : "none";
  return (
    <div style={{ marginBottom: 10, ...ext }}>
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
          boxSizing: "border-box",
          WebkitAppearance: "none", // S14.5: Safari iOS の date/time native UI 無効化 (重なり解消、tap で picker は引き続き起動)
          appearance: "none",
          minHeight: 44,
          padding: "10px 12px",    // v2 互換
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 13,            // v2 互換
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
