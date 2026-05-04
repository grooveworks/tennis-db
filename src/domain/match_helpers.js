// match_helpers — Match 編集 / GameTracker のための純関数群
//
// 役割:
//   - blankMatch: 大会内 match の初期値 (v3 移植 + opponent2 / changeovers サポート)
//   - addGameAndMaybeCO: ゲーム追加。奇数ゲーム後なら pendingCO を返す (TENNIS_RULES.md §2.1)
//   - removeGameAt: index 指定でゲーム削除、以降のゲーム index と changeovers[].afterGame を再計算
//   - replaceGameWinner: index 指定で winner を切替
//   - upsertChangeover / removeChangeover: CO の追記・上書き・削除
//   - ゲーム削除に伴う orphan CO の cleanup (削除されたゲームより後ろの CO の afterGame を 1 ずつ前へ)
//   - リク 30-e (S18): 試合形式 (matchFormat) 対応 (TENNIS_RULES.md §3.1)
//     1set / 3set / 6game / 4game / custom + 1-1 で matchTiebreak10
//
// 仕様: TENNIS_RULES.md §2.1 / §3.1 / §13
//   - CO 自動発動: games.length % 2 === 1 (奇数ゲーム終了後 = 1G, 3G, 5G, 7G, 9G, 11G 後)
//   - v2 (v2_index.html:383) は % 2 === 0 で誤実装、v4 で修正
//
// 罠:
//   - ゲーム削除時、その前後の CO afterGame を再計算しないと表示位置がずれる
//   - changeovers[].afterGame は 1-based (1G 後 = afterGame:1)
//   - games[] は 0-based の配列 (index 0 = ゲーム 1)

// リク 30-e (S18): 試合形式プリセット (TENNIS_RULES.md §3.1)
//   - 1set:  1 セットマッチ (= 6 ゲームマッチ、差 2、6-6 で 7pt TB)
//   - 3set:  3 セットマッチ (1 セットマッチ × 2 セット先取)
//   - 6game: 6 ゲーム先取 (草トー時短、5-5 で次取った方勝ち、TB なし)
//   - 4game: 4 ゲーム先取 (ショートセット、3-3 で次取った方勝ち、TB なし)
const MATCH_FORMAT_PRESETS = {
  "1set":  { setTargetGames:6, setMinDiff:2, tiebreakAt:"6-6",   tiebreakPoints:7,    bestOfSets:1, finalSetMode:"normal" },
  "3set":  { setTargetGames:6, setMinDiff:2, tiebreakAt:"6-6",   tiebreakPoints:7,    bestOfSets:2, finalSetMode:"normal" },
  "6game": { setTargetGames:6, setMinDiff:1, tiebreakAt:"never", tiebreakPoints:null, bestOfSets:1, finalSetMode:"normal" },
  "4game": { setTargetGames:4, setMinDiff:1, tiebreakAt:"never", tiebreakPoints:null, bestOfSets:1, finalSetMode:"normal" },
};

// デフォルト matchFormat (旧データ後方互換 — 旧仕様は 3set 標準 + 1-1 で第 3 セット継続)
const DEFAULT_MATCH_FORMAT = { ...MATCH_FORMAT_PRESETS["3set"], preset:"3set", noAd:false };

// 大会 / 試合 から有効な format を解決:
//   match.format > tournament.matchFormat > DEFAULT_MATCH_FORMAT
const resolveMatchFormat = (match, tournament) => {
  if (match && match.format && typeof match.format === "object") return match.format;
  if (tournament && tournament.matchFormat && typeof tournament.matchFormat === "object") return tournament.matchFormat;
  return DEFAULT_MATCH_FORMAT;
};

// プリセット名 + (3set 時のみ) finalSetMode から format object を構築 (UI 用)
const formatFromPreset = (preset, finalSetMode = "normal", noAd = false) => {
  const base = MATCH_FORMAT_PRESETS[preset];
  if (!base) return DEFAULT_MATCH_FORMAT;
  return {
    preset,
    ...base,
    // 3set のみ finalSetMode を上書き許可 (1-1 で 10pt TB トグル)
    ...(preset === "3set" ? { finalSetMode } : {}),
    noAd,
  };
};

// format object → 表示用ラベル (UI: バッジ・モーダル冒頭の継承表示等)
const formatLabel = (format) => {
  if (!format) return "3 セットマッチ";
  const p = format.preset;
  if (p === "1set")  return "1 セットマッチ";
  if (p === "3set") {
    return format.finalSetMode === "matchTiebreak10"
      ? "3 セットマッチ (1-1 で 10pt TB)"
      : "3 セットマッチ";
  }
  if (p === "6game") return "6 ゲーム先取";
  if (p === "4game") return "4 ゲーム先取";
  if (p === "custom") return `カスタム (${format.setTargetGames} ゲーム/差 ${format.setMinDiff})`;
  return p || "3 セットマッチ";
};

// format object の短い説明 (TB ルール等)
const formatRuleSummary = (format) => {
  const f = format || DEFAULT_MATCH_FORMAT;
  const p = f.preset;
  if (p === "6game") return "6 ゲーム取った時点で勝ち (5-5 で次取った方勝ち、TB なし)";
  if (p === "4game") return "4 ゲーム取った時点で勝ち (3-3 で次取った方勝ち、TB なし)";
  if (p === "1set")  return "6 ゲーム先取 (差 2)、6-6 で 7pt TB、1 セットで決着";
  if (p === "3set") {
    return f.finalSetMode === "matchTiebreak10"
      ? "6 ゲーム先取 (差 2)、6-6 で 7pt TB、2 セット先取。1-1 なら 10pt マッチ TB で決着"
      : "6 ゲーム先取 (差 2)、6-6 で 7pt TB、2 セット先取";
  }
  // custom
  const tbDesc = f.tiebreakAt === "never" ? "TB なし" : `${f.tiebreakAt} で ${f.tiebreakPoints}pt TB`;
  return `${f.setTargetGames} ゲーム先取・差 ${f.setMinDiff}、${tbDesc}、${f.bestOfSets} セット先取`;
};

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
    result: "", // リクエスト 30-b: デフォルト「未定」(空文字)、ユーザーが意図的に選んだ時のみ値が入る
    setScores: [],
    mental: 3,
    physical: 3,
    mentalNote: "",
    techNote: "",
    opponentNote: "",
    note: "",
    games: [],
    changeovers: [],
    format: null, // null = 大会の matchFormat を継承。試合ごとに上書きしたい時のみ object
    // リク 30-e Phase B (S18): 各セットの TB 詳細 (index = setIndex 0-based)。
    //   { type: "regular" | "match10", winner: "me"|"opp", loser: number } | null
    //   未入力なら setScores はシンプル表記 ("7-6" / "1-0") のまま
    tbDetails: [],
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
// リク 30-e (S18): format 引数を取って草トーローカルルールに対応
// TENNIS_RULES.md §2.1 / §3.1:
//   - 1set/3set: 6 先取・差 2、5-5→7-5、6-6→TB (7-6)
//   - 6game (草トー): 5-5 で次取った方勝ち (6-5 で終了)
//   - 4game (ショートセット): 3-3 で次取った方勝ち (4-3 で終了)
const _isSetComplete = (me, opp, format) => {
  const f = format || DEFAULT_MATCH_FORMAT;
  const target = f.setTargetGames;
  const minDiff = f.setMinDiff;
  const tbAt = f.tiebreakAt;
  const diff = Math.abs(me - opp);

  // 標準勝利: target ゲーム到達 + 必要な差
  if (me >= target && diff >= minDiff) return true;
  if (opp >= target && diff >= minDiff) return true;

  // setMinDiff=2 の特殊 (target=6 限定): 5-5 → 7-5 まで延長、6-6 で TB (1 ゲームで決着)
  if (minDiff === 2 && target === 6) {
    if (me === 7 && opp === 5) return true;
    if (opp === 7 && me === 5) return true;
    if (tbAt === "6-6") {
      if (me === 7 && opp === 6) return true;
      if (opp === 7 && me === 6) return true;
    }
  }

  // 5-5 で TB (草トー一部、target=6 限定)
  if (tbAt === "5-5" && target === 6) {
    if (me === 6 && opp === 5) return true;
    if (opp === 6 && me === 5) return true;
  }

  // 4-4 で TB (target=4 限定)
  if (tbAt === "4-4" && target === 4) {
    if (me === 5 && opp === 4) return true;
    if (opp === 5 && me === 4) return true;
  }

  // 8-8 で TB (target=8 プロセット限定)
  if (tbAt === "8-8" && target === 8) {
    if (me === 9 && opp === 8) return true;
    if (opp === 9 && me === 8) return true;
  }

  return false;
};

// リク 30-e (S18): games[] からセットスコア配列を計算 (format 適用、TENNIS_RULES §3.1 準拠)
//   戻り値: ["6-3", "7-5", ...] like setScores
//   未完了セット (進行中) も最後に含める (例: 6-2 完了 + 3-2 進行中 → ["6-2", "3-2"])
//   matchTiebreak10 mode: bestOfSets-1 同点になった次のセットは 1 ゲーム = matchTB
//     setScores に "1-0" or "0-1" として記録 (詳細 10-7 等は setScores text input で上書き可)
const computeSetScoresFromGames = (games, format) => {
  const list = Array.isArray(games) ? games : [];
  if (list.length === 0) return [];
  const f = format || DEFAULT_MATCH_FORMAT;
  const needSets = f.bestOfSets || 1;
  const useMatchTB = f.finalSetMode === "matchTiebreak10";

  const setScores = [];
  let me = 0, opp = 0;
  let mySets = 0, oppSets = 0;

  for (const g of list) {
    if (!g) continue;
    const w = g.winner;
    if (w !== "me" && w !== "opp") continue; // 不明 winner はスキップ

    // matchTB 突入後 (1-1 等の同点): 1 ゲーム = matchTB 勝利
    if (useMatchTB && mySets === needSets - 1 && oppSets === needSets - 1) {
      setScores.push(w === "me" ? "1-0" : "0-1");
      if (w === "me") mySets++; else oppSets++;
      me = 0; opp = 0;
      break; // matchTB で試合終了
    }

    if (w === "me") me++; else opp++;

    if (_isSetComplete(me, opp, f)) {
      setScores.push(`${me}-${opp}`);
      if (me > opp) mySets++; else oppSets++;
      me = 0; opp = 0;
      // bestOfSets 達成 → 試合終了 (以降のゲームは無視)
      if (mySets >= needSets || oppSets >= needSets) break;
    }
  }
  // 進行中セット (まだ完了してない games) を末尾に追加
  if (me > 0 || opp > 0) {
    setScores.push(`${me}-${opp}`);
  }
  return setScores;
};

// リク 30-e Phase B (S18): 現在進行セットがタイブレーク状態か判定。GameTracker の TB 入力 banner 用。
//   戻り値:
//     { type: null,         isInTB: false, setIndex }   ← 通常進行 or 試合終了
//     { type: "regular",    isInTB: true,  setIndex }   ← 通常 TB (例: 6-6 で発動)
//     { type: "match10",    isInTB: true,  setIndex }   ← マッチ TB (1-1 で 10pt 置換)
//   setIndex = 完了済セット数 (0-based、TB 進行中セットの index と一致)
const computeTbState = (games, format) => {
  const list = Array.isArray(games) ? games : [];
  const f = format || DEFAULT_MATCH_FORMAT;
  const needSets = f.bestOfSets || 1;
  const useMatchTB = f.finalSetMode === "matchTiebreak10";
  let me = 0, opp = 0;
  let mySets = 0, oppSets = 0;
  let setIndex = 0;

  for (const g of list) {
    if (!g) continue;
    const w = g.winner;
    if (w !== "me" && w !== "opp") continue;

    // matchTB10 突入後 (1-1 等): このゲームを matchTB の決着ゲームとして処理 (1 ゲーム = 試合決着)
    if (useMatchTB && mySets === needSets - 1 && oppSets === needSets - 1) {
      if (w === "me") mySets++; else oppSets++;
      setIndex++;
      return { type: null, isInTB: false, setIndex };
    }

    if (w === "me") me++; else opp++;

    if (_isSetComplete(me, opp, f)) {
      if (me > opp) mySets++; else oppSets++;
      me = 0; opp = 0;
      setIndex++;
      if (mySets >= needSets || oppSets >= needSets) {
        return { type: null, isInTB: false, setIndex };
      }
    }
  }
  // 進行中セットの状態判定
  if (useMatchTB && mySets === needSets - 1 && oppSets === needSets - 1 && me === 0 && opp === 0) {
    return { type: "match10", isInTB: true, setIndex };
  }
  if (f.tiebreakAt === "6-6" && me === 6 && opp === 6) {
    return { type: "regular", isInTB: true, setIndex };
  }
  if (f.tiebreakAt === "5-5" && me === 5 && opp === 5) {
    return { type: "regular", isInTB: true, setIndex };
  }
  if (f.tiebreakAt === "4-4" && me === 4 && opp === 4) {
    return { type: "regular", isInTB: true, setIndex };
  }
  return { type: null, isInTB: false, setIndex };
};

// リク 30-e Phase B (S18): setScores と tbDetails を組み合わせて詳細表記版を返す
//   通常 TB: "7-6" → "7-6(5)" (loser=5)
//   matchTB10: "1-0" → "10-7" (me 勝ち + loser=7)、"0-1" → "7-10" (opp 勝ち + loser=7)
//   tbDetails が無い / loser 未入力 / フォーマット不一致なら元の score をそのまま返す
const applyTbDetails = (setScores, tbDetails) => {
  const sc = Array.isArray(setScores) ? setScores : [];
  const td = Array.isArray(tbDetails) ? tbDetails : [];
  return sc.map((score, i) => {
    const detail = td[i];
    if (!detail || typeof detail.loser !== "number") return score;
    if (detail.type === "regular") {
      // 7-6 / 6-7 のみ装飾対象 (それ以外の score は不整合なので無視)
      if (score === "7-6" || score === "6-7") return `${score}(${detail.loser})`;
      return score;
    }
    if (detail.type === "match10") {
      if (score === "1-0") return `10-${detail.loser}`;
      if (score === "0-1") return `${detail.loser}-10`;
      return score;
    }
    return score;
  });
};

// リク 30-e (S18): games[] から match の自動勝敗判定 (format 適用、TENNIS_RULES §3.1 準拠)
//   - bestOfSets 達成で勝敗確定
//   - matchTiebreak10 mode で 1-1 後の次ゲームは 10pt TB 勝者扱い
//   - 戻り値: "勝利" | "敗北" | null (未確定)
//   - 棄権は手動設定なのでここでは判定しない
const computeAutoMatchResult = (games, format) => {
  const list = Array.isArray(games) ? games : [];
  const f = format || DEFAULT_MATCH_FORMAT;
  const needSets = f.bestOfSets || 1;
  const useMatchTB = f.finalSetMode === "matchTiebreak10";

  let mySets = 0, oppSets = 0;
  let me = 0, opp = 0;

  for (const g of list) {
    if (!g) continue;
    const w = g.winner;
    if (w !== "me" && w !== "opp") continue;

    // matchTB: 1 ゲームで決着
    if (useMatchTB && mySets === needSets - 1 && oppSets === needSets - 1) {
      return w === "me" ? "勝利" : "敗北";
    }

    if (w === "me") me++; else opp++;

    if (_isSetComplete(me, opp, f)) {
      if (me > opp) mySets++; else oppSets++;
      me = 0; opp = 0;
      if (mySets >= needSets) return "勝利";
      if (oppSets >= needSets) return "敗北";
    }
  }
  return null;
};
