# Tennis DB プロジェクト — Claude 必須ルール (圧縮版 v2)

このファイルは毎セッション開始時に Claude が最初に読む。違反を自覚した瞬間、即時停止してユーザーに報告する。

詳細な失敗パターン記録 / 経緯は `CLAUDE_failures.md` に分離 (違反しそうになった時のみ参照)。

---

## R0. フック前提 (2026-05-06 新設、最優先)

このプロジェクトは `.claude/hooks/` (4 ファイル) と `.claude/settings.json` の hooks 設定で claude の独断行動を物理的に縛っている。**フック設定が無い環境では作業を始めない**。

**確認手順 (セッション開始時の最初):**
1. `.claude/settings.json` に `hooks` セクションが存在するか
2. `.claude/hooks/` に 4 つの ps1 が揃っているか:
   - `session-start.ps1` / `file-guard.ps1` / `git-guard.ps1` / `user-keyword-guard.ps1`
3. 欠けていたらユーザーに告げる、復元するまで作業しない

**フックが効いている前提のもの (= フック無しでは安全性が崩壊):**
- 重要ファイル編集 (`01_constants.js` の APP_VERSION / `build.ps1` / `settings.json` / `hooks/*.ps1`) → ask 強制
- `git commit` / `git push` / `git reset --hard` / `git push --force` → ask 強制
- ユーザー警告キーワード (「違う / やめて / 戻して / 何度も / ちゃんと / 勝手に」等) → 自己点検 context 注入
- セッション開始時の重要 context 強制注入

**フック編集時の再帰ルール:**
- `.claude/hooks/*.ps1` 自身も file-guard で保護対象
- 編集後は必ず BOM 付与: `& .claude/addbom.ps1 -path <ps1path>` (BOM 無いと PowerShell が文字化けでクラッシュ)

詳細は memory `feedback_hooks_required_2026_05_06.md` 参照。

---

## 5 ルール (これだけ守れば大半の失敗を防げる)

### R1. 対処療法禁止
症状をその場で隠さず、根本原因を調査してから直す。「とりあえず」「後で直す」を作らない。

### R2. 判断投げ禁止
「A/B どちらにしますか?」を聞かない。「**こうします。違えば指示ください**」で提示する。素人ユーザーに技術判断を求めない。

### R3. 事前調査して実装
- 関連設計書 / v2/v3 / v4 既存コードを **中身まで読む** (ファイル一覧で済まさない)
- agent 報告は **必ず自分で grep / Read で裏取り** (鵜呑み禁止)
- 新規追加する識別子・ファイル名は **必ず既存リポを grep** (重複防止、F12)
  - 例: `grep -rn "const cleanForFirestore" src/`
  - 重複は build 時に SyntaxError「Identifier 'X' has already been declared」
- **呼び出す既存関数** (today, genId, normDate 等) も **書く前に grep で存在確認** (F15、未定義参照防止)
  - 例: `grep -rn "const today\|function today" src/` → 見つからなければその関数を追加してから書く
  - v3 にあるからといって v4 にもあるとは限らない (S6 移植で取捨選択された)
- テニス用語が出たら `TENNIS_RULES.md` 該当節を確認

### R4. UI/UX 先行
デザインシステム / ワイヤフレーム / preview が確定するまで実装に進まない。「機能を作ってから見た目」は禁止。**ユーザーの立場で考える** — フィールドの長さ / グルーピング / 入力頻度を考えてレイアウト設計する。

### R5. 責任主語
失敗の説明で外部要因 (agent 報告 / HANDOFF / 文書量) を理由に挙げる時は、必ず **「それを鵜呑みにした私が悪い」とセットで書く**。応答内で「私が ○○ を確認した」と主語を明示する。「○○ ✓」で済まさない。

---

## セッション開始プロトコル

ユーザーから「S(N) を始めてください」と言われたら、私は最初の応答で以下を実行:

```
1. 私が読む節を宣言 + 読了後に要点 2 行ずつ
   - ROADMAP S(N) / REQUIREMENTS F(X) / WIREFRAMES §X / DESIGN_SYSTEM §X
   - TENNIS_RULES (該当時のみ)
   - DECISIONS_v4.md 全件 (連続性確保のため必読)

2. v2/v3 該当箇所を grep で探す (実行結果コピペ必須)

3. v4 既存実装の重複チェック (grep 出力コピペ必須)
   - 新規追加予定の識別子・ファイル名を src/ で grep

4. 5 ルール再確認 (上記)

5. スコープ提案 + UX 方針 → ユーザー OK 待ち
```

各項目は **実行結果コピペ** で証明する。grep 出力が貼られていなければ私自身が「読んでいない」と判定して却下する。

---

## ストップサイン (発動したら即停止)

- 同一ファイルに 3 回目の Edit
- エラーに対して「これで回避できる」と思った
- 「とりあえず」「後で直す」と書きそうになった
- 判断をユーザーに投げそうになった
- 事前調査なしに実装開始しそうになった
- UI/UX を機能実装より後回しにしそう
- 応答で外部要因のせいにして「私が」を主語にしていないと気付いた

---

## コミット規律

1 タスク = 1 push。push 前に明示的承認を取る。バンドル承認禁止 (1 コミット = 1 承認)。push できたら HANDOFF を更新。

---

## R6. push 前ゲート (2026-05-12 確立、ChatGPT 補足対応)

heavy 化作業 / code splitting / 重要ファイル編集 を含む push 前に、以下 8 項目を Yes/No で確認する。1 つでも No なら push 禁止。

1. 変更対象ファイルと、その **子コンポーネント** を全文 Read したか
2. grep だけで依存棚卸しを済ませていないか (= 全文 Read 必須)
3. bridge 漏れが 1 件でも出た場合、対象ファイルを **全文再 Read** したか (= 1 個直して終わりにしない、氷山の一角と見做す)
4. **実画面で変更対象そのものを開いた** か (= dev mode で実際の機能を呼び出した)
5. click / 遷移 / 戻る / 閉じる を確認したか
6. console error 0 を確認したか
7. 「bundle expose 確認」「heavy 読込確認」「Plan タブで render 確認」だけで動作確認済みにしていないか
8. ユーザーに検証を丸投げしていないか (= 「iPhone で確認お願いします」を再掲しない)

### push 前ゲートフォーマット (= push 承認求める時に必ずこの形式)

```
## push 前ゲート
変更対象:
- xxx.jsx

全文 Read:
- 対象ファイル: 済
- 子コンポーネント: 済 / 該当なし

依存棚卸し:
- grep: 済
- 全文確認: 済
- bridge 漏れ: なし / あり (xxx 追加)

実画面検証:
- 対象画面を開いた: 済
- click / 遷移 / 戻る/閉じる: 済

console error 0: 済

未確認: なし
```

この形式が出せないなら push 禁止。

### 物理ブロック仕組み (= 2026-05-12 導入、ChatGPT 推奨)

- `.git/hooks/pre-push`: `VERIFY_LOG.md` に「実画面検証: 済」「console error 0: 済」が含まれていなければ exit 1 で物理ブロック
- `.claude/hooks/git-guard.ps1`: git push 検知時に VERIFY_LOG.md 必須項目チェック、不足なら ask reason に hint 追記 (= Claude Code 内二重防御)
- `VERIFY_LOG.md`: 各 push 前に Claude が必ず更新、現行 push 候補 + 過去 push 履歴を記録

教訓: Memory は読まない / 都合よく解釈 / 忘れる / 検証を省く ので強制力なし。HOOK / pre-push gate で物理的に縛る方が確実 (ChatGPT 補足 2026-05-12)。

---

## R7. 設計前提棚卸しプロトコル (2026-05-17 確立、前提決め打ち癖対策)

R6 が「push 前」のゲートなら、R7 は「設計を書き始める前」のゲート。Claude の常設の癖 (資料・過去発言・制約を読まずに前提決め打ち → 訂正されたら逆方向に決め打ち → 「理解しました」で実装 → 別の前提漏れで壊す = F16) を物理的に縛る。

### R7 発動条件 (フック発火)

`.claude/hooks/design-phase-guard.ps1` (UserPromptSubmit) がユーザー発言に以下を検知した時:

| 区分 | キーワード | 発火条件 |
|---|---|---|
| strong (11) | 設計 / フェーズ / フェーズ計画 / 棚卸し / Gate / 試合中信頼性 / local-first / offline / core / heavy / Firestore | 単独で発火 |
| weak (7) | 次のステップ / 保存 / 同期 / 運用 / 大会 / 方針 / 要件 | anchor 同時の時のみ発火 |
| anchor (10) | Tennis DB / v4 / 試合 / 実戦 / 設計 / Gate / core / heavy / Firestore / local-first | (weak 発火条件) |

発火 = `.claude/state/design-phase.json` に flag を書き、応答前に DESIGN PHASE 注入 (additionalContext)。flag 有効期間 24 時間。`.claude/state/` は `.gitignore` で commit 除外。

### R7 は 2 段階構造

#### 段階 A: 設計相談段階 (= UserPromptSubmit 発火直後)
**応答内で実行 (DESIGN_LOG エントリは推奨だが必須ではない)**:
1. 今回の論点を明確化
2. 必要資料を選定して Read (= 固定 Read 強制ではない、選定理由を明記)
3. 12 項目棚卸しを応答内に書く
4. 未確認前提を §5 根拠分類 4 区分で明示
5. 複数パターンを検討、対象外には理由
6. ユーザー確認事項を提示

→ 「方針どう思う?」程度の相談で DESIGN_LOG を強制しない。応答内棚卸しで足りる。

#### 段階 B: 実装着手前 (= file-guard が src/build/高リスク語パスを検知)
**DESIGN_LOG.md に当日エントリ必須**。無ければ `file-guard.ps1` が ask で止める。
Phase 1 check (当日エントリ範囲内に限定): 当日見出し `## YYYY-MM-DD` + `### §1.` `### §5.` `### §11.` `### §12.` `### §14.` の各見出し存在 (過去エントリの見出しでは通さない)。
Phase 2 で空欄チェック追加予定 (別ターン実装)。

### 12 項目 (段階 A 応答 + 段階 B DESIGN_LOG 共通フォーマット)

1. 今回の論点 / 2. 読んだ資料 (選定理由含む) / 3. 過去制約 / 4. Claude が置いている前提 / 5. 各前提の根拠分類 (資料 / ユーザー明示 / 過去ログ推定 / 未確認仮説) / 6. 複数あり得るパターン / 7. 今回対象にするパターン / 8. 対象外パターンと理由 / 9. 未確認の前提 / 10. ユーザー確認が必要な点 / 11. 禁止事項 / 12. 停止条件

### 必要資料の選定 (固定 Read 廃止)

毎回固定 Read ではなく、**今回の論点に必要な資料を選び、選定理由を明記して読む**。

候補 (= 論点別の参照原則):
- 全論点共通: CLAUDE.md R6/R7 / CLAUDE_failures.md
- 機能・要件論点: REQUIREMENTS_v4.md
- 進行・凍結論点: ROADMAP_v4.md
- 着手タスク: HANDOFF_v4_S<N>.md
- UI/UX 論点: WIREFRAMES_v4.md / DESIGN_SYSTEM_v4.md
- 保存・同期・信頼性論点: src/core/02_firebase.js / src/core/03_storage.js / Firestore 関連
- 過去発言: MEMORY 該当エントリ

応答冒頭チェックリスト (手続き型):
- □ 今回読む資料を選定した / □ 選定理由を書いた / □ 実際に Read した / □ 各資料 2 行サマリーを書いた

### 8 禁止 (発動中・違反時自己停止)

1. 未確認の前提を事実として扱う
2. 1 つの運用・経路・状態だけに決め打ちする
3. ユーザーの訂正を逆方向の決め打ちに置換する
4. 資料未読で設計案を書く
5. 「理解しました」と言って即実装に進む
6. 複数パターンを勝手に 1 つに圧縮する
7. dev mode の結果を実戦保証として扱う
8. 同一コードパスを理由に検証を省略する

### 形式的記入防止 (F7/F16 再演防止)

DESIGN_LOG.md の各前提は §5 前提一覧表 (前提 / 根拠分類 / 根拠 / 未確認なら確認方法) を埋める。チェックだけで内容空欄は違反。未確認仮説の事実扱いは禁止 (8 禁止 §1 と一致)。

### Gate 2 への転記 (R6 連携)

DESIGN_LOG §14「Gate 2 へ必ず転記する制約」+ §15「Gate 2 転記確認」に書いた制約は、実装着手時 (= Gate 2、原則チャット提示) にも必ず転記する。Gate 2 契約自体は VERIFY_LOG.md には書かない (VERIFY_LOG は検証ログ純度維持)。

### 高リスク語パス (file-guard PreToolUse 対象)

Firestore / save / sync / localStorage / IndexedDB / offline / loadHeavy / __TennisDBCore / __TennisDBHeavy / pushState / popstate / history.back / MatchEditModal / GameTracker / SessionEditView / TournamentEditForm / PracticeEditForm

(2026-05-17 時点では path 判定中心。content (tool_input new_string/content) 内の高リスク語検査は Phase 2 として別ターン実装。)

### R7 ストップサイン (= 自己停止の追加条件)

- 「ご指摘の通りです」と書いた次の行で実装トーンに移ろうとした
- 「同じ趣旨だから」「便宜上」で項目を統合しようとした
- ユーザー訂正直後に統合せず逆方向に決め打ちしようとした
- DESIGN_LOG §5 / §13 表を空欄チェックだけで埋めようとした

---

## 役割分担

| | 担当 |
|---|---|
| **ユーザー** | プロダクト方向性 / 最終承認 / 「動いた / ダメ」判定 |
| **Claude** | 技術判断の全責任 / 検証手順の用意 / ダメな時の修正案 |

ユーザーに技術判断を求めない。専門用語を読ませない。動作検証手順は私が全て用意し、ユーザーは「OK / NG」の 1 語で済むよう設計する。

---

## 関連ファイル

- `CLAUDE_failures.md` — 過去の失敗パターン詳細 (違反しそうな時に参照)
- `DECISIONS_v4.md` — 全 Stage の決定事項蓄積 (連続性担保)
- `HANDOFF_v4_S(N).md` — 直近 Stage の起動タスク (50 行以内)
- `TENNIS_RULES.md` — テニス公式ルール参照 (CO 判定等)
- `MEMORY.md` — クロスセッション記憶 (auto memory)

設計書群: `REQUIREMENTS_v4.md` / `ARCHITECTURE_v4.md` / `ROADMAP_v4.md` / `WIREFRAMES_v4.md` / `DESIGN_SYSTEM_v4.md` (Stage 着手時に該当節のみ読む、開始時全文ロードしない)
