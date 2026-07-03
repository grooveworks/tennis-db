// gcal.js — Google カレンダー ICS (非公開 URL) の取得・展開・仕分け
//
// 設計 (DESIGN_LOG 2026-07-03):
//   - 読み取り専用プロキシ: fetch + parse + 分類 + 返却のみ。Firestore への書き込みは一切しない
//     (書き込み主体は client。users/{uid}/data/* は client の全置換 save と競合するため)
//   - 分類キーワード・会場正規化は .claude/extract_gcal.ps1 (2026-04-18 実運用済) の忠実移植
//   - 定期予定 (RRULE) は「壁時計時刻を UTC に見立てた floating 展開」で TZ 非依存に処理
//     (サーバー TZ が UTC でも JST でも同じ結果になる。日本の予定なので DST なし)
//   - 返却形式は calendar_import.json (version 30) と同一 → client の実績あるマージ合流路を再利用
//
// SSRF ガード: index.js 側で calendar.google.com/calendar/ical/ 配下のみ許可

const ical = require("node-ical");
const { RRule } = require("rrule");

// ── Asia/Tokyo の壁時計部品を取り出す (実インスタント → 東京ローカルの y/mo/d/h/mi) ──
const _tokyoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function tokyoParts(date) {
  const parts = {};
  for (const p of _tokyoFmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  // hour "24" は 0 扱い (en-CA h23 でほぼ出ないが防御)
  const h = parts.hour === "24" ? 0 : parseInt(parts.hour, 10);
  return {
    y: parseInt(parts.year, 10), mo: parseInt(parts.month, 10), d: parseInt(parts.day, 10),
    h, mi: parseInt(parts.minute, 10),
  };
}

// 全日イベント (VALUE=DATE): node-ical は環境によって local/UTC 深夜で Date を作る。
// UTC 0 時なら UTC 読み、そうでなければ local 読み — 構築方法に合わせて日付部品を取り出す
function dateOnlyParts(date) {
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
    return { y: date.getUTCFullYear(), mo: date.getUTCMonth() + 1, d: date.getUTCDate(), h: 0, mi: 0 };
  }
  return { y: date.getFullYear(), mo: date.getMonth() + 1, d: date.getDate(), h: 0, mi: 0 };
}

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (p) => `${p.y}/${pad(p.mo)}/${pad(p.d)}`;       // yyyy/MM/dd (ps1 と同一)
const fmtTime = (p) => `${pad(p.h)}:${pad(p.mi)}`;               // HH:mm
const dateKey = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;        // 比較・id 用
const fakeUTC = (p) => new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi)); // 壁時計→擬似UTC
const partsFromFakeUTC = (d) => ({
  y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(),
  h: d.getUTCHours(), mi: d.getUTCMinutes(),
});
// 擬似UTC Date の曜日 (0=日..6=土)
const dowFromFakeUTC = (d) => d.getUTCDay();

// ── 分類 (extract_gcal.ps1 の忠実移植。-match は大文字小文字無視なので /i) ──────────
const TOURNAMENT_KW = ["大会", "カップ", "選手権", "トーナメント", "本戦", "ランキング戦", "コンペ", "リーグ戦", "インスピ", "市民大会", "団体戦", "ベテラン", "ちょんまげ", "杯", "オープン戦", "坪田", "JOP", "JTA", "全日本", "ミックス大会", "MIX大会", "ダブルス大会", "シングルス大会", "混合大会"];
const PRACTICE_KW = ["テニス", "練習", "スクール", "レッスン", "球出し", "基礎練", "サシ練", "イトマン", "ベアーズ", "インスピ", "ジャクパ", "ダブルス", "シングルス", "航空公園", "ラケット", "ラリー", "乱打", "ミックス", "MIX", "コート"];

const _matchAny = (s, kws) => {
  const low = s.toLowerCase();
  return kws.some((kw) => low.includes(kw.toLowerCase()));
};

function classify(summary) {
  if (!summary) return null;
  if (/Tennis DB|バックアップ|同期|リマインダー|メンテナンス/i.test(summary)) return null;
  if (/申し?込み|申込|締切|締め切り|エントリー|エントリ|受付開始|受付終了|申込期限|ドロー発表|抽選|予約/i.test(summary)) return null;
  if (/試打/.test(summary)) return "trial";
  if (/練習試合|基礎練|サシ練|球出し|基礎練習|試合会|試合づくし/.test(summary)) return "practice";
  if (_matchAny(summary, TOURNAMENT_KW)) return "tournament";
  if (_matchAny(summary, PRACTICE_KW)) return "practice";
  return null;
}

function detectTournamentType(summary) {
  if (/坪田杯/.test(summary)) return "mixed";
  if (/ミックス|ミクスド|mix|男女|ミックスダブルス/i.test(summary)) return "mixed";
  if (/ダブルス|ペア|団体/i.test(summary)) return "doubles";
  return "singles";
}

function extractVenue(location) {
  if (!location) return "";
  return String(location).split(",")[0].trim();
}

// 曜日×時刻から会場を推定 (location 空の練習のみ。ps1 の InferVenueByDayTime 移植)
function inferVenueByDayTime(parts, dow, summary, isAllDay) {
  if (isAllDay) return "";
  const evDate = new Date(Date.UTC(parts.y, parts.mo - 1, parts.d));
  const switchDate = Date.UTC(2026, 1, 1); // 2026-02-01
  // 金曜 20 時以降の「テニス練習/テニス」はベアーズ
  if (dow === 5 && parts.h >= 20 && /テニス練習|テニス/.test(summary)) return "ベアーズ";
  // 2026-02-01 以降の火曜テニスはイトマン
  if (dow === 2 && evDate.getTime() >= switchDate && /テニス|練習|レッスン/.test(summary)) return "イトマンテニス";
  // 2026-02-01 より前の水曜テニスはイトマン
  if (dow === 3 && evDate.getTime() < switchDate && /テニス|練習|レッスン/.test(summary)) return "イトマンテニス";
  return "";
}

function normalizeVenue(v) {
  if (!v) return "";
  if (/イトマン|緑町４丁目|緑町4丁目|緑町4-45|緑町４－４５/.test(v)) return "イトマンテニス";
  if (/航空記念公園|航空公園/.test(v)) return "航空記念公園";
  if (/ベアーズ/.test(v)) return "ベアーズ";
  if (/インスピ/.test(v)) return "インスピリッツテニスクラブ";
  if (/ジャクパ/.test(v)) return "ジャクパ狭山";
  return v;
}

// ── レコード生成 (calendar_import.json version 30 と同一フィールド) ──────────────
function buildRecord(type, { id, dateStr, startTime, endTime, durationMin, summary, venue }) {
  if (type === "tournament") {
    return {
      id, date: dateStr, name: summary, level: "", type: detectTournamentType(summary),
      venue, racketName: "", stringSetup: "", tensionMain: "", tensionCross: "",
      temp: "", weather: "", overallResult: "",
      generalNote: "Googleカレンダーから自動インポート", matches: [],
      startTime, endTime,
    };
  }
  if (type === "practice") {
    return {
      id, date: dateStr, title: summary, venue, type: "",
      duration: durationMin === null ? "" : String(durationMin),
      startTime, endTime,
      racketName: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "",
      temp: "", weather: "", physical: 3,
      focus: "", coachNote: "", goodNote: "", improveNote: "",
      generalNote: `GCal: ${summary}`,
    };
  }
  // trial
  return {
    id, date: dateStr, venue,
    racketName: "", stringMain: "", stringCross: "", tensionMain: "", tensionCross: "",
    startTime, endTime, generalNote: `GCal: ${summary}`,
  };
}

// ── 1 オカレンス処理 (擬似UTC の start/end 部品 → 分類 → レコード) ────────────────
function processOccurrence(out, seenIds, ev, startP, endP, isAllDay, idSuffix) {
  const summary = (ev.summary || "").toString();
  const type = classify(summary);
  if (!type) { out.stats.skipped++; return; }

  const dateStr = fmtDate(startP);
  const startTime = isAllDay ? "" : fmtTime(startP);
  const endTime = isAllDay || !endP ? "" : fmtTime(endP);
  let durationMin = null;
  if (!isAllDay && endP) {
    durationMin = Math.round((fakeUTC(endP) - fakeUTC(startP)) / 60000);
    if (!(durationMin > 0)) durationMin = null;
  }

  // id: gcal_ 接頭辞踏襲。@google.com を除去、定期オカレンスは日付サフィックスで一意化
  const uidClean = String(ev.uid || "").replace(/@google\.com$/i, "");
  const id = idSuffix ? `gcal_${uidClean}_${idSuffix}` : `gcal_${uidClean}`;
  if (seenIds.has(id)) return;
  seenIds.add(id);

  let venueRaw = extractVenue(ev.location);
  if (!venueRaw && type === "practice") {
    venueRaw = inferVenueByDayTime(startP, dowFromFakeUTC(fakeUTC(startP)), summary, isAllDay);
  }
  const venue = normalizeVenue(venueRaw);

  const rec = buildRecord(type, { id, dateStr, startTime, endTime, durationMin, summary, venue });
  if (type === "tournament") out.tournaments.push(rec);
  else if (type === "practice") out.practices.push(rec);
  else out.trials.push(rec);
}

// ── ICS テキスト群 → {tournaments, practices, trials, stats} ─────────────────────
// windowDaysBack / windowDaysFwd: 東京日付基準の取得窓
function parseAndClassify(icsTexts, { windowDaysBack = 7, windowDaysFwd = 62 } = {}) {
  const out = { tournaments: [], practices: [], trials: [], stats: { total: 0, skipped: 0 } };
  const seenIds = new Set();

  // 窓 (東京の壁時計を擬似UTC で表現)
  const nowP = tokyoParts(new Date());
  const winStart = new Date(Date.UTC(nowP.y, nowP.mo - 1, nowP.d - windowDaysBack, 0, 0));
  const winEnd = new Date(Date.UTC(nowP.y, nowP.mo - 1, nowP.d + windowDaysFwd, 23, 59));

  for (const text of icsTexts) {
    let data;
    try { data = ical.parseICS(text); } catch (err) {
      throw new Error(`ICS の解析に失敗しました: ${err.message}`);
    }
    for (const key of Object.keys(data)) {
      const ev = data[key];
      if (!ev || ev.type !== "VEVENT") continue;
      // recurrence override (RECURRENCE-ID 持ち) はマスター側 ev.recurrences から処理する。
      // トップレベルに単独で現れた場合のみここで通常処理 (node-ical はマスターにぶら下げるのが通常)
      out.stats.total++;

      const isAllDay = ev.datetype === "date";
      const startP = isAllDay ? dateOnlyParts(ev.start) : tokyoParts(ev.start);
      const endP = ev.end ? (isAllDay ? null : tokyoParts(ev.end)) : null;

      if (!ev.rrule) {
        const s = fakeUTC(startP);
        if (s < winStart || s > winEnd) { out.stats.skipped++; continue; }
        processOccurrence(out, seenIds, ev, startP, endP, isAllDay, null);
        continue;
      }

      // ── 定期予定: floating 展開 ──
      // マスターの東京壁時計を擬似UTC dtstart にして RRule を作り直す (TZ 非依存)
      const durMs = ev.end ? (ev.end - ev.start) : 0;
      let rule;
      try {
        const orig = ev.rrule.origOptions || {};
        const opts = { ...orig };
        opts.dtstart = fakeUTC(startP);
        delete opts.tzid;
        if (orig.until) {
          const uP = isAllDay ? dateOnlyParts(orig.until) : tokyoParts(orig.until);
          opts.until = fakeUTC(uP);
        }
        rule = new RRule(opts);
      } catch (err) {
        out.stats.skipped++;
        continue;
      }

      // EXDATE + override 対象日を除外セットへ (東京日付キー)
      const excluded = new Set();
      if (ev.exdate) {
        for (const exd of Object.values(ev.exdate)) {
          if (exd instanceof Date) excluded.add(dateKey(isAllDay ? dateOnlyParts(exd) : tokyoParts(exd)));
        }
      }
      const overrides = ev.recurrences ? Object.values(ev.recurrences) : [];
      for (const ov of overrides) {
        const rid = ov.recurrenceid;
        if (rid instanceof Date) excluded.add(dateKey(isAllDay ? dateOnlyParts(rid) : tokyoParts(rid)));
      }

      // 展開 (窓内)
      let occs = [];
      try { occs = rule.between(winStart, winEnd, true); } catch (_) { occs = []; }
      for (const occ of occs) {
        const sP = partsFromFakeUTC(occ);
        if (excluded.has(dateKey(sP))) continue;
        const eP = durMs > 0 ? partsFromFakeUTC(new Date(occ.getTime() + durMs)) : null;
        processOccurrence(out, seenIds, ev, sP, eP, isAllDay, dateKey(sP).replace(/-/g, ""));
      }

      // override (変更されたオカレンス) は単独イベントとして処理
      for (const ov of overrides) {
        const ovAllDay = ov.datetype === "date";
        const oSP = ovAllDay ? dateOnlyParts(ov.start) : tokyoParts(ov.start);
        const s = fakeUTC(oSP);
        if (s < winStart || s > winEnd) continue;
        const oEP = ov.end ? (ovAllDay ? null : tokyoParts(ov.end)) : null;
        const ovEv = { uid: ev.uid, summary: ov.summary || ev.summary, location: ov.location || ev.location };
        processOccurrence(out, seenIds, ovEv, oSP, oEP, ovAllDay, dateKey(oSP).replace(/-/g, ""));
      }
    }
  }

  // 日付昇順で安定化
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  out.tournaments.sort(byDate);
  out.practices.sort(byDate);
  out.trials.sort(byDate);
  return out;
}

// ── URL 群を fetch → parseAndClassify ────────────────────────────────────────────
async function syncFromIcs(urls) {
  const texts = await Promise.all(urls.map(async (url) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
      if (!res.ok) throw new Error(`カレンダー取得に失敗 (HTTP ${res.status})。URL を確認してください`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }));
  return parseAndClassify(texts);
}

module.exports = { syncFromIcs, parseAndClassify, classify, normalizeVenue, detectTournamentType };
