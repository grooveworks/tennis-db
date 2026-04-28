// merge — Session の同タイプ 2 件を 1 件に統合する純関数
//
// 役割:
//   - REQUIREMENTS_v4 F1.10 セッションのマージ (同タイプ 2 件を 1 件に統合)
//   - cascade.js と対称: 削除 (cascade) は孤児化 (null クリア)、マージ (merge) は付け替え (B.id → A.id)
//   - SCHEMA (05_schema.js) の COMBINABLE_FIELDS / keysToInspect / labelFor / isEmptyVal を活用
//
// 設計方針:
//   - 副作用なし、React 非依存 (REQUIREMENTS N3.4)
//   - type 分岐は本ファイル内のみ (N3.3)
//   - tests/run.html で unit test 必須 (N3.5)
//   - インポート時マージ (S19 で予定) でも同じ純関数を流用できる構造 (相手が DB か incoming かは呼び出し側責任)
//
// 使い方 (S15 手動マージ flow):
//   const diff = computeMergeDiff(a, b, type);
//   // ユーザーが diff.conflicts に対して choices を決める
//   const merged = applyMerge(a, b, choices, type);
//   // matches[] (tournament) は applyMerge 内で自動合算
//   const newTrials = relinkAfterMerge(trials, b, a, type);
//   // save(KEY[type], updatedList); save("trials", newTrials);

// ── 内部: 値の同値判定 (primitives は ===, 配列・オブジェクトは JSON 比較)
function _isSameValue(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a === "object" || typeof b === "object") {
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch { return false; }
  }
  return String(a) === String(b);
}

// ── 1) computeMergeDiff: A と B の差分を「一致 / 補完 / 競合」に分類
//
// 戻り値:
//   {
//     match:      [{ key, label, value }],                      // 両方同じ値、または両方空
//     complement: [{ key, label, from: "a"|"b", value }],       // 片方空、もう片方に値 (自動採用)
//     conflicts:  [{ key, label, aValue, bValue, combinable }], // 両方値あり + 異なる (要選択)
//     unionKeys:  [...]                                         // 全 inspected key
//   }
//
// id / matches[] は分類対象から除外 (id は A 固定、matches は別ロジック)
function computeMergeDiff(a, b, type) {
  const result = { match: [], complement: [], conflicts: [], unionKeys: [] };
  const keys = keysToInspect(a, b, type);
  result.unionKeys = keys;
  for (const key of keys) {
    if (key === "matches") continue; // tournament の matches[] は別処理
    const av = a ? a[key] : undefined;
    const bv = b ? b[key] : undefined;
    const aE = isEmptyVal(av);
    const bE = isEmptyVal(bv);
    const label = labelFor(key, type);
    if (aE && bE) {
      result.match.push({ key, label, value: undefined });
    } else if (aE && !bE) {
      result.complement.push({ key, label, from: "b", value: bv });
    } else if (!aE && bE) {
      result.complement.push({ key, label, from: "a", value: av });
    } else if (_isSameValue(av, bv)) {
      result.match.push({ key, label, value: av });
    } else {
      result.conflicts.push({
        key, label,
        aValue: av, bValue: bv,
        combinable: COMBINABLE_FIELDS.has(key),
      });
    }
  }
  return result;
}

// ── 2) applyMerge: A を残し B を取り込む (choices に従って競合を解決)
//
// 引数:
//   a:        残す側 (A) の Session オブジェクト
//   b:        削除される側 (B) の Session オブジェクト
//   choices:  { [key]: "a" | "b" | "combined" }  競合の選択結果 (未指定キーは "a")
//   type:     "tournament" | "practice" | "trial"
//
// 戻り値: 統合後の新オブジェクト (A の id を必ず保持、元の a/b は変更しない)
//
// 動作:
//   - 一致 → A の値を維持
//   - 補完 (B のみ値あり) → B の値を自動採用
//   - 補完 (A のみ値あり) → A の値を維持
//   - 競合 → choices[key] に従う ("a" / "b" / "combined")、未指定は "a"
//   - "combined" は COMBINABLE_FIELDS のみ有効、それ以外は "a" 扱い
//   - tournament の matches[] は mergeMatches で自動合算
//   - id は必ず a.id を保持
function applyMerge(a, b, choices, type) {
  const _a = a || {};
  const _b = b || {};
  const _choices = choices || {};
  const merged = { ..._a };
  const keys = keysToInspect(_a, _b, type);
  for (const key of keys) {
    if (key === "matches") continue; // 別途 mergeMatches
    const av = _a[key], bv = _b[key];
    const aE = isEmptyVal(av), bE = isEmptyVal(bv);
    if (aE && bE) continue;
    if (aE && !bE) { merged[key] = bv; continue; }
    if (!aE && bE) { merged[key] = av; continue; }
    if (_isSameValue(av, bv)) { merged[key] = av; continue; }
    // 競合
    const ch = _choices[key] || "a";
    if (ch === "b") merged[key] = bv;
    else if (ch === "combined" && COMBINABLE_FIELDS.has(key)) {
      merged[key] = `${av} | ${bv}`;
    } else {
      merged[key] = av;
    }
  }
  if (type === "tournament") {
    merged.matches = mergeMatches(_a.matches, _b.matches);
  }
  merged.id = _a.id; // 必ず A の id を維持
  return merged;
}

// ── 3) mergeMatches: tournament.matches[] を合算 (id 重複は A 側を残す)
//
// 同じ match.id が両方にある → A 側のみ残し、B 側は破棄
// 違う match.id (B のみ) → A の後ろに追加
// id を持たない match (旧データ) → そのまま追加 (重複排除しない)
//
// 元配列は変更しない
function mergeMatches(matchesA, matchesB) {
  const a = (Array.isArray(matchesA) ? matchesA : []).filter(m => m);
  const b = (Array.isArray(matchesB) ? matchesB : []).filter(m => m);
  const aIds = new Set();
  for (const m of a) { if (m.id) aIds.add(m.id); }
  const result = [...a];
  for (const m of b) {
    if (m.id && aIds.has(m.id)) continue; // A 側を優先して残す
    result.push(m);
  }
  return result;
}

// ── 4) relinkAfterMerge: trial.linkedXxx を B → A に付け替え
//
// 引数:
//   trials:        全試打配列
//   removedItem:   B (削除される側) — id を持つ
//   keptItem:      A (残す側) — id を持つ
//   type:          "tournament" | "practice" | "trial"
//
// 戻り値: 付け替え済みの新 trial 配列 (元配列は変更しない)
//
// 動作:
//   - type=practice:
//       trial.linkedPracticeId === B.id → A.id に書き換え
//   - type=tournament:
//       matches[] は mergeMatches で合算され、B の match.id も merged.matches[] に残るため
//       trial.linkedMatchId は付け替え不要 (id がいずれかの match に残る → 参照維持)
//   - type=trial:
//       trial 同士のマージは cascade 対象外、relink も不要
function relinkAfterMerge(trials, removedItem, keptItem, type) {
  const _trials = Array.isArray(trials) ? trials : [];
  if (!removedItem || !removedItem.id || !keptItem || !keptItem.id) return _trials;
  if (type === "practice") {
    const removedId = removedItem.id;
    const keptId = keptItem.id;
    return _trials.map(tr => {
      if (!tr) return tr;
      if (tr.linkedPracticeId === removedId) {
        return { ...tr, linkedPracticeId: keptId };
      }
      return tr;
    });
  }
  return _trials;
}

// ── 5) countRelinks: relink 対象の試打数 (UI で「N 件付け替え」と表示)
function countRelinks(trials, removedItem, type) {
  const _trials = Array.isArray(trials) ? trials : [];
  if (!removedItem || !removedItem.id) return 0;
  if (type === "practice") {
    const removedId = removedItem.id;
    return _trials.filter(tr => tr && tr.linkedPracticeId === removedId).length;
  }
  return 0;
}
