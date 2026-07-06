# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

### fix: ストリング比較PCの初期表示を「表」にする (2026-07-06)
push 候補: gear/racketpedia/build_compare.py(初期view=table パッチ追加) / gear/racketpedia/string_compare.html(再生成) / gear/strings.html(器 再生成) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

主な変更:
- ユーザー要望: 開いてまず「表」を見せる。デザイン既定は view:"scatter"(マップ)だったのを build_compare.py で view:"table" に差し替え(デザイン束は不改変・タブでマップにも行ける)
- データ再アップロードなし(会員データ不変・器はデータなし)

データ保護:
- 器 gear/strings.html を機械検査: **初期state view=table / SC_DATA埋込なし / 実データ(RPM Blast)なし / ログインゲートあり / support.js参照** を確認

実画面検証: 済
- ローカル配信で string_compare.html(実データ入り)を実描画: **初期表示=表(表タブが青#007AFF・アクティブ、マップは灰・非アクティブ、プロット領域 mp-plotarea 非表示)、表に650行**を確認
- マップタブ click → 散布図に切替(plotVisible=true, dots描画, トグル健在)を確認

console error 0: 済
- level=error のログ 0件

未確認: なし
- 実URL(github.io)でのGoogleログイン成功のみ push 後の本人確認事項(失敗時は私が直す)

---

### feat: ストリング比較PCをClaudeデザインに刷新(2軸マップ) + gear配下へ集約 (2026-07-06)
push 候補: gear/ 配下一式(器 strings/strings-mobile/rackets/reader + support.js + racketpedia/tennisone/catalog をgear配下へ移動) / racketpedia,tennisone,catalog(旧位置)の削除 / .claude/{cloud-upload.js,rp-restart,rp-status,rp-backup} / .gitignore / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。ストリング比較は独立ページ(gear/)。

主な変更:
- ストリング比較PC版を Claude デザイン本体(.dc.html + DCランタイム support.js)へ全面刷新。2軸マップ(散布図)+ ドラッグ拡大 + パン + クラスタ一覧。build_compare.py がデザインに実データを SC_DATA として注入
- 私の当初の「貼り付け実装」は破棄しデザイン本体を土台に(見た目がデザインと一致)
- gen_cloud_pages.py: ストリングPC版のデザイン方式(SC_DATA除去+ログイン後セット+support.js配信)に対応
- フォルダ集約: racketpedia/tennisone/catalog を gear/ 配下へ移動(公開URL不変・公開器は gear 直下)。全スクリプトのパスと .gitignore を追従

データ保護(最重要):
- 公開器 gear/strings.html は **SC_DATA埋込なし・実データ(RPM Blast等)なし・66KB(データ入りなら470KB超)・ログインゲートあり**を機械検査で確認
- 会員データ(out/cache/design_handoff/tennisone data/reader.html/string_compare*.html)は .gitignore で公開除外、git status に不在を確認
- support.js は DCランタイム(公開ライブラリ・会員データ非含有)

実画面検証: 済
- 公開器 gear/strings.html をローカル配信で実描画: ログインゲート表示・「Google でログイン」ボタン・Firebase/support.js 読込・**ログイン前 SC_DATA=undefined(会員データ保護)** を確認
- マップ本体(listener /compare): デザイン忠実再現・表/マップ両ビュー・ドラッグ拡大・パン・クラスタ閉じ を本人が実機確認済み

console error 0: 済
- 公開器・マップ本体とも console にエラーなし

未確認: なし
- 実URL(github.io)でのGoogleログイン成功のみ push 後の本人確認事項(失敗時は私が直す)

---

### feat: ギア4ページのクラウド化 + tennis-oneアーカイブ基盤 (2026-07-03)
push 候補: commit c19dc97 (gear/器4枚 + racketpedia生成系 + tennisone基盤 + .gitignore防御) / commit 5e6c5ec (会員データ取込+比較ページ、既済) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ (v4/, src/) には一切触れていない**。gear/ は独立ページ。

データ保護 (最重要検証):
- gear/*.html は「器」のみ: check_gear.py で会員データ・記事本文の混入ゼロを機械検査 (probe: 実データ固有値5種) + staged実体サイズ確認 (reader 13KB / データ入りなら2.6MB)
- 会員データ実体 (racketpedia/out, string_compare*.html, design_handoff*) と記事データ (tennisone/data, reader.html) は .gitignore で公開除外 — staged一覧に不在を確認
- 公開カタログ catalog/strings-catalog.json は会員閲覧由来データが混入したため**意図的に unstaged のまま** (凍結方針)

実画面検証: 済
- 器のログインゲート描画・boot スクリプトは node --check 構文検証 + 実ブラウザ (racketpedia origin harness) で gate 表示確認
- データ面: 本人専用 Firestore へ 3種 (strings 2分割 / rackets 1 / reader 9) のアップロード完了・meta 書込確認 (アップローダ出力)
- 相互リンクナビ: 4ページで DOM/位置/現在ハイライトを計測検証
- Googleログイン→データ取得の end-to-end は push 後に本人が実URL (github.io) で確認する (authDomain 許可済みドメインのため localhost/harness では最終確認不能)

console error 0: 済
- 器ページ・ローカル4ページとも harness console にエラーなし (moment.js等の既存warning除く)

未確認: なし
- 実URL でのログイン成功のみ push 後の本人確認事項 (失敗時は私が直す)

---

### feat: Googleカレンダー自動同期 (gcalSync callable + 設定UI + 起動時自動マージ) (2026-07-03)
push 候補: functions/{index.js,gcal.js,package.json,package-lock.json} / src/{core/01_constants.js, app.jsx, ui/common/SettingsModal.jsx, domain/gcal_sync.js} / DESIGN_LOG.md / VERIFY_LOG.md / v4/ ビルド成果物。

バージョン: **4.8.6-S17 → 4.8.7-S17** (Z+1)。

設計 (DESIGN_LOG 2026-07-03 エントリ):
- Function = 読み取り専用プロキシ (ICS fetch + RRULE展開 + 分類のみ、Firestore 書き込みゼロ)
- 書き込みは client のみ (新規 id のみ追加 + 同日同名 skip = 既存レコード無変更、上書き事故ゼロ)
- 分類/会場正規化は extract_gcal.ps1 (2026-04 実運用) の忠実移植
- SSRF ガード: calendar.google.com/calendar/ical/ 配下のみ / 認証必須 (request.auth)

ローカル検証 (deploy 前、.build_tmp/test_gcal.js):
- TZ=UTC / Asia/Tokyo / America/New_York の 3 環境で出力ハッシュ完全一致 (TZ 非依存)
- 定期予定の週次展開 / EXDATE 除外 / 振替 (RECURRENCE-ID) / 全日大会 / 会場推定 (金曜20時→ベアーズ、火曜→イトマン) / 分類除外 (締切・非テニス) / id 一意性 = 全 PASS

実画面検証: 済
- preview (localhost:8081, ?dev=1): 4.8.7-S17 起動 → ⚙設定を開く → 「Google カレンダー自動同期」欄表示 (URL入力2 + 今すぐ同期) → URL 入力 blur → localStorage yuke-gcalConfig-v1 保存を確認 → 未ログインで同期押下 → ガード toast「ログイン後に同期できます」表示 → テスト値クリーンアップ済
- 本番 end-to-end (ユーザー実施・本人確認済「出来ました」): 実ログイン + 実 URL 2本貼付 → 今すぐ同期 → 成功
- サーバー側ログ (firebase functions:log): 2026-07-02T22:37 (JST 07-03 07:37) callable 実呼出 auth=VALID・エラーなしを確認
- deploy: gcalSync (asia-northeast1) Successful create operation / 既存 3 functions 無変更

console error 0: 済
- preview 起動時・設定操作中とも level=error → "No console logs"

未確認: なし
- ICS 反映遅延 (Google 側キャッシュ、数時間) は仕様としてユーザーへ事前告知済。iPhone 側は同一 Firestore 設定 (gcalConfig) が同期されるため追加作業なし (次回 iPhone 起動時に自動適用)。

---

### feat: Racketpediaパイプライン強化 + 応答規律R8 フック (2026-07-02)
push 候補: commit 1074c9e (racketpedia コード+文書のみ、収集データは .gitignore で除外) / commit bac8ab8 (CLAUDE.md R8 + hooks + settings.json)。

バージョン: 変更なし (4.8.6-S17 維持) — **アプリ (v4/, src/) には一切触れていない**。ビルド/デプロイ対象のアプリコード変更ゼロ。

実画面検証: 済
- アプリ画面の変更なしのため対象外。代わりに変更対象そのもの (取込パイプライン) を実 Chrome で end-to-end 検証:
  翻訳された実ページ→スクリプトv1.1発火(原文2回目GETの痕跡確認)→受け口→英語で保存 (listener.log [ingest] 行) →カタログ自動再生成 (更新時刻で確認)。
- 翻訳まみれ payload の upsert で既存データ無傷 (status=same)、重複ゼロ (1104本=uniq 1104)。

console error 0: 済
- アプリコード変更なしのため該当なし。取込検証中のブラウザ console にエラーなし (moment.js の既存 deprecation warning のみ、当方変更と無関係)。

未確認: なし
- 会員ログイン状態での取込 (⑤) は会員登録後に別途検証予定 (README 記載済)。

---

### docs+gate: R1 自動ゲート (pre-push version同期) + R1 smoke 実施記録 (2026-06-04)
push 候補: R1-smoke-test.md (T1 期待値 4.7.34→4.8.6 + 「自動ゲート(pre-push)」節追加) / DESIGN_LOG.md (R1ゲート設計エントリ §1-15) / VERIFY_LOG.md。`.git/hooks/pre-push` に APP_VERSION 同期チェック追加 (machine-local・非追跡・commit されない)。

バージョン: 変更なし (4.8.6-S17 維持) — コード/ビルド/デプロイ なし。

修正対象 (名前指定 add):
- R1-smoke-test.md / DESIGN_LOG.md / VERIFY_LOG.md (本ファイル)
- .git/hooks/pre-push (非追跡・このマシンのみ・push されない)

R1 smoke 実施 (DEV localhost:8081 ?dev=1, Claude が実施・ユーザー時間ゼロ):
- T1 [条件1] version       : observed=4.8.6-S17 (旧期待値 4.7.34 が古い→4.8.6 へ更新)
- T2 [条件2] ホームで heavy 未ロード   : PASS observed=promise null & __TennisDBHeavy undefined
- T3 [条件1] 大会詳細を開く          : PASS observed=[aria-label="大会詳細"]表示
- T4 [条件1] 試合追加→MatchEditModal : PASS observed=[aria-label="試合を編集"]存在
- T5 [条件1] 試合編集でも heavy 不発  : PASS observed=未ロード継続・heavyFetch=0
- T6 [条件2] ホームで heavyバンドル取得: PASS observed=0件
- T7 [条件1] console error          : PASS observed=0件
- 保存→リロード→残存 [条件2]        : PASS observed=cal_069 試合 3→4、reload(navType=navigate)後も4、追加「勝利」残存 → reset でクリーンアップ済
- 注: 起動時 heavy ロードは「分析タブ復元」が原因 (重いタブは設計通り)。試合経路(ホーム→大会→試合編集)は上記の通り軽量維持。

自動ゲート検証:
- 実フック実行 `sh .git/hooks/pre-push` → exit=0 (R1 gate passed: APP_VERSION 同期 OK 4.8.6-S17 + VERIFY_LOG gate passed)
- desync 模擬(sw=9.9.9) / index.html version 欠落 模擬 → 両方 BLOCK 確認 (fail-closed 成立)

実画面検証: 済
- 上記 R1 smoke を dev で実際に画面操作 (ホーム→記録→大会詳細→試合追加→保存→リロード) して観測。

console error 0: 済
- dev で全操作中 console error 0 件 (preview level=error → "No console logs")

未確認: なし
- DEV は no-login のためクラウド往復は対象外 (R1-smoke §42-43)。クラウド同期は本番稼働中・同期表示出荷済。「端末に残る」(条件2核心) は保存→リロード残存で実証。

---

### docs: 全体設計を完成契約ベースで正式文書に統合 (2026-06-04) ← **push 済 (4ed62f6)**
push 候補: 全 Claude Code ログ精査で再構築した全体設計を、追跡対象の正式文書に一本化。ROADMAP_v4.md 冒頭に「★現行ロードマップ(完成契約ベース)」新設(旧 S0-S21 は履歴として下に保持) / DECISIONS_v4.md に「2026-06-04 土台決定 D1〜D5」追記 / 現在地.md を実態(4.8.6-S17・4.8.3〜4.8.6 push 反映)に更新し ROADMAP★・DECISIONS D1-D5 を単一の真実として指す。

バージョン: 変更なし (4.8.6-S17 維持) — コード/ビルド/デプロイ なし、docs のみ。

修正対象 (名前指定 add):
- ROADMAP_v4.md / DECISIONS_v4.md / 現在地.md / VERIFY_LOG.md (本ファイル)

実画面検証: 該当なし (コード/画面の変更なし・docs のみ。前回 docs push 5cf39fd/21c63c7 と同方針)
console error: 該当なし (コード変更なし)
※ 偽りの検証「済」は書かない。下記 4.8.6 以前の実画面検証「済」記録は保持。本 push は文書のみで検証対象画面を持たない (pre-push ゲートは既存「済」記録で通過)。

未確認: なし

---

### 4.8.6-S17 — SW 自動更新化 (スマホで最新が来ない元凶を解消) (2026-06-04) ← **push 済 (d93fb6e)**
push 候補: Service Worker を `skipWaiting` + `clients.claim` に反転し、新版を即適用。`_head.html` 登録に `updateViaCache:"none"` + `controllerchange→1回reload`(controller既存時のみ・refreshingガード)。**旧設計「全タブ閉じ待ち」がスマホで「最新にリロードできない」元凶だった = 私の設計ミスの修正。ユーザーに全タブ閉じ作業は不要。**

バージョン: 4.8.6-S17 (4.8.5 → 4.8.6、Stage S17 維持)

修正対象 (名前指定 add):
- v4/sw.js (install→skipWaiting / activate→clients.claim、cache削除は維持、ヘッダコメント更新)
- src/_head.html (register に updateViaCache:none + controllerchange→reload 初回除外/ループ防止)
- src/core/01_constants.js (4.8.6-S17) / v4/index.html (build)
- DESIGN_LOG.md (2026-06-04 SW自動更新エントリ §1-14、承認済設計の反転を明記) / VERIFY_LOG.md

設計の反転: 旧「skipWaiting/clients.claim 不使用 (既存タブ保護)」(2026-05-21 ユーザー承認) を覆す。理由=その保護が更新不達の元凶で、ユーザーが明示的に修正を要求。試合中の勝手reloadリスクは実質ゼロ(新版はpush時のみ存在=試合中に更新は発生しない)。

build: Core 399506 / Heavy 193658 bytes、4.8.6-S17 確認。sw.js に skipWaiting/clients.claim、index.html に updateViaCache/controllerchange を確認。

実画面検証: 済
- dev fresh start (SW全消し+reload で初回インストール): **SW active state="activated"**(=skipWaiting効・即活性化)、**controllerSet=true**(=clients.claim効・掌握)、cache=`tennisdb-4.8.6-S17` のみ(旧削除)、**precache 16ファイル**(=オフライン起動維持)、アプリ正常描画(=初回の無駄reloadなし・reloadループなし=controller有時のみlistenerのガードが機能)。
- 自動更新(controllerchange→reload)のコードは present + 仕様準拠。**クロスバージョンの実更新の最終証明は次push が普通のリロードでスマホに届く事**＝これは私の責任範囲。届かなければ私が直す(ユーザーに回避作業をさせない)。

console error 0: 済
- dev で SW登録+活性化後 console error 0 件 (preview level=error → "No console logs")

未確認: なし (4.8.6 を最初に受け取る1回のみ、旧_head.htmlに自動reloadが無いためリロード1〜2回・**タブ閉じ不要**。4.8.7以降は自動)

---

### 4.8.5-S17 — 相談モーダルのアイコン統一 (絵文字→Phosphor) (2026-06-04) ← **push 済 (645e723)**
push 候補: ConsultModal が絵文字/文字記号 (📂📌⚡＋ ‹ ↑) を使い、アプリ本体の Phosphor アイコンと不揃いだったのを Phosphor `<Icon>` に統一。📂→folder-open / 📌→push-pin / ⚡→lightning(3箇所) / ‹→caret-left(2箇所) / ↑→arrow-up / ＋→plus。weight=regular で本体と同トーン。ロジック変更なし、見た目のみ。

バージョン: 4.8.5-S17 (4.8.4 → 4.8.5、Stage S17 維持)

修正対象 (名前指定 add):
- src/ui/common/ConsultModal.jsx (絵文字9箇所 → Icon、ボタンに flex 中央寄せ追加)
- src/core/01_constants.js (4.8.5-S17) / v4/sw.js (同期) / v4/index.html (build)
- VERIFY_LOG.md

build: Core 398821 / Heavy 193658 bytes、4.8.5-S17 確認。UIバンドル内の 📌⚡📂＋ 残数 = 0 (全置換)。

実画面検証: 済
- dev fresh start (SW全消し+reload で `tennisdb-4.8.5-S17` ロード): 相談モーダル起動 + 定型文シート展開、Phosphor アイコン 23個描画、**screenshot で目視確認** — 戻る(caret-left)/バナー(folder-open)/定型文(lightning)/追加(plus) が全て細線 Phosphor で本体と統一、絵文字の色ムラ消失。
- 既存の Header(chat-circle) / Settings(copy, download-simple) との見た目一致を確認。

console error 0: 済
- dev で相談モーダル + 定型文シート展開後 console error 0 件 (preview level=error → "No console logs")

未確認: なし

---

### 4.8.4-S17 — 「現在地コピー」書き出しボタン (2026-06-04) ← **push 済 (2dea204)**
push 候補: 設定 > データ欄に「Claude用に現在地をコピー」ボタン追加。今の機材・直近の試打/戦績・保留(aiContext)を**生Firestoreから1タップ**で貼り付け用テキストに書き出し → 外部Claude Project会話に貼る**鮮度の橋**(手動ナレッジ更新を廃す)。

バージョン: 4.8.4-S17 (4.8.3 → 4.8.4、Stage S17 維持)

修正対象 (名前指定 add):
- src/domain/consult_export.js (新規、buildConsultExport = 機材/試打/戦績/保留を整形。既存 formatTrial/Tournament 流用、値変換なし)
- src/ui/common/SettingsModal.jsx (handleCopyState + ボタン1個)
- build.ps1 (bridge に copyToClipboard + buildConsultExport 追加 = SettingsModal heavy の bridge 漏れ修正)
- src/core/01_constants.js (4.8.4-S17) / v4/sw.js (同期) / v4/index.html (build)
- DESIGN_LOG.md (2026-06-04 エントリ §1-14) / VERIFY_LOG.md

build: Core 398007 / Heavy 193658 bytes。bridge: index.html に両関数を key 露出、bundle-heavy.js が `copyToClipboard:fn,buildConsultExport:yn}=window.__TennisDBCore` で destructure (両確認済)。

実画面検証: 済
- dev fresh start (SW全消し+reload で `tennisdb-4.8.4-S17` ロード): window.__TennisDBCore に両関数あり、buildConsultExport() 実行成功 (8649字・「現在の機材/直近の試打/戦績」構造・throw なし = bridge 疎通実証)、設定モーダル起動 → 「Claude用に現在地をコピー」描画 → クリック → ボタン正常復帰 (固まらない)
- **bridge 漏れ (R6 #3) を push 前に発見・修正**: build 時に handleCopyState が index.html に無い = SettingsModal heavy と判明 → buildConsultExport/copyToClipboard が bridge 未登録の ReferenceError を実機前に検出 → build.ps1 で bridge 追加 → 再 build + 再検証で疎通確認

console error 0: 済
- dev で設定起動 + コピー実行後 console error 0 件 (preview level=error → "No console logs")

未確認: なし
- dev は no-login のため 保留/決定(aiContext) 節は graceful 省略。本番(ログイン)では aiContext から実取得。機材/試打/戦績の整形は dev fixture で実出力確認済。

---

### 4.8.3-S17 — アプリ内AI相談 (ConsultModal) + ワンセット保存のクラウド化 (2026-06-04) ← **push 済 (a9d99cd / 15b4c6b)**
push 候補: 試合中/外出先でもスマホから使える「文脈つきAI相談」をアプリ内に新設。Header 💬 → ConsultModal (fast=試合中 haiku / deep=深掘り opus)、Firestore 現データを文脈に Anthropic API で応答。議論の作法/口調/反ループ規律を system prompt 化。M2 ループ閉じ: 相談結論を「ワンセット」下書き (draftSet) → aiContext.obj.sets に保存。保存は offline persistence で端末止まりになる事故があったため、**サーバー側 Cloud Function 直書き (mode=saveSet) に変更**し確実化 (30秒 timeout)。

バージョン: 4.8.3-S17 (4.7.34 → 4.8.0 → 4.8.1 → 4.8.2 → 4.8.3。**Stage S17 維持**、ユーザー承認済)

修正対象 (= commit 対象、**名前指定で add**。未追跡の個人データJSON/preview は add しない):
- functions/index.js (aiConsult onCall: fast/deep/draftSet/**saveSet** モード、_CONSULT_PRINCIPLES、_buildTennisContext、admin 初期化)
- src/domain/ai_consult.js (新規、httpsCallable ラッパ)
- src/ui/common/ConsultModal.jsx (新規、全画面相談UI + localStorage会話保持 + timeout + 定型文 + draftSet/saveSet クラウド保存)
- src/ui/common/Header.jsx (💬 AI相談ボタン追加)
- src/app.jsx (consultOpen state + ConsultModal マウント)
- src/core/01_constants.js (APP_VERSION 4.8.3-S17)
- v4/sw.js (APP_VERSION 同期、CACHE_NAME 連動)
- v4/index.html (build 出力)
- DESIGN_LOG.md (2026-06-02 B設計 + 06-03 M1/M2 エントリ)
- VERIFY_LOG.md (本ファイル)
- .gitignore (個人テニスデータ .md を公開リポから除外 = 安全策、ユーザー承認済)
- CLAUDE.md (HANDOFF → 現在地.md ポインタ更新 3箇所)
- HANDOFF_v4_S17.md (冒頭に ARCHIVED 警告)
- 現在地.md (新規、単一の真実ドキュメント、HANDOFF置換。開発状態のみ=個人テニスデータ無し)

スコープ外:
- 「現在地コピー」書き出しボタンは本 push に含まない (= 次の 4.8.4 で別途、検証後に別 push)
- planAssist の deploy / Plan AI 起動は別 (現在地.md 参照)

build:
- build.ps1 実行済、Core 395013 bytes / Heavy 192088 bytes、4.8.3-S17 文字列確認済
- functions: node --check PASS、firebase deploy --only functions:aiConsult 完了 (saveSet モード稼働)

実画面検証: 済
- **本番 (ユーザー・実機 iPhone/PC)**: Header 💬 → ConsultModal 起動、fast/deep 相談で実 AI 応答取得、口調調整を複数往復、ワンセット保存 (saveSet) 成功 → Firestore aiContext.obj.sets を私が dump で確認し **2件着弾・既存 decisions/status 不破壊**を実証 (= サーバー直書きの確実性を実データで証明)
- **dev (Claude・fresh start)**: SW全消し+reload で `tennisdb-4.8.3-S17` cache をロード (= 旧shell排除を実証)、consult button (aria-label=AI相談) + ConsultModal + textarea 描画確認、Home/Header 回帰なし

console error 0: 済
- dev fresh start で ConsultModal 起動後 console error = **0 件** (preview_console_logs level=error → "No console logs")

未確認: なし
- dev は no-login のため AI 実応答/実保存の通信は本番ユーザー検証に依拠 (dev では auth エラーで graceful close)。本番でユーザーが実応答取得+保存成功+サーバー着弾を確認済のため穴ではない。

---

(過去: 5cf39fd / 21c63c7 = docs+gitignore push 済。4.7.34-S17 = a0d6ff7 = 前回コード push 済。記録は下記過去ログに保持)

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
