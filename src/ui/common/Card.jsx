// Card — 基本カード (S13.5 で角丸 12→20、PC のみ hover lift 追加 §10.3 / §10.4)
// props:
//   onClick: 指定ありでクリック可能カード (hover lift 効果あり、PC のみ)
//   style: 追加 style 上書き
// DESIGN_SYSTEM §4.2 + §10.3 + §10.4 準拠
//   - 角丸: RADIUS.card = 20px (S13.5 で 12→20、Apple ライク)
//   - hover lift: @media (hover:hover) and (pointer:fine) のみ発動
//     (matchMedia で device 判定、touch device では無発動)

// hover 対応 device かどうかを module load 時に 1 回判定
const _SUPPORTS_HOVER = typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function Card({ onClick, children, style: ext = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  const clickable = !!onClick;
  const lift = clickable && hover && _SUPPORTS_HOVER;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        background: lift ? C.panel2 : C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.card, // S13.5: 12 → 20 (Apple ライク)
        padding: 16,
        marginBottom: 8,
        cursor: clickable ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, background 150ms ease-out",
        transform: lift ? "translateY(-2px)" : "none",
        boxShadow: lift ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
        ...ext,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
