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

## 2026-05-19 確定穴2点の修正 (新規試合下書き孤児化 / CO小窓書きかけ消失) — R1 条件1・2

### §1. 今回の論点 (必須セクション)
試合中に入力が消えない保険の確定穴2点を塞ぐ。①＋試合追加の新規(未保存)試合をうっかり閉じると下書きが孤児化し復元不能。②GameTracker の CO 入力小窓の書きかけが端末保存されず、小窓を保存前に閉じると消える。完成条件1(試合中に使える)・2(通信不安定でも記録が端末に残る)に直結。

### §2. 読んだ資料 (選定理由含む)
- MatchEditModal.jsx 35-160（下書きヘルパ/init/auto-save/handleClose の正確な作り）
- domain/match_helpers.js blankMatch（新規 match が id を即発行する事実: id:genId()）
- SessionDetailView / TournamentEditForm / PracticeEditForm の MatchEditModal 渡し props（B-0、新規 grep）
- GameTracker.jsx _gtCOModal（CO 小窓が local useState のみで永続なしの事実）
- SessionEditView.jsx draft 機構と popstate 不在（フリック戻りは構造上下書き保持の確認）

### §3. 過去制約
- 既存の下書き機構(per-id match draft / session draft / racket draft)を壊さない（ユーザー明示・回帰禁止）。
- SessionEditView は触らない。CDN/SW/Android/R1-2/UI改善に広げない。
- APP_VERSION 独断変更禁止（実装着手時にユーザー確認、Z上げ 4.7.28→4.7.29-S17 候補だが未確定）。
- 検証は DEV 確立手順のみ。再現不能障害の検証は不可、作りと挙動の確認まで。

### §4. Claude が置いている前提
| # | 前提 |
|---|---|
| a | 3ホスト全てが MatchEditModal に match と tournament(.matches含む) を渡す（B-0 PASS） |
| b | 新規/既存の判別は match.id が tournament.matches に在るか |
| c | 安定キーは tournament.id 由来で導出可能 |
| d | CO小窓は matchId+afterGame で一意 |

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | 3ホストが match+tournament を渡す | 資料 | B-0 grep: SessionDetailView L463-506 / TournamentEditForm L340-344 / PracticeEditForm L349-354 | — |
| b | blankMatch は新規でも id 即発行 | 資料 | match_helpers.js:94 `id: genId()` | — |
| c | 新規試合 draft が孤児化し復元不能 | 資料 | reopen で blankMatch が新 id 発行、旧キー不一致（MatchEditModal init/auto-save の作りから確定） | — |
| d | CO小窓は永続なし | 資料 | GameTracker _gtCOModal は useState(draft) のみ、onSave でのみ commit | — |
| e | tournament.id は session/form に存在 | 過去ログ推定 | session オブジェクトは id を持つ慣行 | 実装時に該当箇所で存在を読み確認、無ければ per-id にフォールバック（クラッシュさせない） |

### §6. 複数あり得るパターン
| パターン | 内容 | 今回対象か |
|---|---|---|
| X | CO 入力を即 MatchEditModal form へ流す(commit意味変更) | 対象外（既存 save/cancel 意味を壊す恐れ） |
| Y | 新規も per-id のまま別途復元UIを足す | 対象外（機構複雑化） |
| Z | 新規は安定キー(parent由来)、CO は独立 localStorage draft（追加のみ） | 対象 |

### §7. 今回対象にするパターン
Z。既存 per-id 機構は不変、新規のみ安定キー、CO は追加の独立 draft。最小・回帰なし。

### §8. 対象外パターンと理由
- X: CO の commit/cancel 意味を変える＝既存機構破壊、禁止に抵触。
- Y: 復元UI新設は範囲拡大、目的に不要。

### §9. 未確認の前提
- §5-e（tournament.id 存在）。実装時に該当行を読んで確認、無ければ per-id フォールバック。
- CO draft を「試合保存/破棄」で消す処理は MatchEditModal 側で co-draft プレフィックス一括 clear が要る（両ファイル対象内）。実装時に既存 clear と干渉しないか読んで確認。

### §10. ユーザー確認が必要な点
- APP_VERSION の Z 上げ（実装・push 段で明示確認、今は変更しない）。

### §11. 禁止事項 (必須セクション)
- 既存 per-id match draft / session draft / racket draft の挙動を変えない（回帰禁止）。
- 既存 CO の save/skip/delete/commit 意味を変えない（追加のみ）。
- 触るファイルは MatchEditModal.jsx / GameTracker.jsx（+build生成物）以外に広げない。
- SessionEditView / CDN / SW / Android / R1-2 / UI改善 に触れない。
- CO draft を別 afterGame に流用しない。
- 確認前の決め打ち修正をしない。APP_VERSION 独断変更しない。--no-verify しない。

### §12. 停止条件 (必須セクション)
- 既存下書き機構の挙動が変わる兆候 → 停止。
- 新規/CO draft が保存・破棄・スキップ・削除でクリアされず stale 化 → 停止。
- 触るファイルが2本(+build生成物)を超えそう → 停止。
- tournament.id 不在で安定キーが導出できず穴1が MatchEditModal 内完結不能 → 停止して報告。
- R1-smoke T1〜T7 のいずれか FAIL → 停止。
- SessionEditView/CDN/SW/Android/UI改善 に手が伸びかけた瞬間 → 停止。

---

### §13. 前提対立軸チェック (固定 7 軸、空欄禁止)
| 軸 | 今回の扱い | 根拠 | 未確認 |
|---|---|---|---|
| 試合中 / 試合後 | 試合中 | 入力中の消失防止 | — |
| 通信あり / なし | なし前提 | localStorage 保険 | — |
| 本番データ / dev fixture | dev fixture で検証 | 確立 DEV 手順 | 実機実戦は対象外（合意） |
| 表示のみ / 保存・削除・同期 | 保存(下書き)中心 | draft 機構 | — |
| 1 経路 / 複数 state host | 複数ホスト | B-0 で3経路確認 | — |
| PC dev / 実機 | PC dev | DEV smoke | 実機は別 |
| core 削減 / 信頼性 | 信頼性 | 条件1・2 | — |

---

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 対象は確定穴2点のみ、優先順 ①新規試合 ②CO小窓。
- 触るファイル MatchEditModal.jsx / GameTracker.jsx のみ、SessionEditView 不可侵。
- 既存 per-id / session / racket draft 不変（回帰禁止）。
- 穴1: 新規=安定キー(tournament.id由来)、既存=per-id 不変、判別=match.id∈tournament.matches、保存/破棄でクリア。
- 穴2: CO draft key=matchId+afterGame、同一 matchId+afterGame のみ復元、保存/スキップ/削除/試合保存/破棄でクリア、別 afterGame 流用禁止。
- 検証=DEV 確立手順 + R1-smoke T1〜T7 回帰。APP_VERSION は別途確認。

### §15. Gate 2 転記確認
| 制約 | Gate 2 禁止事項/停止条件へ転記したか |
|---|---|
| 対象2点・優先順 | ☑ Gate 2 対象 |
| 触るファイル限定・SessionEditView不可侵 | ☑ Gate 2 触るファイル/停止条件 |
| 既存draft回帰禁止 | ☑ Gate 2 停止条件 |
| 穴1 安定キー/判別/クリア | ☑ Gate 2 変更方針 |
| 穴2 stale防止(key/復元/clear/流用禁止) | ☑ Gate 2 変更方針(修正2) |
| DEV検証+smoke回帰 | ☑ Gate 2 検証方法 |
| APP_VERSION別途確認 | ☑ Gate 2 停止条件 |

---

## 2026-05-20 穴1 実装着手 (前日設計 + フォールバック修正反映)

### §1. 今回の論点 (必須セクション)
2026-05-19 エントリの確定穴2点修正設計を踏襲して 穴1（新規試合下書き孤児化）の実装に着手。ユーザー修正を反映: 「新規試合 + tournament.id 不在」は per-id フォールバックしない（孤児再発するため）、停止して報告する。既存試合は per-id のまま不変。全設計は 2026-05-19 §1-15 を正とする（重複記載しない）。

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | 新規+tournament.id 不在は per-id fallback 禁止 | ユーザー明示 | 2026-05-20 ユーザー指示「fallback ではなく停止」 | — |
| b | tournament.id は実際には全ホストで存在 | 資料 | B-0: session/form を tournament として渡す（session は id を持つ） | 実装時に該当箇所で id 参照を読み確認 |
| c | 既存試合 per-id 機構は不変 | ユーザー明示 | 「既存試合だけ per-id のままでよい」 | — |

### §11. 禁止事項 (必須セクション)
- 新規試合で tournament.id 不在の時に per-id キーへフォールバックしない（孤児再発）。その場合は停止して報告。
- 既存試合の per-id draft 機構（key/load/save/clear）の挙動を変えない（回帰禁止）。
- 触るファイルは MatchEditModal.jsx / GameTracker.jsx 以外に広げない。SessionEditView/CDN/SW/Android/UI改善 不可侵。
- 確認前の決め打ち、APP_VERSION 独断変更、--no-verify をしない。

### §12. 停止条件 (必須セクション)
- 新規試合 + tournament.id 不在 → per-id fallback せず停止して報告。
- 既存 per-id / session / racket draft の挙動が変わる兆候 → 停止。
- 触るファイルが2本(+build生成物)超 → 停止。
- R1-smoke T1〜T7 のいずれか FAIL → 停止。
- 一クリーン Edit で穴1を回帰なく表現できないと判明 → 停止して報告（雑な多重 Edit を強行しない）。

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 穴1 キー解決: 既存(match.id∈tournament.matches)=`match-draft-${id}-v1` 不変／新規+tournament.id有=`match-draft-new-${tournament.id}-v1`／**新規+tournament.id無=キー無し→停止報告（fallback 禁止）**。
- 保存・破棄で新規キーをクリア。既存 per-id 経路はバイト等価で不変。
- 残りの全設計（穴2 含む）は 2026-05-19 §14 を正とする。

---

## 2026-05-21 MatchEditModal history entry 一貫性修繕 (試合関連 entry leak 試合経路 2 件閉鎖) — R1 条件1

### §1. 今回の論点 (必須セクション)
HANDOFF_v4_S17.md:83-84 で「未対応 entry leak 3 件」と記録されている試合経路の leak、および MatchEditModal.jsx:258 で「別 hotfix 候補」と明記されている handleSaveClick → onSave 経由の `{match-edit-modal}` leak を、同一ファイル内 2 箇所の編集でまとめて閉鎖する。前 Gate 2（onEdit 経路のみ）は ChatGPT 指摘で HOLD、再 Gate 2 で「編集→閉じる」「編集→保存」「+試合追加→保存」「MatchDetail→編集→保存」の全出口導線を対象に拡張、ユーザー承認済。条件1（試合中に使える）の戻る/フリック導線信頼性に直接効く。

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | MatchDetailView は mount 時 `pushState({tdb:"match-detail"})`、handleEditClick は history 触らず onEdit 直接呼ぶ | 資料 | `src/ui/sessions/MatchDetailView.jsx:28, 60` | — |
| b | SessionDetailView.jsx:488 の onEdit は `setMatchDetailTarget(null) → setMatchEditTarget(m)` の 2 段 state 遷移、history.back を伴わない | 資料 | `src/ui/sessions/SessionDetailView.jsx:488` | — |
| c | MatchEditModal の open useEffect は現状 `state.tdb !== "match-edit-modal"` の時に常に pushState | 資料 | `src/ui/sessions/MatchEditModal.jsx:262-264` | — |
| d | handleSaveClick は現状 consumeHistoryEntry を呼ばない（L258 が「別 hotfix 候補」と明記） | 資料 | `src/ui/sessions/MatchEditModal.jsx:194-202, 258` | — |
| e | 4.7.26 handleClose の consumeHistoryEntry + closingByUiRef 機構は popstate 二重 close 防止として確立済、4 経路 PASS の実績 | 資料 | `src/ui/sessions/MatchEditModal.jsx:165-181, 267-272`、VERIFY_LOG 過去ログ d25bd74 | — |
| f | `_SESSIONS_KEEP_OPEN = ["detail", "match-detail"]` で app 側 popstate は両者を維持、それ以外で detail close | 資料 | `src/app.jsx:1486, 1513-1517` | — |
| g | `"match-detail"` 文字列が mount 時 state.tdb に現れるのは MatchDetailView → 編集 経路のみ（addMatchState/編集 form 経路では現れない） | 資料 | `MatchDetailView.jsx:28` のみ pushState で `"match-detail"` を使用、grep で他無し | — |
| h | onSave の親 callback（handleEditMatchSave / handleAddMatchSave）は同期的に setMatchEditTarget(null)/setAddMatchState(null) を呼ぶのみ | 資料 | `SessionDetailView.jsx:305-311, 297-302` | — |
| i | save() は localStorage 先 → Firestore 後で、LS は同期完了。Firestore 失敗時も LS 残存（条件2 維持） | 資料 | `src/core/03_storage.js:87-109` | — |
| j | APP_VERSION bump 4.7.30-S17（Stage 番号 S17 不変、Z bump） | ユーザー明示 | 2026-05-21 ユーザー承認「4.7.30-S17 bump も承認」 | — |

### §11. 禁止事項 (必須セクション)
- MatchDetailView.jsx / SessionDetailView.jsx / app.jsx / GameTracker.jsx / SessionEditView.jsx を触らない。
- 新規 ref / 新規 listener を追加しない。既存 closingByUiRef + popstate handler 機構を流用するのみ。
- handleClose / consumeHistoryEntry / silent-close ロジック / 4.7.26 hotfix の挙動を一切変えない。
- handleQuickAddSave / handleMergeConfirm に手を出さない（試合経路ではない、別 hotfix）。
- `state.tdb === "match-detail"` 以外の経路で replaceState に置き換えない（他経路の挙動を変えない）。
- 確認前の決め打ち、スコープ外 ファイル編集、--no-verify をしない。

### §12. 停止条件 (必須セクション)
- 必須 PASS シナリオ（X1〜X4 + R1）のいずれか FAIL → 1 回の最小修正で解消しなければ停止して報告。
- 不変確認シナリオ（X5 + R2 + R3 + R4）で回帰観測 → 即時停止、ロールバック優先。
- 触るファイルが MatchEditModal.jsx + build 生成物 + APP_VERSION + ログ系以外に広がる兆候 → 即停止。
- 新規 ref / 新規 listener を追加したくなった瞬間 → 停止。
- handleQuickAddSave / handleMergeConfirm に手が伸びかけた瞬間 → 停止。
- R1-smoke T1〜T7 のいずれか FAIL → 停止。
- console error 0 を維持できない → 停止。

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- **修正 1（open useEffect）**: mount 時 `state.tdb === "match-detail"` の時のみ `replaceState({tdb:"match-edit-modal"})`、それ以外は従来通り `pushState({tdb:"match-edit-modal"})`。
- **修正 2（handleSaveClick）**: `clearDraft → _clearAllCODraftsForMatch → consumeHistoryEntry → onSave` の順。consumeHistoryEntry は handleClose と同形（`state.tdb === "match-edit-modal"` ガード + `closingByUiRef.current = true` + `history.back()`）。
- 編集は MatchEditModal.jsx 1 ファイル、2 関数のみ。新規 ref / listener なし。
- silent-close / 4.7.26 hotfix / handleClose / closingByUiRef の機構と挙動を変えない。
- 別 leak（handleQuickAddSave / handleMergeConfirm）は本件で改善しないと VERIFY_LOG に明記。HANDOFF の「未対応 entry leak」件数は 3 件→ 2 件に更新。
- APP_VERSION 4.7.29-S17 → 4.7.30-S17（ユーザー承認済）。R1-smoke T1 期待値も同時更新。

---

## 2026-05-21 R1-2 CDN依存除去 (vendor 同梱化) — R1 条件1・2 後段の前提作り

### §1. 今回の論点 (必須セクション)
src/_head.html の全 CDN URL (Firebase 4 + React 2 + Phosphor 4 = 計 10 箇所) を v4/vendor/ 配下に同梱して同一オリジン化する。本件で達成するのは「CDN 依存排除」と「後段 Service Worker / App Shell の前提作り」のみ。browser cache 経由の offline reload は副作用としての参考観測に留め、達成基準にしない。ユーザー承認: 詳細設計の N7 を参考観測化、N4 を「Firebase compat SDK が local vendor から読み込まれ、各 SDK 初期化で runtime error なし + dev mode の既存起動が壊れていない」に縮小。APP_VERSION 4.7.30-S17 → 4.7.31-S17 bump 承認済。build.ps1 は不変方針。

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | Firebase compat 10.12.0 を維持、別バージョンに上げない | ユーザー明示 / 資料 | _head.html:12-15 でピン済、02_firebase.js が 10.12.0 前提 | — |
| b | React 18.3.1 固定（unpkg `@18` の resolve 観測値） | 資料 | 直前 DEV network log で unpkg react@18 → 18.3.1 観測 | 同 URL を実際に download して md5 等で確認 |
| c | Phosphor 2.1.1 固定 | 資料 | _head.html:20-23 でピン済 | — |
| d | v4/vendor/ は git tracked 静的同梱（build.ps1 で copy しない） | ユーザー明示 | 「build.ps1 は変更しない方針のまま」 | — |
| e | Firebase compat 各ファイルは内部で別 CDN を再 fetch しない（単一ファイル完結） | 未確認仮説 | gstatic 配布の compat 各ファイルは一般に内部 fetch なし、ただし要確認 | DEV 検証 N2 で network log に外部 host 0 件を実観測 |
| f | Phosphor CSS の @font-face url() は相対パス参照、同階層に woff2 配置で resolve する | 未確認仮説 | 一般的な webfont パッケージの慣例、ただし要確認 | download した style.css の url() を Read で確認、必要なら rewrite |
| g | browser cache 経由の offline reload は副作用、本件で達成基準にしない | ユーザー明示 | 2026-05-21 ユーザー指示「N7 は参考観測」 | — |
| h | N4 は SDK 初期化 runtime error なし + 既存 dev 起動不変、Firestore read/write 確認は過大 | ユーザー明示 | 2026-05-21 ユーザー指示「N4 縮小」 | — |
| i | APP_VERSION 4.7.30-S17 → 4.7.31-S17 bump 承認済 | ユーザー明示 | 2026-05-21 ユーザー承認 | — |

### §11. 禁止事項 (必須セクション)
- build.ps1 を変更しない（ユーザー明示）。
- v4/vendor/ 以外の場所に vendor を配置しない。
- _head.html の script / link 読み込み順序を変えない。
- preload / preconnect hint を新規追加しない（最小変更原則）。
- Service Worker / sw.js / PWA manifest 強化を本件に混ぜない。
- バージョン更新（Firebase / React / Phosphor）を本件に混ぜない、既存 pin 維持。
- N7（offline reload）を「PASS 必須」として扱わない、参考観測のみ。
- N4 を「Firestore read/write」と書かず、SDK 初期化 runtime error なし + 既存起動不変に固定。
- ROADMAP / HANDOFF / DESIGN_LOG の作業名（R1-2 CDN依存除去）を書き換えない（ユーザー指示）。
- R1-2a / R1-2b / R1-2c や Gate 1 / Gate 2 ラベルを使わない（ユーザー指示）。
- license / NOTICE が見当たらない場合に独断で「無しでよい」と判断しない、停止して報告。
- APP_VERSION の独断変更を本件以外に拡張しない。

### §12. 停止条件 (必須セクション)
- vendor 取得時に license / NOTICE ファイルが見当たらない → 停止して報告。
- Phosphor CSS の @font-face url() が同階層 woff2 で resolve しない → 停止して報告（rewrite はユーザー判断）。
- Firebase compat が runtime で別 CDN を内部 fetch する挙動が判明 → 停止して報告（追加同梱はユーザー判断）。
- N1〜N6（必須項目）のいずれか FAIL が 1 回最小修正で解消しない → 停止して報告。
- R1-smoke T1〜T7 のいずれか FAIL → 停止。
- 触るファイルが本設計スコープ外に広がる → 即停止。
- vendor 同梱サイズが想定（合計 ~1.5MB）を大きく超過する → 停止して報告。
- build.ps1 / .claude/hooks / .claude/settings.json を編集したくなった瞬間 → 停止。

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 触るファイル: v4/vendor/ 新規同梱 + src/_head.html + src/core/01_constants.js + v4/index.html (build 出力) + DESIGN_LOG.md + VERIFY_LOG.md + HANDOFF_v4_S17.md のみ。
- build.ps1 不変、Service Worker なし、PWA manifest 強化なし、preload hint 追加なし。
- _head.html の script / link 順序不変、URL のみ相対パスに置換。
- 検証 N1〜N6 を必須 PASS、N7 / N8 を参考観測（PASS/FAIL 判定しない、計測値のみ記録）。
- N4 文言は「Firebase compat SDK が local vendor から読み込まれ、app/auth/firestore/functions の初期化で runtime error が出ないこと。dev mode の既存起動が壊れていないこと」で固定。
- APP_VERSION 4.7.30-S17 → 4.7.31-S17、R1-smoke T1 期待値も同時更新。
- 本件単独で「初回・no-cache・通信ゼロ起動」を達成しないと VERIFY_LOG に明記。

---

## 2026-05-21 R1-2 Service Worker / App Shell (Stage 2) — R1 条件1・2 通信ゼロ reload 成立

### §1. 今回の論点 (必須セクション)
4.7.31-S17 で CDN 依存除去 (Stage 1) が完了、次に index.html + vendor + bundle-heavy.js を Cache Storage に固定して「browser を完全終了 → 通信ゼロでアプリ起動」を成立させる。修正版設計でユーザー承認 (実装承認・APP_VERSION 4.7.32-S17 bump 承認)。pre-cache 数は 16 ファイル、URL は scope 相対 (GitHub Pages /tennis-db/v4/ 対応)、navigation request は shell-first で index.html cache を返す、静的アセット fetch は ignoreSearch で bundle-heavy.js?v=... を hit させる、skipWaiting/clients.claim は使わない (安全寄り)、controller 非 null 確認を検証必須化。

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | pre-cache 対象は 16 ファイル固定 (LICENSE 除外) | ユーザー明示 | 2026-05-21 ユーザー指示「16 ファイルで固定」 | — |
| b | URL は scope 相対で記述、self.registration.scope で base 解決 | ユーザー明示 | 2026-05-21 ユーザー指示「/v4/ 固定をやめ scope 相対」 | — |
| c | navigation request は caches.match("./index.html") で shell-first、query 違いを吸収 | ユーザー明示 | 2026-05-21 ユーザー指示「shell-first + ignoreSearch」 | — |
| d | 静的アセット fetch は ignoreSearch: true で bundle-heavy.js?v= を hit | ユーザー明示 | 同上 | — |
| e | skipWaiting / clients.claim は使わない (既存タブ動作保護) | ユーザー承認 | 前回設計から継続、ユーザー承認 | — |
| f | controller 非 null 状態で offline reload 確認を必須化 | ユーザー明示 | 2026-05-21 ユーザー指示 | — |
| g | APP_VERSION 4.7.31-S17 → 4.7.32-S17 bump | ユーザー明示 | 同上 | — |
| h | CACHE_NAME は `tennisdb-${APP_VERSION}`、sw.js と 01_constants.js を手動同期 | 設計選択 | build.ps1 不変方針継続のため手動同期 | R6 push 前ゲートに同期確認項目追加 |
| i | 外部ドメイン (firestore.googleapis.com / api.open-meteo.com) は SW intercept しない、pass-through | 設計選択 | enablePersistence と責務分離、Firestore offline queue は IndexedDB に任せる | — |
| j | manifest 追加は本 Stage では行わない (既存 apple-mobile-web-app-* メタタグで standalone 最低限維持) | ユーザー承認 | 前回設計から継続、ユーザー承認 | — |
| k | install 時 1 件でも fetch 失敗で install fail → 旧 SW 維持 (fail-safe) | 設計選択 | addAll() の標準挙動 | — |
| l | activate 時 "tennisdb-" prefix のうち CACHE_NAME 以外を delete | 設計選択 | 旧 cache 残存防止 | — |

### §11. 禁止事項 (必須セクション)
- skipWaiting() / clients.claim() を使わない (既存タブ動作保護、ユーザー承認方針)。
- 外部ドメインを SW intercept しない (Firestore/Open-Meteo は pass-through、責務分離)。
- ignoreSearch: true を navigation 経路に拡張しない (navigation は shell-first で対応)。
- ignoreSearch: true を Firestore 等の動的 endpoint に拡張しない (静的アセット限定)。
- pre-cache 対象を 16 ファイルから増やさない (LICENSE 等を追加しない)。
- URL 絶対パス (/v4/...) を sw.js に書かない、scope 相対のみ。
- sw.js APP_VERSION と 01_constants.js APP_VERSION の不一致のまま push しない。
- manifest.json を本 Stage で追加しない (Stage 3 で扱う)。
- build.ps1 を編集しない (不変方針継続)。
- v4/vendor/ 配下のファイルを編集しない (4.7.31 で確定)。
- PWA install banner / background sync / push notification を本 Stage に混ぜない。
- 確認前の決め打ち、APP_VERSION の独断変更、--no-verify をしない。

### §12. 停止条件 (必須セクション)
- SW 登録自体が失敗 (navigator.serviceWorker.register reject) → 即停止、ロールバック優先。
- pre-cache install で 1 件でも 404 → SW install 失敗、設計の欠陥として停止して報告。
- O1〜O10 必須項目のいずれか FAIL が 1 回最小修正で解消しない → 停止して報告。
- O9 (R1-smoke T1〜T7) / O10 (既存挙動不変) で回帰観測 → 即停止、ロールバック優先。
- 触るファイルが本設計スコープ外 (v4/sw.js + src/_head.html + src/core/01_constants.js + v4/index.html + ログ系) に広がる → 即停止。
- sw.js APP_VERSION と 01_constants.js APP_VERSION の不一致のまま push しそうになる → 停止。
- skipWaiting / clients.claim を「動くから」と理由なく入れたくなった瞬間 → 停止。
- 外部ドメインを intercept したくなった瞬間 → 停止。
- ignoreSearch を navigation や 動的 endpoint に拡張したくなった瞬間 → 停止。
- 既存ユーザー (4.7.31 で SW 無し) → 4.7.32 への update path に問題判明 → 停止して報告。

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 触るファイル: v4/sw.js (新規) + src/_head.html (SW 登録 inline script 追加 ~10 行) + src/core/01_constants.js (APP_VERSION bump) + v4/index.html (build 出力) + DESIGN_LOG / VERIFY_LOG / HANDOFF / R1-smoke-test.md のみ。
- build.ps1 不変、v4/vendor/ 不変、PWA manifest 追加なし。
- pre-cache 16 ファイル固定リスト、scope 相対 URL、navigation = shell-first ./index.html、その他 = ignoreSearch: true。
- skipWaiting / clients.claim 不使用。
- CACHE_NAME = `tennisdb-${APP_VERSION}`、activate で "tennisdb-" prefix の旧 cache 削除。
- 外部ドメインは pass-through (intercept しない)。
- 検証 O1〜O10 必須 PASS、O11 (cache version 更新シミュレーション) 参考観測。
- controller 非 null 確認を offline reload 前に実施。
- APP_VERSION 4.7.31-S17 → 4.7.32-S17、R1-smoke T1 期待値も同時更新。
- 本件で達成: 通信ゼロ reload 成立。本件で未達: iOS evict 耐性 (Stage 3)、初回 no-cache offline。

---

## 2026-05-21 書込キュー可視化 (条件3 「保存・未同期がユーザーに見える」) — D

### §1. 今回の論点 (必須セクション)
4.7.32-S17 で通信ゼロ reload 経路は構造的に完了。次のボトルネックは「save した後、Firestore に届いたか / 未同期で端末に残っているだけか」が見えないこと。既存 Header の ☁️ アイコンは `syncing={loading}` (初回ロード中フラグ) のみを反映、実 write の pending を反映していない (= 永遠に success 色)。これを正確化し、4 値 (同期済/同期中/オフライン/エラー) で可視化 + 詳細 Popover (focus trap なし)。エラー解除は「次の成功 write」時のみ。APP_VERSION 4.7.32-S17 → 4.7.33-S17 ユーザー承認済。

### §5. 前提一覧表 (必須セクション、F7/F16 防止)
| # | 前提 | 根拠分類 | 根拠 | 未確認なら確認方法 |
|---|---|---|---|---|
| a | _pendingWrites の存在/件数は外部に出ていない、観測 API を追加すれば既存 save() を変えずに可視化可 | 資料 | `src/core/03_storage.js:86-109` 実コード確認 | — |
| b | 既存 save() のロジック (lsSave 先 / Promise chain 直列化 / cleanForFirestore / updatedAt 付与) を変えない | 設計選択 | 既存挙動の回帰防止 | — |
| c | Header.syncing は `app.jsx:2472 syncing={loading}` で初回 read flag のみを反映、write pending は未連動 | 資料 | `src/app.jsx:2472` + `Header.jsx:20,75` 実コード確認 | — |
| d | Popover は focus trap なし、ESC + 外側 click + tap で開閉 | ユーザー明示 | 2026-05-21 ユーザー指示「focus trap なし、モーダルではなく状態表示」 | — |
| e | オフライン表示と pending 表示を検証で混同しない、別項目で確認 | ユーザー明示 | 2026-05-21 ユーザー指示「擬似 offline と pending 永続を混同しない」 | — |
| f | エラー解除条件は「次の成功 write」のみ、Popover 開で消さない | ユーザー明示 | 2026-05-21 ユーザー指示「見逃し防止が目的、成功確認まで残す」 | — |
| g | navigator.onLine + online/offline event のみで offline 判定、SW fetch error 等は使わない | 設計選択 | 軽量・確実、§11 禁止 |  — |
| h | APP_VERSION 4.7.32-S17 → 4.7.33-S17 bump 承認済 | ユーザー明示 | 2026-05-21 ユーザー承認 | — |
| i | 4 値の優先順位: error > offline > syncing > idle | 設計選択 | 赤が最強信号、見逃し防止 | — |
| j | 既存 loading (初回 read) も "syncing" に統合表示、UX 後退なし | 設計選択 | 既存 Header 表示の semantics を壊さない | — |

### §11. 禁止事項 (必須セクション)
- 既存 save() のロジック (lsSave 先 / Promise chain / cleanForFirestore / updatedAt 付与 / 直列化) を変えない。
- _pendingWrites の semantics (key 単位、Promise chain) を変えない。観測 listener 追加のみ。
- Popover に focus trap を入れない、新規ボタン/フォームを入れない、軽量な状態表示に留める。
- エラー赤色を Popover 開閉では消さない、次の成功 write でのみ消す。
- offline 判定に SW fetch error / connection RTT / 高機能 API を使わない、navigator.onLine + online/offline event のみ。
- retry / 手動再送 / 同期履歴 / バックアップ生成 UI を本件に混ぜない。
- Service Worker / manifest 強化 (R1-2 Stage 3) を本件に混ぜない。
- enablePersistence 失敗経路の表面化を本件に混ぜない (G 別作業)。
- 残 entry leak 2 件 (handleQuickAddSave / handleMergeConfirm) に手を出さない。
- 既存 toast 経路 (notifySaveError → app.jsx:993) を壊さない。
- APP_VERSION の独断変更 / Stage 番号 -S18 系への独断変更 / build.ps1 編集を禁止。

### §12. 停止条件 (必須セクション)
- 既存 save() 経路の挙動が変化する兆候 (race / 順序逆転 / cleanForFirestore 動作変化) → 即停止、ロールバック優先。
- 既存 toast 経路 (notifySaveError → app.jsx:993) で回帰観測 → 即停止。
- D1〜D12 必須項目のいずれか FAIL が 1 回最小修正で解消しない → 停止。
- D9 (R1-smoke) / D10 (既存 4.7.29-32 挙動) で回帰観測 → 即停止、ロールバック。
- Header レイアウトが大きく崩れる / 既存 weather/settings/logout アイコンの位置がずれる → 停止。
- Popover 実装が「最小状態表示」を超える (フォーム / 設定 / list scroll 等) → 停止。
- 触るファイルが本設計スコープ外 (03_storage.js / app.jsx / Header.jsx / SyncStatusPopover.jsx 新規 / 01_constants.js / ログ系) に広がる → 即停止。
- focus trap / retry / 再送ボタン / 同期履歴を入れたくなった瞬間 → 停止。
- offline 判定を service worker fetch error などで高機能化したくなった瞬間 → 停止。

### §14. Gate 2 へ必ず転記する制約 (必須セクション)
- 触るファイル: src/core/03_storage.js (公開 API 追加のみ、save() 本体不変) + src/app.jsx (state 統合) + src/ui/common/Header.jsx (4 値表示) + src/ui/common/SyncStatusPopover.jsx (新規、focus trap なし) + src/core/01_constants.js (APP_VERSION bump) + v4/index.html (build 出力) + ログ系のみ。
- build.ps1 / v4/sw.js / v4/vendor/ / 既存 save() / Firestore enablePersistence 不変。
- 4 値: error > offline > syncing > idle、優先順位はこの順。
- syncing 統合: pendingCount > 0 OR (既存) loading。
- Popover は focus trap なし、ESC + 外側 click + tap で開閉、新規ボタン無し。
- エラー解除は「次の成功 write 観測時」のみ。
- offline 判定は navigator.onLine + window 'online'/'offline' event のみ。
- 検証 D1〜D12 必須 PASS、D4 (offline 表示) と D5 (save 直後 pending > 0) と D6 (pending 解消で復帰) を別項目で分離、D7 (error 表示) と D8 (次の成功 write でクリア) も別項目。
- APP_VERSION 4.7.32-S17 → 4.7.33-S17、R1-smoke T1 期待値も同時更新。
- 本件で達成: 条件3「保存・未同期がユーザーに見える」を Header 4 値 + Popover で可視化。本件で未達: enablePersistence 失敗経路の表面化、手動再送、retry、バックアップ生成 UI。

---

## 2026-05-25 直近 10 試合 勝率推移カード追加 — 分析タブ拡張 (画面が変わる作業)

### §1. 今回の論点
基礎工事 5 連続 push で UI 変化がゼロ → ユーザーのやる気消失。次は「画面で変化が分かる」作業を優先する判断。分析タブに「直近 10 試合 勝率推移」カード 1 つ追加。完成条件 5 (AI 文脈) 周辺ではあるが、直接効くのは「使う意味が見える」=やる気の橋渡し。

### §5. 前提一覧表
| # | 前提 | 根拠分類 | 根拠 |
|---|---|---|---|
| a | 折れ線は「最新側から見た直近10個までのローリング勝率点」(全履歴ではない) | ユーザー明示 | 2026-05-25 指示 |
| b | 安定ソート: tournament.date → tournament.id → matches[] 内 index → match.id | ユーザー明示 | 同日複数試合の順序ブレ対策 |
| c | カード内に「全期間から最新 10 試合」を明記、期間チップと非連動 | ユーザー明示 | 期間フィルタとの混同回避 |
| d | 結果 win/loss のみ、棄権・空欄は除外 (既存 _normalizeMatchResult を流用) | 既存挙動 | 他カードと同基準 |
| e | グラフはインライン SVG (ライブラリ追加なし) | 設計選択 | 軽量 |
| f | APP_VERSION 4.7.33-S17 → 4.7.34-S17 ユーザー承認済 | ユーザー明示 | 2026-05-25 |

### §11. 禁止事項
- 既存カード (全体 / 月別 / メンタル / ラケット / 対戦相手) を変えない。
- 期間チップと連動させない。
- グラフライブラリを追加しない。
- 練習試合と大会試合を区別しない (既存集計と同基準)。
- アニメーション / タップ詳細を入れない。
- build.ps1 を編集しない。
- APP_VERSION の独断変更をしない。

### §12. 停止条件
- 既存 InsightsTab の他カード描画が壊れる → 即停止、ロールバック。
- R1-smoke T1〜T7 のいずれか FAIL → 停止。
- console error 0 を維持できない → 停止。
- 触るファイルが InsightsTab.jsx + APP_VERSION 系 + ログ系を超える → 停止。
- グラフライブラリを足したくなった瞬間 → 停止。

### §14. Gate 2 へ必ず転記する制約
- 触るファイル: src/ui/insights/InsightsTab.jsx (helper 2 個 + Card component 1 個 + render 挿入) + src/core/01_constants.js + v4/sw.js + v4/index.html (build) + R1-smoke-test.md + ログ系のみ。
- helper: _isFlattenMatchesStable (4 段安定ソート) + _isLast10Trend (ローリング 10 点)。
- Card: _IsLast10Card (大数字 + SVG 折れ線 + W/L チップ列、subtitle="全期間から最新 10 試合")。
- データ少 (10 試合未満) は「あと N 試合で推移グラフが出ます」表示。
- APP_VERSION 4.7.33-S17 → 4.7.34-S17、sw.js / R1-smoke T1 同期。

---
