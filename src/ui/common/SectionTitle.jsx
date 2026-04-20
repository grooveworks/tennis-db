// SectionTitle — セクション見出し (アイコン + 文字)
// props:
//   icon: Material Symbols 名 (省略可)
//   children: タイトルテキスト
//   style: 追加 style 上書き
function SectionTitle({ icon, children, style: ext = {} }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 14,
      fontWeight: 600,
      color: C.text,
      marginTop: 20,
      marginBottom: 12,
      ...ext,
    }}>
      {icon && <Icon name={icon} size={18} color={C.primary} />}
      <span>{children}</span>
    </div>
  );
}
