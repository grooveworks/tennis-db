# HANDOFF v4 — Stage S7 (Sessions 検索・絞り込み) 開始用

作成: 2026-04-21 / 前セッション (S5 設計 + S6 リスト実装) 末尾で作成

> **次セッション最初にやること**: このファイル + CLAUDE.md + DESIGN_SYSTEM_v4.md + WIREFRAMES_v4.md + ROADMAP_v4.md を読み、着手前チェックリストを応答に書き出してから着手。

---

## 0. 前セッション (S5+S6) の結果

### 完了事項

**S5 (Sessions タブ UI/UX 再設計)**
- 旧 S5 (Sessions 一覧 読むだけ) を、実装中のユーザー議論で大幅に再スコープ
- 当初の「フラットリスト + 月グループ」では 950 件のデータを探索できない、v3 の延長にしかならないと判断
- 新 Sessions タブ: 3 モード (リスト / カレンダー / 年間濃淡) + 検索 + 複数軸絞り込み + FAB + 画面幅対応 (スマホはスライドイン＋戻り経路 4 つ / PC・タブレット横は左右分割)
- ROADMAP を組み直し: 旧 S5 1 つを S5-S10 の 6 Stage に分解、全体を S21 まで拡張
- 日付統一方針を決定: v4 canonical は YYYY-MM-DD、v3 の古い YYYY/M/D は触った時に書き戻し (遅延マイグレーション)
- 画面幅対応方針: < 600px / 600-1023px / ≥ 1024px の 3 段階
- 設計書を全部更新: ROADMAP_v4.md / WIREFRAMES_v4.md / DESIGN_SYSTEM_v4.md §8.5 (10 コンポーネント仕様追加) / REQUIREMENTS_v4.md (F1.4.1 試合中ゲーム単位記録、F1.11 検索・絞り込み)
- wireframes.html を更新: 3 モード + 詳細画面 + 365 マス年間濃淡を視覚化

**S6 (Sessions リスト基盤 実装)**
- `src/ui/sessions/SessionCard.jsx` 刷新 (結果階層 gold/silver/bronze、C 定数使用、fmtDate 使用、trialBadge スロット追加)
- `src/ui/sessions/SessionsTab.jsx` 刷新 (時間軸密度: 未来予定 / 週 / 月 / 年 4 バケット、日曜始まりカレンダー週、試打を大会/練習のリンクバッジとして統合)
- `src/ui/sessions/SummaryHeader.jsx` 新規 (今月件数 + 直近 10 試合勝敗)
- `src/ui/sessions/TimeGroupHeader.jsx` 新規 (週/月/年 3 レベル、sticky、年は折り畳み)
- `src/ui/sessions/FAB.jsx` 新規 (placeholder、中身は S12)
- `src/app.jsx` 更新 (Firestore realtime listener、日付正規化、ログアウト確認ダイアログ)
- `src/core/01_constants.js` 更新 (DESIGN_SYSTEM §1 に準拠した色パレット)
- ユーザー動作確認済み: 950 件の実データで表示 OK、v3 との realtime 同期 OK

### S5+S6 で学んだ教訓

1. **core を先に調べる** (再発防止): S6 着手時、先に core/04_id.js の normDate/fmtDate/ds 存在を確認してから実装。前回の S5 で発生した「独自正規表現を書いて全件スキップ」の再発を防げた
2. **UI/UX 再スコープは実データで初めて分かる**: 設計時は 3 モードで十分と思ったが、実データで動かして初めて「未来予定が最上位に来て邪魔」「練習タイプの判別が困難」「試打が独立カードなのは無理」などが判明。実装 → 実データ確認 → 設計微修正のサイクルは必須
3. **ユーザーへの連絡は技術情報と視覚的に切り離す**: ユーザーはコード類を読み飛ばすので、「更新完了・F5」等の重要指示はコード・ファイルパス・技術用語と同じブロックに入れない (メモリ feedback_update_announcement.md)
4. **試打の独立性の否定**: v2/v3 で先送りされていた「試打はそもそも大会/練習の付随活動」という構造を v4 でようやく明文化。リンクバッジ表示、本体データは機材タブ (S16) に集約、S20 で自動連関

### 未解決・保留

- 孤立試打 (`linkedMatchId`/`linkedPracticeId` のどちらも無い試打): S6 では非表示。S16 (機材タブ) または S20 (自動連関) で扱い決定
- slide-in 詳細画面 + 画面幅レスポンシブ: S10 で実装
- 古い日付形式 (YYYY/M/D) の Firestore 書き戻し: S11 (編集画面) で、編集した時にその場で canonical 形式に書く (遅延マイグレーション、方針は ROADMAP 記録済み)

---

## 1. S7 の目的

**Sessions タブに検索・絞り込み機能を追加する**。

### S7 で作る (DESIGN_SYSTEM §8.5.1 / §8.5.2 に仕様済み)

1. **SearchBar (検索バー)** — タイトル・会場・対戦相手・メモを横断テキスト検索
2. **FilterChip (絞り込みチップ)** — 複数同時掛け可:
   - 種類: 大会 / 練習 (試打は独立カード無しなので選択肢から除外)
   - ラケット: 既存データから動的に候補抽出
   - 対戦相手: 既存データから動的に候補抽出
   - 結果: 優勝 / 準優勝 / ベスト8 等
3. 絞り込みドロワー: チップタップで画面下から候補リストがシート状に上がる
4. SummaryHeader の切替: 絞り込み中は「絞り込み結果: N 件 / 全 M 件」に
5. 検索/絞り込みの状態は localStorage に保存 (タブ切替で失われない)

### S7 でやらないこと (別 Stage)

- 表示モード切替 (リスト/カレンダー/年間濃淡): S8, S9
- カレンダー view: S8
- 年間濃淡 view: S9
- slide-in 詳細画面: S10
- FAB の中身 (QuickAdd): S12
- 試合中ゲーム単位記録 UX: S11 の前提要件 (個別 HANDOFF で UX 先行設計)

---

## 2. S7 の完了条件 (DoD)

1. `src/ui/sessions/SearchBar.jsx` 新規
2. `src/ui/sessions/FilterChip.jsx` 新規
3. `src/ui/sessions/FilterDrawer.jsx` 新規 (候補選択シート)
4. `SessionsTab.jsx` に検索バーと絞り込みチップを統合
5. `SummaryHeader.jsx` に絞り込み中表示対応
6. 検索・絞り込みの状態は localStorage 保存
7. 絞り込み中は時間軸密度見出しも適切に間引き (空月は非表示)
8. build.ps1 成功
9. 検証: serve.ps1 経由で http://localhost:8080/v4/index.html
   - 検索入力 → タイトル/会場/対戦相手/メモに部分一致で絞り込まれる
   - 絞り込みチップ: 複数同時掛け可 (例: ラケット=Ezone98 × 結果=優勝)
   - チップの ✕ で個別解除、「すべてクリア」で一括解除
   - 絞り込み中、SummaryHeader が件数切替
   - ブラウザ閉じて開き直しても検索状態が復元
10. 1 commit で push 承認

---

## 3. S7 実装前の注意点

### 3.1 DESIGN_SYSTEM §8.5.1 / §8.5.2 の再確認
仕様は書いてあるのでそれに従う。独自スタイルを再度作らない。

### 3.2 core の既存ユーティリティを使う
- ラケット名/対戦相手の候補抽出は既存 tournaments/practices/trials を走査
- 候補の正規化に `normalizeVenue` 類似の関数が v3 にあるか確認 → あれば使う、なければ core に追加してから使う
- **独自に類似関数を書き始めたら即停止して core を検索**

### 3.3 検索ロジック
- 部分一致 (大小英字無視、全角半角正規化は無しで OK、日本語主体のため)
- 検索対象: tournament.name / tournament.venue / tournament.generalNote / tournament.matches[].opponent/opponentNote/mentalNote / practice.title/venue/coachNote/goodNote/improveNote/generalNote / (trial は一覧除外だがリンク判定用に読むので対象外)

### 3.4 絞り込みの combine ロジック
- 複数チップは AND
- 同一チップ内の複数値 (例: ラケット: A or B) は OR
- 検索テキストと絞り込みチップは AND

---

## 4. S7 完了時にやること

1. serve.ps1 経由でユーザー動作確認
2. 「S7 OK」確認
3. 1 commit (例: `v4 S7: Sessions 検索・絞り込み`)
4. push 承認 → push
5. HANDOFF_v4_S8.md 作成 (S8 = カレンダー view)
6. 本ファイル削除

---

## 5. S7 で守ること (CLAUDE.md 厳守プロトコル + 過去教訓)

- **コンポーネント内部定義禁止** (再マウント事故防止、SearchBar / FilterChip / FilterDrawer は src/ui/sessions/ のトップレベル定義)
- **独自スタイル禁止** (DESIGN_SYSTEM §8.5.1/§8.5.2 準拠、独自パディング・独自色・独自フォントサイズを作らない)
- **core を先に調べる** (S5 失敗の教訓)
- **判断投げ禁止** (「A/B どちら?」ではなく「A にします、違えば指示ください」)
- **ユーザー連絡は技術情報と切り離す** (「更新完了・F5」等はプレーン独立配置)
- **コミット粒度**: S7 は 1 コミット = 1 push、小刻み patch 禁止

---

## 6. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル (最優先)
- **MEMORY.md + feedback_*.md** — 過去の失敗から学んだルール
- **DESIGN_SYSTEM_v4.md §8.5.1 / §8.5.2** — SearchBar / FilterChip 仕様
- **WIREFRAMES_v4.md §2.2.0** — 共通操作帯 (検索 + 絞り込みチップ + 表示切替) のレイアウト
- **ROADMAP_v4.md S7** — S7 のスコープ
- **REQUIREMENTS_v4.md F1.11** — 検索・絞り込みの要件
- **src/ui/sessions/SessionsTab.jsx** — 絞り込みロジックを統合する相手
- **src/ui/sessions/SummaryHeader.jsx** — 絞り込み中表示に対応
- **HANDOFF_v4_S7.md** — 本書
