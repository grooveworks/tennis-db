# Tennis DB v4.0 — アーキテクチャ設計書

作成日: 2026-04-19 / 前提: REQUIREMENTS_v4.md

---

## 0. 設計原則（これに反する実装は却下）

1. **単一ファイル3000行超を禁止**。機能単位でファイル分割
2. **データスキーマは単一の真実**（SCHEMA）。新フィールドは1行追加で完結
3. **domain ロジックは純関数**、React に依存しない、unit test 必須
4. **type 分岐を散らさない**（`if(type==="practice")` を書くのは domain 層の1箇所だけ）
5. **破壊的操作は確認ダイアログ経由**、直接 setter 呼び出し禁止
6. **React コンポーネントの内部定義禁止**（再マウント防止、v3.3.25 教訓）

---

## 1. ファイル構成

```
v4/
├── index.html                ← entry（スクリプトタグのみ、ロジックは src/ から）
├── build.ps1                 ← src/ 全ファイルを連結して index.html を生成
├── serve.ps1                 ← ローカル配信（既存流用）
├── src/
│   ├── _head.html            ← <head> + CSS + Firebase CDN
│   ├── core/
│   │   ├── 01_constants.js   ← APP_VERSION, C (色), KEYS
│   │   ├── 02_firebase.js    ← Firebase 初期化、認証
│   │   ├── 03_storage.js     ← localStorage + Firestore 同期
│   │   ├── 04_id.js          ← genId, normDate, fmtDate
│   │   └── 05_schema.js      ← SCHEMA / DISPLAY_FIELDS / COMBINABLE_FIELDS
│   ├── domain/
│   │   ├── merge.js          ← mergeItems, computeComplement, computeConflicts
│   │   ├── cascade.js        ← deleteItemCascade
│   │   ├── duplicate.js      ← 重複判定 (strictMatch, sameDate, analyzeImport)
│   │   ├── import_gcal.js    ← GCal JSON → sessions 変換
│   │   ├── import_csv.js     ← データテニス CSV → matches 変換
│   │   ├── import_watch.js   ← Apple Watch JSON → practice 変換
│   │   └── stats.js          ← 集計ロジック
│   ├── ui/
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── VenueSelect.jsx
│   │   │   └── InfoCell.jsx
│   │   ├── sessions/
│   │   │   ├── SessionsTab.jsx
│   │   │   ├── TournamentExpanded.jsx
│   │   │   ├── PracticeExpanded.jsx
│   │   │   ├── TrialExpanded.jsx
│   │   │   ├── TournamentDetail.jsx
│   │   │   ├── PracticeDetail.jsx
│   │   │   ├── TrialDetail.jsx
│   │   │   ├── MatchRow.jsx
│   │   │   ├── MatchEditModal.jsx
│   │   │   └── SessionsMergeModal.jsx
│   │   ├── home/
│   │   │   ├── HomeTab.jsx
│   │   │   ├── MiniCalendar.jsx
│   │   │   ├── QuickAddTournament.jsx
│   │   │   ├── QuickAddPractice.jsx
│   │   │   └── QuickTrialMode.jsx
│   │   ├── gear/GearTab.jsx
│   │   ├── plan/PlanTab.jsx
│   │   ├── insights/InsightsTab.jsx
│   │   └── import/
│   │       ├── ImportPreviewModal.jsx
│   │       ├── CsvImportModal.jsx
│   │       └── NameEditModal.jsx
│   ├── app.jsx               ← TennisDB root（全 state 管理、タブ切替）
│   └── _tail.html            ← </body></html>
└── tests/
    ├── run.html              ← ブラウザで開くと全テストが走る
    ├── merge.test.js
    ├── cascade.test.js
    ├── duplicate.test.js
    └── import.test.js
```

---

## 2. ビルド戦略

### 採用: シンプル連結ビルド（PowerShell、Node 不要）

`build.ps1` は src/ 配下のファイルを **ファイル名の辞書順** に連結して `v4/index.html` を生成する。

```powershell
# build.ps1 概要
$out = "v4/index.html"
Get-Content src/_head.html > $out
"<script type='text/babel'>" >> $out
Get-ChildItem src/core -Filter *.js | Sort-Object Name | % { Get-Content $_.FullName >> $out }
Get-ChildItem src/domain -Filter *.js | Sort-Object Name | % { Get-Content $_.FullName >> $out }
Get-ChildItem src/ui -Recurse -Filter *.jsx | Sort-Object FullName | % { Get-Content $_.FullName >> $out }
Get-Content src/app.jsx >> $out
"</script>" >> $out
Get-Content src/_tail.html >> $out
```

- 依存関係はファイル名プレフィックス（`01_`, `02_`...）で制御
- core → domain → ui → app の順に結合
- Babel standalone はブラウザで JSX をランタイム変換（v3 と同じ）
- 結果: GitHub Pages で `v4/index.html` 単一ファイルとして配信可能

### 却下した代案
- esbuild / vite: Node 依存発生。ユーザー環境のメンテ負担増
- ES Modules: GitHub Pages + Babel standalone との相性で複雑化

---

## 3. データスキーマ設計

### 3.1 SCHEMA（単一の真実）

`src/core/05_schema.js` に全データタイプを定義:

```js
const SCHEMA = {
  tournament: [
    { key: "date", label: "日付", type: "date", required: true },
    { key: "startTime", label: "開始時刻", type: "time" },
    { key: "name", label: "大会名", type: "text", combinable: true },
    // ... 全フィールド
    { key: "matches", label: "試合記録", type: "array", itemType: "match" },
  ],
  practice: [ /* ... */ ],
  trial: [ /* ... */ ],
  match: [ /* ... */ ],  // tournament.matches の要素
  racket: [ /* ... */ ],
  string: [ /* ... */ ],
  // ... 全タイプ
};
```

- `type`: date/time/text/textarea/number/select/array/object/boolean
- `required`: 必須フィールド
- `combinable`: マージ時に結合可能
- `itemType`: array の要素タイプ（ネスト構造の定義）

### 3.2 自動生成されるもの

- `DISPLAY_FIELDS[type]` — 表示用 [key, label] 配列
- `COMBINABLE_FIELDS` — Set<key>
- `REQUIRED_FIELDS[type]` — 必須フィールド一覧
- `FIELD_TYPES[type]` — key → type マップ

**SCHEMA を変更したら、上記は全て自動追従**。手動管理禁止。

---

## 4. State 管理

### 4.1 方針

- React Context / Redux は**使わない**（素人メンテナンスの負担増）
- トップレベル `TennisDB` コンポーネントで全 state を `useState` 管理
- 子コンポーネントには props で配布
- 深いネストが必要な箇所でも、props drilling を受け入れる（型安全性より可読性優先）

### 4.2 トップレベル state 一覧

```js
const [tournaments, setTournaments] = useState([]);
const [practices, setPractices] = useState([]);
const [trials, setTrials] = useState([]);
const [rackets, setRackets] = useState([]);
const [strings, setStrings] = useState([]);
const [stringSetups, setStringSetups] = useState([]);
const [measurements, setMeasurements] = useState([]);
const [mental, setMental] = useState([]);
const [next, setNext] = useState([]);
const [opponents, setOpponents] = useState([]);
const [venues, setVenues] = useState([]);
const [profile, setProfile] = useState({});
const [quickTrialCards, setQuickTrialCards] = useState([]);
const [tab, setTab] = useState("home");
// UI state は各コンポーネント内でローカル管理
```

### 4.3 state 更新ルール

- `setter(prev => ...)` 形式で最新 state を参照（closure 経由の古い参照禁止）
- save(key, arr) は setter の後に必ず呼ぶ（Firestore 同期）
- 複数 state を連動更新する場合は、domain 層でまとめて計算してから setter を並べる

---

## 5. Domain 層の設計

### 5.1 純関数の原則

- `mergeItems(a, b, choices, type) => mergedObject`
- `deleteItemCascade(type, id, state, matchParentId?) => newState`
- `computeComplement(a, b, type) => [{ key, label, value }]`
- `computeConflicts(a, b, type) => [{ key, label, retainValue, discardValue, combinable }]`
- `analyzeImport(current, incoming) => { add: [...], dup: [...] }`

全て入力を変更せず、新しいオブジェクトを返す。React には依存しない。

### 5.2 unit test

`tests/run.html` をブラウザで開くと全テストが走り、結果が表示される:

```html
<!-- tests/run.html -->
<script src="../src/core/05_schema.js"></script>
<script src="../src/domain/merge.js"></script>
<script src="./merge.test.js"></script>
<script>runAllTests();</script>
```

テストは `assert(condition, message)` の単純 DSL:

```js
// merge.test.js
test("空フィールドは補完される", () => {
  const a = { id: "1", name: "" };
  const b = { id: "2", name: "大会A" };
  const merged = mergeItems(a, b, {}, "tournament");
  assert(merged.name === "大会A", "name が補完されるべき");
});
```

**domain 層のテストカバレッジ100%を受入基準**。

---

## 6. UI 設計

### 6.1 色設計（v3 の教訓）

グレー背景上の細字グレー文字を禁止。情報階層は3段:

```js
const C = {
  bg: "#f2f2f7",         // 薄いグレー背景
  panel: "#fff",         // カード白背景
  panel2: "#f5f5f7",     // カード内セクション
  border: "#e0e0e4",
  text: "#1a1a1a",           // 主情報（見出し、本文）— AAA 16.5:1
  textSecondary: "#3a3a3c",  // 副情報（メタ、説明）— AAA 11.7:1
  textMuted: "#5a5a5f",      // 補助情報（アイコン横ラベル）— AA+ 6.1:1
  // textDim は廃止
  accent: "#00b87a",
  red: "#dc2626",
  blue: "#2563eb",
  yellow: "#f59e0b",
  purple: "#7c3aed",
};
```

- 全ての色ペアは WCAG AA (4.5:1) 以上、主要テキストは AAA (7:1) 以上
- 小さいフォント (11px以下) は AAA 必須
- **アイコン色とテキスト色の混在禁止**（視線が散る）

### 6.2 モーダル再マウント対策

- モーダルコンポーネントは**必ず親コンポーネントの外**で定義
- 親内部で `function Modal() {}` と定義するとレンダリング毎に新しい関数になり再マウント発生
- v3.3.25 で発生した事故を防止

### 6.3 タップ領域

- ボタンは最小 44px × 44px（iOS HIG 準拠）
- チェックボックスは 20px ボックスだが padding で当たり判定を 44px 確保

---

## 7. 移行戦略

### 7.1 v3 → v4 データ移行

1. v3.3.27 の本番 Firestore から全データを JSON エクスポート
2. `tools/migrate_v3_to_v4.js` でデータ変換（フィールド名統一、欠損値補完）
3. 新規 v4 アプリで JSON インポートして動作確認
4. 問題なければ Firestore を v4 形式に一括更新

### 7.2 運用切替

- v3 URL: `https://grooveworks.github.io/tennis-db/v3/` は **残す**（凍結）
- v4 URL: `https://grooveworks.github.io/tennis-db/v4/` を新設
- ユーザーはブックマーク切替のみ
- 問題が出たら v3 に戻すだけ

---

## 8. テスト戦略

| レイヤ | 手段 | カバレッジ目標 |
|---|---|---|
| domain (純関数) | unit test (tests/run.html) | 100% |
| core (storage/auth) | 手動検証 | 主要経路 |
| UI コンポーネント | 手動検証 + preview 動作確認 | 受入基準5項目 |
| End-to-End | ユーザー実環境検証 | push 前必須 |

---

## 9. 守るべき決まり事（実装中のルール）

1. 新機能の実装前に REQUIREMENTS_v4.md に追記、承認後に着手
2. 新フィールドの追加は必ず `src/core/05_schema.js` の SCHEMA[type] に1行追加
3. type 分岐は domain 層の1箇所だけ、UI で書いたら却下
4. 破壊的操作には ConfirmDialog を挟む
5. setter 内で save() を呼ぶ pattern は OK（ただし StrictMode 未使用前提を明記）
6. React コンポーネントの内部定義禁止
7. ファイルが 500 行を超えたら分割を検討、1000行超は必ず分割

---

## 10. Stage 開始前チェックリスト（対処療法防止）

**各 Stage で HANDOFF を書き始める前に、以下を必ず調査・確認すること。実装着手してから気付くのは禁止。**

### 10.1 実行環境の制約を調査

- **preview panel (file:// プロトコル)**
  - Firebase Auth: 動かない（http/https/chrome-extension 必須）
  - 相対パスの外部スクリプト (`<script src="./_runner.js">`): 動かない場合あり → inline にする
  - CORS が必要な API: 動かない
  - localStorage: 動く
  - IndexedDB: ブラウザによる
- **serve.ps1 経由 (http://localhost:8080)**
  - 上記の制約は解消される
- **本番 (https://grooveworks.github.io/...)**
  - Firebase Auth の authorized domains に登録されている前提

### 10.2 使用技術の仕様を調査

- **PowerShell**
  - `-join` 演算子 / `Set-Content -Encoding UTF8` は環境依存で不安定
  - **StringBuilder + `[System.IO.File]::WriteAllText` + UTF8Encoding(BOM=false)** が確実
  - 文字列エスケープは**シングルクォート優先**（ダブルクォート内 backtick は罠）
- **React 18**
  - `ReactDOM.createRoot().render()` を使用（legacy `ReactDOM.render` は使わない）
  - StrictMode は使わない（double-invoke で副作用が2回走るため）
- **Firebase 10.12 compat**
  - `firebase.initializeApp` / `.auth()` / `.firestore()` の compat API
  - Google ログインは `signInWithPopup` → popup blocked 時 `signInWithRedirect`

### 10.3 DoD（完了条件）の妥当性確認

- **preview で確認できる項目のみ DoD に含める**
- preview で確認不能な項目（Firebase 認証等）は:
  - 「コードが書かれている」レベルで DoD に含める
  - 実動作確認は本番 push 後の別タスクとして分ける

### 10.4 着手前の自問

```
□ このStageで使う技術は、preview / file:// で動くか調べたか
□ PowerShell で何か出力する場合、-join 等の罠を避けているか
□ DoD は全て preview で検証可能な項目か
□ 実装途中でエラーが出たら、根本原因を調べてから直すか（対処療法しない）
□ このStage の完了条件をユーザー視点で書いたか（ユーザーが「OK/NG」を判定できるか）
```

**この自問を HANDOFF 作成前に応答テキストに書き出すこと**（書かずに進めたらルール違反）。
