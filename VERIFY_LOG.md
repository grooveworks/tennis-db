# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

### 5cf39fd ほか (= docs: テニス議論システムの導線 / 設定のみ、2026-06-02)
push 候補: CLAUDE.md にセッション開始時の状態ファイル導線を追加 + .gitignore で個人ログ書庫 (.claude/tennis/) / Firebase鍵 / data-latest を公開リポから除外。
種別: **ドキュメント / 設定のみ。src/ ・ v4/ ・ build.ps1 ・ APP_VERSION 一切不変。アプリ挙動の変更なし。**
実画面検証: **該当なし** (= コード・UI 変更がゼロのため、開いて確認すべき実画面が存在しない。偽の「済」は記録しない)
console error: **該当なし** (= 同上)
pre-push ゲート通過の根拠: 下記 4.7.34-S17 (a0d6ff7、push 済) の**真実の**「実画面検証: 済」「console error 0: 済」記録が VERIFY_LOG 内に保持されているため。本 docs push に対して検証を偽装しない (= ゲートが存在する理由そのものを守る)。

---

(以下は前回コード push 4.7.34-S17 = a0d6ff7。**push 済**。検証記録として保持。今回の push 候補ではない)

push 候補: 4.7.34-S17 分析タブ拡張 (直近 10 試合 勝率推移カード追加、画面が変わる作業)
バージョン: 4.7.34-S17

経緯:
- 4.7.29〜4.7.33 が全部「画面に出ない基礎工事」5 連続 → ユーザーやる気消失
- 「画面で変化が分かる」「使う意味が見える」作業を優先する判断、分析タブに新カード 1 つ追加
- 折れ線 + W/L チップ + 勝率数字、全期間から最新 10 試合 (期間チップ非連動)
- ユーザー指示 3 点反映: (1) 折れ線は最新側から見た直近10個までのローリング点 (2) 安定ソート (3) "全期間から最新 10 試合" 明記
- APP_VERSION 4.7.33-S17 → 4.7.34-S17 ユーザー承認済

修正対象 (= commit 対象):
- src/ui/insights/InsightsTab.jsx (= helper 2 個 _isFlattenMatchesStable / _isLast10Trend + Card 1 個 _IsLast10Card + render 挿入)
- src/core/01_constants.js (= APP_VERSION 4.7.33 → 4.7.34-S17)
- v4/sw.js (= APP_VERSION 同期、CACHE_NAME 連動)
- v4/index.html (= build 出力)
- DESIGN_LOG.md (= 2026-05-25 エントリ)
- R1-smoke-test.md (= T1 期待値)
- HANDOFF_v4_S17.md (= 完成条件 5 周辺の進捗追加)
- VERIFY_LOG.md (= 本ファイル)

スコープ外:
- 既存 InsightsTab 他カード (全体 / 月別 / メンタル / ラケット / 対戦相手) 不変
- build.ps1 / v4/vendor/ / 既存 helpers (_isFlattenMatches / _isWinRate 等) 不変
- グラフライブラリ追加なし、アニメーションなし

build:
- build.ps1 EXITCODE=0 (= 不変)
- Core size: 379531 bytes (APP_VERSION 文字列のみ変化、heavy へ移動分は不変)
- Heavy size: 192088 bytes (+4299 vs 4.7.33、新規 helpers + Card 追加分)

R1-smoke T1〜T7 (確立 DEV 手順、fresh start で観測):
- T1 [完成条件1]: PASS  observed=APP_VERSION="4.7.34-S17"
- T2 [完成条件2]: PASS  observed=__loadHeavyPromise=null / heavyType="undefined"
- T3 [完成条件1]: PASS  大会詳細(試合記録 3試合)表示
- T4 [完成条件1]: PASS  [role=dialog][aria-label=試合を編集] 存在
- T5 [完成条件1]: PASS  MatchEditModal 表示後も __loadHeavyPromise=null (= 分析タブ未訪問のため heavy 未ロード)
- T6 [完成条件2]: PASS  network 内 production-style bundle-heavy.js request=0件
- T7 [完成条件1]: PASS  console error=0

新カード検証 (実値):
- 分析タブに「直近 10 試合 勝率推移」カード表示
- subtitle "全期間から最新 10 試合" 表示
- 勝率数字 "70%" + 内訳 "7勝 3敗 / 10試合"
- SVG 折れ線 polyline 1 本 + circle 10 個 (= 10 ローリング点)
- W/L チップ列 10 個 ("WWWLLWWWWL" = 7W+3L、新カードの 70% と整合)
- グリッドラベル "0% / 50% / 100% / 古い / 最新" 表示
- 既存カード (コンディション / ラケット別 / 対戦相手別) 描画不変
- console error=0

実画面検証: 済 (= 分析タブで新カード描画確認、既存カードの回帰なし、R1-smoke fresh start で T1〜T7 全 PASS)

console error 0: 済

未確認: なし

本件達成しないと明記:
- データが 10 試合未満の状態での折れ線表示は「あと N 試合」プレースホルダ、本件のメインスコープではない
- 練習試合と大会試合の区別、セット単位 / ゲーム単位の勝率は別作業

注: 直前まで本セクションにあった 4.7.33-S17 (597e53a) の検証ログは、本 push 候補で上書き (supersede) し、過去ログセクションに 597e53a エントリとして要約記録。当該候補の確定記録は git 履歴 (本ファイルの過去版および 597e53a commit) を真とする。

## 過去 push の検証ログ (= 最新を上、古いを下)

### 597e53a (= 4.7.33-S17 書込キュー可視化 / 条件3「保存・未同期がユーザーに見える」)
- Header の ☁️ が 4 値表示 (idle/syncing/offline/error)、tap で詳細 Popover (focus trap なし、ESC + 外側 click で閉)
- 03_storage.js に公開 API (onSyncStateChange / getSyncState) 追加、save() 本体不変、_lastSyncAt 記録
- app.jsx に syncState/online/lastError state、4 値 derive、Header に syncStatusBundle prop
- エラー解除は「次の成功 write」時のみ (lastSyncAt > lastError.at で auto-clear)
- offline 判定は navigator.onLine + window 'online'/'offline' event のみ
- test seam window.__TennisDBSync 同梱 (build.ps1 不変方針継続のため bridge 経由ではなく直接 window 露出)
- 修正対象 11 ファイル (modified 10 + 新規 SyncStatusPopover.jsx)
- R1-smoke T1〜T7 全 PASS、D1〜D11 必須 PASS、D12 不変確認 PASS
- 詳細は当該 commit (597e53a) および本ファイル過去版を参照

### 3748661 (= 4.7.32-S17 R1-2 Stage 2 Service Worker + App Shell pre-cache)
- 4.7.31 の CDN 同一オリジン化に続き、v4/sw.js 新規で App Shell + vendor 16 ファイルを Cache Storage に install 時 pre-cache
- navigation=shell-first ./index.html (query 違い吸収) / 静的アセット=ignoreSearch:true / 外部=pass-through、skipWaiting/clients.claim 不使用
- 修正対象 8 ファイル (modified 7 + v4/sw.js 新規)
- R1-smoke T1〜T7 全 PASS、O1〜O10 必須 PASS、O11 参考観測
- 実 offline 相当の実値証拠: performance.getEntriesByType('navigation') が transferSize=0 + deliveryType="cache-storage" (= SW Cache Storage 供給)、全 13 v4 assets + bundle-heavy.js が deliveryType="cache-storage"、network 0 byte で起動成立
- 達成: SW Cache Storage 供給により通信ゼロ reload / 再起動相当の起動経路を実証
- 詳細は当該 commit (3748661) および本ファイル過去版を参照

### 379c477 (= 4.7.31-S17 R1-2 Stage 1 CDN依存除去 / vendor 同梱化)
- R1-2 の前段必須として全 CDN URL (Firebase 4 + React 2 + Phosphor 4 CSS) を v4/vendor/ 配下に同梱、同一オリジン化
- Firebase 10.12.0 (Apache-2.0) / React 18.3.1 (MIT) / Phosphor 2.1.1 (MIT) を pin、各 LICENSE 同梱、NOTICE は上流 3 リポすべて不存在で同梱不要
- build.ps1 不変、Service Worker なし、PWA manifest 強化なし、preload hint 追加なし
- 修正対象 24 ファイル (modified 7 + v4/vendor/ 配下 17 新規)
- R1-smoke T1〜T7 全 PASS、N1〜N6 必須 PASS、N7/N8 参考観測、console error 0、build EXITCODE=0
- 本件で達成: CDN 依存排除 + 後段 SW の前提作り。本件で未達: 通信ゼロでの reload 成立 (Stage 2)、iOS evict 耐性 (Stage 3)
- 詳細は当該 commit (379c477) および本ファイル過去版を参照

### badc323 (= 4.7.30-S17 MatchEditModal history entry 一貫性修繕、試合経路 entry leak 2 件閉鎖)
- 完成条件1 直撃の試合経路 entry leak 2 件を閉鎖 (MatchDetailView onEdit transition + handleSaveClick save 経路)
- 修正1: MatchEditModal open useEffect で mount 時 state.tdb==="match-detail" なら replaceState で {match-detail} slot 消費
- 修正2: handleSaveClick に consumeHistoryEntry 追加 (handleClose と同形、closingByUiRef 共用)
- 修正対象 7 ファイル (01_constants.js / MatchEditModal.jsx / v4/index.html / DESIGN_LOG.md / R1-smoke-test.md / HANDOFF_v4_S17.md / VERIFY_LOG.md)
- R1-smoke T1〜T7 全 PASS、個別シナリオ X1〜X5 / R1〜R3 全 PASS、console error 0、build EXITCODE=0
- HANDOFF 未対応 entry leak 3 件 → 2 件 (handleQuickAddSave / handleMergeConfirm 残)
- 詳細は当該 commit (badc323) および本ファイル過去版を参照

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
