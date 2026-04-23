# HANDOFF v4 — Stage S10 (Session 詳細 slide-in) 開始用

作成: 2026-04-24 / S9 完了時に作成 / 前提: CLAUDE.md / REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md / DESIGN_SYSTEM_v4.md / WIREFRAMES_v4.md

---

## 0. このファイルの読み方

S10 に着手する Claude が最初に読む唯一の起点。上から順に読み、§5 着手前チェックリスト完了まで実装に手を付けないこと。

S9 (年間俯瞰 view) では以下が大きな反省として残った:
- プロトタイプ段階で設計破綻を見抜けず、365 マス案のまま実装に進んで再設計を余儀なくされた
- パネル高の微調整で Edit を 6 回繰り返す対処療法を続けた
- 勝手に APP_VERSION / ROADMAP ✅ / 設計書 を「完了扱い」に先取り更新した
- 謝罪を形骸化させた

S10 でも以下は繰り返さない:
- 着手前にプロトタイプで視覚確認、判断を上流に揃える
- 同一ファイル 3 回目の Edit で一度止まる (CLAUDE.md §2.1)
- Stage 完了の「完了扱い」はユーザー承認後に限定
- 謝罪はミス発生時に単独で行う (CLAUDE.md §0.5)

---

## 1. セッション開始前: 環境確認

### 1.1 作業ディレクトリ
`pwd` で main 本体にいるか確認。worktree 配下ならmain に戻る。main 直接コミット運用。

### 1.2 リモート最新化
```
git fetch origin
git status
git pull origin main
```
- branch が `main`、作業ツリー clean、origin と同期

### 1.3 S9 成果物の存在確認
- `git log --oneline -6` に S9 の commit が見える
- `src/ui/sessions/` に以下のファイル (S9 で新規/書き直し):
  - **WeekPanel.jsx** (新規、週単位セッション一覧パネル)
  - **YearHeatmap.jsx** (週ヒートマップ本体)
  - **YearHeatmapCell.jsx** (1 週セル)
- `grep "4.0.0-S" src/core/01_constants.js` で `4.0.0-S9` 表示
- `ROADMAP_v4.md` S9 行に ✅
- HANDOFF_v4_S10.md 存在 (このファイル) / HANDOFF_v4_S9.md 削除済み

### 1.4 preview port 8080
- ユーザー側 `serve.ps1` が 8080 占有
- Claude の preview_start は使わない (失敗する / プロジェクトは serve.ps1 運用)
- 検証はユーザーの F5 経由

---

## 2. S9 で到達したもの (S10 の前提)

### 2.1 3 モード揃った Sessions タブ
- **list mode** (S6-S7): 時間軸密度リスト + 検索/絞り込み
- **calendar mode** (S8): 月マス + 色濃度 + 日タップ → DayPanel
- **year mode** (S9): 週ヒートマップ (12 月 × 5 週) + 週タップ → WeekPanel
- `ViewModeSwitcher` で 3 値切替、`v4-sessions-viewmode` で永続化

### 2.2 「カードタップ → 詳細画面」の導線が全 mode から確立
S9 時点で `onCardClick(type, item)` が全 mode から呼ばれる状態:
- list mode: `SessionCard` の onClick
- calendar mode: `DayPanel` ミニ行 (S8 DayPanel.jsx)
- year mode: `WeekPanel` ミニ行 (S9 WeekPanel.jsx)

**S10 の仕事**: この `onCardClick` を「画面幅スライドイン詳細画面」に接続し、リストや heatmap の状態を壊さず遷移 → 戻りでスクロール位置復元する。

### 2.3 読み取り専用
S9 までは全て読み取り。編集は S11、追加は S12、削除は S13。S10 も読み取りのみ (詳細表示)。

---

## 3. S10 の目的: Session 詳細画面 (slide-in)

ROADMAP S10: 「カードタップで画面遷移、リスト崩れない、戻りでスクロール位置復元」

WIREFRAMES §2.3 / DESIGN_SYSTEM §8.5.10 に仕様あり。要旨:

### 3.1 遷移
- カード/ミニ行タップ → 右から左にスライドイン (全画面)、TabBar も覆う
- 戻るボタン or スワイプ or Esc で閉じる → スライドアウト
- transform: `translateX(100% → 0%)` enter 250ms / exit 200ms, cubic-bezier(0.4, 0, 0.2, 1)

### 3.2 詳細画面の内容 (大会/練習/試打で異なる)
- **ヘッダ**: 戻るボタン + タイトル + 編集ボタン (S11 で接続)
- **大会**: 日付・種類・結果・場所・ラケット・気温・大会メモ・試合一覧 (match 行複数)
- **練習**: 日付・会場・時間・心拍・タイトル・メモ類
- **試打**: 日付・ラケット構成・判定・リンク先 (大会/練習)
- **関連セッション** (S20 後): 直前の練習リスト・同ラケット大会など

### 3.3 状態復元
- 戻り時、元モードの state (list スクロール位置 / calendar 選択日 / year 選択週) を正確に復元
- 複数戻り経路 (スワイプ / 戻るボタン / Esc / TabBar タップ) のどれでも復元

### 3.4 S10 でやらないこと
- 編集 (S11)
- 追加 (S12)
- 削除 (S13)
- 関連セッション自動検出 (S20)

---

## 4. 実装ファイル構成 (推奨)

### 4.1 新規ファイル (`src/ui/sessions/`)
- `SessionDetailView.jsx` — スライドイン本体 (全画面オーバーレイ、戻る導線、animation)
- `TournamentDetail.jsx` — 大会詳細表示 (match 行含む)
- `PracticeDetail.jsx` — 練習詳細表示
- `TrialDetail.jsx` — 試打詳細表示 (リンク先表示)

### 4.2 更新ファイル
- `src/ui/sessions/SessionsTab.jsx` — `onCardClick` を SessionDetailView 開閉に接続、state 保存
- `src/app.jsx` — 詳細画面 state をトップレベルで管理 (タブ切替で閉じる挙動)
- `DESIGN_SYSTEM_v4.md` §8.5.10 — 実装確定後に詳細記述 (ただし**完了するまで書き換えない**)
- `WIREFRAMES_v4.md` §2.3 — 同上
- `src/core/01_constants.js` — APP_VERSION → `4.0.0-S10` (**完了時のみ**)

### 4.3 再利用するもの
- 既存 SCHEMA (`src/core/05_schema.js`) の DISPLAY_FIELDS
- Icon / Badge / Card などの共通 UI
- DayPanel / WeekPanel のミニ行デザイン (slot 内は同じタップ挙動)

---

## 5. 着手前チェックリスト (コード触る前に応答に内容を埋めて明示)

```
□ 関連設計書を読んだ
  → WIREFRAMES §2.3 の要点 3 行
  → DESIGN_SYSTEM §8.5.10 の要点 3 行
  → ROADMAP S10 の要点

□ 実行環境の制約を調査した
  → preview port 8080 は serve.ps1 占有、ユーザー F5 検証
  → React 18 で translate animation の挙動、prefers-reduced-motion 対応
  → mobile/desktop でのスライド方向 (mobile = X 軸スライド、desktop は ROADMAP §4 で「左右分割」検討あるが S10 では mobile 挙動のみ実装)

□ v3 既存実装を調べた
  → v3 の SessionCard 展開 (accordion) 挙動、v3 から採らない方針は決定済 (ROADMAP 2026-04-21 再スコープ)
  → v3 Sessions tab の詳細表示ロジックから流用できる部分を grep

□ DoD の各項目が serve.ps1 + F5 で検証可能か
  → スライドイン開閉 ○ / 大会/練習/試打 各詳細 ○ / 戻り時の状態復元 ○ / tab 切替時の閉じる挙動 ○ / Esc ○

□ 視覚プロトタイプで合意取った (学び: S9 で破綻した教訓)
  → preview_s10.html 作成 → ユーザー「OK」受領

□ ユーザー承認を得た
  → 着手承認のメッセージ
```

---

## 6. S10 で守ること (CLAUDE.md + S9 の学び)

### 6.1 CLAUDE.md 厳守プロトコル (全部)
- §0 最優先: 対処療法禁止 / 判断投げ禁止 / 事前調査 / UI/UX 先行 / 謝罪単独 / 平易な言葉
- §1 着手前チェックリスト中身埋め
- §2 ストップサイン (**特に §2.1 同一ファイル 3 回目の Edit**)
- §3 コミット規律 (1 タスク = 1 push、push 前に明示的承認)

### 6.2 S9 の反省を継続
- プロトタイプで物理的に破綻しないかを実寸で確認してから実装着手
- 謝罪はミス発覚時に単独で、対応に混ぜない
- 「完了扱い」(APP_VERSION 更新 / ROADMAP ✅ / 設計書の「実装確定」書き換え) はユーザー承認後のみ
- 同じ質のミスを重ねたら止まって、対処療法でなく根本設計に戻る

### 6.3 コンポーネント内部定義禁止 (S6 で確立)
`function Xxx` はトップレベル定義のみ。SessionDetailView 内で sub-component 定義しない。

### 6.4 独自スタイル禁止
DESIGN_SYSTEM 準拠。独自色 / padding / shadow を追加したくなったら先に DESIGN_SYSTEM に追記してから使う。S8.5 の「shadow 不使用、フラットデザイン」原則 (§0) は継続。

---

## 7. S10 完了時の手順

1. `build.ps1` 実行、`v4/index.html` 生成確認
2. `grep -rn "S[0-9]\+"` で Stage 番号ずれが無いか確認
3. ユーザー動作確認依頼 (serve.ps1 + F5)
4. 「OK」確認 → **1 commit にまとめて** push 承認依頼 (コード + 設計書 + v4 + HANDOFF 更新まで)
5. push 完了後、`HANDOFF_v4_S11.md` 作成 + 本ファイル (S10) 削除 + ROADMAP S10 ✅ + APP_VERSION → S10
6. S11 (Session 編集画面) への引き継ぎメッセージ

---

## 8. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル
- **MEMORY.md + feedback_*.md / project_*.md / reference_*.md** — 過去の失敗ルール
- **ROADMAP_v4.md S10** — S10 スコープ全体像 (S9 ✅, S10 未チェック, S11 次)
- **WIREFRAMES_v4.md §2.3** — Session 詳細画面 仕様
- **DESIGN_SYSTEM_v4.md §8.5.10** — SessionDetailView 属性表
- **src/ui/sessions/SessionCard.jsx / DayPanel.jsx / WeekPanel.jsx** — 遷移元 (onCardClick を呼ぶ側)
- **src/ui/sessions/SessionsTab.jsx** — state 管理、onCardClick 接続先
- **HANDOFF_v4_S10.md** — 本書

---

## 9. 次 Stage (S11) 前提メモ

S11 は「Session 編集画面 (全画面)」。詳細画面 (S10) から「編集」ボタンで遷移する形。S10 の SessionDetailView が画面幅ベースでの遷移を確立するので、S11 はこれを踏襲した編集専用画面を作る (SCHEMA 駆動のフィールド生成)。S10 完了時点で編集への動線を SessionDetailView ヘッダの「編集」ボタンとして配置 (実装は S11、S10 では placeholder toast)。
