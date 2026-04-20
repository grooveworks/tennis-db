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

| 用途 | HEX | Light | 使う場所 |
|---|---|---|---|
| Success | `#0f9d58` | `#e6f4ea` | 完了トースト、勝利バッジ |
| Warning | `#f9ab00` | `#feefc3` | 注意通知、未入力警告 |
| Error / Danger | `#d93025` | `#fce8e6` | エラー、削除ボタン |
| Info | `#1a73e8` | `#e8f0fe` | 情報通知（Primary と統合） |

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

| variant | 背景 | 文字色 | コントラスト |
|---|---|---|---|
| tournament / warning | `#feefc3` | `#a04f00` | 5.5:1 (AA+) |
| practice / success | `#e6f4ea` | `#0a5b35` | 4.9:1 (AA) |
| trial | `#f3e8fd` | `#6a25a8` | 7.8:1 (AAA) |
| error | `#fce8e6` | `#a31511` | 7.2:1 (AAA) |
| ボーダー | — | 文字色と同系 opacity 35% | — |

例: `🏆 優勝` (tournament), `✅ 勝利` (success), `⚠️ 注意` (warning)

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

## 5. アイコン (Material Symbols Outlined)

### 5.1 読み込み

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
```

### 5.2 使い方

```html
<span class="material-symbols-outlined">sports_tennis</span>
```

```css
.material-symbols-outlined {
  font-size: 24px;  /* 必要に応じて変更 */
  color: #1a73e8;   /* カラー化 */
  vertical-align: middle;
}
```

### 5.3 主要アイコンマッピング

| 用途 | Symbol 名 |
|---|---|
| 大会 | `emoji_events` |
| 練習 | `directions_run` |
| 試打 | `sports_tennis` |
| ホーム | `home` |
| Sessions | `list_alt` |
| Gear | `sports_tennis` (タブでは別アイコン検討) |
| Plan | `edit_note` |
| Insights | `analytics` |
| 戻る | `arrow_back` |
| 閉じる | `close` |
| メニュー | `more_vert` |
| 追加 | `add` |
| 編集 | `edit` |
| 削除 | `delete` |
| 保存 | `save` |
| 検索 | `search` |
| 設定 | `settings` |
| ログイン | `login` |
| ログアウト | `logout` |
| 同期 | `sync` |
| Apple Watch | `watch` |
| カレンダー | `calendar_month` |
| 警告 | `warning` |
| エラー | `error` |
| 情報 | `info` |
| 成功 | `check_circle` |
| 時計 | `schedule` |
| 場所 | `place` |
| 天気 | `wb_sunny` |

### 5.4 アイコン使用ルール

- **アイコンのみのボタンには aria-label 必須**（スクリーンリーダー対応）
- サイズは 18 / 20 / 24px の 3 段階に制限
- 色はパレット内のみ（独自色禁止）
- 絵文字（🏆 等）は既存データ表示では許可、UI チャームとしては Material Symbols に統一

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

## 9. 更新ルール

- 新しいコンポーネントが必要なら、まずこのファイルに仕様を追記してから実装
- 独自スタイル one-off 禁止。例外を作りたい時は、このファイルに追加してから使う
- デザイン変更はこのファイルを真の source of truth とし、コード側を合わせる
- ユーザー（元デザイナー）の判断が最終決定
