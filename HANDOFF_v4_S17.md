# Tennis DB v4 — S17 引き継ぎ書 (Phase 1 完了 + Phase 2 保留、2026-05-09 更新)

> **このファイルは、文脈を知らない次セッションの Claude が単独で読んで現状を把握できることを目的とする。**

---

## 0. 最初に必ず読む — 次セッション最優先タスク

### ⚠️ 機能追加を進めない、build 方式の修繕が最優先

S17 Phase 2 (Master Cleanup + master 管理 UI 群) の作業で **ビルド 911 KB → iPhone Safari / Chrome ともに 5 分以上ロード = 試合運用不可** が発覚。Phase 1 (864 KB) でぎりぎり動いていたが、Phase 2 (+66 KB) で tipping point を超えた。

**俯瞰判断 (ユーザー指示で確定 2026-05-09)**:
- ユーザーは試合運用で iPhone を使う (memory `user_match_day_usage.md`)
- iPhone で動かないアプリは存在しないのと同じ
- このまま機能追加 (Phase 2 残り / Phase 3 / 4 / 5 / S18 / ...) を進めれば、iPhone で動かないアプリを作り続けることになる
- **build 方式を直すまで、機能追加は一切進めない**

### 修繕の方向性

現状: ブラウザで毎回 Babel transpile (`<script type="text/babel">` で src/ 全 inline 連結 → ブラウザで実行時 transpile)

修繕: **PC で事前に組み立てた成果物を配信** (esbuild / vite 等の事前 transpile bundler を導入、build.ps1 から呼び出す)

詳細は memory `feedback_iphone_build_priority.md`。

### Phase 2 のコードは src/ に保持

build 方式修繕が完了したら、Phase 2 のコード (Master Cleanup + master 管理 UI 群) はそのまま再ビルドで復活。**作業を破棄しない**。

---

## 1. 現バージョン

- **APP_VERSION**: `v4.6.5-S17` (`src/core/01_constants.js`)
- **直近の主要 commit**: `a830827` (v4 S17 Phase 1: Plan タブ作戦室実装 + 既存機能健全化、2026-05-08 push 済)
- **GitHub Pages**: deploy 済 (反映には数分かかる場合あり)
- **v4/index.html サイズ**: 864 KB (Phase 1 push 状態、git checkout HEAD で復元済)

---

## 2. working tree の状態

### Phase 2 src/ 変更が **uncommitted** で残っている

次セッションで build 方式修繕後、これらをそのまま再ビルド → push できる:

| ファイル | 状態 | 内容 |
|---|---|---|
| `src/domain/master_cleanup.js` | 新規 (uncommitted) | Master Cleanup 汎用純関数 (findSessionsUsing / findAllSessionsUsing / applyCleanup / applyCleanupAll / describeSessionForCleanup) |
| `src/ui/gear/MasterCleanupModal.jsx` | 新規 | 共通 UI、master 種別 (venue/racketName/stringMain/stringCross/opponent/level) を props で切替、個別チェック式 + 中身プレビュー |
| `src/ui/gear/SetupsSection.jsx` | 新規 | stringSetups CRUD UI (折りたたみ + 並び替え + status active/archived) |
| `src/ui/gear/SetupEditModal.jsx` | 新規 | セッティング編集 Modal |
| `src/ui/gear/VenuesSection.jsx` | 新規 | venues master CRUD UI (折りたたみ + 一括取り込み + 整理ボタン) |
| `src/ui/gear/VenueEditModal.jsx` | 新規 | 会場編集 Modal (削除影響件数 + 「他の会場と統合」ボタン) |
| `src/ui/gear/RetiredRacketsSection.jsx` | 新規 | 引退ラケット archive UI (折りたたみ) |
| `src/ui/common/SetupPickerButton.jsx` | 新規 | stringSetups から 1 タップ流し込み (3 編集画面で再利用) |
| `src/ui/gear/GearTab.jsx` | 改修 | placeholder 撤去 + 3 セクション配置 + props 拡張 |
| `src/ui/gear/StringsSection.jsx` | 改修 | 各行に「整理」ボタン追加 |
| `src/ui/sessions/TrialEditForm.jsx` | 改修 | SetupPickerButton 配置 |
| `src/ui/sessions/TournamentEditForm.jsx` | 改修 | SetupPickerButton 配置 |
| `src/ui/sessions/PracticeEditForm.jsx` | 改修 | SetupPickerButton 配置 |
| `src/ui/sessions/SessionDetailView.jsx` | 改修 | stringSetups prop 流通 |
| `src/ui/sessions/SessionEditView.jsx` | 改修 | stringSetups prop 流通 |
| `src/app.jsx` | 改修 | persistStringSetups / persistVenues / handleVenuesBulkImport / handleCleanupStart/Confirm/Close + Modal 配置 + state 追加 |
| `src/core/01_constants.js` | **revert 済 (Phase 1 状態)** | APP_VERSION = "4.6.5-S17" (Phase 2 中は 4.7.1-S17 だったが Phase 1 状態に戻した) |

---

## 3. Phase 1 (push 済、4.6.5-S17) の内訳

積み残し 9 件中 4 件消化:
- ✅ #2 試打カード「過去から選ぶ」(QuickTrialMode に Bottom sheet 経由で trial 一覧から 1 タップ作成)
- ✅ #3 ストリング Select 順序反映 (5 経路 + active を STRING_STATUS_PRIORITY 追加)
- ✅ #4 wheel picker 拡張 (QuickTrialMode + Plan Gear、機材タブ整合: gap "0 10px"、label「テンション縦/横」)
- ✅ #5 Plan Gear クイック選択 (各段「過去のセットから」、Phase 4→1 格上げ)

詳細は `DECISIONS_v4.md` S17 節 / commit `a830827` の message。

---

## 4. Phase 2 で実装したが保留中の機能 (build 方式修繕後に再ビルド)

積み残し 9 件中 3 件 (Phase 2 で消化したコード、push 待ち):
- ⏸ #1 stringSetups CRUD UI (SetupsSection + SetupEditModal)
- ⏸ #6 venues (会場) master 管理 UI + 一括取り込み + 削除影響件数表示 (VenuesSection + VenueEditModal)
- ⏸ #9 引退ラケット archive UI (RetiredRacketsSection)
- ⏸ Master Cleanup 機能 (汎用、venue/string/racket/opponent 整理) 抜本対応
- ⏸ stringSetups 活用経路 (SetupPickerButton、3 編集画面に配置)

---

## 5. 残積み残し (build 方式修繕 + Phase 2 push 後)

- ⏳ #7 Racket Board reorder UI (Phase 3、status 内 order 編集)
- ⏳ #8 Home 課題行クリック対応 (Phase 5、Plan Strategy へ遷移)

---

## 6. 関連ドキュメント / memory

- `progress.html` — 進捗ダッシュボード (Tennis DB Progress preview パネル port 8082 で常時表示)
- `DECISIONS_v4.md` S17 節 — 決定事項蓄積、Phase 2 の経緯
- `WIREFRAMES_v4.md` §2.9 — Plan タブ作戦室仕様
- memory `feedback_iphone_build_priority.md` (新規 2026-05-09) — **次セッション最優先タスクの規律**
- memory `feedback_no_postpone.md` — 「後で」棚上げ禁止規律
- memory `feedback_consistent_verification_method.md` — 検証方法を毎回変えない
- memory `reference_local_dev_url.md` — port 8080 (本番) / 8081 (Claude dev) / 8082 (進捗) の役割
- memory `feedback_data_destruction_2026_05_03.md` — 値変換禁止 / build.ps1 承認後のみ / 暗黙確定禁止

---

## 7. 検証環境

- **本番モード**: `http://localhost:8080/v4/index.html` (PowerShell 経由 + http-server で起動済 / port 8080)
- **dev モード**: `http://localhost:8081/v4/index.html?dev=1` (Claude Code preview パネル、Tennis DB Dev Server)
- **進捗ダッシュボード**: `http://localhost:8082/progress.html` (Claude Code preview パネル、Tennis DB Progress)
- **iPhone 実機**: `http://192.168.1.4:8080/v4/index.html` (同一 Wi-Fi、本番モード)

`v4/dev-fixture.json` は `.gitignore` で git 管理外。次セッションでは `cp tennis_db_<latest>.json v4/dev-fixture.json` で配置。

---

## 8. 次セッション開始時のアクション

```
1. CLAUDE.md を最初から読む (特に R0 フック前提)
2. 本ファイル (HANDOFF_v4_S17.md) を最初から最後まで読む
3. MEMORY.md を読む (特に feedback_iphone_build_priority.md / feedback_no_postpone.md)
4. progress.html を Tennis DB Progress preview パネル (port 8082) で開く
5. ユーザーに状況確認:
   - 「現バージョン v4.6.5-S17 を確認、Phase 1 push 済」
   - 「次セッション最優先タスク = build 方式の修繕、これから着手しますか?」
6. ユーザー OK → build 方式修繕の Stage 番号確認 (S18? S17.x?) + スコープ提案 (esbuild 採用 / vite 採用 / 別 bundler / build.ps1 改修内容)
7. 実装 → ビルド → iPhone 実機でロード時間確認 (1 分以内が目標、できれば数秒)
8. OK なら Phase 2 のコードを再ビルド (uncommitted 変更を活かす) → push
9. その後、Phase 3 (Racket reorder) / Phase 5 (Home 連携) へ
```

---

## 9. 重要な実 file パス

| 用途 | パス |
|---|---|
| メイン source | `src/app.jsx`, `src/core/`, `src/domain/`, `src/ui/` |
| バージョン定数 | `src/core/01_constants.js` `APP_VERSION` |
| ビルドスクリプト | `build.ps1` (PowerShell)、output: `v4/index.html` (**修繕対象**) |
| 検証 fixture | `v4/dev-fixture.json` (gitignored) |
| 進捗ダッシュボード | `progress.html` (Claude Code preview port 8082) |
| Cloud Functions | `functions/index.js` (Anthropic Claude Haiku 経由要約) |
| 設計書 | `REQUIREMENTS_v4.md` / `ARCHITECTURE_v4.md` / `ROADMAP_v4.md` / `WIREFRAMES_v4.md` / `DESIGN_SYSTEM_v4.md` / `DECISIONS_v4.md` / `TENNIS_RULES.md` |
| **Claude フック** | `.claude/hooks/*.ps1`, `.claude/settings.json` |

---

## 10. ユーザーから今セッションで受けた重要指摘 (次セッションで活かす)

1. **「俺は試合運用で iPhone を使う」** → iPhone で動かない = 実用ゼロ
2. **「お前は失敗すると専門用語ばかりで説明する」** → memory `feedback_plain_language.md` 遵守、「組み立て方」「ブラウザに毎回作業させる」等の平易な言葉
3. **「目先のことばかりで俯瞰で見られなくなっている」** → 機能追加 (Phase 2 push) より土台修繕 (build 方式) を優先する判断
4. **「devモードでちゃんと検証しないと大事故になる」** → Claude が dev モード省略してユーザー本番に丸投げするのは規律違反 (memory `feedback_consistent_verification_method.md`)
5. **「ホイールピッカーが試打カードのみ」「ストリング Select 順序反映なし」「stringSetups いつ使う?」「会場マスター管理が無い」「会場マージ機能が必要」** → Phase 1-2 で消化、Phase 2 は build 修繕後に push 予定
