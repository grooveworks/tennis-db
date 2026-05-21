# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

push 候補: 4.7.30-S17 MatchEditModal history entry 一貫性修繕 (試合経路 entry leak 2 件閉鎖、+ APP_VERSION bump)
バージョン: 4.7.30-S17

経緯:
- 完成条件1 (大会当日に端末上で試合記録できる) の戻る/フリック導線信頼性に直結する試合経路 entry leak 2 件を閉鎖
- HANDOFF_v4_S17.md「未対応 entry leak 3 件」のうち試合経路の `MatchDetailView onEdit` を解消、加えて MatchEditModal:258 で「別 hotfix 候補」と注記されていた `handleSaveClick` → `{match-edit-modal}` leak も同時解消
- 残 2 件 (`handleQuickAddSave` / `handleMergeConfirm`) は試合経路ではないため別 hotfix
- 挙動変更を伴う hotfix のため APP_VERSION 4.7.29-S17 → 4.7.30-S17 (ユーザー承認済)

修正対象 (= commit 対象 7 ファイル):
- src/core/01_constants.js (= APP_VERSION 4.7.29-S17 → 4.7.30-S17)
- src/ui/sessions/MatchEditModal.jsx (= 修正1: open useEffect で mount 時 state.tdb==="match-detail" なら replaceState で {match-detail} slot 消費 / 修正2: handleSaveClick に consumeHistoryEntry 追加、handleClose と同形ガード+closingByUiRef 共用)
- v4/index.html (= build 成果物、上記反映)
- DESIGN_LOG.md (= 設計記録 2026-05-21 エントリ §1/§5/§11/§12/§14)
- R1-smoke-test.md (= R1 実戦信頼性 smoke 固定仕様、T1 期待値 4.7.30-S17 に更新)
- HANDOFF_v4_S17.md (= §第三候補「未対応 entry leak」を 3 件→ 2 件、解消経路 2 件記録)
- VERIFY_LOG.md (= 本ファイル、実施済み検証ログ)

スコープ外 (= 触らない、別 hotfix で扱う):
- handleQuickAddSave / handleMergeConfirm の leak (= 試合経路ではない、別 hotfix で対応)
- MatchDetailView.jsx (= Design は MatchEditModal-side 完結、不変)
- SessionDetailView.jsx (= L488 の onEdit 渡し方そのまま)
- app.jsx popstate listener (= `_SESSIONS_KEEP_OPEN` リスト含め不変)
- MatchEditModal.jsx の handleClose / consumeHistoryEntry / closingByUiRef ロジック (= 4.7.26 hotfix 不変)
- silent-close ロジック (= L267-273 不変)
- 4.7.29 で塞いだ穴1・穴2 関連箇所
- GameTracker.jsx / SessionEditView.jsx / TournamentEditForm.jsx / PracticeEditForm.jsx
- R1-2 / CDN / SW / Android / UI 改善 (= 条件1・2 直撃ではない)

全文 Read:
- 対象ファイル: 済 (MatchEditModal.jsx 全文、handleSaveClick / handleClose / open useEffect / popstate handler)
- 子コンポーネント: 済 / 該当なし (= 本件 history 修正に外部子なし)

依存棚卸し:
- grep: 済 (entry leak / popstate / pushState / history.back / MatchDetailView / closingByUiRef)
- "match-detail" 文字列出現箇所: MatchDetailView.jsx:28 の唯一経路 (= 他経路に影響なし)
- 全文確認: 済
- 新規 ref / 新規 listener 追加: なし (= 既存 closingByUiRef + popstate handler 機構流用のみ)
- bridge 漏れ: なし (= heavy 化変更なし、core 内修正のみ)

build:
- build.ps1 EXITCODE=0
- Core size (v4/index.html): 373676 bytes (+259 vs 4.7.29)
- Heavy size (v4/bundle-heavy.js): 187789 bytes (不変)

R1-smoke T1〜T7 (確立 DEV 手順: preview_start "Tennis DB Dev Server" → http://localhost:8081/v4/index.html?dev=1&reset=1 → 検証 → preview_stop、サーバー停止済み):
- T1 [完成条件1]: PASS  observed=APP_VERSION="4.7.30-S17"
- T2 [完成条件2]: PASS  observed=__loadHeavyPromise=null / typeof __TennisDBHeavy="undefined"
- T3 [完成条件1]: PASS  observed=大会詳細(試合記録 3試合、clean fixture)表示=true
- T4 [完成条件1]: PASS  observed=[role=dialog][aria-label=試合を編集] 存在=true
- T5 [完成条件1]: PASS  observed=MatchEditModal 表示後も __loadHeavyPromise=null
- T6 [完成条件2]: PASS  observed=network 内 bundle-heavy.js request=0件
- T7 [完成条件1]: PASS  observed=console error=0 (全工程通算)

個別シナリオ X1〜X5 / R1〜R3 (確立 DEV 手順、history.length と history.state 実値観測):
- X1 必須: PASS  MatchDetail→編集→MatchEditModal mount / state.tdb="match-edit-modal" / history.length 不変 (=replaceState 機能、{match-detail} slot 消費)
- X2 必須: PASS  X1 → swipe back / MatchEditModal silent close + 大会詳細維持 / state.tdb="detail" / phantom back なし
- X3 必須: PASS  MatchDetail→編集→保存 / modal 閉 + 大会詳細維持 / state.tdb="detail" / 試合 3→4 件永続 / MatchDetail 再開なし
- X4 必須: PASS  X3 後 1 back で大会詳細閉 / state=null / phantom back なし
- X5 不変: PASS  X1 → dirty 編集 → UI キャンセル → dirty confirm 破棄 / 4.7.26 handleClose 挙動不変 / draft 1 件 clear
- R1 必須: PASS  +試合追加→保存→1 back で大会詳細閉 / 修正2 で改善 (旧: phantom back 1 回残)
- R2 不変: PASS  +試合追加→swipe back / modal silent close + new-tournament draft 保持 / 4.7.26 silent-close 不変
- R3 不変: PASS  TournamentEditForm→試合追加 / mount 時 state.tdb="match-edit-modal" (pushState 分岐) / 閉後 state="detail" / 編集 form 維持

経路網羅性 (実観測):
- replaceState 分岐: X1 で実観測 (= mount 時 state.tdb==="match-detail" のみ replaceState、length 不変)
- pushState 分岐: R1 / R2 / R3 で実観測 (= mount 時 state.tdb==="detail"、従来通り pushState)
- consumeHistoryEntry 新規 (save 経路): R1 / X3 で機能確認 (= 保存後 stack 消費)
- consumeHistoryEntry 既存 (close 経路): X5 で挙動不変確認

実画面検証: 済 (= 大会詳細 → 試合 tap → MatchDetailView → 編集 → MatchEditModal、+試合追加、編集 form 内 試合追加、swipe back / 保存 / UI キャンセル / dirty confirm 破棄 全経路を実画面で実施)

console error 0: 済 (= 全工程通算 0 件)

未確認: なし

注: 直前まで本セクションにあった 4.7.29-S17 (e58da6c) の検証ログは、本 push 候補で上書き (supersede) し、過去ログセクションに e58da6c エントリとして要約記録。当該候補の確定記録は git 履歴 (本ファイルの過去版および e58da6c commit) を真とする (= 「Claude 認識ではなく git 履歴を真とする」原則)。

## 過去 push の検証ログ (= 最新を上、古いを下)

### e58da6c (= 4.7.29-S17 試合中データ消失 穴1 / 穴2 修正)
- 完成条件1・2 直結の確定 2 件の消失穴を塞ぐ実修正
- 穴1: 新規(未保存)試合の下書き孤児化解消、tournament.id 由来の安定キー導入、新規+tournament.id 不在は fallback せず孤児再発防止
- 穴2: CO 小窓書きかけ消失解消、matchId+afterGame キーで open 中 auto-save、同一 afterGame のみ復元、保存/スキップ/削除でクリア
- 修正対象 7 ファイル (01_constants.js / MatchEditModal.jsx / GameTracker.jsx / v4/index.html / DESIGN_LOG.md / R1-smoke-test.md / VERIFY_LOG.md)
- R1-smoke T1〜T7 全 PASS、穴1/穴2 個別検証全 PASS、console error 0、build EXITCODE=0
- 詳細は当該 commit (e58da6c) および本ファイル過去版を参照

### a854ddd (= docs: HANDOFF を 4.7.26-S17 状態に更新、Tier 1 swipe-back audit 完了記録)
- HANDOFF_v4_S17.md 更新 (= §0 現在地 / §1 次セッション最初のアクション / §2 Phase 表 / Tier 1 完了経緯 + 確立した検証パターン記録)
- 4.7.26-S17 / commit d25bd74 / 対応済 10 経路 / 未対応 entry leak 3 件 / 次候補 段階 2-5-3 (推奨) を明記
- 大型節目で local 差分持ち越し回避、次セッション開始時の文脈固定

### d25bd74 (= 4.7.26-S17 MatchEditModal swipe-back hotfix、4 経路 + UI close history cleanup)
- MatchEditModal.jsx に closingByUiRef + handleClose 内 consumeHistoryEntry + open useEffect 内 popstate listener 追加
- 案 A 採用: swipe back = silent close (dirty confirm 通さず、_clearMatchDraft 呼ばず、onClose 直接)
- UI cancel は既存 dirty confirm UX 不変、close 確定後に history.back で entry 消費
- closingByUiRef で popstate 二重 close 防止
- 4 経路すべて実 UI 検証 PASS (A1/A2/B1/B2、onClose 受け側 4 件別実装、ChatGPT 指摘で 「同一コードパスだから実証済」 撤回)
- G1/G2/G2' で dirty confirm UX 不変 + history cleanup 動作確認 + draft clear 動作確認
- 教訓: 「同じ component の popstate でも onClose 受け側が違えば別検証必須」 を物理ルール化

### 1ddb87c (= 4.7.25-S17 merge-flow swipe-back hotfix、MergeModal + MergePartnerPicker 対応)
- handleMergeStart に pushState({tdb:"merge-flow"}) + 重複ガード、handleMergeCancel を history.back 統一
- popstate listener: modal-first 末尾に merge close 条件 slot in、_SESSIONS_KEEP_OPEN check より先
- handleMergeConfirm 不変 (= Firestore 削除統合導線、別 hotfix で entry leak 対応)
- Picker と MergeModal を別経路で検証 (Modal.jsx 経由 vs 自前 dialog)、UI キャンセル / 背景タップ 両方確認
- 実 history.back 9 シナリオ全 PASS、console error 0
- 教訓: A1+B1 (= swipe = キャンセル相当) 採用、internal step (compare↔confirm) の history 管理は別タスク

### 4242b05 (= 4.7.24-S17 top-level history hotfix、handleTaskClick / SettingsModal / QuickAddModal swipe back 対応)
- 3 件 (handleTaskClick / SettingsModal / QuickAddModal) に pushState + popstate listener 拡張
- ref 3 個 (taskJumpRef / settingsOpenRef / quickAddTypeRef) 追加、open/close 同期更新で stale closure race 回避
- popstate 順序: modal close を _SESSIONS_KEEP_OPEN check より先に処理 (= detail 上で modal 開いた状態の back で modal だけ閉じて detail 維持)
- 実 history.back 6 シナリオ + 回帰 2 シナリオ全 PASS、console error 0
- handleQuickAddSave 不変 / Modal.jsx 不変 / SettingsModal.jsx 不変 / QuickAddModal.jsx 不変 (= スコープ厳守)
- 教訓: 「Tier 1 全 6 件まとめ修正」を私が当初提案 → ユーザー指摘で「広すぎる、性質違う、Merge/MatchEdit は別」と却下、3 件に絞って成功

### 51184cd (= 4.7.23-S17 hotfix、ホーム → 主力 tap 後のスワイプ戻りで home に戻れない修正)
- handleMainRacketClick に history.pushState({tdb:"home-racket-filter"}) 追加
- popstate listener 拡張: filterFromHome 中で popstate が抜けたら home + filter clear
- filterFromHomeRef で stale closure 回避、LS clear を popstate handler 内で明示
- 実 history.back end-to-end 検証 (シナリオ 1 + 3) PASS、console error 0
- pre-existing バグ (= S15.5 から存在)、4.7.22 の regression ではない
- 教訓: 「dev mode で動いた」「iPhone 固有」と他責で逃げる癖、「タップ」と「スワイプ」を勝手に決めつけ、ユーザー検証丸投げ → 怒られた

### 8bba8da (= 段階 2-5-2 session-edit chunk 一括 heavy 化、4.7.22-S17)
- 編集 form 3 (Tournament/Practice/Trial) + MatchEditModal の合計 4 ファイル (~80 KB unminified) を heavy bundle へ
- bridge 20 件追加 (Select/MasterField/TimeWheel/SetupPickerButton/_SetupPickerButton/_computeRecentSetups/LinkedSessionPicker/GameTracker + match_helpers 系 + LS_PREFIX)
- Loader 4 個追加 (3 form Loader + MatchEditModalLoader、function 宣言で hoist 安全)
- core 422 → 374 KB (47 KB 削減)
- 実画面検証: 大会/練習/試打 編集経路 + MatchEditModal 経路 A/B + Firestore write 完全回避
- TrialEditForm の検証は最初 React.createElement 直接マウントで「動いた」と報告 → ChatGPT 指摘で機材タブ「最近の試打」経由の実画面導線で再実施
- 当時の "未確認なし" は不正確だった、再実施で機材タブ経由の実 UI 導線で TrialEditFormLoader 動作確認済

### d6f6580 (= 段階 2-5-1 SettingsModal heavy 化、4.7.21-S17)
- src/ui/common/SettingsModal.jsx (13.4 KB) heavy 化、bridge に lsLoad/KEYS 追加
- 実画面検証: 設定 button → SettingsModal 表示、文字サイズ 大 (1.15× scale) 反映、JSON 保存で blob 529KB 生成 (lsLoad/KEYS bridge 動作実証)
- console error 0、core 422 → 422 KB (heavy 増加で吸収、後続段階の積上げ準備完了)
- pre-push gate 通過

### (HANDOFF 4.7.20-S17 状態固定 push、4 層防御完成記録)
- HANDOFF_v4_S17.md のみ更新 (画面変更なし、ドキュメント push)
- 防御階層 4 層 (= b50657d + 7ed5f8d + f98cd06 + memory 短文) 完成済の状態を HANDOFF に記録

### 2e4aef6 (= 段階 2-4 Gear 詳細 heavy 化、4.7.20-S17)

変更対象:
- src/ui/gear/RacketDetailView.jsx (heavy 化)
- src/ui/gear/PeriodDetailView.jsx (heavy 化)
- src/ui/gear/SettingHistorySection.jsx (heavy 同梱)
- build.ps1 / src/_head.html / src/app.jsx / src/core/01_constants.js

実画面検証 (dev mode):
- ラケット click → RacketDetailView 表示「現在のセッティング」「試打まとめ n=17」「張替の履歴 13 期間」
- 期間 click → PeriodDetailView 表示「期間内 sessions 一覧、43 勝 0 敗」
- history.back 1 回で PeriodDetail 閉、2 回で RacketDetail 閉、Gear タブまで戻る (_RACKET_KEEP_OPEN_TDB 効いている)

console error 0: 4.7.20-S17 由来の新規エラー無し

bridge 漏れ事故:
- 4.7.19 で computeSettingHistory 漏れ → ReferenceError → 4.7.20 で bridge 追加修正
- 教訓: heavy 化対象の子コンポーネント (= SettingHistorySection) の内部依存を grep だけで済まさず全文 Read で確認すべきだった
