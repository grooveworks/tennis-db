# HANDOFF v4 — Stage S12 (Session 追加 FAB + QuickAdd) 開始用

作成: 2026-04-25 / S11 完了時に作成 (新フォーマット圧縮版)

参照ファイル: `CLAUDE.md` (5 ルール) / `DECISIONS_v4.md` (全 Stage 決定事項) / `CLAUDE_failures.md` (違反しそうな時のみ)

---

## 1. 完了状態 (S11 まで)

- APP_VERSION: `4.0.0-S11`
- 主要ファイル:
  - `src/domain/`: validation.js / match_helpers.js / claudeFormatter.js (firestore_clean.js は重複定義のため削除済、`core/03_storage.js` の save() を使う)
  - `src/ui/sessions/`: SessionEditView / TournamentEditForm / PracticeEditForm / TrialEditForm / MatchEditModal / GameTracker / LinkedSessionPicker
  - `src/ui/common/`: MasterField (新規、Select/Input フォールバック)
- 暫定措置: Sessions 種類フィルタに「試打」追加 (S16 で削除)
- 文書再編: `archive/` に旧版 .md 退避、CLAUDE.md 圧縮版 (94 行)、DECISIONS_v4.md 新設

---

## 2. S12 までで決まっている事項 (DECISIONS_v4.md 抜粋)

詳細は `DECISIONS_v4.md` 参照。S12 着手時に守るべき直近の決定:

- **編集画面の統一フォーマット** (3 種別共通の並び): ① 基本 → ② 会場/気象 (3列) → ③ 機材 (ラケット 1行 / 縦糸+横糸 / テンション縦+横) → ④ 種別固有 → ⑤ メモ → ⑥ 公開設定
- **必須バリデーション**: SCHEMA `required:true` 駆動 (validation.js 既存)
- **Firestore 書き込み**: `core/03_storage.js` の `save()` を使う (新規作らない)
- **MasterField**: ラケット/ストリング/会場/対戦相手は MasterField 経由で Select、master 無ければ Input にフォールバック
- **Apple Watch / matchStats は表示のみ** (編集 UI に出さない)
- **新規追加 (S12 本題)**: SessionEditView を再利用して空フォームから起動する設計が望ましい (実装方針は preview で固める)

---

## 3. S12 の最小起動タスク

1. `S12 を始めてください` で着手
2. 私の最初の応答で CLAUDE.md セッション開始プロトコルを実行 (5 項目、grep 出力コピペ)
3. preview_s12.html で FAB + QuickAdd の UX 視覚プロトタイプ → ユーザー OK
4. 実装 → build → ユーザー動作確認 → push → HANDOFF_v4_S13.md

---

## 4. 圧縮版フォーマット試運転メモ (S11 終盤に作成、S12 で本格テスト)

このセッションで .md 圧縮 + DECISIONS_v4.md 新設を実施した。S12 着手時のテスト観点:
- 圧縮版 CLAUDE.md (94 行) で 5 ルールが頭に入るか
- DECISIONS_v4.md を読むだけで連続性が担保されるか (HANDOFF のナラティブ削減で破綻しないか)
- セッション開始プロトコル (grep コピペ必須) が機能するか

問題があれば即 archive から rollback 可。
