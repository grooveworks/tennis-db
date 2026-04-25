# HANDOFF v4 — Stage S11 (Session 編集画面) 開始用

作成: 2026-04-24 / S10 完了時に作成 / 前提: CLAUDE.md / REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md / DESIGN_SYSTEM_v4.md / WIREFRAMES_v4.md

---

## 0. このファイルの読み方

S11 に着手する Claude が最初に読む唯一の起点。上から順に読み、§5 着手前チェックリスト完了まで実装に手を付けないこと。

S10 で露呈した反省:
- v3 の詳細画面 (PracticeExpanded / TrialExpanded) を部分的にしか読まず、Apple Watch セクションが情報量不足のまま完成扱いにしようとした (preview_s10 v4)
- 統一レイアウトを崩して出してしまった (大会 8 セル集約 / 試打 2 セル基本情報 という不統一)
- N1a.1 AAA コントラストを preview で踏み外した (Apple Watch 内の textMuted 使用)
- 連携カード (紐づく試打 / 連携練習) タップを placeholder にして、試打詳細への唯一の導線を殺しそうになった

S11 でも以下は繰り返さない:
- v3 の対応箇所を**完全に**読んでから設計 (部分読みで「わかったつもり」にならない)
- 統一レイアウト ([会場/気象] 3列 + [機材] 2x2) は S10 で確立。S11 編集画面でも同じ構造を保つ
- 小さい文字 (<=12px) は必ず AAA (7:1) を満たす色を選ぶ
- 「次 Stage で実装」placeholder を放置しない。Stage 内で動線を閉じる

---

## 1. セッション開始前: 環境確認

### 1.1 作業ディレクトリ
`pwd` で main 本体にいるか確認。worktree 配下なら main に戻る。main 直接コミット運用。

### 1.2 リモート最新化
```
git fetch origin
git status
git pull origin main
```
- branch が `main`、作業ツリー clean、origin と同期

### 1.3 S10 成果物の存在確認
- `git log --oneline -6` に S10 の commit (`v4 S10: Session 詳細画面 (slide-in + Claude連携 + Apple Watch 強化)`) が見える
- `src/ui/sessions/` に以下のファイル (S10 で新規):
  - **SessionDetailView.jsx** (overlay + slide-in + 共通 helper 集約)
  - **TournamentDetail.jsx** / **PracticeDetail.jsx** / **TrialDetail.jsx** (各種別 body セクション群)
- `src/domain/claudeFormatter.js` (純関数、formatXxxForClaude 3 つ)
- `src/core/06_clipboard.js` (copyToClipboard helper)
- `grep "4.0.0-S" src/core/01_constants.js` で `4.0.0-S10` 表示
- `ROADMAP_v4.md` S10 行に ✅
- HANDOFF_v4_S11.md 存在 (このファイル) / HANDOFF_v4_S10.md 削除済み

### 1.4 preview port 8080
- ユーザー側 `serve.ps1` が 8080 占有（既定）
- Claude の preview_start は使わない (失敗する / プロジェクトは serve.ps1 運用)
- 検証はユーザーの F5 経由

---

## 2. S10 で到達したもの (S11 の前提)

### 2.1 Session 詳細画面 (閲覧) 確立
- 大会 / 練習 / 試打 の 3 種別すべてで slide-in 詳細画面が動作
- 統一レイアウト: `[会場/気象] 3 列 + [機材] 2x2`、練習のみ `[体調]` 追加
- 練習 Apple Watch: warning 色体系 + 4 セル + 積層バー + BPM range + % + 分秒 + 回復心拍 (V3 同等)
- 試打 4 セクション構成: 打感評価 6 項目 + 平均 / 特性 2 項目 / ショット別 8 項目 / 安心感 1 項目
- 連携カード (紐づく試打 / 連携練習) タップで相互 slide-in 遷移 (`key={session.id}` で再マウント)

### 2.2 詳細画面のアクション帯
- `[編集 flex:1] [📋 Claude コピー] [🗑 削除]` の 3 ボタン構成
- 現状:
  - 編集: placeholder toast (S11 で実装予定、本 Stage の役目)
  - Claude コピー: formatXxxForClaude → copyToClipboard → toast ✅
  - 削除: 確認ダイアログ → Firestore set + localStorage + toast ✅
- 編集ボタンは SessionDetailView のアクション帯に**既に存在**。onEdit prop を app.jsx 側で handleEdit に繋ぐと編集画面遷移ハンドラになる。

### 2.3 schema 拡張済み
- practice: timeRange / workoutLocation / totalCalories / recoveryHR 追加
- trial: label を 安心感 / 弾道 / 打感 に修正 + shot\* 8 フィールド (shotForeAtk/Def, shotBackAtk/Def, shotServe, shotReturn, shotVolley, shotSlice)
- SCHEMA 駆動で DISPLAY_FIELDS / REQUIRED_FIELDS / FIELD_TYPES が自動生成される前提を維持

### 2.4 読み取り専用 (S10 まで)
- S11 (編集) / S12 (追加) / S13 (削除 cascade) に分かれる
- S10 で削除の簡易実装は入ったが、cascade (linkedPracticeId / linkedMatchId の孤児化対応) は S13 で domain/cascade.js に切り出す予定

---

## 3. S11 の目的: Session 編集画面 (全画面)

ROADMAP S11: 「既存記録の更新が v4 で可能」 / REQUIREMENTS F1.8

### 3.1 遷移
- SessionDetailView の 編集ボタン → 全画面編集モード (SessionDetailView を覆う or 差し替え)
- 保存 → Firestore + localStorage + 詳細画面に戻る (更新後のデータで再描画)
- 破棄 → 確認ダイアログ (未保存変更がある時) → 詳細画面に戻る

### 3.2 前提要件 (ROADMAP 2026-04-21 記載)
使用状況:
- PC (家・仕事場): 詳細登録、Google カレンダー同期、データ保守
- スマホ (出先): ホーム 3 ボタンで簡易登録、練習後の詳細登録
- ミニタブレット (試合中): ゲーム単位スコアと状況メモの記録 (ポイント単位は DataTennis で別途、後で CSV 取込)

UX 要求:
- ゲーム単位の試合記録 UX (REQUIREMENTS F1.4.1)
- ゲーム間の 30 秒で入力可能な最小タップ導線 (試合中)
- 屋外強光下でも読めるコントラスト、誤タップしにくい大ボタン
- 書いた直後に読み返しやすい配置 (メンタルリセット目的)
- **S11 着手前に個別 HANDOFF で UX を先に設計する** (UI/UX 先行原則)

### 3.3 S11 のスコープ確定 (着手前にユーザーと UX 合意必須)
- 大会 / 練習 / 試打 の編集
- Match (試合記録) の追加 / 編集 / 削除 は S11 に含めるか S13 に回すか要議論
- QuickAdd (新規追加) は S12 で実装 (本 Stage 対象外)

### 3.4 S11 でやらないこと
- 新規追加 (S12)
- cascade 削除 (S13)
- マージ (S15)
- インポート (S19)

---

## 4. 実装ファイル構成 (暫定案、UX 合意後に確定)

### 4.1 新規ファイル (`src/ui/sessions/`)
- `SessionEditView.jsx` — 全画面編集モード (SessionDetailView と同じ overlay / slide-in、中身は editable form)
- `TournamentEditForm.jsx` / `PracticeEditForm.jsx` / `TrialEditForm.jsx` — SCHEMA 駆動のフィールド生成
- `MatchEditModal.jsx` — 試合記録の編集 (v3 から移植 or 再設計、着手時判断)

### 4.2 更新ファイル
- `src/ui/sessions/SessionDetailView.jsx` — 編集ボタン → SessionEditView 起動
- `src/app.jsx` — 編集 state、保存/破棄ハンドラ
- `src/domain/` — 保存時のバリデーション純関数 (REQUIRED_FIELDS チェック等) を切り出し
- `src/core/01_constants.js` — APP_VERSION → `4.0.0-S11` (**完了時のみ**)

### 4.3 再利用するもの
- SCHEMA (`src/core/05_schema.js`) の DISPLAY_FIELDS / REQUIRED_FIELDS / FIELD_TYPES
- 共通 UI (Input / Select / Textarea / Modal / ConfirmDialog / Badge / Icon)
- SessionDetailView の slide-in アニメ / overlay 構造 (共通化できる部分は refactor)

---

## 5. 着手前チェックリスト (コード触る前に応答に内容を埋めて明示)

```
□ 関連設計書を読んだ
  → REQUIREMENTS F1.8 / F1.4.1 の要点
  → WIREFRAMES 編集画面の要点
  → DESIGN_SYSTEM §4 フォーム系コンポーネント属性
  → ROADMAP S11 前提要件 (2026-04-21 追記)

□ 実行環境の制約を調査した
  → preview port 8080 は serve.ps1 占有、ユーザー F5 検証
  → Firestore 書き込みのタイミング (v3 パターン: 保存ボタン / v4 では即時か確認)

□ v3 既存実装を調べた
  → v3 TournamentDetail / PracticeDetail / TrialDetail (編集画面) の Field 列挙
  → v3 MatchEditModal の挙動
  → v3 で使われている Input / Select / Textarea パターン

□ DoD の各項目が serve.ps1 + F5 で検証可能か
  → フィールド編集 ○ / 必須バリデーション ○ / 保存後の反映 ○ / 破棄確認 ○

□ 視覚プロトタイプで合意取った (S10 の学び)
  → preview_s11.html 作成 → ユーザー「OK」受領
  → 特に「ゲーム単位の試合記録 UX」は試合中想定の低視認性環境でも入力できるかを事前検証

□ ユーザー承認を得た
  → 着手承認のメッセージ
```

---

## 6. S11 で守ること (CLAUDE.md + S10 の学び)

### 6.1 CLAUDE.md 厳守プロトコル (全部)
- §0 最優先: 対処療法禁止 / 判断投げ禁止 / 事前調査 / UI/UX 先行 / 謝罪単独 / 平易な言葉
- §1 着手前チェックリスト中身埋め
- §2 ストップサイン (**特に §2.1 同一ファイル 3 回目の Edit**)
- §3 コミット規律 (1 タスク = 1 push、push 前に明示的承認)

### 6.2 S10 の反省を継続
- v3 の対応箇所を**完全に読む**。Apple Watch のように部分読みで「わかったつもり」にならない
- **統一レイアウト**を S11 編集画面でも守る。編集フォームでも「会場/気象」「機材」セクションは共通構造
- N1a.1 AAA コントラスト (<=12px で 7:1 以上) を preview 段階で必ず確認
- placeholder toast で閉じる動線を作らない。S11 完了時点で編集→保存→詳細画面戻りまで通す
- 謝罪はミス発覚時に単独で、対応に混ぜない
- 「完了扱い」(APP_VERSION / ROADMAP ✅ / 設計書の「実装確定」) はユーザー承認後のみ

### 6.3 コンポーネント内部定義禁止
`function Xxx` はトップレベル定義のみ。SessionEditView 内で sub-component 定義しない。SessionDetailView の `_dvXxx` helper と同じ命名パターンで `_seXxx` 等を検討。

### 6.4 独自スタイル禁止
DESIGN_SYSTEM 準拠。独自色 / padding / shadow を追加したくなったら先に DESIGN_SYSTEM §4 に追記してから使う。

### 6.5 Lucide アイコンマッピング表
S10 で §5.4 マッピング表にないアイコン (clock, flame, heart-pulse, heart, map-pin 等) を Apple Watch セクションで使用した。S11 でも新規必要が出たら DESIGN_SYSTEM §5.4 マッピング表を更新しつつ使用。

---

## 7. S11 完了時の手順

1. `build.ps1` 実行、`v4/index.html` 生成確認
2. `grep -rn "S[0-9]\+"` で Stage 番号ずれが無いか確認
3. ユーザー動作確認依頼 (serve.ps1 + F5)
4. 「OK」確認 → **1 commit にまとめて** push 承認依頼 (コード + 設計書 + v4 + HANDOFF 更新まで)
5. push 完了後、`HANDOFF_v4_S12.md` 作成 + 本ファイル (S11) 削除 + ROADMAP S11 ✅ + APP_VERSION → S11
6. S12 (Session 追加 FAB + QuickAdd) への引き継ぎメッセージ

---

## 8. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル
- **MEMORY.md + feedback_\*.md / project_\*.md / reference_\*.md** — 過去の失敗ルール
- **ROADMAP_v4.md S11** — S11 スコープ全体像 (S10 ✅, S11 未チェック, S12 次)
- **REQUIREMENTS_v4.md F1.8 / F1.4.1** — 編集 / ゲーム単位試合記録
- **WIREFRAMES_v4.md** — 編集画面ワイヤフレーム
- **DESIGN_SYSTEM_v4.md §4** — フォーム系コンポーネント
- **src/ui/sessions/SessionDetailView.jsx** — 編集ボタン (現在 placeholder)、overlay 構造を再利用
- **src/ui/sessions/PracticeDetail.jsx / TournamentDetail.jsx / TrialDetail.jsx** — 表示側のレイアウト、編集側もこれに揃える
- **src/core/05_schema.js** — SCHEMA 駆動のフィールド生成ロジックで使用
- **HANDOFF_v4_S11.md** — 本書

---

## 9. 次 Stage (S12) 前提メモ

S12 は「Session 追加 (FAB + QuickAdd)」。S11 で確立した編集フォームを「空のデータで起動」すれば追加モーダルにもなる設計を S11 段階で意識しておくとよい。完了時点でホームと FAB から新規登録が動く状態を作る (ROADMAP 上「v3 からの実運用移行可能ライン」は S12 完了時点)。
