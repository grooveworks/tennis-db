// Consult Export — 「現在地」を外部 Claude (Project) に貼り付けられる Markdown へ書き出す
// (DESIGN_LOG 2026-06-04 参照)
// 目的: Project ナレッジの手更新を廃し、アプリの生 Firestore データを 1 タップでコピー → 会話に貼る鮮度の橋。
// 方針:
//   - 値は raw のまま (データ変換禁止、2026-05-03 データ破壊事故の教訓)。整形は表示用のみ。
//   - 機材・試打・戦績は lsLoad(KEYS.x) から (SettingsModal _exportAllData と同方式)。
//   - 保留/決定 (ワンセット) は Firestore aiContext から直読み (localStorage 同期外のため)。
//   - 既存 claudeFormatter (formatTrialForClaude / formatTournamentAllForClaude) を流用。
// 純粋: DOM 副作用なし。1 回の Firestore read のみ。呼び出し側が copyToClipboard に渡す。

const _CONSULT_EXPORT_TRIALS = 12;   // 直近の試打 件数
const _CONSULT_EXPORT_TRNS = 8;      // 直近の戦績 (大会) 件数

const _ceByDateDesc = (a, b) => {
  const ka = normDate((a && a.date) || "") || "";
  const kb = normDate((b && b.date) || "") || "";
  if (ka < kb) return 1;
  if (ka > kb) return -1;
  return 0;
};

// ① 現在の機材 (役割・status 付き) + 現行セッティング
const _ceGearSection = () => {
  const rackets = lsLoad(KEYS.rackets) || [];
  const setups = lsLoad(KEYS.stringSetups) || [];
  const lines = ["## 現在の機材"];
  if (rackets.length) {
    rackets.forEach(r => {
      const head = [r.name, r.role, r.status, r.tension].filter(Boolean).join(" / ");
      if (head) lines.push("- " + head + (r.note ? "（" + r.note + "）" : ""));
    });
  } else {
    lines.push("- (ラケット登録なし)");
  }
  const active = setups.filter(s => !s.status || s.status === "active");
  if (active.length) {
    lines.push("");
    lines.push("**現行ストリングセット**");
    active.forEach(s => {
      const main = s.stringMain || "";
      const cross = (s.stringCross && s.stringCross !== main) ? " × " + s.stringCross : "";
      const label = s.label || (main + cross);
      if (label) lines.push("- " + label + (s.note ? "（" + s.note + "）" : ""));
    });
  }
  return lines.join("\n");
};

// 保留/決定 (ワンセット) を Firestore aiContext から取得
const _ceDecisionsSection = async () => {
  const uid = (typeof fbAuth !== "undefined" && fbAuth && fbAuth.currentUser) ? fbAuth.currentUser.uid : null;
  if (!uid || typeof fbDb === "undefined" || !fbDb) {
    return "## 保留・決定\n(未ログインのため取得不可。Project の「テニス決定ログ」を参照)";
  }
  const snap = await fbDb.collection("users").doc(uid).collection("data").doc("aiContext").get();
  const obj = (snap && snap.exists && snap.data() && snap.data().obj) || null;
  if (!obj) return "## 保留・決定\n(記録なし)";
  const parts = [];
  if (obj.status) parts.push("## 今の状態\n" + String(obj.status).trim());
  if (obj.decisions) parts.push("## 決定（要点）\n" + String(obj.decisions).trim());
  const sets = Array.isArray(obj.sets) ? obj.sets : [];
  sets.forEach(s => {
    if (s && s.text) parts.push("## ワンセット（" + (s.date || "") + "）\n" + String(s.text).trim());
  });
  return parts.length ? parts.join("\n\n") : "## 保留・決定\n(記録なし)";
};

// 全体を組む (async = aiContext を 1 回 read するため)
async function buildConsultExport() {
  const out = [];
  out.push("# テニス現在地（TennisDBアプリから自動書き出し）");
  out.push("> この内容を最新の実データとして扱う。古いナレッジより優先する。");

  // ① 機材
  out.push(_ceGearSection());

  // ② 直近の試打 (弦+テンション+ラケット+イベント紐付き)
  const trials = (lsLoad(KEYS.trials) || []).slice().sort(_ceByDateDesc).slice(0, _CONSULT_EXPORT_TRIALS);
  if (trials.length) {
    out.push("## 直近の試打（最新 " + trials.length + " 件）");
    trials.forEach(t => out.push((formatTrialForClaude(t) || "").trim()));
  }

  // ③ 直近の戦績
  const trns = (lsLoad(KEYS.tournaments) || []).slice().sort(_ceByDateDesc).slice(0, _CONSULT_EXPORT_TRNS);
  if (trns.length) {
    out.push("## 直近の戦績（最新 " + trns.length + " 大会）");
    trns.forEach(trn => out.push((formatTournamentAllForClaude(trn) || "").trim()));
  }

  // ④ 生きてる保留・決定 (Firestore aiContext)
  try {
    out.push(await _ceDecisionsSection());
  } catch (e) {
    console.warn("consult export: aiContext read failed:", e && e.message || e);
    out.push("## 保留・決定\n(取得できませんでした — 通信を確認。Project の「テニス決定ログ」を参照)");
  }

  return out.join("\n\n");
}
