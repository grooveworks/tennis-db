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
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"tensionMain",label:"縦T",type:"text"},
    {key:"tensionCross",label:"横T",type:"text"},
    {key:"temp",label:"気温",type:"number"},
    {key:"weather",label:"天気",type:"text"},
    {key:"overallResult",label:"結果",type:"text"},
    {key:"generalNote",label:"メモ",type:"textarea",combinable:true},
    {key:"matches",label:"試合記録",type:"array",itemType:"match"},
    {key:"matchFormat",label:"試合形式",type:"object"}, // リク 30-e (S18): 大会のデフォルト試合形式
    {key:"visibility",label:"公開",type:"select"},
    {key:"memoSummaries",label:"メモ要約",type:"object"},
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
    {key:"focus",label:"フォーカス",type:"textarea",combinable:true},
    {key:"coachNote",label:"コーチメモ",type:"textarea",combinable:true},
    {key:"goodNote",label:"良かった点",type:"textarea",combinable:true},
    {key:"improveNote",label:"改善点",type:"textarea",combinable:true},
    {key:"generalNote",label:"メモ",type:"textarea",combinable:true},
    {key:"heartRateAvg",label:"平均心拍",type:"number"},
    {key:"calories",label:"消費kcal",type:"number"},
    {key:"totalCalories",label:"合計kcal",type:"number"},
    {key:"timeRange",label:"時間帯",type:"text"},
    {key:"workoutLocation",label:"ワークアウト位置",type:"text"},
    {key:"recoveryHR",label:"回復心拍",type:"text"},
    {key:"hrZone1",label:"HR Z1",type:"text"},
    {key:"hrZone2",label:"HR Z2",type:"text"},
    {key:"hrZone3",label:"HR Z3",type:"text"},
    {key:"hrZone4",label:"HR Z4",type:"text"},
    {key:"hrZone5",label:"HR Z5",type:"text"},
    {key:"visibility",label:"公開",type:"select"},
    {key:"memoSummaries",label:"メモ要約",type:"object"},
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
    {key:"trajectory",label:"弾道",type:"rating"},
    {key:"stiffness",label:"打感",type:"rating"},
    {key:"confidence",label:"安心感",type:"rating"},
    {key:"shotForeAtk",label:"フォア攻撃",type:"rating"},
    {key:"shotForeDef",label:"フォア守備",type:"rating"},
    {key:"shotBackAtk",label:"バック攻撃",type:"rating"},
    {key:"shotBackDef",label:"バック守備",type:"rating"},
    {key:"shotServe",label:"サーブ",type:"rating"},
    {key:"shotReturn",label:"リターン",type:"rating"},
    {key:"shotVolley",label:"ボレー",type:"rating"},
    {key:"shotSlice",label:"スライス",type:"rating"},
    {key:"strokeNote",label:"ストロークメモ",type:"textarea",combinable:true},
    {key:"serveNote",label:"サーブメモ",type:"textarea",combinable:true},
    {key:"volleyNote",label:"ボレーメモ",type:"textarea",combinable:true},
    {key:"generalNote",label:"総合メモ",type:"textarea",combinable:true},
    {key:"linkedPracticeId",label:"連携練習ID",type:"text"},
    {key:"linkedMatchId",label:"連携試合ID",type:"text"}, // S16.11 UX4: 後方互換、新コードは linkedMatchIds を優先
    {key:"linkedMatchIds",label:"連携試合ID群",type:"array"}, // S16.11 UX4: 1 試打→複数試合 連携対応
    {key:"memoSummaries",label:"メモ要約",type:"object"},
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
    {key:"format",label:"試合形式上書き",type:"object"}, // リク 30-e (S18): 大会の matchFormat を上書き、null=継承
    {key:"memoSummaries",label:"メモ要約",type:"object"},
  ],
  // ── S16 (Gear タブ) で追加 ──
  // racket: 単体ラケット（status 6種、Decision Notes フラット展開、measurements ネスト）
  // string: ストリング在庫マスター（status 6種、qty はテキスト「大量」「1張り」運用 V2 互換）
  // stringSetup: 縦糸×横糸の組合せマスター（active/archived）
  // measurement: ラケットの実測値（racket.measurements[] のネスト要素）
  racket:[
    {key:"name",label:"ラケット名",type:"text",required:true,combinable:true},
    {key:"role",label:"役割",type:"text",combinable:true},
    {key:"status",label:"ステータス",type:"select",required:true},
    {key:"face",label:"フェイス",type:"text"},
    {key:"beam",label:"ビーム",type:"text"},
    {key:"weight",label:"フレーム重量",type:"text"},
    {key:"balance",label:"フレームバランス",type:"text"},
    {key:"currentString",label:"現在のストリング",type:"text"},
    {key:"currentTension",label:"現在のテンション",type:"text"},
    {key:"note",label:"メモ",type:"textarea",combinable:true},
    {key:"decisionKeep",label:"継続理由",type:"textarea",combinable:true},
    {key:"decisionWorry",label:"不安点",type:"textarea",combinable:true},
    {key:"decisionNext",label:"次回確認",type:"textarea",combinable:true},
    {key:"nextCheck",label:"次の確認(1行)",type:"text"},
    {key:"order",label:"並び順",type:"number"},
    {key:"measurements",label:"実測値履歴",type:"array",itemType:"measurement"},
  ],
  string:[
    {key:"name",label:"ストリング名",type:"text",required:true,combinable:true},
    {key:"qty",label:"在庫量",type:"text"},
    {key:"status",label:"ステータス",type:"select",required:true},
    {key:"note",label:"メモ",type:"textarea",combinable:true},
    {key:"order",label:"並び順",type:"number"},
  ],
  stringSetup:[
    {key:"label",label:"ラベル",type:"text",required:true,combinable:true},
    {key:"stringMain",label:"縦糸",type:"text"},
    {key:"stringCross",label:"横糸",type:"text"},
    {key:"status",label:"ステータス",type:"select"},
    {key:"order",label:"並び順",type:"number"},
  ],
  measurement:[
    {key:"state",label:"状態",type:"text",combinable:true},
    {key:"weight",label:"重量",type:"text"},
    {key:"balance",label:"バランス",type:"text"},
    {key:"gripW",label:"グリップ幅",type:"text"},
    {key:"gripT",label:"グリップ厚",type:"text"},
    {key:"current",label:"現行フラグ",type:"boolean"},
    {key:"note",label:"メモ",type:"textarea",combinable:true},
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
