// MasterField — マスター候補があれば Select、無ければ Input にフォールバック
// 既存値が master に無い場合は「(現在値)」サフィックスで先頭に追加して欠落を防ぐ
// 用途: ラケット / ストリング / 会場 / 対戦相手 (master データは Gear タブ S16 で本格管理予定)
//
// props:
//   label, value, onChange, placeholder, required, error
//   masterValues: string[] — master データの name 配列 (空なら Input にフォールバック)

function MasterField({ label, value, onChange, masterValues = [], placeholder, required, error, style: ext }) {
  if (!masterValues || masterValues.length === 0) {
    return <Input label={label} value={value} onChange={onChange} placeholder={placeholder} required={required} error={error} style={ext} />;
  }
  const opts = [{ value: "", label: placeholder || `-- ${label}を選択 --` }];
  if (value && !masterValues.includes(value)) {
    opts.push({ value, label: `${value} (現在値)` });
  }
  masterValues.forEach((v) => opts.push({ value: v, label: v }));
  return <Select label={label} value={value} onChange={onChange} options={opts} required={required} error={error} style={ext} />;
}
