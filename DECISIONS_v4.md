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

## このファイルの更新

- Stage 完了時に該当節を追記
- 古い Stage の決定が陳腐化したら ❌ マークを付けて archive ノート追加 (削除しない)
- ユーザーから新しい方針があれば即反映
- ナラティブを書かない (どうしても必要なら別 .md に分離)
