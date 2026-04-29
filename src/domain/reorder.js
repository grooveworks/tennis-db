// ── 並び順編集ヘルパ（S16 新設、汎用パターン）──────
// DESIGN_SYSTEM_v4.md §11 / DECISIONS_v4.md S16 Phase 1.5 参照。
//
// 純関数のみ（副作用なし、React に依存しない）。
// S16 で ストリング在庫 / Racket Board に最初に適用、後続 Stage の Plan / Insights でも再利用。

// 配列の fromIndex の要素を toIndex 位置に移動した新しい配列を返す。
// 移動後は order を 0,1,2,... で再採番（保存時に Firestore 側で sort key として使う）。
// 不正な index / 同一 index は元のリストのコピーを返す。
const reorderItems=(list,fromIndex,toIndex)=>{
  if(!Array.isArray(list))return [];
  const len=list.length;
  if(fromIndex<0||fromIndex>=len)return [...list];
  if(toIndex<0||toIndex>=len)return [...list];
  if(fromIndex===toIndex)return list.map((item,i)=>({...item,order:i}));
  const result=[...list];
  const [moved]=result.splice(fromIndex,1);
  result.splice(toIndex,0,moved);
  return result.map((item,i)=>({...item,order:i}));
};

// 配列の fromIndex の要素を 1 つ上に移動（fromIndex===0 なら no-op）
const moveItemUp=(list,fromIndex)=>{
  if(!Array.isArray(list)||fromIndex<=0||fromIndex>=list.length)return Array.isArray(list)?[...list]:[];
  return reorderItems(list,fromIndex,fromIndex-1);
};

// 配列の fromIndex の要素を 1 つ下に移動（末尾なら no-op）
const moveItemDown=(list,fromIndex)=>{
  if(!Array.isArray(list)||fromIndex<0||fromIndex>=list.length-1)return Array.isArray(list)?[...list]:[];
  return reorderItems(list,fromIndex,fromIndex+1);
};

// order が無い item に配列 index を order として付与した新しい配列を返す。
// 既に order を持つ item はそのまま（副作用なしの defensive add）。
// 既存データの遅延マイグレーション用（Firestore に書き戻すかは呼び出し側判断）。
const assignDefaultOrders=list=>{
  if(!Array.isArray(list))return [];
  return list.map((item,i)=>{
    if(item==null||typeof item!=="object")return item;
    if(typeof item.order==="number"&&!isNaN(item.order))return item;
    return {...item,order:i};
  });
};

// status 優先度 → order ASC で sort（status が statusPriority に無いものは末尾扱い）。
// rejected / archived / retired は statusPriority で末尾値を与えると末尾に追いやられる。
// statusPriority 例: { active:0, sub:1, candidate:2, considering:3, support:4, retired:5 }
// list は破壊しない（[...list].sort で新しい配列を返す）。
const sortByStatusAndOrder=(list,statusPriority)=>{
  if(!Array.isArray(list))return [];
  const pri=statusPriority||{};
  const fallback=Math.max(...Object.values(pri),-1)+1;
  const getPri=s=>(s in pri)?pri[s]:fallback;
  return [...list].sort((a,b)=>{
    const pa=getPri(a&&a.status);
    const pb=getPri(b&&b.status);
    if(pa!==pb)return pa-pb;
    const oa=(a&&typeof a.order==="number"&&!isNaN(a.order))?a.order:Number.POSITIVE_INFINITY;
    const ob=(b&&typeof b.order==="number"&&!isNaN(b.order))?b.order:Number.POSITIVE_INFINITY;
    return oa-ob;
  });
};

// status 優先度プリセット（S16 racket / string で使う）
const RACKET_STATUS_PRIORITY={active:0,sub:1,candidate:2,considering:3,support:4,retired:5};
const STRING_STATUS_PRIORITY={confirmed:0,good:1,testing:2,candidate:3,hold:4,rejected:5};
const SETUP_STATUS_PRIORITY={active:0,archived:1};
