# HANDOFF v4 — Stage S7 (Sessions 検索・絞り込み) 開始用

作成: 2026-04-21 / 前セッション (S5 UI/UX 再設計 + S6 Sessions リスト基盤実装) 末尾で作成

---

## 0. このファイルの読み方（次セッションの Claude へ）

あなた (新 Claude) が S7 に着手するための **唯一の起点ドキュメント** です。以下を上から順に読み、各セクションの指示を実行してから作業を開始してください。**途中でコードを書き始めてはいけない**（§4 着手前チェックリスト完了まで）。

前セッションの Claude が複数の失敗をして、ユーザーの使用量を無駄にしました。同じ失敗を絶対に繰り返さないため、§1 と §2.3 を特に注意深く読んでください。

---

## 1. セッション開始前: 環境確認（最優先、コード触る前に必ず）

### 1.1 作業ディレクトリの確認

- 現在の working directory が `.claude/worktrees/` の中なら **その場で止まる**。worktree 運用は前セッションの混乱の主因。
- ユーザーに「作業ディレクトリが worktree になっています。メインの `D:\Downloads\Claude\tennis` で作業すべきでしょうか？」と報告し、指示を仰ぐ。ユーザーの許可なく worktree で作業を続けない。

### 1.2 リモート最新状態の取り込み

```
git fetch origin
git status
```

- branch が `main` であること
- 作業ツリーが clean であること (uncommitted changes が無い)
- もし `main` でない or worktree にいるなら、`cd D:\Downloads\Claude\tennis && git checkout main && git pull origin main` でメイン側を最新化してから作業を始める

### 1.3 前セッションの成果物確認

以下を目視確認し、一致しなければリモートが未マージの可能性があるのでユーザーに報告:

- `git log --oneline -6` に以下のコミット/マージが含まれる:
  - `Merge pull request #3` (Stage 番号の整合性修正)
  - `38842aa` Stage 番号の整合性修正
  - `Merge pull request #2` (ROADMAP ✅ マーク)
  - `3a37f0d` ROADMAP ✅ マーク
  - `Merge pull request #1` (S5+S6 本体)
  - `29cbecb` v4 S5+S6: Sessions タブ再設計 + リスト基盤実装
- `HANDOFF_v4_S7.md` が存在（このファイル）
- `src/ui/sessions/` に 6 ファイル: `SessionCard.jsx` / `SessionsTab.jsx` / `SummaryHeader.jsx` / `TimeGroupHeader.jsx` / `FAB.jsx` (+ 古い `LoginScreen.jsx` は `src/ui/` 直下)
- `grep "4.0.0-S" src/core/01_constants.js` で `4.0.0-S6` が出る
- `ROADMAP_v4.md` で S5 行に `🎨 ✅`、S6 行に `✅` マークがある

---

## 2. 前セッション (S5 + S6) の全容

### 2.1 S5: Sessions タブ UI/UX 再設計（デザインのみ、コード無し）

当初 S5 は「v3 Firestore を読むだけの Sessions 一覧」1 Stage の想定だったが、950 件の実データを見てユーザーと議論の末、**Sessions タブを根本から作り直す** ことに。

**新 Sessions タブ 3 モード構成**:
- リストモード（既定）: 時間軸密度可変（週 → 月 → 年）、サマリーヘッダ、結果の階層表現、新カード
- カレンダーモード: 月マス目、活動を色濃度で表示
- 年間濃淡モード: 365 マスで活動密度を一望

**画面幅対応**（レスポンシブ）:
- < 600px（スマホ）: スライドイン詳細 + 戻り経路 4 つ（左端スワイプ / 下部バー / タブ再タップ / Esc）
- 600-1023px（小型タブレット・スマホ横）: スマホ挙動 + カード情報密度アップ
- ≥ 1024px（PC・タブレット横）: 左右分割、「戻る」行為そのものを廃止

**日付統一方針** (v4 全体に影響):
- canonical: `YYYY-MM-DD`
- v3 の古い `YYYY/M/D` は normDate で読み取り時に吸収、編集時（S11）に書き戻して遅延マイグレーション
- S21 の v3 凍結時に残りを一括書き換え

**試打の構造変更**: 試打 (trial) は大会/練習内で行う付随活動と定義。Sessions 一覧には独立カードを出さず、大会/練習カードに「🎾 試打」リンクバッジで示す。本体データは機材タブ (S16) に集約、S20 で自動連関。

**ROADMAP 再編**: 17 → 22 Stage。旧 S5 を S5-S10 の 6 Stage に分解、S20 に自動連関を追加。

**更新した設計書**: ROADMAP_v4.md / WIREFRAMES_v4.md §2.2 / DESIGN_SYSTEM_v4.md §8.5 に 10 コンポーネント仕様追加 / REQUIREMENTS_v4.md F1.4.1 (試合中ゲーム単位記録) / F1.11 (検索・絞り込み) / ARCHITECTURE_v4.md §12.1

**視覚プロトタイプ**: `v4/wireframes.html` §3a-3c + §4 を更新済み

### 2.2 S6: Sessions リスト基盤 実装

新 Sessions タブの「リストモード」部分を実装。検索・絞り込み・カレンダー・年間濃淡・詳細画面は別 Stage。

**新規ファイル** (全て `src/ui/sessions/` 配下):
- `SessionCard.jsx` — 結果階層 (gold/silver/bronze) + 左帯 3px + trialBadge スロット
- `SessionsTab.jsx` — 時間軸密度（未来予定 / 週 / 月 / 年）、日曜始まりカレンダー週、試打リンクバッジ統合
- `SummaryHeader.jsx` — 今月件数 + 直近 10 試合勝敗
- `TimeGroupHeader.jsx` — 週/月/年 3 レベル、sticky、年は折り畳み + localStorage 保持
- `FAB.jsx` — 画面右下の浮かぶ + ボタン（placeholder、中身は S12）

**更新ファイル**:
- `src/app.jsx` — Firestore `onSnapshot` リアルタイム同期（v3/v4 並行運用に必須）、日付正規化、ログアウト確認ダイアログ
- `src/core/01_constants.js` — DESIGN_SYSTEM §1 準拠の色パレット、APP_VERSION "4.0.0-S6"

**ユーザー目視確認済み**: 950 件実データで表示 OK、v3 との realtime 同期 OK。

### 2.3 前セッションで起きた失敗（絶対に繰り返さない）

#### 失敗 1: core の既存ユーティリティを調べず再実装
S6 着手時、日付グループ化のため自前の正規表現 `^(\d{4})-(\d{2})` を書いた。実データは `YYYY/M/D` 形式（スラッシュ、0 パディング無し）で、全件スキップされる 0 件表示バグ。
`core/04_id.js` を先に見れば `normDate` / `fmtDate` / `ds` がある。CLAUDE.md §0.3 を書いた直後に自分で破った。
**対策（S7 でも守る）**: コード書く前に必ず `ls src/core/` → `cat src/core/0*.js` で既存ユーティリティを一巡確認。独自の正規化・ソート・ID 生成を書き始めたら即停止して core をもう一度見る。

#### 失敗 2: ROADMAP 番号変更時の整合チェック漏れ
ROADMAP を 17 → 22 Stage に再編した時、`S5 🎨→` のまま ✅ を付け忘れ、さらに他の文書 (CLAUDE.md §6 / REQUIREMENTS §7.2-7.3 / ARCHITECTURE §11.6/§12.1) + コード (APP_VERSION) の Stage 番号参照を更新し忘れた。
次セッション起動時、Claude が ROADMAP を読んで「S5 まだ終わってない」と誤認。修正に追加 push + PR マージ 2 回を要しユーザーの使用量を無駄遣い。
**対策（S7 でも守る）**: Stage 番号を 1 文字でも変更したら `grep -rn "S[0-9]\+"` で全文書・全コード確認。1 箇所直したら必ず他に類似漏れが無いか同時点検。詳細は `memory/feedback_stage_renumbering.md`。

#### 失敗 3: worktree 運用を勝手に始めた
前セッションの Claude は Claude Code が自動で作った worktree に居た事実を、開始時にユーザーに伝えず作業を進めた。結果、メイン本体と worktree の分離、PR マージが 3 回必要、次セッションが古い worktree から起動して混乱。
**対策（S7 でも守る）**: §1.1 の通り、worktree にいる事実を最初に確認・報告し、メインで作業するか worktree を続けるかをユーザーに選ばせる。無断で workflow を変えない。

#### 失敗 4: 「大丈夫」の軽口
「直しました」「大丈夫」「引き継ぎ準備整いました」等を、grep 等で実証せずに言ってしまう癖。指摘されるたびに類似漏れが見つかり、その度に追加修正 + ユーザー負担。
**対策（S7 でも守る）**: 「大丈夫」「完了」と言う前に、必ず grep / ls / git status で具体的に確認したことを応答内に明示（例: 「grep で全文書を確認、残 0 件」）。口だけで宣言しない。

#### 失敗 5: 断片的な指示
ユーザーに「リンク開いて」「ボタン押して」「再度実行して」と途切れ途切れに依頼し、全体像を先に示さず。ユーザーに orchestration を強いる形になった。
**対策（S7 でも守る）**: 手順が複数ある場合、最初の応答で全手順をまとめて提示。途中で追加依頼が増えたら設計ミスとして自己停止。

---

## 3. S7 の目的: Sessions タブに検索・絞り込み機能を追加

### 3.1 作る（DESIGN_SYSTEM §8.5.1 / §8.5.2 に仕様済み）

1. **SearchBar** (`src/ui/sessions/SearchBar.jsx`) — タイトル・会場・対戦相手・メモを横断テキスト検索
2. **FilterChip** (`src/ui/sessions/FilterChip.jsx`) — 複数同時掛け可
3. **FilterDrawer** (`src/ui/sessions/FilterDrawer.jsx`) — チップタップで画面下から候補選択シート
4. SessionsTab.jsx に検索・絞り込みを統合
5. SummaryHeader.jsx に絞り込み中表示対応
6. 検索・絞り込み状態を localStorage で保存

### 3.2 絞り込み軸

- 種類: 大会 / 練習（試打は独立カード廃止なので選択肢なし）
- ラケット: 既存データから動的に候補抽出
- 対戦相手: 既存データから動的に候補抽出
- 結果: 優勝 / 準優勝 / 3位 / ベスト8 / ベスト16 / 予選突破 / 敗退 / 予選敗退

### 3.3 検索ロジック

- 部分一致、大小英字無視
- 対象: tournament.name / venue / generalNote / matches[].opponent/opponentNote/mentalNote/note / practice.title/venue/coachNote/goodNote/improveNote/generalNote
- 検索と絞り込みチップは AND
- 同一チップ内の複数値は OR (例: ラケット A or B)

### 3.4 S7 でやらないこと（別 Stage）

- 表示モード切替（リスト/カレンダー/年間濃淡）: S8/S9
- カレンダー view: S8
- 年間濃淡 view: S9
- slide-in 詳細画面 + 左右分割: S10
- FAB の中身 (QuickAdd): S12
- 試合中ゲーム単位記録 UX: S11 前提要件

---

## 4. 着手前チェックリスト（コード触る前に応答に中身を埋めて明示）

```
□ 関連設計書を読んだ
  → DESIGN_SYSTEM §8.5.1 SearchBar / §8.5.2 FilterChip の仕様
  → WIREFRAMES §2.2.0 共通操作帯のレイアウト
  → REQUIREMENTS F1.11 の要件

□ 実行環境の制約を調査した
  → preview (file://) では Firebase Auth 不可、検証は serve.ps1 経由
  → filter state の localStorage キーを既存と衝突しない名前で（"v4-sessions-*" プレフィックスで統一）

□ core と既存ヘルパーを一巡確認した
  → src/core/04_id.js の normDate/fmtDate/ds 使用
  → v3 に normalizeVenue 類似関数があるか確認、あれば core に持ち上げ、無ければ新設
  → 類似関数を独自に書き始めたら即停止して再調査

□ DoD の各項目が preview / serve.ps1 で検証可能か
  → 検索、絞り込み、localStorage 復元、全て serve.ps1 経由で serve 可能

□ ユーザー承認を得た
  → HANDOFF_v4_S7.md の受領と S7 着手の了承
```

書き出した内容が形式的・空ならその時点で自己停止、ユーザー報告。

---

## 5. 実装手順

1. **SearchBar.jsx** 新規 — 入力 controlled component、左端 search アイコン、clear ボタン
2. **FilterChip.jsx** 新規 — 選択/非選択状態、クリアボタン付き、pill 形
3. **FilterDrawer.jsx** 新規 — 画面下から上がるシート、候補リスト、複数選択 or 単一選択
4. **SessionsTab.jsx** に統合
   - 上部操作帯: SearchBar + FilterChip を横スクロール配置
   - 絞り込み state と allItems の useMemo 内でフィルタ適用
   - localStorage キー: `v4-sessions-search` / `v4-sessions-filters`
5. **SummaryHeader.jsx** 更新 — 絞り込み中なら「絞り込み結果: N 件 / 全 M 件」表示
6. 空月・空週を間引き表示（絞り込み結果が 0 件の月の見出しを出さない）

---

## 6. S7 完了時の手順

1. build.ps1 実行、`v4/index.html` 生成確認
2. 念のため `grep -rn "S[0-9]\+"` で新しい Stage 番号ずれが無いか確認
3. serve.ps1 経由でユーザー動作確認依頼
4. 「S7 OK」確認 → 1 コミット → push 承認依頼
5. ユーザーが PR マージ
6. `HANDOFF_v4_S8.md` 作成（S8 = カレンダー view）
7. 本ファイル (`HANDOFF_v4_S7.md`) を削除
8. ROADMAP の S7 行に `✅` 追加、APP_VERSION を S7 に更新
9. 上記 7-8 を 1 コミットにまとめて push 承認

---

## 7. S7 で守ること（CLAUDE.md 厳守プロトコル + 前セッション教訓）

- **コンポーネント内部定義禁止** (再マウント事故防止、`src/ui/sessions/` にトップレベル定義)
- **独自スタイル禁止** (DESIGN_SYSTEM §8.5 準拠、独自パディング・独自色・独自フォントサイズ禁止)
- **core を先に調べる** (§2.3 失敗 1 の教訓)
- **Stage 番号変更時は grep 確認** (§2.3 失敗 2 の教訓)
- **workflow 変更は事前報告** (§2.3 失敗 3 の教訓)
- **「大丈夫」は grep/ls/git status で実証してから言う** (§2.3 失敗 4 の教訓)
- **手順は最初の応答でまとめて提示、途中で追加依頼しない** (§2.3 失敗 5 の教訓)
- **判断投げ禁止** (「A/B どちら?」ではなく「A にします、違えば指示ください」)
- **ユーザー連絡はコード類と視覚的に切り離す** (memory/feedback_update_announcement.md)
- **コミット粒度**: 1 コミット = 1 push、小刻み patch 禁止、push 前にユーザー明示承認

---

## 8. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル（最優先）
- **MEMORY.md + feedback_*.md / reference_*.md / project_*.md** — 過去の失敗から学んだルール、特に:
  - `feedback_stage_renumbering.md` — Stage 番号変更時の整合チェック
  - `feedback_update_announcement.md` — 重要連絡はコード類と切り離す
  - `reference_datatennis.md` — DataTennis と TennisDB の役割分担
- **DESIGN_SYSTEM_v4.md §8.5.1 / §8.5.2** — SearchBar / FilterChip 仕様
- **WIREFRAMES_v4.md §2.2.0** — 共通操作帯レイアウト
- **ROADMAP_v4.md S7** — S7 のスコープ、および 22 Stage 全体像
- **REQUIREMENTS_v4.md F1.11** — 検索・絞り込みの要件
- **src/ui/sessions/SessionsTab.jsx** — 検索・絞り込みロジックを統合する相手
- **src/ui/sessions/SummaryHeader.jsx** — 絞り込み中表示対応
- **HANDOFF_v4_S7.md** — 本書
