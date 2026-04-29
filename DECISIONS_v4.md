# Tennis DB v4 決定事項リスト (cumulative)

各 Stage で確定した UX 方針 / スコープ / 技術判断を **フラットに蓄積**。  
HANDOFF はこのファイルを参照する形で軽量化される。

毎セッション開始時に必読 (連続性確保のため)。1 行 1 決定、根拠 / 違反パターンを 1 行で添える。

---

## 全 Stage 共通の方針

- **canonical 日付形式**: `YYYY-MM-DD` (ISO 8601、HTML date 入力 / GCal / CSV 標準と一致)
  - v3 の古い `YYYY/M/D` データに触れたら、その場で正規化して保存 (遅延マイグレーション)
- **画面幅対応**: <600px=単列スマホ、600-1023px=スマホ挙動維持、≥1024px=左右分割
- **Firestore 書き込み**: `core/03_storage.js` の `save()` を使う (cleanForFirestore + 800ms debounce)
  - 違反: 個別フィールド `set merge:true` は Firestore で nested array partial update できないため不可
- **APP_VERSION 命名**: `4.0.0-S(N)` (例: `4.0.0-S11`)。Stage 完了時のみ更新

---

## Stage 別決定事項

### S2-S4 (デザインシステム / ワイヤフレーム / 共通 UI)
- **色**: Primary `#1a73e8`、Surface `bg=#f8f9fa / panel=#fff`、3 段階テキスト (text/secondary/muted)
- **textMuted は 12px 以下の細字に使わない** (AAA 確保)
- **タップ領域 44px 以上** (iOS HIG 準拠)
- **アイコン**: Lucide で統一
- **シャドウは原則不使用** (フラットデザイン、border + tinted bg で階層表現)

### S5-S9 (Sessions タブ各 view)
- **試打は Sessions 一覧に独立カードを出さない**: 大会/練習への試打バッジ経由 (WIREFRAMES §2.2.1)
  - **暫定 (S11~S15)**: 種類フィルタで「試打」選択時のみ独立カード表示。S16 で削除
- **CO 自動発動**: ITF Rule 11 / TENNIS_RULES.md §2.1 / **奇数ゲーム後** (1, 3, 5, 7, 9, 11G)
  - 判定式: `games.length % 2 === 1`
  - 違反: v2 は `% 2 === 0` で誤実装、v4 で修正済み

### S10 (Session 詳細 slide-in)
- **統一レイアウト**: `[会場/気象] 3列 + [機材] 2x2`、練習のみ `[体調]` 追加
- **Apple Watch / matchStats は表示のみ**: 編集 UI に出さない (v2/v3 互換、インポート由来)
- **削除ボタン**: SessionDetailView の Action bar に固定。編集画面ヘッダには置かない (責務分離)

### S12 (Session 追加 FAB + QuickAdd) ✅
- **FAB ミニメニューは大会 / 練習 の 2 択**: 試打は除外、S14 Home 3 ボタン経由の専用設計に集約
  - 違反: 試打を FAB ミニメニューに含めると、v2/v3 で最も作り込まれた QuickTrial 専用 UI を活かせない
- **QuickAdd モーダルは最小フォーム方式** (v3 踏襲、SessionEditView を空起動するフルフォームではない)
  - 大会: 日付* / 大会名* / 形式 / クラス / 会場 / 公開設定
  - 練習: 日付* / 種別 / イベント名 / 会場 / 開始-終了時刻 / 公開設定 (時刻入力で duration 自動計算)
  - 違反: 詳細は作成後 Detail 画面 → 編集ボタンで追記。出先 30 秒入力を優先
- **作成後の遷移**: SessionDetailView (**閲覧モード**) で slide-in、空項目は `—` or empty hint で表示
  - 違反: いきなり編集モードに入れると「アクション完了感」が出ず、画面を閉じる動作が混乱する
- **必須バリデーション**: SCHEMA `required:true` 駆動 (validation.js を再利用、S11 と同じ)
- **handleSave 再利用**: 新規/更新両対応で既存 (S11 確定)、QuickAdd でも同じ関数経由で保存
- **blank helper**: `src/domain/blank.js` 新規 (3 種別とも作成、blankTrial は S14 で再利用予定)
- **会場 / ラケット / ストリング**: MasterField (S11 確定) を再利用、master データから Select

### S13.5 (DESIGN_SYSTEM 全面改訂 + Apple-flavored Material 路線、2026-04-27 ピボット)

**経緯**: S14 (Home タブ) 着手前に、ユーザーから「v4 が退屈」「アイコンの限界 (テニスラケット欠落)」「iPhone 主体ユーザーには Apple ライクの方が好み」の指摘。AUDIT (`AUDIT_v4_design_research_2026-04-27.md`) で v4 の構造的弱点を確認 (Primary 色を Green→Blue 変更で視覚習慣破壊 / 大数字 28px+ 消失 / グラデ廃止 / Card 全部 12 角丸でフラット過多)。S14 着手前に DESIGN_SYSTEM 全面改訂のため S13.5 を新設。

**確定事項 (preview_s13.5.html FINAL で承認、ChatGPT 第三者評価で「進めて大丈夫」確認済)**:

- **Primary 色**: `#1a73e8` (Material Blue) → **`#007AFF` (Apple System Blue)** に置換
  - `primaryHover`、`primaryLight` も Apple ライクに調整 (`#E1F0FF` 系)
  - 違反: ハードコード `#1a73e8` を残すと色置換が不完全 → grep 必須

- **アイコンライブラリ**: Lucide → **Phosphor (duotone weight 主)** に全面差し替え
  - **テニスラケットだけ Tabler `tennis` (MIT) を SVG インライン埋め込み** で 1 個拝借
  - `Icon.jsx` 内部実装を変更、呼び出し側 API (`<Icon name="trophy" />`) は維持
  - 違反: Lucide にはテニスラケット無し、3 年来の最大の不足

- **角丸ヒエラルキー** (新設):
  - 大カード (Card セクション): `20px`
  - 中行カード (DayPanel 内行 / リスト行): `14px`
  - ボタン: `10-12px`
  - バッジ: `6-8px`
  - 違反: 全部 12 で揃えると階層感が出ない (v4 の現状問題)

- **Display tier タイポ** (新設、§2.2 に追加):
  - `display1=40px / display2=32px / display3=28px、font-weight:800、font-feature-settings:"tnum"`
  - 用途: スコア表示、stats summary 主要数値、Current Context 強調
  - 違反: 14-16px のみだと視覚インパクトが消える (v2 28px 800 から後退)

- **Card hover lift**: `@media (hover:hover) and (pointer:fine)` で限定
  - `transform: translateY(-2px)` + `box-shadow: 0 4px 16px rgba(0,0,0,.08)`
  - スマホでは無効

- **Glass morphism**: **floating パネル / Modal 限定** (Home 通常カードには使わない)
  - DayPanel / Modal / 一時オーバーレイ系のみ
  - `backdrop-filter: saturate(180%) blur(12-28px)` + `background: rgba(255,255,255,0.72)`
  - 違反: 通常カードに適用すると情報密度が落ちる

- **ロゴ**: `Tennis` (細字 fontWeight:400 grey) + `DB` (太字 fontWeight:800 Apple Blue)
  - グラデは不採用 (v2 形式の復活 NG)
  - 補助情報: `v4.0.0-S(N)` を 9px tnum で末尾並列

- **スクロールバー**: 細身 6px、半透明、hover で濃く
  - `::-webkit-scrollbar` 6px / `scrollbar-width: thin`

- **`100vh` → `100dvh`**: Chrome モバイル TabBar 見切れ修正 (`src/app.jsx:429`)

- **Next Actions チェック circle (Apple Reminders 風、2026-04-27 確定)**:
  - 未チェック: 20px circle、1.5px border `#C7C7CC` (System Gray 4)、ニュートラル灰
  - チェック済: 20px filled `#007AFF` + 中央に白い check (`<Icon name="check"/>`)
  - タップ領域は周辺 padding で 44px 確保
  - 違反: Next Actions = **試合外ツール** (試合中は GameTracker)、強コントラストは不要 / `user_match_day_usage.md` 参照

**Home タブ責務文書化** (S14 で実装、ROADMAP_v4.md に転記):

- Home に置く: Quick Add 3 ボタン / Current Context / 今週サマリー / 次のアクション / 2 週間カレンダー = **5 カード上限**
- Home に置かない: 詳細分析 (Insights) / 長い履歴一覧 (Sessions) / 機材詳細比較 (Gear) / 年間俯瞰 (Sessions Year mode)
- 違反: V1 V3 のような情報過多に戻る、Home の「現在地把握」役割を希薄化

**Current Context 生成ルール** (S14 で実装、データバインディング):

| フィールド | ルール | フォールバック |
|---|---|---|
| 次の大会 | `tournaments` で `normDate(date) >= today`、最近 1 件 | 「直近の大会なし」 |
| 課題 | `next` で `done=false` の優先度最上位 1 件 | 「未設定」 |
| 主力 | 直近 30 日使用最多のラケット 1 件、5 回以上 → 「継続使用中」 / 1-4 回 → 「検討中」 / 0 回 → 「待機」 | 「未設定」 |
| 検討中 | `trials` で `judgment="採用候補"` の最新 1 件 | 行を非表示 |
| 直近 | `tournaments` で `date <= today` かつ `overallResult` 有りの最新 1 件 | 行を非表示 |

**Next Actions 優先度ルール** (S14 で実装、表示 top 3):

- **赤 dot**: 期限が 7 日以内 or 直前の大会 (7 日以内) に関係するアクション
- **橙 dot**: 期限なし継続課題
- **灰 dot**: 低優先 (priority="低" or category="参考")
- 編集本格化は S17 Plan タブで

**S14 反映事項 (ChatGPT 提案より採用)**:
- 「7勝3敗」表記 (「7/10 勝率」廃止)
- 「平均/回」表記 (単位明示)
- 文言日本語統一 (「Next Actions」 → 「次のアクション」)
- カレンダー下部に凡例 1 行常設 (「━ 緑: 練習 / 橙: 大会 / 紫点: 試打」)
- 天気アイコンタップで詳細 Modal (Open-Meteo 接続)
- Current Context 文字量制御 (主見出し 1 行省略 / 補足 1 行まで / 詳細はタップ先)
- 主力ラケットに判断状態 (継続中/検討中/待機) 推測表示
- カード最大 5 (Gear Context は Current Context に統合)

**default tab 変更**: `app.jsx:78` を `useState("home")` に変更。S14 完了と同梱で push。

**Stage リナンバリング**: S15 以降の番号は変更なし (S15 = Sessions マージ、S16 = Gear、S17 = Plan、S18 = Insights、S19 = インポート、S20 = 自動連関、S21 = リリース)。S13.5 の追加分だけ ROADMAP に挿入。

**Phosphor 適材適所ルール (2026-04-27 ChatGPT 助言を採用、S14 以降の指針)**:

「アイコンは**意味の圧縮**に使う、装飾には使わない」。全ラベル全セクション全フィールドに機械的に付けない。

**入れる場所**:
- ナビ系: 戻る `arrow-left` / 前後 `caret-left`/`caret-right` / 右遷移 `caret-right`
- アクションボタン (下部 Action bar): 編集 `pencil-simple-line` / 一覧 `clipboard-text` / 削除 `trash` / 追加 `plus`
- ステータスバッジ・チップ: 形式 (`user`/`users`)、結果 (`trophy`/`medal`)、種別 (`student`/`person-simple-run`/`users-three`/`barbell`/`handshake`)
- メタ情報セル: 会場 `map-pin` / 気温 `thermometer` / 天気 `sun`/`cloud`/`cloud-sun`
- Apple Watch ブロック (Practice Detail): `watch`/`clock`/`flame`/`heartbeat`/`gauge`/`heart`
- Home 「現在の状況 (Current Context)」セクション**見出し 1 個だけ** `crosshair` or `map-pin`、各行はラベル文字のみ
- 次のアクション 見出し: `flag`、完了丸: `circle`/`check-circle`

**入れない場所**:
- セクション見出し**全部**にアイコンを付ける (一気に「UI 部品置きました感」が出る)
- フィールドラベル全部 (会場/気温/天気/ラケット/テンション/縦糸/横糸 等を機械的に揃える)
- 試合記録の各項目全部 (右端 `caret-right` 以外は不要)
- 機材セクションの縦糸/横糸 (ラケット 1 個か全部なし)
- 体調 1-5 ボタン内 (1-5 自体が UI として強い、アイコン重複)
- 総括メモ (文字とカードで十分)
- 今週サマリーの各数字 (大数字が主役、アイコンは小さく見出し横が限度)

**スタイル規律 (DESIGN_SYSTEM §5 補強)**:
- weight: **regular 基本**。fill/duotone は active tab / ステータスチップ / 例外状態のみ
- サイズ: 14 (チップ・メタラベル横) / 16 (セクション見出し・リスト内小) / 20 (アクションボタン・タブ) / 24 (ナビ戻る等)、**24 超は多用しない**
- 色: ニュートラル (`textSecondary`/`textMuted`) 基本、semantic 色は status/result/action 限定
- 違反: weight=duotone を Header 等で乱用すると Material 寄りになり Apple-flavored から離れる

**画面別 ChatGPT 推奨アイコンセット (S14 以降の実装指針)**:

Home (S14):
- Quick Add: `trophy` / `person-simple-run` / `seal-check` (or `tennis` for trial)
- Current Context 見出しのみ: `crosshair` or `map-pin`、各行ラベルはアイコン無し
- 今週サマリー: アイコン無し (大数字主役)、入れるなら 14px ラベル横のみ
- 次のアクション 見出し: `flag`、完了 circle: `circle`/`check-circle`、優先度は色ドット
- カレンダー 見出し: `calendar-blank`、ナビ: `caret-left`/`caret-right`、大会日: `trophy`、試打: 紫ドット (アイコン無し)

Tournament Detail (S10、後続リファクタ):
- Header: 戻る `arrow-left`、画面種別ラベルにはアイコン無し
- チップ: `user`(シングルス) `users`(ダブルス) `trophy`(優勝) `medal`(準優勝/3位)、敗退系はアイコン無し (ネガ強調回避)
- 会場/気象: `map-pin`/`thermometer`/`sun` (各セル左 14px)
- 機材: ラケット文字のみ、テンションだけ `gauge` 可、縦糸/横糸はアイコン無し
- 試合記録: 右端 `caret-right` のみ、勝敗は文字+色
- 下部アクション: `pencil-simple-line`(編集) / `clipboard-text`(全試合) / `trash`(削除)

Practice Detail (S10、後続リファクタ):
- Header: 戻る `arrow-left`
- 種別チップ: `student`/`person-simple-run`/`users-three`/`barbell`/`handshake`
- Apple Watch: `watch` 見出し、`clock`(時間)/`flame`(Active)/`heartbeat`(平均)/`gauge`(合計)/`heart`(回復)
- 心拍ゾーン: 見出しに `heartbeat`、回復行に `heart`、各ゾーン行はアイコン無し (色帯で十分)
- 体調 1-5: アイコン無し
- 機材: 文字のみ
- 下部アクション: `pencil-simple-line` / `clipboard-text` / `trash`

---

### S11 (Session 編集画面) ✅
- **編集画面の統一フォーマット** (3 種別共通の並び):
  1. 基本情報 (種別ごとのメイン項目 + 日付*)
  2. 会場 / 気象 (3 列: 会場 / 気温 / 天気)
  3. 機材 (2 列: ラケット 1 行 / 縦糸+横糸 / テンション縦+横)
  4. 種別固有 (大会=試合記録、練習=体調+Watch、試打=評価17+連携先)
  5. メモ
  6. 公開設定 (大会・練習のみ、試打にはなし)
  - 違反: フィールド名 1 個ずつ機械的に並べると S11 の機材並び順問題が再発
- **必須バリデーション**: SCHEMA `required:true` 駆動 (`src/domain/validation.js`)
  - 大会 = date/name、練習 = date、試打 = date/racketName
- **ラケット / 縦糸 / 横糸 / 会場 / 対戦相手 は MasterField (Select)**: 既存 master collection (rackets/strings/venues/opponents) から Select、master に無い既存値は「(現在値)」サフィックス
- **遷移**: SessionDetailView の overlay 内で Detail ↔ Edit を mode toggle (再 mount せず scrollTop 保持)
- **未保存戻る**: ConfirmDialog (「破棄」warning / 「編集に戻る」primary)
- **GameTracker (F1.4.1 復活、v2 移植)**: 私+1 / 相手+1 / ↩、奇数ゲーム後自動 CO、4 経路修正 (A 直近撤回 / B ゲーム個別 / C CO 再編集 / D 全消去)
- **試打 linkedPracticeId / linkedMatchId**: LinkedSessionPicker で張替可 (v3 踏襲)
- **CSV 由来 matchStats**: S11 編集対象外。playerA/B/myIsA 編集 (NameEditModal) も S11 範囲外
- **削除 cascade (孤児 linkedXxx 自動 null)**: S11 範囲外、S13 で実装
- **新規追加 (FAB/QuickAdd)**: S11 範囲外、S12 で実装

---

### S14 (Home タブ + 天気 Modal + QuickAddModal Safari 対応 + PWA TabBar) ✅

**実装範囲**:
- **HomeTab.jsx** (新規) + 子 6 component (HomeQuickAdd / CurrentContext / WeeklySummary / NextActions / TwoWeekCalendar / HomeDayPanel)、preview_s13.5.html FINAL 準拠
- **WeatherModal.jsx** (新規) + Open-Meteo API hourly 拡張 (precipitation_probability / wind_speed_10m / apparent_temperature / daily max-min)
- **QuickAddModal trial 拡張** (type="trial" + 判定 3 大ボタン + blankTrial 利用)
- **app.jsx 改修**: default tab home / next 読込 / handleHomeQuickAdd / handleWeatherClick / WeatherModal 接続

**Safari iOS 互換修正 (S14.3-S14.5)**:
- **真の原因**: `<input>` のデフォルト `box-sizing: content-box` で grid track を 26px overflow + Safari iOS の date/time native UI が CSS minHeight を無視して縦拡張
- **修正**: Input.jsx / Textarea.jsx に `boxSizing: "border-box"` + `WebkitAppearance: "none"` + `appearance: "none"` 追加 / fontSize 14→13 + padding "10px 14px"→"10px 12px" (v2 互換) / wrapper marginBottom 12→10
- **判明事実**: PC Chrome の iPhone エミュレーションは Safari iOS の date/time native UI を再現しない (実機検証必須)
- **検証手段**: preview_s14_p3.html (4 variant 比較) + iPhone Safari 実機スクショ判定

**PWA TabBar (S14.6)**:
- **症状**: PWA standalone モードで TabBar 上部の隙間が狭い (Safari/Chrome では出ない)
- **原因**: `height: 56` + `paddingBottom: env(safe-area-inset-bottom)` で grid item (button) が padding を含む全領域に stretch → button 内 content が下方向ずれ
- **修正**: TabBar の `height: 56` 削除 → 各 button に `minHeight: 56` 移行 (PWA safe-area 影響を受けない)

**Phase 分割の教訓 (S14 で確立)**:
- **2 段階プレビュー方針** (memory `feedback_two_stage_preview.md` 確立): Phase ごとに静的プロト preview_s<N>_p<M>.html を Claude Code preview パネルで承認 → 実データ確認、飛ばすと工数 5 倍化
- **V2/V3/V4 経緯記録** (memory `project_v2_v3_history.md` 新設): V2 = 実使用 (信頼可)、V3 = 開発中止 (信頼不可、リサーチ参照禁止)、V4 = 再構築中
- **動作確認チェックリスト + 予測値**: 実装前に Firestore データを集計して各カードの予測値を提示、ユーザーは画面と見比べるだけで判定可能 (視覚で気付きにくいロジックバグの早期発見)
- **APP_VERSION 中間カウンタ運用**: Stage 中の修正のたびに `4.0.0-S14.1` `.2` `.3` ... と上げ、ユーザーが Header 表示で最新読込を判別できる仕組み (Stage 完了 push 時に `4.0.0-S14` に整える)

**Home Current Context の検討中 = 主力 同一表示**: 仕様判断 1 (そのまま表示)。trial の「採用候補」最新が結局主力に昇格するケースで両方同じラケット名が出る、これは「採用候補→昇格した歴史」を可視化する情報として価値あり、削除しない。

---

### S15 (Sessions マージ機能 — F1.10) ✅

**実装範囲**:
- **`src/domain/merge.js`** (新規): 純関数 5 つ — `computeMergeDiff` / `applyMerge` / `mergeMatches` / `relinkAfterMerge` / `countRelinks`。SCHEMA 駆動で type 分岐は本ファイルのみ (N3.3)。S19 (インポート再挑戦) でも流用可能な設計
- **`src/ui/sessions/MergePartnerPicker.jsx`** (新規): 同タイプ候補から相手 (B) を選ぶ Modal、日付近い順 + 検索、同日候補は青強調
- **`src/ui/sessions/MergeModal.jsx`** (新規): 2 ステップ (compare → confirm)、独自 overlay (Modal の maxWidth 400 を超えるため、560px で実装)
- **`src/ui/sessions/SessionDetailView.jsx`** (改修): Action bar を 3 → 4 ボタン化 (編集 / マージ / Claude / 削除、危険度の昇順)。tournament の Claude ボタンの「全試合」テキスト削除 (アイコンのみ、aria-label で意味は維持)
- **`src/app.jsx`** (改修): mergeStarting / mergePartner state + handleMergeStart / handlePartnerSelect / handleMergeCancel / handleMergeConfirm。Firestore 書き込みは handleDelete と同じ Promise.all パターン
- **`tests/run.html`** (改修): merge.js のユニットテスト 31 件追加 (合計 44 tests 全 pass)。**inline 化方式に変更** (preview パネルが `<script src="../src/...">` 相対パスを解決できないため、core/05_schema.js + cascade.js + merge.js の中身を inline コピー)

**確定した方針** (preview_s15_p1.html FINAL でユーザー承認):
- **起点**: Detail 画面のマージボタンから (編集モード経由は採用せず、F1.9 一括削除と切り離し)
- **id 付け替え**: practice 同士のマージのみ trial.linkedPracticeId を B.id → A.id に書き換え。tournament は matches[] 合算で match.id が維持されるため relink 不要
- **matches[] (大会)**: A の matches[] を残し、B の中で id 重複しないものだけ追加 (内容重複の検出はしない、マージ後 Detail で個別削除)
- **競合 / 補完**: SCHEMA `combinable: true` のテキスト系のみ「結合 (A | B)」選択肢を出す。それ以外は A 採用 / B 採用の 2 択
- **自動推測なし**: 「両方値ありで異なる」競合は全件手動選択 (V2 時代の AW カロリー上書き事故の教訓)
- **補完は自動**: 「片方空、もう片方に値」は値ある側を自動採用 (争いゼロ、V3 と同じ挙動)
- **2 段階確認**: ① 比較ビュー (競合 ラジオ) → 「次へ」 → ② 最終確認 (削除される B / 統合後 A の中身を 2 列で全フィールド表示、緑字=B から補完 / 青字=B 採用、連携試打 N 件の付け替え通知)
- **規律**: Detail で開いている方が必ず A (残す側)、Picker で選んだ方が B (削除側)。後から入れ替える UI は出さない (混乱回避)

**スコープ外** (S15 では実装しない):
- ❌ Sessions 一覧の編集モード新設 (F1.9 一括削除と一緒に別 Stage で)
- ❌ 異なる type 間のマージ (大会 ↔ 練習)
- ❌ 試合 (match) 同士の重複検出マージ
- ❌ 3 件以上の同時マージ
- ❌ Undo (確認段階で戻れる + ダイアログでカバー)
- ❌ インポート時マージ (S19 で別途、ただし S15 の merge.js を流用設計)

**S15 検証中に発覚した既存バグの修正**:
- **`handleQuickAddSave` の history.pushState 抜け** (S12 から潜在): 新規練習作成 → Detail → 戻るボタンで Tennis DB の前のページ (Google など) に飛ぶ問題。`handleCardClick` と同じく `try { window.history.pushState({ tdb: "detail" }, ""); } catch(_) {}` を追加
- 修正同梱で APP_VERSION を `4.0.0-S15.2` 経由 → 完了 push 時に `4.0.0-S15` に整える

**過去データ救済の位置付け** (memory `project_data_quality_legacy.md`):
- V2 時代に GCal インポートが中止された結果、1 年以上前の練習は AW カロリーだけ残った空イベントが多数残存
- S15 マージ機能はこの過去データを手動で救済する導線にもなる (重複統合だけが目的ではない)
- S19 で GCal インポートを再挑戦する場合、incoming + existing のマージは S15 の `merge.js` をそのまま流用

**メタ運用 (S15 で再確認)**:
- 2 段階プレビュー方針 (memory `feedback_two_stage_preview.md`) を S15 でも厳守 — preview_s15_p1.html で 3 画面 (Action bar / Picker / MergeModal 比較+確認) をユーザー承認 → 本実装
- preview パネルの相対パス制約: `tests/run.html` から `../src/*.js` を `<script src>` で読めない (panel が file:// 風、または相対パス制限)。**自己完結型 (inline コピー) に変更**、実装変更時は手動同期を規律で守る

---

### S15.5 (試打カード式 QuickTrialMode — V2 移植) ✅

**経緯**: S15 完了直後、ユーザーから「明後日 (2026-04-30) の大会で試打カード式を実戦投入したい」要望。S16 (Gear タブ) 全体を待たず、**試打カード単体だけを切り出して S15.5 として急ぐ** 判断。

**実装範囲**:
- **`src/ui/sessions/QuickTrialMode.jsx`** (新規): V2 移植 + v4 デザイン (Apple-flavored)。カード一覧 view + 評価入力 view (17 項目 × 1-5)。eval/touched は per-card 永続 (中断・再開可)
- **`src/app.jsx`** (改修): Firestore `quickTrialCards` 読込追加 / state / Home 試打ボタンの routing を QuickAddModal → QuickTrialMode に切替 / `persistQuickTrialCards` (関数形式対応) / `handleQuickTrialSave` (auto-link + trial 生成 + カード削除 + toast) / `handleCreateCardFromTrial` (TrialDetail から既存試打を新カードに昇格)
- **`src/ui/sessions/SessionDetailView.jsx`** (改修): `onCreateCard` prop を TrialDetail に橋渡し
- **`src/ui/sessions/TrialDetail.jsx`** (改修): 機材セクション内に「試打カードに追加」アウトラインボタン (補助 CTA)

**確定方針** (preview_s15.5_p1 → ChatGPT レビュー → preview_s15.5_p2 で承認):
- **Home 試打 → カード式完全置き換え** (フォーム入力経路 = QuickAddModal trial は Home からは廃止)
- **status 色と評価色を分離**: status (active/candidate/considering/support) はカード左帯と小チップだけ。評価選択色は **primary (青) 固定**
- **タイトル文字 = 黒固定** (status 色の主張を引き算、ChatGPT 指摘)
- **進捗カウンタ** (4 セクション分): 性能 6/touched / 特性 2/touched / ショット 8/touched / 総合 1/touched、完了で緑表示
- **CTA 文言短縮**: 「保存して試打タブに転送」 → 「評価を保存」、「カード化」 → 「試打カードに追加」(自然な日本語)
- **TrialDetail のカード追加 = アウトライン CTA** (面塗りなし、補助役、試打閲覧の主役を邪魔しない)
- **アイコン絞る**: X / ArrowLeft / Plus / CheckCircle / PlusCircle / PencilSimpleLine / Trash + セクション見出しに 4 個 (Gauge / SlidersHorizontal / TennisBall / SealCheck)
- **カード削除 (×) 追加** (V2 にはなかった、scope 「追加+削除のみ」 のため)

**自動連携 (V2 互換 + 拡張)**:
- 同日 practice → `linkedPracticeId` 自動設定 + `temp` / `venue` / **`weather`** 自動コピー (V2 では temp/venue だけ)
- 同日 tournament の最後の match → `linkedMatchId` 自動設定
- judgment デフォルト「保留」 → TrialDetail 編集で「採用候補/却下」へ
- **使ったカードは保存後に削除** (V2 互換、使い切り設計)
- **重複追加防止**: 同じ racket+string+tension のカードが既にあれば toast 通知

**S15.5 検証中に発覚した bug 修正 (S15.5.2)**:
- **QuickTrialMode の評価 view → 一覧 view 戻り**: `history.pushState` 抜けで iOS 左端スワイプ → Tennis DB の前のページ (Home) に飛ぶ問題
- 修正: open=true で `history.pushState({tdb:"quickTrial-list"})` + selectCard で更に `pushState({tdb:"quickTrial-eval"})` + 「← 一覧に戻る」と X (閉じる) はどちらも `history.back()` 経由 + `popstate` listener で内部 state 制御 (selected あり → setSelected(null)、なし → onClose)
- `eval_` / `touched` を `useRef` で tracking (popstate handler の stale closure 回避)
- `persistQuickTrialCards` を関数形式 (`prev => newCards`) にも対応 (setCards `prev => ...` を使えるように)

**S15.5 push 後の Chrome 環境問題への hotfix (S15.5.3 / S15.5.4)**:

ユーザー報告: localhost (Chrome) で登録した試打カードが GitHub Pages 側 (Chrome) と同期されない / Sessions タブ「読み込み中」が永遠に終わらない。Safari では同じ操作で同期できる、Chrome 特有の問題と判明。

- **S15.5.3 fix**: `core/03_storage.js` の `save()` は `setTimeout(800ms)` で Firestore 書き込みをデバウンス。**Chrome 88+ の Background Tab Throttling** で背景タブの setTimeout が大幅に遅延 (1 分以上) → 書き込みが Firestore Server に届かない問題。
  - 試打カード書き込み (`persistQuickTrialCards`) と `handleQuickTrialSave` 内の trials 書き込み を **`save()` の debounce を bypass して即時 Firestore write** (`fbDb.collection().set()` を直接 await、`handleDelete` と同じ Promise.all パターン)
  - 失敗時 `toast.show("試打カードのクラウド同期に失敗 (ローカルは保存済み)", "warning")` でユーザーに可視化
  - `persistQuickTrialCards` の React updater function 内 side effect は `queueMicrotask` で次 tick に逃がす (pure 性維持)
  - 適用範囲: 試打カード関連のみ。tournaments/practices/trials の通常編集は引き続き `save()` の debounce で OK (背景タブ問題は将来 Stage で別途検討)

- **S15.5.4 fix**: Chrome で `loadSessionsFromFirestore` の Firestore `get()` が永遠に pending → `setLoading(false)` されず Sessions タブが「読み込み中」のまま。
  - `Promise.race` で **15 秒 timeout** を追加、超えたら `Error("FIRESTORE_GET_TIMEOUT_15S")` で reject
  - timeout/error 時は `loadSessionsFromFirestore` が `null` を返す → `app.jsx` で `if (data) {...} else { toast.show("クラウド読み込みエラー (ローカルデータで表示中、回線確認を)", "warning"); }` 分岐
  - localStorage は初期ロード済 (97-111 行) なので、null 時はローカルデータで表示続行 (空にしない)
  - `onSnapshot` は別途設定するので、後で接続できれば自動同期

**未解決 (将来課題)**:
- Chrome での Firestore 通信遅延の **根本原因** は未特定 (`enablePersistence` の Multi-Tab IndexedDB 競合 / Cookie / 拡張機能 / Chrome 固有のネットワーク管理など複合要因の可能性)
- v9 Modular SDK の `FirestoreSettings.cache` への移行で改善する可能性 (現状は v8 互換 SDK)
- 通常編集の Firestore 書き込みも `save()` debounce 経由なので、Chrome Background Throttling の影響を受ける可能性 → 別 Stage で全 write を即時化検討

**S15.5.5 / S15.5.6 (Home リンク + Chrome 読込高速化、2026-04-28 push)**:
- **Home「現在の状況」行クリック対応**: 次の大会 / 検討中 / 直近 → 該当 Detail へ、主力 → Sessions タブをラケットフィルタ済み一覧で開く、課題 → S17 Plan 未実装で保留
- **Chrome 読込高速化**: localStorage にデータがあれば「読み込み中」を表示せず即表示、Firestore 取得は backgound で進行 (15 秒 timeout)、初回ログイン (localStorage 空) のみ loading 表示

**S15.5.7 (Settings Modal + メモ auto-grow + 文字サイズ scale、2026-04-29 push)**:
- ユーザー指摘: 「メモ欄の文章が全部表示されない、加筆時に文末を選択しにくい / 老眼で文字が小さすぎる、コンタクトの夜は特に読めない」
- **`src/ui/common/SettingsModal.jsx`** 新規: 文字サイズ「標準 / 大 / 特大」3 段階選択 (1.0 / 1.15 / 1.30 倍率)、プレビュー、アプリバージョン表示
- **Header.jsx**: `v{APP_VERSION}` 表示削除 → SettingsModal 内に常設 / **⚙️ 設定アイコン** 追加 (天気とユーザーの間)
- **app.jsx**: `fontScale` state + localStorage 永続化 (`yuke-memo-font-scale-v1`) + ルート div に CSS var `--memo-font-scale` 適用
- **Textarea.jsx (共通)**: auto-grow (useRef + useEffect で scrollHeight 追随) + `fontSize: calc(16px * var(--memo-font-scale, 1))` で scale 適用、`resize: none` `overflow: hidden`
- **QuickTrialMode メモ textarea**: 同様に auto-grow + scale 適用 (memoRef + useEffect)
- **SessionDetailView の `_dvMemoItem`** (TrialDetail / PracticeDetail / TournamentDetail で使う表示メモ): scale 適用 + lineHeight 1.65、line-clamp なし全文表示
- **アプリ全体の文字サイズ底上げは不採用**: ユーザー判断「全体だとレイアウト崩れて修正面倒、ユーザー設定で対応」

**S15.5.8 (GameTracker MENTAL_LABELS 定義漏れ hotfix、2026-04-29 push)**:
- **致命バグ発見**: 試合運用中、ユーザーがゲーム単位記録の「次のゲーム」をタップ → **画面真っ白 + 入力データ全消失**
- 原因: S11 実装時に `MENTAL_LABELS` / `PHYSICAL_LABELS` 定数を **使用しているのに定義し忘れた** → CO モーダル表示時に ReferenceError → React render 失敗
- 1 ゲーム後で奇数判定 → CO モーダル発動 → モーダル内の `_gtMPButtons` が `labels[n]` を参照 → undefined アクセスで TypeError → 真っ白
- S11 完了時に「次のゲーム」を 1 度もテストしていなかった = 私のテスト不足、レビューで未発覚
- 修正: GameTracker.jsx 冒頭に `MENTAL_LABELS = {1:"崩壊", 2:"焦り", 3:"普通", 4:"集中", 5:"完全"}` / `PHYSICAL_LABELS = {1:"限界", 2:"疲労", 3:"普通", 4:"余裕", 5:"万全"}` を追加
- **教訓**: 単体テストでは `_gtCOModal` が表示されないため発覚しない。 完了テスト時は **「次のゲーム → CO モーダル → 保存」 の最低 1 サイクル** を必ず通すべき

**S15.5.9 (MatchEditModal + SessionEditView auto-save、2026-04-29 push)**:
- 動機: S15.5.8 のクラッシュでユーザー試合中の入力データが全消失 + 「保存ボタンを押し忘れる」ヒューマンエラーリスクへの対策
- **MatchEditModal**: 試合編集中の form を `localStorage` の下書きに即時保存、Modal 起動時に下書きあれば自動復元、上部に黄色バナー「下書きを復元しました」表示、保存・破棄確定で下書きクリア
- **SessionEditView (大会・練習・試打 全部)**: 同様の auto-save 実装、type と id でユニークな draft key (`yuke-session-draft-{type}-{id}-v1`)
- **GameTracker `onChange`**: `setForm` 直接渡しを `handleGameTrackerChange` ラッパー (setForm + setDirty(true)) に変更、これで GameTracker 経由の変更も dirty 立ち + auto-save が走る (S11 から潜在の dirty 抜けバグ同梱 fix)
- localStorage の下書きは Safari バックグラウンド破棄や React レンダリングエラーでも生き残る → 二度と試合データロストしない設計

**S15.5 期間中の GitHub Pages deploy 障害 (2026-04-29)**:
- 自動 `pages-build-deployment` workflow が GitHub Actions runner 取得失敗で 30 分以上 Queued 状態固着
- 試合 5 時間前にユーザー報告、即対応必要
- 対処: `.github/workflows/pages.yml` を新規作成 (公式テンプレート、actions/checkout + configure-pages + upload-pages-artifact + deploy-pages)、リポジトリ設定 Settings > Pages の Source を「Deploy from a branch」→「GitHub Actions」に変更してもらい、明示的な workflow で deploy 復旧
- 自動 workflow は GitHub 側の障害が時々発生する旨、HANDOFF にも記録 → 次回からは Actions 方式が標準
- **失敗パターン**: 私が最初「Safari キャッシュ」「deploy 反映待ち」など外部要因に責任を寄せたため、ユーザーから「自分を疑え」と指摘 (R5 違反)。再発防止: deploy 失敗時は最初から `raw.githubusercontent.com` でリポジトリ側を確認 + GitHub Actions 状態を gh / API で確認するフローを徹底

**試合運用での教訓 (memory に追加検討)**:
- 試合中の使用形態: ユーザーは iPhone で動画撮影しながら試合、Tennis DB は試合終了後に思い出して一気に入力
- ミニタブレットでの試合中入力は将来予定だが、現状は iPhone 1 台で兼用 → 入力タイミングが事後にずれる
- 編集系の auto-save がないと、入力中の Safari バックグラウンド破棄で全消失の致命的事故が起こる
- v4 の編集系全画面 (大会 / 練習 / 試打 / 試合) で auto-save を標準とし、将来 Stage の新規編集画面でも踏襲

**スコープ外 (S16 以降に繰越)**:
- ❌ Gear タブ全体 (S16 本体で実装) — ラケット status 編集 UI / セッティング組合せ管理 / 実測値ログ
- ❌ カード編集 UI (V2 互換、追加+削除のみで運用)
- ❌ 連携先からの個別フィールド転記「コピーボタン」 (Phase 2、需要に応じて検討)
- ❌ 17 項目の折り畳み / セクションジャンプ (進捗カウンタで代替、明後日大会優先で MVP 維持)

**過去データ救済との位置付け** (memory `project_data_quality_legacy.md`):
- S15.5 は「これから (= 大会当日) 試打する時の効率化」が主眼
- 過去データ (1 年以上前の AW 由来空練習) の救済は S15 マージ機能や TrialDetail 編集で対応
- TrialDetail から「試打カードに追加」 → 過去のエース機 (例: EZONE100TOUR) の設定を 1 タップで再利用可能 (毎回同じセッティングで登録するケースの効率化)

---

### S16 (Gear タブ初実装) 進行中

**Phase 1 (UX preview)** ✅ 完了 (2026-04-29):

- **方針確定**: Gear タブを「機材管理画面」ではなく「**Decision Hub**」として設計 (ChatGPT レビュー採用)
  - 違反: F2.1-F2.4 を機械的に 4 同列で並べると、S14 で確立した「Home は要約・判断、探索は他タブ」原則を Gear タブで自分から壊す
- **構成順序**: Current Setup → Racket Board → Recent Trials → Open Questions → Manage Masters (5 セクション、上=判断、下=管理)
- **Racket Detail 順序**: Summary → Current Setting → Trial Summary → **Decision Notes** → **Usage** → Measurements (判断が主役、数値は後段、実測値は最後)
  - p1 → p2 でユーザー承認、Decision Notes を Usage より上に変更
- **status 6 種ラベル** (V2 互換 key 維持、UI ラベルは v4 で再設計):
  - `active` = 主力 (Apple Peach `#FF9500`)
  - `sub` = 予備 (Apple Mint `#00C7BE`)
  - `candidate` = 候補 (Primary Blue)
  - `considering` = 検討中 (Apple Gray 4)
  - `support` = 用途別 (Apple Indigo `#5856D6`)
  - `retired` = 引退 (textMuted、opacity 0.65)
- **「次の確認」1 行**: 候補・検討中のラケットのみ。主力・予備・用途別・引退には付けない (Decision Hub のメリハリ)
- **Decision Notes 構造化**: 継続理由 (緑) / 不安点 (黄) / 次回確認 (青) の 3 フィールド。機材関係.md / リサーチ MD の生情報を構造化吸収
- **Open Questions vs Plan Next Actions** (S17 との切り分け): Open Questions = 機材判断の **未解決の問い**、Next Actions = 実際にやる **行動 TODO**。実装は共通 `next` state を `category="gear"` でフィルタ → S17 で完全分離も視野
- **Manage Masters**: トップから 1 タップ折り畳み 3 行 (ストリング在庫 / セッティング組合せ / 引退ラケット) で下層画面へ。「Gear トップに管理機能を並べすぎない、でもアクセスは近い」
- **試打との連動**: Recent Trials を Gear タブに集約 → Sessions 絞り込みの「種類=試打」時のみ独立カード暫定 (S6-S10) は **S16 後半で削除**

**Phase 1.5 (新要望反映、p3 で追加)** ✅ (2026-04-29):

- **ストリング並び順編集** (新要望): セクションヘッダー「並べ替え」リンク → モード ON で各行 ▲▼ ボタン → 「完了」で OFF。ドラッグ&ドロップは採用しない (モバイル誤操作リスク)
  - ラケット (Racket Board) 側にも同じ仕組みを適用
  - **データモデル**: 各 string / racket に `order: number` 追加、既存データは読込時 index で遅延付与
  - **Select 表示順**: status 優先度 → order ASC の二段階 sort、rejected / archived は末尾
  - **永続化**: ▲▼ タップで即 Firestore write (debounce bypass、S15.5.3 と同パターン)
  - **純関数化**: `src/domain/reorder.js` (新設) の `reorderItems(list, fromIndex, toIndex)` に集約 (N3.3)、後続 Stage の Plan / Insights でも再利用
  - DESIGN_SYSTEM §11 として汎用パターン化記録

- **Header 修正 (S15.5.7 反映)**: preview_s16_p1/p2 の Header に `v4.0.0-S16` を出していたのは S15.5.7 の現状と齟齬。p3 で全画面 Header から version 削除、⚙️ 設定アイコンを天気と user の間に追加

**Phase 2 (WIREFRAMES / DESIGN_SYSTEM 追記)** ✅ (2026-04-29):

- **WIREFRAMES_v4.md §2.8 Gear タブ** 新設 (5 サブ節: トップ構成 / Racket Board / Racket Detail / Manage Masters / 試打との連動 / Open Questions vs Next Actions)
- **DESIGN_SYSTEM_v4.md §8.6 Gear タブ専用コンポーネント** 新設 (10 コンポーネント仕様: CurrentSetupCard / RacketRow / DecisionNotes / OpenQuestionItem / SegmentRow / TrialRow / ManageRow / PrincipleCard / MasterRow / SetupRow)
- **DESIGN_SYSTEM_v4.md §11 並び順編集パターン (Reorder Mode)** 新設 (S16 でストリング在庫に初適用、Phase 4 で Racket Board にも、後続 Stage で Plan / Insights にも再利用する汎用パターンとして文書化)

**S15.5.7-9 hotfix の S16 への影響反映**:
- S15.5.7 (Settings Modal): Header から version 削除、⚙️ 設定アイコン追加 → preview_s16_p3 で対応
- S15.5.9 (auto-save 標準): Racket Edit Modal にも auto-save 実装、draft key = `yuke-racket-draft-{id}-v1`
- S15.5.7 (--memo-font-scale): Decision Notes / note 系 textarea にも適用 (老眼配慮継承)
- S15.5.8 (完了テスト規律): S16 完了時は「ラケット追加 → 編集 → 保存 → 並べ替え → 試打追加 → 削除」サイクルを必ず通す (R1 対処療法禁止 + R3 事前調査の延長)

**Phase 3 (SCHEMA + state)** 着手前 (次フェーズ):
- `src/core/05_schema.js` に Racket / String / StringSetup / Measurement (ネスト) 定義追加、`order` / `decisionNotes: { keep, worry, next }` / `nextCheck` フィールドを Racket に新設
- `src/app.jsx` に stringSetups / measurements の state 復活
- `src/domain/reorder.js` 新設

**Phase 4 (実装)** 着手前:
- `src/ui/gear/` 新設 + 子コンポーネント群

**スコープ外 (S16 → S17 以降に繰越)**:
- ❌ Plan タブ Next Actions の完全分離 (S17 で対応、S16 では `next` から `category="gear"` フィルタ)
- ❌ 各ラケットの「マッチアップ別パフォーマンス」(S18 Insights)
- ❌ ストリング張替日 / 寿命警告 (Phase 2、需要次第)
- ❌ リサーチ MD (EZONE98 / TOUR100 / FX500 等) の機械取込 (危険、手動コピペで note フィールドへ)

---

## このファイルの更新

- Stage 完了時に該当節を追記
- 古い Stage の決定が陳腐化したら ❌ マークを付けて archive ノート追加 (削除しない)
- ユーザーから新しい方針があれば即反映
- ナラティブを書かない (どうしても必要なら別 .md に分離)
