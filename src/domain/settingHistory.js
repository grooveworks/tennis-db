// settingHistory.js — ラケットのストリングセッティング履歴を sessions から逆引きして集約
//
// 入力: 1 本のラケット名 + tournaments[] + practices[] + trials[]
// 出力: 期間ごとの「セッティング塊」配列 (新しい順)
//   各塊: { startDate, endDate, isCurrent, stringMain, stringCross, tensionMain, tensionCross,
//           practiceCount, tournamentCount, trialCount, sessions }
//
// ルール:
//   1. 全 sessions (tournaments + practices + trials) を racketName 一致でフィルタ
//      tournament は matches[] 内の racketName も対象 (混在ケース対応)
//   2. 日付昇順で並べて、stringMain/Cross/tensionMain/tensionCross の組み合わせが
//      連続して同じ間を 1 塊にする
//   3. 設定が変わったら新しい塊を始める
//   4. 最新の塊は isCurrent=true (使用中マーク用)
//   5. 「未設定」(stringMain/Cross/tensionMain/tensionCross すべて空) も塊として扱う
//   6. 出力は新しい順 (ユーザーが最新を見たい)

// 1 セッションから「セッティングシグネチャ」を作る (4 フィールドの正規化文字列)
function _settingSignature(s) {
  const main = (s?.stringMain || "").trim();
  const cross = (s?.stringCross || "").trim();
  const tMain = (s?.tensionMain || "").trim();
  const tCross = (s?.tensionCross || "").trim();
  if (!main && !cross && !tMain && !tCross) return "__empty__";
  return `${main}|${cross}|${tMain}|${tCross}`;
}

// セッティング表示用の人間可読文字列
function _settingLabel(sig) {
  if (sig === "__empty__") return "未設定 (古いデータ)";
  const [main, cross, tMain, tCross] = sig.split("|");
  const stringPart = cross ? `${main} / ${cross}` : (main || "(縦糸未設定)");
  const tensionPart = tMain && tCross
    ? (tMain === tCross ? `${tMain}` : `${tMain} / ${tCross}`)
    : (tMain || tCross || "");
  return tensionPart ? `${stringPart} / ${tensionPart}` : stringPart;
}

// メイン関数
function computeSettingHistory(racketName, tournaments, practices, trials) {
  if (!racketName) return [];

  // 1. このラケットを使った session を全部集める (type 情報付き)
  const items = [];
  (tournaments || []).forEach(t => {
    if (!t || !t.date) return;
    // tournament 自体の racketName 一致
    if (t.racketName === racketName) {
      items.push({
        type: "tournament",
        date: t.date,
        sig: _settingSignature(t),
        sessionId: t.id,
        item: t,
      });
    }
    // H-8 (Phase A 監査): matches[] 内の racketName 一致を判定。
    //   ケース 1: tournament.racketName !== racketName だが matches[i].racketName === racketName
    //     → match 単位で別ラケットを使った大会 (混在)、必ず追加
    //   ケース 2: tournament.racketName === racketName で、matches[i] が異なる setting (テンション変更等)
    //     → 大会途中で張替/変更したケース、setting sig が tournament と違う時のみ追加
    //     (旧実装はこのケースを取りこぼしていた → setting 履歴に張替が出ない)
    const tournamentSig = t.racketName === racketName ? _settingSignature(t) : null;
    (t.matches || []).forEach(m => {
      if (!m || m.racketName !== racketName) return;
      const matchSig = _settingSignature(m);
      const shouldAdd = t.racketName !== racketName  // ケース 1
                    || matchSig !== tournamentSig;    // ケース 2
      if (shouldAdd) {
        items.push({
          type: "tournament-match",
          date: t.date,
          sig: matchSig,
          sessionId: t.id,
          item: t,
        });
      }
    });
  });
  (practices || []).forEach(p => {
    if (!p || !p.date) return;
    if (p.racketName === racketName) {
      items.push({
        type: "practice",
        date: p.date,
        sig: _settingSignature(p),
        sessionId: p.id,
        item: p,
      });
    }
  });
  (trials || []).forEach(tr => {
    if (!tr || !tr.date) return;
    if (tr.racketName === racketName) {
      items.push({
        type: "trial",
        date: tr.date,
        sig: _settingSignature(tr),
        sessionId: tr.id,
        item: tr,
      });
    }
  });

  if (items.length === 0) return [];

  // 2. 日付昇順 (古い → 新しい)
  items.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

  // 3. 「使用中」のセッティングを決定: 練習 + 大会のうち最新の sig (試打は実験扱いで使用中判定に影響させない)
  //    練習・大会が 0 件 (試打のみ) の場合は最新試打の sig を使用中とする
  const nonTrialItems = items.filter(it => it.type !== "trial");
  const currentSig = nonTrialItems.length > 0
    ? nonTrialItems[nonTrialItems.length - 1].sig
    : items[items.length - 1].sig;

  // 4. シグネチャ別に集約 (同じセッティングは時系列で離れていても 1 行にまとめる)
  const groupMap = new Map();
  for (const it of items) {
    let g = groupMap.get(it.sig);
    if (!g) {
      g = {
        sig: it.sig,
        sessions: [],
        practiceCount: 0,
        tournamentCount: 0,
        trialCount: 0,
        firstDate: it.date,
        lastDate: it.date,
      };
      groupMap.set(it.sig, g);
    }
    g.sessions.push(it);
    if (it.date < g.firstDate) g.firstDate = it.date;
    if (it.date > g.lastDate) g.lastDate = it.date;
    if (it.type === "practice") g.practiceCount++;
    else if (it.type === "tournament" || it.type === "tournament-match") g.tournamentCount++;
    else if (it.type === "trial") g.trialCount++;
  }

  // 5. 最終使用日 (lastDate) の新しい順に並べる
  //    使用中のセッティングが先頭になる
  const groups = [...groupMap.values()];
  groups.sort((a, b) => {
    if (a.lastDate < b.lastDate) return 1;
    if (a.lastDate > b.lastDate) return -1;
    return 0;
  });

  return groups.map(g => ({
    startDate: g.firstDate,
    endDate: g.lastDate,
    isCurrent: g.sig === currentSig,
    settingLabel: _settingLabel(g.sig),
    settingSig: g.sig,
    practiceCount: g.practiceCount,
    tournamentCount: g.tournamentCount,
    trialCount: g.trialCount,
    sessions: g.sessions, // [{type, date, sessionId, item}]
  }));
}
