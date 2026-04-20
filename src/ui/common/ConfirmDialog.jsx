// ConfirmDialog — 破壊的操作の確認ダイアログ
// props:
//   open: boolean
//   title: ダイアログタイトル (default "確認")
//   message: 説明テキスト
//   yesLabel (default "削除する"), noLabel (default "キャンセル")
//   yesVariant: Button variant (default "danger")
//   icon: 先頭アイコン (default "delete")
//   onYes, onNo
// DESIGN_SYSTEM §4.7 準拠、キャンセル左・確定右の配置
function ConfirmDialog({
  open, title = "確認", message, icon = "trash-2",
  yesLabel = "削除する", noLabel = "キャンセル",
  yesVariant = "danger",
  onYes, onNo,
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onNo}>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Icon name={icon} size={40} color={yesVariant === "danger" ? "#d93025" : C.primary} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, textAlign: "center", marginTop: 12, marginBottom: 8, color: C.text }}>
        {title}
      </div>
      {message && (
        <div style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
          {message}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" onClick={onNo} style={{ flex: 1 }}>{noLabel}</Button>
        <Button variant={yesVariant} onClick={onYes} style={{ flex: 1 }}>{yesLabel}</Button>
      </div>
    </Modal>
  );
}

// フック: useConfirm()
// 返り値: { ask(message, onYes, options?), el }
// options: { title, yesLabel, noLabel, yesVariant, icon }
function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (message, onYes, options = {}) => {
    setState({ message, onYes, ...options });
  };
  const el = state ? (
    <ConfirmDialog
      open={true}
      message={state.message}
      title={state.title}
      yesLabel={state.yesLabel}
      noLabel={state.noLabel}
      yesVariant={state.yesVariant}
      icon={state.icon}
      onYes={() => { state.onYes(); setState(null); }}
      onNo={() => setState(null)}
    />
  ) : null;
  return { ask, el };
}
