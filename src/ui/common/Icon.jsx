// Icon — Phosphor アイコン (duotone weight 主) + Tabler tennis (1 個拝借) のラッパー
// S13.5 で Lucide → Phosphor に内部実装を差し替え (DESIGN_SYSTEM_v4.md §10 / DECISIONS S13.5)
// 呼び出し API は維持: <Icon name="trophy" size={24} color="..." ariaLabel="..." />
//
// props:
//   name: アイコン名 (旧 Lucide 名で受け付け、内部で Phosphor 名にマップ)。"tennis" は Tabler の SVG 拝借
//   size: px (default 24) — span の width/height + Phosphor は font-size として効く
//   color: CSS color (default "currentColor")
//   weight: "regular" | "duotone" | "fill" | "bold" | "thin" | "light" (default "regular")
//   ariaLabel: スクリーンリーダー用ラベル（アイコンのみのボタンでは必須）
// 依存: _head.html で Phosphor web font CSS 読み込み済み
// 旧 props (strokeWidth) は受け付けるが無視する (Phosphor は weight で表現するため)

// Lucide name → Phosphor name マッピング (S13.5 移行)
// 既存呼び出し側が Lucide 名で書かれているため、内部で Phosphor 名に変換する
// 未マップのキーは name そのまま (Phosphor 名で書かれている場合のフォールバック)
// 名前は ChatGPT 推奨 (DECISIONS S13.5 「Phosphor 適材適所ルール」) に揃える
const _PHOSPHOR_MAP = {
  // 大会・スポーツ系
  "trophy": "trophy",
  "medal": "medal",
  "award": "medal-military",
  "badge-check": "seal-check",
  "person-standing": "person-simple-run", // S13.5: ChatGPT 推奨 (走る = 練習らしい)
  "watch": "watch",
  "brain": "brain",
  "dumbbell": "barbell",
  "play-circle": "play-circle",
  // ナビ・タブ
  "house": "house",
  "list": "list",
  "backpack": "backpack",
  "notebook-pen": "note-pencil",
  "bar-chart-3": "chart-bar",
  // 矢印・ナビゲーション
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "chevron-left": "caret-left",
  "chevron-right": "caret-right",
  "chevron-up": "caret-up",
  "chevron-down": "caret-down",
  "rotate-ccw": "arrow-counter-clockwise",
  // アクション
  "x": "x",
  "plus": "plus",
  "check": "check",
  "pencil": "pencil-simple-line", // S13.5: ChatGPT 推奨 (編集の標準)
  "edit": "pencil-simple-line",
  "save": "floppy-disk",
  "trash-2": "trash",
  "search": "magnifying-glass",
  "filter": "funnel",
  "settings": "gear",
  "refresh-cw": "arrows-clockwise",
  "clipboard-copy": "clipboard-text",
  // 認証・ユーザー
  "log-in": "sign-in",
  "log-out": "sign-out",
  "user-circle": "user-circle",
  "user": "user",
  "users": "users",
  // 状態・通知
  "info": "info",
  "circle-check": "check-circle",
  "circle-alert": "warning-circle",
  "triangle-alert": "warning",
  "circle": "circle",
  "more-vertical": "dots-three-vertical",
  // 時間・日付
  "calendar": "calendar",
  "calendar-days": "calendar",
  "calendar-range": "calendar-blank",
  "calendar-blank": "calendar-blank",
  "calendar-check": "calendar-check",
  "clock": "clock",
  "history": "clock-counter-clockwise",
  // 場所・天気
  "map-pin": "map-pin",
  "sun": "sun",
  "cloud": "cloud",
  "cloud-sun": "cloud-sun",
  "thermometer": "thermometer",
  // 健康・Apple Watch (S14 / Practice Detail で使用)
  "flame": "flame",
  "heartbeat": "heartbeat",
  "gauge": "gauge",
  "heart": "heart",
  // 練習種別 (Home Quick Add + Practice Detail のチップで使用)
  "student": "student",
  "users-three": "users-three",
  "handshake": "handshake",
  // メモ・計画系 (Home Current Context / Plan タブで使用)
  "flag": "flag",
  "target": "target",
  "crosshair": "crosshair",
  "trending-up": "trend-up",
  "trend-up": "trend-up",
  "note": "note",
  "notebook": "notebook",
  "note-pencil": "note-pencil",
  // その他
  "grid-3x3": "squares-four",
};

// Tabler tennis SVG (MIT、Phosphor にラケット無いため 1 個だけ拝借)
const _TENNIS_SVG_INNER = '<path d="M11.578 14.453a6 6 0 1 0 -8.027 -8.029"/><path d="M9 14l-3.69 3.69a2 2 0 1 0 2.83 2.83l3.69 -3.69"/><circle cx="14" cy="10" r="6"/>';

function Icon({ name, size = 24, color = "currentColor", weight = "regular", ariaLabel, style: ext = {} }) {
  // 特別ケース: テニスラケット (Tabler の SVG をインライン埋め込み)
  if (name === "tennis") {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_TENNIS_SVG_INNER}</svg>`;
    return (
      <span
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          lineHeight: 0,
          verticalAlign: "middle",
          ...ext,
        }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    );
  }

  // Phosphor web font ベース (S13.5)
  const phName = _PHOSPHOR_MAP[name] || name; // 未マップは name そのまま (Phosphor 名で書かれてる場合)
  const wClass =
    weight === "duotone" ? "ph-duotone" :
    weight === "fill"    ? "ph-fill"    :
    weight === "bold"    ? "ph-bold"    :
    weight === "thin"    ? "ph-thin"    :
    weight === "light"   ? "ph-light"   :
                            "ph";

  return (
    <i
      className={`${wClass} ph-${phName}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{
        fontSize: size,
        lineHeight: 1,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        flexShrink: 0,
        ...ext,
      }}
    />
  );
}
