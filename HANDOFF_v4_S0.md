# HANDOFF v4 — Stage S0（準備）開始用

作成: 2026-04-19 / 前セッション末尾で作成 / v4.0.0 再構築開始

> **次セッション最初にやること**: このファイルを読み、REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md を全部読んでから着手。コードを書き始めない。

---

## 0. 前セッション（2026-04-19）の結果

### 経緯
- v3.3.28 Foundation 再構築を worktree で実装したが、ユーザーから「対処療法の繰り返し、根本解決しようとしない」と指摘
- コード全破棄 + ゼロから設計し直す方針に転換
- worktree は `git reset --hard HEAD` で v3.3.27 (HEAD=264ed7f) に復帰
- 設計文書3本を作成: REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md

### 現在の状態
- 本番: v3.3.27 が `https://grooveworks.github.io/tennis-db/v3/` で稼働中
- リポジトリ HEAD: 264ed7f
- worktree に残る変更: 設計文書3本 + 本HANDOFF（この4ファイルを1コミットに）

### ユーザーから受けた重要な指摘（必ず守ること）
1. **対処療法禁止**: 問題発生→パッチの繰り返しはしない。設計に戻って直す
2. **判断を投げるな**: 「論点A/B/Cどれ？」と素人に選ばせない。私が判断して「こうします」と宣言
3. **専門用語をユーザーに読ませない**: 設計文書は作業用。ユーザーには平易な要約と動くアプリで伝える
4. **先延ばし禁止**: 中断・次回持ち越しを軽率に提案しない
5. **過去の失敗を思い出せ**: 記録された経緯を忘れて同じパターンを繰り返さない
6. **責任を持つ**: プロセス・データロス予防・ロールバック確保・ユーザーに勉強させない

---

## 1. S0 の目的

v4 開発の土台を作る。**機能実装はまだしない**。以下が動く状態を作る:

- `v4/` ディレクトリ作成
- `build.ps1` が src/ 配下を連結して `v4/index.html` を生成できる
- `v4/index.html` を preview で開くと**最小限の画面が表示される**（真っ白でもOK、エラーなければ可）
- `tests/run.html` を開くと「テスト0件: 全成功」と表示される
- `serve.ps1` が v4 配信に対応（デフォルトパスを調整）

---

## 2. S0 の完了条件（DoD）

1. 以下のファイルが存在する:
   ```
   v4/index.html                 ← ビルド成果物（空でよい、build.ps1 で生成）
   build.ps1                     ← src/ を連結して v4/index.html を生成
   src/_head.html                ← <head> + CSS + Firebase CDN + React CDN
   src/_tail.html                ← </body></html>
   src/app.jsx                   ← ReactDOM.render(<div>v4 起動</div>, ...) 程度
   tests/run.html                ← テストランナー土台
   tests/_runner.js              ← assert / test / runAllTests 実装
   ```
2. `powershell -ExecutionPolicy Bypass -File build.ps1` で v4/index.html が生成される
3. preview で v4/index.html を開くと「v4 起動」の文字が見える（React 動作確認）
4. preview で tests/run.html を開くと「0 tests, 0 failed」と表示される
5. ユーザーが上記2点を確認、「S0 OK」と返答
6. 1 commit にまとめて push 承認を求める

---

## 3. S0 実装手順（迷わず順番通りに）

### 3.1 ディレクトリ作成
```
v4/
src/
tests/
```

### 3.2 src/_head.html 作成
- v3/index.html の先頭から `<script type="text/babel">` の直前まで（1〜11行目相当）を参考に、Firebase SDK・React CDN・Babel standalone の `<script>` タグ、CSS を含める
- `<div id="root"></div>` まで含める

### 3.3 src/_tail.html 作成
```html
</body></html>
```

### 3.4 src/app.jsx 作成（S0 用の最小版）
```jsx
const {useState,useEffect,useRef,useCallback,useMemo}=React;
const APP_VERSION="4.0.0-S0";
function TennisDB(){
  return <div style={{padding:20,fontFamily:"-apple-system,sans-serif"}}>
    <h1>v4 起動</h1>
    <div>Version: {APP_VERSION}</div>
  </div>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB/>);
```

### 3.5 build.ps1 作成
```powershell
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$out = Join-Path $root "v4\index.html"
if (-not (Test-Path (Join-Path $root "v4"))) { New-Item -ItemType Directory -Path (Join-Path $root "v4") | Out-Null }

# _head.html
Get-Content (Join-Path $root "src\_head.html") -Raw | Set-Content $out -NoNewline

# <script type="text/babel"> 開始
Add-Content -Path $out -Value "`n<script type='text/babel' data-type='module'>"

# core → domain → ui → app の順（S0 では app.jsx のみ）
Get-Content (Join-Path $root "src\app.jsx") -Raw | Add-Content -Path $out

# </script> 終了
Add-Content -Path $out -Value "</script>"

# _tail.html
Get-Content (Join-Path $root "src\_tail.html") -Raw | Add-Content -Path $out

Write-Host "Built: $out"
```

### 3.6 tests/_runner.js 作成
```js
window.__tests = [];
window.test = (name, fn) => window.__tests.push({name, fn});
window.assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
window.runAllTests = () => {
  const results = window.__tests.map(t => {
    try { t.fn(); return {name: t.name, ok: true}; }
    catch (e) { return {name: t.name, ok: false, err: e.message}; }
  });
  const failed = results.filter(r => !r.ok).length;
  const total = results.length;
  document.body.innerHTML = `
    <h1>${total} tests, ${failed} failed</h1>
    <ul>${results.map(r => `<li style="color:${r.ok?'green':'red'}">${r.ok?'✓':'✗'} ${r.name}${r.err?' - '+r.err:''}</li>`).join("")}</ul>
  `;
};
```

### 3.7 tests/run.html 作成
```html
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>v4 tests</title></head>
<body>
<script src="./_runner.js"></script>
<!-- テストスクリプトはここに順次追加 -->
<script>runAllTests();</script>
</body></html>
```

### 3.8 serve.ps1 を v4 対応に
- 既存 `D:\Downloads\Claude\tennis\serve.ps1` を確認
- `$path -eq '/'` 時のデフォルトを `/v4/index.html` に変更するか検討
- 破壊変更は慎重に（v3 の serve も必要）。ルーティング追加で両対応する

---

## 4. 実装前に守ること

### チェックリスト（書き出してから着手）
```
□ 1. REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md を読み直した
□ 2. S0 の DoD を読み直した
□ 3. 3.1〜3.8 の手順を頭に入れた
□ 4. ユーザーに「S0 着手してよいか」確認取った（最初の1回だけ、その後は各 Stage 開始時）
□ 5. コミット粒度: S0 完了まで1 commit（小刻みpatch禁止）
```

### ユーザーとの会話規律
- **専門用語で説明しない**（ビルドとか React とか出てきたら言い換える）
- **判断を投げない**（「どちらにしますか？」禁止、「こうします」と宣言）
- **反省と次アクションを混ぜない**（謝るときは謝るだけ）
- **push 前に必ずユーザー承認**（自動 push 禁止）
- **破壊操作の前に必ずバックアップ**（データに触る前）

---

## 5. S0 完了時にやること

1. ユーザーに preview で動作確認してもらう（v4/index.html, tests/run.html）
2. 「S0 OK」を確認
3. 1 commit にまとめる（コミットメッセージ例: `v4 S0: 準備 — ビルド土台・最小起動・テストランナー`）
4. push 承認を求める
5. push 完了後、`HANDOFF_v4_S1.md` を作成（次セッション用）
6. HANDOFF_v4_S0.md は削除（完了済みなので）

---

## 6. 失敗時の対応

- S0 途中で設計の穴が発覚したら: ARCHITECTURE_v4.md を直してから実装に戻る
- 動かない場合は原因を特定してから修正（「とりあえず動かす」禁止）
- 3回以上詰まったら、S0 の前提をユーザーに報告して指示を仰ぐ（ただし選択肢投げない、「私はこう判断する、理由はX」形式で）

---

## 7. ファイル参照マップ（次セッション用）

- **REQUIREMENTS_v4.md** — 何を作るか
- **ARCHITECTURE_v4.md** — どう作るか（ファイル構成、ビルド、スキーマ、state、色、test）
- **ROADMAP_v4.md** — いつ作るか、各 Stage の DoD
- **HANDOFF_v4_S0.md** — 次セッション(S0)の具体的手順（本書）
- **HANDOFF_v3.3.28.md** — v3 の失敗経緯（参考、削除禁止）
- **ROADMAP.md** — v3 のロードマップ（v3 凍結後も参考資料として残す）
- **v3/index.html** — v3.3.27 本番コード（凍結、触らない）

---

## 8. 自戒

前セッションで繰り返した失敗パターン:
1. テンプレ的に書いて後出し修正
2. 素人に判断を投げる
3. 過去の失敗を思い出さない
4. データロスリスクを軽く扱う
5. 中断・先延ばしを提案

**次セッションでは、これらを意識的に避ける**。
判断が迷ったら、本HANDOFF と REQUIREMENTS/ARCHITECTURE/ROADMAP に立ち返る。
ユーザーの時間を無駄にしない。
