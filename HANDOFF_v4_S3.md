# HANDOFF v4 — Stage S3（ワイヤフレーム / 視覚プロトタイプ）開始用

作成: 2026-04-19 / 前セッション(S2)末尾で作成

> **次セッション最初にやること**: このファイル + CLAUDE.md + DESIGN_SYSTEM_v4.md + ROADMAP_v4.md を読む。
> **CLAUDE.md §1 着手前チェックリスト**を応答に書き出してから着手。
> **ストップサイン（CLAUDE.md §2）を常に意識**。

---

## 0. 前セッション(S2)の結果

### 完了事項
- `DESIGN_SYSTEM_v4.md` 作成（約 350 行）
- 以下を明文化:
  - 色パレット（青ベース #1a73e8 / Sessions 色分け v3から再配置）
  - タイポグラフィ（システムフォント継承、6段階サイズ）
  - 余白（4px グリッド）
  - コンポーネント仕様（Badge/Card/Button/Input/Modal/Toast/ConfirmDialog/TabBar）
  - アイコン: Material Symbols Outlined 採用
  - モーション（Google Material 準拠、prefers-reduced-motion 対応）
  - ユニバーサルデザイン（aria、キーボード、色+アイコン併用）

### ユーザーからの重要フィードバック
> 「文字だけだと完全に把握出来てない」

→ S3 以降は **視覚的に確認できる形** を重視する。文字ベースの設計書のみでは、元デザイナーの視点でも把握しきれない部分がある。

---

## 1. S3 の目的

**DESIGN_SYSTEM_v4.md を視覚化する。** 各画面の配置と主要コンポーネントを、preview で実際に見られるプロトタイプで提示する。

### S3 で作るもの

1. **`WIREFRAMES_v4.md`** — 画面一覧、レイアウト案、画面遷移図（文書）
2. **`v4/wireframes.html`** — 視覚プロトタイプ（preview で開いて目視確認可能）
   - React/Babel は使わず、**純 HTML + CSS** で作る（ビルド不要、誰でも見られる）
   - DESIGN_SYSTEM_v4.md の色・余白・フォント・コンポーネント仕様を直接適用
   - Material Symbols を CDN で読み込み
   - ダミーデータで埋める
   - **機能は未実装**（クリックしても動かない、見た目のみ）

### S3 で扱う画面（優先順）

1. **画面ヘッダ + TabBar**（全画面共通）
2. **Home タブ**（3ボタン + Next Actions + MiniCalendar）
3. **Sessions 一覧**（月グループ、カード3種類: 大会/練習/試打）
4. **Session 展開**（カードタップ時の詳細概要）
5. **Session Detail**（全画面編集フォーム）
6. **Modal**（ConfirmDialog / 入力モーダル）
7. **Toast**（操作フィードバック）

### S3 で扱わない画面（S4 以降）

- Gear / Plan / Insights タブ（後回し、まず Sessions 系を固める）
- インポートプレビュー、マージモーダル（機能実装と併せて S11/S15 で）

---

## 2. S3 の完了条件（DoD）

1. `WIREFRAMES_v4.md` と `v4/wireframes.html` が存在
2. preview で `v4/wireframes.html` を開くと、上記1〜7の画面が縦スクロールで順番に見える
3. 各画面が DESIGN_SYSTEM_v4.md の仕様に完全準拠
4. **ユーザー（元デザイナー）が視覚確認して「S3 OK」と返答**
5. 違和感・修正点があればその場で反映、再確認
6. 1 commit で push 承認

### 非 DoD（この Stage ではやらないこと）
- 機能実装（クリックしても動かない）
- React コンポーネント化（S4 で行う）
- 実データ接続（Firestore は触らない）

---

## 3. S3 実装手順

### 3.1 着手前チェックリスト（応答に明示必須）

```
□ CLAUDE.md §0-§4 を読んだ
  → 要点: 対処療法禁止、判断投げ禁止、UI/UX先行、専門用語禁止（ユーザー応答時）

□ DESIGN_SYSTEM_v4.md を読んだ
  → 要点: 色パレット・コンポーネント仕様の具体値

□ ROADMAP_v4.md S3 DoD を確認
  → 要点: ワイヤフレーム+HTMLプロトタイプ、ユーザー視覚確認

□ 実行環境制約
  → preview (file://) で HTML を開く想定、相対パスの CSS/アイコンは CDN 経由なら OK
  → Material Symbols: CDN URL は https なので preview で読み込み可能

□ DoD 検証可能性
  → ユーザーが preview で目視確認 → ○ 検証可

□ ユーザー承認
  → 前セッションから継続、S3 着手時に改めて確認
```

### 3.2 WIREFRAMES_v4.md の骨格

画面一覧と遷移を Markdown で明文化:

- 画面タイトル
- レイアウト概要（ASCII アートまたは説明）
- 画面内の要素（ヘッダ/本文/フッタ/モーダル）
- 遷移先（タップで何が起きるか）
- 画面遷移図（全画面の関係を1枚で表現）

### 3.3 v4/wireframes.html の構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Tennis DB v4 Wireframes</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
<style>
/* DESIGN_SYSTEM_v4.md §1-§4 から転記 */
:root {
  --primary: #1a73e8;
  --primary-light: #e8f0fe;
  /* ... */
}
body { background: var(--bg); font-family: -apple-system, ...; }
/* コンポーネントごとのクラス定義 */
.btn-primary { ... }
.card { ... }
/* ... */
</style>
</head>
<body>
<h1>Wireframe 1: ヘッダ + TabBar</h1>
<div class="screen">...</div>

<h1>Wireframe 2: Home タブ</h1>
<div class="screen">...</div>

<!-- 以下 7 画面分 -->
</body>
</html>
```

各画面を**実寸モバイル幅**（375px など）でフレームに入れて並べる。ユーザーが preview でスクロールして全画面を一気に確認できる形。

### 3.4 各画面の作り方

- ダミーデータは v3 データを参考にリアルに（架空の大会名・日付等）
- Material Symbols アイコンを実際に読み込んで表示
- 色は CSS 変数で統一、DESIGN_SYSTEM 変更時に1箇所直せば全反映
- タップ領域は実寸で確認できるように（44px 以上）

### 3.5 ユーザー確認フロー

1. 私が wireframes.html を書く
2. preview で開くよう案内
3. ユーザーが視覚確認、違和感を具体的に指摘
4. 指摘に応じて修正、再確認
5. OK まで繰り返す（1-3 サイクル想定）
6. OK 出たら WIREFRAMES_v4.md を最終版として整え、1 commit で push

### 3.6 ユーザーへの伝え方（重要）

専門用語を使わない。

- NG: 「Primary ボタンの corner-radius を 8px に」
- OK: 「主要ボタンの角の丸み」

見せ方:
- 画面を順番に説明
- 「これは○○画面、ここをタップすると△△」
- 違和感の指摘を受けやすい問いかけ（「色はどうですか」「ボタンの位置は」）

---

## 4. 完了時にやること

1. ユーザー視覚確認 OK → 「S3 OK」
2. 1 commit（例: `v4 S3: ワイヤフレーム + 視覚プロトタイプ`）
3. push 承認 → push
4. `HANDOFF_v4_S4.md` 作成（S4 = 共通UIコンポーネント実装、wireframes を React 化）
5. `HANDOFF_v4_S3.md` 削除

---

## 5. S3 で守ること（CLAUDE.md 厳守プロトコル）

- **実装先行しない**: wireframes.html は「見た目のみ」、機能実装に誘惑されても手を出さない
- **独自スタイル禁止**: DESIGN_SYSTEM_v4.md にない色・余白・形を使いたくなったら止まる
- **判断投げ禁止**: 「どう見せますか?」ではなく「こう見せます、違えば指示ください」
- **専門用語でユーザーに説明しない**: 「padding」「border-radius」を使わず、「余白」「角の丸み」

---

## 6. 自戒

今セッション（2026-04-19）の学び:
- 文字ベース設計書だけではユーザーが把握しきれない → S3 で視覚化必須
- preview で見られる形を重視（file:// で動く純HTMLにする）
- 元デザイナーのユーザーは**具体的な色・配置・動き**を見て判断できるので、言葉より物を見せる

---

## 7. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル（最優先）
- **DESIGN_SYSTEM_v4.md** — S3 の設計ソース、完全準拠必須
- **REQUIREMENTS_v4.md** — 非機能要件（UI/UX・ユニバーサルデザイン）
- **ARCHITECTURE_v4.md** — §12 UI/UX 先行ルール
- **ROADMAP_v4.md** — S3 の DoD 確認
- **memory/feedback_ui_design_first.md** — ユーザーのデザイン指針
- **HANDOFF_v4_S3.md** — 本書
- **v3/index.html** — 参照用（v3 の画面構成を参考にするが、コードは流用しない）
