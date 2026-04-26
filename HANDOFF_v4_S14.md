# HANDOFF v4 — Stage S14 (Home タブ) 開始用

作成: 2026-04-26 / S13 完了時に作成

参照ファイル: `CLAUDE.md` (5 ルール) / `DECISIONS_v4.md` (全 Stage 決定事項) / `WAKEUP_2026-04-26.md` (S13 セッションでの事故対応報告) / `AUDIT_v4_schema_2026-04-26.md` (全 SCHEMA 棚卸し)

---

## 1. 完了状態 (S13 まで)

- APP_VERSION: `4.0.0-S13`
- GitHub Pages 反映済 (`https://grooveworks.github.io/tennis-db/v4/`)
- 直近 push (古い → 新しい):
  - `b79cecb` v4 S13: Session 削除 cascade + focus 文字列復旧 + 編集 UX 改善
  - `40def24` v4: Firestore 初期読込を batch get に変更 (5-10x 高速化)
  - `08f28f0` v4: 詳細画面の戻るを history.pushState/popstate 方式に変更

S13 主要追加:
- `src/domain/cascade.js` (純関数 computeCascade / applyCascadeToTrials / describeCascadeMessage)
- 削除時の cascade (app.jsx handleDelete / handleSave 統合)
- SessionEditView 下部アクションバー (スマホ親指届く位置)
- PracticeDetail 体調 5 ボタン視覚化
- 左端スワイプ → history.pushState/popstate 方式 (iOS Safari ネイティブ協調)
- Firestore 初期読込を batch get (5-10x 高速化)

緊急対応 (S2 で植えた focus 型誤定義の根本修正):
- SCHEMA / blank.js / PracticeEditForm / PracticeDetail / claudeFormatter を rating → textarea に統一
- 既存破損 2 件は `REPAIR_focus_script.md` で修復用スクリプト用意済

---

## 2. S14 着手前の必須事項

### A. Firestore データ修復 ✅ 完了 (2026-04-26 ユーザー実行)

`REPAIR_focus_script.md` のスクリプト実行済。focus 数値の練習 2 件 (`moffr9mqtf7w4j` / `p1776069714875`) は空文字に修復。v3 SessionsTab / v2 PracticesTab は描画復旧しているはず。

### B. AUDIT_v4_schema_2026-04-26.md の minor 2 件

S14 着手前に判断:
1. tournament.overallResult dropdown に「準決勝敗退」追加するか (Firestore に 2 件該当: trn02d / trn05)
   - 推奨: 追加しないなら手動で 2 件のレコード書き換え
2. linkedXxx undefined vs "" の統一 → S15 マージ時で OK、S14 では触らない

---

## 3. S13 までで決まっている事項 (DECISIONS_v4.md 抜粋)

S13 セッション中に追加で確定:

- **削除 cascade 仕様**: tournament 削除 → matches[] 内の match.id を持つ trial の linkedMatchId を空に / practice 削除 → linkedPracticeId 空に / match 単位削除も同じ。試打自体は残す。ConfirmDialog に件数事前提示
- **focus フィールド型**: textarea (string)、v2/v3 と互換。rating 誤定義は S2 のミスとして CLAUDE_failures.md 追記対象
- **編集画面 UX**: 下部固定アクションバー [戻る][保存] (スマホ親指届く位置)、ヘッダの上部ボタンは小型化
- **戻り経路**: 詳細画面は history.pushState/popstate でブラウザ戻る (左端スワイプ含む) と協調。自作スワイプは廃止
- **体調表示**: 編集画面と統一の 5 ボタン横並び (Detail で _pdRatingDisplay 使用)
- **Firestore 読込**: collection 全体を 1 回の get で batch fetch (v3 互換、N+1 ではなく 1 query)

---

## 4. S14 の最小起動タスク

ROADMAP S14: 「Home タブ — 3ボタン登録導線、MiniCalendar、Next Actions」

1. ユーザー: `S14 を始めてください` (前提: REPAIR_focus_script 実行済)
2. 私の最初の応答で CLAUDE.md セッション開始プロトコル実行 (5 項目、grep 出力コピペ必須):
   - ROADMAP S14 / REQUIREMENTS F1.1 F1.2 F1.3 / WIREFRAMES §3 (Home 遷移) §2.x (Home 画面) / DESIGN_SYSTEM §x
   - DECISIONS_v4.md 全件 + WAKEUP_2026-04-26.md
   - v3 HomeTab (line ~932) の中身確認
   - v4 既存実装での重複チェック (HomeTab / Next / MiniCalendar 系識別子)
3. preview_s14.html で UX プロト → ユーザー OK
4. 実装 → build → ユーザー動作確認 → push → HANDOFF_v4_S15.md

---

## 5. S13 セッションの教訓 (CLAUDE_failures.md に追記すべき項目)

- **F16: SCHEMA 定義時に v2/v3 を読まずに type を決めた → 後段 Stage で連鎖破壊**
  - 該当: `practice.focus` を v2/v3 が string なのに rating と誤定義。S11 PracticeEditForm が `Number(form.focus) || 0` で書き戻し → v3/v2 の `.slice()` で TypeError
  - 防止策: SCHEMA 1 フィールド追加するごとに、v2/v3 で**実際に grep して型と用途を確認**してから type を決める
  - 違反検出: 各 Stage で「v4 で何か保存」した直後に **v3 を実際に開いて表示確認**するまで「OK」と言わない

---

## 6. 共通方針リマインダ

- **canonical 日付形式**: `YYYY-MM-DD` (v4 normalizeItems で読み込み時正規化)
- **画面幅対応**: <600px=単列、≥1024px=左右分割
- **Firestore 書き込み**: `core/03_storage.js` の `save()` (cleanForFirestore + 800ms debounce)
- **APP_VERSION**: `4.0.0-S(N)` Stage 完了時のみ更新

---

## 7. 関連ファイル

S14 着手時に必読:
- `CLAUDE.md` 5 ルール
- `DECISIONS_v4.md` 全件
- `ROADMAP_v4.md` S14 行
- `REQUIREMENTS_v4.md` F1.1-1.3 + N1.x
- `WIREFRAMES_v4.md` §2.x (Home) + §3 (遷移)
- `DESIGN_SYSTEM_v4.md` 関連節
- `WAKEUP_2026-04-26.md` (S13 セッションの事故対応経緯)
- `AUDIT_v4_schema_2026-04-26.md` (全 SCHEMA 棚卸し結果、参考)
- `REPAIR_focus_script.md` (修復スクリプト、起きてすぐ実行)

S14 のためだけなら全部は読まない。該当節のみ。
