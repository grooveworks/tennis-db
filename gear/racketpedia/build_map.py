# -*- coding: utf-8 -*-
"""Claude デザイン (design_out/…/ストリング比較.dc.html) を土台に、実データを
window.SC_DATA として埋め込んだ製品ページを生成する。出力: gear/racketpedia/string_compare.html

2026-07-06 全面切替: 旧テンプレへの貼り付け注入(map/detail/compare)を廃止。
デザイン本体(DCランタイム)をそのまま使うため見た目はデザインと完全一致する。
support.js をインライン化し、strings_data.js の代わりに実データを SC_DATA として注入。
アプリ本体(v4/,src/)には触れない。"""
import json, re, io, sys, os, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

OUT = 'gear/racketpedia/string_compare.html'
SRC = 'gear/racketpedia/out/strings.json'
DESIGN_DIR = 'gear/racketpedia/design_handoff_v2/design_out/design_handoff_string_compare'
DESIGN = os.path.join(DESIGN_DIR, 'ストリング比較.dc.html')
SUPPORT = os.path.join(DESIGN_DIR, 'support.js')

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
        # 詳細/系列用の追加フィールド (デザインは未使用でも将来のため保持)
        'slug': s.get('slug'),
        'fullName': s.get('name'),
        'vkey': re.sub(r'-\d{3}$', '', s.get('slug') or ''),
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
            # --- 本家データの取得・変更日 (2026-07-09 追加: データ鮮度の可視化) ---
            'cap': (s.get('last_captured') or '')[:10],   # この弦を本家から最後に取得した日
            'chg': (s.get('changed_at') or '')[:10],      # 本家の内容が変わった日 (無ければ空)
        },
    })

# stiff が None の弦は散布図で壊れるので除外 (理論上0件: 平均剛性は全件あり)
out = [d for d in out if d['stiff'] is not None]

data_js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
# <script> 内に安全に置くため </script 断片を無害化 (JS 文字列としては同義)
data_js = data_js.replace('</', '<\\/')

# --- デザイン本体を土台に製品ページを組み立てる ---
# 注意: support.js はインライン化しない。support.js のソースに含まれる `<x-dc` 文字列
# (DCランタイム自身のパーサ regex) を本文に埋め込むと、DCランタイムがページ再パース時に
# 自分のソースをテンプレートと誤認する。よって元デザインと同じく support.js は外部参照のまま、
# 横に support.js をコピーする。差し替えるのは実データ (strings_data.js -> SC_DATA インライン) のみ。
design = open(DESIGN, encoding='utf-8').read()

# 1) support.js を出力先の隣にコピー (design の <script src="./support.js"> がそのまま解決)
shutil.copy(SUPPORT, os.path.join(os.path.dirname(OUT), 'support.js'))
assert '<script src="./support.js"></script>' in design, 'support.js の読込が見つからない'

# 2) strings_data.js の外部読込を、実データの SC_DATA インラインに差し替え
assert '<script src="./strings_data.js"></script>' in design, 'strings_data.js の読込が見つからない'
design = design.replace('<script src="./strings_data.js"></script>',
                        '<script>window.SC_DATA = ' + data_js + ';</script>', 1)

# 注: データ取得日バッジ(asof)はデザイン本体で実行時に SC_DATA から算出する方式に変更 (2026-07-09)。
#     ビルド時焼き込みだと、自動取込でFirestoreだけ更新された時にバッジが古いまま残るため。

# 2.5) 初期表示は表(ユーザー指定 2026-07-07)。デザイン既定 view:"scatter" を "table" に変更。
#      表・マップ・3Dの3タブはデザイン本体のまま(タブ除去・全画面ハックは廃止)。
_v0 = '    view: "scatter",'
assert _v0 in design, '初期 view state (scatter) が見つからない'
design = design.replace(_v0, '    view: "table",', 1)

# 3) クラスタ一覧(「同じ位置に N 本」)を確実に閉じられるよう補強 (2026-07-06 ユーザー報告)。
#    デザインはパネルから mouseleave した時だけ閉じるが、密集した点の上に出ると
#    離れた先が別の点に当たり閉じない。パネル外クリック / Esc で閉じる手段を追加。
_c1 = ('<div onMouseenter="{{ onClusterEnter }}" onMouseleave="{{ onClusterLeave }}" '
       'style="{{ clusterPanel.wrapStyle }}">')
assert _c1 in design, 'クラスタパネルのラッパが見つからない'
design = design.replace(_c1, _c1.replace('<div ', '<div class="sccluster" ', 1), 1)

_c2 = "    window.addEventListener('resize', this._onResize);\n  }"
assert _c2 in design, 'componentDidMount の resize 登録が見つからない'
design = design.replace(_c2,
    "    window.addEventListener('resize', this._onResize);\n"
    "    this._onDocDown = (e) => { if (this.state.hoverId!=null && !e.target.closest('.scdot') && !e.target.closest('.sccluster')) this.setState({hoverId:null}); };\n"
    "    this._onKey = (e) => { if (e.key==='Escape' && this.state.hoverId!=null) this.setState({hoverId:null}); };\n"
    "    document.addEventListener('mousedown', this._onDocDown, true);\n"
    "    document.addEventListener('keydown', this._onKey);\n"
    "  }", 1)

# 3D版は componentWillUnmount に this.stop3D() を持つ。両対応で当てる。
_c3 = ("componentWillUnmount() { if (this._iv) clearInterval(this._iv); "
       "if (this._onResize) window.removeEventListener('resize', this._onResize); this.stop3D(); }")
assert _c3 in design, 'componentWillUnmount(3D版) が見つからない'
design = design.replace(_c3,
    "componentWillUnmount() { if (this._iv) clearInterval(this._iv); "
    "if (this._onResize) window.removeEventListener('resize', this._onResize); this.stop3D(); "
    "if (this._onDocDown) document.removeEventListener('mousedown', this._onDocDown, true); "
    "if (this._onKey) document.removeEventListener('keydown', this._onKey); }", 1)

# 4) ドラッグ拡大 (2026-07-06 ユーザー要望: 外れ値で大半の点が中央に潰れる → 密集部をドラッグで拡大)。
#    プロット内側をドラッグで矩形選択 → その範囲(データ座標)に拡大。点クリックとは干渉させない。
# 4a) 状態に mpZoom を追加
_z1 = '    hoverId: null, detailId: null,'
assert _z1 in design, 'state hoverId が見つからない'
design = design.replace(_z1, '    hoverId: null, detailId: null, mpZoom: null,', 1)

# 4b) startZoomDrag メソッドを renderVals の直前に追加
_z2 = '  renderVals(){'
assert _z2 in design, 'renderVals が見つからない'
_ZOOM_METHOD = (
    "  startZoomDrag(e){\n"
    "    if (e.button!==0) return;\n"
    "    if (e.target.closest('.scdot') || e.target.closest('.sccluster') || e.target.hasAttribute('data-sclabel')) return;\n"
    "    const area=e.currentTarget, r=area.getBoundingClientRect(), sx=e.clientX, sy=e.clientY;\n"
    "    const rr0=this._range;\n"
    "    if (this.state.mpZoom && !e.shiftKey && rr0){\n"
    "      // 拡大中: ドラッグで移動 (パン)\n"
    "      const base={xmn:rr0.xmn,xmx:rr0.xmx,ymn:rr0.ymn,ymx:rr0.ymx}, w=base.xmx-base.xmn, h=base.ymx-base.ymn;\n"
    "      area.style.cursor='grabbing';\n"
    "      let raf=null, lastEv=null;\n"
    "      const move=(ev)=>{ lastEv=ev; if(raf) return; raf=requestAnimationFrame(()=>{ raf=null; const v=lastEv;\n"
    "        const dx=(v.clientX-sx)/r.width*w, dy=(v.clientY-sy)/r.height*h;\n"
    "        this.setState({mpZoom:{x0:base.xmn-dx, x1:base.xmx-dx, y0:base.ymn+dy, y1:base.ymx+dy}, hoverId:null}); }); };\n"
    "      const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); area.style.cursor=''; };\n"
    "      document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); e.preventDefault();\n"
    "      return;\n"
    "    }\n"
    "    // 範囲拡大 (ボックス選択)\n"
    "    const band=document.createElement('div');\n"
    "    band.style.cssText='position:absolute;border:1px solid #007AFF;background:rgba(0,122,255,0.12);z-index:50;pointer-events:none;';\n"
    "    area.appendChild(band);\n"
    "    const move=(ev)=>{ band.style.left=(Math.min(sx,ev.clientX)-r.left)+'px'; band.style.top=(Math.min(sy,ev.clientY)-r.top)+'px'; band.style.width=Math.abs(ev.clientX-sx)+'px'; band.style.height=Math.abs(ev.clientY-sy)+'px'; };\n"
    "    const up=(ev)=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); band.remove();\n"
    "      if (Math.abs(ev.clientX-sx)<8 || Math.abs(ev.clientY-sy)<8) return;\n"
    "      const rr=this._range; if(!rr) return;\n"
    "      const l=(Math.min(sx,ev.clientX)-r.left)/r.width, rt=(Math.max(sx,ev.clientX)-r.left)/r.width;\n"
    "      const t=(Math.min(sy,ev.clientY)-r.top)/r.height, b=(Math.max(sy,ev.clientY)-r.top)/r.height;\n"
    "      this.setState({mpZoom:{ x0:rr.xmn+(rr.xmx-rr.xmn)*l, x1:rr.xmn+(rr.xmx-rr.xmn)*rt, y1:rr.ymx-(rr.ymx-rr.ymn)*t, y0:rr.ymx-(rr.ymx-rr.ymn)*b }, hoverId:null});\n"
    "    };\n"
    "    document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); e.preventDefault();\n"
    "  }\n")
design = design.replace(_z2, _ZOOM_METHOD + _z2, 1)

# 4c) renderVals: centerMean の後に mpZoom で範囲を上書き + 現在範囲を this._range に保存
_z3 = ("    if (s.centerMean){\n"
       "      const cx=meanVal(ax.get); if (cx!=null){ const h=Math.max(cx-xmn, xmx-cx)||0.1; xmn=cx-h; xmx=cx+h; }\n"
       "      const cy=meanVal(ay.get); if (cy!=null){ const h=Math.max(cy-ymn, ymx-cy)||0.1; ymn=cy-h; ymx=cy+h; }\n"
       "    }")
assert _z3 in design, 'centerMean ブロックが見つからない'
design = design.replace(_z3, _z3 +
    "\n    if (s.mpZoom){ xmn=s.mpZoom.x0; xmx=s.mpZoom.x1; ymn=s.mpZoom.y0; ymx=s.mpZoom.y1; }"
    "\n    this._range = { xmn, xmx, ymn, ymx };", 1)

# 4d) return に onPlotDown / isZoomed / onResetZoom を追加
_z4 = '      plotBoxH,'
assert _z4 in design, 'return の plotBoxH が見つからない'
design = design.replace(_z4,
    '      plotBoxH,\n'
    '      onPlotDown:(e)=>this.startZoomDrag(e), isZoomed:!!s.mpZoom, onResetZoom:()=>this.setState({mpZoom:null}),', 1)

# 4e) プロット内側 div に id + onMouseDown + crosshair カーソル
_z5 = ('<div style="position:absolute;left:64px;right:64px;top:22px;bottom:22px;'
       'border:1px solid #E8EAED;border-radius:8px;background:linear-gradient(#FAFBFC,#FAFBFC);">')
assert _z5 in design, 'プロット内側 div が見つからない'
design = design.replace(_z5, _z5.replace(
    '<div style="', '<div id="mp-plotarea" onMouseDown="{{ onPlotDown }}" style="', 1).replace(
    'background:linear-gradient(#FAFBFC,#FAFBFC);">', 'background:linear-gradient(#FAFBFC,#FAFBFC);cursor:crosshair;">'), 1)

# 4g) 拡大時、表示範囲外の点はプロット外へ漏れるので描画しない
_z7 = ('      const py=(1-(yv-ymn)/((ymx-ymn)||1))*100;\n'
       '      const hasLab=!!d.obj;')
assert _z7 in design, '点ループの py/hasLab が見つからない'
design = design.replace(_z7,
    '      const py=(1-(yv-ymn)/((ymx-ymn)||1))*100;\n'
    '      if (px<-1||px>101||py<-1||py>101) return;\n'
    '      const hasLab=!!d.obj;', 1)

# 4f) プロット上部にドラッグ拡大の案内 + 全体に戻すボタン
_z6 = ('        <!-- plot -->\n'
       '        <div style="position:relative;width:100%;height:{{ plotBoxH }}px;">')
assert _z6 in design, 'plot ボックスが見つからない'
design = design.replace(_z6,
    '        <!-- plot -->\n'
    '        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:11.5px;color:#80868B;flex-wrap:wrap;">'
    '<span>ドラッグで範囲拡大（外れ値で中央に潰れる時に）。拡大中はドラッグで移動・Shift+ドラッグでさらに拡大。</span>'
    '<sc-if value="{{ isZoomed }}" hint-placeholder-val="{{ false }}">'
    '<button onClick="{{ onResetZoom }}" style="font:inherit;font-size:11.5px;font-weight:600;color:#0057B8;background:#E1F0FF;border:1px solid #A9D2FF;border-radius:8px;padding:3px 10px;cursor:pointer;">全体に戻す</button>'
    '</sc-if></div>\n'
    '        <div style="position:relative;width:100%;height:{{ plotBoxH }}px;">', 1)

# 5) 3Dマップの点タップ: 指(接触面が広くズレる)で当たらない対策 (2026-07-07 ユーザー報告)。
#    Meshレイキャストは許容半径が無く、Pencil(正確)は当たるが指は外す。厳密ヒットが無い時は
#    画面上で最も近い点を許容半径内で拾う「近接ピック」にフォールバック。厳密ヒット優先=挙動不変。
_p1 = ('    const onClick = (e) => {\n'
       '      const r = renderer.domElement.getBoundingClientRect();\n'
       '      const mx = ((e.clientX - r.left) / r.width) * 2 - 1;\n'
       '      const my = -((e.clientY - r.top) / r.height) * 2 + 1;\n'
       '      raycaster.setFromCamera({ x:mx, y:my }, camera);\n'
       '      const hit = raycaster.intersectObjects(this._three.meshes)[0];\n'
       '      if (hit) this.setState({ detailId: hit.object.userData.d.id });\n'
       '    };')
assert _p1 in design, '3D onClick が見つからない'
_P1_NEW = (
    '    const onClick = (e) => {\n'
    '      const r = renderer.domElement.getBoundingClientRect();\n'
    '      const px = e.clientX - r.left, py = e.clientY - r.top;\n'
    '      const mx = (px / r.width) * 2 - 1, my = -(py / r.height) * 2 + 1;\n'
    '      raycaster.setFromCamera({ x:mx, y:my }, camera);\n'
    '      let obj = null; const exact = raycaster.intersectObjects(this._three.meshes)[0];\n'
    '      if (exact) { obj = exact.object; }\n'
    '      else {\n'
    '        // 指タップ用フォールバック: 画面上で最も近い点を許容半径内で選ぶ\n'
    '        const v = new THREE.Vector3(); let best=null, bestD=Infinity;\n'
    '        for (const m of this._three.meshes) {\n'
    '          m.getWorldPosition(v); v.project(camera); if (v.z > 1) continue;\n'
    '          const sx=(v.x*0.5+0.5)*r.width, sy=(-v.y*0.5+0.5)*r.height, dd=Math.hypot(sx-px, sy-py);\n'
    '          if (dd < bestD) { bestD = dd; best = m; }\n'
    '        }\n'
    '        const TOL = Math.max(26, Math.min(r.width, r.height) * 0.06);\n'
    '        if (best && bestD <= TOL) obj = best;\n'
    '      }\n'
    '      if (obj) this.setState({ detailId: obj.userData.d.id });\n'
    '    };')
design = design.replace(_p1, _P1_NEW, 1)

# 6) 3Dの点タップを click 依存から pointerdown/up のタップ判定へ (2026-07-07 ユーザー第2報)。
#    iOS Safari は指の微小移動で click を発火しないことがある(Pencilは静止で発火)。OrbitControls が
#    touch を回転として消費する前に、自前で「移動量≦12px=タップ」を判定して onClick を呼ぶ。
#    移動量が大きい=回転ドラッグは選択しない。マウス/Pencil/指を統一して拾える。
_p2 = ('    renderer.domElement.addEventListener("pointermove", onMove);\n'
       '    renderer.domElement.addEventListener("click", onClick);')
assert _p2 in design, '3D イベント登録(pointermove/click)が見つからない'
_P2_NEW = (
    '    renderer.domElement.addEventListener("pointermove", onMove);\n'
    '    // タップ判定: click に依存せず pointerdown/up の移動量で判定 (iOS指タップ対策)\n'
    '    let _tapStart = null;\n'
    '    const onPtrDown = (ev) => { _tapStart = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: Date.now() }; };\n'
    '    const onPtrUp = (ev) => {\n'
    '      const st = _tapStart; _tapStart = null;\n'
    '      if (!st || st.id !== ev.pointerId) return;\n'
    '      const moved = Math.hypot(ev.clientX - st.x, ev.clientY - st.y);\n'
    '      if (moved <= 12 && (Date.now() - st.t) <= 700) onClick(ev);\n'
    '    };\n'
    '    renderer.domElement.addEventListener("pointerdown", onPtrDown);\n'
    '    renderer.domElement.addEventListener("pointerup", onPtrUp);\n'
    '    this._three._tapCleanup = () => { renderer.domElement.removeEventListener("pointerdown", onPtrDown); renderer.domElement.removeEventListener("pointerup", onPtrUp); };')
design = design.replace(_p2, _P2_NEW, 1)

# 7) タッチ操作中の「余計な挙動」対策 (2026-07-07 ユーザー第3報)。
#    iPad で点を操作するとブラウザが周辺UI文字をテキスト選択/長押しメニュー表示してしまう。
#    ツール全体で選択・callout を無効化。データの表だけは値コピーのため選択可に戻す。
# 7a) 最上位コンテナに user-select:none / touch-callout:none
_s1 = ("<div style=\"min-height:100%;background:#F2F2F7;font-family:-apple-system,"
       "BlinkMacSystemFont,'Hiragino Sans','Helvetica Neue',Arial,sans-serif;"
       "color:#202124;padding:26px 30px 60px;\">")
assert _s1 in design, '最上位コンテナが見つからない'
design = design.replace(_s1, _s1.replace(
    'padding:26px 30px 60px;">',
    'padding:26px 30px 60px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;">'), 1)

# 7b) 3Dホストに touch-action:none も追加 (OrbitControls補助・スクロール誤爆防止)
_s2 = ('<div id="sc3d-host" style="position:relative;width:100%;height:620px;'
       'border:1px solid #E8EAED;border-radius:12px;overflow:hidden;'
       'background:radial-gradient(circle at 50% 35%,#FCFCFD,#F4F5F7);cursor:grab;">')
assert _s2 in design, 'sc3d-host が見つからない'
design = design.replace(_s2, _s2.replace(
    'cursor:grab;">', 'cursor:grab;touch-action:none;-webkit-touch-callout:none;">'), 1)

# 7c) データの表(min-width:1000px)だけは選択可に戻す (値コピー用)
_s3 = '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:1000px;">'
assert _s3 in design, 'データ表が見つからない'
design = design.replace(_s3, _s3.replace(
    'min-width:1000px;">', 'min-width:1000px;-webkit-user-select:text;user-select:text;">'), 1)

# (§9 廃止 2026-07-07) 旧「マップ/3D専用ページ化」(表タブ除去・タブバー非表示・全画面化)は撤去。
#   表・マップ・3D の3タブが並んだデザイン本体を、そのまま1ページとして使う。

open(OUT, 'w', encoding='utf-8').write(design)
print('実データ弦数:', len(out))
print('  うち 8軸レーダーあり:', sum(1 for d in out if d['obj']))
print('  うち 平均比(delta)あり:', sum(1 for d in out if d.get('delta')))
print('  うち 詳細測定(動的剛性)あり:', sum(1 for d in out if d['tech']['dyn'] is not None))
print('  メーカー数:', len(set(d['brand'] for d in out)))
print('出力:', OUT, '(デザイン本体 + SC_DATA 注入)')
