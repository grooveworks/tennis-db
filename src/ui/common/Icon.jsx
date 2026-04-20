// Icon — Lucide SVG のラッパー
// props:
//   name: Lucide アイコン名 (kebab-case、例: "trophy", "arrow-left", "badge-check")
//   size: px (default 24)
//   color: CSS color (default "currentColor")
//   strokeWidth: SVG stroke 幅 (default 2)
//   ariaLabel: スクリーンリーダー用ラベル（アイコンのみのボタンでは必須）
// 依存: _head.html で Lucide UMD CDN 読み込み済み (window.lucide.icons)
// 実装: window.lucide.icons[PascalCase(name)] から IconNode を取得し、SVG 文字列として構築

const _toPascalCase = (kebab) => String(kebab || "").replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

// IconNode を再帰的に SVG 文字列に変換
// IconNode 形式: [[tagName, attrs, children?], ...]
const _iconNodeToSvgString = (node) => {
  if (!Array.isArray(node)) return "";
  return node.map((entry) => {
    if (!Array.isArray(entry)) return "";
    const [tag, attrs, children] = entry;
    const attrStr = Object.entries(attrs || {})
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
      .join(" ");
    const inner = children ? _iconNodeToSvgString(children) : "";
    return `<${tag}${attrStr ? " " + attrStr : ""}>${inner}</${tag}>`;
  }).join("");
};

function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2, ariaLabel, style: ext = {} }) {
  const svgString = useMemo(() => {
    if (typeof window === "undefined" || !window.lucide || !window.lucide.icons) return "";
    const key = _toPascalCase(name);
    const iconData = window.lucide.icons[key];
    if (!iconData || !Array.isArray(iconData)) return "";
    const inner = _iconNodeToSvgString(iconData);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }, [name, size, color, strokeWidth]);

  if (!svgString) {
    return <span style={{ display: "inline-block", width: size, height: size, ...ext }} />;
  }

  return (
    <span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        verticalAlign: "middle",
        ...ext,
      }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
