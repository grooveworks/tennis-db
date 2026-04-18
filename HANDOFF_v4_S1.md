# HANDOFF v4 — Stage S1（Core 層）開始用

作成: 2026-04-19 / 前セッション(S0)末尾で作成

> **次セッション最初にやること**: このファイルを読み、REQUIREMENTS_v4.md / ARCHITECTURE_v4.md / ROADMAP_v4.md / 前回 S0 の成果物（v4/index.html, src/*, build.ps1, tests/run.html）を確認してから着手。

---

## 0. 前セッション(S0)の結果

### 完了事項
- `v4/` `src/` `tests/` ディレクトリ作成
- `src/_head.html` / `src/_tail.html` / `src/app.jsx`（最小起動版）
- `build.ps1`（.NET StringBuilder + BOM無し UTF-8、確実動作）
- `tests/run.html`（inline runner、外部JS依存なし）
- build 実行で `v4/index.html` (1954 bytes) 生成OK
- preview で「🎾 Tennis DB v4 起動」表示確認、tests で「0 tests, 0 ok, 0 failed」表示確認
- 1 commit で main に push 済み

### build.ps1 学習事項
- `-join` 演算子と `Set-Content -Encoding UTF8` は環境依存で安定しない
- **StringBuilder + `[System.IO.File]::WriteAllText` + UTF8Encoding(BOM=false)** が確実
- 外部 JS 参照 `<script src="./_runner.js">` は preview panel で効かない場合あり → inline 推奨

---

## 1. S1 の目的（Core 層実装）

v3 のロジックを参考にしつつ、**SCHEMA 中央化**と**モジュール分離**で再構築する。機能実装はまだしない（UI は app.jsx の簡易動作確認のみ）。

作成するファイル（`src/core/` 配下、ファイル名順に自動連結される）:

1. `01_constants.js` — `APP_VERSION`, `C` (色定義), `KEYS`, `LS_PREFIX`
2. `02_firebase.js` — Firebase 初期化、`fbAuth`, `fbDb`
3. `03_storage.js` — `lsLoad`, `lsSave`, `cleanForFirestore`, `save`, `onSaveError`, `notifySaveError`
4. `04_id.js` — `genId`, `normDate`, `fmtDate`, `fmtDateFull`, `ds`
5. `05_schema.js` — `SCHEMA`（中央定義）、`DISPLAY_FIELDS`, `COMBINABLE_FIELDS`, `REQUIRED_FIELDS`, `FIELD_TYPES`, `isEmptyVal`, `INTERNAL_KEYS`, `keysToInspect`, `labelFor`

---

## 2. S1 の完了条件（DoD）

1. 上記5ファイルが `src/core/` に存在
2. `build.ps1` で `v4/index.html` が正しく生成される（概ね 8〜12 KB）
3. preview で `v4/index.html` を開くと:
   - 「Tennis DB v4 起動」見出し表示
   - 「Version: 4.0.0-S1」
   - ログインボタン押下 → Google 認証成功、ユーザーメール表示
   - 「保存」ボタン押下 → localStorage に書き込まれ、再読み込みで値が残る
4. `SCHEMA` / `DISPLAY_FIELDS` / `COMBINABLE_FIELDS` / `REQUIRED_FIELDS` / `FIELD_TYPES` が console から参照できる
5. ユーザー検証OK → 「S1 OK」
6. 1 commit で push 承認

---

## 3. S1 実装手順

### 3.1 src/core/ ディレクトリ作成

### 3.2 src/core/01_constants.js
v3 の line 16-18, line 30-31 相当。

```js
const APP_VERSION="4.0.0-S1";
const font="-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif";

// 色設計（v3 の WCAG 違反を反省し、主要テキストは AAA、補助は AA+ を確保）
const C={
  bg:"#f2f2f7",panel:"#fff",panel2:"#f5f5f7",border:"#e0e0e4",
  text:"#1a1a1a",            // 主情報 AAA 16.5:1 (on white)
  textSecondary:"#3a3a3c",   // 副情報 AAA 11.7:1
  textMuted:"#5a5a5f",       // 補助情報 AA+ 6.1:1
  accent:"#00b87a",accentBg:"rgba(0,184,122,0.08)",
  red:"#dc2626",redBg:"#fef2f2",
  blue:"#2563eb",blueBg:"rgba(37,99,235,0.08)",
  yellow:"#f59e0b",yellowBg:"rgba(245,158,11,0.08)",
  purple:"#7c3aed",purpleBg:"rgba(124,58,237,0.08)",
};

const LS_PREFIX="yuke-";
const KEYS={
  tournaments:"tournaments",practices:"practices",trials:"trials",
  rackets:"rackets",strings:"strings",measurements:"measurements",
  mental:"mental",next:"next",profile:"profile",
  venues:"venues",stringSetups:"stringSetups",
  quickTrialCards:"quickTrialCards",opponents:"opponents",
};
```

### 3.3 src/core/02_firebase.js
v3 の line 22-27 相当。

```js
const firebaseConfig={
  apiKey:"AIzaSyAXWAtHjBOi31FoNXZiAwW-A7ywZcDY2mM",
  authDomain:"tennis-db-ca9ae.firebaseapp.com",
  projectId:"tennis-db-ca9ae",
  storageBucket:"tennis-db-ca9ae.firebasestorage.app",
  messagingSenderId:"1031131288345",
  appId:"1:1031131288345:web:2adcb9f2eeafa5801ceb88"
};
const fbApp=firebase.initializeApp(firebaseConfig);
const fbAuth=fbApp.auth();
const fbDb=fbApp.firestore();
try{fbDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(_){}
```

### 3.4 src/core/03_storage.js
v3 の line 32-74 相当。

```js
const lsLoad=k=>{try{const v=localStorage.getItem(LS_PREFIX+k+"-v1");if(v)return JSON.parse(v);}catch(_){}return null;};
const lsSave=(k,d)=>{try{localStorage.setItem(LS_PREFIX+k+"-v1",JSON.stringify(d));}catch(_){}};

// Firestore互換: undefined除去 + matchStats.raw/pointsを除外
const cleanForFirestore=obj=>{
  if(obj===undefined)return null;
  if(obj===null||typeof obj!=="object")return obj;
  if(obj instanceof Date)return obj;
  if(Array.isArray(obj))return obj.map(cleanForFirestore);
  const r={};
  for(const k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj,k))continue;
    if(obj[k]===undefined)continue;
    if((k==="raw"||k==="points")&&obj.source==="datatennis")continue;
    r[k]=cleanForFirestore(obj[k]);
  }
  return r;
};

let _lastSaveError=null;
const _saveErrorListeners=[];
const onSaveError=fn=>{_saveErrorListeners.push(fn);return()=>{const i=_saveErrorListeners.indexOf(fn);if(i>=0)_saveErrorListeners.splice(i,1);};};
const notifySaveError=(key,err)=>{_lastSaveError={key,message:err.message||String(err),at:new Date().toISOString()};_saveErrorListeners.forEach(fn=>fn(_lastSaveError));};

const _saveTimers={};
const save=(k,d)=>{
  lsSave(k,d);
  const user=fbAuth.currentUser;
  if(!user)return;
  if(_saveTimers[k])clearTimeout(_saveTimers[k]);
  _saveTimers[k]=setTimeout(async()=>{
    try{
      const ref=fbDb.collection("users").doc(user.uid).collection("data").doc(k);
      const payload=Array.isArray(d)?{items:cleanForFirestore(d),obj:null,updatedAt:new Date().toISOString()}:{items:null,obj:cleanForFirestore(d),updatedAt:new Date().toISOString()};
      await ref.set(payload);
    }catch(err){notifySaveError(k,err);}
  },800);
};
```

### 3.5 src/core/04_id.js
v3 の line 80-90 相当。

```js
const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const normDate=d=>{if(!d)return"";const s=String(d);const m=s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);if(!m)return s;return`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;};
const fmtDate=d=>{const nd=normDate(d);if(!nd)return"";const m=nd.match(/(\d{4})-(\d{2})-(\d{2})/);return m?`${parseInt(m[2])}/${parseInt(m[3])}`:"";};
const fmtDateFull=d=>{const nd=normDate(d);if(!nd)return"";const m=nd.match(/(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}/${parseInt(m[2])}/${parseInt(m[3])}`:"";};
const ds=arr=>[...arr].sort((a,b)=>(normDate(b.date)||"").localeCompare(normDate(a.date)||""));
```

### 3.6 src/core/05_schema.js

ARCHITECTURE_v4.md §3 に沿って、v3 のフィールド一覧を完全網羅した SCHEMA を書く。v3 の DISPLAY_FIELDS + v3.3.28 未遂で追加予定だった全フィールドを含める。

```js
const SCHEMA = {
  tournament: [
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
  practice: [ /* SCHEMA と同様、v3 の practice 全フィールド + heartRate系 */ ],
  trial: [ /* SCHEMA と同様、v3 の trial 全フィールド + 判定/temp/spin等 */ ],
  match: [ /* tournament.matches の要素、round/opponent/result/setScores等 */ ],
};

// 自動生成
const DISPLAY_FIELDS = Object.fromEntries(
  Object.entries(SCHEMA).map(([type, fields]) => [type, fields.map(f => [f.key, f.label])])
);
const COMBINABLE_FIELDS = new Set(
  Object.values(SCHEMA).flatMap(fields => fields.filter(f => f.combinable).map(f => f.key))
);
const REQUIRED_FIELDS = Object.fromEntries(
  Object.entries(SCHEMA).map(([type, fields]) => [type, fields.filter(f => f.required).map(f => f.key)])
);
const FIELD_TYPES = Object.fromEntries(
  Object.entries(SCHEMA).map(([type, fields]) => [type, Object.fromEntries(fields.map(f => [f.key, f.type]))])
);

// 共通ユーティリティ
const isEmptyVal = v => v===undefined||v===null||v===""||(Array.isArray(v)&&v.length===0);
const INTERNAL_KEYS = new Set(["id"]);
const keysToInspect = (a, b, type) => {
  const fields = SCHEMA[type] || [];
  const all = new Set([...Object.keys(a||{}), ...Object.keys(b||{}), ...fields.map(f => f.key)]);
  INTERNAL_KEYS.forEach(k => all.delete(k));
  return [...all];
};
const labelFor = (key, type) => {
  const fields = SCHEMA[type] || [];
  return fields.find(f => f.key === key)?.label || key;
};
```

**v3 の SCHEMA 参考ソース**: v3/index.html の `DISPLAY_FIELDS`（凍結済み `git show 264ed7f:v3/index.html` で参照）。SCHEMA に列挙するフィールド一覧は、v3 の DISPLAY_FIELDS + HANDOFF_v3.3.28.md §5.1 を**マージ**して完全網羅する。

### 3.7 src/app.jsx を S1 動作確認用に拡張

```jsx
const {useState,useEffect}=React;

function TennisDB(){
  const[user,setUser]=useState(null);
  const[testData,setTestData]=useState("");

  useEffect(()=>{
    fbAuth.onAuthStateChanged(u=>setUser(u));
    const loaded=lsLoad("test");
    if(loaded)setTestData(loaded.value||"");
  },[]);

  const handleLogin=async()=>{
    try{
      const provider=new firebase.auth.GoogleAuthProvider();
      await fbAuth.signInWithPopup(provider);
    }catch(e){alert("ログイン失敗: "+e.message);}
  };
  const handleLogout=()=>fbAuth.signOut();
  const handleSaveTest=()=>{
    const val="test-"+new Date().toISOString();
    setTestData(val);
    save("test",{value:val});
  };

  return <div style={{padding:24,fontFamily:font,color:C.text}}>
    <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>🎾 Tennis DB v4 起動</h1>
    <div style={{color:C.textSecondary,marginBottom:4}}>Version: <b>{APP_VERSION}</b></div>
    <div style={{color:C.textMuted,marginBottom:12}}>Stage S1 Core 動作確認</div>
    <hr style={{margin:"12px 0",border:"none",borderTop:`1px solid ${C.border}`}}/>
    <div style={{marginBottom:12}}>
      <div>ログイン状態: <b>{user?user.email:"未ログイン"}</b></div>
      {user
        ? <button onClick={handleLogout} style={{marginTop:6,padding:"6px 12px"}}>ログアウト</button>
        : <button onClick={handleLogin} style={{marginTop:6,padding:"6px 12px",background:C.accent,color:"#fff",border:"none",borderRadius:4}}>Google ログイン</button>}
    </div>
    <div>
      <div>localStorage 値: <code style={{background:C.panel2,padding:"2px 6px",borderRadius:3}}>{testData||"(なし)"}</code></div>
      <button onClick={handleSaveTest} style={{marginTop:6,padding:"6px 12px"}}>保存</button>
    </div>
    <hr style={{margin:"12px 0",border:"none",borderTop:`1px solid ${C.border}`}}/>
    <details>
      <summary style={{cursor:"pointer",color:C.textSecondary}}>SCHEMA 確認 (開くと各タイプのフィールド数)</summary>
      <pre style={{fontSize:11,background:C.panel2,padding:8,borderRadius:4,marginTop:6}}>{Object.entries(SCHEMA).map(([t,f])=>`${t}: ${f.length} fields`).join("\n")}</pre>
    </details>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB/>);
```

### 3.8 build 実行
`powershell -ExecutionPolicy Bypass -File build.ps1`

### 3.9 preview で動作確認

---

## 4. 実装前に守ること

### チェックリスト（応答に書き出す）
```
□ 1. REQUIREMENTS_v4 / ARCHITECTURE_v4 / ROADMAP_v4 を読み直した
□ 2. S1 の DoD を読み直した
□ 3. v3 の対応箇所を `git show 264ed7f:v3/index.html` で参照する準備
□ 4. ユーザーに「S1 着手してよいか」確認
□ 5. コミット粒度: S1 完了まで1 commit
```

### 会話規律（S0 で守ったルールを継続）
- 専門用語で説明しない
- 判断を投げない（「こうします」と宣言）
- 反省と次アクションを混ぜない
- push 前に必ず承認
- 対処療法しない（エラーは原因特定、設計から見直す）

---

## 5. S1 完了時にやること

1. preview で動作確認依頼（ログイン成功、localStorage 保存成功、SCHEMA 表示確認）
2. 「S1 OK」確認
3. 1 commit（コミットメッセージ例: `v4 S1: Core層 — constants/firebase/storage/id/schema + 動作確認UI`）
4. push 承認 → push
5. `HANDOFF_v4_S2.md` 作成（次は Domain 層: merge/cascade/duplicate/import + unit test）
6. `HANDOFF_v4_S1.md` 削除

---

## 6. 自戒

- S0 で `-join` 演算子や Set-Content の罠に時間を取られた。**動かなかったら環境の問題を疑い、.NET API で書き直す**
- 対処療法に戻らない。設計文書に立ち返る
- ユーザーの時間を無駄にしない
