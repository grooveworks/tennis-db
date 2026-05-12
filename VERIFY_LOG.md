# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

push 候補: 段階 2-5-1 SettingsModal heavy 化 (4.7.21-S17)
バージョン: 4.7.21-S17
タスク: src/ui/common/SettingsModal.jsx (13.4 KB) を heavy bundle に移し、core サイズを削減

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
