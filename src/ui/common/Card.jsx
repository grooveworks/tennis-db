// Card — 基本カード
// props:
//   onClick: 指定ありでクリック可能カード (hover 効果あり)
//   style: 追加 style 上書き
// DESIGN_SYSTEM §4.2 準拠 (角丸12px、border 1px、padding 16px)
function Card({ onClick, children, style: ext = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        background: clickable && hover ? C.panel2 : C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        cursor: clickable ? "pointer" : "default",
        transition: "background 150ms ease-out",
        ...ext,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
