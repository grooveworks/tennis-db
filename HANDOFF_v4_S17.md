# Tennis DB v4 — S17 引き継ぎ書 (Phase 2 + Phase 3.5 完了、2026-05-09 更新)

> **このファイルは、文脈を知らない次セッションの Claude が単独で読んで現状を把握できることを目的とする。**

---

## 0. 現バージョン / 直近の commit

- **APP_VERSION**: `v4.7.5-S17` (`src/core/01_constants.js`)
- **直近 push**: `a0b57b6` (v4 S17 Phase 5: Home 課題行 → Plan タブ遷移)
- **次 push 予定**: v4.7.5-S17 = Phase 4 (B 案、試打 + 大会 mix リスト) → S17 全 Phase 完了

---

## 1. S17 完了状況 (積み残し 9 件 全消化 ✓)

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 1 | 既存機能健全化 + Plan タブ作戦室実装 (積み残し #2/#3/#4/#5) | ✅ push 済 (a830827, v4.6.5) |
| Phase 2 | Master Cleanup 抜本対応 + master 管理 UI (#1/#6/#9) + esbuild build 修繕 | ✅ push 済 (a2d884f, v4.7.1) |
| Phase 3 | Racket Board reorder UI (#7) | ✅ 過去 commit 742d8b2 で実装済と判明 |
| Phase 3.5 | 健全化 (ラケット編集 4 フィールド統一 / 戻るバグ 1) | ✅ push 済 (b6155f6, v4.7.2) |
| Phase 3.5b | 戻るバグ 2 (Period → Session → 戻るで一覧まで飛ぶ) | ✅ push 済 (f3893e5, v4.7.3) |
| Phase 5 | Plan ↔ Home 連携 (#8 Home 課題行クリック) | ✅ push 済 (a0b57b6, v4.7.4) |
| Phase 4 | Plan 本体仕上げ (Gear Decision クイック選択 = 試打 + 大会 mix リスト) | ✅ 完了 (push 直前, v4.7.5) |

---

## 2. Phase 4 で発覚した bundle 限界 (次 Stage 検討事項)

iPhone WebKit JIT は **bundle 525 KB 前後で deopt する閾値** がある模様:
- v4.7.4 (Phase 5 push 後): 525.4 KB → iPhone 軽い ✓
- v4.7.5 当初実装 (Phase 4 完全版、segment 切替): 526.4 KB → iPhone 「読み込みに時間がかかる、反応しない」レベルの重さ
- v4.7.5 縮小実装 (Phase 4 B 案、segment 撤廃 mix リスト): 525.6 KB → iPhone 軽い ✓

S18 以降で機能追加すると **再び 525 KB を超えて再発リスク**。memory `feedback_iphone_build_priority.md` 「機能追加より build 方式の修繕を最優先」 → S18 以降で **build 方式の code splitting** (起動時 core のみ、Plan/Gear などは lazy load) を検討するべき。

---

## 2. 直近の build 方式修繕 (Phase 2 で実施)

**経緯**: Phase 2 で v4/index.html が 911 KB に膨張 → iPhone Safari/Chrome で 5 分以上ロード = 試合運用不可。

**真犯人**: `@babel/standalone` のブラウザ側 JSX transpile。コード量が増えるとブラウザ JIT が破綻する。

**修繕**: `build.ps1` を esbuild 事前 transpile に切替 (PC で JSX → JS 変換 + minify、ブラウザは直接実行)。
- `src/_head.html` から Babel CDN 削除、`<script type="text/babel">` → `<script>` に変更
- ビルドサイズ 911 KB → 521 KB
- iPhone ロード 5 分以上 → 数秒に復帰 (検証済 2026-05-09)

`build.ps1` 実行: PowerShell から直接 (`& .\build.ps1` or `& "D:\Downloads\Claude\tennis\build.ps1"`) → `.build_tmp/` に一時 jsx 連結 → `npx esbuild` → `v4/index.html` 出力。

---

## 3. Phase 3.5 健全化 (本セッションで実施、push 待ち)

ユーザー報告の不具合 2 件を消化:

### 3.1 RacketEditModal のストリング/テンション統一

**問題**: ラケット詳細 → 編集 で出る「現在のストリング」「現在のテンション」が単純 text Input、他 form (試打/練習/大会) の SetupPicker + Combobox + NumWheel と一貫性なし。

**修繕**:
- データ仕様: `currentString` (1 フィールド文字列) → `currentStringMain` / `currentStringCross` / `currentTensionMain` / `currentTensionCross` (4 フィールド) に統一
- UI: SetupPickerButton + MasterField (縦糸/横糸) + NumWheel (テンション縦/横) で他 form と同 pattern
- 互換戦略 (戦略 2): 新 4 フィールドのみ書き、旧 1 フィールドは touch しない、読込時に旧から fallback で初期化
- v3 の不具合時のみ運用に整合 (V4 で更新しても V3 では古い旧フィールドが見えるが、V4 主運用なので OK)

**新ファイル**: `src/domain/racket_string_compat.js` (`getRacketString` / `getRacketTension` / `formatRacketStringDisplay` / `formatRacketTensionDisplay`)

**変更ファイル**: `src/core/05_schema.js` / `src/ui/gear/RacketEditModal.jsx` / `src/ui/gear/RacketDetailView.jsx` / `src/ui/gear/GearTab.jsx` / `src/app.jsx`

### 3.2 PeriodDetailView から戻ると RacketDetail も閉じる不具合

**問題**: ラケット詳細 → 張り替え履歴 → ある期間タップ → PeriodDetailView 表示 → 戻る → ラケット詳細を飛び越して **ラケット一覧まで戻る**。

**原因**: RacketDetailView と PeriodDetailView の両方が popstate listener を登録しており、PeriodDetail から back() した時に **両方の handler が発火**して Racket Detail も閉じてしまう。

**修繕**: 各 listener で `e.state.tdb` を確認し「自階層がまだ history に残っているなら閉じない」チェックを追加。

**変更ファイル**: `src/ui/gear/RacketDetailView.jsx` / `src/ui/gear/PeriodDetailView.jsx`

---

## 4. 残積み残し

S17 積み残し 9 件は全て消化。次 Stage (S18 以降) の検討事項:

- **build 方式の code splitting** (上記「2. bundle 限界」参照、機能追加で 525 KB を再び超えると iPhone deopt の再発リスク)
- ROADMAP の S18 (元 Insights 凍結解除) 以降の本来計画

---

## 5. 重要な実 file パス

| 用途 | パス |
|---|---|
| メイン source | `src/app.jsx`, `src/core/`, `src/domain/`, `src/ui/` |
| バージョン定数 | `src/core/01_constants.js` `APP_VERSION` |
| ビルドスクリプト | `build.ps1` (PowerShell) → `npx esbuild` → `v4/index.html` |
| 進捗ダッシュボード | `progress.html` (Claude Code preview port 8082) |
| 設計書 | `REQUIREMENTS_v4.md` / `ARCHITECTURE_v4.md` / `ROADMAP_v4.md` / `WIREFRAMES_v4.md` / `DESIGN_SYSTEM_v4.md` / `DECISIONS_v4.md` / `TENNIS_RULES.md` |
| Claude フック | `.claude/hooks/*.ps1`, `.claude/settings.json` |

---

## 6. 検証環境

- **本番モード (PC)**: `http://localhost:8080/v4/index.html` (port 8080)
- **dev モード (PC, Claude preview)**: `http://localhost:8081/v4/index.html` (Tennis DB Dev Server)
- **進捗ダッシュボード**: Claude Code preview パネル「Tennis DB Progress」(port 8082)
- **iPhone 実機**: `http://192.168.1.4:8080/v4/index.html` (本番モード固定)

V4 が主運用、V2/V3 は不具合時のみ触る (ユーザー指示 2026-05-09)。

---

## 7. 次セッション開始時のアクション

```
1. CLAUDE.md を最初から読む (特に R0 フック前提)
2. 本ファイル (HANDOFF_v4_S17.md) を最初から最後まで読む
3. MEMORY.md を読む
4. progress.html を Tennis DB Progress preview パネル (port 8082) で開く
5. ユーザーに状況確認:
   - 「現バージョン v4.7.2-S17 push 済 (= Phase 3.5 完了状態)」
   - 「次は Phase 4 (Plan 本体仕上げ) / Phase 5 (Home 課題行) のどちらから?」
6. ユーザー指示で着手 → 実装 → ビルド → preview 検証 → ユーザー確認 → push
```

---

## 8. ユーザーから受けた重要指摘 (memory に保存済)

- 「俺は試合運用で iPhone を使う」 (memory `user_match_day_usage.md` / `feedback_iphone_build_priority.md`)
- 「専門用語ばかりで説明するな」 (memory `feedback_plain_language.md`)
- 「目先のことばかりで俯瞰で見られなくなっている」 (memory `feedback_no_postpone.md`)
- 「devモードでちゃんと検証しないと大事故になる」 (memory `feedback_consistent_verification_method.md`)
- 「コードを汚すなボケが」 (進捗バナー埋込で激怒、独立 progress.html に分離) (memory `feedback_two_stage_preview.md`)
- 「Stage 番号を勝手に変えるな」 (memory `feedback_stage_numbering_2026_05_05.md`)
- 「V4 が主運用、V2/V3 は不具合時のみ触る」 (2026-05-09 確認)
