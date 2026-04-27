// Textarea — 複数行入力
// props:
//   label, value, onChange, rows (default 3), placeholder, required, error
function Textarea({ label, value, onChange, rows = 3, placeholder, required, error, style: ext = {} }) {
  const [focus, setFocus] = useState(false);
  const hasError = !!error;
  const borderColor = hasError ? "#d93025" : (focus ? C.primary : C.border);
  const shadow = focus ? `0 0 0 2px ${hasError ? "rgba(217,48,37,0.2)" : C.primaryLight}` : "none";
  return (
    <div style={{ marginBottom: 12, ...ext }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, color: C.textSecondary, fontWeight: 500, marginBottom: 4 }}>
          {label}{required && <span style={{ color: "#d93025", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <textarea
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
          minHeight: 80,
          padding: "10px 14px",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 14,
          color: C.text,
          background: C.panel,
          outline: "none",
          boxShadow: shadow,
          resize: "vertical",
          transition: "border 150ms, box-shadow 150ms",
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
