# Tennis DB v4 — S17.x 引き継ぎ書 (2026-05-10 更新、code splitting 着手前)

> **このファイルは、文脈を知らない次セッションの Claude が単独で読んで現状を把握できることを目的とする。最初に必ず全文読む。**

---

## 0. 現在地

- **APP_VERSION**: `v4.7.11-S17` (`src/core/01_constants.js`)
- **直近 push**: `8fed399` (= Phase A1 = v2 profile 移植、データのみ、UI なし)
- **working tree**: clean (= 4.7.11-S17 push 状態と同一)
- **stash@{0}**: Phase B Carry Over (= 4.7.12-S17 試作、bundle 528.9 KB で iPhone limit 越えのため退避、code splitting 後に resume 予定)

---

## 1. 次セッション最初のアクション

### Phase A1 まで完了済の上で、**Code Splitting (= 段階 1: PlanTab だけ heavy 化)** を着手する。

理由: Phase B (= Plan Carry Over) を実装したら bundle 528.9 KB で iPhone JIT deopt 閾値 (約 525 KB) を超えた。機能追加を続けると iPhone で重さ問題が再発するため、**機能追加より先に build 方式を直す** (memory `feedback_iphone_build_priority.md`)。

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
| **Code Splitting 段階 1** | **PlanTab だけ heavy 化、core 450 KB 未満を目標** | 🔄 **次セッションで着手** |
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

## 3. Code Splitting 段階 1 — 詳細実装計画 (ChatGPT 最終整理 2026-05-10)

### 大方針

| 区分 | 配置 |
|---|---|
| **核心 (core)** | 起動・全タブ root・Home・Sessions 一覧・Gear 概要・**GameTracker / MatchEditModal** (= 試合中重要、core 維持)・共通 UI | inline で `_head.html` に直接埋込 (現方式維持) |
| **重い機能 (heavy)** 段階 1 | **PlanTab.jsx だけ** | 外部ファイル `v4/bundle-heavy.js`、必要時に動的 script tag injection で読み込み |

### 実装手順 (ChatGPT 推奨厳守)

| Step | 内容 |
|---|---|
| 1 | 現状の bundle サイズ・iPhone 起動時間記録 |
| 2 | `build.ps1` を改修: bundle-core (= inline) と bundle-heavy.js (= 外部 file) の 2 ファイル生成。esbuild で heavy bundle は `--format=iife --global-name=__TennisDBHeavy --external:react`。core は従来通り `--format=esm`。 |
| 3 | core から PlanTab を直接 import しない (= 全 import 箇所を grep で洗い出し) |
| 4 | `_head.html` に core inline 直前で `loadHeavy()` 関数を inline 定義: `Plan タブ初回表示時に動的 <script> tag injection`、Promise キャッシュで二重読み込み防止 |
| 5 | `app.jsx` で Plan タブ render 部分: `if (window.__TennisDBHeavy?.PlanTab) → <window.__TennisDBHeavy.PlanTab .../>`、未読込なら "計画タブを読み込んでいます..." 表示 + `loadHeavy()` 呼び出し、読込完了で setState 再 render |
| 6 | ビルド + サイズ確認 (= core が 450 KB 未満で最低ライン、350 KB 前後で安全圏、300 KB 以下が理想) |
| 7 | dev mode + iPhone 実機で全タブ動作確認 |
| 8 | 軽さ確認 OK なら push (= 4.7.12-S17 として code splitting 段階 1) |
| 9 | core が 450 KB 以上なら段階 2 (= MatchEditModal/GameTracker は維持、それ以外の heavy 候補を順次移行) |

### 厳守ルール

- **`<script defer>` は使わない** (= MDN 公式: defer は parser-blocking を避けるが初期ロード中に評価される、on-demand 読み込みにならない)
- **React は heavy 側に二重バンドルしない** (= `--external:react`、heavy 側は `window.React` を参照)
- **expose する関数は最小限** (= PlanTab だけ、グローバル名は `window.__TennisDBHeavy`)
- **core → heavy を通常 import しない** (= 循環依存防止)
- **MatchEditModal / GameTracker は core 維持** (= 試合中重要)

### 段階 2 候補 (= 段階 1 後に core が 450 KB 以上なら着手)

Master 管理 / Setup Picker / Period Detail / Quick Trial / Gear 詳細比較 / Insights グラフ / AI 関連 / 大きい編集 modal

### 失敗時の rollback

- stash@{0} は Phase B 試作 = 退避中、code splitting で壊れたら `git reset --hard 8fed399` で 4.7.11-S17 に戻る
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
3. progress.html を Tennis DB Progress preview パネル (port 8082) で開く
4. ユーザーに状況確認:
   「現バージョン v4.7.11-S17 push 済 (= Phase A1 完了)。
    次は code splitting 段階 1 (= PlanTab だけ heavy 化) に着手で良いですか?」
5. ユーザー OK → 上記 §3 の手順通り着手
   - build.ps1 編集前に変更内容と理由を提示してユーザー承認
   - APP_VERSION bump 前にも承認
   - push 前にも承認
6. 段階 1 完了 → iPhone 軽さ確認 → push (4.7.12-S17 候補)
7. その後 stash@{0} の Phase B Carry Over を resume + push (4.7.13-S17 候補)
```

---

## 9. 直近 commit 履歴

| commit | バージョン | 内容 |
|---|---|---|
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
