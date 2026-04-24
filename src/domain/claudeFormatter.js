// Claude Formatter — Session を Claude に渡せる Markdown 形式へ整形 (§F8.1)
// 純関数のみ (§N3.4)、React/DOM/副作用ゼロ
// 入出力は string。呼び出し側が copyToClipboard に渡す。
// v3 の formatXxxForClaude (v3/index.html:447-493) を v4 schema (stringMain/stringCross/tensionMain/tensionCross) に合わせて再実装

const _fmtDateFull = (d) => {
  if (!d) return "";
  const iso = normDate(d);
  const dt = new Date(iso + "T00:00:00");
  if (isNaN(dt.getTime())) return iso;
  const wd = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return `${iso} (${wd})`;
};

const _fmtTension = (main, cross) => {
  const m = main ? String(main).trim() : "";
  const c = cross ? String(cross).trim() : "";
  if (m && c && m !== c) return `${m}/${c}p`;
  if (m) return `${m}p`;
  return "";
};

const _fmtStrings = (main, cross) => {
  const m = main ? String(main).trim() : "";
  const c = cross ? String(cross).trim() : "";
  if (m && c && m !== c) return `${m} × ${c}`;
  if (m) return m;
  if (c) return c;
  return "";
};

const formatMatchForClaude = (m, trn) => {
  let s = `## 試合: ${trn?.name || ""} ${m.round || ""}\n`;
  s += `日付: ${_fmtDateFull(trn?.date)}\n`;
  s += `対戦相手: ${m.opponent || "不明"}${m.opponent2 ? " / " + m.opponent2 : ""}\n`;
  if (m.result) s += `結果: ${m.result}\n`;
  const scores = Array.isArray(m.setScores) ? m.setScores.filter(Boolean) : [];
  if (scores.length) s += `スコア: ${scores.join(" / ")}\n`;
  const gear = [m.racketName, _fmtStrings(m.stringMain, m.stringCross), _fmtTension(m.tensionMain, m.tensionCross)].filter(Boolean).join(" / ");
  if (gear) s += `機材: ${gear}\n`;
  if (m.mental) s += `メンタル: ${m.mental}/5\n`;
  if (m.physical) s += `フィジカル: ${m.physical}/5\n`;
  if (m.mentalNote)   s += `メンタルメモ: ${m.mentalNote}\n`;
  if (m.techNote)     s += `技術メモ: ${m.techNote}\n`;
  if (m.opponentNote) s += `相手メモ: ${m.opponentNote}\n`;
  if (m.note)         s += `試合メモ: ${m.note}\n`;
  return s;
};

const formatTournamentAllForClaude = (trn) => {
  if (!trn) return "";
  let s = `# 大会: ${trn.name || ""} (${_fmtDateFull(trn.date)})\n`;
  if (trn.type || trn.level) s += `形式: ${trn.type || ""}${trn.level ? " / " + trn.level : ""}\n`;
  if (trn.venue) s += `会場: ${trn.venue}\n`;
  if (trn.overallResult) s += `結果: ${trn.overallResult}\n`;
  const gear = [trn.racketName, _fmtStrings(trn.stringMain, trn.stringCross), _fmtTension(trn.tensionMain, trn.tensionCross)].filter(Boolean).join(" / ");
  if (gear) s += `機材: ${gear}\n`;
  if (trn.temp || trn.weather) s += `気象: ${[trn.temp ? trn.temp + "℃" : "", trn.weather].filter(Boolean).join(" / ")}\n`;
  if (trn.generalNote) s += `総括: ${trn.generalNote}\n`;
  s += "\n";
  (trn.matches || []).forEach(m => { s += formatMatchForClaude(m, trn) + "\n"; });
  return s;
};

const formatPracticeForClaude = (p) => {
  if (!p) return "";
  let s = `# 練習: ${_fmtDateFull(p.date)}`;
  if (p.title) s += ` / ${p.title}`;
  s += "\n";
  if (p.venue) s += `会場: ${p.venue}\n`;
  if (p.type)  s += `種別: ${p.type}\n`;
  if (p.duration) s += `時間: ${p.duration}分\n`;
  if (p.timeRange)       s += `時間帯: ${p.timeRange}\n`;
  if (p.workoutLocation) s += `ワークアウト位置: ${p.workoutLocation}\n`;
  const gear = [p.racketName, _fmtStrings(p.stringMain, p.stringCross), _fmtTension(p.tensionMain, p.tensionCross)].filter(Boolean).join(" / ");
  if (gear) s += `機材: ${gear}\n`;
  if (p.temp || p.weather) s += `気象: ${[p.temp ? p.temp + "℃" : "", p.weather].filter(Boolean).join(" / ")}\n`;
  if (p.physical) s += `体調: ${p.physical}/5\n`;
  if (p.focus)    s += `集中: ${p.focus}/5\n`;
  if (p.heartRateAvg)  s += `平均心拍: ${p.heartRateAvg}bpm\n`;
  if (p.calories)      s += `Active: ${p.calories}kcal\n`;
  if (p.totalCalories) s += `合計: ${p.totalCalories}kcal\n`;
  const zones = [["Z1", p.hrZone1], ["Z2", p.hrZone2], ["Z3", p.hrZone3], ["Z4", p.hrZone4], ["Z5", p.hrZone5]].filter(([, v]) => v);
  if (zones.length) s += `心拍ゾーン: ${zones.map(([l, v]) => `${l}=${v}`).join(" / ")}\n`;
  if (p.recoveryHR)  s += `回復心拍: ${p.recoveryHR}\n`;
  if (p.coachNote)   s += `コーチメモ: ${p.coachNote}\n`;
  if (p.goodNote)    s += `良かった点: ${p.goodNote}\n`;
  if (p.improveNote) s += `改善点: ${p.improveNote}\n`;
  if (p.generalNote) s += `メモ: ${p.generalNote}\n`;
  return s;
};

const formatTrialForClaude = (t) => {
  if (!t) return "";
  let s = `# 試打: ${t.racketName || ""} / ${_fmtStrings(t.stringMain, t.stringCross)}\n`;
  s += `日付: ${_fmtDateFull(t.date)}`;
  const tens = _fmtTension(t.tensionMain, t.tensionCross);
  if (tens) s += ` / テンション: ${tens}`;
  s += "\n";
  if (t.venue)    s += `場所: ${t.venue}\n`;
  if (t.judgment) s += `判定: ${t.judgment}\n`;
  const evals = [
    ["スピン", t.spin], ["推進力", t.power], ["コントロール", t.control],
    ["打感情報", t.info], ["操作性", t.maneuver], ["振り抜き", t.swingThrough],
  ].filter(([, v]) => v);
  if (evals.length) s += `打感評価: ${evals.map(([l, v]) => `${l}${v}`).join(" / ")}\n`;
  if (t.trajectory || t.stiffness) {
    const feat = [["弾道(低↔高)", t.trajectory], ["打感(柔↔硬)", t.stiffness]].filter(([, v]) => v);
    s += `特性: ${feat.map(([l, v]) => `${l}${v}`).join(" / ")}\n`;
  }
  const shots = [
    ["フォア攻", t.shotForeAtk], ["フォア守", t.shotForeDef],
    ["バック攻", t.shotBackAtk], ["バック守", t.shotBackDef],
    ["サーブ", t.shotServe], ["リターン", t.shotReturn],
    ["ボレー", t.shotVolley], ["スライス", t.shotSlice],
  ].filter(([, v]) => v);
  if (shots.length) s += `ショット別: ${shots.map(([l, v]) => `${l}${v}`).join(" / ")}\n`;
  if (t.confidence)  s += `安心感: ${t.confidence}/5\n`;
  if (t.strokeNote)  s += `ストローク: ${t.strokeNote}\n`;
  if (t.serveNote)   s += `サーブメモ: ${t.serveNote}\n`;
  if (t.volleyNote)  s += `ボレーメモ: ${t.volleyNote}\n`;
  if (t.generalNote) s += `総括: ${t.generalNote}\n`;
  return s;
};
