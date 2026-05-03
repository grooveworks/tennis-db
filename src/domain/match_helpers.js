// match_helpers — Match 編集 / GameTracker のための純関数群
//
// 役割:
//   - blankMatch: 大会内 match の初期値 (v3 移植 + opponent2 / changeovers サポート)
//   - addGameAndMaybeCO: ゲーム追加。奇数ゲーム後なら pendingCO を返す (TENNIS_RULES.md §2.1)
//   - removeGameAt: index 指定でゲーム削除、以降のゲーム index と changeovers[].afterGame を再計算
//   - replaceGameWinner: index 指定で winner を切替
//   - upsertChangeover / removeChangeover: CO の追記・上書き・削除
//   - ゲーム削除に伴う orphan CO の cleanup (削除されたゲームより後ろの CO の afterGame を 1 ずつ前へ)
//
// 仕様: TENNIS_RULES.md §2.1 / §13
//   - CO 自動発動: games.length % 2 === 1 (奇数ゲーム終了後 = 1G, 3G, 5G, 7G, 9G, 11G 後)
//   - v2 (v2_index.html:383) は % 2 === 0 で誤実装、v4 で修正
//
// 罠:
//   - ゲーム削除時、その前後の CO afterGame を再計算しないと表示位置がずれる
//   - changeovers[].afterGame は 1-based (1G 後 = afterGame:1)
//   - games[] は 0-based の配列 (index 0 = ゲーム 1)

const blankMatch = (matchCount, defaultsFromTournament) => {
  const t = defaultsFromTournament || {};
  return {
    id: genId(),
    round: `${matchCount + 1}回戦`,
    opponent: "",
    opponent2: "",
    racketName:   t.racketName   || "",
    stringMain:   t.stringMain   || "",
    stringCross:  t.stringCross  || "",
    tensionMain:  t.tensionMain  || "",
    tensionCross: t.tensionCross || "",
    result: "勝利",
    setScores: [],
    mental: 3,
    physical: 3,
    mentalNote: "",
    techNote: "",
    opponentNote: "",
    note: "",
    games: [],
    changeovers: [],
  };
};

// CO プロンプトを発動すべきか (奇数ゲーム後判定)
// TENNIS_RULES.md §2.1 / §13
const shouldPromptCO = (gamesLength) => gamesLength % 2 === 1;

// ゲーム追加。新 match と「pendingCO 発動するか (= afterGame 番号 or null)」を返す
const addGame = (match, winner) => {
  const games = Array.isArray(match.games) ? match.games : [];
  const newGames = [...games, { id: genId(), winner }];
  const next = { ...match, games: newGames };
  const promptAfterGame = shouldPromptCO(newGames.length) ? newGames.length : null;
  return { match: next, promptAfterGame };
};

// 直近のゲームを削除。直後の CO (afterGame === games.length) も同時撤回。
const removeLastGame = (match) => {
  const games = Array.isArray(match.games) ? match.games : [];
  if (games.length === 0) return match;
  const removedAfterGame = games.length;
  const newGames = games.slice(0, -1);
  const cos = Array.isArray(match.changeovers) ? match.changeovers : [];
  const newCOs = cos.filter(co => co.afterGame !== removedAfterGame);
  return { ...match, games: newGames, changeovers: newCOs };
};

// 任意 index のゲームを削除。以降のゲームは順送りで詰まる。
// changeovers[].afterGame は「削除された位置以降」を 1 ずつ前へ。
// 削除されたゲーム位置 (index+1) と一致する CO は削除 (orphan 化を避ける)。
const removeGameAt = (match, index) => {
  const games = Array.isArray(match.games) ? match.games : [];
  if (index < 0 || index >= games.length) return match;
  const newGames = [...games.slice(0, index), ...games.slice(index + 1)];
  const removedAfterGame = index + 1; // 1-based
  const cos = Array.isArray(match.changeovers) ? match.changeovers : [];
  const newCOs = cos
    .filter(co => co.afterGame !== removedAfterGame) // 削除されたゲーム直後の CO は消す
    .map(co => co.afterGame > removedAfterGame ? { ...co, afterGame: co.afterGame - 1 } : co);
  return { ...match, games: newGames, changeovers: newCOs };
};

// 任意 index のゲームの winner を切替
const replaceGameWinner = (match, index, winner) => {
  const games = Array.isArray(match.games) ? match.games : [];
  if (index < 0 || index >= games.length) return match;
  const newGames = games.map((g, i) => i === index ? { ...g, winner } : g);
  return { ...match, games: newGames };
};

// CO の追記・上書き (afterGame をキーに同じ番号の CO は置換)
const upsertChangeover = (match, co) => {
  const cos = Array.isArray(match.changeovers) ? match.changeovers : [];
  const newCOs = [...cos.filter(c => c.afterGame !== co.afterGame), co];
  newCOs.sort((a, b) => a.afterGame - b.afterGame);
  return { ...match, changeovers: newCOs };
};

// CO の削除
const removeChangeover = (match, afterGame) => {
  const cos = Array.isArray(match.changeovers) ? match.changeovers : [];
  return { ...match, changeovers: cos.filter(c => c.afterGame !== afterGame) };
};

// 全ゲーム/CO を消去 (試合丸ごとやり直し)
const resetGameTracker = (match) => ({ ...match, games: [], changeovers: [] });

// 直近までの累計スコア (UI 表示用)
const computeRunningScore = (games) => {
  const list = Array.isArray(games) ? games : [];
  return list.reduce((acc, g) => {
    if (g.winner === "me") acc.me++;
    else if (g.winner === "opp") acc.opp++;
    return acc;
  }, { me: 0, opp: 0 });
};

// H-23 (Phase A 監査): ラケット使用統計を domain 層に集約。
//   旧: GearTab._computeUsage と RacketDetailView._computeRacketUsage が重複定義
//        微妙な差異があり (GearTab 側は H-9 反映漏れ)、片方だけ修正される懸念があった
//   新: 単一の純関数として両者から呼ぶ
//   返り値: { past30: 直近30日使用数, total: 通算, wins, matchTotal, winRate (% or null) }
const computeRacketUsage = (racketName, tournaments, practices) => {
  if (!racketName) return { past30: 0, total: 0, wins: 0, matchTotal: 0, winRate: null };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t30 = new Date(today); t30.setDate(t30.getDate() - 30);
  const inLast30 = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= t30;
  };
  let past30 = 0, total = 0, wins = 0, matchTotal = 0;
  (tournaments || []).forEach(t => {
    const used = (t.racketName === racketName)
      || (Array.isArray(t.matches) && t.matches.some(m => m && m.racketName === racketName));
    if (used) {
      total++;
      if (inLast30(t.date)) past30++;
    }
    (t.matches || []).forEach(m => {
      if (!m || m.racketName !== racketName) return;
      const norm = _normalizeMatchResult(m.result);
      if (norm !== "win" && norm !== "loss") return;
      matchTotal++;
      if (norm === "win") wins++;
    });
  });
  (practices || []).forEach(p => {
    if (!p || p.racketName !== racketName) return;
    total++;
    if (inLast30(p.date)) past30++;
  });
  const winRate = matchTotal > 0 ? Math.round((wins / matchTotal) * 100) : null;
  return { past30, total, wins, matchTotal, winRate };
};

// H-9 (Phase A 監査): match.result の表記揺れを正規化。
//   v2/v3/v4 で "勝利"/"勝"/"win" や "敗北"/"敗"/"負"/"lose"/"loss" 等が混在する。
//   返り値: "win" | "loss" | "default" (棄権) | null (不明)
//   消費側 (WeeklySummary, RacketDetailView, Insights 等) はこれを基準に集計
const _normalizeMatchResult = (result) => {
  const r = (result || "").toString().trim().toLowerCase();
  if (!r) return null;
  if (r === "勝利" || r === "勝" || r === "win" || r === "won") return "win";
  if (r === "敗北" || r === "敗" || r === "負" || r === "lose" || r === "loss" || r === "lost") return "loss";
  if (r === "棄権" || r === "default" || r === "withdraw" || r === "withdrew") return "default";
  return null;
};

// H-7 (Phase A 監査): セット完了判定を単一関数に集約。
//   旧: computeSetScoresFromGames と computeAutoMatchResult が同じ条件を二重実装
//        → 仕様変更時に片方だけ直すと割れる
//   新: _isSetComplete を共有、両関数から呼ぶ
// TENNIS_RULES.md §2.1 / §6:
//   - 通常: 6 ゲーム先取で 2 ゲーム差以上 (6-0〜6-4)
//   - 5-5 → 7 取って勝利 (7-5)
//   - 6-6 → タイブレーク (7-6)
const _isSetComplete = (me, opp) => {
  const diff = Math.abs(me - opp);
  if (me >= 6 && diff >= 2) return true;
  if (opp >= 6 && diff >= 2) return true;
  if (me === 7 && opp === 5) return true;
  if (opp === 7 && me === 5) return true;
  if (me === 7 && opp === 6) return true; // tiebreak
  if (opp === 7 && me === 6) return true;
  return false;
};

// S16.11 UX3: games[] からセットスコア配列を計算 (TENNIS_RULES §2.1, §6 準拠)
//   戻り値: ["6-3", "7-5", ...] like setScores
//   未完了セット (進行中) も最後に含める (例: 6-2 完了 + 3-2 進行中 → ["6-2", "3-2"])
const computeSetScoresFromGames = (games) => {
  const list = Array.isArray(games) ? games : [];
  if (list.length === 0) return [];
  const setScores = [];
  let me = 0, opp = 0;
  for (const g of list) {
    if (!g) continue;
    if (g.winner === "me") me++;
    else if (g.winner === "opp") opp++;
    else continue; // 不明 winner はスキップ
    if (_isSetComplete(me, opp)) {
      setScores.push(`${me}-${opp}`);
      me = 0; opp = 0;
    }
  }
  // 進行中セット (まだ完了してない games) を末尾に追加
  if (me > 0 || opp > 0) {
    setScores.push(`${me}-${opp}`);
  }
  return setScores;
};

// S16.11 UX2: games[] から match の自動勝敗判定 (TENNIS_RULES §6 準拠)
//   - 2 セット先取 (best of 3) で勝利
//   - 戻り値: "勝利" | "敗北" | null (未確定)
//   - 棄権は手動設定なのでここでは判定しない
const computeAutoMatchResult = (games) => {
  const sets = computeSetScoresFromGames(games);
  let mySetsWon = 0, oppSetsWon = 0;
  for (const s of sets) {
    const m = s.match(/^(\d+)-(\d+)$/);
    if (!m) continue;
    const me = parseInt(m[1], 10);
    const opp = parseInt(m[2], 10);
    if (isNaN(me) || isNaN(opp)) continue;
    if (!_isSetComplete(me, opp)) continue; // H-7: 共通判定関数
    if (me > opp) mySetsWon++;
    else oppSetsWon++;
  }
  if (mySetsWon >= 2) return "勝利";
  if (oppSetsWon >= 2) return "敗北";
  return null;
};
