# -*- coding: utf-8 -*-
"""ラケット比較ページ生成 (racketpedia/racket_compare.html)。
スイートスポット図は本家のラケット別完成画像 (CDN) を表示、オフライン時は自作SVGに自動フォールバック。
フレックス背景は本家の静的画像を data URI で埋め込み (オフライン対応)。
デザインは string_compare_template.html の <style> をそのまま共有 (見た目統一・claude.ai デザイン踏襲)。
構成は弦版と同型: 一覧 (メーカー順・F5状態維持・ソート) → 行展開 (6軸レーダー+バー+諸元)
→ 詳細オーバーレイ → 複数比較 (チェック→最大4本)。
ラケットの平均比±は本家に存在しない (2026-07-03 実ページ確認) ため非表示。"""
import json, re, io, sys, os, base64
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

FLEX_BG = ''
FLEX_AR = 0.33  # 画像の縦横比 (高さ/幅) 既定値
_p = 'gear/racketpedia/cache/assets/racket-profile-flex.png'
if os.path.exists(_p):
    _raw = open(_p, 'rb').read()
    FLEX_BG = 'data:image/png;base64,' + base64.b64encode(_raw).decode()
    import struct
    _w, _h = struct.unpack('>II', _raw[16:24])  # PNG IHDR
    FLEX_AR = _h / _w

TEMPLATE = 'gear/racketpedia/string_compare_template.html'
OUT = 'gear/racketpedia/racket_compare.html'
SRC = 'gear/racketpedia/out/rackets.json'

if not os.path.exists(SRC):
    print('rackets.json なし — ラケット未取込')
    sys.exit(0)

rows = json.load(open(SRC, encoding='utf-8'))

RKEYS = ['radar_power', 'radar_spin', 'radar_control', 'radar_maneuverability', 'radar_stability', 'radar_comfort']


def brand_disp(b):
    return ' '.join(w.capitalize() for w in (b or '').split('-'))


def to_f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def to_num(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


out = []
for i, s in enumerate(rows, 1):
    bd = brand_disp(s.get('brand'))
    radar = [to_num(s.get(k)) for k in RKEYS]
    obj = radar if all(v is not None for v in radar) else None
    name = s.get('name') or ''
    disp = name
    if bd and disp.lower().startswith(bd.lower()):
        disp = disp[len(bd):].strip()
    out.append({
        'id': i,
        'brand': bd,
        'name': disp or name,
        'fullName': name,
        'slug': s.get('slug'),
        'vkey': re.sub(r'-\d{4}$', '', s.get('slug') or ''),  # 年度違いを同系列に束ねる
        'year': s.get('year') or '',
        'head': to_f(s.get('head_size')),
        'weight': to_f(s.get('weight')),
        'balance': to_f(s.get('balance')),
        'sw': to_f(s.get('swingweight')),
        'spinw': to_f(s.get('spinweight')),
        'twistw': to_f(s.get('twistweight')),
        'beam': s.get('beam') or '',
        'length': to_f(s.get('length')),
        'pattern': s.get('string_pattern') or '',
        'materials': s.get('materials') or '',
        'flex': to_f(s.get('flex_hz')),
        'dra': to_f(s.get('dra')),
        'pub': s.get('test_published') or '',
        'obj': obj,
        'lab': s.get('lab_data') or '',
        # 2026-07-03 拡張 (本家ラケット詳細ページの全データ)
        'ra': to_num(s.get('ra_stiffness')),
        'torsion': s.get('torsion_beam') or '',
        'recoil': to_f(s.get('recoil_weight')),
        'vert': to_num(s.get('vertical_bending')),
        'grip': s.get('grip') or '',
        'profile': s.get('profile_mm') or '',
        'unw': to_f(s.get('unstrung_weight')),
        'unb': to_f(s.get('unstrung_balance')),
        'ssH': to_num(s.get('sweetspot_head')), 'ssC': to_num(s.get('sweetspot_center')),
        'ssS': to_num(s.get('sweetspot_side')), 'ssB': to_num(s.get('sweetspot_bottom')),
        'ssImg': s.get('sweetspot_img') or '',
        'flexEj': [to_f(x) for x in (s.get('flex_flexional') or '').split(',')] if s.get('flex_flexional') else None,
        'flexSt': [to_f(x) for x in (s.get('flex_stiffness') or '').split(',')] if s.get('flex_stiffness') else None,
    })

data_js = json.dumps(out, ensure_ascii=False)

# デザイン共有: 弦テンプレートの <style> ブロックを抽出して使う
tpl = open(TEMPLATE, encoding='utf-8').read()
mstyle = re.search(r'<style>(.*?)</style>', tpl, re.S)
assert mstyle, 'テンプレートの style が見つからない'
style = mstyle.group(1)

EXTRA_CSS = '''
  td.cmpc, th.cmpc{ width:24px; text-align:center; padding:11px 3px; }
  .cmp-chk{ width:16px; height:16px; accent-color:#007AFF; cursor:pointer; }
  .cmp-bar{ position:fixed; right:22px; bottom:22px; z-index:900; display:flex; gap:8px; align-items:center;
    background:#FFFFFF; border:1px solid #DADCE0; border-radius:14px; padding:10px 14px; box-shadow:0 4px 16px rgba(0,0,0,0.13); }
  .cmp-bar .n{ font-size:12.5px; color:#5F6368; }
  .cmp-go{ font:inherit; font-size:13px; font-weight:700; color:#fff; background:#007AFF; border:none; border-radius:10px; padding:8px 16px; cursor:pointer; }
  .cmp-go:disabled{ background:#C7C7CC; cursor:default; }
  .cmp-clear{ font:inherit; font-size:12px; color:#5F6368; background:none; border:none; cursor:pointer; text-decoration:underline; }
  .labmark{ font-size:9px; font-weight:700; color:#0057B8; background:#E1F0FF; border:1px solid #A9D2FF; border-radius:5px; padding:1px 5px; margin-left:6px; vertical-align:1px; white-space:nowrap; }
  .dv-ov{ position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; overflow-y:auto; }
  .dv-sheet{ max-width:1320px; margin:26px auto; background:#F2F2F7; border-radius:22px; padding:24px 28px 40px; position:relative; }
  .dv-x{ position:absolute; top:16px; right:18px; width:32px; height:32px; border:none; border-radius:50%; background:#E0E2E6; color:#5F6368; font-size:16px; font-weight:700; cursor:pointer; }
  .dv-title{ font-size:22px; font-weight:700; }
  .dv-sub{ font-size:12.5px; color:#5F6368; margin-top:3px; display:flex; gap:12px; flex-wrap:wrap; }
  .dv-badge{ display:inline-block; font-size:11px; font-weight:700; color:#fff; background:#007AFF; border-radius:7px; padding:3px 9px; margin-left:10px; vertical-align:3px; }
  .dv-badge.none{ background:#9AA0A6; }
  .dv-chips{ display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 4px; }
  .dv-chip{ font-size:12px; color:#5F6368; background:#FFFFFF; border:1px solid #DADCE0; border-radius:9px; padding:4px 11px; }
  .dv-chip b{ color:#202124; font-weight:600; margin-left:5px; }
  .dv-card{ background:#FFFFFF; border:1px solid #DADCE0; border-radius:20px; padding:20px 22px; margin-top:14px; }
  .dv-card h3{ font-size:13px; font-weight:700; color:#5F6368; margin-bottom:14px; }
  .dv-core{ display:grid; grid-template-columns:auto 1fr; gap:26px; align-items:center; }
  @media (max-width:900px){ .dv-core{ grid-template-columns:1fr; justify-items:center; } }
  .dv-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:900px){ .dv-grid2{ grid-template-columns:1fr; } }
  .dv-rows{ display:flex; flex-direction:column; }
  .dv-row{ display:flex; justify-content:space-between; align-items:baseline; padding:8px 2px; border-bottom:1px solid #F1F3F4; gap:14px; }
  .dv-row:last-child{ border-bottom:none; }
  .dv-row .k{ font-size:12.5px; color:#5F6368; white-space:nowrap; }
  .dv-row .v{ font-size:13px; font-weight:600; text-align:right; font-family:"SF Mono",Menlo,Consolas,monospace; }
  .dv-row .v .u{ font-size:11px; font-weight:400; color:#80868B; margin-left:3px; }
  .dv-axr2{ display:flex; align-items:center; gap:13px; padding:7px 2px; border-bottom:1px solid #F1F3F4; }
  .dv-axr2:last-child{ border-bottom:none; }
  .dv-axname{ flex:0 0 100px; font-size:13px; }
  .dv-axbar{ flex:1; }
  .dv-axv{ font-family:"SF Mono",Menlo,Consolas,monospace; font-size:12px; font-weight:600; margin-bottom:2px; }
  .dv-axv .of{ color:#80868B; font-weight:400; }
  .dv-tr{ height:9px; background:#EEF0F2; border-radius:5px; overflow:hidden; }
  .dv-tr>div{ height:100%; border-radius:5px; background:#007AFF; }
  .dv-vleg{ display:flex; gap:16px; font-size:12px; color:#5F6368; flex-wrap:wrap; margin-bottom:10px; }
  .dv-vleg span{ display:flex; align-items:center; gap:6px; }
  .dv-rl{ width:18px; height:3px; border-radius:2px; display:inline-block; }
  .dv-vgrid{ display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:start; }
  @media (max-width:900px){ .dv-vgrid{ grid-template-columns:1fr; justify-items:center; } }
  .dv-gr{ display:flex; align-items:center; gap:10px; margin-bottom:9px; }
  .dv-gl{ flex:0 0 94px; font-size:12px; color:#5F6368; }
  .dv-gt{ flex:1; display:flex; flex-direction:column; gap:2px; }
  .dv-g1{ height:6px; background:#EEF0F2; border-radius:3px; overflow:hidden; }
  .dv-g1>div{ height:100%; border-radius:3px; }
  .dv-gn{ flex:0 0 160px; font-family:"SF Mono",Menlo,Consolas,monospace; font-size:11px; color:#5F6368; text-align:right; line-height:1.35; white-space:nowrap; }
  table.dv-vt{ width:100%; border-collapse:collapse; font-size:12.5px; margin-top:12px; }
  table.dv-vt th{ font-size:11px; font-weight:600; color:#80868B; text-align:right; padding:7px 8px; border-bottom:1px solid #E8EAED; white-space:nowrap; }
  table.dv-vt th:first-child{ text-align:left; }
  table.dv-vt td{ padding:8px; text-align:right; font-family:"SF Mono",Menlo,Consolas,monospace; border-bottom:1px solid #F1F3F4; white-space:nowrap; }
  table.dv-vt td:first-child{ text-align:left; font-family:inherit; font-weight:600; }
  table.dv-vt tr.cur td{ background:#F3F7FF; }
  .dv-dot{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:7px; }
  .dv-foot{ margin-top:14px; font-size:11px; color:#80868B; line-height:1.7; }
'''

BODY = '''
<div class="wrap"><div class="inner">
  <div class="head">
    <div>
      <div class="title">
        <svg width="22" height="22" viewBox="0 0 24 24"><ellipse cx="12" cy="9" rx="7" ry="8" fill="none" stroke="#9334E0" stroke-width="2"/><path d="M12 17v5" stroke="#9334E0" stroke-width="2"/><path d="M9 6h6M9 9h6M9 12h6M10.5 4.5v9M13.5 4.5v9" stroke="#9334E0" stroke-width="0.8"/></svg>
        ラケット比較
      </div>
      <div class="subtitle">ラボ実測 (重量・バランス・SW・剛性・6軸) でラケットを比べる。<a href="string_compare.html" style="color:#007AFF">→ ストリング比較へ</a></div>
    </div>
    <div class="summary" id="summary"></div>
  </div>

  <div class="controls">
    <div class="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#80868B" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="search" placeholder="名前で検索">
    </div>
    <select id="brand"><option value="">メーカー：すべて</option></select>
    <select id="year"><option value="">年式：すべて</option></select>
    <div class="spacer"></div>
    <div class="legend"><span><span class="sw" style="background:#007AFF"></span>ラボ実測 (6軸)</span></div>
  </div>

  <div class="tablecard"><div class="scroller">
    <table>
      <thead><tr id="headrow"></tr></thead>
      <tbody id="tbody"></tbody>
    </table>
  </div></div>

  <div class="foot">行をクリックすると 6軸レーダーと諸元が開きます。左端チェック→右下ボタンで複数比較 (最大4本)。データは Racketpedia ラボ実測 (個人利用)。</div>
</div></div>
'''

SCRIPT = '''
(function(){
  "use strict";
  var AXES = ["パワー","スピン","コントロール","操作性","安定性","快適性"];
  var DATA = __DATA__;
  var DV_COLORS = ["#007AFF","#1C1C1E","#FF9500","#34C759","#AF52DE","#FF3B30"];
  var CMP_MAX = 4;
  var FLEX_BG = "__FLEX_BG__";
  var FLEX_AR = __FLEX_AR__;
  var NUMCOLS = [
    { key:"head",   label:"ヘッド",  unit:"in²" },
    { key:"weight", label:"重量",    unit:"g" },
    { key:"balance",label:"バランス", unit:"mm" },
    { key:"sw",     label:"SW",     unit:"kgcm²" },
    { key:"flex",   label:"剛性",    unit:"Hz" }
  ];

  var state = { search:"", brand:"", year:"", sortKey:"brand", sortDir:"asc", expandedId:null, cmpIds:[] };
  try{
    var saved = JSON.parse(localStorage.getItem("rc_state")||"null");
    if(saved) ["search","brand","year","sortKey","sortDir","cmpIds"].forEach(function(k){ if(saved[k]!==undefined) state[k]=saved[k]; });
  }catch(e){}

  function save(){
    try{ localStorage.setItem("rc_state", JSON.stringify({search:state.search,brand:state.brand,year:state.year,sortKey:state.sortKey,sortDir:state.sortDir,cmpIds:state.cmpIds})); }catch(e){}
  }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fmt(v){ return v==null ? '<span style="color:#C7C7CC">—</span>' : v; }

  function radarSVG(series, W, H, R){
    var cx=W/2, cy=H/2+4, i, g="";
    function pt(i,v){ var a=-Math.PI/2+i*Math.PI/3; return (cx+Math.cos(a)*R*v/100).toFixed(1)+","+(cy+Math.sin(a)*R*v/100).toFixed(1); }
    g+='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block;overflow:visible">';
    [25,50,75,100].forEach(function(lv){
      var pts=[]; for(i=0;i<6;i++) pts.push(pt(i,lv));
      g+='<polygon points="'+pts.join(" ")+'" fill="none" stroke="#E8EAED"/>';
    });
    for(i=0;i<6;i++){ var p=pt(i,100).split(","); g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="#E8EAED"/>'; }
    for(i=0;i<6;i++){
      var a=-Math.PI/2+i*Math.PI/3, c=Math.cos(a);
      var x=cx+c*(R+15), y=cy+Math.sin(a)*(R+15)+4;
      var anc=Math.abs(c)<0.3?"middle":(c>0?"start":"end");
      g+='<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="10" fill="#5F6368" text-anchor="'+anc+'">'+AXES[i]+'</text>';
    }
    for(var si=0;si<series.length;si++){
      var s=series[si], pts2=[];
      for(i=0;i<6;i++) pts2.push(pt(i,s.vals[i]));
      g+='<polygon points="'+pts2.join(" ")+'" fill="'+s.color+'" fill-opacity="'+(s.fill!=null?s.fill:0.10)+'" stroke="'+s.color+'" stroke-width="2" stroke-linejoin="round"/>';
    }
    g+='</svg>';
    return g;
  }

  function filteredSorted(){
    var list=DATA.filter(function(d){
      if(state.search && (d.brand+" "+d.name).toLowerCase().indexOf(state.search.toLowerCase())===-1) return false;
      if(state.brand && d.brand!==state.brand) return false;
      if(state.year && d.year!==state.year) return false;
      return true;
    });
    var dir=state.sortDir==="asc"?1:-1;
    return list.slice().sort(function(a,b){
      if(state.sortKey==="brand") return ((a.brand+" "+a.name).localeCompare(b.brand+" "+b.name,"ja"))*dir;
      var av,bv;
      if(typeof state.sortKey==="number"){ av=a.obj?a.obj[state.sortKey]:null; bv=b.obj?b.obj[state.sortKey]:null; }
      else { av=a[state.sortKey]; bv=b[state.sortKey]; }
      if(av==null&&bv==null) return 0;
      if(av==null) return 1;
      if(bv==null) return -1;
      return (av-bv)*dir;
    });
  }

  function renderHead(){
    var h="", sb=state.sortKey==="brand";
    h+='<th class="cmpc" title="比較に追加">比較</th>';
    h+='<th class="sortable'+(sb?' active':'')+'" data-sort="brand">ラケット'+(sb?(state.sortDir==="asc"?" ▲":" ▼"):"")+'</th>';
    NUMCOLS.forEach(function(c){
      var act=state.sortKey===c.key;
      h+='<th class="c sortable'+(act?' active':'')+'" data-sort="'+c.key+'">'+c.label+(act?(state.sortDir==="asc"?" ▲":" ▼"):"")+'<div class="unit">'+c.unit+'</div></th>';
    });
    AXES.forEach(function(s,i){
      var act=state.sortKey===i;
      h+='<th class="c sortable'+(act?' active':'')+'" data-sort="'+i+'">'+s+(act?(state.sortDir==="asc"?" ▲":" ▼"):"")+'</th>';
    });
    var hr=document.getElementById("headrow");
    hr.innerHTML=h;
    [].forEach.call(hr.querySelectorAll(".sortable"),function(th){
      th.addEventListener("click",function(){
        var key=th.getAttribute("data-sort");
        if(key!=="brand" && !NUMCOLS.some(function(c){return c.key===key;})) key=parseInt(key,10);
        if(state.sortKey===key){ state.sortDir=state.sortDir==="asc"?"desc":"asc"; }
        else { state.sortKey=key; state.sortDir=(key==="brand")?"asc":"desc"; }
        render();
      });
    });
  }

  function renderRow(d){
    var expanded=state.expandedId===d.id;
    var h='<tr class="data'+(expanded?' expanded':'')+'" data-id="'+d.id+'">';
    h+='<td class="cmpc"><input type="checkbox" class="cmp-chk" data-cmp="'+d.id+'"'+((state.cmpIds||[]).indexOf(d.id)>=0?' checked':'')+'></td>';
    h+='<td><div class="namecell"><svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#80868B" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg><div><div class="name">'+esc(d.name)+(d.year?' <span style="color:#80868B;font-weight:400">('+esc(d.year)+')</span>':'')+'</div><div class="brand">'+esc(d.brand)+(d.obj?' <span class="labmark" title="ラボ6軸あり">詳細</span>':'')+'</div></div></div></td>';
    NUMCOLS.forEach(function(c){ h+='<td class="c mono"'+(c.key==="weight"||c.key==="sw"?' style="font-weight:600"':' style="color:#5F6368"')+'>'+fmt(d[c.key])+'</td>'; });
    for(var i=0;i<6;i++){
      var o=d.obj?d.obj[i]:null;
      h+='<td class="c"><div class="axisval '+(o!=null?'obj':'objnull')+'">'+(o!=null?o:"—")+'</div></td>';
    }
    h+='</tr>';
    if(expanded) h+=renderPanel(d);
    return h;
  }

  function renderPanel(d){
    var h='<tr class="expanded"><td class="panelcell" colspan="13"><div class="panel">';
    h+='<div class="pcol-radar"><div class="plabel">6軸レーダー (ラボ実測)</div>';
    if(d.obj){ h+=radarSVG([{vals:d.obj,color:"#007AFF",fill:0.14}],260,240,86); }
    else { h+='<div class="nolab"><div>6軸スコア未取得<br>(会員ページを開くと入ります)</div></div>'; }
    h+='</div>';
    h+='<div class="pcol-notes" style="flex:1">';
    h+='<button class="dv-open" data-dv="'+d.id+'" style="font:inherit;font-size:12px;font-weight:600;color:#007AFF;background:#E1F0FF;border:1px solid #A9D2FF;border-radius:9px;padding:6px 12px;cursor:pointer;margin-bottom:8px">詳細ページを開く</button>';
    h+='<div class="plabel-sm">主要諸元</div><div class="stiffbox">';
    [["重量",d.weight,"g"],["バランス",d.balance,"mm"],["スイングウェイト",d.sw,"kgcm²"],["剛性",d.ra,"RA"],["剛性 (振動数)",d.flex,"Hz"],["パターン",d.pattern||null,""]].forEach(function(r){
      h+='<div class="stiffrow"><span class="k">'+r[0]+'</span><span class="v">'+(r[1]!=null&&r[1]!==""?r[1]+(r[2]?" "+r[2]:""):"—")+'</span></div>';
    });
    h+='</div></div>';
    h+='</div></td></tr>';
    return h;
  }

  function dvVariants(d){
    if(!d.vkey) return [];
    return DATA.filter(function(x){ return x.vkey===d.vkey; }).sort(function(a,b){ return (a.year||"").localeCompare(b.year||""); });
  }

  var SS_ZONES = [
    { k:'ssH', label:'上部（トップ寄り）',   color:'#F5B70A', bg:'#FFF6E0', fg:'#7E5D00' },
    { k:'ssC', label:'中央',               color:'#F06292', bg:'#FDE7EE', fg:'#B0234E' },
    { k:'ssS', label:'サイド（左右）',      color:'#2196F3', bg:'#E1F0FF', fg:'#0057B8' },
    { k:'ssB', label:'下部（スロート寄り）', color:'#4CAF50', bg:'#E6F4EA', fg:'#0A5B35' }
  ];

  function sweetspotSVG(d){
    // 本家踏襲: ストリング面つきのラケット図に4点の%を配置
    var g='<svg width="250" height="280" viewBox="0 0 250 280" style="display:block">';
    g+='<defs><clipPath id="ssface"><ellipse cx="125" cy="120" rx="82" ry="102"/></clipPath></defs>';
    g+='<ellipse cx="125" cy="120" rx="88" ry="108" fill="none" stroke="#B9BEC4" stroke-width="7"/>';
    // ストリング面
    g+='<g clip-path="url(#ssface)" stroke="#E3E6E9" stroke-width="1">';
    for(var sx=45;sx<=205;sx+=16) g+='<line x1="'+sx+'" y1="10" x2="'+sx+'" y2="230"/>';
    for(var sy=20;sy<=225;sy+=16) g+='<line x1="35" y1="'+sy+'" x2="215" y2="'+sy+'"/>';
    g+='</g>';
    // スロート + グリップ
    g+='<path d="M97 216 L112 252 M153 216 L138 252" stroke="#B9BEC4" stroke-width="7" fill="none" stroke-linecap="round"/>';
    g+='<rect x="117" y="252" width="16" height="26" rx="4" fill="#B9BEC4"/>';
    function spot(x,y,r,color,v){
      if(v==null) return '';
      return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+color+'" stroke="#fff" stroke-width="2.5"/>'
        +'<text x="'+x+'" y="'+(y+5)+'" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">'+v+'%</text>';
    }
    g+=spot(125,52,25,'#F5B70A',d.ssH);
    g+=spot(125,120,28,'#F06292',d.ssC);
    g+=spot(58,120,24,'#2196F3',d.ssS);
    g+=spot(192,120,24,'#2196F3',d.ssS);
    g+=spot(125,186,24,'#4CAF50',d.ssB);
    g+='</svg>';
    return g;
  }

  function sweetspotRows(d){
    // 本家踏襲: ゾーン別の色帯リスト (色帯+ラベル+%+ミニバー)
    var h='';
    SS_ZONES.forEach(function(z){
      var v=d[z.k];
      h+='<div style="display:flex;align-items:center;gap:12px;background:'+z.bg+';border-radius:10px;padding:9px 14px;margin-bottom:8px">';
      h+='<span style="width:11px;height:11px;border-radius:50%;background:'+z.color+';flex:0 0 11px"></span>';
      h+='<span style="flex:1;font-size:12.5px;color:'+z.fg+';font-weight:600">'+z.label+'</span>';
      h+='<span style="flex:0 0 130px"><span style="display:block;height:7px;background:rgba(255,255,255,0.7);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:'+(v!=null?Math.min(v,100):0)+'%;background:'+z.color+';border-radius:4px"></span></span></span>';
      h+='<span style="flex:0 0 52px;text-align:right;font-family:\\'SF Mono\\',Menlo,Consolas,monospace;font-size:14px;font-weight:700;color:'+z.fg+'">'+(v!=null?(v>150?'<span title="本家サイトの表記ミスの可能性 (原文のまま表示)">⚠'+v+'%</span>':v+'%'):'—')+'</span>';
      h+='</div>';
    });
    return h;
  }

  function flexSVG(d){
    // フレックスポイント分析 (本家準拠): 実目盛の左右2軸 + ラケット画像をポイント位置に整合 + Frame RA マーカー
    if(!d.flexEj || !d.flexSt) return '';
    // チャート高さは画像の実比率から決める (縮小・中央寄せをしない = P1〜P7 と画像の位置ズレを起こさない)
    var W=1140, padL=70, padR=64, padB=52, padT=34, i;
    var plotW=W-padL-padR;
    var imgH=Math.round(plotW*FLEX_AR);
    var plotH=Math.max(260, imgH+6);
    var H=padT+plotH+padB;
    var cw=plotW/7, bw=Math.min(74,cw*0.58);
    // 左軸 (曲げ剛性 EJ): きりの良い範囲
    var maxE=Math.max.apply(null,d.flexEj), minE=Math.min.apply(null,d.flexEj);
    var loE=Math.floor(minE*0.92/100)*100, hiE=Math.ceil(maxE*1.06/100)*100;
    // 右軸 (剛性): 0 起点
    var maxS=Math.max.apply(null,d.flexSt);
    var hiS=Math.ceil(maxS*1.12/10)*10;
    function yE(v){ return padT+plotH*(1-(v-loE)/(hiE-loE)); }
    function yS(v){ return padT+plotH*(1-v/hiS); }
    var g='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block;min-width:900px">';
    // 目盛 + 罫線 (左軸基準で6本)
    for(i=0;i<=5;i++){
      var vE=loE+(hiE-loE)*i/5, y=yE(vE);
      g+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="#F1F3F4"/>';
      g+='<text x="'+(padL-8)+'" y="'+(y+4)+'" font-size="10" fill="#3699FF" text-anchor="end">'+Math.round(vE)+'</text>';
      var vS=hiS*i/5;
      g+='<text x="'+(W-padR+8)+'" y="'+(yS(vS)+4)+'" font-size="10" fill="#D9214E">'+Math.round(vS)+'</text>';
    }
    // 軸タイトル
    g+='<text x="14" y="'+(padT+plotH/2)+'" font-size="10.5" font-weight="700" fill="#3699FF" transform="rotate(-90 14 '+(padT+plotH/2)+')" text-anchor="middle">EJ - 曲げ剛性</text>';
    g+='<text x="'+(W-12)+'" y="'+(padT+plotH/2)+'" font-size="10.5" font-weight="700" fill="#D9214E" transform="rotate(90 '+(W-12)+' '+(padT+plotH/2)+')" text-anchor="middle">剛性</text>';
    // ラケット画像: プロット全幅・下寄せ・原寸比率のまま (ヘッド先端≈P1, グリップ末端≈P7)
    if(FLEX_BG){
      g+='<image href="'+FLEX_BG+'" x="'+padL+'" y="'+(H-padB-imgH)+'" width="'+plotW+'" height="'+imgH+'" opacity="0.38"/>';
    }
    var pts=[];
    for(i=0;i<7;i++){
      var xc=padL+cw*i+cw/2;
      var yTop=yS(d.flexSt[i]);
      g+='<rect x="'+(xc-bw/2)+'" y="'+yTop+'" width="'+bw+'" height="'+(H-padB-yTop)+'" rx="4" fill="#F1416C" fill-opacity="0.85"/>';
      var yDot=yE(d.flexEj[i]);
      // 白字の位置は自動回避: 青バッジが根元に近い列は上端側へ、上端も近ければバーの中間へ
      var barH=H-padB-yTop;
      var lblY=H-padB-7;
      if(yDot>H-padB-44){ lblY=(Math.abs(yDot-yTop)<40)?(yTop+barH/2+4):(yTop+15); }
      if(barH>=22) g+='<text x="'+xc+'" y="'+lblY+'" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">'+d.flexSt[i]+'</text>';
      else g+='<text x="'+xc+'" y="'+(yTop-5)+'" font-size="11" font-weight="700" fill="#D9214E" text-anchor="middle">'+d.flexSt[i]+'</text>';
      pts.push([xc,yDot]);
      g+='<text x="'+xc+'" y="'+(H-padB+17)+'" font-size="10.5" fill="#5F6368" text-anchor="middle">P'+(i+1)+'</text>';
    }
    // Frame RA マーカー (フレーム全体の RA と同じ硬さの位置、本家踏襲)
    if(d.ra!=null){
      var best=0, bd=1e9;
      for(i=0;i<7;i++){ var df=Math.abs(d.flexSt[i]-d.ra); if(df<bd){ bd=df; best=i; } }
      var mx=padL+cw*best+cw/2;
      g+='<line x1="'+mx+'" y1="'+(padT-4)+'" x2="'+mx+'" y2="'+(H-padB)+'" stroke="#7239EA" stroke-width="1.5" stroke-dasharray="4 4"/>';
      g+='<rect x="'+(mx-46)+'" y="'+(padT-22)+'" width="92" height="17" rx="8" fill="#7239EA"/>';
      g+='<text x="'+mx+'" y="'+(padT-10)+'" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle">フレーム RA: '+d.ra+'</text>';
    }
    // 青ドット線 (本家と同じ点線) + 値バッジ
    g+='<polyline points="'+pts.map(function(p){return p.join(',');}).join(' ')+'" fill="none" stroke="#3699FF" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>';
    pts.forEach(function(p,i2){
      g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#3699FF" stroke="#fff" stroke-width="1.5"/>';
      g+='<rect x="'+(p[0]-23)+'" y="'+(p[1]-26)+'" width="46" height="17" rx="8" fill="#E1F0FF"/>';
      g+='<text x="'+p[0]+'" y="'+(p[1]-13)+'" font-size="10.5" font-weight="700" fill="#0057B8" text-anchor="middle">'+Math.round(d.flexEj[i2])+'</text>';
    });
    // 凡例 (右上・本家踏襲)
    g+='<circle cx="'+(W-padR-206)+'" cy="16" r="5" fill="#3699FF"/><text x="'+(W-padR-197)+'" y="20" font-size="11" fill="#5F6368">曲げ剛性 EJ</text>';
    g+='<circle cx="'+(W-padR-100)+'" cy="16" r="5" fill="#F1416C"/><text x="'+(W-padR-91)+'" y="20" font-size="11" fill="#5F6368">剛性</text>';
    g+='<text x="'+padL+'" y="'+(H-10)+'" font-size="10.5" fill="#80868B">← トップ側 (P1)</text>';
    g+='<text x="'+(W-padR)+'" y="'+(H-10)+'" font-size="10.5" fill="#80868B" text-anchor="end">グリップ側 (P7) →</text>';
    g+='</svg>';
    return g;
  }

  function dvOpen(d){
    var h='<div class="dv-sheet">';
    h+='<button class="dv-x" title="閉じる">✕</button>';
    h+='<div class="dv-title">'+esc(d.fullName)+'<span class="dv-badge'+(d.obj?'':' none')+'">'+(d.obj?'ラボ実測あり':'基本情報のみ')+'</span></div>';
    h+='<div class="dv-sub"><span>'+esc(d.brand)+'</span>'+(d.pub?'<span>測定公開: '+esc(d.pub)+'</span>':'')+'</div>';
    h+='<div class="dv-chips">';
    if(d.year) h+='<span class="dv-chip">年式<b>'+esc(d.year)+'</b></span>';
    if(d.head!=null) h+='<span class="dv-chip">ヘッド<b>'+d.head+' in²</b></span>';
    if(d.pattern) h+='<span class="dv-chip">パターン<b>'+esc(d.pattern)+'</b></span>';
    if(d.length!=null) h+='<span class="dv-chip">全長<b>'+d.length+'</b></span>';
    if(d.grip) h+='<span class="dv-chip">グリップ<b>'+esc(d.grip)+'</b></span>';
    if(d.materials) h+='<span class="dv-chip">素材<b>'+esc(d.materials)+'</b></span>';
    h+='</div>';
    h+='<div class="dv-card"><h3>6軸ラボ評価</h3>';
    if(d.obj){
      h+='<div class="dv-core"><div>'+radarSVG([{vals:d.obj,color:"#007AFF",fill:0.14}],320,266,88)+'</div><div>';
      for(var i=0;i<6;i++){
        h+='<div class="dv-axr2"><span class="dv-axname">'+AXES[i]+'</span>';
        h+='<div class="dv-axbar"><div class="dv-axv">'+d.obj[i]+'<span class="of"> / 100</span></div><div class="dv-tr"><div style="width:'+d.obj[i]+'%"></div></div></div></div>';
      }
      h+='</div></div>';
      h+='<div class="dv-foot">ラケットには本家の「平均比」が存在しないため表示していません（手持ちのラケットが貯まったら自前平均比を追加予定）。</div>';
    } else {
      h+='<div class="dv-foot">6軸スコア未取得（会員ページを開くと自動で入ります）。</div>';
    }
    h+='</div>';
    var hasDecl=(d.profile||d.unw!=null||d.unb!=null);
    if(hasDecl) h+='<div class="dv-grid2" style="grid-template-columns:1.7fr 1fr">';
    h+='<div class="dv-card"><h3>実測諸元</h3><div class="dv-grid2"><div class="dv-rows">';
    [["重量",d.weight,"g"],["バランス",d.balance,"mm"],["スイングウェイト",d.sw,"kgcm²"],["スピンウェイト",d.spinw,"kgcm²"],["ツイストウェイト",d.twistw,"kgcm²"],["反動重量",d.recoil,"kgcm²"]].forEach(function(r){
      h+='<div class="dv-row"><span class="k">'+r[0]+'</span><span class="v">'+(r[1]!=null?r[1]+'<span class="u">'+r[2]+'</span>':'<span style="color:#C7C7CC">—</span>')+'</span></div>';
    });
    h+='</div><div class="dv-rows">';
    [["剛性",d.ra,"RA"],["剛性 (振動数)",d.flex,"Hz"],["DRA",d.dra,""],["垂直曲げ",d.vert,"RA"],["トーションビーム",d.torsion||null,""]].forEach(function(r){
      h+='<div class="dv-row"><span class="k">'+r[0]+'</span><span class="v">'+(r[1]!=null&&r[1]!==""?r[1]+(r[2]?'<span class="u">'+r[2]+'</span>':''):'<span style="color:#C7C7CC">—</span>')+'</span></div>';
    });
    h+='</div></div></div>';
    // 公称データ (メーカー公称・未張り状態) — 実測諸元と横並び
    if(hasDecl){
      h+='<div class="dv-card"><h3>公称データ（メーカー公称・未張り）</h3><div class="dv-rows">';
      [["プロファイル",d.profile||null,""],["重量（未張り）",d.unw,"g"],["バランス（未張り）",d.unb,"mm"]].forEach(function(r){
        h+='<div class="dv-row"><span class="k">'+r[0]+'</span><span class="v">'+(r[1]!=null&&r[1]!==""?r[1]+(r[2]?'<span class="u">'+r[2]+'</span>':''):'<span style="color:#C7C7CC">—</span>')+'</span></div>';
      });
      h+='<div class="dv-foot" style="margin-top:8px">実測（左）との差 = 個体差・製造公差の目安。</div>';
      h+='</div></div>';
      h+='</div>';  // 横並びグリッドを閉じる
    }
    // スイートスポット分布 (本家のラケット別完成画像。読めない時だけ自作SVGに自動切替)
    if(d.ssC!=null){
      h+='<div class="dv-card"><h3>スイートスポット分布</h3>';
      h+='<div style="display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:center">';
      if(d.ssImg){
        h+='<div><img src="'+esc(d.ssImg)+'" alt="スイートスポット分布" style="width:270px;display:block" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'block\\'">'
          +'<div style="display:none">'+sweetspotSVG(d)+'</div></div>';
      } else {
        h+='<div>'+sweetspotSVG(d)+'</div>';
      }
      h+='<div>'+sweetspotRows(d);
      h+='<div class="dv-foot" style="margin-top:10px">スイートスポット = 面のその場所で打った時に、性能（反発）がどれだけ保たれるか。中央 100% を基準に、外れた位置での落ち込み具合が分かる。数値が高いほど「多少外しても飛ぶ」寛容なラケット。</div>';
      h+='</div></div></div>';
    }
    // フレックスポイント分析 (本家踏襲: ラケットシルエット背景 + 値ラベル付き)
    if(d.flexEj){
      h+='<div class="dv-card"><h3>フレックスポイント分析</h3>';
      h+='<div style="overflow-x:auto">'+flexSVG(d)+'</div>';
      h+='<div class="dv-vleg" style="margin-top:10px">';
      h+='<span><i class="dv-rl" style="background:#F1416C"></i>剛性（たわみにくさ・値が大きいほど硬い）</span>';
      h+='<span><i class="dv-rl" style="background:#3699FF"></i>曲げ剛性 EJ（青バッジの数値）</span>';
      h+='</div>';
      h+='<div class="dv-foot">フレームを7箇所 (P1=トップ 〜 P7=グリップ側) で曲げて測った硬さの分布。トップ側が柔らかい（赤バーが右肩下がり）ほどしなり戻りでボールを運ぶ打感、グリップ側の曲げ剛性 (青) が高いほど土台がブレない。</div>';
      h+='</div>';
    }
    var vs=dvVariants(d);
    if(vs.length>1){
      h+='<div class="dv-card"><h3>同系列 (年式違い)</h3>';
      h+='<table class="dv-vt"><tr><th>ラケット</th><th>年式</th><th>重量 (g)</th><th>バランス (mm)</th><th>SW</th><th>剛性 (Hz)</th></tr>';
      vs.forEach(function(v,vi){
        h+='<tr'+(v.id===d.id?' class="cur"':'')+'><td><i class="dv-dot" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.fullName)+(v.id===d.id?'（この1本）':'')+'</td>';
        h+='<td>'+esc(v.year||'—')+'</td><td>'+(v.weight!=null?v.weight:'—')+'</td><td>'+(v.balance!=null?v.balance:'—')+'</td><td>'+(v.sw!=null?v.sw:'—')+'</td><td>'+(v.flex!=null?v.flex:'—')+'</td></tr>';
      });
      h+='</table></div>';
    }
    h+='<div class="dv-foot">データ出典: Racketpedia ラボ実測（個人利用）。</div>';
    h+='</div>';
    openOverlay(h);
  }

  function cmpStrings(){
    return state.cmpIds.map(function(id){
      for(var i=0;i<DATA.length;i++) if(DATA[i].id===id) return DATA[i];
      return null;
    }).filter(Boolean);
  }

  function cmpOpen(){
    var ss=cmpStrings(), i;
    var h='<div class="dv-sheet">';
    h+='<button class="dv-x" title="閉じる">✕</button>';
    h+='<div class="dv-title">ラケット比較（'+ss.length+'本）</div>';
    h+='<div class="dv-card"><h3>6軸ラボ評価の重ね合わせ</h3>';
    h+='<div class="dv-vleg">';
    ss.forEach(function(v,vi){ h+='<span><i class="dv-rl" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.fullName)+'</span>'; });
    h+='</div>';
    var withR=ss.filter(function(v){return v.obj;});
    if(withR.length>=1){
      var series=ss.map(function(v,vi){ return v.obj?{vals:v.obj,color:DV_COLORS[vi%DV_COLORS.length]}:null; }).filter(Boolean);
      h+='<div class="dv-vgrid"><div>'+radarSVG(series,360,290,92)+'</div><div>';
      for(i=0;i<6;i++){
        var tracks='', nums=[];
        ss.forEach(function(v,vi){
          if(!v.obj) return;
          tracks+='<div class="dv-g1"><div style="width:'+v.obj[i]+'%;background:'+DV_COLORS[vi%DV_COLORS.length]+'"></div></div>';
          nums.push('<span style="font-weight:600">'+v.obj[i]+'</span>');
        });
        h+='<div class="dv-gr"><span class="dv-gl">'+AXES[i]+'</span><div class="dv-gt">'+tracks+'</div><span class="dv-gn">'+nums.join('<span style="color:#C7C7CC"> / </span>')+'</span></div>';
      }
      h+='</div></div>';
    }
    h+='</div>';
    h+='<div class="dv-card"><h3>実測諸元の比較</h3>';
    h+='<table class="dv-vt"><tr><th>ラケット</th><th>ヘッド (in²)</th><th>重量 (g)</th><th>バランス (mm)</th><th>SW</th><th>ツイスト</th><th>反動重量</th><th>剛性 (RA)</th><th>剛性 (Hz)</th><th>SS中央%</th><th>パターン</th></tr>';
    ss.forEach(function(v,vi){
      h+='<tr><td><i class="dv-dot" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.fullName)+'</td>';
      [v.head,v.weight,v.balance,v.sw,v.twistw,v.recoil,v.ra,v.flex,v.ssC].forEach(function(x){ h+='<td>'+(x!=null?x:'—')+'</td>'; });
      h+='<td>'+esc(v.pattern||'—')+'</td></tr>';
    });
    h+='</table></div>';
    h+='</div>';
    openOverlay(h);
  }

  function openOverlay(inner){
    var ov=document.createElement('div');
    ov.className='dv-ov';
    ov.innerHTML=inner;
    document.body.appendChild(ov);
    document.body.style.overflow='hidden';
    ov.addEventListener('click',function(e){
      if(e.target===ov || e.target.closest('.dv-x')){ ov.remove(); document.body.style.overflow=''; }
    });
  }

  function cmpBar(){
    var bar=document.getElementById('cmp-bar');
    if(!state.cmpIds.length){ if(bar) bar.remove(); return; }
    if(!bar){ bar=document.createElement('div'); bar.id='cmp-bar'; bar.className='cmp-bar'; document.body.appendChild(bar); }
    bar.innerHTML='<span class="n">選択中 '+state.cmpIds.length+' / '+CMP_MAX+' 本</span>'
      +'<button class="cmp-go"'+(state.cmpIds.length<2?' disabled':'')+'>比較する</button>'
      +'<button class="cmp-clear">クリア</button>';
    bar.querySelector('.cmp-go').onclick=function(){ if(state.cmpIds.length>=2) cmpOpen(); };
    bar.querySelector('.cmp-clear').onclick=function(){ state.cmpIds=[]; render(); };
  }

  function render(){
    save();
    renderHead();
    var list=filteredSorted();
    var tb=document.getElementById("tbody");
    tb.innerHTML=list.map(renderRow).join("");
    [].forEach.call(tb.querySelectorAll("tr.data"),function(tr){
      tr.addEventListener("click",function(){
        var id=parseInt(tr.getAttribute("data-id"),10);
        state.expandedId=(state.expandedId===id)?null:id;
        render();
      });
    });
    var labN=DATA.filter(function(d){return d.obj;}).length;
    document.getElementById("summary").textContent="全"+DATA.length+"本 · ラボ6軸 "+labN+"本";
    cmpBar();
  }

  // フィルタ選択肢
  (function(){
    ["brand","year"].forEach(function(k){
      var m={}; DATA.forEach(function(d){ if(d[k]) m[d[k]]=1; });
      var sel=document.getElementById(k), head=sel.options[0];
      sel.innerHTML=""; sel.appendChild(head);
      Object.keys(m).sort().forEach(function(v){ var o=document.createElement("option"); o.value=v; o.textContent=v; sel.appendChild(o); });
      sel.value=state[k]||"";
      if(sel.value!==(state[k]||"")) state[k]="";
    });
    document.getElementById("search").value=state.search||"";
  })();

  document.getElementById("search").addEventListener("input",function(e){ state.search=e.target.value; render(); });
  document.getElementById("brand").addEventListener("change",function(e){ state.brand=e.target.value; render(); });
  document.getElementById("year").addEventListener("change",function(e){ state.year=e.target.value; render(); });

  document.addEventListener('change',function(e){
    var c=e.target.closest('.cmp-chk');
    if(!c) return;
    var id=parseInt(c.getAttribute('data-cmp'),10);
    var idx=state.cmpIds.indexOf(id);
    if(c.checked){ if(idx===-1){ if(state.cmpIds.length>=CMP_MAX){ c.checked=false; return; } state.cmpIds.push(id); } }
    else if(idx>=0) state.cmpIds.splice(idx,1);
    render();
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('.cmp-chk')){ e.stopPropagation(); return; }
    var b=e.target.closest('.dv-open');
    if(b){
      e.stopPropagation();
      var id=parseInt(b.getAttribute('data-dv'),10);
      for(var i=0;i<DATA.length;i++) if(DATA[i].id===id){ dvOpen(DATA[i]); break; }
    }
  }, true);

  render();
})();
'''

page = ('<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>ラケット比較</title>\n<style>' + style + EXTRA_CSS + '</style>\n</head>\n<body>\n'
        + BODY + '\n<script>\n' + SCRIPT.replace('__DATA__', data_js).replace('__FLEX_BG__', FLEX_BG)
        .replace('__FLEX_AR__', str(round(FLEX_AR, 4))) + '\n</script>\n</body>\n</html>\n')

open(OUT, 'w', encoding='utf-8').write(page)
print('ラケット数:', len(out))
print('  うち 6軸あり:', sum(1 for d in out if d['obj']))
print('出力:', OUT)
