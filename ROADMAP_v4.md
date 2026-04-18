# Tennis DB v4.0 — 実装ロードマップ

作成日: 2026-04-19 / 前提: REQUIREMENTS_v4.md, ARCHITECTURE_v4.md

---

## 0. 基本ルール

- **1 Stage = 1〜3セッション**、**1セッション = 1 commit、可能なら1 push**
- **各 Stage の DoD（完了条件）を満たすまで次に進まない**
- **ユーザー検証OKを DoD に含む**
- **Stage 途中で問題発生時は対処療法せず、当該 Stage の設計から見直す**
- **HANDOFF を各セッション開始時・終了時に更新**（中断なしを目指すが、長時間作業になる場合の引き継ぎに備える）

---

## 1. Stage 構成

| Stage | 内容 | 見込み | 依存 |
|---|---|---|---|
| **S0** | 準備: ディレクトリ作成、build.ps1、serve.ps1、tests/run.html の土台 | 1セッション | なし |
| **S1** | Core 層: constants, firebase, storage, id, schema | 1セッション | S0 |
| **S2** | Domain 層: merge, cascade, duplicate, import_gcal, import_csv, import_watch, stats + unit tests | 2-3セッション | S1 |
| **S3** | UI 共通コンポーネント: Badge, Card, ConfirmDialog, Toast, VenueSelect, InfoCell | 1セッション | S1 |
| **S4** | SessionsTab 骨格: 一覧、ジャンプ、月展開、編集モード（まだCRUDなし） | 1セッション | S3 |
| **S5** | Session CRUD: 作成（QuickAdd）、展開表示、削除（cascade込み） | 2セッション | S4, S2 |
| **S6** | Session Detail: 全画面編集、matches 追加/編集/削除（cascade込み） | 2セッション | S5 |
| **S7** | Sessions マージ機能（F1.10） | 1セッション | S5, S2 |
| **S8** | HomeTab: 3ボタン、Next Actions、MiniCalendar、好成績、バックアップ警告 | 1-2セッション | S5 |
| **S9** | インポート: GCal JSON, CSV, Watch, バックアップJSON + プレビューモーダル + 取り消し | 2-3セッション | S2, S5 |
| **S10** | GearTab: ラケット/ストリング/セッティング/実測値 | 2セッション | S3 |
| **S11** | PlanTab: Next Actions 詳細、対戦相手管理 | 1-2セッション | S3 |
| **S12** | InsightsTab: スタッツ集計、推移グラフ | 2-3セッション | S2 |
| **S13** | 移行: v3 → v4 データ変換スクリプト、本番データで検証 | 1-2セッション | 全 Stage |
| **S14** | リリース: v4.0.0 として GitHub Pages デプロイ、v3 凍結 | 1セッション | S13 |

**合計見込み: 20〜30セッション**

---

## 2. 各 Stage の完了条件（DoD）

### S0: 準備
- `v4/` ディレクトリ作成
- `build.ps1` が src/ を連結して `v4/index.html` を生成できる
- `serve.ps1` が v4 配信に対応
- `tests/run.html` を開くと「テスト0件: 全成功」と表示
- ユーザーが preview で `v4/index.html` を開き「真っ白画面が表示される」を確認

### S1: Core
- SCHEMA が tournament/practice/trial/match の全フィールド定義済み
- DISPLAY_FIELDS / COMBINABLE_FIELDS / REQUIRED_FIELDS が SCHEMA から自動生成される
- localStorage + Firestore 同期層が動作
- Firebase Google ログインが動作
- ユーザーが preview で「ログインできる、localStorage 読み書きできる」を確認

### S2: Domain
- merge.js: `mergeItems`, `computeComplement`, `computeConflicts` の unit test 全通過
- cascade.js: `deleteItemCascade` の unit test 全通過（practice/tournament/trial/match 全ケース）
- duplicate.js: `strictMatch`, `analyzeImport` の unit test 全通過
- import_gcal.js / import_csv.js / import_watch.js の unit test 全通過
- tests/run.html を開くと「全 XX 件成功」と表示
- ユーザーが tests/run.html でグリーン全確認

### S3: 共通UI
- 各コンポーネントを tests/ui.html で単体表示確認
- ConfirmDialog が開閉・確定・キャンセル全動作
- Toast が自動消滅、undo callback 動作
- ユーザーが preview で「各コンポーネントが表示され、操作できる」を確認

### S4: SessionsTab 骨格
- 空データで「データがありません」表示
- 手動で localStorage に練習1件入れた後に再ロードすると一覧に出る
- フィルタ切替、月ジャンプ、編集モード切替が動作
- ユーザーが preview で「ダミーデータで一覧が動く」を確認

### S5: Session CRUD
- `＋練習`/`＋大会`/`＋試打` で作成できる
- 一覧タップで展開、再タップで閉じる
- 展開内の🗑削除で cascade 削除（trial.linkedXxx 自動クリア）
- 連続作成・削除で state 不整合が起きない（受入基準N1.2, N1.3）
- ユーザーが preview で「5シナリオ実地確認」OK

### S6: Session Detail
- 展開内の✏️編集で全画面 Detail ページ
- matches 追加/編集/削除が動作
- Detail 保存時に tournament.matches の差分検出で trial.linkedMatchId cascade クリア
- ユーザー検証OK

### S7: Sessions マージ
- 編集モードで同タイプ2件選択→🔗マージボタン
- A/B 切替、競合選択、結合オプション
- 確認ダイアログ経由で確定
- 確定後 A を cascade 削除、B に統合結果を保存
- ユーザー検証OK

### S8〜S14: 略（各 Stage で受入基準 6項目を満たす）

---

## 3. 受入基準の確認フロー（各 Stage 共通）

1. 実装完了時、私が以下を確認:
   - 受入基準1〜5 が満たされる
   - domain 関連なら unit test 全通過
2. ユーザー承認フェーズ:
   - 私が検証手順（具体的な preview 操作手順）を用意
   - ユーザーは手順通り操作して「OK」「NG」を返答
3. OK なら:
   - 変更を 1 commit にまとめ、push 承認を求める
   - push 完了
4. NG なら:
   - 私がその Stage の設計から見直す（対処療法禁止）
   - 再度受入基準確認→ユーザー承認

---

## 4. 今セッション（次の一手）以降の動き

### 今セッション残タスク
- REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md（本書） の3本を書き上げ、**ユーザー承認を取る**
- 承認が取れたら、**その場で HANDOFF_v4_S0.md を作成**して次セッションの最初の指示をまとめる
- 1 commit にまとめて push 承認依頼

### 次セッション
- HANDOFF_v4_S0.md から開始
- S0（準備）を実行
- 終了時に HANDOFF_v4_S1.md を作成

---

## 5. 作業規律（対処療法を繰り返さないために）

1. **設計文書を読み返してから実装開始**（REQUIREMENTS / ARCHITECTURE / ROADMAP）
2. **type 分岐を書きそうになったら SCHEMA を疑う**
3. **UI で困ったら Domain 層を疑う**（UI で複雑ロジックを書かない）
4. **エラーメッセージで「動かなくなった」を直接修正しない**（根本原因を特定する）
5. **「とりあえず」「対処的に」という言葉が出たら一度止める**
6. **ユーザーに判断を投げそうになったら、情報を集めて私が決める**
7. **先延ばし禁止**（中断を提案しない、今セッションで完結させる）
8. **テンプレ的に書かない**（その場の状況に応じて判断する）

---

## 6. 失敗時のエスカレーション

- Stage 内で 3 回以上の設計見直しが発生したら、その Stage の前提を REQUIREMENTS に立ち返って疑う
- 致命的なデータロスリスクが発覚したら、実装を止めて報告
- ユーザーに「これでいいか」ではなく「私はこう判断した、理由はX」と伝える

---

## 7. この文書の更新

- 各 Stage 完了時に進捗を反映
- 実装中に見つかった設計の穴は、本書 + ARCHITECTURE を更新してから実装に戻る
