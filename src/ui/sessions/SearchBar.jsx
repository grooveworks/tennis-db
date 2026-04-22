// SearchBar — Sessions 横断テキスト検索入力 (DESIGN_SYSTEM §8.5.1)
// props:
//   value: 現在の検索語
//   onChange: 文字列で通知 (空文字可)
//   placeholder: 任意 (既定: 「タイトル・相手・メモを検索」)
// 仕様:
//   - 高さ 40, border-radius 20 (pill), 左端 search アイコン, 入力中のみ右端 × でクリア
//   - focus で border primary + shadow

function SearchBar({ value, onChange, placeholder = "タイトル・相手・メモを検索" }) {
  const [focus, setFocus] = useState(false);
  const borderColor = focus ? C.primary : C.border;
  const shadow = focus ? "0 0 0 2px #e8f0fe" : "none";
  return (
    <div style={{
      position: "relative",
      height: 40,
      border: `1px solid ${borderColor}`,
      borderRadius: 20,
      background: C.panel,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      boxShadow: shadow,
      transition: "border 150ms, box-shadow 150ms",
    }}>
      <Icon name="search" size={18} color={C.textSecondary} />
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        aria-label="セッションを検索"
        style={{
          flex: 1,
          minWidth: 0,
          height: 36,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: font,
          fontSize: 14,
          color: C.text,
          padding: "0 8px",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="検索をクリア"
          style={{
            width: 28, height: 28,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: C.textSecondary, padding: 0, borderRadius: 14,
          }}
        >
          <Icon name="x" size={16} color={C.textSecondary} />
        </button>
      )}
    </div>
  );
}
