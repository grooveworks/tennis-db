// ── データ保存層（localStorage + Firestore 同期）─────────
// 設計: save() は uid 引数を取らない。fbAuth.currentUser を内部取得。
// ログイン前は localStorage のみで動作（v2 方式、ログイン後にクラウド同期）

// Round 5 Batch D: corrupt JSON 検出時に console.error で痕跡を残す + 元データを別キーに退避
//   旧: catch(_){} で完全 silent → ユーザーから「データ消えた」と訴えられても証拠なし
//   新: parse 失敗時に該当キーのデータを yuke-{k}-corrupted-{ts} に rename して証拠保全
const lsLoad=k=>{
  try{
    const v=localStorage.getItem(LS_PREFIX+k+"-v1");
    if(v)return JSON.parse(v);
  }catch(err){
    console.error(`lsLoad parse error for key ${k}:`,err?.message||err);
    try{
      const v=localStorage.getItem(LS_PREFIX+k+"-v1");
      if(v){
        const ts=new Date().toISOString().replace(/[:.]/g,"-");
        localStorage.setItem(`${LS_PREFIX}${k}-corrupted-${ts}`,v);
        localStorage.removeItem(`${LS_PREFIX}${k}-v1`);
      }
    }catch(_){}
  }
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
// Round 5 Batch B: dead state _lastSaveError 削除 (外部から読む手段が無く、listeners だけで十分だった)
const _saveErrorListeners=[];
const onSaveError=fn=>{
  _saveErrorListeners.push(fn);
  return()=>{
    const i=_saveErrorListeners.indexOf(fn);
    if(i>=0)_saveErrorListeners.splice(i,1);
  };
};
const notifySaveError=(key,err)=>{
  const info={key,message:err.message||String(err),at:new Date().toISOString()};
  _saveErrorListeners.forEach(fn=>fn(info));
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
//
// 4.7.33-S17 D (2026-05-21): 同期状態の外部公開 API 追加 (条件3「保存・未同期がユーザーに見える」)。
//   save() 本体ロジックは不変。pending push/pop で _emitSyncState、成功時に _lastSyncAt 記録、
//   onSyncStateChange(fn) で listener 登録。getSyncState() で現状取得。
const _pendingWrites = {};
let _lastSyncAt = null;            // 最後の成功 write の ISO timestamp
const _syncListeners = [];
const getSyncState = () => {
  const keys = Object.keys(_pendingWrites);
  return { pendingKeys: keys.slice(), pendingCount: keys.length, lastSyncAt: _lastSyncAt };
};
const _emitSyncState = () => {
  const s = getSyncState();
  for (let i=0;i<_syncListeners.length;i++){
    try { _syncListeners[i](s); } catch(_) {}
  }
};
const onSyncStateChange = (fn) => {
  _syncListeners.push(fn);
  try { fn(getSyncState()); } catch(_) {}   // 即時 1 回呼ぶ (初期同期)
  return () => {
    const i = _syncListeners.indexOf(fn);
    if (i >= 0) _syncListeners.splice(i, 1);
  };
};
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
      _lastSyncAt = new Date().toISOString();  // 成功時のみ記録 (失敗時は更新しない)
    }catch(err){
      notifySaveError(k,err);
    }
  });
  _pendingWrites[k]=next;
  _emitSyncState();  // pending push を通知
  // chain が無限に伸びないよう完了したら参照を解放
  next.finally(()=>{
    if(_pendingWrites[k]===next)delete _pendingWrites[k];
    _emitSyncState();  // pending pop を通知 (成功/失敗どちらでも emit、判定は listener 側)
  });
};

// 4.7.33-S17 D (2026-05-21): 検証用 test seam — window 露出は読取 API + 副作用が
//   通常の save 経路と同じ関数オブジェクトに限定。本体ロジック不変、build.ps1 不変。
//   _devSimulatePending: dev mode で Firebase 未認証時に pending writes 経路を模擬する
//     ためのテスト用シム。本番運用では UI 側から呼ばれない (アプリ内コードで参照無し)。
if (typeof window !== "undefined") {
  window.__TennisDBSync = {
    onSyncStateChange,
    getSyncState,
    notifySaveError,                  // テストで赤色化確認用
    _devSimulatePending: (key, delayMs=200, fail=false) => {
      // pending 1 件追加 → delayMs 後に解決 (fail=true なら notifySaveError 経由)
      const prev = _pendingWrites[key] || Promise.resolve();
      const next = prev.then(() => new Promise((resolve) => setTimeout(() => {
        if (fail) {
          try { notifySaveError(key, new Error("simulated failure")); } catch(_){}
        } else {
          _lastSyncAt = new Date().toISOString();
        }
        resolve();
      }, delayMs)));
      _pendingWrites[key] = next;
      _emitSyncState();
      next.finally(() => {
        if (_pendingWrites[key] === next) delete _pendingWrites[key];
        _emitSyncState();
      });
    },
  };
}
