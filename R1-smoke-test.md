# R1 実戦信頼性 smoke test（固定仕様）

目的: Tennis DB v4 が「試合中に使える最低条件」を、Claude の言葉ではなく機械的 PASS/FAIL で確認する。

## 信用モデル（最重要・読み飛ばし禁止）
- 本書は **Claude を信用するためではない**。**Claude が嘘をつける範囲・省略できる範囲を物理的に狭めるため**の固定仕様。
- Claude が「作りました／実行しました／PASS でした」と言うだけでは合格としない。Claude の自己申告 PASS は暫定であり信用対象ではない。
- 合格の最終アンカーは「このテストが通らないと push できない」状態（pre-push / 明示コマンド。既存 pre-push gate と同じ思想）。それが入るまでは暫定確認に過ぎない。
- テスト項目は小さく固定。Claude が自由に増減しない。増減は本書の改訂としてユーザー承認でのみ。

## 完成条件との対応
- 完成条件1（大会当日に端末上で試合記録できる）: T1, T3, T4, T5, T7
- 完成条件2（通信が不安定でも記録が端末に残る）: T2, T6, および「保存→再表示の端末残存」
- 完成条件3〜6 は本 smoke の対象外。

## 固定テスト項目（ユーザー確定の最小セット。Claude 拡張禁止）
| # | 項目 | 機械的判定 | 完成条件 |
|---|---|---|---|
| T1 | app version 固定 | `window.__TennisDBCore.APP_VERSION === "4.7.33-S17"` | 1 |
| T2 | 起動直後 heavy 未ロード | `window.__loadHeavyPromise === null` かつ `typeof window.__TennisDBHeavy === "undefined"` | 2 |
| T3 | 大会詳細を開く | 大会カード click 後、詳細（SessionDetailView）が表示される | 1 |
| T4 | +試合追加で MatchEditModal が開く | `[role="dialog"][aria-label="試合を編集"]` が DOM に存在 | 1 |
| T5 | loadHeavy 非発火 | MatchEditModal 表示後も `window.__loadHeavyPromise === null` | 1 |
| T6 | bundle-heavy.js 取得なし | network ログに `bundle-heavy.js` への request が 0 件 | 2 |
| T7 | console error 0 | 実行中の console error 件数 === 0 | 1 |

補足（手動段階で確認、自動化は後段）:
- 保存→再表示の端末残存: T4 後にスコア入力 → 保存 → reload（dev）→ 同大会を再表示し、当該試合が残っていること（完成条件2）。

## 実行手順（確立 DEV のみ。改変禁止）
1. `preview_start "Tennis DB Dev Server"`（launch.json 非 admin = serve.ps1 が localhost:8081 限定 bind・LAN 非公開。serve.ps1 L26-43 で確認済）
2. `http://localhost:8081/v4/index.html?dev=1`（dev=1 でログイン壁回避＋fixture。HANDOFF_v4_S17.md §6 / reference_local_dev_url.md）
3. T1〜T7 を上記の機械判定で確認
4. 出力は固定形式: `Tn [完成条件X]: PASS|FAIL  observed=<実値>`
5. 終了後 `preview_stop`（footprint を残さない）

## PASS / FAIL / 停止条件
- PASS 条件: T1〜T7 が全て true。
- FAIL 時の停止条件: いずれか 1 つでも false → 即停止。修正しない。項目を減らさない。判定を緩めない。生ログのまま提示。
- Claude の文章評価（「動きました」「同じコードパス」「console 0 と思う」「代表経路で十分」）は不可。

## 自動化できない / 本 smoke の対象外（正直に分離）
- 実 Android タブレット + 実テザリング切断の実戦そのもの。DEV はコードパス（機構）の確認であり、実機ネットワーク現実の代替ではない（混同しない）。
- コールドオフライン起動。React/Firebase が CDN の間は本質検証不可（R1-2 未達の間は別問題）。
- 完成条件3〜6。

## 進め方（固定。拡大禁止）
1. 仕様固定（本書）
2. 手動で毎回同一手順を確認
3. 自動化できる部分だけスクリプト化（大きなテスト基盤 / Playwright / CI は作らない）
4. pre-push に組み込み「通らないと push できない」状態にする（最終アンカー）
