# Tennis DB v4 — デザインシステム

作成日: 2026-04-19 / 前提: REQUIREMENTS_v4.md §N1, §N1a / ARCHITECTURE_v4.md §6

---

## 0. 設計思想

- **青ベース・明るい基調**（Google Material Design 3 風）
- **シンプル・削ぎ落とし**（Google 系アプリ参考、装飾最小）
- **情報階層 3 段**で全画面統一（主/副/補助）
- **ユニバーサルデザイン必須**（色弱・文字拡大・キーボード・スクリーンリーダー対応）
- **アイコンは Material Symbols Outlined** で統一
- **v3 の色分け記号性は変更**（青を主色にするため再配置）

---

## 1. 色パレット

### 1.1 Primary（主色・アクセント）

| 用途 | HEX | コントラスト（on white） | 使う場所 |
|---|---|---|---|
| Primary | `#1a73e8` | 4.6:1 | メインボタン、リンク、アクティブタブ、選択状態 |
| Primary Hover | `#1765cc` | 5.7:1 | Primary のホバー／押下時 |
| Primary Light | `#e8f0fe` | — | アクティブ背景、ハイライト帯、フォーカスリング |

### 1.2 Sessions カテゴリ色

主色が青のため、v3 から色分けを再配置。各カテゴリはアイコン+文字ラベル併用必須。

| カテゴリ | アクセント | Light | 意味 |
|---|---|---|---|
| 🏆 大会 | `#f9ab00` (Orange) | `#feefc3` | 競技・ハイライト |
| 🏃 練習 | `#0f9d58` (Green) | `#e6f4ea` | 継続・成長 |
| 🎾 試打 | `#9334e0` (Purple) | `#f3e8fd` | 実験・探求 |

### 1.3 Semantic（状態表現）

Sessions Category (§1.2) と色被りしないよう、Warning は Yellow 独立色を使う。

| 用途 | HEX | Light | Dark (バッジ文字用) | 使う場所 |
|---|---|---|---|---|
| Info | `#1a73e8` | `#e8f0fe` | `#0d47a1` | 情報通知、準優勝等（Primary 系） |
| Success | `#0f9d58` | `#e6f4ea` | `#0a5b35` | 完了トースト、勝利、予選突破 |
| Warning | `#fbbc04` | `#fef7e0` | `#7e5d00` | 注意通知、ベスト8/16、未入力警告（Yellow 独立） |
| Error / Danger | `#d93025` | `#fce8e6` | `#a31511` | エラー、敗退、削除ボタン |

### 1.4 テキスト（On Surface、3 段階）

| 用途 | HEX | コントラスト | 使う場所 |
|---|---|---|---|
| text (主) | `#202124` | 16.2:1 (AAA) | 見出し・本文・数値 |
| textSecondary (副) | `#5f6368` | 7.1:1 (AAA) | メタ情報・説明・ラベル |
| textMuted (補助) | `#80868b` | 4.8:1 (AA+) | タイムスタンプ・補足、**12px 以下の小さい文字には使わない** |

### 1.5 Surface（背景・区切り）

| 用途 | HEX | 使う場所 |
|---|---|---|
| bg | `#f8f9fa` | ページ全体背景 |
| panel | `#ffffff` | カード・モーダル・入力欄背景 |
| panel2 | `#f1f3f4` | hover 状態、セクション内の淡い背景 |
| border | `#dadce0` | カード枠線、区切り線 |
| divider | `#e8eaed` | 控えめな区切り |

### 1.6 禁止事項

- **textMuted を bg (`#f8f9fa`) 上の細字に使わない**（コントラスト落ちる）→ textSecondary 以上を使う
- 色だけで情報を伝える（必ずアイコンまたは文字ラベル併用）
- 独自色の one-off 使用（上記パレット以外を使いたくなったら、パレットへの追加を検討）

---

## 2. タイポグラフィ

### 2.1 フォントファミリー（v2/v3 継承）

```css
font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Helvetica Neue", Arial, sans-serif;
```

### 2.2 サイズ階層

| 役割 | px | rem | weight | line-height | 使う場所 |
|---|---|---|---|---|---|
| H1 | 24 | 1.5 | 700 | 1.3 | ページタイトル |
| H2 | 20 | 1.25 | 700 | 1.3 | セクション見出し |
| H3 | 16 | 1.0 | 600 | 1.4 | サブセクション・カード見出し |
| body | 14 | 0.875 | 400/500 | 1.6 | 本文・説明・リスト |
| small | 12 | 0.75 | 400 | 1.5 | 補足・ラベル |
| tiny | 11 | 0.6875 | 600 | 1.4 | バッジ・タグ・メタ |

### 2.3 行間・文字間

- 見出し: line-height `1.3`、letter-spacing `-0.01em`（英字のみ、日本語はデフォルト）
- 本文: line-height `1.6`、letter-spacing `0`
- 密集表（リスト行・ラベル）: line-height `1.4`
- 日本語: `font-kerning: normal` でカーニング有効化

### 2.4 禁止事項

- 本文に `font-weight: 300` など細身を使わない（視認性低下）
- 日本語の letter-spacing を正値に（文字詰まりすぎる）
- line-height 未指定（ブラウザデフォルトに依存しない）

---

## 3. 余白システム

### 3.1 基本単位: 4px グリッド

| トークン | px | 用途 |
|---|---|---|
| xs | 4 | アイコンと文字の間、バッジ内 padding |
| sm | 8 | ボタン内 gap、要素間の小余白 |
| md | 12 | コンポーネント内 padding、要素間の中余白 |
| lg | 16 | カード内 padding、セクション内余白 |
| xl | 20 | 画面外縁 padding、モーダル内 padding |
| 2xl | 24 | セクション間、ページ上下余白 |
| 3xl | 32 | 大きな区切り |

### 3.2 コンポーネント内／外ルール

- ボタン内 padding: `10px 20px` (`sm` 高さ + `xl` 横)
- カード内 padding: `lg` (16px)
- カード間 margin-bottom: `sm` (8px)
- セクション間: `2xl` (24px)
- 画面外縁: `xl` (20px)

---

## 4. コンポーネント仕様

### 4.1 Badge（カテゴリ・状態表示）

| 属性 | 値 |
|---|---|
| 高さ | 22px |
| padding | `2px 8px` |
| border-radius | 4px |
| font-size | 11px |
| font-weight | 600 |
| line-height | 1 |
| アイコン (内包時) font-size | 13px |
| white-space | nowrap |

**色指定（背景は Semantic Light、文字は暗色系で AA 以上を確保）**:

鮮やかな Semantic 原色（#f9ab00 等）は **Light 背景上で直接文字色に使わない**（コントラスト 1.6:1 等で不足）。バッジ文字には以下の暗色系を使う。

| variant | 背景 | 文字色 | コントラスト | 用途例 |
|---|---|---|---|---|
| tournament | `#ffffff` | `#a04f00` | 7.0:1 (AAA) | 大会カテゴリ ([シングルス]/[ダブルス]/[ミックス])、[優勝] |
| practice | `#e6f4ea` | `#0a5b35` | 4.9:1 (AA) | 練習カテゴリ ([スクール]/[自主練] 等) |
| trial | `#f3e8fd` | `#6a25a8` | 7.8:1 (AAA) | 試打リンクバッジ ([試打]) |
| bronze | `#ffffff` | `#6a25a8` | 7.8:1 (AAA) | [3位] (試打と分離した結果バッジ専用) |
| info | `#ffffff` | `#0d47a1` | 9.7:1 (AAA) | [準優勝]、情報通知 |
| success | `#e6f4ea` | `#0a5b35` | 4.9:1 (AA) | [予選突破]、勝利 |
| warning | `#fef7e0` | `#7e5d00` | 5.6:1 (AA+) | [ベスト8]/[ベスト16]、注意（Yellow独立） |
| error | `#fce8e6` | `#a31511` | 7.2:1 (AAA) | [敗退]/[予選敗退]、削除 |
| default | `#f1f3f4` | `#5f6368` | 5.3:1 (AA+) | 未設定、棄権 |
| ボーダー | — | 白背景バッジは opacity 70%、その他は opacity 35% | — | — |

**S7 改訂 (2026-04-23)**: 結果系バッジ ([優勝]/[準優勝]/[3位]) のカード強調背景 (gold/silver/bronze tinted) との色衝突を解消するため、tournament / info / 新設 bronze の背景を白に変更。文字色は元の semantic 色を維持し、ボーダー opacity を 70% に上げて白背景でも形を出す。trial variant は [試打] バッジ専用に分離（[3位] は新設 bronze へ）。

例: `🏆 優勝` (tournament 白bg), `🥈 準優勝` (info 白bg), `🥉 3位` (bronze 白bg), `🎾 試打` (trial パステル紫), `✅ 予選突破` (success), `⚠️ ベスト8` (warning)

### 4.2 Card（カード）

| 属性 | 値 |
|---|---|
| 背景 | `panel` (#fff) |
| border | 1px solid `border` (#dadce0) |
| border-radius | 12px |
| padding | `lg` (16px) |
| margin-bottom | `sm` (8px) |
| シャドウ | **なし**（border で区別、Google 流） |

### 4.3 Button

| 高さ | 44px 以上 (tap target) |
|---|---|
| padding | `10px 20px` |
| border-radius | 8px |
| font-size | 14px |
| font-weight | 500 |

**variants**:

| variant | 背景 | 文字色 | ボーダー | 使う場面 |
|---|---|---|---|---|
| Primary | `#1a73e8` | `#fff` | なし | 主アクション |
| Secondary | `#fff` | `#1a73e8` | 1px `#1a73e8` | 副アクション |
| Ghost | transparent | `#1a73e8` | なし | 3段目のアクション |
| Danger | `#d93025` | `#fff` | なし | 削除・破壊的操作 |
| Disabled | `#f1f3f4` | `#80868b` | なし | 操作不可状態 |

**状態**:
- Hover (PC): opacity 0.9
- Active (押下): scale(0.98) + brightness(0.95) 150ms
- Focused: outline 2px `#1a73e8`, offset 2px
- Disabled: cursor not-allowed、操作ブロック

### 4.4 Input / Select（入力欄）

| 属性 | 値 |
|---|---|
| 高さ | 44px |
| padding | `10px 14px` |
| border | 1px solid `#dadce0` |
| border-radius | 8px |
| font-size | 14px |
| placeholder 色 | `#80868b` |
| focus 状態 | border `#1a73e8`, outline 2px `#e8f0fe` |
| error 状態 | border `#d93025`, アイコン error + エラーメッセージ |

### 4.5 Modal（モーダル）

| 属性 | 値 |
|---|---|
| オーバーレイ | `rgba(0,0,0,0.4)` |
| 本体背景 | `#fff` |
| border-radius | 16px |
| padding | `xl` (20px) |
| max-width | 400px (モバイル優先) |
| 配置 | 中央 |
| **閉じるボタン位置** | **左上固定**（戻ると統一） |
| タップ領域 | 44px 以上 |
| アニメーション | enter: scale+fade 250ms ease-out / exit: 150ms |

### 4.6 Toast (Snackbar)

| 属性 | 値 |
|---|---|
| 背景 | `#202124` (dark) |
| 文字色 | `#fff` |
| border-radius | 6px |
| padding | `12px 16px` |
| 配置 | 画面下、タブバーの上 16px |
| 自動消失 | 3 秒 |
| アクション | undo 等、1 つまで |

### 4.7 ConfirmDialog（破壊的操作確認）

Modal の形式。以下を追加:

- 冒頭にアイコン (`delete` または `warning`)
- 主ボタン: Danger variant
- キャンセルボタン: Secondary variant
- キャンセルを**左**、確定を**右**に配置（間違えて押しにくく）

### 4.8 TabBar（最下部ナビ）

| 属性 | 値 |
|---|---|
| 高さ | 56px + iOS safe-area-bottom |
| 背景 | `#fff` |
| border-top | 1px solid `#dadce0` |
| タブ数 | 5（Home / Sessions / Gear / Plan / Insights） |
| アクティブ | `#1a73e8` 文字色 + `#e8f0fe` 背景帯 |
| 非アクティブ | `#80868b` |
| アイコン | Material Symbols Outlined 24px |
| ラベル | tiny (11px) |

### 4.9 画面上部（固定ヘッダ）

- 左: 戻るボタン (`arrow_back`) または空白（ホーム時）
- 中央: 画面タイトル
- 右: メニュー/設定 (`more_vert`)
- 全画面で**同じ位置**を厳守

---

## 5. アイコン (Lucide)

### 5.1 採用理由

Material Symbols Outlined / Rounded, Phosphor, Tabler, Bootstrap Icons, Remix Icon, Lucide の 7 候補を比較検討した結果、**Lucide** を採用。
- Feather Icons の後継でミニマルな線画デザイン
- 1,500+ 種類、SVG ベース、動的カラー・サイズ変更が容易
- Google/Apple 系アプリと異なる、独立した中立的な印象
- v4 の「シンプル・モダン」方針と整合

### 5.2 読み込み

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

### 5.3 使い方（React コンポーネント）

共通 `Icon` コンポーネント経由で利用:

```jsx
<Icon name="trophy" size={24} color="#1a73e8" ariaLabel="大会" />
```

内部実装: `window.lucide.icons[PascalCase(name)].toSvg(options)` で SVG を取得、`dangerouslySetInnerHTML` で埋め込む。

### 5.4 主要アイコンマッピング（v4 で使う 30 アイコン）

| 用途 | Lucide 名 |
|---|---|
| 大会 (優勝) | `trophy` |
| 準優勝 | `medal` |
| 3位 | `award` |
| 練習 | `person-standing` |
| 試打 | `badge-check` |
| ホームタブ | `house` |
| 記録タブ (Sessions) | `list` |
| 機材タブ (Gear) | `backpack` |
| 計画タブ (Plan) | `notebook-pen` |
| 分析タブ (Insights) | `bar-chart-3` |
| 戻る | `arrow-left` |
| 閉じる | `x` |
| メニュー | `more-vertical` |
| 追加 | `plus` |
| 編集 | `pencil` |
| 削除 | `trash-2` |
| 保存 | `save` |
| 検索 | `search` |
| 設定 | `settings` |
| ログイン | `log-in` |
| ログアウト | `log-out` |
| 同期 | `refresh-cw` |
| Apple Watch | `watch` |
| カレンダー | `calendar` |
| 警告 | `triangle-alert` |
| エラー | `circle-alert` |
| 情報 | `info` |
| 成功/完了 | `circle-check` |
| 時計 | `clock` |
| 場所 | `map-pin` |
| 天気 | `sun` |
| フラグ (次の行動等) | `flag` |

### 5.5 アイコン使用ルール

- **アイコンのみのボタンには aria-label 必須**（スクリーンリーダー対応）
- サイズは 14 / 18 / 20 / 24px の 4 段階に制限（バッジ内 13-14px、本文 18-24px）
- stroke-width: 2 を標準（Lucide デフォルト）。細身にしたい時のみ 1.5
- 色はパレット内のみ（独自色禁止）
- 絵文字（🏆 等）は既存データ表示では許可、UI チャームとしては Lucide に統一

---

## 6. モーション

### 6.1 基本原則

- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- Enter（出現）: 200-300ms
- Exit（消失）: 150-200ms
- 色変化: 150ms ease-out
- タップフィードバック: 150ms scale(0.98)

### 6.2 アニメーション種類

| 用途 | 動き | 時間 |
|---|---|---|
| Modal enter | scale(0.95)→1.0 + fade | 250ms ease-out |
| Modal exit | fade | 150ms |
| Toast enter | slide-up + fade | 200ms |
| Toast exit | fade | 150ms |
| カード展開 | height auto + fade | 250ms |
| タップ | scale(0.98) | 150ms |
| 色変化（hover/active） | color/background transition | 150ms ease-out |

### 6.3 prefers-reduced-motion 対応（必須）

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

ユーザー側 OS 設定で動きを減らす指定がある場合、全アニメーションを無効化。

---

## 7. ユニバーサルデザイン

### 7.1 色以外の情報表現（絶対ルール）

- カテゴリ分け: **色 + アイコン + 文字ラベル**の 3 重表現
- 状態: **色 + アイコン**（例: エラーは赤+`error` アイコン+文字）
- 勝敗: 色だけでなく `勝利`/`敗北` の文字必須

### 7.2 文字サイズ可変対応

- font-size は px ではなく **rem** ベース（`html { font-size: 16px }`）
- ユーザー拡大（ブラウザ 200% 等）で崩れないレイアウト（flex / grid）
- min-height は **44px 固定**（タップ領域確保）

### 7.3 キーボード操作

| キー | 動作 |
|---|---|
| Tab | フォーカス移動（ページ上→下、左→右） |
| Shift+Tab | フォーカス逆方向 |
| Enter | 主アクション確定 |
| Esc | モーダル閉じる・キャンセル |
| Space | チェックボックス切替 |
| 矢印キー | タブ移動（tabbar内） |

focus リング: `outline: 2px solid #1a73e8; outline-offset: 2px;` を全 focusable 要素に。

### 7.4 スクリーンリーダー (aria)

| 要素 | aria 属性 |
|---|---|
| アイコンのみボタン | `aria-label="削除"` 等 |
| 入力必須 | `aria-required="true"` |
| 入力エラー | `aria-invalid="true"` + `aria-describedby` |
| モーダル | `role="dialog"` + `aria-labelledby` + `aria-modal="true"` |
| タブバー | `role="tablist"` + 各タブ `role="tab"` + `aria-selected` |
| トースト | `role="alert"`（重要）or `role="status"`（情報） |
| カード（クリック可能） | `role="button"` + `tabindex="0"` |

### 7.5 タップ領域

- **最小 44×44px**（iOS Human Interface Guidelines 準拠）
- ボタン: padding で確保（`min-height: 44px` + `padding: 10px 20px`）
- アイコンのみボタン: `padding: 10px`（20px アイコン + 余白）で 40px、あと 4px を margin で確保
- チェックボックス: 見た目は 20px だが、`padding: 12px` で当たり判定を 44px に

### 7.6 コントラスト

- 全色ペアは WCAG AA 以上（4.5:1）
- 主要テキスト（body 以上）は AAA（7:1）
- 小さい文字（12px 以下）は**必ず AAA**（textMuted を使わない）
- アイコンと背景の境界も 3:1 以上

---

## 8. 実装時チェックリスト（コンポーネント作成ごと）

- [ ] 色は §1 パレットのみ使用
- [ ] コントラスト WCAG AA 以上（主要 AAA）
- [ ] タップ領域 44×44px 以上
- [ ] キーボードで全操作可能
- [ ] aria 属性設定済
- [ ] prefers-reduced-motion 対応
- [ ] 文字サイズ 200% で崩れない
- [ ] 色弱対応（色+アイコン/ラベル）
- [ ] Material Symbols Outlined で統一

---

## 8.5 Sessions タブ専用コンポーネント (2026-04-21 追加)

Sessions タブ再設計に伴い追加される新コンポーネント群。§4 の基本コンポーネントと整合するよう同一トークン (色・余白・半径) を使う。

### 8.5.1 SearchBar (検索入力)

| 属性 | 値 |
|---|---|
| 高さ | 40px |
| padding | `8px 12px` |
| border | 1px solid `border` (#dadce0) |
| border-radius | 20px (完全な丸端) |
| font-size | 14px |
| 左端 | `search` アイコン (18px, textSecondary) |
| 右端 | 入力中のみ `x` アイコン (クリア) |
| focus | border `primary`, shadow `0 0 0 2px #e8f0fe` |
| placeholder | 「タイトル・相手・メモを検索」 |

### 8.5.2 FilterChip (絞り込みチップ)

複数同時掛け可、横スクロールで並べる。選択状態で primary 色に変化。

| 属性 | 値 |
|---|---|
| 高さ | 32px |
| padding | `6px 12px` (アイコン付 左側 6px) |
| border-radius | 16px (pill) |
| font-size | 13px |
| font-weight | 未選択 500 / 選択 600 |
| gap (アイコン-文字) | 4px |

| 状態 | 背景 | 文字 | border |
|---|---|---|---|
| 非選択 (チップ既定) | `panel` (#fff) | `textSecondary` | 1px `border` |
| 選択中 (単体、例: 「種類」だけ) | `primaryLight` | `primary` | 1px `primary` |
| 選択中 (値が決まっている、例:「ラケット: Ezone98」) | `primaryLight` | `primary` | 1px `primary` |
| タップ | 上記 + `scale(0.98)` 150ms |

タップで **ドロワー** (画面下から出るシート) が開き、候補を選択する。単一値でも複数値でも対応。

### 8.5.3 ViewModeToggle (表示切替)

リスト / カレンダー / 年間濃淡 の 3 択。

- 形態: ドロップダウン (Select ではなく、アイコン付)
- 高さ 40px、右端にアイコン + 現在モード名
- タップでポップオーバーメニューが開く
- メニュー項目: アイコン + ラベル + (現在選択中のチェックマーク)

| アイコン | ラベル | Lucide 名 |
|---|---|---|
| リスト | `list` |
| カレンダー | `calendar-days` |
| 年間濃淡 | `grid-3x3` |

### 8.5.4 SummaryHeader (サマリー行)

Sessions タブ上部の状況ダイジェスト行。

| 属性 | 値 |
|---|---|
| padding | `8px 16px` |
| background | `primaryLight` (#e8f0fe) |
| 文字色 | `primary` (#1a73e8) |
| font-size | 13px |
| font-weight | 500 |
| 形態 | 1 行テキスト (必要に応じ 2 行) |

例:
- 通常: 「今月: 18件（練習15 / 大会2 / 試打1）・直近10試合 7勝3敗」
- 絞り込み中: 「絞り込み結果: 12件 / 950件」

### 8.5.5 SessionCard (改訂版、§4.2 Card をベースに拡張)

§4.2 Card に以下を追加:

| 属性 | 値 |
|---|---|
| 左端色帯 | 3px 幅、種類色 (tournament / practice) |
| padding | `14px 16px 14px 20px` (左帯分だけ padding-left を厚めに) |
| margin-bottom | 6px |

**Sessions 一覧に出すカードは大会と練習のみ**。試打は独立カードにせず、trialBadge として付随表示（後述）。

**結果の階層表現** (大会カードのみ。S5 仕様、S7 で結果バッジを白背景化して輪郭衝突を解消):

| 結果 | 表現 |
|---|---|
| 優勝 | カード背景 `tournamentLight`、枠 1.5px `tournamentAccent`、shadow `0 0 0 3px rgba(249,171,0,0.15)` + [優勝] バッジ (tournament=白bg) |
| 準優勝 | カード背景 `primaryLight`、枠 1.5px `primary` + [準優勝] バッジ (info=白bg) |
| 3位 | カード背景 `trialLight`、枠 1.5px `trialAccent` + [3位] バッジ (bronze=白bg、§4.1 新設) |
| ベスト8/16、予選突破 | 通常カード + Badge (warning / success) |
| 敗退・予選敗退 | 通常カード + Badge (error) |
| 練習 (既定) | 通常カード + 種別バッジ (スクール/自主練/練習会/ゲーム練習/球出し/練習試合/フィジカル、practice variant) |

**カード 1 行目 (メタ行、S7 で順序確定)**:
- 日付 (13px, `textSecondary`, font-weight 600, minWidth 42px で揃える): 「4/18」
- [sideBadge] カテゴリーバッジ (大会=形式 [シングルス]/[ダブルス]/[ミックス]、練習=種別、minWidth 96px)
- [resultBadge] 結果バッジ (優勝/ベスト8 等、該当時のみ、minWidth 80px)
- [trialBadge] 試打リンク表示 (該当時、後述、minWidth 60px)

minWidth は v3 の typeLabel2 minWidth=32 / result minWidth=60 / pracTypeColor minWidth=96 から移植・調整。並んだカードでバッジ右端を揃えてリズムを作る。バッジは `justify-content: center` で中央寄せ。

**カード 2 行目 (タイトル)**:
- 15px, `text`, font-weight 600 (優勝/準優勝/3位は 700): 「所沢ベテラン大会」

**カード 3 行目 (メタ行)**:
- 12px, `textSecondary`: 例「3勝0敗 / 8:30 / 所沢市総合運動場」(大会)、「19:00-20:30 / 90分 / 心拍145」(練習)
- 大会: 形式は §4.1 の sideBadge 化に伴い meta から外し、勝敗 / 開始時刻 / 会場 を出す
- 練習: 開始-終了時刻 / 時間 / 心拍 / (会場) を出す

### 8.5.5.1 試打リンクバッジ (trialBadge)

試打 (trial) は大会内の試合や練習中に行う付随活動と定義し、独立したカードにしない。その代わり、**紐付き先の大会/練習カードに `trial variant` の小さなバッジを追加** して「この記録には試打が含まれる」ことを示す。

| 属性 | 値 |
|---|---|
| ラベル | 「試打」固定 |
| variant | `trial` (紫系) |
| icon | `badge-check` |
| 位置 | カード 1 行目の末尾 (resultBadge/sideBadge の右) |

**紐付き判定**:
- 大会: `trial.linkedMatchId` が大会の `matches[].id` のいずれかと一致
- 練習: `trial.linkedPracticeId` が練習の `id` と一致

孤立試打 (link 無し) は S6 時点では非表示。S16 (機材タブ) / S20 (自動連関) で扱いを確定。

### 8.5.6 TimeGroupHeader (時間軸の区切り見出し)

リストの週/月/年の区切り。

| 属性 | 値 |
|---|---|
| 週 (直近 4 週) | font-size 12px, font-weight 700, `textSecondary`, 例: 「今週 (4/15-4/21)」 |
| 月 (4 週〜1 年) | font-size 13px, font-weight 700, `textSecondary`, 例: 「2026年3月 (16件)」 |
| 年 (1 年以上) | font-size 14px, font-weight 700, `text`, 例: 「2025年 (245件)」+ 折り畳み矢印 |
| sticky | 位置: scroll 親の top 0、背景 `bg`、上下 padding 4px |

### 8.5.7 CalendarGrid (カレンダーマス)

月のマス目。7 列 × 最大 6 行。

| 属性 | 値 |
|---|---|
| 1 マスのサイズ | `1fr` (可変) × 44px 以上 (タップ領域) |
| 1 マスの padding | 4px |
| 背景 | `panel` |
| 空マス (月外) | `panel2`、日付文字は `textMuted` |
| 今日マス | 枠 2px `primary` |
| 活動マーカー | マス下部に色ドット、練習=緑・大会=オレンジ・試打=紫 |
| 活動量濃淡 (練習) | 時間 30分未満=Light、30-60分=中、60分超=Accent (3段階) |
| 大会日 | マス全体が `tournamentLight` で塗られる |
| タップ | マス全体を `scale(0.95)` 150ms + 日一覧モーダル |

### 8.5.8 YearHeatmap (年間濃淡マス)

1 年 365 マス。縦 12 行 (月) × 横最大 31 列 (日)。

| 属性 | 値 |
|---|---|
| 1 マスのサイズ | 10px × 10px |
| 1 マスの間隔 | 2px |
| 空マス (その月に無い日) | 透明 |
| 活動無し | `panel2` |
| 活動 1 種類 (練習のみ) | `practiceLight` → `practiceAccent` の 3 段階 |
| 活動 2 種類以上 | 主活動の色で表示、強度は最大で |
| 大会日 | `tournamentAccent`、枠 1px で強調 |
| 今日 | 枠 1.5px `primary` |
| タップ | 日のセッション一覧モーダル |

横軸にヘッダ: `1, 5, 10, 15, 20, 25, 30` (日)。左軸にヘッダ: `1月、2月、...12月`。

### 8.5.9 FAB (Floating Action Button)

画面右下に常に浮かぶ主アクション。

| 属性 | 値 |
|---|---|
| サイズ | 56px × 56px (正円) |
| 位置 | `position: fixed`, `bottom: 72px` (TabBar 56 + 16), `right: 16px` |
| 背景 | `primary` (#1a73e8) |
| 文字・アイコン色 | `#ffffff` |
| アイコン | `plus` 28px |
| shadow | `0 2px 6px rgba(0,0,0,0.15), 0 4px 12px rgba(26,115,232,0.3)` |
| hover | 背景 `primaryHover`、shadow 強調 |
| active | `scale(0.95)` 150ms |
| z-index | 100 (TabBar より上、モーダルより下) |

タップ → QuickAdd ミニメニュー (ポップオーバー):
- 「🏆 大会」「🏃 練習」「🎾 試打」の 3 択
- 各 56px 高さの行、タップで対応する Detail 画面 (新規) を開く

### 8.5.10 SessionDetailView (slide-in 詳細画面)

カードタップで横スライドで出る。アコーディオン展開の代替。

| 属性 | 値 |
|---|---|
| 位置 | 全画面 (TabBar 含めて覆う、戻るボタンで戻す) |
| enter アニメ | `transform: translateX(100% → 0%)` 250ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| exit アニメ | `transform: translateX(0% → 100%)` 200ms |
| ヘッダ | §4.9 Header、左=戻る、中央=タイトル、右=編集ボタン |
| スクロール位置 | 戻る時にリスト側のスクロール位置を復元（ref + scrollTop 保存） |

---

## 9. 更新ルール

- 新しいコンポーネントが必要なら、まずこのファイルに仕様を追記してから実装
- 独自スタイル one-off 禁止。例外を作りたい時は、このファイルに追加してから使う
- デザイン変更はこのファイルを真の source of truth とし、コード側を合わせる
- ユーザー（元デザイナー）の判断が最終決定
