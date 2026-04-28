# HANDOFF v4 — Stage S16 (Gear タブ初実装) 開始用

作成: 2026-04-28 / S15 完了 push 時に作成

参照ファイル: `CLAUDE.md` (5 ルール) / `DECISIONS_v4.md` (全 Stage、特に S15 セクション) / `MEMORY.md` 全索引

---

## 1. 完了状態 (S15 まで)

- APP_VERSION: `4.0.0-S15`
- GitHub Pages 反映予定 (push 後): `https://grooveworks.github.io/tennis-db/v4/`

### S15 主要追加 (2026-04-28):

- **Sessions マージ機能** (REQUIREMENTS F1.10):
  - `src/domain/merge.js` 新規 — 純関数 5 つ (computeMergeDiff / applyMerge / mergeMatches / relinkAfterMerge / countRelinks)。SCHEMA 駆動、type 分岐は本ファイルのみ (N3.3)
  - `src/ui/sessions/MergePartnerPicker.jsx` 新規 — 同タイプ候補から相手選択、日付近い順 + 検索、同日候補は青強調
  - `src/ui/sessions/MergeModal.jsx` 新規 — 2 ステップ (compare → confirm)、独自 overlay (560px)、競合 (赤ラジオ) / 補完 (緑自動) / 一致 (折り畳み) のセクション分類
  - `src/ui/sessions/SessionDetailView.jsx` 改修 — Action bar を 4 ボタン化 (編集 / マージ / Claude / 削除、危険度の昇順)
  - `src/app.jsx` 改修 — mergeStarting / mergePartner state + handleMerge 系ハンドラ + Picker/Modal 配線
  - `tests/run.html` 改修 — merge.js のユニットテスト 31 件追加 (合計 44 tests 全 pass)、自己完結型に変更 (preview パネルの相対パス制約回避)

- **handleQuickAddSave の history.pushState 抜け fix** (S12 から潜在バグ):
  - 新規練習作成 → Detail → 戻るボタンが Tennis DB の前のページ (Google 等) に飛ぶ問題
  - `handleCardClick` と同じ `history.pushState({tdb:"detail"}, "")` を追加して解消

---

## 2. S15 で確立 / 再確認されたメタ運用

- **2 段階プレビュー方針** (memory `feedback_two_stage_preview.md`): preview_s15_p1.html で 3 画面プロト (Action bar / Picker / MergeModal compare+confirm) を承認 → 本実装。S15 でも厳守
- **過去データ品質の歴史的負債** (memory `project_data_quality_legacy.md` 新規): V2 で GCal インポート中止 → 1 年以上前は AW 由来カロリーのみで現実乖離。S15 マージは過去データ救済導線にも使える / S18 統計では除外フィルタ要検討 / S19 インポート再挑戦時は merge.js 流用
- **テスト自己完結化方針** (S15 で確立): preview パネルが `<script src="../src/...">` を解決できない。tests/run.html は domain/core 系の中身を inline コピー、実装変更時は手動同期。バンドル化スクリプト追加は今後の課題
- **APP_VERSION 中間カウンタ運用** (S14 確立): Stage 中の修正のたびに `4.0.0-S<N>.1` `.2` ... と上げ、Stage 完了 push 時に `4.0.0-S<N>` に整える

---

## 3. S16 の最小起動タスク

ROADMAP S16: 「**Gear タブ (v3 未実装を v4 で初実装)** — ラケット / ガット / セッティング / 実測値」

1. ユーザー: `S16 を始めてください`
2. 私の最初の応答で CLAUDE.md セッション開始プロトコル実行 (5 項目、grep 出力コピペ必須):
   - ROADMAP S16 / DECISIONS_v4.md S15 セクション / REQUIREMENTS F2.x 機材管理 / WIREFRAMES Gear タブ節
   - v2/v3 該当箇所 grep (V2 = 信頼可リサーチ元、V3 = 機材タブは Placeholder のまま未実装の可能性大)
   - v4 既存実装の重複チェック (Gear / RacketCard / StringCard 等の識別子)
   - 関連 master データ構造 (rackets / strings / venues) は既に S11 で読込済 (`src/app.jsx`)
3. preview_s16_p<M>.html で UX 提案 → 承認 → 実装
4. **試打 (trial) との連動を考慮**: S15 暫定で「種類フィルタ=試打」時のみ独立カード (S6-S10 の暫定方針)。S16 完成で試打集約画面ができたら Sessions の暫定カードを削除

---

## 4. 共通方針リマインダ

- canonical 日付形式: `YYYY-MM-DD`
- 画面幅: <600px=単列、≥1024px=左右分割
- Firestore 書き込み: `core/03_storage.js` の `save()` (cleanForFirestore + 800ms debounce) または handleDelete/handleMergeConfirm のような並行 Promise.all パターン
- APP_VERSION: `4.0.0-S(N)` Stage 完了時のみ更新

---

## 5. S15 のリサーチ用 preview ファイル (今後参照可)

- `preview_s15_p1.html`: Sessions マージ機能 UX (Action bar 4 ボタン / Picker / MergeModal 比較+確認) — 大会のマージや S19 インポート再挑戦時のレイアウト議論で再利用可

---

## 6. 関連ファイル

S16 着手時に必読:
- `CLAUDE.md` 5 ルール
- `DECISIONS_v4.md` 全件 (特に S15 セクション)
- `MEMORY.md` 全索引 (`feedback_two_stage_preview.md` / `project_v2_v3_history.md` / `project_data_quality_legacy.md` 含む)
- `ROADMAP_v4.md` S16 行
- `REQUIREMENTS_v4.md` F2.x 機材管理
- `WIREFRAMES_v4.md` Gear タブ節 (該当節のみ)
