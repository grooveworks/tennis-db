// ── ID生成 / 日付ユーティリティ ─────────────────
// v3 と同じ挙動を維持（データ互換）

// 一意ID生成: タイムスタンプ36進 + ランダム
const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

// 当日の YYYY-MM-DD (v3:84 移植、blank.js / 編集フォーム / 新規追加で使用)
const today=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// 日付正規化: "2026/4/5" / "2026-04-05" 等を "2026-04-05" に統一
// v3 はハイフン形式（input type="date" が要求）
const normDate=d=>{
  if(!d)return"";
  const s=String(d);
  const m=s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if(!m)return s;
  return`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
};

// 短縮表示: "4/5"
const fmtDate=d=>{
  const nd=normDate(d);
  if(!nd)return"";
  const m=nd.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m?`${parseInt(m[2])}/${parseInt(m[3])}`:"";
};

// 完全表示: "2026/4/5"
const fmtDateFull=d=>{
  const nd=normDate(d);
  if(!nd)return"";
  const m=nd.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m?`${m[1]}/${parseInt(m[2])}/${parseInt(m[3])}`:"";
};

// 日付降順ソート（配列の date フィールドを使用）
const ds=arr=>[...arr].sort((a,b)=>(normDate(b.date)||"").localeCompare(normDate(a.date)||""));
