# Tennis DB v4 — HANDOFF (Stage 18)

**最終更新**: 2026-05-05
**現バージョン**: `v4.5.0-S18` (push 済、GitHub Pages デプロイ済)
**HEAD commit**: `3cfe102`

---

## 1. このセッションでやったこと (要約)

### 着手前の状態 (S18 開始時)
- バージョン `v4.0.0-S16.11`
- Plan/Insights タブ未実装、Dev モード無し、自動テスト無し
- 致命バグ多数 (data 破壊事故由来含む)、UI 改善要望多数

### S18 で完了した内容 (60+ commits、全て push 済)

| 段階 | 内容 | バージョン |
|---|---|---|
| **S17/S18 タブ初実装** (4800e86, 57e2086) | Plan / Insights タブ。**ただし凍結中** | - |
| **Phase A 全コード監査** | src/ 配下全 80 ファイル、致命 5 + 高 24 + 中 60 + 低 30 を列挙 | - |
| **Phase B Round 1-4 修正** | 致命 5 + 高 24 = 29 件すべて修正 | 4.0.0 → 4.1.0-S18 |
| **検証基盤** | Dev モード (?dev=1) + Playwright e2e (13 件) | - |
| **ユーザーリクエスト対応 (S18 前半)** | リク 3 (タブ状態保存) / 4 (英語排除) / 7-f (ラケット並び替え) / 30-b (試合結果デフォルト未定) / 30-c (試合編集モーダル順) / 31-2 (AI 要約 2 行制限) / Calendar import | 4.1.0 → 4.1.2 |
| **Round 5 内部修正 (batch A〜E)** | useMemo 追加、catch silent → console.warn、dead code 削除、write pattern 一貫化、lsLoad 破損検出、settingHistory 日付正規化、Firebase 冪等化 | 4.1.2 → 4.1.6 |
| **Round 5 UI Phase 1** (b503a8d) | モーダル focus trap (a11y)、Modal.jsx + 6 独自モーダル | 4.1.7 |
| **リク 30-a** (1cd6e18) | 大会詳細から直接「+ 試合を追加」(タップ 3→2) | 4.1.8 |
| **リク 30-e** (68ce51c) | 試合形式の多様化 (1/3 セット / 6/4 ゲーム先取 / 1-1 で 10pt TB) | 4.2.0 |
| **Phase A 試合終了バナー** (4b54852) | 試合終了バナー + 「続けて記録する」展開 (誤入力防止) | 4.2.1 |
| **Phase B TB スコア入力** (55161ab) | TB スコア入力欄 (パターン A) + 自動装飾 `7-6(5)` / `10-7` | 4.2.2 |
| **Round 5 UI Phase 1 補完** (0af640d) | leaf modal 4 件に focus trap 追加 (CO/LinkedSession/SetupPicker/HomeDayPanel) | 4.2.3 |
| **wheel picker 復活** (e9bc3a5) | 立体ホイール (PracticeEditForm)、stash の事故 3 件を全修正した安全設計 | 4.3.0 |
| **wheel picker 全画面適用** (cbfc159) | 残り 3 フォーム (Tournament/Trial/QuickAdd) に展開、計 14 ヶ所差替 | 4.3.1 |
| **F4.4 最近の好成績** (01b1a0d) | Home タブ実装漏れ補完。優勝/準優勝/3位/ベスト8/ベスト16/予選突破 限定で最大 5 件 | 4.4.0 |
| **Issue 1 ホーム→Sessions 戻り口** (a967ca9) | 主力ラケットフィルター時のバナー + タブ切替自動解除 | 4.4.1 |
| **Issue 2 練習試合記録** (3cfe102) | practice.matches[] 追加、案 3' (+ボタン常時) で実装 | 4.5.0 |

### Cloud Functions
- `summarizeMemo` (asia-northeast1) デプロイ済確認 + Anthropic API キー再設定 + プロンプト「42 文字以内」に強化
- 設定画面に「Google カレンダー予定を取り込む」ボタン + 「メモ AI 要約 (一括処理)」ボタン

---

## 2. 今後の残作業

### 凍結中 (再着手判断要)
- **Plan / Insights タブ**: ユーザーが「凍結」と明言、再着手は次 Stage で preview 承認必須

### 完了マーク
- ✅ **wheel picker 系** (リク 10/15/24-29): 全フォームで稼働。事故 3 件 (背景タップ=確定 / 値変換 / 6h クランプ) すべて修正
- ✅ **試合関係の修正**: 30-a / 30-e (Phase 1+A+B) すべて完了
- ✅ **Round 5 UI Phase 1**: focus trap は Modal 基底 + leaf modal 4 件 + 6 独自モーダルすべてカバー
- ❌ **Round 5 UI Phase 2** (タップ領域 44px): **ユーザー却下、memory に「触らない」ルール保存済** (`feedback_no_tap_area_resize.md`)
- ✅ **Round 6 (低優先 30 件)**: HANDOFF 推測値、精査結果すべて意図的 / 静的 / 適切で実質作業無し
- ✅ **F4.4 最近の好成績**: 実装漏れ補完済
- ✅ **Issue 1 (ホーム→Sessions 戻り口)**: 解決
- ✅ **Issue 2 (練習試合記録)**: 解決
- ✅ **リク 31-2 後始末**: 古い API キー削除済 (ユーザー実施)

### ユーザー確認待ち (情報共有不足のため保留)
- リク 1 ホームのリンク切れ詳細: 具体場所未共有 (再発時にユーザーから情報共有を待つ)
- リク 11 ストリングセット省略箇所: 場所不明 (再現時に対応)

### 任意 polish 候補 (未着手、優先度低)
- GameTracker の TB 内ポイント単位記録 (現状はパターン A プリセット入力で十分)
- setScores の `7-6(5)` 表記の文字列パース (現状は表示装飾のみ)

---

## 3. 確立されたルール (memory に保存済)

| ルール | 要点 |
|---|---|
| データ破壊事故 (2026-05-03) | 値変換ロジック禁止、build.ps1 は承認後のみ、暗黙確定禁止 |
| バージョニング | X = 互換性壊す、Y = 機能追加 (Z リセット)、Z = 修正 (push 1 回 = +1)、suffix `-S<N>` は Stage マーカー |
| バージョン番号を必ず伝える | push のたびに独立行で `v4.X.Y-S<N>` を明示 |
| 小さな変更でも事前確認 | ファイル名・ボタン文言・サブ機能・バージョン解釈、些細でも commit 前に確認 |
| push は確認してから | git push 前にユーザーの確認 |
| 1 タスク = 1 push | 小刻み patch 禁止 |
| 謝罪は単独で | 次アクションと混ぜない |
| 平易な言葉 | 専門用語禁止 |
| 更新完了は明示的に | 「更新完了・F5 で確認」を独立行 |
| 選択肢は数字で | 1, 2, 3 (a/b/c 禁止) |
| 2 段階プレビュー | UI 変更は preview_s<N>_p<M>.html 承認 → 実装 |
| 「セッション」用語 NG | v4 は「Stage (S<N>)」、v3 は「Phase」と呼ぶ |
| **タップ領域 44px 違反は変更しない** | レイアウト崩壊リスク、視覚 / hit slop 案いずれも却下済 |

---

## 4. 検証環境 (Dev モード)

`http://localhost:8081/v4/index.html?dev=1[&reset=1]`
- Google SSO スキップ、fixture (`v4/dev-fixture.json`) で起動
- 本番 Firestore に書き込まない
- リセットで初期化

`v4/dev-fixture.json` は `.gitignore` で git 管理外 (実データ保護)。次セッションでは `cp tennis_db_<latest>.json v4/dev-fixture.json` で配置。

### Playwright e2e
- `node tests/e2e/run.mjs` で 13 テスト走る
- 必要 path: `C:\Program Files\nodejs\` (PATH 通すか、PowerShell で `$env:PATH = "$env:PATH;C:\Program Files\nodejs"`)

---

## 5. 次セッションでの最初のアクション

```
ユーザー: 「再開してください」
Claude:
  1. このファイル (HANDOFF_v4_S18.md) を読む
  2. MEMORY.md を読む
  3. 現バージョン v4.5.0-S18 を確認
  4. 「次の選択肢」をユーザーに提示:
     - 凍結中項目 (Plan/Insights タブ) の再着手判断
     - リク 1 / 11 (情報共有待ち、再発時のみ)
     - 任意 polish (TB ポイント単位記録 / setScores パース)
     - 別の優先事項 (ユーザー指示)
```

---

## 6. 重要な実 file パス

| 用途 | パス |
|---|---|
| メイン source | `src/app.jsx`, `src/core/`, `src/domain/`, `src/ui/` |
| バージョン定数 | `src/core/01_constants.js` `APP_VERSION` |
| ビルド | `build.ps1` (PowerShell)、output: `v4/index.html` |
| 検証 fixture | `v4/dev-fixture.json` (gitignored) |
| Calendar 取り込み JSON | `v4/calendar_import.json` (gitに入れる) |
| 静的プロト | `preview_<topic>_p<N>.html` (repo root) |
| e2e | `tests/e2e/run.mjs` |
| Cloud Functions | `functions/index.js` (Anthropic Claude Haiku 経由要約) |

### S18 で追加された主要ファイル/関数

| ファイル | 内容 |
|---|---|
| `TENNIS_RULES.md` §3.1 / §9.1 | 草トーローカルルール (1set/3set/6game/4game) + matchFormat データモデル |
| `src/domain/match_helpers.js` | `MATCH_FORMAT_PRESETS` / `resolveMatchFormat` / `formatFromPreset` / `formatLabel` / `formatRuleSummary` / `computeTbState` / `applyTbDetails` |
| `src/ui/sessions/GameTracker.jsx` | `matchEnded` / `format` prop、試合終了バナー、TB 入力 banner、prisets/text/winner buttons |
| `src/ui/sessions/MatchEditModal.jsx` | 試合形式 override UI、effectiveFormat useMemo、handleTbSubmit |
| `src/ui/sessions/TournamentEditForm.jsx` | ④試合形式 セクション、プリセット 4 + 1-1 10pt TB チェックボックス |
| `src/ui/sessions/_NumWheel.jsx` (新規) | TimeWheel / DurationWheel / NumWheel + WheelSheet (Bottom sheet) + WheelColumn (3D 立体) |
| `src/ui/home/RecentResults.jsx` (新規) | F4.4「最近の好成績」カード (好成績限定、最大 5 件) |
| `src/ui/sessions/PracticeEditForm.jsx` | matches[] 操作 + + ボタン (案 3') + ⑥試合記録セクション |
| `src/ui/sessions/PracticeDetail.jsx` | matches[] 読み取り表示 |
| `src/ui/common/Modal.jsx` | `useFocusTrap` hook (Modal 基底 + 全モーダル流用可) |
| `preview_s18_p1.html` 〜 `p13.html` | S18 ワイヤフレーム (タップ領域議論 / 試合形式 / TB 入力 / wheel デザイン段階 / practice matches UI) |

---

## 7. データモデル変更 (S18 追加)

```js
// tournament
tournament.matchFormat = {
  preset: "1set" | "3set" | "6game" | "4game" | "custom",
  setTargetGames: 4 | 6 | 8,
  setMinDiff: 1 | 2,
  tiebreakAt: "never" | "5-5" | "6-6" | "4-4",
  tiebreakPoints: 7 | 10 | null,
  bestOfSets: 1 | 2,
  finalSetMode: "normal" | "matchTiebreak10",
  noAd: boolean, // 表示影響なし、データ保持のみ
};

// match (大会の matches[]、練習の matches[] 共通)
match.format = null | { ...上記同型 };  // null = tournament 継承
match.tbDetails = [
  null,                                            // セット 1: TB なし
  { type: "regular",  winner: "me", loser: 5 },   // セット 2: 6-6 → 7-5、"7-6(5)"
  { type: "match10",  winner: "me", loser: 7 },   // matchTB10: 10-7
];

// practice (S18 Issue 2 で matches[] 追加)
practice.matches = [];  // 大会 matches[] と同形式の試合配列
```

旧データ後方互換: `matchFormat` 未設定 → `DEFAULT_MATCH_FORMAT = 3set 標準`、`format/tbDetails` 未設定 → 装飾なし表記、`practice.matches` 未設定 → 表示変化なし。
