# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

push 候補: 4.7.31-S17 R1-2 CDN依存除去 (vendor 同梱化、+ APP_VERSION bump)
バージョン: 4.7.31-S17

経緯:
- R1-2「通信ゼロでも、タブレット単体で起動して試合記録できるか」の前段必須として、src/_head.html の全 CDN URL (Firebase 4 + React 2 + Phosphor 4 CSS = 10 箇所) を v4/vendor/ 配下に同梱して同一オリジン化
- 達成: CDN 依存排除 + 後段 Service Worker / App Shell の前提作り
- 達成しない (= 本件単独では不可、ユーザー承認): タブレット初期化直後 / no-cache / 通信ゼロ起動 (= Service Worker + 運用案内まで必要)
- browser cache 経由の offline reload は副作用としての参考観測のみ (PASS/FAIL 判定しない)
- build.ps1 不変、Service Worker なし、PWA manifest 強化なし
- 挙動変更 (起動経路の依存先変更) を伴うため APP_VERSION 4.7.30-S17 → 4.7.31-S17 (ユーザー承認済)

修正対象 (= commit 対象):
- src/core/01_constants.js (= APP_VERSION 4.7.30-S17 → 4.7.31-S17)
- src/_head.html (= 10 URL を ./vendor/ 相対パスに置換、script/link 順序不変)
- v4/vendor/ (= 新規同梱、git tracked):
  - firebase/ : firebase-app/auth/firestore/functions-compat.js (10.12.0) + LICENSE (Apache-2.0)
  - react/ : react.production.min.js + react-dom.production.min.js (18.3.1) + LICENSE (MIT)
  - phosphor/ : regular/duotone/fill/bold (style.css + 各 .woff2) + LICENSE (MIT)
- v4/index.html (= build 成果物、_head 反映)
- DESIGN_LOG.md (= 2026-05-21 R1-2 エントリ §1/§5/§11/§12/§14)
- R1-smoke-test.md (= T1 期待値 4.7.31-S17 に更新)
- HANDOFF_v4_S17.md (= R1-2 Stage 1 解消の記録追加)
- VERIFY_LOG.md (= 本ファイル、実施済み検証ログ)

スコープ外 (= 触らない):
- build.ps1 (= ユーザー明示、vendor は git tracked 同梱で copy step 不要)
- src/core/02_firebase.js (= Firebase API 利用箇所、SDK バージョン不変なので不変)
- src/app.jsx / 他 src 配下 (= _head.html と version 以外触らない)
- Service Worker / sw.js (= 別作業、本件では追加しない)
- PWA manifest / icons / theme_color (= 別作業)
- iOS evict 対策 (= 別作業)
- バージョン更新 (Firebase / React / Phosphor) (= 既存固定維持)
- 4.7.30 で塞いだ MatchEditModal history 修正
- 4.7.29 で塞いだ穴1・穴2 関連
- 残 entry leak 2 件 (handleQuickAddSave / handleMergeConfirm) (= 別 hotfix)
- preload / preconnect hint 追加 (= 最小変更原則)

全文 Read:
- 対象ファイル: 済 (_head.html 全文、Phosphor 4 style.css の @font-face 確認、build 出力 v4/index.html の置換結果確認)

依存棚卸し:
- grep: 済 (gstatic / unpkg / CDN / cdn\. / jsdelivr / cdnjs)
- v4/index.html 内 CDN URL: grep 0 件 (= ./vendor/ のみ)
- Phosphor CSS の @font-face url(): 全 4 ファイル "./Phosphor*.woff2" 相対参照、同階層 woff2 配置で resolve 想定通り
- LICENSE: 3 ライブラリすべて取得済 (Firebase Apache-2.0 14096B / React MIT 1086B / Phosphor MIT 1076B)

build:
- build.ps1 EXITCODE=0 (= 不変)
- Core size (v4/index.html): 373701 bytes (+25 vs 4.7.30、_head head comment 増分)
- Heavy size (v4/bundle-heavy.js): 187789 bytes (不変)
- v4/vendor/ 同梱合計: 1754086 bytes (1.67 MB) (= 想定 ~1.5MB の 11% 超、停止条件「大きく超過」には該当しないと判断、続行)

R1-smoke T1〜T7 (確立 DEV 手順: preview_start "Tennis DB Dev Server" → http://localhost:8081/v4/index.html?dev=1&reset=1 → 検証 → preview_stop、サーバー停止済み):
- T1 [完成条件1]: PASS  observed=APP_VERSION="4.7.31-S17"
- T2 [完成条件2]: PASS  observed=__loadHeavyPromise=null / typeof __TennisDBHeavy="undefined"
- T3 [完成条件1]: PASS  observed=大会詳細(試合記録 3試合、clean fixture)表示=true
- T4 [完成条件1]: PASS  observed=[role=dialog][aria-label=試合を編集] 存在=true
- T5 [完成条件1]: PASS  observed=MatchEditModal 表示後も __loadHeavyPromise=null
- T6 [完成条件2]: PASS  observed=network 内 bundle-heavy.js request=0件
- T7 [完成条件1]: PASS  observed=console error=0 (全工程通算)

R1-2 新規検証 N1〜N6 必須 / N7〜N8 参考観測:
- N1 必須: PASS  v4/index.html 内 CDN URL=0件 (grep 観測)、./vendor/ のみ
- N2 必須: PASS  起動後の network 内、app 発の外部 CDN host (gstatic/unpkg/cdnjs/jsdelivr) request=0件
  (注: 起動前に preview tool 自身のプリページが CDN を叩く出現は app と無関係、index.html?dev=1 以降の発信のみで判定)
- N3 必須: PASS  /v4/vendor/ 配下 fetch 成功: firebase-app-compat.js (200, 31444B), Phosphor regular Phosphor.woff2 (200), Phosphor fill Phosphor-Fill.woff2 (200)
- N4 必須: PASS  Firebase compat SDK が local vendor から読込、app/auth/firestore/functions 初期化で runtime error なし (window.firebase = object, firebase.apps.length = 1, window.React = object, window.ReactDOM = object)、dev mode 既存起動正常 (大会詳細表示・MatchEditModal 表示)
- N5 必須: PASS  Phosphor アイコン描画正常、icons.length=306、getComputedStyle.fontFamily="Phosphor"/"Phosphor-Fill" 確認
- N6 必須: PASS  console error=0 (preview_console_logs(error) 全工程通算 0 件)
- N7 参考観測: 実施せず (= browser cache 経由の offline reload は本件達成基準外、参考観測のみで PASS/FAIL 判定しない)
- N8 参考観測: v4/vendor/ 同梱 1.67 MB (内訳: Firebase 520KB / React 142KB / Phosphor CSS+woff2 1075KB + LICENSE 16KB)、計測値のみ記録、許容判定はユーザー

実画面検証: 済 (= 起動・記録タブ・大会詳細・MatchEditModal 開閉、確立 DEV 手順)

console error 0: 済 (= 全工程通算 0 件)

未確認: なし

本件達成しないと明記:
- タブレット初期化直後 / no-cache / 通信ゼロ起動: Service Worker (Stage 2) + iOS evict 対策 (Stage 3) まで必要、本件単独では不可
- iOS Safari evict 耐性: DESIGN_LOG.md:169「iOS で予告なく evict されうる」、別作業

注: 直前まで本セクションにあった 4.7.30-S17 (badc323) の検証ログは、本 push 候補で上書き (supersede) し、過去ログセクションに badc323 エントリとして要約記録。当該候補の確定記録は git 履歴 (本ファイルの過去版および badc323 commit) を真とする (= 「Claude 認識ではなく git 履歴を真とする」原則)。

## 過去 push の検証ログ (= 最新を上、古いを下)

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
