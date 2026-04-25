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

## このファイルの更新

- Stage 完了時に該当節を追記
- 古い Stage の決定が陳腐化したら ❌ マークを付けて archive ノート追加 (削除しない)
- ユーザーから新しい方針があれば即反映
- ナラティブを書かない (どうしても必要なら別 .md に分離)
