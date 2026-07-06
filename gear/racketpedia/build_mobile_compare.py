# -*- coding: utf-8 -*-
"""モバイル版ストリング比較ページ生成 (racketpedia/string_compare_mobile.html)。
claude.ai デザイン (design_handoff_string_compare/ストリング比較_mobile.html) を一字一句保ち、
var DATA をデスクトップ版 (string_compare.html) と同じ実データに差し替える。
- COMBO (使用実績マーク) はサンプルID前提のため空に (誤マーク防止)。実データ接続は Firebase 段階で。
- 初期比較選択 [5,4] も実IDと無関係のため空に。"""
import re, io, sys, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TEMPLATE = 'gear/racketpedia/design_handoff_string_compare/ストリング比較_mobile.html'
SRC = 'gear/racketpedia/string_compare.html'   # 実データはデスクトップ版から取る (常に同期)
OUT = 'gear/racketpedia/string_compare_mobile.html'

if not (os.path.exists(TEMPLATE) and os.path.exists(SRC)):
    print('テンプレート or 実データ元なし — スキップ')
    sys.exit(0)

src = open(SRC, encoding='utf-8').read()
m = re.search(r'var DATA = (\[.*?\]);\n', src, re.S)
assert m, '実データ (string_compare.html の DATA) が見つからない'
data = json.loads(m.group(1))
data_js = json.dumps(data, ensure_ascii=False)

html = open(TEMPLATE, encoding='utf-8').read()

# 1) DATA 差し替え
h2, n = re.subn(r'var DATA = \[.*?\];', lambda _: 'var DATA = ' + data_js + ';', html, count=1, flags=re.S)
assert n == 1, 'テンプレートの DATA が見つからない'
html = h2

# 2) COMBO を空に (サンプルID前提の使用実績マークが実データに誤って付くのを防ぐ)
h2, n = re.subn(r'var COMBO = \{.*?\};', 'var COMBO = {};', html, count=1, flags=re.S)
assert n == 1, 'COMBO が見つからない'
html = h2

# 3) 初期比較選択を空に
html = html.replace('compareIds:[5,4]', 'compareIds:[]')

# (性能パッチは不要と実測で判明: 全モード切替 2〜91ms・マップ650ノード29ms。
#  当初の「1秒」はバックグラウンドタブのタイマー制限による計測誤り)

# 4) 実データ650本対応 (2026-07-03 ユーザー指摘 2回目で拡張):
#    a. 絞り込み: メーカー/素材/形状を複数選択に (ピンポイント絞り込み)
#    b. マップ: 軸切替 (静的剛性/動的剛性/8軸レーダー各軸) + 値のない弦は自動除外 + 80本ガイダンス
#    c. 比較追加: メーカーチップで絞って選ぶ方式 (検索は補助) + ラボ取得済みのみ + ゲージ表記
CSS_PATCH = '''
  .mapaxis{ display:flex; gap:6px; overflow-x:auto; padding:8px 16px 2px; -webkit-overflow-scrolling:touch; }
  .mapaxis::-webkit-scrollbar{ display:none; }
  .mx{ flex:0 0 auto; font-size:11.5px; font-weight:600; color:#5F6368; background:#FFFFFF; border:1px solid #DADCE0; border-radius:14px; padding:5px 11px; cursor:pointer; white-space:nowrap; }
  .mx.on{ color:#0057B8; background:#E1F0FF; border-color:#A9D2FF; }
  .pkchips{ display:flex; gap:6px; overflow-x:auto; padding:0 16px 8px; }
  .pkchips::-webkit-scrollbar{ display:none; }
  .pkc{ flex:0 0 auto; font-size:11.5px; font-weight:600; color:#5F6368; background:#F1F3F4; border:1px solid #DADCE0; border-radius:13px; padding:4px 10px; cursor:pointer; white-space:nowrap; }
  .pkc.on{ color:#0057B8; background:#E1F0FF; border-color:#A9D2FF; }
'''

PATCH = '''
  (function(){
    // ===== a. 複数選択フィルタ (メーカー/素材/形状) =====
    state.brands=[]; state.materials=[]; state.shapes=[];
    passFilter = function(d){
      if(state.search && (d.brand+" "+d.name).toLowerCase().indexOf(state.search.toLowerCase())===-1) return false;
      if(state.brands.length && state.brands.indexOf(d.brand)===-1) return false;
      if(state.materials.length && state.materials.indexOf(d.material)===-1) return false;
      if(state.shapes.length && state.shapes.indexOf(d.shape)===-1) return false;
      return true;
    };
    renderChips = (function(_orig){
      return function(){
        // activeCount を複数選択に対応させるため、単一値を擬似的に同期してから元実装を呼ぶ
        state.brand   = state.brands.length   ? state.brands.length+"社"   : "";
        state.material= state.materials.length? state.materials.length+"種": "";
        state.shape   = state.shapes.length   ? state.shapes.length+"種"   : "";
        _orig();
      };
    })(renderChips);
    openFilters = function(){
      document.getElementById("sheet-title").textContent="絞り込み（複数選択可）";
      var body=document.getElementById("sheet-body");
      body.className="sheet-detail";
      function uniqVals(k){ var m={}; DATA.forEach(function(d){ if(d[k]) m[d[k]]=1; }); return Object.keys(m).sort(function(a,b){ return a.localeCompare(b,"ja"); }); }
      function section(key, arrKey, title, opts){
        var cur=state[arrKey];
        var h='<div class="fsec"><div class="fsec-h">'+title+(cur.length?'（'+cur.length+'）':'')+'</div><div class="fchips">';
        h+='<span class="fchip'+(cur.length===0?' on':'')+'" data-arr="'+arrKey+'" data-val="">すべて</span>';
        opts.forEach(function(v){
          h+='<span class="fchip'+(cur.indexOf(v)!==-1?' on':'')+'" data-arr="'+arrKey+'" data-val="'+esc(v)+'">'+esc(v)+'</span>';
        });
        h+='</div></div>';
        return h;
      }
      var frameOpts=Object.keys(FRAMES).map(function(k){ return {label:FRAMES[k].label+"（"+FRAMES[k].power+"）", value:k}; });
      var html='<div class="fsec"><div class="fsec-h">フレーム適合（1つ）</div><div class="fchips">';
      html+='<span class="fchip'+(state.frame===""?' on':'')+'" data-frame="">なし</span>';
      frameOpts.forEach(function(o){ html+='<span class="fchip'+(state.frame===o.value?' on':'')+'" data-frame="'+o.value+'">'+esc(o.label)+'</span>'; });
      html+='</div></div>';
      html+=section("brand","brands","メーカー",uniqVals("brand"));
      html+=section("material","materials","素材",uniqVals("material"));
      html+=section("shape","shapes","形状",uniqVals("shape"));
      html+='<div class="fclear"><button id="f-clear">絞り込みをすべて解除</button></div>';
      body.innerHTML=html;
      [].forEach.call(body.querySelectorAll(".fchip"),function(ch){
        ch.addEventListener("click",function(){
          if(ch.hasAttribute("data-frame")){ state.frame=ch.getAttribute("data-frame"); }
          else {
            var arrKey=ch.getAttribute("data-arr"), val=ch.getAttribute("data-val");
            if(val===""){ state[arrKey]=[]; }
            else {
              var i=state[arrKey].indexOf(val);
              if(i===-1) state[arrKey].push(val); else state[arrKey].splice(i,1);
            }
          }
          openFilters(); render();  // シートは開いたまま選択を重ねられる
        });
      });
      var fc=document.getElementById("f-clear");
      if(fc) fc.addEventListener("click",function(){ state.frame=""; state.brands=[]; state.materials=[]; state.shapes=[]; openFilters(); render(); });
      showSheet();
    };

    // ===== b. マップ軸切替 (静的剛性/動的剛性/8軸) =====
    state.mapAxis="stiff";
    var MAPAXES=[{k:"stiff",label:"静的剛性",unit:"kg/mm",fmt:function(v){return v.toFixed(2);},get:function(d){return d.stiff;}},
                 {k:"dyn",label:"動的剛性",unit:"g/mm",fmt:function(v){return Math.round(v);},get:function(d){return d.tech?d.tech.dyn:null;}}];
    AXES.forEach(function(a,i){ MAPAXES.push({k:String(i),label:a,unit:"/100",fmt:function(v){return Math.round(v);},get:function(d){return d.obj?d.obj[i]:null;}}); });
    renderMap = function(list, frame){
      // 設計オリジナル準拠: 1本=1カード (縦に長くてOK。弦の名前が全部見えることが目的)。
      // 追加点は 軸切替 / 値なし弦の除外 / カード右端の値が選択軸の値になること のみ。
      var ax=MAPAXES.filter(function(m){return m.k===state.mapAxis;})[0]||MAPAXES[0];
      var chips='<div class="mapaxis">'+MAPAXES.map(function(m){
        return '<span class="mx'+(m.k===state.mapAxis?' on':'')+'" data-mx="'+m.k+'">'+m.label+'</span>';
      }).join("")+'</div>';
      var padTop=22, padBot=22, cardGap=50, axisX=46, cardX=66;
      var pool=list.filter(function(d){ var v=ax.get(d); return v!=null; });
      var nodes=pool.slice();
      if(state.usedOnly) nodes=nodes.filter(function(d){ return d.usedWith; });
      nodes.sort(function(a,b){ return ax.get(b)-ax.get(a); });
      var note='<div class="maphint">軸: '+ax.label+'（'+ax.unit+'）・値のある弦 '+pool.length+' / '+list.length+' 本'
        +(ax.k==="stiff"?'。フレームを選ぶと推奨帯が光る':'')+'</div>';
      var html=chips;
      var usedN=pool.filter(function(d){ return d.usedWith; }).length;
      html+='<div class="maptoolbar">';
      html+='<div class="usedtoggle'+(state.usedOnly?' on':'')+'" id="usedonly"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>実績のみ<span class="utc">'+usedN+'</span></div>';
      html+='<div class="maplegend"><span><span class="mk-used"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg></span>使用実績</span><span><span class="mk-consider"></span>検討中</span></div>';
      html+='</div>';
      html+=note;
      if(nodes.length===0){ html+='<div class="empty-list">この軸の値がある弦がありません（絞り込みを見直してください）</div>'; return html; }
      // デザインの語彙のみ (軸・ドット・帯・目盛り・カード・接続線) で、高さ固定の窓方式:
      // 左軸 = 全弦のドットを実寸配置した全体地図 (密集が濃淡で見える)。
      // 右 = 注目値の近くの弦 12本をカード表示。軸タップで注目位置が動く。
      // デザイン原型 100% (縦軸=値の比例配置・ドット・接続線・カード・推奨帯・目盛り)。
      // マップは「絞り込んでから使う」道具。多い時は上に一言添えるだけで、挙動は変えない。
      if(nodes.length>50){
        html+='<div class="maphint" style="color:#7E5D00;background:#FEF7E0;border:1px solid #EAD79A;border-radius:10px;margin:6px 16px;padding:8px 12px">'+nodes.length+'本を表示中。メーカー・検索・フレームで絞るとマップが見やすくなります</div>';
      }
      var vals=nodes.map(function(d){ return ax.get(d); });
      var vmax=Math.max.apply(null,vals), vmin=Math.min.apply(null,vals);
      var vpad=(vmax-vmin)*0.05||0.5; var hi=vmax+vpad, lo=vmin-vpad;
      var span=Math.max(360, nodes.length*cardGap+padTop+padBot);
      function y(v){ return padTop+(1-(v-lo)/(hi-lo))*(span-padTop-padBot); }
      var prev=-Infinity;
      nodes.forEach(function(d){ d._dotY=y(ax.get(d)); d._cardY=Math.max(d._dotY, prev+cardGap); prev=d._cardY; });
      var H=Math.max(span,(nodes.length?nodes[nodes.length-1]._cardY:0)+padBot+24);
      html+='<div class="map" style="height:'+H+'px">';
      html+='<div class="axisline"></div>';
      if(ax.k==="stiff" && frame){
        var yT=y(Math.min(frame.hi,hi)), yB=y(Math.max(frame.lo,lo));
        html+='<div class="band" style="top:'+yT+'px;height:'+(yB-yT)+'px"></div><div class="band-l" style="top:'+(yT+4)+'px">推奨帯</div>';
      }
      for(var t=0;t<4;t++){
        var tv=lo+(hi-lo)*(t+0.5)/4;
        html+='<div class="tick" style="top:'+y(tv)+'px">'+ax.fmt(tv)+'</div><div class="tickmark" style="top:'+y(tv)+'px"></div>';
      }
      nodes.forEach(function(d){
        var v=ax.get(d);
        var rec=!!(ax.k==="stiff" && frame && v>=frame.lo && v<=frame.hi);
        var x1=axisX+7, y1=d._dotY, x2=cardX, y2=d._cardY;
        var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy), ang=Math.atan2(dy,dx)*180/Math.PI;
        html+='<div class="mapconn" style="left:'+x1+'px;top:'+y1+'px;width:'+len+'px;transform:translateY(-50%) rotate('+ang+'deg)"></div>';
        html+='<div class="mapdot" style="top:'+d._dotY+'px;background:'+CATBAR[d.evalCat]+'"></div>';
        var cls='nodecard'+(rec?' rec':'')+(d.usedWith?' used':'')+(d.considering?' considering':'');
        var marks='';
        if(d.considering) marks+='<span class="cardmark consider" title="検討中"></span>';
        if(d.usedWith) marks+='<span class="cardmark used" title="使用実績"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg></span>';
        var usedLine=d.usedWith?'<div class="nu">'+esc(d.usedWith)+'</div>':'';
        html+='<div class="'+cls+'" data-id="'+d.id+'" style="top:'+d._cardY+'px">'+marks+'<div class="nc-main"><div class="nn">'+esc(d.name)+'</div><div class="nb">'+esc(d.brand)+'</div>'+usedLine+'</div><div class="ns">'+ax.fmt(v)+'</div></div>';
      });
      html+='</div>';
      return html;
    };
    document.addEventListener("click",function(e){
      var mx=e.target.closest(".mx");
      if(mx){ state.mapAxis=mx.getAttribute("data-mx"); render(); }
    });

    // ===== c. 比較追加: メーカーチップで絞る + 検索補助 + ラボ取得済みのみ + ゲージ表記 =====
    var pkBrand="";
    openCompareAdd = function(){
      document.getElementById("sheet-title").textContent="比較に追加（ラボデータのある弦）";
      var body=document.getElementById("sheet-body");
      body.className="sheet-list";
      var pool=DATA.filter(function(d){ return d.obj && state.compareIds.indexOf(d.id)===-1; })
        .sort(function(a,b){ return (a.brand+" "+a.name).localeCompare(b.brand+" "+b.name,"ja"); });
      var brands={}; pool.forEach(function(d){ brands[d.brand]=(brands[d.brand]||0)+1; });
      var bkeys=Object.keys(brands).sort();
      // メーカーチップは絞り込みシートと同じ折り返し表示 (29社全部が見える。横スクロールで隠さない)
      body.innerHTML='<div class="fsec" style="padding:0 16px"><div class="fchips" id="pkchips"></div></div>'
        +'<div style="padding:8px 16px 10px"><input id="cmpq" placeholder="検索（補助）" style="width:100%;height:34px;padding:0 12px;border:1px solid #DADCE0;border-radius:10px;font:inherit;font-size:13px;outline:none"></div>'
        +'<div id="cmplist"></div>';
      function paintChips(){
        var el=document.getElementById("pkchips");
        el.innerHTML='<span class="fchip'+(pkBrand===""?' on':'')+'" data-pk="">すべて（'+pool.length+'）</span>'
          +bkeys.map(function(b){ return '<span class="fchip'+(pkBrand===b?' on':'')+'" data-pk="'+esc(b)+'">'+esc(b)+'（'+brands[b]+'）</span>'; }).join("");
        [].forEach.call(el.querySelectorAll(".fchip"),function(c){
          c.addEventListener("click",function(){ pkBrand=c.getAttribute("data-pk"); paintChips(); paintList(); });
        });
      }
      function paintList(){
        var q=(document.getElementById("cmpq")||{}).value||"";
        var items=pool.filter(function(d){
          if(pkBrand && d.brand!==pkBrand) return false;
          return !q || (d.brand+" "+d.name).toLowerCase().indexOf(q.toLowerCase())!==-1;
        });
        var listEl=document.getElementById("cmplist");
        listEl.innerHTML=items.slice(0,150).map(function(d){
          return '<div class="opt" data-id="'+d.id+'"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.name)
            +' <span style="color:#80868B;font-size:12px">'+esc(d.gauge)+'mm</span></span><span class="sub" style="flex:0 0 auto">'+esc(d.brand)+' · '+d.stiff.toFixed(2)+' kg/mm</span></div>';
        }).join("")
        +(items.length>150?'<div style="padding:10px 16px;font-size:12px;color:#80868B">他 '+(items.length-150)+' 本 — メーカーか検索で絞ってください</div>':'')
        +(items.length===0?'<div style="padding:14px 16px;font-size:13px;color:#80868B">該当なし</div>':'');
        [].forEach.call(listEl.querySelectorAll(".opt"),function(el2){
          el2.addEventListener("click",function(){
            var id=parseInt(el2.getAttribute("data-id"),10);
            if(state.compareIds.length<3 && state.compareIds.indexOf(id)===-1) state.compareIds.push(id);
            hideSheet(); render();
          });
        });
      }
      paintChips(); paintList();
      document.getElementById("cmpq").addEventListener("input",paintList);
      showSheet();
    };
  })();
'''
TAIL = '  render();\n'
idx = html.rfind(TAIL)
assert idx != -1, '初期 render 呼び出しが見つからない'
html = html[:idx] + PATCH + html[idx:]

# CSS 追加 (軸切替チップ・ピッカーチップ)
h2 = html.replace('</style>', CSS_PATCH + '</style>', 1)
assert h2 != html, 'CSS 注入位置が見つからない'
html = h2

open(OUT, 'w', encoding='utf-8').write(html)
print('モバイル版生成:', len(data), '本 /', len(html) // 1024, 'KB ->', OUT)
