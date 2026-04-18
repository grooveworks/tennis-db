// ── SCHEMA（データ定義の単一の真実）────────────
// 新フィールド追加時は SCHEMA[type] に1行追加するだけで
// マージ/比較/表示 に自動対応する。DISPLAY_FIELDS 等を直接触るのは禁止。
//
// フィールド定義のキー:
//   key: 識別子（オブジェクトのプロパティ名）
//   label: 表示ラベル
//   type: "date" | "time" | "text" | "textarea" | "number" | "select" | "rating" | "array" | "object" | "boolean"
//   required: 必須入力（未入力で保存不可）
//   combinable: マージ時に「結合」選択肢を表示（テキスト系のみ）
//   itemType: type="array" の要素タイプ（ネスト構造）

const SCHEMA={
  tournament:[
    {key:"date",label:"日付",type:"date",required:true},
    {key:"startTime",label:"開始時刻",type:"time"},
    {key:"endTime",label:"終了時刻",type:"time"},
    {key:"name",label:"大会名",type:"text",combinable:true,required:true},
    {key:"type",label:"形式",type:"select"},
    {key:"level",label:"クラス",type:"text"},
    {key:"venue",label:"会場",type:"text",combinable:true},
    {key:"racketName",label:"ラケット",type:"text"},
    {key:"stringSetup",label:"ストリング",type:"text"},
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"tensionMain",label:"縦T",type:"text"},
    {key:"tensionCross",label:"横T",type:"text"},
    {key:"temp",label:"気温",type:"number"},
    {key:"weather",label:"天気",type:"text"},
    {key:"overallResult",label:"結果",type:"text"},
    {key:"generalNote",label:"メモ",type:"textarea",combinable:true},
    {key:"matches",label:"試合記録",type:"array",itemType:"match"},
    {key:"visibility",label:"公開",type:"select"},
  ],
  practice:[
    {key:"date",label:"日付",type:"date",required:true},
    {key:"startTime",label:"開始時刻",type:"time"},
    {key:"endTime",label:"終了時刻",type:"time"},
    {key:"duration",label:"時間(分)",type:"number"},
    {key:"title",label:"イベント名",type:"text",combinable:true},
    {key:"venue",label:"会場",type:"text",combinable:true},
    {key:"type",label:"種別",type:"select"},
    {key:"racketName",label:"ラケット",type:"text"},
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"tensionMain",label:"縦T",type:"text"},
    {key:"tensionCross",label:"横T",type:"text"},
    {key:"temp",label:"気温",type:"number"},
    {key:"weather",label:"天気",type:"text"},
    {key:"physical",label:"体調",type:"rating"},
    {key:"focus",label:"集中",type:"rating"},
    {key:"coachNote",label:"コーチメモ",type:"textarea",combinable:true},
    {key:"goodNote",label:"良かった点",type:"textarea",combinable:true},
    {key:"improveNote",label:"改善点",type:"textarea",combinable:true},
    {key:"generalNote",label:"メモ",type:"textarea",combinable:true},
    {key:"heartRateAvg",label:"平均心拍",type:"number"},
    {key:"calories",label:"消費kcal",type:"number"},
    {key:"hrZone1",label:"HR Z1",type:"text"},
    {key:"hrZone2",label:"HR Z2",type:"text"},
    {key:"hrZone3",label:"HR Z3",type:"text"},
    {key:"hrZone4",label:"HR Z4",type:"text"},
    {key:"hrZone5",label:"HR Z5",type:"text"},
    {key:"visibility",label:"公開",type:"select"},
  ],
  trial:[
    {key:"date",label:"日付",type:"date",required:true},
    {key:"startTime",label:"開始時刻",type:"time"},
    {key:"endTime",label:"終了時刻",type:"time"},
    {key:"racketName",label:"ラケット",type:"text",required:true},
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"tensionMain",label:"縦T",type:"text"},
    {key:"tensionCross",label:"横T",type:"text"},
    {key:"venue",label:"場所",type:"text"},
    {key:"judgment",label:"判定",type:"select"},
    {key:"temp",label:"気温",type:"number"},
    {key:"spin",label:"スピン",type:"rating"},
    {key:"power",label:"推進力",type:"rating"},
    {key:"control",label:"コントロール",type:"rating"},
    {key:"info",label:"打感情報",type:"rating"},
    {key:"maneuver",label:"操作性",type:"rating"},
    {key:"swingThrough",label:"振り抜き",type:"rating"},
    {key:"trajectory",label:"軌道",type:"rating"},
    {key:"stiffness",label:"硬さ",type:"rating"},
    {key:"confidence",label:"自信度",type:"rating"},
    {key:"strokeNote",label:"ストロークメモ",type:"textarea",combinable:true},
    {key:"serveNote",label:"サーブメモ",type:"textarea",combinable:true},
    {key:"volleyNote",label:"ボレーメモ",type:"textarea",combinable:true},
    {key:"generalNote",label:"総合メモ",type:"textarea",combinable:true},
    {key:"linkedPracticeId",label:"連携練習ID",type:"text"},
    {key:"linkedMatchId",label:"連携試合ID",type:"text"},
  ],
  match:[
    {key:"round",label:"ラウンド",type:"text"},
    {key:"opponent",label:"対戦相手",type:"text",combinable:true},
    {key:"opponent2",label:"対戦相手2(ダブルス)",type:"text",combinable:true},
    {key:"racketName",label:"ラケット",type:"text"},
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"tensionMain",label:"縦T",type:"text"},
    {key:"tensionCross",label:"横T",type:"text"},
    {key:"result",label:"結果",type:"select"},
    {key:"setScores",label:"セットスコア",type:"array"},
    {key:"mental",label:"メンタル",type:"rating"},
    {key:"physical",label:"フィジカル",type:"rating"},
    {key:"mentalNote",label:"メンタルメモ",type:"textarea",combinable:true},
    {key:"techNote",label:"技術メモ",type:"textarea",combinable:true},
    {key:"opponentNote",label:"相手メモ",type:"textarea",combinable:true},
    {key:"note",label:"試合メモ",type:"textarea",combinable:true},
  ],
};

// ── 自動生成（SCHEMA から派生、手動管理禁止）─────
const DISPLAY_FIELDS=Object.fromEntries(
  Object.entries(SCHEMA).map(([type,fields])=>[type,fields.map(f=>[f.key,f.label])])
);
const COMBINABLE_FIELDS=new Set(
  Object.values(SCHEMA).flatMap(fields=>fields.filter(f=>f.combinable).map(f=>f.key))
);
const REQUIRED_FIELDS=Object.fromEntries(
  Object.entries(SCHEMA).map(([type,fields])=>[type,fields.filter(f=>f.required).map(f=>f.key)])
);
const FIELD_TYPES=Object.fromEntries(
  Object.entries(SCHEMA).map(([type,fields])=>[type,Object.fromEntries(fields.map(f=>[f.key,f.type]))])
);

// ── 共通ユーティリティ（merge/cascade から使用予定）─
const isEmptyVal=v=>v===undefined||v===null||v===""||(Array.isArray(v)&&v.length===0);
const INTERNAL_KEYS=new Set(["id"]);
const keysToInspect=(a,b,type)=>{
  const fields=SCHEMA[type]||[];
  const all=new Set([...Object.keys(a||{}),...Object.keys(b||{}),...fields.map(f=>f.key)]);
  INTERNAL_KEYS.forEach(k=>all.delete(k));
  return [...all];
};
const labelFor=(key,type)=>{
  const fields=SCHEMA[type]||[];
  return fields.find(f=>f.key===key)?.label||key;
};
