# Tennis DB v4 — S17.x 引き継ぎ書 (2026-05-11 更新、code splitting 段階 2-1 完了、段階 2-2 着手前)

> **このファイルは、文脈を知らない次セッションの Claude が単独で読んで現状を把握できることを目的とする。最初に必ず全文読む。**

---

## 0. 現在地

- **APP_VERSION**: `v4.7.13-S17` (`src/core/01_constants.js`)
- **直近 push**: `ff0c01b` (= Code splitting 段階 2-1 = InsightsTab を heavy bundle に同梱)
- **working tree**: clean (= 4.7.13-S17 push 状態と同一)
- **stash@{0}**: 依然 Phase B Carry Over (= 旧 528.9 KB で退避、段階 2-2 完了後 = core が更に軽くなった状態で resume 検討)

---

## 1. 次セッション最初のアクション

### Code splitting 段階 2-1 まで完了済の上で、**Code Splitting 段階 2-2** を着手する。

段階 2-2 = MatchEditModal / GameTracker は core 維持の制約下で、残り heavy 候補 (= **QuickTrialMode 最優先**、その後 SettingsModal / MergeModal / Gear 詳細系 / PeriodDetailView) を heavy bundle 側に順次切出。**目標: core < 350 KB (HANDOFF §3 安全圏)**。

段階 1 は PlanTab + plan_assist.js を切出して core 525 → 488 KB (37 KB 減、commit e4dd227)。段階 2-1 は InsightsTab を切出して core 488 → 479 KB (9 KB 減、commit ff0c01b)。累計 46 KB 減で HANDOFF §3 目標 (< 350 KB) には依然未達のため、段階 2-2 継続が必要。

### 次の優先順位 (= 段階 2-2 着手前の判断分岐、ユーザー方針 2026-05-10、2026-05-11 更新)

iPhone 実機で 4.7.13-S17 (core 479 KB) を確認後、以下で分岐:
- **十分軽い (起動・タブ切替に体感ストレスなし)** → 段階 2-2 を後回し、stash@{0} の **Phase B Carry Over** を resume + push (= 4.7.14-S17 候補)
- **まだ不安定 (試合運用に不安残る)** → **段階 2-2 を優先** で実施 (= core < 350 KB を目指す)、Phase B はその後

段階 2-2 進め方 (= 段階 1 / 2-1 と同じ厳守):
1. heavy 候補を決める (= §3 段階 2-2 候補リスト + iPhone 動作確認の感触から、QuickTrialMode を最優先)
2. 候補の依存を読む (= grep + Read で外部参照を全棚卸し、QuickTrialMode は Sessions 内部依存が複雑な可能性 → 念入りに)
3. core に残す / heavy に逃がす を分類 (= A/B/C/D 4 分類)
4. **1 対象ずつ切り出す** (= バンドル切出禁止、PlanTab / InsightsTab と同じ単位粒度)

---

## 2. 3 者議論 (ユーザー / ChatGPT / Claude Code) で確定した方針

### 設計合言葉

```
まず軽く戻す。
ユーザーに書かせない。
AI の土台だけ作る。
必要になったら分ける。
```

### Player Model (= AI が一貫した文章を作るための土台)

- **構造**: 単一 profile 構造で開始 (3 層 Core/Dynamic/Defaults は将来必要時に分離)
- **visibility**: 2 値 (`partner` / `private`) で開始、4 種は将来拡張
- **legacyProfile**: アプリ内に保持しない (= Firestore 履歴で残る)
- **racket / stringing**: 移植しない (= Gear master が正)、`gearPolicy` 新規追加
- **derivedStats**: Phase A1 では作らない、Phase E 以降

### Phase 順序

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | 4.7.9-S17 fcbdeca の AI 機能 現状調査 | ✅ 完了 (4.7.10-S17 で AI ボタン feature flag 非表示) |
| **A1** | **v2 profile を v4 Player Model Core に移植 (データのみ、UI なし)** | ✅ **完了 (4.7.11-S17、commit 8fed399)** |
| Code Splitting 段階 1 | PlanTab だけ heavy 化、core 450 KB 未満を目標 | ✅ 完了 (4.7.12-S17、commit e4dd227、core 488 KB / heavy 40 KB) |
| Code Splitting 段階 2-1 | InsightsTab を heavy 同梱、累計 < 350 KB を目標 | ✅ 完了 (4.7.13-S17、commit ff0c01b、core 479 KB / heavy 52 KB、目標 < 350 KB は未達 → 段階 2-2 へ) |
| **Code Splitting 段階 2-2** | **QuickTrialMode 最優先、その後 SettingsModal / MergeModal / Gear 詳細系 / PeriodDetailView を順次切出** | 🔄 **次セッションで着手** |
| B | 前回 Plan 自動継承 (1 タップで前回作戦・ギア・リセット文をコピー) | ⏸ stash@{0} に試作あり、code splitting 後に resume |
| C | Generated Defaults (デフォルト作戦・リセット文・継続テーマ) | 着手前 |
| A2 | Core Profile 表示・編集画面の最低限復活 | 着手前 |
| D | Strategy AI 整理 (Cloud Functions deploy 含む) | 着手前 (= Player Model 整備後) |
| E | Reset Phrase AI 生成 + 試合後 profile 更新候補 | 着手前 |

### AI 機能の状態

- 4.7.9-S17 で AI 整理 / AI 生成の UI + Cloud Functions `planAssist` 実装済
- 4.7.10-S17 で feature flag (`_PLAN_AI_ENABLED = false`) で非表示中
- Cloud Functions `planAssist` は **未 deploy** (= deploy しないと NOT_FOUND エラー)
- Phase D 着手時に Player Model 参照前提に修正 → flag を true に → deploy
- 即 revert は不要、ただし deploy しない

---

## 3. Code Splitting 段階 1 + 段階 2-1 完了報告 + 段階 2-2 詳細実装計画

### 段階 1 完了 (4.7.12-S17 / commit e4dd227、2026-05-10)

- **機構**: PlanTab.jsx + plan_assist.js を `v4/bundle-heavy.js` に切出、Plan タブ初回タップ時に動的 `<script>` tag injection で on-demand 読込
- **bridge**: `build.ps1` footer で `window.__TennisDBCore = { C, font, APP_VERSION, Icon, Modal, Input, Textarea, NumWheel, sortByStatusAndOrder, RACKET_STATUS_PRIORITY, STRING_STATUS_PRIORITY, fbFunctions }` 公開、heavy 冒頭で destructure 受取
- **cache busting**: `./bundle-heavy.js?v=APP_VERSION` (= core bridge の APP_VERSION を `_head.html` 内 `loadHeavy()` が参照)
- **expose**: `window.__TennisDBHeavy.PlanTab` (= heavy 末尾で登録、build 時 + runtime で存在チェック)
- **PlanTab.jsx 修正**: `today()` 呼出 → `todayIso` props 化 (1 箇所のみ最小修正、props 全面化はせず段階 2 候補)
- **サイズ**: core 525 KB → **488 KB** (37 KB 減、iPhone JIT deopt 閾値 525 KB 割り込み)、heavy 40 KB

### 段階 2-1 完了 (4.7.13-S17 / commit ff0c01b、2026-05-11)

- **機構**: InsightsTab を `v4/bundle-heavy.js` に同梱 (= 1 bundle 維持、PlanTab と segment 分けない)、Insights タブ初回タップ時に同 `loadHeavy()` 共有
- **bridge 拡張**: `window.__TennisDBCore` に **`RADIUS` / `normDate` / `_normalizeMatchResult`** 追加 (= `_normalizeMatchResult` は内部 helper だが今回は既存名のまま公開、リネームは将来段階で検討)
- **expose 追加**: `window.__TennisDBHeavy.InsightsTab` (= build 時 + runtime で存在チェック)
- **`loadHeavy()` 成功条件強化**: `PlanTab && InsightsTab` 両方確認に変更 (= ChatGPT 指摘: 古い bundle キャッシュで部分 expose の場合に Loader が永久 placeholder ループするのを防ぐ。将来 component 追加時は同条件にも追加)
- **InsightsTab.jsx 修正**: なし (= props 既に受取、構造変更不要、依存は bridge で全解決)
- **app.jsx 修正**: `InsightsTabLoader` 新規追加 (= PlanTabLoader と同パターン)
- **サイズ**: core 488 KB → **479 KB** (9 KB 減、累計 525 → 479 = 46 KB 減)、heavy 40 KB → **52 KB**
- **HANDOFF §3 目標 (< 350 KB) 依然未達** → 段階 2-2 が必要

### 大方針 (段階 2-2)

| 区分 | 配置 |
|---|---|
| **核心 (core)** | 起動・全タブ root・Home・Sessions 一覧・Gear 概要・**GameTracker / MatchEditModal** (= 試合中重要、core 維持)・共通 UI | inline で `_head.html` に直接埋込 (現方式維持) |
| **重い機能 (heavy)** 段階 2-2 追加 | **QuickTrialMode (最優先)**、その後 **SettingsModal / MergeModal / Gear 詳細系 (RacketDetailView / PeriodDetailView) / TournamentEditForm 等** | 既存 `v4/bundle-heavy.js` に追記 (= 1 ファイル維持) |

### 段階 2-2 候補と注意点

| 候補 | サイズ (unminified) | 試合中使用? | 注意点 |
|---|---|---|---|
| **QuickTrialMode** (最優先) | 35 KB | × | Sessions 内部依存が複雑な可能性 (= SessionsTab / trial 保存 / gear state / form 部品)、依存棚卸しを念入りに |
| SettingsModal | 14 KB | × | core/common 配下、独立性高め |
| MergeModal + master_cleanup.js | 27 KB | × | Master Cleanup、独立性中、master_cleanup.js も heavy 同梱 |
| RacketDetailView | 19 KB | × | Gear 詳細、Gear 一覧から遷移 |
| PeriodDetailView | 18 KB | × | Period 詳細、Gear 一覧から遷移 |
| YearHeatmap (+ YearHeatmapCell + WeekPanel) | 13 + 補助 KB | △ | Sessions タブ内表示、デフォルト表示か切替後かによる (= 要事前調査) |
| TournamentEditForm | 19 KB | △ | 試合直後に使う可能性、要相談 |

### 実装手順 (= 段階 1 / 2-1 と同じ厳守パターン)

| Step | 内容 |
|---|---|
| 1 | 候補ごとに依存関係棚卸し (= core 側の関数・コンポーネント・定数を直接参照していないか grep) |
| 2 | 必要なら `window.__TennisDBCore` に新規エントリ追加 (`build.ps1` core bridge footer 拡張) |
| 3 | heavy 冒頭 destructure に新規エントリ追加 (`build.ps1` Step 3.5 の prelude 拡張) |
| 4 | core 側 src/ui/* / src/domain/* から候補を `Where-Object` で除外 (`build.ps1` D-1 / D-2 step に追加) |
| 5 | heavy 側 expose 末尾に新規 component を追加 (例: `window.__TennisDBHeavy.QuickTrialMode = QuickTrialMode;` + `if (typeof QuickTrialMode === "undefined") throw...`) |
| 6 | **`_head.html` の `loadHeavy()` 成功条件にも新規 component 追加** (= ChatGPT 指摘の永久 placeholder ループ防止、段階 2-1 で確立した規律) |
| 7 | core から該当 component を直接 import している箇所を Loader 経由に変更 (= app.jsx で `PlanTabLoader` / `InsightsTabLoader` と同じパターン)。Sessions タブ内部 component の場合は親 component の中に Loader を置く (= タブ単位より複雑) |
| 8 | ビルド + サイズ確認 (= core < 350 KB が安全圏、< 300 KB が理想) + heavy bundle に React 本体混入していないこと確認 |
| 9 | dev mode (Tennis DB Dev Server, port 8081) で全タブ + 切出した機能のモーダル開閉まで動作確認 |
| 10 | iPhone (`http://192.168.1.4:8080`) で動作確認 |
| 11 | APP_VERSION bump 承認 → push 承認 → push (= 4.7.14-S17 候補) |

### 厳守ルール (= 段階 1 / 2-1 と同じ、繰り返しても重要)

- **`<script defer>` は使わない** (= on-demand 読み込みにならない)
- **React は heavy 側に二重バンドルしない** (= `--jsx-factory=React.createElement` で global 参照、`--external:react` 不要)
- **core → heavy を通常 import しない** (= 循環依存防止)
- **MatchEditModal / GameTracker は core 維持** (= 試合中重要、絶対 heavy に出さない)
- **編集前に依存棚卸し → ユーザー承認 → 編集** (= ChatGPT 3 者議論厳守)
- **build.ps1 / src/_head.html / src/app.jsx / APP_VERSION 等の重要ファイル編集前にユーザー承認**
- **`loadHeavy()` 成功条件に新規 component を必ず追加** (= 段階 2-1 で確立した規律、永久 placeholder ループ防止)

### 失敗時の rollback

- 段階 2-1 push (`ff0c01b`) は dev mode 全タブ + Plan / Insights 両方の起動順序パターン確認済 → 段階 2-2 で壊れたら `git reset --hard ff0c01b` で 4.7.13-S17 に戻る
- iPhone で動作確認するまで push しない

---

## 4. stash の中身

| stash | 内容 |
|---|---|
| stash@{0} | 4.7.12-S17 Phase B Carry Over 試作 (PlanTab.jsx + ConfirmDialog.jsx + 01_constants.js + v4/index.html)、bundle 528.9 KB で iPhone limit 越えのため退避 |
| stash@{1} | S17.1 Practice Focus Card (旧議論時の試作、不要なら drop 可) |
| stash@{2} | S17.x destructive wheel picker work (参考用、drop しない) |

---

## 5. 重要な実 file パス

| 用途 | パス |
|---|---|
| メイン source | `src/app.jsx`, `src/core/`, `src/domain/`, `src/ui/` |
| バージョン定数 | `src/core/01_constants.js` `APP_VERSION` (= 編集前にユーザー確認、勝手に変えない) |
| ビルドスクリプト | `build.ps1` (= 重要ファイル、編集前にユーザー確認) → `npx esbuild` → `v4/index.html` |
| 進捗ダッシュボード | `progress.html` (Claude Code preview port 8082) |
| 設計書 | `REQUIREMENTS_v4.md` / `WIREFRAMES_v4.md` §2.9 (Plan タブ) / `DECISIONS_v4.md` S17 / `DESIGN_SYSTEM_v4.md` |
| Cloud Functions | `functions/index.js` (= `planAssist` / `summarizeMemo`、Anthropic Claude Haiku 経由) |
| Claude フック | `.claude/hooks/*.ps1`, `.claude/settings.json` (= 編集前にユーザー確認) |

---

## 6. 検証環境

### サーバ起動 (Claude が毎セッション開始時に必ず最初に実行) — 2026-05-10 確立

```
Start-Process powershell -Verb RunAs -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','D:\Downloads\Claude\tennis\serve.ps1'
```

UAC 出ない設定済 (= ユーザー PC) なので即時 admin 起動。これで port 8080 が LAN 公開モード (`http://+:8080/`) で動き、PC + iPhone 両方アクセス可能。

**禁止事項** (memory `feedback_consistent_verification_method.md` 「思いつきで変えない」):
- npx http-server / python http.server 等の別サーバを立ち上げない
- serve.ps1 を非 admin で起動しない (= LAN 公開モードが localhost 限定にフォールバック → iPhone で見られない)
- サーバが落ちていたら **同じコマンド** で起動し直す、別方法を試行錯誤しない

### URL

- **本番モード (PC)**: `http://localhost:8080/v4/index.html` (port 8080、ユーザー使用、上記コマンドで Claude が起動)
- **iPhone 実機**: `http://192.168.1.4:8080/v4/index.html` (= 同一 LAN、本番モード固定)
- **dev モード (PC, Claude preview)**: `http://localhost:8081/v4/index.html?dev=1` (= Tennis DB Dev Server、Google ログイン skip + fixture、Claude が `preview_start "Tennis DB Dev Server"` で起動)
- **進捗ダッシュボード**: Claude Code preview パネル「Tennis DB Progress」(port 8082)
- v4 が主運用、V2/V3 は不具合時のみ触る (ユーザー指示 2026-05-09)

---

## 7. ユーザーから受けた重要規律 (memory に保存済、再読の必要なし)

- 「俺は試合運用で iPhone を使う」 (`feedback_iphone_build_priority.md`)
- 「専門用語ばかりで説明するな」 (`feedback_plain_language.md`)
- 「dev モードでちゃんと検証しないと大事故になる」 (`feedback_consistent_verification_method.md`)
- 「コードを汚すな」 (= 進捗バナーをアプリ本体に埋込で激怒、独立 progress.html に分離)
- 「Stage 番号を勝手に変えるな」 (`feedback_stage_numbering_2026_05_05.md`)
- 「V4 が主運用、V2/V3 は不具合時のみ」 (2026-05-09)
- **「3 者議論で進める」** (= ユーザー / ChatGPT / Claude Code、Claude Code が勝手に判断・実装・push しない)
- **「先送り禁止だが完璧設計でなくてよい」** (= 段階的に最小実装 → 運用 → 必要なら拡張)
- **「実装の前に UI/UX を preview HTML で議論」** (= memory `feedback_two_stage_preview.md`)
- **「git push 前にユーザーの確認を取る」** (= 各機能ごとに改めて承認、まとめ承認禁止)

---

## 8. 次セッション開始時のアクション

```
1. CLAUDE.md を最初から読む (R0 フック前提)
2. 本ファイル (HANDOFF_v4_S17.md) を最初から最後まで読む
3. §6 の serve.ps1 admin 起動コマンドを実行 (= port 8080 LAN 公開、PC + iPhone 両方アクセス可能化)
4. progress.html を Tennis DB Progress preview パネル (port 8082) で開く
5. ユーザーに状況確認:
   「現バージョン v4.7.13-S17 push 済 (= Code splitting 段階 2-1 完了)。
    次は code splitting 段階 2-2 (= QuickTrialMode 最優先、目標 core < 350 KB) に着手で良いですか?」
6. ユーザー OK → 上記 §3 の段階 2-2 実装手順通り着手
   - build.ps1 編集前に変更内容と理由を提示してユーザー承認
   - APP_VERSION bump 前にも承認
   - push 前にも承認
7. 段階 2-2 完了 → dev mode 全タブ動作確認 → iPhone 動作確認 → push (4.7.14-S17 候補)
8. その後 stash@{0} の Phase B Carry Over を resume + push (4.7.15-S17 候補)
```

---

## 9. 直近 commit 履歴

| commit | バージョン | 内容 |
|---|---|---|
| `ff0c01b` | 4.7.13-S17 | Code splitting 段階 2-1: InsightsTab を heavy bundle に同梱 (core 479 KB / heavy 52 KB、bridge に RADIUS / normDate / _normalizeMatchResult 追加) |
| `e4dd227` | 4.7.12-S17 | Code splitting 段階 1: PlanTab + plan_assist.js を heavy bundle 化 (core 488 KB / heavy 40 KB、bridge `window.__TennisDBCore` 経由) |
| `8fed399` | 4.7.11-S17 | Phase A1 = v2 profile を v4 に移植 (データのみ、UI なし) |
| `8adbb50` | 4.7.10-S17 | AI ボタン feature flag で非表示 |
| `fcbdeca` | 4.7.9-S17 | AI 段階 1+2 (Strategy 整理 / Reset Phrase 生成) 実装、Cloud Functions 未 deploy |
| `97d8cea` | 4.7.8-S17 | Plan Reset Phrase + GameTracker 連動 |
| `cbe8cad` | 4.7.7-S17 | 棚上げ解消 (MatchDetailView 新規) + バグ修繕 4 件 + ESM build |
| `a0b57b6` | 4.7.4-S17 | Phase 5: Home 課題行 → Plan タブ遷移 |
| `fd90baa` | 4.7.5-S17 | Phase 4: Plan Gear クイック選択 (試打 + 大会 mix) |
| `f3893e5` | 4.7.3-S17 | Phase 3.5b: PeriodDetail → SessionDetail → 戻るで一覧まで飛ぶ不具合修繕 |
| `b6155f6` | 4.7.2-S17 | Phase 3.5: ラケットセッティング 4 フィールド統一 + 戻るバグ修繕 + V2 fallback |
| `a2d884f` | 4.7.1-S17 | Phase 2: Master Cleanup 抜本対応 + esbuild build 修繕 |
| `a830827` | 4.6.5-S17 | Phase 1: Plan タブ作戦室実装 + 既存機能健全化 |
