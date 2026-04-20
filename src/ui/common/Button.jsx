// Button — 5 variants
// props:
//   variant: primary | secondary | ghost | danger | disabled (default primary)
//   icon: Material Symbols 名 (省略可)
//   onClick, disabled, children, style (追加 style 上書き)
// DESIGN_SYSTEM §4.3 準拠、最小 44×44px のタップ領域
const BUTTON_STYLES = {
  primary:   { bg: "#1a73e8", text: "#ffffff", border: "none", hover: "#1765cc" },
  secondary: { bg: "#ffffff", text: "#1a73e8", border: "1px solid #1a73e8", hover: "#e8f0fe" },
  ghost:     { bg: "transparent", text: "#1a73e8", border: "none", hover: "#e8f0fe" },
  danger:    { bg: "#d93025", text: "#ffffff", border: "none", hover: "#b3271e" },
  disabled:  { bg: "#f1f3f4", text: "#80868b", border: "none", hover: "#f1f3f4" },
};
function Button({ variant = "primary", icon, onClick, disabled, children, style: ext = {}, ...rest }) {
  const isDisabled = disabled || variant === "disabled";
  const s = BUTTON_STYLES[isDisabled ? "disabled" : variant] || BUTTON_STYLES.primary;
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 44,
        padding: "10px 20px",
        borderRadius: 8,
        fontFamily: font,
        fontSize: 14,
        fontWeight: 500,
        cursor: isDisabled ? "not-allowed" : "pointer",
        border: s.border,
        background: hover && !isDisabled ? s.hover : s.bg,
        color: s.text,
        transition: "background 150ms ease-out, opacity 150ms",
        ...ext,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} color={s.text} />}
      {children}
    </button>
  );
}
