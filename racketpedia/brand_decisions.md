# ブランド分離 — ユーザー確定事項（①の入力。apply時に使う）

長い会話で決定を失わないための記録。ライブ反映はまだ。

## 確定（ユーザー確認済み・全5件）
- サムライストリング 1.25 → **ブランド=ノーブランド** / モデル=サムライストリング / 太さ=1.25
- Yonex製ストリング全般 → **弦リストから外す**（商品でない・"避けたいメーカー"メモ）
- Babolat ALU Power → **ブランド=Luxilon** / モデル=ALU Power（ALU Power は Luxilon 製）
- ベロシティマルチ → **ブランド=Head** / モデル=Velocity MLT
- LYNX POWER 1.25 → **ブランド=Head** / モデル=Lynx Power（Lynx系=Headと推定。Racketpedia該当の有無は③で確認）

## 自動整形（確認不要）
- 「Phantom Spin 17 / 1.24」→ モデルの余分な "/" 除去、太さ=1.24
- 大文字ゆれ（HEAD/Head, LYNX/Lynx）→ 正式表記に統一

## 進捗
- 2026-06-30 **②掃除をライブ適用済み**（`.claude/firestore-apply.js --apply`）。
  - ライブは29本→24本（控えは28本だったが、6/3以降に1本増えていた＝read-modify-writeで救済）。
  - 削除5件: st01〜04（二重登録の古い方）＋ s12（Yonex製全般）。
  - plan の st01/st02 参照を s1/s2 へ付け替え。s3/s4 メモ合流。練習878件・ラケット無傷。
  - 元に戻す: `node .claude/firestore-apply.js "<鍵>" --restore 2026-06-30T00-43-23-110Z`
  - バックアップ: `.claude/backup/strings-2026-06-30T00-43-23-110Z.json` / `plan-...json`
  - 適用後 data-latest.json を再ダンプ済（24本）。
- 2026-06-30 **①ブランド分離（データ）をライブ適用済み**（`.claude/firestore-brands.js --apply`）。
  - 24本すべてに brand / model（+太さ）を**追加**。name・qty・status・note・id・order は不変。記録878件も無傷（strings ドキュメントのみ更新）。
  - 取り違え修正: 「Babolat ALU Power」→ brand=**Luxilon**（name は不変）。ベロシティマルチ→Head/Velocity MLT、LYNX POWER→Head/Lynx Power も適用。
  - ブランド判定は `scratchpad/validate_brands.py` で Racketpedia と突合（不一致0・15本一致・9本は名前先頭ブランドで安全）。
  - 控え: `.claude/backup/strings-brands-2026-06-30T16-27-01-116Z.json` / 元に戻す: `--restore 2026-06-30T16-27-01-116Z`
  - **未了（次の見える一歩）**: アプリは brand/model/太さ を**まだ表示しない**。アプリUI（弦リスト/編集に brand 列・項目）と、保存時に新フィールドが落ちないことの確認が必要。
- 2026-06-30 **Racketpedia連携（データ）をライブ適用済み**（`.claude/firestore-link.js --apply`）。本人がワークシートで選択。
  - 連携14本（rpSlug/rpName/rpStiffness/rpTypology/rpRadar を追加）。うち8軸レーダー付き6本（Head Hawk Power/Head Lynx Tour/ALU Power/Eco Power/Devil Spin/RPM Hurricane）。
  - 該当なし10本（ProsPro3/Toalson Biologic XX/Gosen/Prince Phantom/Dunlop Explosive Turbo/LYNX POWER/サムライ/Hawk Touch ※本人がnone選択）。
  - 自動照合は不可と実証→assisted-manual（本人選択）で実施。RPM Hurricane↔Pro Hurricane など本人判断で確定。
  - name・記録878件は不変・追加のみ。控え: `strings-link-2026-06-30T17-25-25-992Z.json` / 戻す: `--restore 2026-06-30T17-25-25-992Z`
  - **完了状況**: ①連携（最優先）= データ確定済み。次は②表示（アプリUIで剛性/8軸を見せる）。③ID化は後。
- 2026-07-01 **素材/形状/色 の取り込みをライブ適用済み**（`.claude/firestore-shape.js --apply`）。「後で取り込む」と保留していた項目を消化。連携14本に rpShape/rpComposition/rpColors/rpTensionRange 追加。name・記録878無傷。控え: strings-shape-2026-07-01T02-11-52-750Z / 戻す: `--restore 2026-07-01T02-11-52-750Z`。→ **弦マスターのRacketpedia由来データは完成**（rpSlug/rpName/rpStiffness/rpTypology/rpRadar/rpShape/rpComposition/rpColors）。
- 2026-07-01 **③ID化の事前分析（読むだけ）完了**。**過去の「878件の地雷」は誤り**。弦を名前参照するのは practices22/trials54/tournaments44/quickTrialCards2/stringSetups5 ＝ **合計127参照・ユニーク12種、100%が24本のマスター名に完全一致**（未対応0）。→ ID化は綺麗・小さい・低リスク（追加のみで stringMainId/stringCrossId を付けられる）。実施は試合記録に触れるので dry-run 提示→ユーザーOK→適用の順。
- **残りの棚上げ**: 主観8軸の入力手段（UI＝Claudeデザイン側）／ 評価カテゴリ status6→設計5 の整理（要ユーザー決定）。
- 2026-07-01 **③ID化をライブ適用済み**（`.claude/firestore-idlink.js --apply`・ユーザーOK取得後）。127件に stringMainId/stringCrossId を**追加**（practices22/trials54/tournaments44/quickTrialCards2/stringSetups5）。名前は全保持・追加のみ・記録件数無傷・不正ID0。控えはコレクション別（idlink-<col>-2026-07-01T03-00-23-432Z）／戻す: `--restore 2026-07-01T03-00-23-432Z`。
  - ※ ただしアプリ側は今も**名前でマッチ**（idは未使用）。正式名採用/リネームを安全化するには、アプリが id を優先参照する改修（＝UI/アプリ側＝Claudeデザイン領域）が要る。id はその土台として先に敷いた。
- **弦DBのデータ土台=完了**: 弦マスター(brand/model/gauge + Racketpedia由来9項目) ＋ 記録のID化。残りは 主観8軸入力(UI)／評価カテゴリ整理(要決定)／アプリが id を使う改修(UI)。
- 2026-07-01 **Racketpedia全カタログを「別体」で公開済み**（ユーザー指示「デプロイOK・アプリとは別体」）。`catalog/strings-catalog.json`（1104本/8軸110/320KB）を v4外に置き、main push→GitHub Pages で公開。**アプリ(v4/)は非変更**（commitはこの1ファイルのみ）。公開URL: https://grooveworks.github.io/tennis-db/catalog/strings-catalog.json （HTTP200・count=1104 確認済）。Pages は pages.yml で path:'.' 全体配信のため v4外に置くだけで別URL公開。
  - 「取り込む仕掛け」①置く=完了。残 ②アプリがURLを読む ③SWでオフライン ④選ぶ画面 = アプリ本体改修なので未着手(ユーザー承認待ち)。
  - 主観は再発明禁止: 既存の試打(trial)評価(9軸1-5, 05_schema.js:84 / TrialEditForm)を使う。平均で潰さない(条件=弦+ラケット+テンション+イベントごと)。
- 2026-06-30 **stringSetups 名前そろえをライブ適用済み**（`.claude/firestore-setups.js --apply`）。ユーザーが「セット弦名がリスト不一致」を発見→調査。
  - 原因: setupは弦を「名前文字列」で参照、3つが短い別名（Blast 1.25 / PTP 1.25 / Phantom Spin 17）でマスター正式名と不一致。②とは無関係の既存問題。
  - 修正: 3名を正式名（Babolat Blast 1.25 / Yonex Poly Tour Pro 1.25 / Prince Phantom Spin 17 / 1.24）へ。マスター実在チェック付き。全5参照がマスターに解決＝完了。
  - 元に戻す: `--restore 2026-06-30T02-02-12-381Z`。これは名前を合わせる即時修正で、根本（名前参照）は③のID化で断つ。

## 2026-07-03 会員データ取込 + 比較ページ完成 (未commit)
- 有料会員化。会員限定データ (動的剛性/帯別剛性/伸び率/平均比±) の取込を実装・実証 (RPM Blast で全項目一致検証)
- 平均比 (average-related ±N) 8軸を新フィールド radar_delta_* で取得。「Equal to average」=0 も対応
- モデルページ (/tennis-strings/model/*) 対応: 1閲覧で全バリエーション一括取込。userscript v1.2 (原文取り寄せ+model URL)
- listener に inbox (未対応ページの保管箱)。取込→比較ページ自動再生成 (build_compare --no-import) まで全自動化
- string_compare.html 完成形: メーカー順初期表示 / F5状態維持 / 動的剛性列 / 詳細バッジ / 詳細画面 (p3承認: 平均比色分け・?解説・バリエーション比較・lbs換算) / 複数比較 (チェック→最大4本、平均比色分け)
- タブレット持ち出し = ファイルコピーで可 (1ファイル完結)。恒久解 = Firebase「器は公開・中身は本人」方式 (設計済・未着手)
- 公開カタログは6月末公開分で凍結方針 (会員データの横流し防止)。データは racketpedia/out/ (git外)
- 次: SEデモ後 → Firebase 方式着手 / 今日の分の commit 待ち (ユーザー承認後)

## 2026-07-02 ライブ取込 開通 + 自動翻訳ガード
- Tampermonkey 開通 (Chrome「ユーザースクリプトを許可」ON が必要だった)。閲覧だけで取込が動くことを実証 (yonex-poly-tour-strike-grey-125 がライブで届いた)
- 【訂正】当初「radar 8軸が enrich された」と説明したが誤り。radar は 6月末公開時点で取得済み (HEAD カタログと一致で確認)。今日の 'changed' は自動翻訳による name 上書きのみ
- 事故: Chrome 自動翻訳ページの取込で name が日本語に上書き → git のカタログから英語名を復元
- 防御を store.upsert に追加: CJK 混入値は全項目で保存しない (name は既存英語名/slug 導出で救済)。翻訳まみれ payload を upsert しても status=same で無傷を実地テスト済
- listener.py を画面なし(pythonw)対応に修正 + ログオン時自動起動をスタートアップに登録
- catalog/strings-catalog.json の自動再生成 (build_catalog.py) が実戦で発火することを確認
