// Button — 5 variants (S13.5 で角丸 8→12、Primary 色 #1a73e8→#007AFF への移行)
// props:
//   variant: primary | secondary | ghost | danger | disabled (default primary)
//   icon: アイコン名 (省略可、Icon コンポーネントで描画)
//   onClick, disabled, children, style (追加 style 上書き)
// DESIGN_SYSTEM §4.3 + §10.3 準拠、最小 44×44px のタップ領域
// 色は C.primary 経由で参照 (constants.js) — ハードコード hex 禁止
function Button({ variant = "primary", icon, onClick, disabled, children, style: ext = {}, ...rest }) {
  const isDisabled = disabled || variant === "disabled";
  // BUTTON_STYLES は関数内で構築 (C 定数依存のため timing 安全)
  const STYLES = {
    primary:   { bg: C.primary,    text: "#ffffff",  border: "none",                       hover: C.primaryHover  },
    secondary: { bg: C.panel,      text: C.primary,  border: `1px solid ${C.primary}`,     hover: C.primaryLight  },
    ghost:     { bg: "transparent",text: C.primary,  border: "none",                       hover: C.primaryLight  },
    danger:    { bg: C.error,      text: "#ffffff",  border: "none",                       hover: "#b3271e"       },
    disabled:  { bg: C.panel2,     text: C.textMuted,border: "none",                       hover: C.panel2        },
  };
  const s = STYLES[isDisabled ? "disabled" : variant] || STYLES.primary;
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
        borderRadius: RADIUS.btn, // S13.5: 8 → 12
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
