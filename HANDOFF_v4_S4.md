# HANDOFF v4 — Stage S4（共通UIコンポーネント実装）開始用

作成: 2026-04-19 / 前セッション(S3)末尾で作成

> **次セッション最初にやること**: このファイル + CLAUDE.md + DESIGN_SYSTEM_v4.md + WIREFRAMES_v4.md + v4/wireframes.html を確認してから着手。
> **着手前チェックリスト**（CLAUDE.md §1）を応答に書き出してから実装開始。

---

## 0. 前セッション(S3)の結果

### 完了事項
- `WIREFRAMES_v4.md` 作成 — 画面一覧・レイアウト案・画面遷移図
- `v4/wireframes.html` 作成 — 視覚プロトタイプ（純HTML+CSS、Material Symbols、iPhoneフレーム枠）
- preview で目視確認 → ユーザー指摘反映 3 点:
  1. **ホーム 3 ボタンを横並び化**（ユーザー編集）
  2. **日付と曜日の配置バランス改善**（align-items:center 追加、サイズ/行間調整）
  3. **バッジのコントラスト大幅改善**（原色→暗色系、全て AA 以上に）
- DESIGN_SYSTEM_v4.md §4.1 Badge セクション更新（コントラスト計算反映）
- ユーザー承認 「大分良くなった、先に進める」

### 確定したビジュアル（S4 実装時の参照ソース）
- 色: Primary `#1a73e8` / Sessions 色分け (Orange/Green/Purple) / 3段階テキスト
- バッジ暗色系: tournament `#a04f00` / practice `#0a5b35` / trial `#6a25a8` / error `#a31511`
- タイポ: システムフォント、サイズ階層 24/20/16/14/12/11
- 余白: 4px グリッド (xs〜3xl)
- アイコン: Material Symbols Outlined (CDN)
- 画面構造: ヘッダ(56px)+コンテンツ+TabBar(56px)、左上戻る、右上メニュー、下部5タブ

---

## 1. S4 の目的

**wireframes.html の見た目を React コンポーネントとして実装**する。

- `src/ui/common/` に再利用可能な汎用コンポーネントを作る
- DESIGN_SYSTEM_v4.md の具体値を**完全準拠**
- アプリ固有の組合せ（SessionCard、Home のサマリー等）は S5 以降、ここでは作らない
- 各コンポーネントは純関数的（state は最小限、基本は props 受け取り）

---

## 2. S4 で実装するコンポーネント

`src/ui/common/` 配下（ファイル名順に連結される）:

| ファイル | 役割 | DESIGN_SYSTEM 参照 |
|---|---|---|
| `Badge.jsx` | カテゴリ・状態バッジ | §4.1 |
| `Card.jsx` | 基本カード | §4.2 |
| `Button.jsx` | ボタン 5 variants (Primary/Secondary/Ghost/Danger/Disabled) | §4.3 |
| `Input.jsx` | テキスト入力欄 | §4.4 |
| `Select.jsx` | セレクトボックス | §4.4 |
| `Textarea.jsx` | 複数行入力 | §4.4 |
| `Modal.jsx` | モーダル基本枠（閉じるボタン左上固定） | §4.5 |
| `Toast.jsx` | 画面下トースト | §4.6 |
| `ConfirmDialog.jsx` | 破壊的操作確認ダイアログ | §4.7 |
| `TabBar.jsx` | 最下部5タブ | §4.8 |
| `Header.jsx` | 画面上部ヘッダ (戻る/タイトル/メニュー) | §4.9 |
| `SectionTitle.jsx` | セクション見出し (アイコン + 文字) | wireframes の `.section-title` |
| `Icon.jsx` | Material Symbols ラッパー (aria-label 対応) | §5 |

### 非対象（S5 以降）
- SessionCard (3 variants) — Sessions タブ実装時 (S6)
- HomeButtons / MonthSummary / MiniCalendar — Home 実装時 (S10)
- ImportPreviewModal / MergeModal — 各機能実装時

---

## 3. S4 の完了条件（DoD）

1. 上記 13 ファイルが `src/ui/common/` に存在
2. 各コンポーネントが props で制御可能、state は最小限
3. `src/app.jsx` を拡張して「コンポーネントショーケース」画面を表示
   - 各コンポーネントを一覧で並べる
   - wireframes.html の見た目と同じ表示が React で再現される
4. `build.ps1` で v4/index.html が正常生成
5. preview で v4/index.html を開き、ショーケースが表示される
6. ユーザー目視確認で「S4 OK」
7. 1 commit で push

---

## 4. S4 実装手順

### 4.1 着手前チェックリスト（応答に明示必須、中身を埋める）

```
□ CLAUDE.md §0-§4 確認
  → 要点(3行): [書き出す内容]

□ DESIGN_SYSTEM_v4.md §1-§5 確認
  → 要点(3行): 色/タイポ/余白/コンポーネント/アイコン の具体値

□ WIREFRAMES_v4.md / v4/wireframes.html 確認
  → 要点: 視覚プロトタイプの実装を React 化する

□ 実行環境制約
  → preview (file://): React動作 OK, Material Symbols CDN OK
  → Firebase 不使用 (S4 は UI のみ)

□ DoD 検証可能性
  → ○ preview でショーケース目視確認可能

□ ユーザー承認
  → S4 着手時に改めて確認
```

### 4.2 コンポーネント実装のルール

- **コンポーネントの定義は必ずトップレベル**（親関数の内部に定義しない、v3.3.25 の再マウント事故防止）
- props を分解して受け取り、デフォルト値を明記
- CSS は style 属性（v3 の流儀を継承）+ C 定数で色参照
- className は使わない（グローバル CSS は _head.html のみ）
- キーボード操作・aria 属性を最初から組み込む

### 4.3 各コンポーネントのI/F概要

```jsx
// Badge
<Badge variant="tournament" icon="emoji_events">優勝</Badge>
// variant: tournament | practice | trial | success | warning | error | default
// icon: Material Symbols 名 (省略可)

// Card
<Card onClick={...}>children</Card>
// clickable: true で hover 効果

// Button
<Button variant="primary" icon="add" onClick={...}>追加</Button>
// variant: primary | secondary | ghost | danger | disabled

// Input
<Input label="大会名" value={v} onChange={setV} placeholder="..." required />

// Select
<Select label="会場" value={v} onChange={setV} options={[{value,label}]} />

// Textarea
<Textarea label="メモ" value={v} onChange={setV} rows={3} />

// Modal
<Modal open={open} onClose={setOpen} title="タイトル">children</Modal>

// Toast
<Toast message="保存しました" type="success" onDismiss={...} />
// type: success | warning | error | info

// ConfirmDialog
<ConfirmDialog open={open} title="削除の確認" message="..." onYes={...} onNo={...} />

// TabBar
<TabBar tab={currentTab} onTabChange={setTab} />
// tabs: home / sessions / gear / plan / insights を固定

// Header
<Header title="画面タイトル" onBack={...} onMenu={...} />

// SectionTitle
<SectionTitle icon="flag">次の行動</SectionTitle>

// Icon
<Icon name="arrow_back" size={24} color={C.primary} aria-label="戻る" />
```

### 4.4 ショーケース画面（app.jsx）

```jsx
function TennisDB(){
  return <div style={{padding:20,background:C.bg,minHeight:"100vh"}}>
    <h1>v4 共通コンポーネント ショーケース</h1>

    <section>
      <h2>Badges</h2>
      <Badge variant="tournament" icon="emoji_events">優勝</Badge>
      <Badge variant="practice" icon="directions_run">自主練</Badge>
      <Badge variant="trial" icon="sports_tennis">採用候補</Badge>
      <Badge variant="success">勝利</Badge>
      <Badge variant="error">敗北</Badge>
    </section>

    <section>
      <h2>Buttons</h2>
      <Button variant="primary" icon="save">保存</Button>
      <Button variant="secondary">キャンセル</Button>
      <Button variant="ghost">詳細</Button>
      <Button variant="danger" icon="delete">削除</Button>
      <Button variant="disabled" disabled>無効</Button>
    </section>

    {/* Card / Input / Select / Textarea / Modal / Toast / ConfirmDialog / TabBar / Header ... */}
  </div>;
}
```

### 4.5 build & 確認

1. `powershell -ExecutionPolicy Bypass -File build.ps1`
2. preview で `v4/index.html` を開く
3. ショーケースの見た目が wireframes.html と同等か目視確認

---

## 5. S4 完了時にやること

1. ユーザー目視確認 → 「S4 OK」
2. 1 commit（例: `v4 S4: 共通UIコンポーネント実装`）
3. push 承認 → push
4. `HANDOFF_v4_S5.md` 作成（S5 = Sessions 一覧、v3 Firestore 読み取り表示）
5. `HANDOFF_v4_S4.md` 削除

---

## 6. S4 で守ること（CLAUDE.md 厳守プロトコル）

- コンポーネント内部定義禁止（再マウント防止）
- 独自スタイル禁止、DESIGN_SYSTEM_v4.md にない値を使いたくなったら止まる
- 「とりあえず動けば」禁止、仕様通りに作る
- Stage 範囲外の実装禁止（SessionCard 等に手を出さない）
- 判断投げ禁止、専門用語禁止（ユーザー応答時）

### ストップサイン（再掲、CLAUDE.md §2）

発動したら即停止:
- §2.1 同一ファイル 3 回目の Edit
- §2.2 エラーに「回避できる」と思った瞬間
- §2.3 「とりあえず」「後で直す」と書きそうになった
- §2.4 判断をユーザーに投げそうになった
- §2.5 事前調査なしに実装開始しそう
- §2.6 UI/UX を後回しにしそう
- §2.7 設計書にない機能を実装しそう
- §2.8 環境で動かない DoD

---

## 7. S3 で得た学び（S4 で活かす）

- **文字だけの設計書はユーザーが把握しきれない** → S4 のショーケースを preview で必ず視覚確認
- **コントラストは数値で検証する** → 実装後に DESIGN_SYSTEM の色値と照合、計算確認
- **ユーザーの指摘は具体的に改善する** → 曖昧な「良くなった」ではなく、計算値や配置の具体的根拠を示す
- **ユーザー編集を尊重** → ユーザーが wireframes.html に直接加えた変更は設計意図として受け継ぐ

---

## 8. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル（最優先）
- **DESIGN_SYSTEM_v4.md** — S4 実装の完全準拠ソース
- **WIREFRAMES_v4.md** — 画面構成・遷移
- **v4/wireframes.html** — 視覚リファレンス、React 化の元ネタ
- **REQUIREMENTS_v4.md** — 非機能要件（UI/UX・ユニバーサル）
- **ARCHITECTURE_v4.md** — §10-§12 規律
- **ROADMAP_v4.md** — S4 の位置付け、S5 以降の流れ
- **memory/feedback_ui_design_first.md** — ユーザーのデザイン指針
- **src/core/** — S1 で実装済（定数/Firebase/storage/id/schema）
- **src/app.jsx** — ショーケース画面に拡張
- **src/ui/common/** — S4 で新規作成
- **HANDOFF_v4_S4.md** — 本書
