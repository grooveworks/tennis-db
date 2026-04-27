# HANDOFF v4 — Stage S15 (Sessions マージ機能) 開始用

作成: 2026-04-28 / S14 完了 push 時に作成

参照ファイル: `CLAUDE.md` (5 ルール) / `DECISIONS_v4.md` (全 Stage、特に S14 セクション) / `MEMORY.md` 全索引

---

## 1. 完了状態 (S14 まで)

- APP_VERSION: `4.0.0-S14`
- GitHub Pages 反映予定 (push 後): `https://grooveworks.github.io/tennis-db/v4/`

### S14 主要追加 (2026-04-28):

- **Home タブ 5 カード本実装** (preview_s13.5.html FINAL 準拠):
  - HomeQuickAdd (3 大ボタン グラデ + Phosphor アイコン + 配線)
  - CurrentContext (5 行: 次の大会 / 課題 / 主力 / 検討中 / 直近、ステータス pill)
  - WeeklySummary (Display tier 34px + 4 統計 + フッタ)
  - NextActions (top 3 + check circle + priority dot)
  - TwoWeekCalendar (14 セル + 練習濃淡 + 大会 + 試打 dot + 過去日薄背景)
  - HomeDayPanel (Glass overlay)

- **天気 Modal** (`WeatherModal.jsx` 新規):
  - Open-Meteo API hourly 拡張 (precipitation_probability / wind_speed_10m / apparent_temperature / daily max-min)
  - メイン気温 + テニス指標 3 列 (降水/風速/体感) + 時間別 16 セル横スクロール

- **QuickAddModal trial 拡張** (`QuickAddModal.jsx` 改修):
  - type="trial" + 判定 3 大ボタン (採用候補/保留/却下) + blankTrial 利用
  - Home Quick Add 試打ボタンから起動

- **Safari iOS 互換修正** (S14.3-S14.5、S14 中盤の大改修):
  - 真の原因: `<input>` のデフォルト `box-sizing: content-box` で grid track 26px overflow + Safari iOS の date/time native UI が CSS minHeight を無視して縦拡張
  - 修正: Input.jsx / Textarea.jsx に `boxSizing: "border-box"` + `WebkitAppearance: "none"` + `appearance: "none"` / fontSize 13 + padding "10px 12px" + marginBottom 10 (v2 互換)
  - PC Chrome の iPhone エミュレーションは Safari iOS native UI を再現しないため**実機検証必須** (preview_s14_p3.html 4 variant 比較 + iPhone Safari スクショ判定で確定)

- **PWA TabBar safe-area 対応** (S14.6):
  - TabBar の `height: 56` 削除 → 各 button に `minHeight: 56` 移行
  - PWA standalone モードで TabBar 上部の隙間が狭くなる症状を解消

- **app.jsx 改修**: default tab `home` 化 / next 読込追加 / handleHomeQuickAdd / handleWeatherClick / WeatherModal 接続

---

## 2. S14 で確立されたメタ運用 (S15 以降も継続)

- **2 段階プレビュー方針** (memory `feedback_two_stage_preview.md`): Phase ごとに静的プロト `preview_s<N>_p<M>.html` を Claude Code preview パネルで承認 → 実データ動作確認 (ユーザー Ctrl+F5)。飛ばすと工数 5 倍化
- **V2/V3/V4 経緯** (memory `project_v2_v3_history.md`): V2 = 実使用 (信頼可、リサーチ参照優先)、V3 = 開発中止 (信頼不可、リサーチ参照禁止)、V4 = 再構築中
- **APP_VERSION 中間カウンタ**: Stage 中の修正のたびに `4.0.0-S<N>.1` `.2` ... と上げる。Stage 完了 push 時に `4.0.0-S<N>` に整える
- **動作確認チェックリスト + 予測値**: 実装前に Firestore 集計して各値を予測、ユーザーは画面と見比べるだけで判定 (視覚で気付きにくいロジックバグ早期発見)
- **iPhone Safari は PC Chrome エミュレーションで再現できない**: date/time native UI / safe-area / PWA standalone は実機検証必須

---

## 3. S15 の最小起動タスク

ROADMAP S15: 「Sessions マージ機能 — 同タイプ 2 件の統合、A/B 切替・競合選択」

1. ユーザー: `S15 を始めてください`
2. 私の最初の応答で CLAUDE.md セッション開始プロトコル実行 (5 項目、grep 出力コピペ必須):
   - ROADMAP S15 / DECISIONS_v4.md S14 セクション / REQUIREMENTS F1.x マージ系 / WIREFRAMES マージ画面節
   - v2 該当箇所 grep (V2 が信頼できるリサーチ元)
   - v4 既存実装の重複チェック (MergeModal / mergeUtil 等の識別子)
3. preview_s15_p<M>.html で UX 提案 → 承認 → 実装

---

## 4. 共通方針リマインダ

- canonical 日付形式: `YYYY-MM-DD`
- 画面幅: <600px=単列、≥1024px=左右分割
- Firestore 書き込み: `core/03_storage.js` の `save()` (cleanForFirestore + 800ms debounce)
- APP_VERSION: `4.0.0-S(N)` Stage 完了時のみ更新

---

## 5. S14 のリサーチ用 preview ファイル (今後参照可)

- `preview_s14_p1.html`: Home 5 カード完成形 (デモデータ予測値)
- `preview_s14_p2.html`: 天気 Modal (Glass bottom sheet + テニス指標 3 列)
- `preview_s14_p3.html`: QuickAddModal レイアウト 4 variant 比較 (Safari iOS 検証用、再発時に再利用可)

---

## 6. 関連ファイル

S15 着手時に必読:
- `CLAUDE.md` 5 ルール
- `DECISIONS_v4.md` 全件 (特に S14 セクション)
- `MEMORY.md` 全索引 (`feedback_two_stage_preview.md` / `project_v2_v3_history.md` 含む)
- `ROADMAP_v4.md` S15 行
- `REQUIREMENTS_v4.md` F1.x マージ系
- `WIREFRAMES_v4.md` マージ画面節 (該当節のみ)
