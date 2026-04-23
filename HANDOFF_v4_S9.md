# HANDOFF v4 — Stage S9 (Sessions 年間濃淡 view) 開始用

作成: 2026-04-23 / S8 完了 (commit [e40ea7b](https://github.com/grooveworks/tennis-db/commit/e40ea7b)) + S8.5 清掃 (commit [4573d07](https://github.com/grooveworks/tennis-db/commit/4573d07)) 末尾で作成

---

## 0. このファイルの読み方

S9 に着手する Claude が最初に読む唯一の起点。上から順に読み、§6 着手前チェックリスト完了まで実装に手を付けないこと。

前任セッション (S8 実装 + S8.5 清掃) では以下を守って進められた:
- 案 A/B 提示時の「ユーザーに投げる」を避け、推奨を明示してから確認する形で合意形成
- コード実装前に視覚プロトタイプ (preview_s8.html / preview_s8_5.html) を作り、**デザイナー視点のユーザーに見せてから実装**
- HANDOFF §3 の残課題 (練習バッジ / 長 title / 試打 / flat design) について、**実データで裏取り**してから対処優先度を提案 → S8.5 として即座に片付け

S9 でも同じ運びを守ること。特に **§7 の最優先ルール**と **§2 の S8 で学んだこと**を読み飛ばさない。

---

## 1. セッション開始前: 環境確認

### 1.1 作業ディレクトリ
`pwd` で `.claude/worktrees/` 配下なら即停止。`cd D:\Downloads\Claude\tennis` で main 本体に移動。main 直接コミット運用。

### 1.2 リモート最新化
```
git fetch origin
git status
git pull origin main
```
- branch が `main`、作業ツリー clean (S8/S8.5 の変更は既 push)、origin と同期

### 1.3 S8 + S8.5 成果物の存在確認
- `git log --oneline -6` に以下が見える:
  - `4573d07` v4 S8.5: Sessions リスト仕上げ
  - `e40ea7b` v4 S8: Sessions カレンダー view + 表示モード切替
- `src/ui/sessions/` に 12 ファイル (S7 の 8 + S8 の新 4):
  - FAB.jsx / FilterChip.jsx / FilterDrawer.jsx / SearchBar.jsx / SessionCard.jsx / SessionsTab.jsx / SummaryHeader.jsx / TimeGroupHeader.jsx
  - **CalendarView.jsx / CalendarDayCell.jsx / DayPanel.jsx / ViewModeSwitcher.jsx** ← S9 で再利用・拡張する対象
- `grep "4.0.0-S" src/core/01_constants.js` で `4.0.0-S8.5` 表示
- `ROADMAP_v4.md` で S8 行に `✅` マーク
- `HANDOFF_v4_S9.md` 存在 (このファイル)
- `HANDOFF_v4_S8.md` 削除済み

### 1.4 preview port 8080
- ユーザー側 `serve.ps1` が 8080 を掴んでいる可能性高
- Claude の preview_start はおそらく失敗 → 検証はユーザーの F5 経由 (HANDOFF §8 手順 3)
- preview_s8.html / preview_s8_5.html は planning 時の視覚モック。untracked のまま残る。削除しない (S9 作業中の参考になる)。

---

## 2. 前セッション (S8 + S8.5) で実装したこと

### 2.1 S8: Sessions カレンダー view + 表示モード切替 (本筋)
- `ViewModeSwitcher.jsx`: SummaryHeader 右端のトグル (リスト / カレンダー)
- `CalendarView.jsx`: 月マス本体。日曜始まり。前月/次月ナビ、当月以外に [今日] バッジ
- `CalendarDayCell.jsx`: 1 マス描画
  - 大会日 = `tournamentLight` 全面塗 + 右上 `trophy` アイコン (14px)
  - 練習日 = 合計分で 3 段階濃淡 (<30=Light / 30-60=Mid / >60=Accent)
  - 大会+練習 = 大会塗り優先 + 下部緑点、試打 = 下部紫点
  - 今日 = 2px primary 枠、選択中 = 外周 primary リング + 軽い影 (両立可)
- `DayPanel.jsx`: CalendarGrid 直下の選択日詳細パネル (下部パネル方式・B 版)
  - max-height 220px、3 件超は内部スクロール
  - ミニ行 = 4px 種類帯 + タイトル + meta + 結果バッジ + chevron
  - ミニ行タップは `onCardClick` で親に委譲 (S10 で詳細画面接続)
- SessionsTab.jsx: mode 切替ロジック + CalendarView 統合 + localStorage 永続化 (`v4-sessions-viewmode`)
- DESIGN_SYSTEM §1.2 に `practiceMid` (#b7e1c9) 追加、§8.5.7 / §8.5.7.1 を B 版で書換
- WIREFRAMES §2.2.2 更新 (B 版レイアウト確定)

### 2.2 S8.5: 取り残し清掃 (S5〜S7 由来の 4 課題のうち 3 つを即修正)
- **課題 1 (練習バッジ抑制)**: `_mapPracticeType` でマップ未登録 type を null 返却。v2 Apple Watch import 由来の generic "練習" バッジが消え、左の 3px 緑帯のみに (情報重複解消)
- **課題 2 (長 title 省略)**: SessionCard タイトル行に `-webkit-line-clamp: 2` + ellipsis + word-break。GCal 経由の装飾付き長文 (◎♪★ 入り) でカード壁化を防ぐ。全文は S10 詳細画面で見る前提。
- **課題 4 (優勝カードのフラット統一)**: SessionCard の `HIGHLIGHT_STYLES.gold` から shadow を撤去。DESIGN_SYSTEM §181「シャドウなし」方針と矛盾していた箇所を整合。強調は tinted bg + 1.5px border + font-weight 700 のみ。
- DESIGN_SYSTEM §0 に「フラットデザイン」原則を**明示追記**。前任セッションで Google 参考指示だったため暗黙化していた方針を明文化。
- §8.5.5 も S8.5 仕様を反映 (line-clamp / gold shadow 撤去 / 未登録 type 抑制)

### 2.3 S8 で残った課題 3 (試打バッジ過剰問題) は凍結
- 現データ: 試打 15 件すべて孤立 (linkedMatchId / linkedPracticeId 空)、バッジ表示数 0
- 過剰問題は「S20 自動連関後、かつ試打集中期」の予測リスク。現状発生ゼロ
- HANDOFF 原文通り S20 で全体方針確定予定。**S9 で触らない**。

### 2.4 S8 で得た学び (S9 でも守る)
#### 学び 1: 視覚プロトタイプ先行が効く
複雑な UX (モーダル vs 下部パネル) を文章で説明しても元デザイナーのユーザーは判断しづらい。**HTML プロトタイプで見せる** 形にした瞬間に A/B 判断が速く正確になった。S9 の年間ヒートマップも 365 マスをどう描くかは視覚で提案する。

#### 学び 2: データ裏取りの意義
HANDOFF §3 の 4 課題について、**ローカル JSON export で実数を数えて**から優先度を提案したことで、ユーザーから「v2/v3 からの経緯」の情報が引き出せた。結果、課題 3 凍結 / 課題 4 (フラット明示化) 等の判断が正確になった。**HANDOFF に書かれている「問題」は鵜呑みにせず数える**。

#### 学び 3: 判断点の提示は「こうします。違えば指示ください」形式
案 A/B/C を並べたあと、**私の推奨 (A)** を明示して確認を取る形式が効率的。A でユーザー同意、2 で視覚確認、3 で「OK」の流れがスムーズ。

#### 学び 4: sub-stage (S8.5) 運用は有効
S5〜S7 の積み残し (4 課題) を S9 に持ち越さず、S8 完了直後に S8.5 として即座に清掃できた。**発生が確定している課題は当該 Stage のスコープ外でも即片付ける**。ただし予測リスク段階の課題は該当 Stage まで待つ (課題 3 = S20)。

---

## 3. S9 の目的: Sessions 年間濃淡 view 実装

ROADMAP S9: 「365 マスで年の活動密度を一望、年切替」

WIREFRAMES §2.2.3 / DESIGN_SYSTEM §8.5.8 に仕様あり。要旨:

### 3.1 ヒートマップ本体
- 縦 12 行 (1〜12 月) × 横 31 列 (1〜31 日) の密なグリッド
- 1 マス 10×10px、間隔 2px
- 合計サイズ: 横 31×10 + 30×2 = **370px**、縦 12×10 + 11×2 = **142px** (mobile 375 幅にぴったり収まる)
- 横軸ヘッダ: `1, 5, 10, 15, 20, 25, 30` (日)
- 縦軸ヘッダ: `1月, 2月, ..., 12月`
- GitHub のコントリビューション風、スランプの空白と集中期が一目で伝わる

### 3.2 マス塗り分け (DESIGN_SYSTEM §8.5.8)
| 状態 | 塗り |
|---|---|
| その月に無い日 (例: 2月 30, 31 / 4月 31) | 透明 |
| 活動無し | `panel2` (#f1f3f4) |
| 活動 1 種類 (練習のみ) | `practiceLight` → `practiceMid` → `practiceAccent` (3 段階、S8 と同じ分単位しきい値) |
| 活動 2 種類以上 | 主活動 (大会優先) の色で表示、強度は最大で |
| 大会日 | `tournamentAccent`、枠 1px で強調 |
| 今日 | 枠 1.5px `primary` |
| 選択中 | (S8 CalendarView の仕様を踏襲) 外周 `primary` リング |

### 3.3 日タップ → DayPanel (下部パネル、B 版統一)
- DESIGN_SYSTEM §8.5.8 には「日一覧モーダル」と書かれているが、**S8 で A→B 版に変更済み**のため、**S9 でも DayPanel を再利用する**。モーダル案を採らない。
- ミニ行構造は S8 と同一 (DayPanel コンポーネントをそのまま使える)

### 3.4 年切替
- 前年 / 次年の矢印ナビ (CalendarView と同じパターン)
- 現年以外を表示中は [今年] バッジで戻せる
- WIREFRAMES §2.2.3「過去 3 年分を比較可能」はナビで過去年に飛べる形で満たす

### 3.5 モード切替トグル拡張 (ViewModeSwitcher)
- 現状: list / calendar の 2 値
- S9 で **year** を追加 → 3 値: list / calendar / year
- アイコン: `calendar-range` か `bar-chart-4` 等の「年スケール」を示すもの (Lucide で候補調査)
- `localStorage v4-sessions-viewmode` の値も `year` を許容

### 3.6 S9 でやらないこと
- 詳細画面 slide-in (S10)
- 年間比較ビュー (複数年を並列) は「過去 3 年分を比較」をナビで満たすので特別 UI は不要
- 試打バッジ再設計 (S20)

---

## 4. 実装ファイル構成 (推奨)

### 4.1 新規ファイル (`src/ui/sessions/`)
- `YearHeatmap.jsx` — 年間ヒートマップ本体 (ヘッダ + グリッド + DayPanel 呼び出し)
- `YearHeatmapCell.jsx` — 1 マス描画 (10×10px、色決定ロジック)

### 4.2 更新ファイル
- `src/ui/sessions/ViewModeSwitcher.jsx` — 3 ボタン化 (list / calendar / year)
- `src/ui/sessions/SessionsTab.jsx` — viewMode === "year" 分岐追加、YearHeatmap マウント
- `DESIGN_SYSTEM_v4.md` §8.5.8 — 実装確定後の詳細に書換
- `WIREFRAMES_v4.md` §2.2.3 — ヒートマップ確定仕様
- `ROADMAP_v4.md` S9 に ✅
- `src/core/01_constants.js` — APP_VERSION → `4.0.0-S9`

### 4.3 再利用するもの (そのまま)
- `DayPanel.jsx` — 日タップ時のパネル (S8 と同一仕様で OK)
- `C.practiceLight / practiceMid / practiceAccent / tournamentAccent / primary` — S8 で定義済み

---

## 5. 視覚プロトタイプを先に作ることを推奨 (学び 1)

実装前に `preview_s9.html` を作り、以下を見せてから「実装 OK」を得ること。

**見せる 3 パターン** (S8 preview と同じ形式):
1. 未選択 (年間ヒートマップ単体、月ヘッダ + 日ヘッダ + 365 マス + 年ナビ)
2. 日選択 (例: 4/18 をタップ、下部 DayPanel に当日セッション)
3. 疎密パターンの演出 (1〜3 月スランプ=空白 / 4〜6 月 集中期 / 7〜9 月 大会密 等、一目で「この年の波」が伝わるか確認用)

**判断点として並べる項目** (S8 で効いた形式):
- ① 縦 12 月 × 横 31 日 の配列で密度感が出るか (対抗案: GitHub 風の縦 7 曜日 × 横 52 週)
- ② 今日マーク + 選択マークの区別
- ③ 年ナビの置き場所 (月ヘッダの上? 下?)
- ④ マスが 10×10 で十分タップしやすいか (指 + 44px ルールに違反するので、タップ領域は padding 込みで確保 or マス拡大検討)
- ⑤ モード切替アイコン (`calendar-range` など、Lucide 候補)

**④が要注意**: 10×10px は視覚サイズ、タップ可能領域は周辺の padding で 44px 確保するか、**小さいマスは視覚的指針のみでタップ無効、日の選択は別導線**のいずれかを選ぶ必要あり。モック段階で決める。

---

## 6. 着手前チェックリスト (コード触る前に応答に内容を埋めて明示)

```
□ 関連設計書を読んだ
  → WIREFRAMES §2.2.3 の要点 3 行
  → DESIGN_SYSTEM §8.5.8 の要点 3 行
  → ROADMAP S9 の要点

□ 実行環境の制約を調査した
  → preview port 8080 は serve.ps1 占有、ユーザー F5 検証
  → mobile 375 幅で 370px ヒートマップが収まるか実機確認手段
  → 10×10 マスでタップ領域 44px ルール違反に対する対処方針

□ v3/v2 既存実装を調べた (学び 2)
  → grep -rn "heatmap\|contribution\|年間" v3/ で既存実装の有無
  → 無ければ新規実装、あれば流用可能部位を特定

□ DoD の各項目が serve.ps1 + F5 で検証可能か
  → 365 マス描画 / 色塗り分け / 日タップ → DayPanel / 年ナビ / mode 切替 3 値 / localStorage 復元

□ 視覚プロトタイプで合意取った (学び 1)
  → preview_s9.html 作成 → ユーザー「OK」受領

□ ユーザー承認を得た
  → 着手承認のメッセージ
```

---

## 7. S9 で守ること (CLAUDE.md + S8 の学び)

### 7.1 CLAUDE.md 厳守プロトコル (全部)
- §0 最優先: 対処療法禁止 / 判断投げ禁止 / 事前調査 / UI/UX 先行 / 謝罪単独 / 平易な言葉
- §1 着手前チェックリストの中身埋め
- §2 ストップサイン
- §3 コミット規律 (1 タスク = 1 push、push 前に明示的承認)

### 7.2 memory/feedback_*.md 全部
- バージョニング / push 確認 / 作業品質 / コミット粒度 / 対処療法禁止 / 判断投げ禁止 / 環境調査 / UI/UX 先行 / 謝罪規律 / 平易言語 / Stage 番号整合

### 7.3 S8 の学びを継続
- **学び 1**: 複雑 UX は視覚プロトタイプを先に出す (§5)
- **学び 2**: HANDOFF の「問題」は鵜呑みにせず実データで数える
- **学び 3**: 判断は A/B 並べるだけでなく「推奨 A です」と提示
- **学び 4**: 積み残しは次 Stage に持ち越さず sub-stage で片付ける

### 7.4 コンポーネント内部定義禁止 (S6 で確立)
`function Xxx` はトップレベル定義のみ。YearHeatmap 内で sub-component 定義しない。

### 7.5 独自スタイル禁止
DESIGN_SYSTEM 準拠。独自色 / padding / shadow を追加したくなったら**先に DESIGN_SYSTEM に追記してから使う**。特に S8.5 で **shadow は使わない方針**が明示化されたので、年間ヒートマップでも影を足さない。

---

## 8. S9 完了時の手順

1. `build.ps1` 実行、`v4/index.html` 生成確認
2. `grep -rn "S[0-9]\+"` で Stage 番号ずれが無いか確認
3. ユーザー動作確認依頼 (http://localhost:8080/v4/ で F5)
4. 「OK」確認 → 1 commit → push 承認依頼
5. push 完了後、`HANDOFF_v4_S10.md` 作成 + `HANDOFF_v4_S9.md` 削除 + ROADMAP S9 ✅ + APP_VERSION → S9 を 1 commit にまとめて push 承認
6. S10 (Session 詳細 slide-in) への引き継ぎメッセージ

---

## 9. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル
- **MEMORY.md + feedback_*.md / project_*.md / reference_*.md** — 過去の失敗ルール
- **ROADMAP_v4.md S9** — S9 スコープ全体像 (S8 ✅, S9 未チェック, S10 次)
- **WIREFRAMES_v4.md §2.2.3** — 年間ヒートマップ仕様
- **DESIGN_SYSTEM_v4.md §0** — フラットデザイン原則 (S8.5 で明示化)
- **DESIGN_SYSTEM_v4.md §8.5.8** — YearHeatmap 属性表
- **DESIGN_SYSTEM_v4.md §8.5.7.1** — DayPanel 仕様 (S9 で再利用)
- **src/ui/sessions/CalendarView.jsx** — 月切替ナビの実装参考
- **src/ui/sessions/DayPanel.jsx** — 年間ヒートマップの日タップでもそのまま使う
- **src/ui/sessions/ViewModeSwitcher.jsx** — 3 値化の対象
- **preview_s8.html / preview_s8_5.html** — planning 時の視覚モック (untracked、参考用)
- **HANDOFF_v4_S9.md** — 本書

---

## 10. 次 Stage (S10) 前提メモ

S10 は「Session 詳細 slide-in 画面」。S9 完了時点で以下の導線が全部 S10 を呼ぶようになる:
- SessionCard (list mode) の onClick
- CalendarDayCell の DayPanel 経由 (ミニ行の chevron タップ)
- YearHeatmapCell の DayPanel 経由 (同上)

つまり **S10 で DayPanel ミニ行の onClick を slide-in 詳細画面起動に繋ぐ** ことになる。S9 実装時点で `onCardClick` の呼び出し契約は既に確立済みなので、S10 は呼び出し先の詳細画面を作るだけ。S9 で余計な詳細画面 UI を先取りしない。
