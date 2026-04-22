// FilterChip — Sessions 絞り込みチップ (DESIGN_SYSTEM §8.5.2)
// props:
//   label: 軸ラベル (例: "種類", "ラケット", "対戦相手", "結果")
//   selectedValues: string[] (この軸で選択中の値、0件なら「未選択」表示)
//   onOpen: タップで Drawer を開くコールバック
//   onClear: 選択済み時のクリア (× ボタンから通知、省略可)
// 仕様:
//   - 高さ 32, pill (border-radius 16)
//   - 未選択: panel 背景 / textSecondary / border 1px
//   - 選択中: primaryLight 背景 / primary / border 1px primary
//   - 選択中の表示: 「ラケット: Ezone98」, 2件以上は「ラケット: Ezone98 +1」
//   - tap: scale(0.98) 150ms

function FilterChip({ label, selectedValues = [], onOpen, onClear }) {
  const [press, setPress] = useState(false);
  const selected = selectedValues.length > 0;
  const bg = selected ? C.primaryLight : C.panel;
  const fg = selected ? C.primary : C.textSecondary;
  const bd = selected ? C.primary : C.border;

  let display = label;
  if (selected) {
    if (selectedValues.length === 1) display = `${label}: ${selectedValues[0]}`;
    else display = `${label}: ${selectedValues[0]} +${selectedValues.length - 1}`;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen && onOpen(); } }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      aria-pressed={selected}
      aria-label={selected ? `${label} (${selectedValues.length}件選択中)` : `${label} を絞り込む`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 32,
        paddingLeft: 12,
        paddingRight: selected && onClear ? 4 : 12,
        border: `1px solid ${bd}`,
        borderRadius: 16,
        background: bg,
        color: fg,
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        fontFamily: font,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "background 150ms, border 150ms, transform 150ms",
        transform: press ? "scale(0.98)" : "scale(1)",
      }}
    >
      <span>{display}</span>
      {selected && onClear ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label={`${label} の絞り込みをクリア`}
          style={{
            width: 22, height: 22,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent",
            color: C.primary, cursor: "pointer",
            padding: 0, borderRadius: 11,
          }}
        >
          <Icon name="x" size={14} color={C.primary} />
        </button>
      ) : (
        <Icon name="chevron-down" size={14} color={fg} />
      )}
    </div>
  );
}
