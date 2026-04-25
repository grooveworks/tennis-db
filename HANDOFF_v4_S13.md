# HANDOFF v4 — Stage S13 (Session 削除 + cascade) 開始用

作成: 2026-04-26 / S12 完了時に作成 (圧縮フォーマット v2)

参照ファイル: `CLAUDE.md` (5 ルール) / `DECISIONS_v4.md` (全 Stage 決定事項) / `CLAUDE_failures.md` (違反しそうな時のみ)

---

## 1. 完了状態 (S12 まで)

- APP_VERSION: `4.0.0-S12`
- 主要ファイル (S12 で追加):
  - `src/domain/blank.js` (blankTournament/Practice/Trial、純関数)
  - `src/ui/sessions/QuickAddModal.jsx` (大会/練習の最小フォーム)
  - `src/ui/sessions/QuickAddFab.jsx` (FAB + ミニメニュー 2 択)
- v4 実運用可能ライン到達: 記録 / 表示 / 編集 / 追加 / 削除 (簡易版) が完結
- 試打追加は S14 Home 3 ボタン経由に集約予定

---

## 2. S13 までで決まっている事項 (DECISIONS_v4.md 抜粋)

詳細は `DECISIONS_v4.md` 参照。S13 着手時に守る直近の決定:

- **削除の現状 (S10-S11 簡易版)**: app.jsx の handleDelete は items 配列から filter で除外し save() で書き戻すだけ。**linkedPracticeId / linkedMatchId の孤児化対応なし**
- **S13 で実装する cascade**: tournament 削除時に matches[] が同時消滅 → 紐付く trial の linkedMatchId を自動クリア / practice 削除時に紐付く trial の linkedPracticeId を自動クリア
- **REQUIREMENTS N2.2 / N2.3**: cascade 必須要件
- **v3 では cascade 未実装**: orphan ID 残る (v3 既知バグ、v4 で解消)
- **マージ機能 (F1.10)**: S15 で別途実装。S13 では削除 cascade のみ

---

## 3. S13 の最小起動タスク

1. ユーザー: `S13 を始めてください`
2. 私の最初の応答で CLAUDE.md セッション開始プロトコル実行 (5 項目、grep 出力コピペ必須)
3. preview_s13.html で削除確認ダイアログ + cascade 通知 UX → ユーザー OK
4. 実装 (`src/domain/cascade.js` 純関数 + handleDelete 拡張) → build → ユーザー動作確認 → push → HANDOFF_v4_S14.md

---

## 4. S12 圧縮フォーマット試運転メモ

S12 着手時、CLAUDE.md セッション開始プロトコル (grep コピペ必須) を実行。試運転結果:
- 圧縮版 CLAUDE.md (94 行) で 5 ルールが頭に入った ✅
- DECISIONS_v4.md 読了で連続性担保 ✅
- 重複定義チェック (grep) で QuickAddModal / blankXxx の新規 OK 確認 → 重複定義エラー回避 ✅

S13 でも同プロトコル適用。問題があれば即 archive から rollback 可。
