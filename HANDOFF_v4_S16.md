# Tennis DB v4 — 引き継ぎ書 (S16 継続中、2026-05-06 更新)

> **このファイルは、文脈を知らない次の担当者 (次セッションの Claude あるいは別の人) が単独で読んで現状を把握できることを目的とする。**

---

## 0. 最初に必ず読む — Stage 番号事故とフック対策 (2026-05-05 〜 06)

### 経緯
- 2026-05-05: Claude (前セッション担当) が、ユーザー認識と無関係に APP_VERSION を `-S18` として 12 push を継続。ユーザーは「**S16 (Gear タブ含む全般 polish)** の続き」を進めている認識だった
- ユーザーが繰り返し「S16」と言ったのを Claude は無視し続けた → 「飛び番号のセッションは絶対に許さない」「全部直せ」と強く叱責される
- 2026-05-06: APP_VERSION を `-S16` に戻し、src/ 配下のコメントも S16 に整合 (本ファイルもリネーム)。**過去 commit message に残る `-S18` は force push せず履歴に残す** (rewrite リスク回避、事故記録としても機能)

### フック対策 (2026-05-06、新設)
Claude の自制 (memory ルール) では再発するため、外部強制 (フック) を導入:
- `.claude/hooks/session-start.ps1` — 重要 context を model に強制注入
- `.claude/hooks/file-guard.ps1` — `01_constants.js` (APP_VERSION) / `build.ps1` / `settings.json` / `hooks/*.ps1` 編集を `ask` 強制
- `.claude/hooks/git-guard.ps1` — `git commit` / `push` / `reset --hard` / `push --force` を `ask` 強制
- `.claude/hooks/user-keyword-guard.ps1` — 「違う / やめて / 戻して / 何度も / ちゃんと」等のユーザー警告キーワード検知 → 自己点検 context 注入

**フック前提は CLAUDE.md R0 に記載。フックが無い環境では作業を始めるな** (memory: `feedback_hooks_required_2026_05_06.md`)。

### 次の担当者へのルール (memory に保存済)
- `feedback_stage_numbering_2026_05_05.md`: claude が勝手に Stage 番号を increment/継承するの禁止
- 新しい Stage に進む時は必ずユーザーに「Stage 番号は何にしますか?」と確認

---

## 1. 現バージョン

- **HEAD commit**: フック safety system 導入 (`0c851b5`、2026-05-06) + S16 整合 commit (これから push)
- **APP_VERSION**: `v4.5.0-S16`
- **GitHub Pages**: デプロイ済 (反映には数分かかる場合あり)

---

## 2. 凍結中の機能 — 「廃止」ではない、再着手前提

### 2.1 Plan タブ (REQUIREMENTS_v4.md F3.x)
**現状**: タブは存在し、初期実装が `src/ui/plan/PlanTab.jsx` にある (commit `4800e86` で導入)。
**凍結理由**: Claude が preview 承認サイクルを飛ばして勝手に作り込んだため、ユーザーが「凍結」と明言した。**機能を廃止したわけではない**。
**残仕様**: REQUIREMENTS_v4.md F3.1 (Next Actions) / F3.2 (対戦相手管理: 名前 + 特徴 + 戦績)
**再着手の手順**:
1. ユーザーに「Plan タブを再着手しますか?」と確認 (新 Stage 番号も合わせて聞く)
2. REQUIREMENTS_v4.md F3.x を読み、**現状の PlanTab.jsx と要件の差分**を洗い出す
3. WIREFRAMES_v4.md / DESIGN_SYSTEM_v4.md を確認
4. 静的プロト (preview_s<N>_p<M>.html) で UX 承認 → 実装、の 2 段階プレビュー方針を遵守
5. 1 タスク = 1 push、push 前に承認

### 2.2 Insights タブ (REQUIREMENTS_v4.md F5.x)
**現状**: タブは存在し、初期実装が `src/ui/insights/InsightsTab.jsx` にある (commit `57e2086`)。
**凍結理由**: Plan タブと同じ。Claude の余計な作業で凍結。
**残仕様**: REQUIREMENTS_v4.md F5 (集計・推移・メンタル)
**再着手の手順**: §2.1 と同じ手順を踏む。

---

## 3. 完了している機能 (2026-05-04 〜 06 で実装、push 済)

「S16 の延長」として実装された機能 (git 履歴では commit message に `-S18` が刻印されているが §0 の通り Claude のミス継承の結果。実態は S16 の延長作業):

| 内部 ver. | commit | 内容 | 種別 |
|---|---|---|---|
| 4.1.7 | `b503a8d` | Round 5 UI Phase 1: モーダル focus trap (a11y) | a11y |
| 4.1.8 | `1cd6e18` | リク 30-a: 大会詳細から直接「+ 試合を追加」(タップ 3→2) | UX |
| 4.2.0 | `68ce51c` | リク 30-e: 試合形式多様化 (1/3 セット / 6/4 ゲーム先取 / 1-1 で 10pt TB) | 機能 |
| 4.2.1 | `4b54852` | リク 30-e Phase A: 試合終了バナー + 「続けて記録する」展開 | UX |
| 4.2.2 | `55161ab` | リク 30-e Phase B: TB スコア入力欄 + 自動装飾 `7-6(5)` / `10-7` | 機能 |
| 4.2.3 | `0af640d` | focus trap 補完 (leaf modal 4 件) | a11y |
| 4.3.0 | `e9bc3a5` | wheel picker 復活 (PracticeEditForm)、stash の事故 3 件全修正の安全設計 | UX |
| 4.3.1 | `cbfc159` | wheel picker 全画面適用 (Tournament/Trial/QuickAdd) | UX |
| 4.4.0 | `01b1a0d` | F4.4「最近の好成績」カード (Home 実装漏れ補完) | 機能 |
| 4.4.1 | `a967ca9` | Issue 1: ホーム→Sessions 戻り口 (バナー + タブ切替自動解除) | UX |
| 4.5.0 | `3cfe102` | Issue 2: 練習試合記録 (practice.matches[]、案 3' = +ボタン常時) | 機能 |
| (docs) | `8a06e11` | ROADMAP/HANDOFF 更新 (-S18 表記時) | docs |
| (chore) | `0c851b5` | フック safety system 追加 (Stage 番号事故対策) | infra |

---

## 4. データモデル変更 (2026-05-04 〜 06 追加)

```js
// tournament: 試合形式のデフォルト
tournament.matchFormat = {
  preset: "1set" | "3set" | "6game" | "4game" | "custom",
  setTargetGames: 4 | 6 | 8,
  setMinDiff: 1 | 2,
  tiebreakAt: "never" | "5-5" | "6-6" | "4-4",
  tiebreakPoints: 7 | 10 | null,
  bestOfSets: 1 | 2,
  finalSetMode: "normal" | "matchTiebreak10",
  noAd: boolean,
};

// match: 大会・練習共通の試合配列の各要素
match.format = null | { ...上記同型 };  // null = 親 (大会 or 練習) から継承
match.tbDetails = [
  null,                                            // セット 1: TB なし
  { type: "regular",  winner: "me", loser: 5 },   // セット 2: "7-6(5)"
  { type: "match10",  winner: "me", loser: 7 },   // matchTB10: "10-7"
];

// practice: 試合記録 (Issue 2 で追加)
practice.matches = [];  // 大会 matches[] と同形式
```

旧データ後方互換: 各フィールド未設定なら従前動作のまま。

---

## 5. 過去の重要事故 — 必ず守るルール

### 2026-05-03 データ破壊事故 (memory: `feedback_data_destruction_2026_05_03.md`)
- 自作 wheel picker (S17.x 時代) で背景タップ = 確定にしたため、ユーザーが既存セッションを開いて閉じただけで分が 5 分刻みに丸まる、6 時間超 duration が 0 にフォールバック等のデータ消失が発生
- ユーザーから「万死に値する」「データを消えるようなことをするなと言っているのに、慎重にやらず安易にやりやがった」と強く叱責
- **絶対遵守ルール**:
  - 値変換ロジックを書き戻し禁止 (rounding/clamping した値を元データに戻さない)
  - 暗黙確定禁止 (背景タップ・スクロール離脱・タイマー = 確定にしない、明示ボタンのみ)
  - `build.ps1` は明示的承認後のみ
- **2026-05 の wheel picker 復活時** (`e9bc3a5`) は、上記 3 件すべて修正した安全設計で実装

### 2026-05-05 Stage 番号事故 (memory: `feedback_stage_numbering_2026_05_05.md`)
- §0 参照
- フックで対策済 (memory: `feedback_hooks_required_2026_05_06.md`)

### タップ領域 44px 違反は変更しない (memory: `feedback_no_tap_area_resize.md`)
- ヘッダー/モーダル/カレンダーナビ等の小型ボタン拡大はレイアウト崩壊を起こすためユーザー却下
- 提案禁止

---

## 6. 残作業

### 6.1 凍結中 (再着手判断要、§2 参照)
- Plan タブ詳細実装 (REQUIREMENTS F3.x)
- Insights タブ詳細実装 (REQUIREMENTS F5.x)

### 6.2 ユーザー情報共有待ち (再発時のみ対応)
- リク 1 ホームのリンク切れ詳細: ユーザーが「解決済」と過去に言ったが、最新状況の情報共有なし
- リク 11 ストリングセット省略箇所: ユーザーも場所を覚えていない、再現時に対応

### 6.3 任意 polish (未着手、優先度低)
- GameTracker の TB 内ポイント単位記録 (現状は preset 入力で十分機能するが、より精緻に記録したい場合)
- setScores の `7-6(5)` 表記の文字列パース (現状は表示装飾のみ)

### 6.4 元 ROADMAP の未着手 Stage
- S19 インポート (CSV / Apple Watch、Google Calendar は本セッションで先行実装済)
- S20 セッション自動連関 (試打→大会、練習→大会 の自動リンク)
- S21 リリース準備 (v3 凍結、日付形式マイグレーション)

---

## 7. 検証環境 (Dev モード)

`http://localhost:8081/v4/index.html?dev=1[&reset=1]`
- Google SSO スキップ、fixture (`v4/dev-fixture.json`) で起動
- 本番 Firestore に書き込まない (データ保護)
- `&reset=1` で localStorage 初期化

`v4/dev-fixture.json` は `.gitignore` で git 管理外。次セッションでは `cp tennis_db_<latest>.json v4/dev-fixture.json` で配置。

### Playwright e2e
`node tests/e2e/run.mjs` で 13 テスト走る (要 `C:\Program Files\nodejs\` PATH)

---

## 8. 次セッション開始時のアクション

```
新セッション担当者がやるべき手順:

1. CLAUDE.md を最初から読む (特に R0 フック前提)
2. このファイル (HANDOFF_v4_S16.md) を最初から最後まで読む
3. MEMORY.md を読む (特に「Stage 番号自動 increment 禁止」「フック設定なしで作業するな」)
4. .claude/settings.json と .claude/hooks/ を確認 (4 ファイル揃っているか)
5. ユーザーに状況確認:
   - 「現バージョン v4.5.0-S16 を確認しました」
   - 「次に何を始めますか? 新しい Stage に進む場合は Stage 番号もご指示ください」
6. ユーザーから次のタスクを受けたら:
   - Plan/Insights タブ再着手なら → §2 の手順 (REQUIREMENTS 確認 → preview 承認 → 実装)
   - 新機能 / リク対応なら → REQUIREMENTS / WIREFRAMES / DECISIONS 該当節を必ず読む
   - 既存 polish なら → 静的プロト承認なしで進めて良いか確認
7. 1 タスク = 1 push、push 前に必ずユーザー承認、Stage 番号は勝手に決めない
```

---

## 9. 重要な実 file パス

| 用途 | パス |
|---|---|
| メイン source | `src/app.jsx`, `src/core/`, `src/domain/`, `src/ui/` |
| バージョン定数 | `src/core/01_constants.js` `APP_VERSION` |
| ビルド | `build.ps1` (PowerShell)、output: `v4/index.html` |
| 検証 fixture | `v4/dev-fixture.json` (gitignored) |
| Calendar 取り込み JSON | `v4/calendar_import.json` (git に入れる) |
| 静的プロト | `preview_<topic>_p<N>.html` (repo root) |
| e2e | `tests/e2e/run.mjs` |
| Cloud Functions | `functions/index.js` (Anthropic Claude Haiku 経由要約) |
| 設計書 | `REQUIREMENTS_v4.md` / `ARCHITECTURE_v4.md` / `ROADMAP_v4.md` / `WIREFRAMES_v4.md` / `DESIGN_SYSTEM_v4.md` / `DECISIONS_v4.md` / `TENNIS_RULES.md` |
| **claude フック** | `.claude/hooks/*.ps1`, `.claude/settings.json` |

### 2026-05-04 〜 06 で追加された主要ファイル
| ファイル | 内容 |
|---|---|
| `src/ui/sessions/_NumWheel.jsx` | TimeWheel/DurationWheel/NumWheel + WheelSheet (Bottom sheet) + WheelColumn (3D 立体) |
| `src/ui/home/RecentResults.jsx` | F4.4「最近の好成績」カード |
| `src/ui/sessions/PracticeEditForm.jsx` (修正) | matches[] 操作 + 案 3' の + ボタン |
| `src/ui/sessions/PracticeDetail.jsx` (修正) | matches[] 読み取り表示 |
| `src/domain/match_helpers.js` (大幅追加) | matchFormat 関連 helpers (resolveMatchFormat / formatFromPreset / computeTbState / applyTbDetails) |
| `TENNIS_RULES.md` §3.1 / §9.1 | 草トーローカルルール + matchFormat データモデル |
| `preview_s18_p1.html` 〜 `p13.html` | 静的プロト (タップ領域 / 試合形式 / TB 入力 / wheel デザイン段階 / practice matches UI) — ファイル名の `s18` は当時の Stage 番号誤認の名残、内容は S16 の polish |
| `.claude/hooks/*.ps1` (4 ファイル) | フック safety system (Stage 番号事故対策) |

---

## 10. 確立されたルール (memory に保存済、必ず参照)

| ルール | 要点 | memory file |
|---|---|---|
| ⚠️ データ破壊事故 (2026-05-03) | 値変換禁止 / build 承認後のみ / 暗黙確定禁止 | `feedback_data_destruction_2026_05_03.md` |
| ⚠️ Stage 番号自動 increment 禁止 (2026-05-05) | claude が勝手に -S<N> 変更禁止、毎回ユーザー確認 | `feedback_stage_numbering_2026_05_05.md` |
| ⚠️ フック設定なしで作業するな (2026-05-06) | hooks/ + settings.json hooks 必須、claude 自制では再発 | `feedback_hooks_required_2026_05_06.md` |
| バージョニング | X = 互換性壊す、Y = 機能追加 (Z リセット)、Z = 修正 | `feedback_versioning.md` |
| バージョン番号を必ず伝える | push のたびに独立行で `v4.X.Y-S<N>` を明示 | `feedback_version_announcement.md` |
| 小さな変更でも事前確認 | ファイル名・ボタン文言・サブ機能・バージョン解釈、些細でも commit 前に確認 | `feedback_confirm_small_changes.md` |
| push は確認してから | git push 前にユーザーの確認 | `feedback_push_confirmation.md` |
| 1 タスク = 1 push | 小刻み patch 禁止 | `feedback_commit_granularity.md` |
| 謝罪は単独で | 次アクションと混ぜない、軽口で流さない | `feedback_apology_discipline.md` |
| 平易な言葉 | 専門用語禁止 | `feedback_plain_language.md` |
| 更新完了は明示的に | 「更新完了・F5 で確認」を独立行 | `feedback_update_announcement.md` |
| 選択肢は数字で | 1, 2, 3 (a/b/c 禁止) | `feedback_choice_notation.md` |
| 2 段階プレビュー | UI 変更は preview_s<N>_p<M>.html 承認 → 実装 | `feedback_two_stage_preview.md` |
| 「セッション」用語 NG | v4 は「Stage (S<N>)」、v3 は「Phase」と呼ぶ | (CLAUDE.md にも記載) |
| タップ領域 44px 違反は変更しない | レイアウト崩壊リスク、提案も禁止 | `feedback_no_tap_area_resize.md` |
| Stage 番号変更時の整合 | grep で全文書を同時更新 | `feedback_stage_renumbering.md` |
