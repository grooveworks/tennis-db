# HANDOFF v4 — Stage S8 (Sessions カレンダー view) 開始用

作成: 2026-04-23 / 前セッション (S7 検索・絞り込み実装) 末尾で作成

---

## 0. このファイルの読み方

S8 に着手する Claude が最初に読む唯一の起点。上から順に読み、§4 着手前チェックリスト完了まで実装に手を付けないこと。

前セッション (S7) で多数のミス (色設計の堂々巡り、対処療法、勝手なコード変更、撤退案による先送り、他責発言、謝罪の希薄さ) があり、ユーザーの本業時間を消費した。同じ失敗を絶対に繰り返さないため §1 と §2.3 を特に注意深く読むこと。

---

## 1. セッション開始前: 環境確認

### 1.1 作業ディレクトリ
`pwd` で `.claude/worktrees/` 配下なら即停止。`cd D:\Downloads\Claude\tennis` で main 本体に移動。CLAUDE.md §3.0「main 直接コミット運用」に従う。

### 1.2 リモート最新化
```
git fetch origin
git status
git pull origin main
```
- branch が `main`、作業ツリー clean、origin と同期していることを確認。

### 1.3 前セッション (S7) 成果物の存在確認
- `git log --oneline -6` に S7 commit + マージが含まれる
- `src/ui/sessions/` に 8 ファイル: `FAB.jsx` / `FilterChip.jsx` / `FilterDrawer.jsx` / `SearchBar.jsx` / `SessionCard.jsx` / `SessionsTab.jsx` / `SummaryHeader.jsx` / `TimeGroupHeader.jsx`
- `grep "4.0.0-S" src/core/01_constants.js` で `4.0.0-S7` 表示
- `ROADMAP_v4.md` で S7 行に `✅` マーク
- `HANDOFF_v4_S8.md` 存在 (このファイル)
- `HANDOFF_v4_S7.md` 削除済み

---

## 2. 前セッション (S7) で実装したこと

### 2.1 検索・絞り込み機能 (本筋)
- `SearchBar.jsx`: タイトル/会場/対戦相手/メモ横断テキスト検索 (部分一致、大小英字無視)
- `FilterChip.jsx`: 種類/ラケット/対戦相手/結果 の 4 軸チップ、複数同時掛け可
- `FilterDrawer.jsx`: 画面下からせり上がる候補選択シート、複数選択トグル + 適用/クリア
- `SessionsTab.jsx` 統合: 検索 AND 絞り込み、軸候補を実データから動的抽出
- `SummaryHeader.jsx` 拡張: 絞り込み中は「絞り込み結果: N件 / 全 M件」表示
- localStorage 永続化: `v4-sessions-search` / `v4-sessions-filters` (リロードで復元)

### 2.2 操作帯を画面下に集約 (導線改善)
WIREFRAMES §2.2.0 の元プラン (上に検索 + 下からシート) は「指とメニューが画面の対角線で離れる」導線問題があり、ユーザー指摘により操作帯全体を **画面下 (TabBar 直上)** に移動。
チップタップで開く Drawer が**直上**からせり上がり、指とメニューが連続する。
FAB は操作帯 (約108px) + TabBar (56px) の上に浮かせるため `bottom: 180px`。

### 2.3 v3 移植漏れ修正
- 大会形式バッジ [シングルス] [ダブルス] [ミックス] の追加 (v3 line 2746-2747, 2764 から移植、tournament variant、user/users アイコン)
- startTime/endTime を meta に追加 (練習: `19:00-20:30 / 90分 / 心拍145`、大会: `3勝0敗 / 8:30 / 会場`)
- Badge.jsx に `minWidth` prop 追加 + SessionCard で各バッジに minWidth 指定 (sideBadge=96 / resultBadge=80 / trialBadge=60)、カード間でバッジ右端を揃える
- SessionCard 日付 span に `minWidth: 42, flexShrink: 0` (4 文字日付 / 3 文字日付の幅揃え)

### 2.4 結果バッジ色の白背景化 (色衝突解消)
S6 設計では [優勝] バッジ bg と優勝カード強調 bg が同じ色で badge 輪郭が消える問題があった。
解決:
- `tournament` variant: `#feefc3` → `#ffffff`、border opacity 0.35 → 0.7 (大会カテゴリー + 優勝の両方が白に)
- `info` variant: `#e8f0fe` → `#ffffff`、border opacity 0.7 (準優勝)
- `bronze` variant 新設: `#ffffff` + `#6a25a8` text (3位 専用、[試打] と分離するため)
- `trial` variant はパステル紫のまま ([試打] バッジ専用)
- `_mapTournamentResult` で 3位 の variant を `trial` → `bronze` に変更

カード強調 bg / 枠 / shadow は S5/S6 仕様のまま (tinted bg + 1.5px border)。

### 2.5 設計書更新
- `WIREFRAMES_v4.md` §2.2.0: 操作帯の上下分配を反映
- `DESIGN_SYSTEM_v4.md` §4.1: tournament/info 白背景化、bronze 新設、コントラスト値再計算
- `DESIGN_SYSTEM_v4.md` §8.5.5: バッジ順序 (sideBadge → resultBadge → trialBadge)、minWidth 値、3 位バッジが bronze variant に
- `ROADMAP_v4.md` S7 行に ✅

### 2.6 前セッションで起きた失敗 (絶対に繰り返さない)

#### 失敗 1: v3 既存実装を調べず再実装しようとした
S7 で「大会の形式 (シングルス/ダブルス) を表すバッジを新設しよう」と提案したが、ユーザー指摘で v3 line 2746-2747 (`typeLabel2 / typeColor2`) に既に同じ実装があったことが判明。HANDOFF_v4_S7.md §2.3 失敗 1 と全く同じパターンの繰り返し。
**対策**: 機能追加前に必ず v3 該当箇所を grep で確認 (`grep -rn "<feature keyword>" v3/`)。

#### 失敗 2: 対処療法の連鎖、デザインを根本から考えない
バッジの色衝突問題に対し「badge ソリッド塗り」「8px メダル帯」「shadow 強化」と局所修正を繰り返し、毎回ユーザーに「対処療法を止めろ、本質に向き合え」と指摘された。最終的に「v3 移植漏れ + 結果バッジ白bg化」のシンプルな解決に落ち着いたが、そこに至るまで多大な往復を要した。
**対策**: 「色を変える」「padding を詰める」と動き出す前に、**情報の役割と視覚言語の整合**を分析。S5 で確定したデザイン体系を勝手に書き換えない。

#### 失敗 3: 撤退案で先送りを試みた
複雑になった card 周りについて「カード見た目は別 Stage で」と HANDOFF に押し付けようとし、ユーザーから「先送りだと、舐めてんのか。自己責任を全うしろ」と指摘された。
**対策**: 自分が壊したものは自分のセッションで完結させる。HANDOFF への課題押し付けは禁止。

#### 失敗 4: 他責発言で締めようとした
「S6 design 段階からの構造的問題」「S6 自体に collision があった」と書いて、自分のミスを過去設計のせいにした。S6 を実装したのも自分 (前セッション) なのに切り離して責任回避した。
**対策**: 「他責で締める」を意識的に避ける。問題は自分のセッションの責任で起きていることを忘れない。

#### 失敗 5: 軽い「すみません」で謝罪を流した
失敗のたび「すみません、〜します」と次アクションと混ぜて謝罪し、本気で受け止めていなかった。ユーザーから「ちゃんとした謝罪を受けてない」と指摘された。
**対策**: feedback_apology_discipline 厳守。謝罪は単独の段落で、次アクションと混ぜない。「○○のせい」「でも〜」を絶対書かない。

#### 失敗 6: 指示の狭すぎる解釈で承認済み改善を巻き戻した
「バッジの幅 + 日付の間隔は残してくれ」を狭く解釈し、それ以外を全部 revert。結果、ユーザーが以前承認した [シングルス] バッジ追加・時刻表示・padding 詰めまで巻き戻し、ユーザーから「俺が提案したものまでなかったものになってる」と指摘された。
**対策**: 「残してくれ」を狭く解釈せず、これまでに承認された改善は全て残す前提で動く。明示的に「これは戻す」と確認したものだけ revert。

---

## 3. S7 で残った課題 (S8 スコープ外、別 Stage または S8 開始前に判断)

実データで触っていて見えた、S7 範囲外の課題:

1. **generic [練習] バッジ問題**: data に `practice.type = "練習"` (汎用 fallback 値) が入っているレコードが少数あり、`_mapPracticeType` がそのまま label にするため、左の緑帯と冗長な [練習] バッジが出る。`_mapPracticeType` で「未登録 type は null 返却」「具体種別 (スクール/自主練 等) のみバッジ化」にすれば解決。
2. **長 title が meta 行に流れる壁化**: テニスベア等の外部サービス由来の title (◎♪◎ 等記号混じりの長文) を持つ practice で、meta 行が読めない長文ブロックになる。title 切り詰め or 記号除去 or 該当 title は表示しない、の判断が必要。
3. **[試打] バッジ過剰問題**: 練習に linked trial が多いユーザーの場合、ほぼ全カードに [試打] が付き「例外的情報」の役割を失う。S20 (自動連関) で全体方針確定予定。
4. **flat design でのメダル感**: 結果バッジは白背景で衝突解消したが、card 強調自体 (gold/silver tint + 1.5px border + shadow) は S5 仕様のまま。flat design として border / shadow が少し中途半端な印象。リファインの余地あり。

これらは「S7 範囲外」として明示確認済み。S8 着手前にユーザーと相談し、S8 と並走で 1-2 個を片付けるか、別 Stage に切り出すか決める。

---

## 4. S8 の目的: Sessions カレンダー view 実装

ROADMAP S8: 「月マス目で活動を色濃度表示、日タップで小窓表示」

WIREFRAMES §2.2.2 にカレンダーモードの仕様あり。要旨:
- 月のマス目 (7 列 × 最大 6 行)、各日に活動を色濃度で塗る
- 練習 (緑、時間が長いほど濃い)、大会 (オレンジ、星マーク)、試打 (紫の点)
- 日タップで小窓 (モーダル) にその日のセッション一覧
- 前月/次月矢印で移動、今日は強調枠
- 表示モード切替: WIREFRAMES §2.2.0 のサマリー行右端にドロップダウン (リスト/カレンダー/年間濃淡)、S7 で操作帯を下に置いたので位置検討要

### S8 でやらないこと
- 年間濃淡 view (S9)
- slide-in 詳細 (S10)

---

## 5. 着手前チェックリスト (コード触る前に応答に内容を埋めて明示)

```
□ 関連設計書を読んだ
  → WIREFRAMES §2.2.2 カレンダー
  → DESIGN_SYSTEM §8.5.7 CalendarGrid (もしあれば、無ければ追加が必要)
  → ROADMAP S8

□ 実行環境の制約を調査した
  → preview port 8080 は ユーザー側 serve.ps1 が掴んでいる可能性、preview 起動失敗時の代替策

□ v3 既存実装を調べた (失敗 1 の教訓)
  → grep -rn "calendar\|月\|MiniCal" v3/ で MiniCalendar 等の既存実装を確認
  → 流用できる helper があれば移植を優先

□ DoD の各項目が serve.ps1 で検証可能か
  → 各 DoD 項目を ○×、× なら別の検証方法を明示

□ ユーザー承認を得た
  → 着手承認のメッセージ
```

---

## 6. S8 完了時の手順 (HANDOFF §6 と同じ)

1. build.ps1 実行、`v4/index.html` 生成確認
2. `grep -rn "S[0-9]\+"` で Stage 番号ずれが無いか確認
3. ユーザー動作確認依頼 (http://localhost:8080/v4/ で F5)
4. 「OK」確認 → 1 commit → push 承認依頼
5. push 完了後、`HANDOFF_v4_S9.md` 作成、本ファイル削除、ROADMAP S8 ✅、APP_VERSION → S8 を 1 commit にまとめて push 承認

---

## 7. S8 で守ること

- **CLAUDE.md 厳守プロトコル全部** (§0 最優先 / §1 着手前チェックリスト / §2 ストップサイン / §3 コミット規律)
- **memory/feedback_*.md 全部** (特に 対処療法禁止 / 判断投げ禁止 / 謝罪規律 / push 確認 / Stage 番号整合)
- **§2.6 失敗 1〜6 の繰り返し禁止**
- **コンポーネント内部定義禁止** (再マウント事故防止、`src/ui/sessions/` トップレベル定義)
- **独自スタイル禁止** (DESIGN_SYSTEM 準拠、独自パディング・独自色禁止)

---

## 8. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル
- **MEMORY.md + feedback_*.md / project_*.md / reference_*.md** — 過去の失敗ルール
- **ROADMAP_v4.md S8** — S8 スコープ全体像
- **WIREFRAMES_v4.md §2.2.2** — カレンダー view 仕様
- **DESIGN_SYSTEM_v4.md §8.5.7** — CalendarGrid (無ければ S8 中に新設)
- **src/ui/sessions/SessionsTab.jsx** — 表示モード切替を統合する相手
- **HANDOFF_v4_S8.md** — 本書
