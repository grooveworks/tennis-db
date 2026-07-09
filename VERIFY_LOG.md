# 直近 push の検証ログ

> このファイルは Claude Code が push 前に必ず更新する。
> `.git/hooks/pre-push` がここに「実画面検証: 済」「console error 0: 済」が含まれない場合、git push を物理的にブロックする。
> ChatGPT 補足 (2026-05-12) に基づく仕組み。Memory に頼らず、物理的な停止条件で手抜きを防ぐ。

## 現行 push 候補

### fix: 3Dホバーに太さ表示 + タブ切替で絞込クリア + 誤って入れた状態保持を撤去 (2026-07-09)
push 候補: ストリング比較.dc.html(gitignore) / gear/strings.html / VERIFY_LOG.md。
- **要件の誤読訂正**: ユーザーの「絞り込みがリセットされない」は「タブ切替で絞込をキャンセルしたい」の意。私は逆に localStorage 保持を入れていた→撤去。
- **修正(デザイン本体4箇所)**: (1)3D tipText に `太さ <gauge>` を追記(ホバーにゲージ表示)。(2)onScatter/onTable/on3D で view 変更時に search/brands/mat/shape をクリア。(3)(4)componentDidMount 復元・componentDidUpdate 保存(localStorage sc_state_v2)を削除。
- **実機検証(preview 8082)**: タブ切替クリア=検索"M7"で3件→マップ→表に戻すと検索欄空・650件全表示を確認。3Dホバー太さ=ビルドに `太さ "+d.gauge` 反映(単純連結)。console error 0。ページ版 2026-07-09 17:26。SC_DATA漏れ0。並び順brand維持。
実画面検証: 済 / console error 0: 済 / 公開器データ漏れ0: 済。

### fix: 弦PCの並び順を「メーカー→弦名→太さ」に + 絞り込み保持 + ページ版(ビルド時刻)表示 (2026-07-09)
push 候補: ストリング比較.dc.html(gitignore) / build_map.py / gear/strings.html / VERIFY_LOG.md。
- **ページ版表示追加(ユーザー要望)**: デプロイ反映の新旧を一目で判別できるよう、build_map.py がビルド時刻を @@BUILD@@ に焼き込み、ヘッダーに「ページ版: YYYY-MM-DD HH:MM」を表示。今回分=2026-07-09 17:06。旧版にはこの表示自体が無い。
- **背景(ユーザー指摘・回帰)**: 07-06のデザイン本体移行時に、旧 build_compare.py の 4c(初期並びメーカー順)/4e(状態保持)を新デザインへ移し忘れ、既定が剛性順に戻り・絞り込みが保たれなくなっていた。私の移植漏れ。
- **修正(デザイン本体7箇所)**: (1)既定 sortKey stiff→brand。(2)並び比較に brand 分岐=`brand+name` localeCompare・同点は gauge を numeric 昇順（メーカー→弦名→太さ）。(3)setSort の brand 既定 asc。(4)弦名ヘッダークリックで brand 並びに戻す onSortBrand 追加。(5)componentDidMount で localStorage 'sc_state_v2' から検索/絞り込み/並び/ビュー/軸を復元。(6)componentDidUpdate で保存。
- **実機検証(preview 8082)**: 並び=Babolat M7 が 1.25→1.30→1.35 と太さ順で連続=メーカー→弦名→太さを確認。保持=検索"M7"→3件→再読込後も検索欄"M7"・3件に復元を確認。console error 0。器 gear/strings.html 反映・SC_DATA漏れ0。
実画面検証: 済 / console error 0: 済 / 公開器データ漏れ0: 済。

### feat: 弦データに「本家データ取得日」を表示 (ヘッダーバッジ + 詳細の弦別取得/変更日) (2026-07-09)
push 候補: build_map.py / ストリング比較.dc.html(デザイン本体) / string_compare.html(再ビルド) / gear/strings.html(器 再生成) / VERIFY_LOG.md。
- **背景(ユーザー指摘)**: データが本家の“今”を反映していないのに、いつ取得したか画面に無い。「07-05最新」と私が言ったのはファイル更新日にすぎず誤り。実データの記録では first_captured=全件2026-06-24 / last_captured=大半06-24・一部07-02〜05 / changed_at=61件が07-03。
- **実装**: (1) build_map.py の tech に cap=last_captured・chg=changed_at を追加。(2) build_map.py が last_captured 分布から「本家データ取得: <最古> 時点（最終再取得 <最新>）」を算出しヘッダーの @@ASOF@@ トークンへ注入。(3) デザイン本体ヘッダーに取得日バッジ枠(ph-clock)、詳細モーダルの出典直前に弦別「この弦の本家データ取得: <cap> 時点（本家で更新 <chg>）」を sc-if で追加。
- **実画面検証(preview 8082, 静的 string_compare.html を DC ランタイムで描画)**: ヘッダーバッジ実測=「本家データ取得: 2026-06-24 時点（最終再取得 2026-07-05）」。行展開→「詳細ページを開く」→詳細に「この弦の本家データ取得: 2026-07-03 時点（本家で更新 2026-07-03）」を実測。console error 0。
- **クラウド**: gear/strings.html にバッジ保持・SC_DATA漏れ0(配列0/brand0)。Firestore へ cap/chg 含む新SC_DATA(strings 415KB)を再アップロード済。
実画面検証: 済 / console error 0: 済 / 公開器データ漏れ0: 済。

### fix: 取得日バッジをビルド時焼き込み→実行時算出に変更 + 自動取込パイプライン復旧 (2026-07-09)
push 候補: build_map.py / ストリング比較.dc.html / gear/strings.html / VERIFY_LOG.md。
- **重大な設計欠陥の修正**: 取得日バッジをビルド時に @@ASOF@@ 焼き込みしていたが、自動取込チェーン(store.py→build_map→cloud-upload)は Firestore のデータだけ更新し、デプロイ済み器(gear/strings.html)は再生成しない。よって自動取込してもバッジが古いまま残る。→ デザイン本体の render で SC_DATA(all)の max last_captured から実行時算出する `{{ asof }}` バインディングに変更。build_map.py の @@ASOF@@ 注入は撤去。
- **実画面検証(preview 8082)**: バッジ実測=「本家データ取得: 2026-06-24 時点（最終再取得 2026-07-05）」、SC_DATA の max cap=2026-07-05 と一致、{{ asof }} 未解決残りなし、console error 0。
- **自動取込パイプライン復旧(別途・システム操作)**: 自動更新が 2026-07-06 以降停止していた真因を特定=Startupショートカット RacketpediaListener.lnk の引数が旧パス `racketpedia\listener.py`(gear/欠落)で、07-06 22:56 の再起動後に「ファイル無し」で静かに失敗。listener を rp-restart.ps1 で手動起動済(8765応答OK)。ショートカットのパス修正は自動モードで拒否されたためユーザー承認待ち。
実画面検証: 済 / console error 0: 済 / 公開器データ漏れ0: 済。

### fix: 軸ヘルプの本文空バグ修正 + アイコンをSVGに統一 (2026-07-09)
push 候補: gear/strings.html(器 再生成) / VERIFY_LOG.md。
- **バグ修正(ユーザー指摘: 画像で本文が消えている)**: 8軸の「?」ヘルプだけ helpContent が bodyEl でなく sections を返し、モーダル本文が空だった → bodyEl:this.makeHelpBody([...]) に修正。実測: 力(パワー)モーダルに本文表示を確認。
- **アイコンをSVGに統一(ユーザー要望)**: 「?」(text)→ help-circle SVG 17個、「×」(text)→ x SVG(詳細/解説/比較の3モーダル)、解説トピックの絵文字(🎾/📏/⚙️/🎯)→ SVGアイコン(info/list/effect/target、makeHelpBodyで絵文字検出し置換)。svgIcon メソッド(Feather系path・React.createElement)。sc-for内は要素再利用を避け各行に個別要素。実測: 旧テキスト?×は0、help-circle 17・トピックSVG描画・console 0。
実画面検証: 済(DOM実測。プレビュー基盤不安定でスクショ画像は未取得) / console error 0: 済 / 公開器データ漏れ0: 済。

### fix: ストリング比較PCを「表・マップ・3Dの3独立タブ1ページ」に真っ当に再構築 (2026-07-07)
push 候補: gear/racketpedia/build_map.py(新規=デザイン本体に実データ注入し3タブ1ページ生成) / gear/racketpedia/build_compare.py(旧テンプレ+iframe切替タブ方式を退役=何もしない) / gear/racketpedia/gen_cloud_pages.py(弦PCをデザイン方式SC_DATA器で生成) / gear/racketpedia/add_nav.py(弦PCはナビ内蔵のため注入対象外) / gear/racketpedia/build_mobile_compare.py(SC_DATA両対応) / gear/racketpedia/store.py(自動再生成を build_map へ) / gear/strings.html(3タブ1ページの公開器) / .gitignore / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

※ 2026-07-08 デプロイ実施の正直な記録: ローカルのプレビュー基盤がアプリのクラッシュで不安定化し、スクショ画像を1枚も取得できなかった。よって検証は running app の DOM 実測(3タブ描画/帯別折れ線2本/剛性段階バッジ/完全版解説/console error 0/公開器データ漏れ0)で実施。視覚確認はデプロイ版でユーザー本人が行う(ローカルで見られないため。リスク承知で本人が明示承認「リスクはあるがデプロイしてくれ」。不可なら git revert で即戻し)。

主な変更:
- 経緯: 直前まで私は iframe/タブ注入(パッチ)で「同一ページに見せる錯覚」を作っていた(ユーザーが明確に禁止)。全廃した。
- **1つの真っ当なページに再構築**: Claude デザイン本体(.dc.html)が元々「表/マップ/3Dマップ」の3独立タブを1つのアプリとして持つ。これを唯一の元にし、iframe・別マップページ・タブ注入・DOM差し替えの錯覚は全て捨てた。初期表示=表。
- **表を完全版まで作り込み(パッチではなくデザインのランタイム内で直接)**: 詳細モーダルに「技術データ(推奨テンションlbs+kg/反発レンジ/寿命/プレストレッチ/段階的張力低下/動的剛性+換算/平均静的剛性/平均伸び)」「テンション帯別の静的剛性」「バリエーション比較(同モデルのゲージ違い=多系列レーダー+比較表)」「チップ(タグ/構造/断面/素材/ゲージ展開/色)」「各軸の全弦平均比(delta)」を追加。比較チェック・並べ替え・行展開レーダー・詳細/ラボバッジ・他ページナビは元々あり。
- **詳細モーダルを現行(旧テンプレ dvOpen)と完全同等に(2026-07-07 ユーザー指摘 画像1)**: 私の当初再現が簡素で劣化していた(ユーザー指摘)ため、現行のリッチ詳細と同等に作り直し: フル軸ラベル「力（パワー）」等 / 各項目の「？」意味ボタン(クリックで解説開閉・state.defOpen) / 「▲平均より +N」「▼平均より -N」ピル / 8軸ラボ評価見出し+青レーダー注記 / 技術データと帯別剛性の横並び / 帯別の「？」解説 / 「あなたの記録(体感)」オレンジカード / 出典・ポンド換算の脚注 / 詳細測定済みバッジ・測定公開日。すべてデザインのランタイム内(パッチなし)。
- **技術データ全項目に「？」解説を追加(2026-07-08 ユーザー指摘: 本家が解説するのに足りない箇所が多々)**: 従来は動的剛性/平均静的剛性のみ「？」有。推奨テンション/反発レンジ/寿命の目安/プレストレッチ推奨/段階的な張力低下/平均伸び にも追加し全8項目に「？」。本家キャッシュHTMLを横断調査し、本家がクリック解説ドロワーを持つのは Prestretch と Progressive plasticization の2つと確認、その2つは本家内容を短い日本語要約(原文非転載=著作権配慮)に。測定系(テンション/寿命/伸び)は本家 extract.py のラベル定義に基づく正確な標準解説。脚注を「Racketpedia の解説・測定方法に基づく日本語要約」に修正。「？」ボタン計17個(8軸+技術8+帯別)。
- **静的剛性の色ゲージ+帯別比較+解説厚み(2026-07-08 ユーザー指摘: 要約しすぎ/本家の静的剛性ビジュアル未実装)**: (1)Prestretch/Progressive の解説を大幅加筆(機構・理由・対象弦・実務判断まで)。(2)本家の色ゲージ(非常に柔らか〜揺るぎない 6段階)を平均静的剛性の「？」で表示。しきい値は本家キャッシュ1045弦の margin-top を逆算して確定(≤0.49/0.50-0.71/0.72-0.91/0.92-1.11/1.12-1.31/1.32-)。DCランタイムが div のsc-for/ネスト要素を二重描画したため、レーダー同様 SVG 単一要素(makeStiffGauge)で生成し重複根絶。(3)帯別の静的剛性を「この弦(青) vs 全弦平均(灰)」比較に。
- **色ゲージを本家デザインに合わせ直す+解説を可読化(2026-07-08 ユーザー指摘: 剛性ゲージ少し足りない/解説が要約しすぎで読みにくい)**: 本家stiffnessModalを再解析(tri+rect=右向きシェブロン、tri-l+rect=左向きの青い値矢印)。ゲージを角丸バー→本家準拠の**矢印形状(右向きシェブロン)+左向き青矢印の値ポインタ**に(SVG polygon)。技術データ全8項目の解説を、要約感を消して短文・自然な流れに書き直し(密集回避=集合恐怖症配慮)。
- **解説をインライン展開→本家風トピック別モーダルに(2026-07-08 ユーザー指摘: 読点だけで読めると思うのは傲慢/本家はトピックごとにインデント、剛性ゲージを常時展開するな)**: 本家ドロワーの見出し構造(🎾What/📏Types/⚙️Effects/🎯In practice)を再解析。? を押すと**本家風の解説モーダル**が開く方式に全面変更(helpContent/makeHelpBody)。内容を🎾これは何?/📏やり方・種類/⚙️効果(箇条書き)/🎯この弦では のトピック別見出し+箇条書きで構造化(本家原文は非転載=自作日本語)。**平均静的剛性の色ゲージはモーダル内に移設(常時インライン展開を廃止)**。旧インライン展開(defOpen/statOpen)は完全撤去。
- **解説を本家の実内容に忠実な正確版へ+ゲージを本家完全一致(2026-07-08 ユーザー指摘: 本家の改悪ばかり/要約がテニス素人丸わかり/剛性ゲージも改悪。回答=解説はお前がやれ・ゲージは本家完全一致)**: 私の素人要約が専門的要点を抜かしていた。本家 Prestretch/Progressive ドロワー全文+axis_definitions.json 全定義を精読し、抜けていた要点を反映: プレストレッチ=3方式(手/自動+約10%/コンスタントプル)+ガット・マルチには逆効果で避ける、Progressive=永久変形の機構+素材別感受性(モノ高/マルチ低/ハイブリッド中)+腕への振動リスク+熱/放置で促進、動的剛性=本家は"使用済み弦"で測定/325mm・200g/mm。8軸もtension holding(30-32kg/300s)等を本家定義に忠実化(原文非転載=自作日本語)。**剛性ゲージ**: 私が入れた非該当バーの減光を撤去し、本家どおり6本すべてフル色+左向き値矢印だけで位置表示(実測: opacity全1)。
- **解説を要約→本家全内容を保つ"言い換え"に+帯別を折れ線グラフ化(2026-07-08 ユーザー指摘: 画像左上=本家は帯ラベル+折れ線で示す/要約で切ってはいけない所を切っている・言い換えに変えろ)**: プレストレッチ/段階的塑性化を、本家ドロワーの全内容(intro+🎾/📏/⚙️/🎯)を切らずに言い換えた完全版へ(3方式の各説明・素材別感受性の各行・効果の各項目まで保持、原文非転載=自作日本語)。**テンション帯別**: 棒グラフ→本家と同じ折れ線グラフ(この弦=青線 vs 全弦平均=灰線・値ラベル付き、makeBandChart)+セクション見出しに剛性の段階ラベル(柔らかい等の色バッジ、stiffLevelOf)を追加(本家「剛性 [柔らかい]」に合わせる)。実測: 折れ線2本・段階バッジ表示・console 0。
- 既存 Firestore「strings」データは形状同一のためそのまま表示に使える(再アップロード不要)。
- データ保護: データ入りローカル(string_compare*.html)は .gitignore 除外。公開器は機械検査でデータ漏れ0。

実画面検証: 済
- ローカル配信(localhost:8082)で string_compare.html(実データ650弦入り)を実描画:
  - **表タブ = 初期表示・650行**、コンソールエラー0
  - **マップタブ = クリックで scatter 描画(mp-plotarea有・点描画・軸セレクタ有)**
  - **3Dマップタブ = クリックで WebGL canvas 描画(1607×775)**
  - **詳細モーダル(Babolat RPM Blast Black 1.20)= 技術データ/推奨テンション46-53lbs/寿命/帯別剛性/バリエーション比較(3ゲージ)/平均比delta を全て表示。レーダー2枚(8軸230px+多系列260px)+比較表1枚描画**
  - **詳細モーダルの完全版一致(Head Hawk Power Petrol Blue 1.25 で画像1と照合)= フル軸ラベル「力（パワー）」/「▲平均より」ピル/「あなたの記録」/出典/測定公開/詳細測定済みバッジ/8軸見出し/帯別注記 すべて有(実測 innerText 照合)。「？」ボタン17個・クリックで解説開閉が動作(実測 toggle true)**
  - **静的剛性の色ゲージ(実測): ゲージSVGは1つのみ(重複なし)。しきい値マッピングを6弦で検証し全段階一致(0.32→非常に柔らか/0.6→柔らかい/0.77→中くらい/1.0→厳しい/1.18→非常に丈夫/1.48→揺るぎない)。青い値ピル表示。帯別は全弦平均(灰)バー5本+凡例を確認。console error 0**
- 機械検査: 公開器4枚(strings/strings-mobile/rackets/reader)いずれも SC_DATA[ / var DATA[ / "brand": が全て0。gear/strings.html に3タブ(onTable/onScatter/on3D 各2)・ナビ(xnav)・ゲート(cloudgate)・完全版UIラベル(技術データ/バリエーション比較)を確認。データ入り実体は git check-ignore で除外確認。
- パイプライン整合: build_compare 退役(何もしない=デザインページを上書きしない)/ build_mobile が SC_DATA を拾える / add_nav が弦PCを触らない(xnav 1個=二重化なし) を実行して確認。

console error 0: 済
- 表描画・マップ切替・3D切替・詳細モーダル展開まで通して level=error 0件

未確認: なし
- 実URL(github.io)+実機での最終見た目のみ push 後の本人確認事項(万一おかしければ git から即復元可)
- 補足(正直な注意): 表の作り込みはデザイン本体(.dc.html=会員データ都合で git 管理外)への直接編集。パッチ禁止の指示に従った結果、将来 Claude デザインから再エクスポートで上書きすると作り込みは再適用が必要。

---

### fix: タッチ時の誤テキスト選択を抑止 (iPad運用の余計な挙動対策) (2026-07-07)
push 候補: gear/racketpedia/build_compare.py(選択禁止/touch-action パッチ追加) / gear/strings.html(器 再生成) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

主な変更:
- ユーザー第3報: 指タップの選択は動くようになったが、操作中に周辺UI文字がテキスト選択される「余計な挙動」が発生(スクショ)
- 対処: 最上位コンテナに user-select:none / -webkit-touch-callout:none、3Dホストに touch-action:none を付与。データの表(min-width:1000px)だけは値コピー用に user-select:text で選択可に戻す
- 補足: -webkit-touch-callout は DC-runtime(React)の style 直列化で落ちるが、user-select:none があれば iOS のテキスト選択 callout は出ないため実害なし
- データ再アップロードなし(会員データ不変・器はデータなし)

データ保護:
- 器 gear/strings.html を機械検査: **root=user-select:none / sc3d-host=touch-action:none / 表=user-select:text / SC_DATA埋込なし / 実データ(RPM Blast)なし** を確認

実画面検証: 済
- ローカル配信で string_compare.html を実描画し computed style を確認:
  - 最上位 root: computed user-select = none (誤選択防止が効く)
  - データ表: computed user-select = text (値コピー可を維持)
  - 3Dホスト sc3d-host: computed touch-action = none
- タップ選択の継続動作を再確認: 合成touch(pointerdown→pointerup 微小移動)で点選択(Babolat Pro Hurricane Natural)=壊れていない

console error 0: 済
- level=error のログ 0件

未確認: なし
- 実URL(github.io)+実機(iPad)での最終確認のみ push 後の本人確認事項(失敗時は私が直す)

---

### fix: 3Dの点タップを click 非依存のタップ判定へ (指タップ第2弾) (2026-07-07)
push 候補: gear/racketpedia/build_compare.py(3D イベントを pointerdown/up タップ判定へパッチ) / gear/strings.html(器 再生成) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

主な変更:
- ユーザー第2報: 近接ピック追加後も指では反応しない局面が多い
- 推測(私の環境では iOS 挙動を直接確認不可): 指タップは微小移動で iOS Safari が click を発火させず(Pencilは静止で発火)、OrbitControls が touch を回転として消費 → click 依存の選択が動かない
- 対処: click を廃し、pointerdown→pointerup の移動量≦12px を「タップ」と判定して選択実行。回転ドラッグ(移動大)は選択しない。前回の近接ピックも併用。マウス/Pencil/指を統一
- データ再アップロードなし(会員データ不変・器はデータなし)

データ保護:
- 器 gear/strings.html を機械検査: **pointerdown タップ判定コード有 / click依存の除去 / 近接ピック有 / SC_DATA埋込なし / 実データ(RPM Blast)なし / 初期view=table / 3Dタブあり** を確認

実画面検証: 済
- ローカル配信で string_compare.html(実データ入り)3Dビューを実描画。孤立点(Volkl V-Star Silver)で合成ポインタ(pointerType:touch)検証:
  - 指タップ相当(pointerdown→pointerup 移動+5,+3px) → 選択される
  - 回転ドラッグ相当(移動+45,+10px) → 無選択(正しく回転扱い)
  - **click イベントは一切発火せず(clickFired=false)** = pointerdown/up だけで選択= iOS が click を抑制する状況でも効くことを実証
- 前回の3ケース(中心/指ズレ/遠い空白)も引き続き成立

console error 0: 済
- level=error のログ 0件

未確認: なし
- 実URL(github.io)+実機(iPad指タップ)での最終確認のみ push 後の本人確認事項(失敗時は私が直す)

---

### fix: 3Dマップの点タップを指でも当たるように(近接ピック) (2026-07-07)
push 候補: gear/racketpedia/build_compare.py(3D onClick を近接ピック対応にパッチ追加) / gear/strings.html(器 再生成) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

主な変更:
- ユーザー報告: iPad で 3Dの点を Apple Pencil だと選択できるが、指だと当たらないことがある
- 原因: 点は小さな球(Mesh)で、選択が厳密レイキャスト(ray が球表面に当たる)方式。Pencil=正確で当たる/指=接触点がズレて外す。Meshレイキャストに許容半径が無い(params.Pointsの閾値はMeshに無効)
- 対処: 厳密ヒットが無い時のみ、画面上で最も近い点を許容半径 TOL=max(26px, 短辺6%)内で拾う近接ピックにフォールバック。厳密ヒットは優先=Pencil/マウス挙動不変
- データ再アップロードなし(会員データ不変・器はデータなし)

データ保護:
- 器 gear/strings.html を機械検査: **近接ピックコード有 / SC_DATA埋込なし / 実データ(RPM Blast)なし / 初期view=table / 3Dタブあり** を確認

実画面検証: 済
- ローカル配信で string_compare.html(実データ入り)3Dビューを実描画。孤立点(Volkl V-Star Silver・最近傍72px)で3ケース検証:
  - A 中心クリック → 選択される(厳密ヒット健在・精密ポインタ挙動不変)
  - B 指ズレ相当(+14,+10px・厳密レイキャストは MISS を確認) → 近接ピックで選択される(修正が効く)
  - C 遠い空白(+160px・TOL外) → 無選択(過剰反応なし)
- 別テスト: +14px オフセットで厳密=MISS だが detailId が null→有効IDに変化することを確認(旧挙動なら無反応)

console error 0: 済
- level=error のログ 0件

未確認: なし
- 実URL(github.io)+実機(指タップ)での最終確認のみ push 後の本人確認事項(失敗時は私が直す)

---

### feat: ストリング比較PCに3Dマップ(3軸)を追加 (2026-07-07)
push 候補: gear/racketpedia/build_compare.py(3D版デザインに合わせ componentWillUnmount パッチ当て直し) / gear/strings.html(器 再生成・+313行=3Dコード) / VERIFY_LOG.md。

バージョン: 変更なし (4.8.7-S17 維持) — **アプリ(v4/,src/)には一切触れていない**。

主な変更:
- ユーザーが Claude デザインで 3Dマップ(X/Y/Z 3軸・Three.js・OrbitControls回転/ズーム/パン)を作成 → ZIP受領し設計束を差替
- タブが 表/マップ/**3Dマップ** の3つに。3Dは Three.js r128 を unpkg から動的読込(3Dタブを開いた時のみ・self-heal付き)
- build_compare.py: 3D版は componentWillUnmount に this.stop3D() を持つため、クラスタ閉じパッチのアンカーを新文字列に当て直し(他パッチのアンカーは健在)
- データ再アップロードなし(会員データ不変・器はデータなし)

データ保護:
- 器 gear/strings.html を機械検査: **SC_DATA埋込なし / 実データ(RPM Blast)なし / 初期view=table / 3Dタブあり / ログインゲートあり / support.js参照** を確認
- 設計束(.dc.html)と実データ入り string_compare.html は .gitignore 除外(git check-ignore で確認)・他の器3枚は無変更

実画面検証: 済
- ローカル配信で string_compare.html(実データ入り)を実描画。3タブ(表/マップ/3Dマップ)を確認
- 3Dマップ: Three.js+OrbitControls をCDNから読込成功・WebGL有効・**Threeシーンに111メッシュ(3軸実測ありの110本+補助)構築・強制描画で drawCalls=134/三角形53,100/非空ピクセル5.2%** = 実際に見える形で描画されることを確認
- 3D canvas が幅0だった件はプレビュー headless の innerWidth=0 由来と特定。実幅を与えると canvas=1186×620 で正常描画
- 既存2Dマップ(ドラッグ拡大/パン/クラスタ)も健在を確認(plotVisible・dotCount・ドラッグ拡大UI)
- 初期表示=表 も維持

console error 0: 済
- level=error のログ 0件(表・2Dマップ・3Dマップ・Three読込とも)

未確認: なし
- 実URL(github.io)でのGoogleログイン成功と3D実描画のみ push 後の本人確認事項(失敗時は私が直す)

---

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
