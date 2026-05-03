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
// S16.11 F6: id=undefined のオブジェクトは silent に id を消さず、warn してから除去 (識別子が消える致命を可視化)
const cleanForFirestore=obj=>{
  if(obj===undefined)return null;
  if(obj===null||typeof obj!=="object")return obj;
  if(obj instanceof Date)return obj;
  if(Array.isArray(obj))return obj.map(cleanForFirestore);
  // F6: トップレベルが id を持つべき (session / racket / string / measurement 等) のに id=undefined は致命
  //   notifySaveError 経由で toast、ただし保存自体は継続 (silent strip だけ防ぐ)
  if("id" in obj && obj.id===undefined){
    try{
      console.error("cleanForFirestore: object with id=undefined detected, this may cause sync issues",obj);
      notifySaveError("(unknown)",new Error("id 未設定のオブジェクトが Firestore へ送られました。識別不能でデータ整合性が壊れる可能性があります"));
    }catch(_){}
  }
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

// save: localStorage 即時 + Firestore 即時 (S16.11 で 800ms debounce 全廃)
//   - 旧: setTimeout(800ms) で debounce → Chrome Background Throttling で書き込み消失
//   - 新: queueMicrotask で即時 set → 背景タブでも確実に書き込む
//   - 失敗時は notifySaveError 経由 toast
//
// F-A3 (Phase A 監査): key 単位で Promise chain により直列化。
//   旧: queueMicrotask で fire-and-forget → save(k,A); save(k,B) の到達順がサーバ側で逆転しうる
//   新: _pendingWrites[k] に直前の Promise を保持し、次の write はその完了を await してから発射
//   uid もクロージャに束縛 (signOut 中の race を排除)
const _pendingWrites = {};
const save=(k,d)=>{
  lsSave(k,d);
  const user=fbAuth.currentUser;
  if(!user)return;
  const uid=user.uid;
  const payload=Array.isArray(d)
    ?{items:cleanForFirestore(d),obj:null,updatedAt:new Date().toISOString()}
    :{items:null,obj:cleanForFirestore(d),updatedAt:new Date().toISOString()};
  const prev=_pendingWrites[k]||Promise.resolve();
  const next=prev.then(async()=>{
    try{
      const ref=fbDb.collection("users").doc(uid).collection("data").doc(k);
      await ref.set(payload);
    }catch(err){
      notifySaveError(k,err);
    }
  });
  _pendingWrites[k]=next;
  // chain が無限に伸びないよう完了したら参照を解放
  next.finally(()=>{
    if(_pendingWrites[k]===next)delete _pendingWrites[k];
  });
};
