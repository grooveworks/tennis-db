// cascade — Session 削除時に試打 (trial) の連携 ID を自動クリアする純関数
//
// 役割:
//   - REQUIREMENTS_v4 N2.2: Session 削除時、参照する trial.linkedXxx を自動クリア (孤児化禁止)
//   - REQUIREMENTS_v4 N2.3: match 削除時、参照する trial.linkedMatchId を自動クリア
//   - 試打自体は削除しない (連携 ID のみ空文字に置き換える)
//
// 設計方針:
//   - 副作用なし、React に依存しない (REQUIREMENTS N3.4)
//   - type 分岐は本ファイル内の 1 箇所のみ (N3.3)
//   - tests/run.html で unit test 必須 (N3.5)
//
// 使い方:
//   const result = computeCascade({ type: "tournament", item, tournaments, practices, trials });
//   if (result.count > 0) { /* ConfirmDialog に件数を表示 */ }
//   const newTrials = applyCascadeToTrials(trials, result.affectedTrials);
//   /* save("trials", newTrials) */

// ── 影響を受ける試打を抽出 (純関数)
//
// 戻り値:
//   { affectedTrials: [{trial, clearField}], count: number }
//   clearField は "linkedMatchId" | "linkedPracticeId" のいずれか
//
// 引数:
//   type:  "tournament" | "practice" | "match" | "trial"
//   item:  削除対象 (tournament なら tournament obj、match なら match obj、…)
//   tournaments / practices / trials: 全件配列 (使わないものは省略可、{} で OK)
function computeCascade({ type, item, trials }) {
  const _trials = Array.isArray(trials) ? trials : [];
  if (!item || !item.id || !type) return { affectedTrials: [], count: 0 };

  // S16.11 UX4: linkedMatchId (旧、単一) と linkedMatchIds (新、配列) 両対応
  //   trial.linkedMatchIds が match.id を含む場合、または linkedMatchId === match.id の場合に hit
  const _trialMatchesId = (tr, mId) => {
    if (!tr || !mId) return false;
    if (tr.linkedMatchId === mId) return true;
    if (Array.isArray(tr.linkedMatchIds) && tr.linkedMatchIds.includes(mId)) return true;
    return false;
  };

  // tournament 削除 → matches[] の全 id を集めて、いずれかにリンクしている trial を抽出
  if (type === "tournament") {
    const matchIds = new Set((Array.isArray(item.matches) ? item.matches : []).map(m => m && m.id).filter(Boolean));
    if (matchIds.size === 0) return { affectedTrials: [], count: 0 };
    const affected = _trials
      .filter(tr => tr && [...matchIds].some(mId => _trialMatchesId(tr, mId)))
      .map(tr => ({ trial: tr, clearField: "linkedMatchId", removeMatchIds: [...matchIds].filter(mId => _trialMatchesId(tr, mId)) }));
    return { affectedTrials: affected, count: affected.length };
  }

  // practice 削除 → linkedPracticeId === practice.id の trial を抽出
  if (type === "practice") {
    const affected = _trials
      .filter(tr => tr && tr.linkedPracticeId === item.id)
      .map(tr => ({ trial: tr, clearField: "linkedPracticeId" }));
    return { affectedTrials: affected, count: affected.length };
  }

  // match 削除 (大会編集画面内) → linkedMatchId === match.id または linkedMatchIds に含まれる trial を抽出
  if (type === "match") {
    const affected = _trials
      .filter(tr => tr && _trialMatchesId(tr, item.id))
      .map(tr => ({ trial: tr, clearField: "linkedMatchId", removeMatchIds: [item.id] }));
    return { affectedTrials: affected, count: affected.length };
  }

  // trial は連携元、cascade 対象外
  return { affectedTrials: [], count: 0 };
}

// ── 影響を受ける試打配列に対して、対象フィールドを空文字にした新配列を返す
//
// 元配列は変更しない。affectedTrials が空ならそのまま元配列を返す。
// S16.11 UX4: removeMatchIds が指定された場合、linkedMatchIds[] からその id を filter する
//   (旧 linkedMatchId は clearField で空文字化、新 linkedMatchIds[] は対象 id のみ削除)
function applyCascadeToTrials(trials, affectedTrials) {
  const _trials = Array.isArray(trials) ? trials : [];
  const _affected = Array.isArray(affectedTrials) ? affectedTrials : [];
  if (_affected.length === 0) return _trials;

  // trial.id → { clearField, removeMatchIds } のマップを作る
  const updateMap = new Map();
  for (const a of _affected) {
    if (a && a.trial && a.trial.id) {
      updateMap.set(a.trial.id, { clearField: a.clearField, removeMatchIds: a.removeMatchIds });
    }
  }
  if (updateMap.size === 0) return _trials;

  return _trials.map(tr => {
    if (!tr || !tr.id || !updateMap.has(tr.id)) return tr;
    const { clearField, removeMatchIds } = updateMap.get(tr.id);
    let updated = { ...tr };
    // 旧 single field をクリア (該当する id のみ消す、無関係な linkedMatchId は触らない)
    if (clearField === "linkedMatchId" && Array.isArray(removeMatchIds)) {
      if (removeMatchIds.includes(updated.linkedMatchId)) {
        updated.linkedMatchId = "";
      }
    } else if (clearField) {
      updated[clearField] = "";
    }
    // 新 linkedMatchIds[] から対象 id を filter
    if (Array.isArray(removeMatchIds) && Array.isArray(updated.linkedMatchIds)) {
      updated.linkedMatchIds = updated.linkedMatchIds.filter(id => !removeMatchIds.includes(id));
    }
    return updated;
  });
}

// ── ConfirmDialog 本文用の文言を生成 (UI 文言を 1 箇所に集約、preview_s13 と一致)
//
// type に応じた種別ラベルを埋め込み、count が 0 なら追加文言を出さない。
function describeCascadeMessage(type, count) {
  const label = type === "tournament" ? "大会"
              : type === "practice"   ? "練習"
              : type === "match"      ? "試合"
              : type === "trial"      ? "試打"
              : "";
  if (!label) return { title: "削除の確認", body: "削除しますか？", warn: "この操作は取り消せません。" };

  const title = type === "match" ? "試合記録を削除" : `${label}を削除`;
  if (!count || count <= 0) {
    return {
      title,
      body: `この${label}を削除しますか？`,
      warn: "この操作は取り消せません。",
    };
  }
  return {
    title,
    body: `この${label}を削除すると、紐付いた試打 ${count} 件の連携情報が外れます。`,
    note: "(試打自体は残ります)",
    warn: "この操作は取り消せません。",
  };
}
