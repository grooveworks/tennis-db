# HANDOFF v4 — Stage S2（Domain 層）開始用

作成: 2026-04-19 / 前セッション(S1)末尾で作成

> **次セッション最初にやること**: このファイル + REQUIREMENTS_v4.md + ARCHITECTURE_v4.md + ROADMAP_v4.md を読む。
> **特に ARCHITECTURE_v4.md §10「Stage 開始前チェックリスト」を応答テキストに書き出してから着手すること**。
> コードから書き始めない。

---

## 0. 前セッション(S1)の結果

### 完了事項
- `src/core/` に5ファイル分離:
  - 01_constants.js (APP_VERSION, C, KEYS, LS_PREFIX)
  - 02_firebase.js (Firebase 初期化)
  - 03_storage.js (lsLoad, lsSave, save, cleanForFirestore)
  - 04_id.js (genId, normDate, fmtDate, fmtDateFull, ds)
  - 05_schema.js (SCHEMA + DISPLAY_FIELDS/COMBINABLE_FIELDS/REQUIRED_FIELDS/FIELD_TYPES/isEmptyVal/INTERNAL_KEYS/keysToInspect/labelFor)
- app.jsx を S1 動作確認用に拡張（認証 / ストレージ / SCHEMA 表示 の3セクション）
- build OK (18,737 bytes)
- preview で SCHEMA 表示 OK、localStorage 保存 OK
- ARCHITECTURE_v4.md に §10「Stage 開始前チェックリスト」追加

### S1 で犯した失敗 → 再発防止策
1. **Firebase ログイン動作確認を DoD に入れた**
   - preview (file://) で原理的に動かないことを事前調査しなかった
   - → ARCHITECTURE_v4.md §10.1 に環境制約の調査リスト追加
2. **PowerShell の `-join`/`Set-Content -Encoding UTF8` で時間を浪費（S0）**
   - → §10.2 に使用技術仕様の事前調査リスト追加
   - 結論: StringBuilder + `[System.IO.File]::WriteAllText` + UTF8Encoding(BOM=false) が確実

### DoD 未達成項目（S2 以降に持ち越し）
- Firebase ログイン動作確認 → 本番 push 後に https:// で実動作確認する

---

## 1. S2 の目的（Domain 層実装 + unit test）

v3 のロジックを**純関数として再実装**する。React に依存しないため、tests/run.html で unit test 可能。

作成するファイル（`src/domain/` 配下）:

1. `merge.js` — `mergeItems`, `computeComplement`, `computeConflicts`
2. `cascade.js` — `deleteItemCascade`（practice/tournament/trial/match 全ケース）
3. `duplicate.js` — `strictMatch`, `sameDate`, `analyzeImport`, `analyzeType`
4. `import_gcal.js` — GCal JSON → sessions 変換
5. `import_csv.js` — データテニス CSV → matches 変換
6. `import_watch.js` — Apple Watch JSON → practice 変換
7. `stats.js` — 集計ロジック（勝率・推移等の純粋計算）

テスト（`tests/` 配下、ただし run.html に inline で追加する方針。S0 で外部 JS が file:// で動かない事が判明済み）:

- `tests/run.html` に各 domain モジュールの test を inline で追加
- test 関数は S0 で作成済み（window.test, window.assert, window.assertEqual, window.runAllTests）

---

## 2. S2 の完了条件（DoD）

1. `src/domain/` に上記7ファイル存在（Stage 分割する場合は後述）
2. `build.ps1` で v4/index.html が正しく生成される
3. `tests/run.html` を preview で開くと **全テスト green** (例: "24 tests, 24 ok, 0 failed")
4. 以下の unit test が全 pass:
   - **merge.js**: 補完される / 競合は existing 優先 / combined / 配列型の扱い / 空値の扱い
   - **cascade.js**: practice 削除 → trial.linkedPracticeId クリア / tournament 削除 → matches 全体 + 連携 trial クリア / trial 削除 単独 / match 削除 → 親tournament.matches から除外 + trial.linkedMatchId クリア
   - **duplicate.js**: id一致 / date+startTime strict / same-date soft / 3パス順序 / 複数候補での排他
   - **import_gcal.js**: 最小入力での parse / 異常値での graceful fallback
   - **import_csv.js**: 最小入力での parse / データテニス特有の列マッピング
   - **import_watch.js**: 心拍ゾーン計算 / 時刻範囲マッチング
5. ユーザーが preview で tests/run.html を開いて「全 green」確認
6. ユーザーが「S2 OK」と返答
7. 1 commit で push 承認

### S2 を分割する場合（ロードマップの見直し）
S2 は7モジュール + 多数のテストでボリュームが大きい。次の2サブ Stage に分割を検討:
- **S2a**: merge + cascade + duplicate + tests（Session系ロジック）
- **S2b**: import_gcal + import_csv + import_watch + stats + tests（Import/分析系）

セッション内で S2a が完了しそうにない場合、S2a だけで1 commit して S2b を次セッションに回す。ROADMAP_v4.md を更新すること。

---

## 3. S2 実装手順

### 3.1 Stage 開始前チェックリストを応答に書き出す（必須）

ARCHITECTURE_v4.md §10.4 の自問5項目を応答テキストに明示。書かずに着手したらルール違反。

### 3.2 src/domain/ ディレクトリ作成

### 3.3 merge.js 実装

SCHEMA と keysToInspect を前提に以下を実装:

```js
// 中央マージヘルパー: A + B を choices に従って統合
// choices: {fieldKey: 'existing'|'new'|'combined'}（デフォルト existing）
const mergeItems = (a, b, choices, type) => {
  const merged = {...a};
  keysToInspect(a, b, type).forEach(key => {
    const av = a?.[key], bv = b?.[key];
    if (isEmptyVal(bv)) return;
    if (isEmptyVal(av)) { merged[key] = bv; return; }
    const as = typeof av === "object" ? JSON.stringify(av) : String(av);
    const bs = typeof bv === "object" ? JSON.stringify(bv) : String(bv);
    if (as === bs) return;
    const ch = choices?.[key] || "existing";
    if (ch === "new") merged[key] = bv;
    else if (ch === "combined" && COMBINABLE_FIELDS.has(key)) merged[key] = `${av} | ${bv}`;
  });
  return merged;
};

const computeComplement = (a, b, type) => {
  const r = [];
  keysToInspect(a, b, type).forEach(key => {
    const av = a?.[key], bv = b?.[key];
    if (isEmptyVal(av) && !isEmptyVal(bv)) r.push({ key, label: labelFor(key, type), value: bv });
  });
  return r;
};

const computeConflicts = (a, b, type) => {
  const r = [];
  keysToInspect(a, b, type).forEach(key => {
    const av = a?.[key], bv = b?.[key];
    if (!isEmptyVal(av) && !isEmptyVal(bv)) {
      const as = typeof av === "object" ? JSON.stringify(av) : String(av);
      const bs = typeof bv === "object" ? JSON.stringify(bv) : String(bv);
      if (as !== bs) r.push({ key, label: labelFor(key, type), existingValue: av, newValue: bv, combinable: COMBINABLE_FIELDS.has(key) });
    }
  });
  return r;
};
```

### 3.4 cascade.js 実装

```js
const deleteItemCascade = (type, id, state, matchParentId) => {
  const r = { tournaments: state.tournaments || [], practices: state.practices || [], trials: state.trials || [] };
  if (type === "practice") {
    r.practices = r.practices.filter(p => p.id !== id);
    const updated = r.trials.map(tr => tr.linkedPracticeId === id ? {...tr, linkedPracticeId: ""} : tr);
    if (updated.some((t, i) => t !== r.trials[i])) r.trials = updated;
  } else if (type === "tournament") {
    const trn = r.tournaments.find(t => t.id === id);
    const matchIds = (trn?.matches || []).map(m => m.id);
    r.tournaments = r.tournaments.filter(t => t.id !== id);
    if (matchIds.length > 0) {
      const updated = r.trials.map(tr => matchIds.includes(tr.linkedMatchId) ? {...tr, linkedMatchId: ""} : tr);
      if (updated.some((t, i) => t !== r.trials[i])) r.trials = updated;
    }
  } else if (type === "trial") {
    r.trials = r.trials.filter(t => t.id !== id);
  } else if (type === "match" && matchParentId) {
    r.tournaments = r.tournaments.map(t => t.id === matchParentId ? {...t, matches: (t.matches || []).filter(m => m.id !== id)} : t);
    const updated = r.trials.map(tr => tr.linkedMatchId === id ? {...tr, linkedMatchId: ""} : tr);
    if (updated.some((t, i) => t !== r.trials[i])) r.trials = updated;
  }
  return r;
};
```

### 3.5 duplicate.js 実装

v3 の strictMatch / analyzeType / analyzeImport を移植。

### 3.6 import_gcal.js, import_csv.js, import_watch.js

v3 の既存実装（`v3/index.html` 内の該当関数）を参照し、純関数として切り出す。v3 コードは `git show 264ed7f:v3/index.html` または worktree の `v3/index.html` で参照可。

### 3.7 stats.js

集計ロジック（勝率、種別別、期間別）の純関数。

### 3.8 tests/run.html にテスト追加（inline）

run.html の `<!-- テストスクリプトは Stage S2 以降で順次追加 -->` の位置に、各モジュールのテストを inline script で追加:

```html
<script>
// ── merge.js tests ──
test("空フィールドは補完される", () => {
  const a = {id: "1", name: ""};
  const b = {id: "2", name: "大会A"};
  const merged = mergeItems(a, b, {}, "tournament");
  assertEqual(merged.name, "大会A", "name が補完されるべき");
});
// ... 他のテスト
</script>
```

テストは各モジュールごとに明確にセクション分けする。最低15〜25 tests。

### 3.9 app.jsx を S2 動作確認用に軽く拡張（任意）

SCHEMA 確認セクションの下に「Domain 動作確認」セクションを追加し、mergeItems や deleteItemCascade を小さなサンプルで試せるボタンを置く。**DoD には含めない**（tests/run.html で十分なため）。

### 3.10 build 実行

### 3.11 preview で確認

- `tests/run.html` を preview で開いて全 green
- `v4/index.html` を preview で開いてコンソールエラーなし

---

## 4. 完了時にやること

1. ユーザーに `tests/run.html` の表示を確認してもらう（全 green 画面）
2. 「S2 OK」確認
3. 1 commit（例: `v4 S2: Domain 層 — merge/cascade/duplicate/import + unit tests`）
4. push 承認 → push
5. `HANDOFF_v4_S3.md` 作成（UI 共通コンポーネント）
6. `HANDOFF_v4_S2.md` 削除

---

## 5. 自戒（S1 で犯した失敗の再発防止）

### S1 の失敗パターン
- 事前調査せずに実装 → 動かないものを DoD に入れる
- 「ミスでした」と軽口で流す → 失敗の重さを認識していない態度

### 次セッションで変えること
- ARCHITECTURE_v4.md §10.4 の自問5項目を応答に書き出してから着手
- 謝罪は単独で（次のアクションと混ぜない）
- ユーザーが指摘する前に、自分で対処療法のパターンに気付いて止まる
- 「素人に判断を投げる」禁止、「こうします」と宣言する

### ユーザーからの重要な指摘（記録）
- 「対処療法ばかりで根本解決しようとしない」→ 設計文書に立ち返る規律
- 「軽口で謝罪しない」→ 反省の重みを態度で示す
- 「判断を人に任せるな」→ 私が判断して責任を取る
- 「先延ばしは大嫌い」→ 中断を軽率に提案しない、今セッションで完結させる
