# DESIGN_LOG — 設計前提棚卸しログ (R7 プロトコル)

VERIFY_LOG.md と対をなす設計フェーズ用ログ。

**運用ルール (R7、2 段階構造)**:
- **段階 A: 設計相談段階**: 応答内で 12 項目棚卸しを書けば足りる (DESIGN_LOG エントリは推奨)
- **段階 B: 実装着手前** (= src/** / build.ps1 / 高リスク語パスを編集する時): **DESIGN_LOG.md に当日エントリ必須**。無ければ file-guard.ps1 が ask で止める

各エントリは §1-15 を埋める。チェックだけで内容空欄は違反 (= F7 / F16 再演防止)。

**役割分担 (混在禁止)**:
- DESIGN_LOG.md = 設計前提・制約・Gate 2 への転記元
- Gate 2 契約 = 原則チャット上で提示 (必要なら DESIGN_LOG §14 に要約)
- VERIFY_LOG.md = 実装後の検証ログ (Gate 2 契約は書かない)

**Runtime state ファイル (commit 対象外)**:
- `.claude/state/design-phase.json` は design-phase-guard.ps1 の runtime flag
- `.gitignore` で `.claude/state/` を ignore 済み
- リポジトリに混入させない

**file-guard チェック範囲 (当日エントリ範囲限定)**:
- Phase 1 (現行): `## YYYY-MM-DD` 当日見出し + その**当日エントリ範囲内**に `### §1.` `### §5.` `### §11.` `### §12.` `### §14.` の各見出しが存在 (過去エントリの見出しは通さない)
- Phase 2 (別ターン実装予定): 各セクション本文の空欄チェック / 表の空セル検出 / content スキャン

---

## YYYY-MM-DD <タスクタイトル> [このセクションはエントリテンプレ。実装着手時に複製して使う]

### §1. 今回の論点 (必須セクション)
<1-2 行で>

### §2. 読んだ資料 (選定理由含む)
- ファイル名: <2 行サマリー> (選定理由: <なぜこの論点に必要か>)

### §3. 過去制約
- <CLAUDE.md / MEMORY / 過去セッション発言から抽出>

### §4. Claude が置いている前提
| # | 前提 |
|---|---|
| a | |

### §5. 前提一覧表 (必須セクション、F7/F16 防止)

| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | | 資料 / ユーザー明示 / 過去ログ推定 / 未確認仮説 | | |

ルール:
- 根拠分類は 4 区分のいずれか必須
- 「未確認仮説」を「事実」として扱わない (R7 8 禁止 §1)
- 根拠欄は具体的引用 (ファイル名 §X / ユーザー発言の日付・要旨 / 推定元データ)

### §6. 複数あり得るパターン

| パターン | 内容 | 制約 | 今回対象か |
|---|---|---|---|
| X | | | 対象外 |
| Y | | | 対象外 |
| Z | | | 対象 |

ルール: 最低 1 回は複数パターンを検討する (R7 8 禁止 §2 / §6)。

### §7. 今回対象にするパターン
<上表から選択 + 理由>

### §8. 対象外パターンと理由
- パターン X: <理由>
- パターン Y: <理由>

### §9. 未確認の前提
- <§5 で「未確認仮説」と分類したもの + 追加事項>

### §10. ユーザー確認が必要な点
- <番号付きで>

### §11. 禁止事項 (必須セクション)
- <R7 8 禁止 + 本タスク固有>

### §12. 停止条件 (必須セクション)
- <ユーザー承認待ち境界 / 自己停止トリガー>

---

### §13. 前提対立軸チェック (固定 7 軸、空欄禁止)

| 軸 | 今回の扱い | 根拠 | 未確認 |
|---|---|---|---|
| 試合中 / 試合後 | | | |
| 通信あり / なし | | | |
| 本番データ / dev fixture | | | |
| 表示のみ / 保存・削除・同期 | | | |
| 1 経路 / 複数 state host | | | |
| PC dev / 実機 | | | |
| core 削減 / 信頼性 | | | |

---

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- <R7 で受け入れた制約のうち、実装着手時 (Gate 2) にも明示で持ち込むもの>

### §15. Gate 2 転記確認

| 制約 | Gate 2 禁止事項/停止条件へ転記したか |
|---|---|
| | □ |

ルール: §14 の全項目を、実装着手チャット応答内の禁止事項 / 停止条件に転記したことを実装直前にチェック。

---

[エントリは上の `## YYYY-MM-DD <タスクタイトル>` 形式で複製、今日日付に置き換え、§1-15 を埋める。複数エントリは時系列で追加。]

---

## 2026-05-18 MatchEditModal core 復帰 (Release 1-1 実戦信頼性 / ウォーム運用)

### §1. 今回の論点 (必須セクション)
大会中にテザリングが切れると MatchEditModal が heavy bundle 取得失敗で開けずフリーズする。MatchEditModal を core へ戻し、ウォーム運用(起動後に通信断)で試合追加〜保存〜再表示を通信なしで通せるようにする。

### §2. 読んだ資料 (選定理由含む)
- build.ps1 全文 (選定理由: core/heavy 分割の除外・concat・expose・bridge・prelude を全て確認するため)
- src/_head.html 1-97 (選定理由: loadHeavy 成功条件と offline フォールバック有無の確認)
- src/core/03_storage.js 全文 (選定理由: 保存がオフライン安全か = save() の await ブロック有無)
- src/ui/sessions/MatchEditModal.jsx 全文 (選定理由: core 依存が全て bridge 既存かの確認)
- src/ui/sessions/TournamentEditForm.jsx / PracticeEditForm.jsx 全文 (選定理由: heavy→MatchEditModal 結び目の全消費者特定。grep 1 ヒットで止めず読み切る)
- src/app.jsx 560-940 (選定理由: MatchEditModalLoader 定義と Loader 群パターン)
- src/ui/sessions/SessionDetailView.jsx 430-513 (選定理由: mid-match core 入口の使用箇所)

### §3. 過去制約
- CLAUDE.md R6/R7: push 前ゲート + 設計前提棚卸し。R5 責任主語。
- session-start hook / feedback_stage_numbering: APP_VERSION 独断変更禁止 → 本契約でユーザー明示承認取得済 (4.7.27-S17 → 4.7.28-S17、-S17 不変)。
- feedback_versioning: Z=修正。本件は劣化修正 = Z 上げ。
- build.ps1 コメント: IIFE 約 525KB で WebKit JIT deopt 履歴 → core 肥大は別の実戦不能リスク。
- ユーザー方針: core 削減より試合中信頼性優先 / 部分対処を「回避」と呼ぶ / SW=コールド補助、core 復帰=ウォーム根本。

### §4. Claude が置いている前提
| # | 前提 |
|---|---|
| a | 事故はウォーム運用(起動後にテザリング断)で発生 |
| b | MatchEditModal の依存は全て core bridge に既存 |
| c | 結び目は TournamentEditForm:340 と PracticeEditForm:349 の 2 消費者 |
| d | core 増分は MatchEditModal 本体のみ (GameTracker は既に core) |

### §5. 前提一覧表 (必須セクション、F7/F16 防止)

| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | 事故はウォーム運用 | ユーザー明示 | 「試合前に一度オンラインで起動→試合中テザリング断」発言 | — |
| b | MatchEditModal 依存は core bridge 既存 | 資料 | build.ps1:87-135 と MatchEditModal.jsx 全文の照合済 | — |
| c | 結び目は 2 消費者 | 資料 | TournamentEditForm.jsx:340 / PracticeEditForm.jsx:349 を全文確認 | — |
| d | core 増分 +10〜14KB | 未確認仮説 | minify 後の推定。事実扱いしない | build.ps1 の Core size ログを実装前後比較 |
| e | コールド起動オフラインは本件で未解決 | 資料 | _head.html が React/Firebase を CDN 取得、SW なし | — |

### §6. 複数あり得るパターン

| パターン | 内容 | 制約 | 今回対象か |
|---|---|---|---|
| X | SW/App Shell を先に本筋化 | iOS SW eviction で試合日に黙って消える | 対象外 |
| Y | MatchEditModal 含む edit form 群を全部 core 復帰 | core 肥大大、JIT deopt 接近 | 対象外 |
| Z | MatchEditModal 単体 core 復帰 + heavy は bridge 参照 | core 増分最小、結び目 2 ステップ必須 | 対象 |

ルール: 最低 1 回は複数パターンを検討する (R7 8 禁止 §2 / §6)。

### §7. 今回対象にするパターン
Z。理由: 事故ったウォーム経路を最小 core 増分で根治。SW(X) は iOS で脆く生命線にできない、全 form 復帰(Y) は JIT deopt リスク。ユーザー最終判断と一致。

### §8. 対象外パターンと理由
- パターン X: SW は iOS で予告なく evict され、準備済みと誤認したまま会場で全滅しうる。R1-2 で補助として別途。
- パターン Y: core 肥大で別の実戦不能(JIT deopt)を誘発。ユーザーが「ついで復帰禁止」明示。

### §9. 未確認の前提
- core 増分実数 (§5-d、実測まで断定しない)
- コールド起動オフライン (§5-e、R1-2 SW チケットの範囲、本件で解決しない)

### §10. ユーザー確認が必要な点
- APP_VERSION 4.7.28-S17 → 本契約で承認取得済 (解決済)
- push は実装・検証後に別途明示承認 (未取得、検証後に求める)

### §11. 禁止事項 (必須セクション)
- §A の 6 種 (build.ps1 / _head.html / app.jsx / SessionDetailView.jsx / DESIGN_LOG.md / v4 生成物) + 01_constants.js 以外を編集しない
- TournamentEditForm / PracticeEditForm / TrialEditForm を core 復帰しない (ついで禁止)
- MatchEditModal 内部ロジック (swipe-back/draft/GameTracker 連動) を改変しない (配置変更のみ)
- VERIFY_LOG.md に Gate 2 契約を書かない
- --no-verify 等フック回避をしない
- 未確認仮説 (§5-d core 増分) を事実扱いしない
- R7 8 禁止 全項目

### §12. 停止条件 (必須セクション)
- Core size が想定外 +20KB 以上 または 400KB を大きく超過 → 停止報告、edit form の core 復帰で取り戻さない
- 結び目 2 ステップ (bridge footer 追加 + heavy prelude destructure) の片落ちを検証 #9 前に検知 → 停止
- §A 以外を触りそうになった瞬間
- ユーザー警告語検知 / esbuild exit 1
- push 前にユーザー明示承認が無い

---

### §13. 前提対立軸チェック (固定 7 軸、空欄禁止)

| 軸 | 今回の扱い | 根拠 | 未確認 |
|---|---|---|---|
| 試合中 / 試合後 | 試合中 (ウォーム運用) | ユーザー実例 | — |
| 通信あり / なし | なし(断)で動作必須 | 事故再現条件 | — |
| 本番データ / dev fixture | 本番 (localStorage 実データ) | save() は本番 LS | dev fixture は使わない |
| 表示のみ / 保存・削除・同期 | 保存含む (試合追加〜保存) | F1.4.1 | 同期は後追い(範囲外) |
| 1 経路 / 複数 state host | 複数 (SessionDetailView + heavy form 2) | コード確認 | — |
| PC dev / 実機 | 実機 (Android タブレット) | ユーザー検証環境 | dev 結果を実戦保証扱いしない |
| core 削減 / 信頼性 | 信頼性優先 (core 増容認) | ユーザー方針明示 | サイズは §12 で監視 |

---

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 変更対象は §A 7 種 + 01_constants.js のみ、ついで禁止
- 結び目 2 ステップ (core bridge 公開 + heavy prelude destructure) 両方必須、片落ち停止
- Core size 停止条件 (+20KB / 400KB)
- loadHeavy 非発火確認を検証必須
- 静的 6 項確認
- APP_VERSION 4.7.28-S17 (承認済)
- push は検証後に別途承認
- コールドオフラインは本件対象外 (R1 完了と誤認しない)

### §15. Gate 2 転記確認

| 制約 | Gate 2 禁止事項/停止条件へ転記したか |
|---|---|
| §A スコープ限定・ついで禁止 | ☑ Gate 2 §C-1/§C-2 |
| 結び目 2 ステップ両方必須 | ☑ Gate 2 §D-2 |
| Core size 停止 +20KB/400KB | ☑ Gate 2 §D-1 |
| loadHeavy 非発火確認 | ☑ Gate 2 §E 追加条件1 |
| 静的 6 項 | ☑ Gate 2 §E 追加条件2 |
| APP_VERSION 4.7.28-S17 承認済 | ☑ Gate 2 §A/§G 修正版 |
| push は検証後別途承認 | ☑ Gate 2 §C-6/§G |
| コールドは対象外 | ☑ Gate 2 §F/完成条件 |

---
