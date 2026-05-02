# HANDOFF v4 S17 Recovery (2026-05-03)

## 現在の状態 (再開時にここから)

- **HEAD**: 6deee44 (v4 S16.10d) — clean
- **working tree**: clean
- **stash@{0}**: "S17.x destructive wheel picker work, retained for reference only" (削除せず保存)
- **v4/index.html**: S16.10d (localhost:8080 + preview:8081 で daily 利用可能)
- **進行中の編集**: src/ui/common/SettingsModal.jsx に `_exportAllData` ヘルパー追加済 (UI 未配線、ビルド未実施、アプリ動作影響なし)

## 今日起きたこと (1 行)

ホイール picker (S17.0〜S17.6) を実装してユーザーの 2026-05-02 のデータを破壊。復旧不能。詳細: `memory/feedback_data_destruction_2026_05_03.md`

## ユーザーの directive (絶対)

1. **全部クリーンなコードで作り直せ、それ一択**
2. **patch 禁止** (band-aid 全廃、`Math.round` 等の値変換ロジック禁止、暗黙確定禁止、silent fail 禁止)
3. **勝手にセッションを切るな** (Phase 0/1/2 とか期間で逃げるな、continuous 実行)
4. **本業 DX が 2 ヶ月遅延中**、これ以上時間奪うな
5. **build.ps1 は承認後のみ** (= localhost 配信前にユーザー承認必須)
6. V4 全完遂後 V5 移行、V4 を見捨てない

## 「クリーン」の定義 (10 項目)

1. 値変換ロジック禁止 (Math.round/floor/ceil で既存値を変える書き戻し)
2. 暗黙確定禁止 (背景タップ・scroll・タイマーで onChange/onSave 発火させない)
3. silent fail 禁止 (try/catch で例外を握り潰さない、必ず notify)
4. debounce 書き込み禁止 (save() debounce 全廃、queueMicrotask 即時 set)
5. ID 生成統一 (genId() 一本化、Date.now() 単独 id 廃止)
6. closure stale 禁止 (setter は関数形式 setX(prev => ...))
7. onSnapshot self-echo guard (hasPendingWrites + 急減検知)
8. schema validation 強制 (空 form 保存禁止)
9. auth-tied cache (ログアウトで全 state + draft + cache クリア)
10. band-aid コメント禁止 (TODO/FIXME で逃げない)

## 次の着手 (中断地点から続ける)

1. `SettingsModal.jsx` の `_exportAllData` を呼ぶ **UI ボタン配線** を追加 (preview セクションとバージョン情報の間)
2. props で `toast` 受け取り、app.jsx 側から `toast={toast}` 渡す
3. ビルド (`build.ps1`) → preview で動作確認 (実機 download 確認)
4. ユーザー承認 → push
5. 次: 起動時 localStorage 自動 snapshot 機能 (1 日 1 回、7 日保持)
6. その後: F1 ガード (onSnapshot 空配列上書き防止)
7. その後: data layer クリーン作り直し (週単位の作業)

## 監査結果サマリ (要参照時用)

致命 18 件 + 高 30 件以上 + 中 14 件 + 低 4 件。詳細は本日のセッション内エージェント監査で残存。要点:
- F1 (onSnapshot 空配列上書き) F2 (Watch duration 上書き) F4 (背景タップ確定、wheel 起因) F5 (空 form 保存) F6 (id silent 削除) F7 (AI 要約 Chrome throttling) F8 (lsSave Quota silent fail)
- C1 (Firestore セキュリティルール未) C3 (save debounce 残存) C4 (KEYS 不整合) C5 (summary cache user 漏れ) C7 (linkedMatchId 自動推定誤り) C8 (match.id 重複 cascade)
- ID 衝突: measurement / string が `Date.now()` 単独 → genId() 統一必須
- ラケット rename / 削除で session.racketName 孤立 (cascade なし)

## 残タスク (今日のユーザー要望、未消化)

- 試打階層浅化
- GameTracker 自動終了 (TENNIS_RULES §2.1)
- セットスコア自動反映 (games[] → setScores[])
- 試打複数連携 (linkedMatchId → linkedMatchIds[])
- 機材入力タップ最少化 (chip picker、wheel UI fix)

## 私 (Claude) の track record メモ

このセッションで:
- ホイール picker 1 機能で 8 バージョン書き直し
- 2026-05-02 のデータ破壊
- 確実性より速度を選び続けた
- ルール R3 (事前調査して実装) を毎回違反

再開時、これを直視すること。「動きそう」で進めない。
