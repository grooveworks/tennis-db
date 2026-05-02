// ── データ保存層（localStorage + Firestore 同期）─────────
// 設計: save() は uid 引数を取らない。fbAuth.currentUser を内部取得。
// ログイン前は localStorage のみで動作（v2 方式、ログイン後にクラウド同期）

const lsLoad=k=>{
  try{
    const v=localStorage.getItem(LS_PREFIX+k+"-v1");
    if(v)return JSON.parse(v);
  }catch(_){}
  return null;
};
const lsSave=(k,d)=>{
  try{
    localStorage.setItem(LS_PREFIX+k+"-v1",JSON.stringify(d));
  }catch(err){
    // S16.11 F8: silent fail 廃止、Quota / SecurityError 等を notifySaveError 経由で通知
    //   onSaveError listener (Header / app 起動時に登録) で toast 表示 → ユーザーは「保存できていない」を即認識
    console.error("lsSave failed:",k,err);
    try{notifySaveError(k,err);}catch(_){}
  }
};

// Firestore 互換変換: undefined 除去 + matchStats.raw/points をサイズ削減のため除外
// raw/points は localStorage には残るが、Firestore には送らない
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

// 保存エラー通知（アプリ内バナー用）
let _lastSaveError=null;
const _saveErrorListeners=[];
const onSaveError=fn=>{
  _saveErrorListeners.push(fn);
  return()=>{
    const i=_saveErrorListeners.indexOf(fn);
    if(i>=0)_saveErrorListeners.splice(i,1);
  };
};
const notifySaveError=(key,err)=>{
  _lastSaveError={key,message:err.message||String(err),at:new Date().toISOString()};
  _saveErrorListeners.forEach(fn=>fn(_lastSaveError));
};

// save: localStorage 即時 + Firestore デバウンス書き込み（800ms）
const _saveTimers={};
const save=(k,d)=>{
  lsSave(k,d);
  const user=fbAuth.currentUser;
  if(!user)return;
  if(_saveTimers[k])clearTimeout(_saveTimers[k]);
  _saveTimers[k]=setTimeout(async()=>{
    try{
      const ref=fbDb.collection("users").doc(user.uid).collection("data").doc(k);
      const payload=Array.isArray(d)
        ?{items:cleanForFirestore(d),obj:null,updatedAt:new Date().toISOString()}
        :{items:null,obj:cleanForFirestore(d),updatedAt:new Date().toISOString()};
      await ref.set(payload);
    }catch(err){
      notifySaveError(k,err);
    }
  },800);
};
