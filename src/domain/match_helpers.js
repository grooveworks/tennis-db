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

// S16.11 UX3: games[] からセットスコア配列を計算 (TENNIS_RULES §2.1, §6 準拠)
//   セット獲得条件:
//     - 通常: 6 ゲーム先取 (相手と 2 ゲーム差以上)
//     - 5-5 → 7 ゲーム先取で勝利
//     - 6-6 → タイブレーク (= 13 ゲーム目 = winner=tiebreak は special、本実装では games[] の最後の 1 ゲームを TB として扱う)
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
    // セット完了判定
    const total = me + opp;
    const diff = Math.abs(me - opp);
    let setComplete = false;
    if (me >= 6 && diff >= 2) setComplete = true;
    else if (opp >= 6 && diff >= 2) setComplete = true;
    else if (me === 7 && opp === 5) setComplete = true;
    else if (opp === 7 && me === 5) setComplete = true;
    else if (me === 7 && opp === 6) setComplete = true; // tiebreak win
    else if (opp === 7 && me === 6) setComplete = true;
    if (setComplete) {
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
    // セットが完了しているかチェック (上の computeSetScoresFromGames の判定と同じ条件)
    const diff = Math.abs(me - opp);
    let setComplete = false;
    if (me >= 6 && diff >= 2) setComplete = true;
    else if (opp >= 6 && diff >= 2) setComplete = true;
    else if (me === 7 && opp === 5) setComplete = true;
    else if (opp === 7 && me === 5) setComplete = true;
    else if (me === 7 && opp === 6) setComplete = true;
    else if (opp === 7 && me === 6) setComplete = true;
    if (!setComplete) continue;
    if (me > opp) mySetsWon++;
    else oppSetsWon++;
  }
  if (mySetsWon >= 2) return "勝利";
  if (oppSetsWon >= 2) return "敗北";
  return null;
};
