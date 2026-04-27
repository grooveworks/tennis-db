// HomeQuickAdd — Home タブ最上部の Quick Add 3 ボタン (S14 / P1 本実装)
//
// preview_s13.5.html FINAL L210-215 / L57-63 に準拠:
//   - 高さ 72px、border-radius 18px、3 等分横並び
//   - グラデーション背景 (大会=橙系 / 練習=緑系 / 試打=紫系)
//   - Phosphor アイコン 26px (大会=trophy / 練習=person-standing→person-simple-run / 試打=tennis(Tabler))
//   - shadow + active 時 scale(.97)
//
// 配線:
//   - 大会・練習タップ → onQuickAdd(type) → app.jsx setQuickAddType → 既存 QuickAddModal 起動
//   - 試打タップ → 同 → QuickAddModal trial 拡張 (S14 で QuickAddModal 改修済)
//
// props:
//   onQuickAdd(type): "tournament" | "practice" | "trial" を渡す

const _HQA_BUTTONS = [
  { type: "tournament", label: "大会を記録", icon: "trophy",          grad: "linear-gradient(180deg,#FFB340,#FF9500)" },
  { type: "practice",   label: "練習を記録", icon: "person-standing", grad: "linear-gradient(180deg,#34C759,#30B050)" },
  { type: "trial",      label: "試打を記録", icon: "tennis",          grad: "linear-gradient(180deg,#AF52DE,#9334E0)" },
];

function HomeQuickAdd({ onQuickAdd }) {
  return (
    <div style={{ display: "flex", gap: 10, margin: "4px 0 10px" }}>
      {_HQA_BUTTONS.map((b) => (
        <button
          key={b.type}
          type="button"
          onClick={() => onQuickAdd && onQuickAdd(b.type)}
          aria-label={b.label}
          style={{
            flex: 1, height: 72,
            borderRadius: 18,
            border: "none",
            background: b.grad,
            color: "#fff",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 3,
            fontFamily: font,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 4px 14px rgba(0,0,0,.06)",
            transition: "transform .15s",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.97)"; }}
          onMouseUp={(e)   => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e)=> { e.currentTarget.style.transform = ""; }}
          onTouchStart={(e)=> { e.currentTarget.style.transform = "scale(.97)"; }}
          onTouchEnd={(e)  => { e.currentTarget.style.transform = ""; }}
        >
          <Icon name={b.icon} size={26} color="#fff" />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>{b.label}</span>
        </button>
      ))}
    </div>
  );
}
