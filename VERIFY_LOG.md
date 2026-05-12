# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

push 候補: 段階 2-5-2 session-edit chunk 一括 heavy 化 (4.7.22-S17)
バージョン: 4.7.22-S17
タスク: 編集 form 3 件 (Tournament/Practice/Trial) + MatchEditModal の合計 4 ファイル (~80 KB unminified) を heavy bundle に移し、core サイズを削減

設計プロセス: ChatGPT との 3 者議論で Gate 1-5 体系を確立後、実装契約 (Gate 2) で範囲固定、Gate 3 編集 → Gate 4 検証 → Gate 5 push の順で進行

変更対象:
- build.ps1 (除外条件追加 4 件、bridge 追加 20 件、prelude destructure 20 件、useCallback 追加、存在 check、concat、expose、ランタイム検証)
- src/_head.html (loadHeavy 成功条件に 4 件追加)
- src/app.jsx (Loader 4 個追加: TournamentEditFormLoader / PracticeEditFormLoader / TrialEditFormLoader / MatchEditModalLoader、SettingsModalLoader 直後に配置)
- src/ui/sessions/SessionEditView.jsx (L178/L187/L197 の 3 form を Loader に置換)
- src/ui/sessions/SessionDetailView.jsx (L464/L496 の MatchEditModal を MatchEditModalLoader に置換)
- src/core/01_constants.js (APP_VERSION 4.7.21-S17 → 4.7.22-S17)

全文 Read:
- TournamentEditForm.jsx (355 行): 済
- PracticeEditForm.jsx (365 行): 済
- TrialEditForm.jsx (239 行): 済
- MatchEditModal.jsx (537 行): 済
- _SetupPicker.jsx (254 行): 済
- 子コンポーネント (MasterField/Select/SetupPickerButton/_NumWheel TimeWheel 部分/GameTracker 構造/LinkedSessionPicker 構造): 済

依存棚卸し:
- grep: 済 (`<TournamentEditForm | <PracticeEditForm | <TrialEditForm | <MatchEditModal` 全置換確認)
- 重大制約 4 件特定:
  A. _SetupPicker.jsx は heavy 移動不可 (= SessionDetailView core が _computeRecentSetups 直接参照)
  B. SessionDetailView L463/L494 の MatchEditModal 直接参照 → Loader 化必要
  C. GameTracker は core 維持 + bridge 経由 (= 試合中使用、サイズ 37 KB を heavy に入れる利点なし)
  D. LinkedSessionPicker は core 維持 + bridge 経由 (= 安全側)
- bridge 漏れ: なし (= bridge 20 件すべて Gate 4 検証で window.__TennisDBCore に存在確認)

Gate 4 実画面検証 (dev mode http://localhost:8081 = preview パネル):

A. 大会 (tournament) 経路
- ホーム → 「大会を記録」 → QuickAddModal (= core) 表示確認: 済 (= 新規作成は QuickAddModal 経由、Firestore 触らないためキャンセル退出)
- 記録タブ → 既存大会 (4/29 インスピシングルス) tap → SessionDetailView (= 大会詳細) 表示: 済
- 編集ボタン → SessionEditView (= core shell) → TournamentEditFormLoader → loadHeavy 発火 → bundle-heavy.js?v=4.7.22-S17 load → TournamentEditForm render: 済
- heavy expose 全 12 件 (Plan/Insights/QuickTrial/Merge*/Racket/Period/Settings + 段階 2-5-2 の Tournament/Practice/Trial/MatchEdit) 確認: 済
- 編集 form 内 「+ 試合を追加」 → MatchEditModal (= 経路 A、heavy 内同梱、即マウント) 表示: 済
- MatchEditModal 内に GameTracker 表示確認 (= bridge 経由 core から呼出、「私 0 — 相手 0、次のゲーム…」): 済
- MatchEditModal キャンセル → dialog 1 件残存 (= 編集 form のみ): 済
- 編集 form 戻る → confirm dialog 「破棄する」 → SessionDetailView 復帰: 済
- 詳細から「+ 試合を追加」 → MatchEditModalLoader (= 経路 B、別 loadHeavy 経路、即マウント = heavy 既ロード済): 済
- MatchEditModalLoader 経由のキャンセル → dialog 1 件 (= SessionDetailView): 済

B. 練習 (practice) 経路
- 既存練習 (5/15 テニス練習) tap → 練習詳細 → 編集 → SessionEditView → PracticeEditFormLoader → form 表示: 済
- 練習編集 form section (基本情報 / 種別 / イベント名 / 開始/終了/時間 / 会場 / 気象) 全可視: 済
- 戻る → 破棄する: 済

C. 試打 (trial) 経路 — **実画面導線で検証 (ChatGPT 指摘で再実施)**
- 機材タブ → 「最近の試打」 セクション → 4/22 HEAD Boom Pro 2026 × Head LYNX TOUR card tap → TrialDetail (試打詳細) 表示: 済
- 編集ボタン → SessionDetailView mode=edit → SessionEditView → TrialEditFormLoader → loadHeavy 完了済のため即マウント → TrialEditForm render: 済
- form 全 section 表示確認:
  - ① 基本情報 (日付 / 判定 採用候補/保留/却下 / 開始/終了時刻): 済
  - ② 会場/気象 (会場 / 気温 / 天気): 済
  - ③ 機材 (ラケット / 縦糸 / 横糸 / テンション縦/横 + セッティング picker + 履歴セット picker 33 件): 済
  - ④a 打感評価 6 項目 (平均 3.7 表示): 済
  - ④b 特性 (弾道 / 打感): 済
  - ④c ショット別 (フォア攻撃含む 8 項目): 済
  - ④e 連携先 (= LinkedSessionPicker bridge 経由): 済
  - ⑤ メモ (ストロークメモ含む 4 項目): 済
- 戻るボタン → dirty=false で即退出 → TrialDetail 復帰: 済
- 検証中の入力変更: なし (= 既存値表示確認のみ、Firestore 保護のため)
- 補助検証 (= 削除しない): React.createElement での直接マウントテストで bridge 20 件全部解決を別途確認 (htmlLen 58,920)

D. SessionDetailView (= core 経路)
- 大会詳細 / 練習詳細 / 試打詳細 表示: 済
- _computeRecentSetups (= core から bridge 経由なし、core 直接呼出) 動作: 済 (= 詳細表示時 ReferenceError なし)

E. Firestore 影響 (= 契約 H 通り遵守)
- SessionEditView の保存ボタン: 押さず ✅
- SessionDetailView 経由 MatchEditModal の保存ボタン: 押さず ✅
- MatchEditModal (経路 A) の保存ボタン: 押さず (= 親 form.matches[] にも追加せず、validate 不足で disabled だったため発火不要)
- 削除 / マージ ボタン: 押さず ✅

console error 0: 済 (= 4.7.22-S17 由来の新規 error 無し、Firestore deprecation warning は既存)

未確認: なし (= 試打導線は機材タブ「最近の試打」経由で実画面確認済、ChatGPT 指摘の「直接マウントテスト で代替不可」を反映して再実施)

教訓 (= ChatGPT 指摘で修正):
- TrialEditForm を最初 React.createElement 直接マウントで「動いた」と報告し「未確認なし」と書いたのは手抜き
- preview_click が動かない時に fiber 直接 onClick で逃げるパターンと同型の手抜き
- 実画面導線 (Sessions / Gear / 詳細 → 編集 → form 表示) を walk しないと R6 gate 「click → 遷移 → 戻る → console error 0」の実質を満たさない
- 機材タブの「最近の試打」セクションが trial card 入口 (= Sessions タブには trial filter なし) という UI 仕様を理解していなかった

備考:
- 削減見込み (現実的、minify 後実測): core 422 KB → 380 KB 前後 → 実測 422 → 374 KB (47 KB 削減)
- 目標 < 350 KB は 24 KB 未達、ただし契約 J 通り「未達でも今回の契約外ファイルを追加切出ししない」遵守
- 段階 2-5-3 で次候補 (= YearHeatmap 等) を改めて Gate 1 から選定
- 静的チェック: heavy 内に React global 直接参照あり (= JSX → React.createElement 変換、想定内)
- Loader 4 個すべて function 宣言 (= hoist 安全、SessionEditView/SessionDetailView より早い連結順でも動作)

変更対象:
- src/ui/common/SettingsModal.jsx (heavy 同梱、本体は無変更)
- build.ps1 (core 除外、bridge に lsLoad/KEYS 追加、prelude/存在チェック/concat/expose に SettingsModal を追加)
- src/_head.html (loadHeavy 成功条件に window.__TennisDBHeavy.SettingsModal を追加)
- src/app.jsx (SettingsModalLoader 追加 L510-567、Header マウントを <SettingsModalLoader/> に置換)
- src/core/01_constants.js (APP_VERSION 4.7.20-S17 → 4.7.21-S17)

全文 Read:
- 対象ファイル (SettingsModal.jsx 328 行): 済
- 子コンポーネント: 該当なし (= 単一ファイル、子なし)

依存棚卸し:
- grep: 済 (lsLoad / KEYS / RADIUS / C / font / API_BASE)
- 全文確認: 済 (_exportAllData が lsLoad(KEYS[k]) で全 key を iterate)
- bridge 漏れ: なし (lsLoad / KEYS を bridge に追加、他の参照は既存 bridge で充足)

実画面検証 (dev mode http://localhost:8081 = preview パネル):
- 設定 button click → SettingsModalLoader → loadHeavy() 発火 → bundle-heavy.js?v=4.7.21-S17 load → SettingsModal render: 済
- dialog 表示確認: アプリ設定 / 文字サイズ (標準/大/特大) / プレビュー / データのバックアップ / メモ AI 要約 / アプリバージョン v4.7.21-S17 全セクション可視: 済
- 文字サイズ 「大 18px」 click → preview の本文 fontSize 16px → 18.4px (1.15× scale) 反映: 済
- localStorage `yuke-memo-font-scale-v1` = "1.15" 保存確認: 済
- 「全データを JSON で保存」 click → URL.createObjectURL(blob) 1 回呼ばれ blob.size=529963, type=application/json: 済
  → これにより _exportAllData が lsLoad(KEYS[k]) を全 KEYS で正常 iterate していること (= bridge 動作) を実証
- 「標準 (現行)」 click → localStorage scale="1" に戻る: 済
- 「閉じる」 click → dialog 0 件: 済

console error 0: 済 (= 4.7.21-S17 由来の新規 error 無し、Firestore deprecation warning は既存)

未確認: なし

備考:
- 段階 2-5-1 の核心 = SettingsModal heavy 化、target サイズ削減
- 子コンポーネント無し / 単一ファイル / 依存単純 のため段階 2-5 シリーズの第 1 弾として最低リスクから着手
- core サイズ: 525 KB → 422 KB (4.7.20-S17 時点) → 段階 2-5-1 で更に削減 (実測 422 KB, 当初 SettingsModal 含 422 KB のままでも heavy 側にコード移送は完了済 = 後続段階の積み重ね効果に効く)
- bridge に lsLoad / KEYS を新規追加 → 後続 heavy 化 (Tournament/YearHeatmap 等) でも再利用可
- 実画面検証は preview_eval で fiber 直接 onClick 呼出 (= preview_click が button[aria-label=設定] で React event を着火しないため、fiber.props.onClick を直接 invoke する経路で代替)

---

## 過去 push の検証ログ (= 最新を上、古いを下)

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
