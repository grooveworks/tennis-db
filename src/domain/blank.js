// blank — 新規セッションの初期値 (純関数、SCHEMA 駆動 + 種別固有のデフォルト)
//
// 役割:
//   - QuickAddModal (S12) でフォーム初期化
//   - SessionEditView を空起動する場合にも再利用可
//   - blankTrial は S14 (Home 3 ボタン) で再利用予定
//
// id は genId() で生成、date は today() で当日。それ以外は SCHEMA の type に応じた初期値。
// rating 系は v2 と同じく 3 (中央)、ただし practice の physical は v3 と同じく 0 (未入力扱い)。
// practice.focus はテキスト (v2/v3 互換、「今日のテーマ」フィールド)。

const blankTournament = () => ({
  id: genId(),
  date: today(),
  startTime: "",
  endTime: "",
  name: "",
  level: "中上級",
  type: "singles",
  venue: "",
  racketName: "",
  stringMain: "",
  stringCross: "",
  tensionMain: "",
  tensionCross: "",
  temp: "",
  weather: "",
  overallResult: "",
  generalNote: "",
  matches: [],
  visibility: "public",
});

const blankPractice = () => ({
  id: genId(),
  date: today(),
  startTime: "",
  endTime: "",
  duration: "",
  title: "",
  venue: "",
  type: "スクール",
  racketName: "",
  stringMain: "",
  stringCross: "",
  tensionMain: "",
  tensionCross: "",
  temp: "",
  weather: "",
  physical: 0, // v3 互換: 未入力扱い (rating 0 = 未入力)
  focus: "",   // v2/v3 互換: 今日のテーマ (テキスト)
  coachNote: "",
  goodNote: "",
  improveNote: "",
  generalNote: "",
  visibility: "public",
});

// 試打: S14 (Home 3 ボタン) で再利用予定。S12 では使わないが定義しておく
const blankTrial = () => ({
  id: genId(),
  date: today(),
  startTime: "",
  endTime: "",
  racketName: "",
  stringMain: "",
  stringCross: "",
  tensionMain: "",
  tensionCross: "",
  venue: "",
  judgment: "保留",
  temp: "",
  // 評価系: v2/v3 と同じく 3 (中央) 初期値
  spin: 3, power: 3, control: 3, info: 3, maneuver: 3, swingThrough: 3,
  trajectory: 3, stiffness: 3,
  shotForeAtk: 3, shotForeDef: 3, shotBackAtk: 3, shotBackDef: 3,
  shotServe: 3, shotReturn: 3, shotVolley: 3, shotSlice: 3,
  confidence: 3,
  strokeNote: "", serveNote: "", volleyNote: "", generalNote: "",
  linkedPracticeId: "",
  linkedMatchId: "",
});
