# -*- coding: utf-8 -*-
"""claude.ai デザイン(string_compare_template.html)を一字一句保ったまま、
var DATA を実データ(全1104弦)に差し替え、フィルタ選択肢も実データから生成する。
出力: racketpedia/string_compare.html
デザインの CSS/JS/構造は変更しない。差し替えるのは DATA 配列 + フィルタ populate のみ。"""
import json, re, io, sys, glob, os, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TEMPLATE = 'gear/racketpedia/string_compare_template.html'
OUT = 'gear/racketpedia/string_compare.html'
SRC = 'gear/racketpedia/out/strings.json'

TYP = {'Monofilament': 'モノ', 'Multifilament/Synthetic': 'マルチ', 'Natural Gut': 'ガット'}
COMP = {'Copolyester': 'コポリエステル', 'Copolyamide': 'コポリアミド', 'Polyamide': 'ナイロン',
        'Polyester': 'ポリエステル', 'Natural gut': 'ナチュラルガット', 'Kevlar': 'ケブラー', 'Copet': 'コペット'}
SHP = {'Round': 'ラウンド', 'Octagonal': '八角形', 'Hexagonal': '六角形', 'Pentagonal': '五角形',
       'Heptagonal': '七角形', 'Square': '四角形', 'Triangolar': '三角形', 'Twisted': 'ねじれ',
       'Rough': '粗面', 'Oval': '楕円形', 'Decagonal': '十角形', 'Shaped': '異形', 'Rectangular': '長方形'}
RKEYS = ['radar_power', 'radar_resilience', 'radar_elasticity', 'radar_spin',
         'radar_control', 'radar_tension_holding', 'radar_stability', 'radar_comfort']


def brand_disp(b):
    return ' '.join(w.capitalize() for w in (b or '').split('-'))


def gauge_of(name, gauges):
    m = re.search(r'(\d{3})\b', name or '')
    if m:
        return '%.2f' % (int(m.group(1)) / 100)
    if gauges:
        m2 = re.search(r'(\d{3})', gauges)
        if m2:
            return '%.2f' % (int(m2.group(1)) / 100)
    return ''


def model_name(name, bd):
    n = name or ''
    if bd and n.lower().startswith(bd.lower()):
        n = n[len(bd):].strip()
    n = re.sub(r'\s*\d{3}\s*$', '', n).strip()
    return n or (name or '')


def jpshape(s):
    if not s:
        return ''
    return '＋'.join(SHP.get(x.strip(), x.strip()) for x in s.split(','))


def mat_fam(comp):
    c = comp or ''
    if re.search(r'Copolyester|Polyester|Copet', c, re.I):
        return 'ポリエステル'
    if re.search(r'Polyamide|Nylon|Elastomer|Urethane', c, re.I):
        return 'ナイロン系'
    if re.search(r'Natural gut', c, re.I):
        return 'ナチュラルガット'
    if re.search(r'Kevlar|Aramid', c, re.I):
        return 'アラミド'
    return 'その他'


def shp_fam(s):
    s = s or ''
    if 'Twisted' in s:
        return 'ねじれ'
    if 'Rough' in s:
        return '粗面'
    if re.search(r'gonal|Square|Triang|Shaped|Rectangular|Oval', s):
        return '多角'
    return 'ラウンド'


def to_num(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


def to_f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def gauge_lineup(gauges):
    """'120, 125, 130' -> '1.20 / 1.25 / 1.30'"""
    if not gauges:
        return ''
    ns = re.findall(r'\d{3}', str(gauges))
    return ' / '.join('%.2f' % (int(n) / 100) for n in ns)


# === 退役 (2026-07-07) ===
# 弦PC版は build_map.py (Claude デザイン本体 = 表/マップ/3D の3タブ1ページ) で生成する。
# このファイルの旧テンプレ方式は末尾で iframe 切替タブを注入し「同一ページに見せる錯覚」を
# 生む構造だったため無効化。string_compare.html を上書きして壊さないよう、何もせず終了する。
print('build_compare.py は退役しました。弦PCは build_map.py で生成します (このスクリプトは何もしません)。')
sys.exit(0)

rows = json.load(open(SRC, encoding='utf-8'))

# 国内入手フィルタ: jp_brands.txt があれば、そのブランド(slug)だけに絞る
JP = 'gear/racketpedia/jp_brands.txt'
if os.path.exists(JP):
    jp = set(l.strip() for l in open(JP, encoding='utf-8') if l.strip() and not l.startswith('#'))
    before = len(rows)
    rows = [r for r in rows if (r.get('brand') or '') in jp]
    print('国内入手フィルタ: %d/%d 件 (採用ブランド %d)' % (len(rows), before, len(jp)))

out = []
for i, s in enumerate(rows, 1):
    bd = brand_disp(s.get('brand'))
    radar = [to_num(s.get(k)) for k in RKEYS]
    obj = radar if all(v is not None for v in radar) else None
    ss = s.get('static_stiffness_avg')
    try:
        stiff = round(float(ss), 2)
    except (TypeError, ValueError):
        stiff = None
    out.append({
        'id': i,
        'brand': bd,
        'name': model_name(s.get('name'), bd),
        'gauge': gauge_of(s.get('name'), s.get('gauges')),
        'structure': TYP.get(s.get('typology'), s.get('typology') or ''),
        'material': COMP.get(s.get('composition'), s.get('composition') or ''),
        'matFam': mat_fam(s.get('composition')),
        'shape': jpshape(s.get('shape')),
        'shpFam': shp_fam(s.get('shape')),
        'stiff': stiff,
        'obj': obj,
        'subj': None,
        'evalCat': 'mishida',
        'evalText': '未試打',
        'memo': '',
        # --- 詳細画面用 (2026-07-03 追加、p3 プレビュー承認レイアウト) ---
        'slug': s.get('slug'),
        'fullName': s.get('name'),
        'vkey': re.sub(r'-\d{3}$', '', s.get('slug') or ''),  # 同モデル系列 (ゲージ違い) の束ね
        'delta': ([to_num(s.get('radar_delta_' + k)) for k in
                   ['power', 'resilience', 'elasticity', 'spin', 'control',
                    'tension_holding', 'stability', 'comfort']]
                  if s.get('radar_delta_power') is not None or s.get('radar_delta_comfort') is not None else None),
        'tech': {
            'ten': s.get('tension_range') or '',
            'resil': s.get('resilience_range') or '',
            'life': s.get('playing_life') or '',
            'pre': s.get('prestretch') or '',
            'prog': s.get('progressive_plasticization') or '',
            'dyn': to_f(s.get('dynamic_stiffness_gmm')),
            'dynsim': to_f(s.get('dynamic_stiffness_sim_lbsin')),
            'elong': to_f(s.get('elongation_5_35_mm')),
            'bands': [to_f(s.get(k)) for k in ['ss_10_15', 'ss_15_20', 'ss_20_25', 'ss_25_30', 'ss_30_35']],
            'pub': s.get('test_published') or '',
            'colors': s.get('colors') or '',
            'lineup': gauge_lineup(s.get('gauges')),
            'tags': s.get('tags') or '',
        },
    })

# stiff が None の弦はソート/表示で壊れるので除外(理論上0件: 平均剛性は全件あり)
out = [d for d in out if d['stiff'] is not None]

data_js = json.dumps(out, ensure_ascii=False)

# claude.ai からダウンロードした最新のデザインHTML(D:/Downloads/ストリング比較*.html)を自動取り込み。
# → ユーザーはDLして「更新した」と言うだけ。チャット添付不要。
# --no-import: データ取込からの自動再生成時はデザイン取り込みをスキップ (不意のテンプレ差し替え防止)
if '--no-import' not in sys.argv:
    cands = glob.glob('D:/Downloads/ストリング比較*.html')
    if cands:
        latest = max(cands, key=os.path.getmtime)
        shutil.copy(latest, TEMPLATE)
        print('取り込み元(最新DL):', latest)

html = open(TEMPLATE, encoding='utf-8').read()

# 1) DATA 配列を差し替え (デザインの他部分は不変)
html, n = re.subn(r'var DATA = \[.*?\];', 'var DATA = ' + data_js + ';', html, count=1, flags=re.S)
assert n == 1, 'DATA 配列が見つからない'

# 1b) 素材/形状フィルタはグループ(family)で照合 (肥大回避・表のセルは精密なまま)
f1 = html.replace('if(state.material && d.material!==state.material) return false;',
                  'if(state.material && d.matFam!==state.material) return false;')
assert f1 != html, 'material フィルタ行が見つからない'
html = f1
f2 = html.replace('if(state.shape && d.shape!==state.shape) return false;',
                  'if(state.shape && d.shpFam!==state.shape) return false;')
assert f2 != html, 'shape フィルタ行が見つからない'
html = f2

# 2) フィルタの選択肢: メーカーは全社、素材/形状は少数グループ(family)
POP = (
    '  (function(){\n'
    '    var KMAP={brand:"brand",material:"matFam",shape:"shpFam"};\n'
    '    function uniq(k){var m={};DATA.forEach(function(d){if(d[k])m[d[k]]=1;});'
    'return Object.keys(m).sort(function(a,b){return a.localeCompare(b,"ja");});}\n'
    '    ["brand","material","shape"].forEach(function(k){\n'
    '      var dk=KMAP[k]; var sel=document.getElementById(k); if(!sel)return; var head=sel.options[0];\n'
    '      sel.innerHTML=""; sel.appendChild(head);\n'
    '      uniq(dk).forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});\n'
    '    });\n'
    '  })();\n\n'
)
anchor = '  render();\n})();'
assert anchor in html, 'populate 挿入位置(末尾render)が見つからない'
html = html.replace(anchor, POP + anchor, 1)

# 3) 詳細画面 (p3 プレビュー承認レイアウト、2026-07-03) を注入。
#    テンプレートは claude.ai 最新DLで上書きされるため、テンプレ編集ではなく生成時注入で持続させる。

DV_CSS = '''
  /* ===== 詳細画面 (dv-) 2026-07-03 注入 ===== */
  .dv-open{ font:inherit; font-size:12px; font-weight:600; color:#007AFF; background:#E1F0FF; border:1px solid #A9D2FF; border-radius:9px; padding:6px 12px; cursor:pointer; margin-bottom:4px; }
  .dv-open:hover{ background:#D2E7FF; }
  .dv-ov{ position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; overflow-y:auto; }
  .dv-sheet{ max-width:1320px; margin:26px auto; background:#F2F2F7; border-radius:22px; padding:24px 28px 40px; position:relative; }
  .dv-x{ position:absolute; top:16px; right:18px; width:32px; height:32px; border:none; border-radius:50%; background:#E0E2E6; color:#5F6368; font-size:16px; font-weight:700; cursor:pointer; }
  .dv-x:hover{ background:#D2D5DA; }
  .dv-title{ font-size:22px; font-weight:700; letter-spacing:-0.01em; }
  .dv-sub{ font-size:12.5px; color:#5F6368; margin-top:3px; display:flex; gap:12px; flex-wrap:wrap; }
  .dv-badge{ display:inline-block; font-size:11px; font-weight:700; color:#fff; background:#007AFF; border-radius:7px; padding:3px 9px; margin-left:10px; vertical-align:3px; }
  .dv-badge.none{ background:#9AA0A6; }
  .dv-chips{ display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 16px; }
  .dv-chip{ font-size:12px; color:#5F6368; background:#FFFFFF; border:1px solid #DADCE0; border-radius:9px; padding:4px 11px; }
  .dv-chip b{ color:#202124; font-weight:600; margin-left:5px; }
  .dv-chip.tag{ color:#0A5B35; background:#E6F4EA; border-color:#8FD0A8; font-weight:600; }
  .dv-card{ background:#FFFFFF; border:1px solid #DADCE0; border-radius:20px; padding:20px 22px; margin-top:14px; }
  .dv-card h3{ font-size:13px; font-weight:700; color:#5F6368; margin-bottom:14px; }
  .dv-core{ display:grid; grid-template-columns:auto 1fr; gap:26px; align-items:center; }
  @media (max-width:900px){ .dv-core{ grid-template-columns:1fr; justify-items:center; } }
  .dv-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:900px){ .dv-grid2{ grid-template-columns:1fr; } }
  .dv-axr{ padding:7px 2px; border-bottom:1px solid #F1F3F4; }
  .dv-axr:last-child{ border-bottom:none; }
  .dv-axline{ display:flex; align-items:center; gap:13px; }
  .dv-axname{ flex:0 0 126px; font-size:13px; }
  .dv-q{ display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:#EEF0F2; color:#80868B; font-size:10.5px; font-weight:700; cursor:pointer; margin-left:6px; border:none; font-family:inherit; vertical-align:1px; }
  .dv-q:hover{ background:#E1F0FF; color:#007AFF; }
  .dv-def{ display:none; font-size:12px; color:#5F6368; background:#F8F9FA; border:1px solid #E8EAED; border-radius:10px; padding:8px 12px; margin:6px 0 3px; line-height:1.7; }
  .dv-def.on{ display:block; }
  .dv-axbar{ flex:1; }
  .dv-axv{ font-family:"SF Mono",Menlo,Consolas,monospace; font-size:12px; font-weight:600; margin-bottom:2px; }
  .dv-axv .of{ color:#80868B; font-weight:400; }
  .dv-tr{ height:9px; background:#EEF0F2; border-radius:5px; overflow:hidden; }
  .dv-tr>div{ height:100%; border-radius:5px; background:#007AFF; }
  .dv-delta{ flex:0 0 116px; text-align:right; }
  .dv-db{ display:inline-block; font-size:11px; font-weight:700; border-radius:8px; padding:3px 8px; white-space:nowrap; }
  .dv-db.up{ color:#1E8E3E; background:#E6F4EA; }
  .dv-db.down{ color:#D93025; background:#FCE8E6; }
  .dv-db.eq{ color:#80868B; background:#F1F3F4; }
  .dv-rows{ display:flex; flex-direction:column; }
  .dv-row{ display:flex; justify-content:space-between; align-items:baseline; padding:8px 2px; border-bottom:1px solid #F1F3F4; gap:14px; }
  .dv-row:last-child{ border-bottom:none; }
  .dv-row .k{ font-size:12.5px; color:#5F6368; white-space:nowrap; }
  .dv-row .v{ font-size:13px; font-weight:600; text-align:right; font-family:"SF Mono",Menlo,Consolas,monospace; }
  .dv-row .v .u{ font-size:11px; font-weight:400; color:#80868B; margin-left:3px; }
  .dv-row .v .orig{ font-size:11px; font-weight:400; color:#C7C7CC; margin-left:7px; }
  .dv-row .v.txt{ font-family:inherit; }
  .dv-band{ display:flex; align-items:center; gap:10px; margin-bottom:7px; }
  .dv-band .bl{ flex:0 0 90px; font-size:11.5px; color:#5F6368; font-family:"SF Mono",Menlo,Consolas,monospace; }
  .dv-band .tr2{ flex:1; height:8px; background:#EEF0F2; border-radius:4px; overflow:hidden; }
  .dv-band .tr2>div{ height:100%; border-radius:4px; background:#007AFF; }
  .dv-band .bv{ flex:0 0 78px; text-align:right; font-family:"SF Mono",Menlo,Consolas,monospace; font-size:12px; font-weight:600; }
  .dv-hint{ font-size:11px; color:#80868B; line-height:1.6; border-top:1px solid #F1F3F4; margin-top:11px; padding-top:8px; }
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
  .dv-subj{ border-color:#F5CD9B; }
  .dv-subj h3{ color:#E07B00; }
  .dv-memo{ font-size:13px; color:#80868B; background:#FFFDF9; border:1px dashed #F5CD9B; border-radius:12px; padding:11px 13px; line-height:1.7; }
  .dv-foot{ margin-top:14px; font-size:11px; color:#80868B; line-height:1.7; }
'''

DV_JS = '''
  /* ===== 詳細画面モジュール (dv-) 2026-07-03 注入 ===== */
  var DV_DEFS = [
    "反発力・反応の速さ・打球時の柔らかい感触といった物理要因で決まるパワー特性。",
    "速いインパクト時のボール応答。値が高いほど速く弾き、低いほど遅く柔らかい応答になる。",
    "引っ張り・戻りでの伸縮性。ナチュラルガットとの比較値。",
    "弾きのピーク・剛性・ボールの食いつき（ポケッティング）で決まるスピン性能。",
    "剛性・食いつき・段階的な張力低下などの物理要因で決まるコントロール性能。",
    "66–71 lbs（30–32kg）まで引いた300秒の静的試験でのテンション低下率から算出。",
    "プレー開始から数時間後の、テンションと挙動の安定度。",
    "静的剛性と動的剛性で決まる快適性。"
  ];
  var DV_AXFULL = ["力（パワー）","弾き（回復ピーク）","弾性","スピン","コントロール","テンション維持","安定性","快適性"];
  var DV_BANDLBS = ["22–33 lbs","33–44 lbs","44–55 lbs","55–66 lbs","66–77 lbs"];
  var DV_COLORS = ["#007AFF","#1C1C1E","#FF9500","#34C759","#AF52DE","#FF3B30"];

  function dvLbs(kg){ return Math.round(kg*2.20462); }
  function dvLbsRange(s){
    var m=/([\\d.]+)\\s*-\\s*([\\d.]+)/.exec(s||"");
    if(!m) return null;
    return { lbs: dvLbs(parseFloat(m[1]))+"–"+dvLbs(parseFloat(m[2])), kg: m[1]+"–"+m[2]+" kg" };
  }
  function dvNumColor(dv){
    if(dv==null) return "#5F6368";
    if(dv>0) return "#1E8E3E";
    if(dv<0) return "#D93025";
    return "#5F6368";
  }
  function dvDeltaBadge(v){
    if(v==null) return "";
    if(v===0) return '<span class="dv-db eq">＝ 平均と同じ</span>';
    if(v>0) return '<span class="dv-db up">▲ 平均より +'+v+'</span>';
    return '<span class="dv-db down">▼ 平均より '+v+'</span>';
  }
  function dvRadarSVG(series, W, H, R){
    var cx=W/2, cy=H/2+4, i, s, g="";
    function pt(i,v){ var a=-Math.PI/2+i*Math.PI/4; return (cx+Math.cos(a)*R*v/100).toFixed(1)+","+(cy+Math.sin(a)*R*v/100).toFixed(1); }
    g+='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block;overflow:visible">';
    [25,50,75,100].forEach(function(lv){
      var pts=[]; for(i=0;i<8;i++) pts.push(pt(i,lv));
      g+='<polygon points="'+pts.join(" ")+'" fill="none" stroke="#E8EAED"/>';
    });
    for(i=0;i<8;i++){ var p=pt(i,100).split(","); g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="#E8EAED"/>'; }
    for(i=0;i<8;i++){
      var a=-Math.PI/2+i*Math.PI/4, c=Math.cos(a);
      var x=cx+c*(R+15), y=cy+Math.sin(a)*(R+15)+4;
      var anc=Math.abs(c)<0.3?"middle":(c>0?"start":"end");
      g+='<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="10" fill="#5F6368" text-anchor="'+anc+'">'+AXES[i]+'</text>';
    }
    for(var si=0;si<series.length;si++){
      s=series[si];
      var pts2=[]; for(i=0;i<8;i++) pts2.push(pt(i,s.vals[i]));
      g+='<polygon points="'+pts2.join(" ")+'" fill="'+s.color+'" fill-opacity="'+(s.fill!=null?s.fill:0.10)+'" stroke="'+s.color+'" stroke-width="2" stroke-linejoin="round"/>';
    }
    g+='</svg>';
    return g;
  }
  function dvVariants(d){
    if(!d.vkey) return [];
    return DATA.filter(function(x){ return x.vkey===d.vkey; })
      .sort(function(a,b){ return (a.gauge||"").localeCompare(b.gauge||""); });
  }
  function dvRow(k,v){ return '<div class="dv-row"><span class="k">'+k+'</span>'+v+'</div>'; }
  function dvOpen(d){
    var t=d.tech||{}, i;
    var hasLab = t.dyn!=null || (d.obj&&d.delta);
    var h='<div class="dv-sheet">';
    h+='<button class="dv-x" title="閉じる">✕</button>';
    h+='<div class="dv-title">'+esc(d.fullName||d.name)+'<span class="dv-badge'+(t.dyn!=null?'':' none')+'">'+(t.dyn!=null?'詳細測定済み':'基本情報のみ')+'</span></div>';
    h+='<div class="dv-sub"><span>'+esc(d.brand)+'</span>'+(t.pub?'<span>測定公開: '+esc(t.pub)+'</span>':'')+'</div>';
    h+='<div class="dv-chips">';
    (t.tags||"").split(",").forEach(function(tg){ tg=tg.trim(); if(tg) h+='<span class="dv-chip tag">'+esc(tg)+'</span>'; });
    if(d.structure) h+='<span class="dv-chip">構造<b>'+esc(d.structure)+'</b></span>';
    if(d.shape) h+='<span class="dv-chip">断面<b>'+esc(d.shape)+'</b></span>';
    if(d.material) h+='<span class="dv-chip">素材<b>'+esc(d.material)+'</b></span>';
    if(t.lineup) h+='<span class="dv-chip">ゲージ展開<b>'+esc(t.lineup)+'</b></span>';
    if(t.colors) h+='<span class="dv-chip">色<b>'+esc(t.colors)+'</b></span>';
    h+='</div>';
    // 順位1: 8軸評価
    h+='<div class="dv-card"><h3>8軸ラボ評価 — 全弦平均との比較つき</h3>';
    if(d.obj){
      var series=[{vals:d.obj,color:"#007AFF",fill:0.14}];
      if(d.subj) series.push({vals:d.subj,color:"#FF9500"});
      h+='<div class="dv-core"><div>'+dvRadarSVG(series,320,266,88);
      h+='<div style="font-size:11px;color:#80868B;text-align:center;margin-top:4px">青 = ラボ実測'+(d.subj?'　<span style="color:#E07B00;font-weight:600">オレンジ = あなたの体感</span>':'。試打すると体感（オレンジ）が重なる')+'</div></div>';
      h+='<div>';
      for(i=0;i<8;i++){
        h+='<div class="dv-axr"><div class="dv-axline">';
        h+='<span class="dv-axname">'+DV_AXFULL[i]+'<button class="dv-q" data-dvq="'+i+'">?</button></span>';
        h+='<div class="dv-axbar"><div class="dv-axv">'+d.obj[i]+'<span class="of"> / 100</span></div><div class="dv-tr"><div style="width:'+d.obj[i]+'%"></div></div></div>';
        h+='<span class="dv-delta">'+(d.delta?dvDeltaBadge(d.delta[i]):'')+'</span>';
        h+='</div><div class="dv-def" id="dv-def-'+i+'">'+DV_DEFS[i]+'</div></div>';
      }
      h+='</div></div>';
      h+='<div class="dv-hint">「平均より」= Racketpedia 全テスト弦の平均との差'+(d.delta?'':'（この弦は未取得 — 個別ページを開くと入る）')+'。<b>?</b> で項目の意味。</div>';
    } else {
      h+='<div class="dv-memo">8軸ラボスコアは未取得（会員ページを開くと自動で入ります）。</div>';
    }
    h+='</div>';
    // 順位2: 技術データ
    h+='<div class="dv-grid2">';
    h+='<div class="dv-card"><h3>技術データ</h3><div class="dv-rows">';
    var tr=dvLbsRange(t.ten);
    h+=dvRow('推奨テンション', tr?'<span class="v">'+tr.lbs+'<span class="u">lbs</span><span class="orig">('+tr.kg+')</span></span>':'<span class="v" style="color:#C7C7CC">—</span>');
    var rr=dvLbsRange(t.resil);
    h+=dvRow('反発レンジ', rr?'<span class="v">'+rr.lbs+'<span class="u">lbs</span><span class="orig">('+rr.kg+')</span></span>':'<span class="v" style="color:#C7C7CC">—</span>');
    h+=dvRow('寿命の目安', t.life?'<span class="v">'+esc(t.life)+'<span class="u">時間</span></span>':'<span class="v" style="color:#C7C7CC">—</span>');
    h+=dvRow('プレストレッチ推奨', '<span class="v txt">'+(t.pre==='Yes'?'推奨':(t.pre==='No'?'不要':'—'))+'</span>');
    h+=dvRow('段階的な張力低下', '<span class="v txt">'+(t.prog==='Yes'||t.prog==='Progressive'?'あり':(t.prog?'なし':'—'))+'</span>');
    h+=dvRow('動的剛性 <button class="dv-q" data-dvq="dyn">?</button>', t.dyn!=null?'<span class="v">'+t.dyn+'<span class="u">g/mm</span>'+(t.dynsim!=null?'<span class="orig">換算 '+t.dynsim+' lbs/inch</span>':'')+'</span>':'<span class="v" style="color:#C7C7CC">—</span>');
    h+='<div class="dv-def" id="dv-def-dyn">インパクトの瞬間に弦へかかる張力の急上昇（動的オーバーテンション）。低いほど衝撃がマイルド。素材・構造など多くの要因で決まる。</div>';
    h+=dvRow('平均静的剛性 <button class="dv-q" data-dvq="stat">?</button>', '<span class="v">'+d.stiff.toFixed(2)+'<span class="u">kg/mm</span></span>');
    h+='<div class="dv-def" id="dv-def-stat">引っ張りに対する硬さ。1 kg/mm = 1mm 伸ばすのに 1kg の力が必要。5→35kg まで連続的に引いて測定した 15–30kg 帯の平均。</div>';
    h+=dvRow('平均伸び（11–77 lbs 加重）', t.elong!=null?'<span class="v">'+t.elong+'<span class="u">mm</span></span>':'<span class="v" style="color:#C7C7CC">—</span>');
    h+='</div></div>';
    h+='<div class="dv-card"><h3>テンション帯別の静的剛性 <button class="dv-q" data-dvq="band">?</button></h3>';
    h+='<div class="dv-def" id="dv-def-band">帯域ごとの硬さ。自分が張るテンションの帯の行を見る。低テンション帯ほど値が大きい＝張り始めが硬い。</div>';
    var hasBand=false;
    for(i=0;i<5;i++) if(t.bands&&t.bands[i]!=null) hasBand=true;
    if(hasBand){
      for(i=0;i<5;i++){
        var bv=t.bands[i];
        h+='<div class="dv-band"><span class="bl">'+DV_BANDLBS[i]+'</span><div class="tr2"><div style="width:'+(bv!=null?Math.min(100,bv/2.0*100).toFixed(0):0)+'%"></div></div><span class="bv">'+(bv!=null?bv.toFixed(2)+' kg/mm':'—')+'</span></div>';
      }
      h+='<div class="dv-hint">テンション帯はポンド表示（元表記 kg を換算）。剛性値は測定単位（kg/mm）のまま。</div>';
    } else {
      h+='<div class="dv-memo">帯別剛性は未取得（会員ページを開くと自動で入ります）。</div>';
    }
    h+='</div></div>';
    // 順位3: バリエーション比較
    var vs=dvVariants(d);
    if(vs.length>1){
      h+='<div class="dv-card"><h3>バリエーション比較 — 同モデルのゲージ違い</h3>';
      var withR=vs.filter(function(v){return v.obj;}).slice(0,4);
      h+='<div class="dv-vleg">';
      vs.forEach(function(v,vi){
        h+='<span><i class="dv-rl" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.gauge||v.name)+(v.id===d.id?'（この弦）':'')+'</span>';
      });
      h+='</div>';
      if(withR.length>1){
        var series2=vs.map(function(v,vi){ return v.obj?{vals:v.obj,color:DV_COLORS[vi%DV_COLORS.length]}:null; }).filter(Boolean).slice(0,4);
        h+='<div class="dv-vgrid"><div>'+dvRadarSVG(series2,360,290,92)+'</div><div>';
        for(i=0;i<8;i++){
          var tracks='', nums=[];
          vs.forEach(function(v,vi){
            if(!v.obj) return;
            tracks+='<div class="dv-g1"><div style="width:'+v.obj[i]+'%;background:'+DV_COLORS[vi%DV_COLORS.length]+'"></div></div>';
            nums.push('<span style="color:'+dvNumColor(v.delta?v.delta[i]:null)+';font-weight:600">'+v.obj[i]+'</span>');
          });
          h+='<div class="dv-gr"><span class="dv-gl">'+AXES[i]+'</span><div class="dv-gt">'+tracks+'</div><span class="dv-gn">'+nums.join('<span style="color:#C7C7CC"> / </span>')+'</span></div>';
        }
        h+='</div></div>';
      }
      h+='<table class="dv-vt"><tr><th>バリエーション</th><th>推奨テンション (lbs)</th><th>動的剛性 (g/mm)</th><th>平均静的剛性 (kg/mm)</th></tr>';
      vs.forEach(function(v,vi){
        var vt=v.tech||{}, vtr=dvLbsRange(vt.ten);
        h+='<tr'+(v.id===d.id?' class="cur"':'')+'><td><i class="dv-dot" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.gauge||v.name)+(v.id===d.id?'（この弦）':'')+'</td>';
        h+='<td>'+(vtr?vtr.lbs:'—')+'</td><td>'+(vt.dyn!=null?vt.dyn:'—')+'</td><td>'+(v.stiff!=null?v.stiff.toFixed(2):'—')+'</td></tr>';
      });
      h+='</table></div>';
    }
    // あなたの記録
    h+='<div class="dv-card dv-subj"><h3>あなたの記録（体感）</h3>';
    if(d.memo){ h+='<div class="dv-memo" style="color:#202124">'+esc(d.memo)+'</div>'; }
    else { h+='<div class="dv-memo">まだ試打記録がありません。試打すると条件（ラケット・テンション・イベント）ごとの評価がここに並び、上のレーダーに体感（オレンジ）が重なります。</div>'; }
    h+='</div>';
    h+='<div class="dv-foot">ポンド換算: 1 kg = 2.20 lbs（テンション系のみ・整数丸め）。項目解説は Racketpedia 本家解説の日本語訳。データ出典: Racketpedia（個人利用）。</div>';
    h+='</div>';
    var ov=document.createElement('div');
    ov.className='dv-ov';
    ov.innerHTML=h;
    document.body.appendChild(ov);
    document.body.style.overflow='hidden';
    ov.addEventListener('click',function(e){
      if(e.target===ov || e.target.closest('.dv-x')){ ov.remove(); document.body.style.overflow=''; return; }
      var q=e.target.closest('.dv-q');
      if(q){ var el=document.getElementById('dv-def-'+q.getAttribute('data-dvq')); if(el) el.classList.toggle('on'); }
    });
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('.dv-open');
    if(!b) return;
    e.stopPropagation();
    var id=parseInt(b.getAttribute('data-dv'),10);
    var d=null;
    for(var i=0;i<DATA.length;i++) if(DATA[i].id===id){ d=DATA[i]; break; }
    if(d) dvOpen(d);
  }, true);

'''

# 4) UX 修正 (2026-07-03 ユーザー指摘: 動的剛性非表示 / 初期並び / F5リセット)

# 4a) 一覧の動的剛性列: ハードコードの「—」を実データ表示に
OLD_DYN_CELL = "html+='<td class=\"c mono\" style=\"color:#C7C7CC\">—</td>';"
NEW_DYN_CELL = ("html+=(d.tech&&d.tech.dyn!=null)"
                "?'<td class=\"c mono\" style=\"font-weight:600\">'+d.tech.dyn+'</td>'"
                ":'<td class=\"c mono\" style=\"color:#C7C7CC\">—</td>';")
assert OLD_DYN_CELL in html, '動的剛性列が見つからない'
html = html.replace(OLD_DYN_CELL, NEW_DYN_CELL, 1)

# 4b) 展開パネルの動的剛性: 「空欄（未取得）」固定を実データ表示に
OLD_DYN_PANEL = 'html+=\'<div class="stiffrow"><span class="k">動的剛性</span><span class="vmuted">空欄（未取得）</span></div>\';'
NEW_DYN_PANEL = ("html+=(d.tech&&d.tech.dyn!=null)"
                 "?'<div class=\"stiffrow\"><span class=\"k\">動的剛性</span><span class=\"v\">'+d.tech.dyn+' g/mm</span></div>'"
                 ":'<div class=\"stiffrow\"><span class=\"k\">動的剛性</span><span class=\"vmuted\">空欄（未取得）</span></div>';")
assert OLD_DYN_PANEL in html, 'パネル動的剛性行が見つからない'
html = html.replace(OLD_DYN_PANEL, NEW_DYN_PANEL, 1)

# 4c) 初期並び: 剛性順 → メーカー順 (弦名+ブランド)
OLD_STATE = 'var state = { search:"", brand:"", material:"", shape:"", frame:"", sortKey:"stiff", sortDir:"asc", expandedId:null,'
NEW_STATE = 'var state = { search:"", brand:"", material:"", shape:"", frame:"", sortKey:"brand", sortDir:"asc", expandedId:null,'
assert OLD_STATE in html, 'state 初期化が見つからない'
html = html.replace(OLD_STATE, NEW_STATE, 1)

# 4d) 並び替えに brand (メーカー+弦名) を追加
OLD_CMP = '      if(state.sortKey==="stiff"){ av=a.stiff; bv=b.stiff; }\n      else {'
NEW_CMP = ('      if(state.sortKey==="brand"){ return ((a.brand+" "+a.name).localeCompare(b.brand+" "+b.name,"ja"))*dir; }\n'
           '      if(state.sortKey==="stiff"){ av=a.stiff; bv=b.stiff; }\n      else {')
assert OLD_CMP in html, 'ソート比較関数が見つからない'
html = html.replace(OLD_CMP, NEW_CMP, 1)

OLD_HEAD = "html+='<th>弦名</th><th>構造・素材</th><th>形状</th>';"
NEW_HEAD = ('var sb=state.sortKey==="brand";\n'
            '    html+=\'<th class="sortable\'+(sb?" active":"")+\'" data-sort="brand">弦名\'+(sb?(state.sortDir==="asc"?" ▲":" ▼"):"")+\'</th><th>構造・素材</th><th>形状</th>\';')
assert OLD_HEAD in html, '弦名ヘッダが見つからない'
html = html.replace(OLD_HEAD, NEW_HEAD, 1)

OLD_SETSORT = 'if(key!=="stiff") key=parseInt(key,10);'
NEW_SETSORT = 'if(key!=="stiff"&&key!=="brand") key=parseInt(key,10);'
assert OLD_SETSORT in html, 'setSort が見つからない'
html = html.replace(OLD_SETSORT, NEW_SETSORT, 1)

OLD_SORTDIR = 'else { state.sortKey=key; state.sortDir=(key==="stiff")?"asc":"desc"; }'
NEW_SORTDIR = 'else { state.sortKey=key; state.sortDir=(key==="stiff"||key==="brand")?"asc":"desc"; }'
assert OLD_SORTDIR in html, 'sortDir 既定が見つからない'
html = html.replace(OLD_SORTDIR, NEW_SORTDIR, 1)

# 4e) 状態の保存/復元 (F5 でも維持)。populate/詳細モジュールの後・初回 render() の前に注入
PERSIST = '''
  /* ===== 状態の保存/復元 (F5 対応) 2026-07-03 注入 ===== */
  (function(){
    var saved=null;
    try{ saved=JSON.parse(localStorage.getItem("sc_state")||"null"); }catch(e){}
    if(saved){
      ["search","brand","material","shape","frame","sortKey","sortDir","highlightDelta","threshold","showSubjective","density"].forEach(function(k){
        if(saved[k]!==undefined) state[k]=saved[k];
      });
      state.expandedId=null;
      document.getElementById("search").value=state.search||"";
      ["brand","material","shape","frame"].forEach(function(k){
        var sel=document.getElementById(k); sel.value=state[k]||"";
        if(sel.value!==(state[k]||"")) state[k]="";  // 保存値が選択肢に無い場合は解除
      });
      document.getElementById("set-highlight").checked=!!state.highlightDelta;
      document.getElementById("set-subj").checked=!!state.showSubjective;
      document.getElementById("set-threshold").value=state.threshold;
      document.getElementById("set-threshold-val").textContent=state.threshold+"pt";
      [].forEach.call(document.querySelectorAll("#set-density button"),function(x){
        x.className=(x.getAttribute("data-d")===state.density?"on":"");
      });
    }
    var _origRender=render;
    render=function(){
      try{ localStorage.setItem("sc_state", JSON.stringify({
        search:state.search, brand:state.brand, material:state.material, shape:state.shape, frame:state.frame,
        sortKey:state.sortKey, sortDir:state.sortDir, highlightDelta:state.highlightDelta,
        threshold:state.threshold, showSubjective:state.showSubjective, density:state.density })); }catch(e){}
      _origRender();
    };
  })();

'''
assert anchor in html, '状態保存の挿入位置が見つからない'
html = html.replace(anchor, PERSIST + anchor, 1)

# 3a) CSS 注入 (最初の </style> の直前)
h2 = html.replace('</style>', DV_CSS + '</style>', 1)
assert h2 != html, 'CSS 注入位置が見つからない'
html = h2

# 3b) 展開パネルに「詳細ページを開く」ボタン注入
BTN_ANCHOR = "html+='<div class=\"pcol-notes\">';"
assert BTN_ANCHOR in html, '詳細ボタン注入位置 (pcol-notes) が見つからない'
html = html.replace(BTN_ANCHOR, BTN_ANCHOR +
                    "\n    html+='<button class=\"dv-open\" data-dv=\"'+d.id+'\">詳細ページを開く</button>';", 1)

# 3c) 詳細モジュール注入 (populate と同じ末尾アンカー)
assert anchor in html, '詳細モジュール挿入位置が見つからない'
html = html.replace(anchor, DV_JS + anchor, 1)

# 5) 複数ストリング比較 (2026-07-03 ユーザー要望)。行チェック → 右下ボタン → 比較オーバーレイ。
#    比較画面は承認済みの「バリエーション比較」型 (レーダー重ね + 軸別棒 + 表) を任意の弦に拡張。

CMP_CSS = '''
  /* ===== 複数比較 (cmp-) 2026-07-03 注入 ===== */
  /* チェック列の追加幅を軸列の余白で吸収し、16列でも元の幅に収める (数字切れ防止) */
  td.cmpc, th.cmpc{ width:24px; text-align:center; padding:11px 3px; }
  th.c, td.c{ padding-left:6px; padding-right:6px; }
  .cmp-chk{ width:16px; height:16px; accent-color:#007AFF; cursor:pointer; }
  .cmp-bar{ position:fixed; right:22px; bottom:22px; z-index:900; display:flex; gap:8px; align-items:center;
    background:#FFFFFF; border:1px solid #DADCE0; border-radius:14px; padding:10px 14px; box-shadow:0 4px 16px rgba(0,0,0,0.13); }
  .cmp-bar .n{ font-size:12.5px; color:#5F6368; }
  .cmp-go{ font:inherit; font-size:13px; font-weight:700; color:#fff; background:#007AFF; border:none; border-radius:10px; padding:8px 16px; cursor:pointer; }
  .cmp-go:disabled{ background:#C7C7CC; cursor:default; }
  .cmp-clear{ font:inherit; font-size:12px; color:#5F6368; background:none; border:none; cursor:pointer; text-decoration:underline; }
'''

CMP_JS = '''
  /* ===== 複数比較モジュール (cmp-) 2026-07-03 注入 ===== */
  var CMP_MAX = 4;
  if(!state.cmpIds) state.cmpIds = [];
  function cmpBar(){
    var bar=document.getElementById('cmp-bar');
    if(!state.cmpIds.length){ if(bar) bar.remove(); return; }
    if(!bar){
      bar=document.createElement('div');
      bar.id='cmp-bar'; bar.className='cmp-bar';
      document.body.appendChild(bar);
    }
    bar.innerHTML='<span class="n">選択中 '+state.cmpIds.length+' / '+CMP_MAX+' 本</span>'
      +'<button class="cmp-go"'+(state.cmpIds.length<2?' disabled':'')+'>比較する</button>'
      +'<button class="cmp-clear">クリア</button>';
    bar.querySelector('.cmp-go').onclick=function(){ if(state.cmpIds.length>=2) cmpOpen(); };
    bar.querySelector('.cmp-clear').onclick=function(){ state.cmpIds=[]; render(); };
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
    h+='<div class="dv-title">ストリング比較（'+ss.length+'本）</div>';
    h+='<div class="dv-card"><h3>8軸ラボ評価の重ね合わせ</h3>';
    h+='<div class="dv-vleg">';
    ss.forEach(function(v,vi){
      h+='<span><i class="dv-rl" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.brand+' '+v.name+' '+v.gauge)+'</span>';
    });
    h+='</div>';
    var withR=ss.filter(function(v){return v.obj;});
    if(withR.length>=1){
      var series=ss.map(function(v,vi){ return v.obj?{vals:v.obj,color:DV_COLORS[vi%DV_COLORS.length]}:null; }).filter(Boolean);
      h+='<div class="dv-vgrid"><div>'+dvRadarSVG(series,360,290,92)+'</div><div>';
      for(i=0;i<8;i++){
        var tracks='', nums=[];
        ss.forEach(function(v,vi){
          if(!v.obj) return;
          tracks+='<div class="dv-g1"><div style="width:'+v.obj[i]+'%;background:'+DV_COLORS[vi%DV_COLORS.length]+'"></div></div>';
          nums.push('<span style="color:'+dvNumColor(v.delta?v.delta[i]:null)+';font-weight:600">'+v.obj[i]+'</span>');
        });
        h+='<div class="dv-gr"><span class="dv-gl">'+AXES[i]+'</span><div class="dv-gt">'+tracks+'</div><span class="dv-gn">'+nums.join('<span style="color:#C7C7CC"> / </span>')+'</span></div>';
      }
      h+='</div></div>';
      h+='<div class="dv-hint">数値の色: <b style="color:#1E8E3E">緑 = 平均より上</b>・<b style="color:#D93025">赤 = 平均より下</b>・グレー = 平均並みか平均比未取得。</div>';
      if(withR.length<ss.length) h+='<div class="dv-hint">8軸スコア未取得の弦はグラフに出ません（表には出ます）。</div>';
    } else {
      h+='<div class="dv-memo">選んだ弦に8軸スコアがまだありません（会員ページを開くと自動で入ります）。</div>';
    }
    h+='</div>';
    h+='<div class="dv-card"><h3>数値比較</h3>';
    h+='<table class="dv-vt"><tr><th>弦</th><th>ゲージ</th><th>静的剛性 (kg/mm)</th><th>動的剛性 (g/mm)</th><th>推奨テンション (lbs)</th><th>寿命 (時間)</th></tr>';
    ss.forEach(function(v,vi){
      var t=v.tech||{}, tr=dvLbsRange(t.ten);
      h+='<tr><td><i class="dv-dot" style="background:'+DV_COLORS[vi%DV_COLORS.length]+'"></i>'+esc(v.brand+' '+v.name)+'</td>';
      h+='<td>'+esc(v.gauge||'—')+'</td><td>'+(v.stiff!=null?v.stiff.toFixed(2):'—')+'</td><td>'+(t.dyn!=null?t.dyn:'—')+'</td>';
      h+='<td>'+(tr?tr.lbs:'—')+'</td><td>'+(t.life?esc(t.life):'—')+'</td></tr>';
    });
    h+='</table>';
    h+='<div class="dv-hint">さらに詳しく見る時は、一覧から弦の行を開いて「詳細ページを開く」。</div></div>';
    h+='</div>';
    var ov=document.createElement('div');
    ov.className='dv-ov';
    ov.innerHTML=h;
    document.body.appendChild(ov);
    document.body.style.overflow='hidden';
    ov.addEventListener('click',function(e){
      if(e.target===ov || e.target.closest('.dv-x')){ ov.remove(); document.body.style.overflow=''; }
    });
  }
  document.addEventListener('change',function(e){
    var c=e.target.closest('.cmp-chk');
    if(!c) return;
    var id=parseInt(c.getAttribute('data-cmp'),10);
    var idx=state.cmpIds.indexOf(id);
    if(c.checked){
      if(idx===-1){
        if(state.cmpIds.length>=CMP_MAX){ c.checked=false; return; }
        state.cmpIds.push(id);
      }
    } else if(idx>=0) state.cmpIds.splice(idx,1);
    render();  // 再描画 = 選択の保存(F5維持)とバー更新を兼ねる
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('.cmp-chk')) e.stopPropagation();
  }, true);
  cmpBar();

'''

# 5a) CSS
h2 = html.replace('</style>', CMP_CSS + '</style>', 1)
assert h2 != html, '比較CSS 注入位置が見つからない'
html = h2

# 6) 一覧に「詳細測定済み」バッジ (2026-07-03 ユーザー要望)。判定は詳細画面と同一 (動的剛性あり)
LAB_CSS = '''
  .labmark{ font-size:9px; font-weight:700; color:#0057B8; background:#E1F0FF; border:1px solid #A9D2FF; border-radius:5px; padding:1px 5px; margin-left:6px; vertical-align:1px; white-space:nowrap; }
'''
h2 = html.replace('</style>', LAB_CSS + '</style>', 1)
assert h2 != html, 'labmark CSS 注入位置が見つからない'
html = h2
# バッジは弦名行でなく2行目 (メーカー名の横) — 長い弦名とレイアウト干渉しない位置
OLD_BRAND = "<div class=\"brand\">'+esc(d.brand)+'</div>"
NEW_BRAND = "<div class=\"brand\">'+esc(d.brand)+((d.tech&&d.tech.dyn!=null)?' <span class=\"labmark\" title=\"詳細測定済み（動的剛性まで取得）\">詳細</span>':'')+'</div>"
assert OLD_BRAND in html, 'メーカー行セルが見つからない'
html = html.replace(OLD_BRAND, NEW_BRAND, 1)

# 5b) ヘッダ先頭にチェック列
OLD_HEAD2 = "var sb=state.sortKey===\"brand\";"
assert OLD_HEAD2 in html, '比較ヘッダ注入位置が見つからない'
html = html.replace(OLD_HEAD2, "html+='<th class=\"cmpc\" title=\"比較に追加\">比較</th>';\n    " + OLD_HEAD2, 1)

# 5c) 行の先頭にチェックボックス (行クリックの開閉とは独立)
ROW_ANCHOR = "var html='<tr class=\"data'+(expanded?' expanded':'')+'\" data-id=\"'+d.id+'\">';"
assert ROW_ANCHOR in html, '比較チェック注入位置が見つからない'
html = html.replace(ROW_ANCHOR, ROW_ANCHOR +
                    "\n    html+='<td class=\"cmpc\"><input type=\"checkbox\" class=\"cmp-chk\" data-cmp=\"'+d.id+'\"'+((state.cmpIds||[]).indexOf(d.id)>=0?' checked':'')+'></td>';", 1)

# 5d) 展開パネルの colspan を 15 -> 16 (チェック列の分)
assert 'colspan="15"' in html, 'colspan が見つからない'
html = html.replace('colspan="15"', 'colspan="16"', 1)

# 5e) モジュール注入 + 保存対象に cmpIds 追加 + render 後にバー更新
assert anchor in html, '比較モジュール挿入位置が見つからない'
html = html.replace(anchor, CMP_JS + anchor, 1)
OLD_SAVE = 'threshold:state.threshold, showSubjective:state.showSubjective, density:state.density })); }catch(e){}'
NEW_SAVE = 'threshold:state.threshold, showSubjective:state.showSubjective, density:state.density, cmpIds:state.cmpIds })); }catch(e){}\n      if(window.cmpBar||typeof cmpBar==="function") cmpBar();'
assert OLD_SAVE in html, '保存関数が見つからない'
html = html.replace(OLD_SAVE, NEW_SAVE, 1)
OLD_RESTORE_KEYS = '["search","brand","material","shape","frame","sortKey","sortDir","highlightDelta","threshold","showSubjective","density"]'
assert OLD_RESTORE_KEYS in html, '復元キー一覧が見つからない'
html = html.replace(OLD_RESTORE_KEYS, '["search","brand","material","shape","frame","sortKey","sortDir","highlightDelta","threshold","showSubjective","density","cmpIds"]', 1)

# 6) 表/マップ切替タブを注入。マップ選択時は strings-map.html を「画面いっぱい」で開く(小さくしない)。
#    表の要素は #tableview へ移動するだけ=表コード無改変。別<script>にしない(器化の取り込みに合わせ IIFE 内)。
TAB_CODE = '''  (function(){
    function init(){
      var inner=document.querySelector('.inner');
      var head=inner&&inner.querySelector('.head');
      if(!inner||!head){ return setTimeout(init,80); }
      if(document.getElementById('vtabs')) return;
      var els=[], e=head.nextElementSibling;
      while(e){ els.push(e); e=e.nextElementSibling; }
      var base='display:flex;align-items:center;gap:6px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;';
      var tabs=document.createElement('div'); tabs.id='vtabs';
      var tT=document.createElement('div'), tM=document.createElement('div');
      tT.textContent='表'; tM.textContent='マップ / 3D';
      tabs.appendChild(tT); tabs.appendChild(tM);
      head.parentNode.insertBefore(tabs, head.nextSibling);
      var vt=document.createElement('div'); vt.id='tableview';
      tabs.parentNode.insertBefore(vt, tabs.nextSibling);
      els.forEach(function(x){ vt.appendChild(x); });
      var vm=document.createElement('div'); vm.id='mapview';
      vt.parentNode.insertBefore(vm, vt.nextSibling);
      var frame=null;
      function sel(which){
        var t=(which==='table');
        tT.style.cssText=base+(t?'color:#007AFF;border-bottom-color:#007AFF;':'color:#80868B;');
        tM.style.cssText=base+(!t?'color:#007AFF;border-bottom-color:#007AFF;':'color:#80868B;');
        if(!t && !frame){
          frame=document.createElement('iframe');
          frame.src='strings-map.html';
          frame.setAttribute('title','ストリング分布マップ');
          frame.style.cssText='width:100%;height:100%;border:none;display:block;background:#F2F2F7;';
          vm.appendChild(frame);
        }
        if(t){
          tabs.style.cssText='display:flex;align-items:center;gap:4px;margin-top:16px;border-bottom:1px solid #E1E3E6;';
          vt.style.display='';
          vm.style.cssText='display:none;';
          document.body.style.overflow='';
        } else {
          tabs.style.cssText='display:flex;align-items:center;gap:4px;position:fixed;top:0;left:0;right:0;height:46px;z-index:10000;background:#fff;border-bottom:1px solid #E1E3E6;padding:0 12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);';
          vt.style.display='none';
          vm.style.cssText='display:block;position:fixed;top:46px;left:0;right:0;bottom:0;z-index:9999;';
          document.body.style.overflow='hidden';
        }
      }
      tT.onclick=function(){ sel('table'); };
      tM.onclick=function(){ sel('map'); };
      sel('table');
    }
    init();
  })();
'''
_tab_anchor = '  render();\n})();'
assert _tab_anchor in html, 'アプリ末尾 render() アンカーが見つからない (tab注入)'
html = html.replace(_tab_anchor, '  render();\n' + TAB_CODE + '})();', 1)

open(OUT, 'w', encoding='utf-8').write(html)
print('実データ弦数:', len(out))
print('  うち 8軸レーダーあり:', sum(1 for d in out if d['obj']))
print('  うち 平均比(delta)あり:', sum(1 for d in out if d.get('delta')))
print('  うち 詳細測定(動的剛性)あり:', sum(1 for d in out if d['tech']['dyn'] is not None))
print('  メーカー数:', len(set(d['brand'] for d in out)))
print('出力:', OUT)
