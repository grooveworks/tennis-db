# -*- coding: utf-8 -*-
"""Racketpedia HTML パーサ (純粋関数・テスト可能)。
個別ページ / 一覧ページ から構造化データを抽出する。
方針: サイトに無い値は None (= "データなし")。推測で埋めない。
注意点(実HTMLで裏取り済み 2026-06-23):
  - 値は ApexCharts series と 右カラム HTML テーブルの両方に入る。テーブルを正とする。
  - 右カラムの値はラベル直後に popover ツールチップ文が挟まるので、popover を除去してからラベル近接で取る。
  - 動的剛性は 240 g/mm が正 (メモの「235」は別ウィジェット値で誤り)。
  - サイト綴りミス "Average elengation" (elongation ではない)。
"""
import re
import html as htmllib

UNITS = r'(?:kg/mm|g/mm|lbs/inch|mm|kg|hrs)'


def _plain(t):
    """タグ除去 + 空白正規化したテキスト。"""
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', t))).strip()


def _strip_popovers(t):
    """popover ツールチップ (ラベル直後に値を遮る説明文) を除去。"""
    t = re.sub(r'data-bs-content="[^"]*"', ' ', t)
    t = re.sub(r'title="[^"]*"', ' ', t)
    t = re.sub(r'<a [^>]*popover[^>]*>.*?</a>', ' ', t, flags=re.S)
    return t


def _num_after(plain, label, unit):
    """ラベル直後の 数値+単位 を取る (popover 除去済み plain に対して)。"""
    m = re.search(re.escape(label) + r'\s+([0-9][0-9.]*)\s*' + unit + r'\b', plain)
    return float(m.group(1)) if m else None


def _between(plain, label, nxt):
    """label と 次ラベル の間のテキスト (General info 用)。"""
    m = re.search(re.escape(label) + r'\s+(.+?)\s+' + re.escape(nxt), plain)
    return m.group(1).strip() if m else None


def parse_detail(t):
    """個別ページ HTML -> dict。"""
    plain = _plain(t)
    vals_plain = _plain(_strip_popovers(t))  # 右カラム数値用 (popover 除去)

    # --- 弦名: <title> が全ページで確実。radar 主役 series 名は full ページのみ。 ---
    mt = re.search(r'<title>([^<]+)</title>', t)
    title_name = mt.group(1).strip() if mt else None
    radar_main_name = None
    radar_all = {}
    for nm, arr in re.findall(r'name:"([^"]+)",data:\[(\d+(?:,\d+){7})\]', t):
        vals = [int(x) for x in arr.split(',')]
        radar_all.setdefault(nm, vals)
        if radar_main_name is None and nm != 'Similar strings average values':
            radar_main_name = nm
    main_name = title_name or radar_main_name
    main_radar = radar_all.get(radar_main_name)  # full ページのみ (gated)

    # --- 帯別静的剛性カーブ (主役弦の小数5要素 series, full ページのみ) ---
    band = None
    if radar_main_name:
        bm = re.search(r'name:"' + re.escape(radar_main_name) + r'",data:\[(\d+\.\d+(?:,[\d.]+){4})\]', t)
        if bm:
            band = [float(x) for x in bm.group(1).split(',')]

    # --- 右カラム値テーブル (popover 除去後にラベル近接) ---
    ss = {
        'ss_10_15': _num_after(vals_plain, 'Static stiffness 10-15kg', 'kg/mm'),
        'ss_15_20': _num_after(vals_plain, 'Static stiffness 15-20kg', 'kg/mm'),
        'ss_20_25': _num_after(vals_plain, 'Static stiffness 20-25kg', 'kg/mm'),
        'ss_25_30': _num_after(vals_plain, 'Static stiffness 25-30kg', 'kg/mm'),
        'ss_30_35': _num_after(vals_plain, 'Static stiffness 30-35kg', 'kg/mm'),
    }
    # 平均静的剛性: 説明文 prose に全ページ記載 ("average static stiffness is X kg/mm")。
    # full ページは値テーブルにも同値があるが、prose を正(全件取得可)とする。
    ma = re.search(r'average static stiffness is ([\d.]+)\s*kg/mm', plain, re.I)
    static_avg = float(ma.group(1)) if ma else _num_after(vals_plain, 'Average static stiffness 15-30kg', 'kg/mm')
    dyn = _num_after(vals_plain, 'Dynamic stiffness', 'g/mm')
    dyn_sim = _num_after(vals_plain, 'string selector test simulator)', 'lbs/inch')
    elong = _num_after(vals_plain, 'Average elengation 5-35kg (calculated)', 'mm')
    if elong is None:  # サイトが綴りを直した場合の保険
        elong = _num_after(vals_plain, 'Average elongation 5-35kg (calculated)', 'mm')

    # --- General info / Technical data (次ラベル区切り) ---
    typology = _between(plain, 'Typology', 'Shape')
    shape = _between(plain, 'Shape', 'Composition')
    composition = _between(plain, 'Composition', 'Available colors')
    colors = _between(plain, 'Available colors', 'Available gauges')
    mg = re.search(r'Available gauges\s+(\d{2,3}(?:\s*,\s*\d{2,3})*)', plain)
    gauges = mg.group(1) if mg else None
    tension_range = _between(plain, 'Tension range', 'kg')
    resilience_range = _between(plain, 'Resilience range', 'kg')
    playing_life = _between(plain, 'Playing life', 'hrs')
    mp = re.search(r'Prestretch \(recommended\)\s+(\w+)', plain)
    prestretch = mp.group(1) if mp else None
    mp = re.search(r'Progressive plasticization\s+(\w+)', plain)
    progressive = mp.group(1) if mp else None
    mp = re.search(r'Test published on\s+([\d/]+)', plain)
    test_published = mp.group(1) if mp else None

    # --- 8軸の平均比 (±N average-related、会員ページ 2026-07 確認) ---
    # 行構造: <td class=align-middle>Label <a popover>... <td>85 / 100 <progress>... <td><i 矢印> <span>-2 average-related</span>
    radar_delta = {}
    for key, label in [('power', 'Power'), ('resilience', 'Resilience peak'), ('elasticity', 'Elasticity'),
                       ('spin', 'Spin'), ('control', 'Control'), ('tension_holding', 'Tension holding'),
                       ('stability', 'Stability'), ('comfort', 'Comfort')]:
        mrow = re.search(r'align-middle>\s*' + re.escape(label) + r'\s*<a', t)
        if mrow:
            seg = t[mrow.end():mrow.end() + 900]
            md = re.search(r'([+-]?\d+)\s*average-related', seg)
            if md:
                radar_delta[key] = int(md.group(1))
            elif 'Equal to average' in seg:  # 平均と同値の時は数字なしの別表記
                radar_delta[key] = 0
    if not radar_delta:
        radar_delta = None

    # --- 硬さバッジ (Tough/Soft/Medium) ---
    # str-stiff-lab は Soft/Medium/Tough のスケール目盛(3個)。
    # str-stiff-lab-l (-l付き) がこの弦のアクティブ位置 = 実際の硬さ判定。
    badge = None
    mb = re.search(r'class=str-stiff-lab-l>([A-Za-z]+)<', t)
    if mb:
        badge = mb.group(1)

    # --- 属性タグ (緑バッジ) ---
    tags = re.findall(
        r'class="badge badge-success[^"]*"[^>]*>\s*<span class="fab[^"]*"></span>(?:&nbsp;|\s)*([^<]+?)</span>', t)
    tags = [x.strip() for x in tags]

    return {
        'name': main_name,
        # full = 詳細ラボデータ(8軸radar/帯別/動的剛性)を自ページに保持(無料サンプル弦のみ)。
        # それ以外は会員ゲートの裏。specs(name/形状/組成/平均剛性/タグ)は全件取得可。
        'has_full_lab': main_radar is not None,
        'radar': dict(zip(
            ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort'],
            main_radar)) if main_radar else None,
        'radar_delta': radar_delta,  # 8軸の平均比 (±N)、判断軸。会員ページのみ
        'band_curve': band,
        'static_stiffness_avg': static_avg,
        **ss,
        'dynamic_stiffness_gmm': dyn,
        'dynamic_stiffness_sim_lbsin': dyn_sim,
        'elongation_5_35_mm': elong,
        'typology': typology, 'shape': shape, 'composition': composition,
        'colors': colors, 'gauges': gauges,
        'tension_range': tension_range, 'resilience_range': resilience_range,
        'playing_life': playing_life, 'prestretch': prestretch,
        'progressive_plasticization': progressive,
        'stiffness_badge': badge, 'test_published': test_published, 'tags': tags,
        # おまけ: このページに同梱された類似弦レーダー (name -> 8値)
        'similar_radars': {k: v for k, v in radar_all.items()
                           if k not in (main_name, 'Similar strings average values')},
    }


def detect_kind(t):
    """HTML から (kind, slug) を判定。og:url が最も確実。kind = 'string'|'racket'|None。"""
    m = re.search(r'og:url[^>]*content=["\']?https?://[^"\'>]*?/en-GB/tennis-(string|racket)/([a-z0-9\-]+)', t)
    if m:
        return ('string' if m.group(1) == 'string' else 'racket'), m.group(2)
    # フォールバック: リンク出現数の多い方
    ns = len(re.findall(r'/en-GB/tennis-string/[a-z0-9\-]+', t))
    nr = len(re.findall(r'/en-GB/tennis-racket/[a-z0-9\-]+', t))
    if ns or nr:
        return ('string' if ns >= nr else 'racket'), None
    return None, None


def detect_model(t):
    """モデルページ判定 -> (kind, model_slug)。ページ内自己リンク /tennis-strings/model/<slug> で判定。
    注意: 個別ページにもモデルへのリンクが出るため、必ず detect_kind (og:url) を先に試すこと。"""
    m = re.search(r'/en-GB/tennis-(strings|rackets)/model/([a-z0-9\-]+)', t)
    if m:
        return ('string_model' if m.group(1) == 'strings' else 'racket_model'), m.group(2)
    return None, None


def _norm_name(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def parse_model(t):
    """弦モデルページ HTML -> {'name', 'variants': [{'slug', 'data'}]}。
    モデルページは全バリエーションのダイジェスト (radar 8軸 / 動的剛性 g/mm / 平均静的剛性 kg/mm) を
    1枚に持つ (会員時)。帯別剛性・伸び率等の完全ラボデータは個別ページのみ。
    値の対応付けは バリエーション見出し(card-label)ごとのブロック分割 + 名前⇔slug 正規化突合。"""
    mt = re.search(r'<title>([^<]+)</title>', t)
    model_name = mt.group(1).strip() if mt else None

    slugs = sorted(set(re.findall(r'/en-GB/tennis-string/([a-z0-9\-]+)', t)))
    slug_by_norm = {_norm_name(s): s for s in slugs}

    # radar series (レーダー/棒グラフの2箇所に同値で出る、setdefault で先勝ち)
    radars = {}
    for nm, arr in re.findall(r'name:"([^"]+)",data:\[(\d+(?:,\d+){7})\]', t):
        radars.setdefault(nm, [int(x) for x in arr.split(',')])

    # バリエーション行ブロック: 見出し直後のテキスト = バリエーション名、ブロック内に g/mm と kg/mm
    per = {}
    blocks = re.split(r'class="card-label[^"]*"[^>]*>', t)[1:]
    for b in blocks:
        mn = re.match(r'\s*([^<&]+)', b)
        if not mn:
            continue
        vname = mn.group(1).strip()
        if _norm_name(vname) not in slug_by_norm:
            continue
        md = re.search(r'([\d.]+)\s*g/mm', b)
        ms = re.search(r'([\d.]+)\s*kg/mm', b)
        per[vname] = {
            'dynamic_stiffness_gmm': float(md.group(1)) if md else None,
            'static_stiffness_avg': float(ms.group(1)) if ms else None,
        }

    variants = []
    names = set(per) | {nm for nm in radars if _norm_name(nm) in slug_by_norm}
    for vname in sorted(names):
        slug = slug_by_norm.get(_norm_name(vname))
        if not slug:
            continue
        rad = radars.get(vname)
        data = {
            'name': vname,
            'radar': dict(zip(
                ['power', 'resilience', 'elasticity', 'spin', 'control',
                 'tension_holding', 'stability', 'comfort'], rad)) if rad else None,
            **per.get(vname, {}),
        }
        variants.append({'slug': slug, 'data': data})
    return {'name': model_name, 'variants': variants}


def parse_racket(t):
    """ラケット個別ページ HTML -> dict。radar は 6軸 (弦は8軸)。"""
    plain = _plain(t)
    vals = _plain(_strip_popovers(t))

    mt = re.search(r'<title>([^<]+)</title>', t)
    name = mt.group(1).strip() if mt else None
    my = re.search(r'(\d{4})\b', name or '')
    year = my.group(1) if my else None

    # radar 6軸: categories で軸順確認、series data[6 ints]
    radar = None
    rm = re.search(r'name:"([^"]+)",data:\[(\d+(?:,\d+){5})\]', t)
    if rm:
        radar = dict(zip(['power', 'spin', 'control', 'maneuverability', 'stability', 'comfort'],
                         [int(x) for x in rm.group(2).split(',')]))

    def num(label, unit):
        m = re.search(r'(?<![A-Za-z])' + re.escape(label) + r'\D{0,6}([\d.]+)\s*' + unit, vals)
        return float(m.group(1)) if m else None

    head_size = num('Head size', r'in')
    weight = num('Weight', r'g')          # Swing/Spin/Twist weight は (?<![A-Za-z]) で除外
    balance = num('Balance', r'(?:cm|mm|pts)')
    swingweight = num('Swingweight', r'kgcmq')
    spinweight = num('Spinweight', r'kgcmq')
    twistweight = num('Twistweight', r'kgcmq')
    length = num('Length', r'(?:cm|in)')
    mflex = re.search(r'([\d.]+)\s*Hz', vals)
    flex_hz = float(mflex.group(1)) if mflex else None
    mdra = re.search(r'([\d.]+)\s*DRA', vals)
    dra = float(mdra.group(1)) if mdra else None
    mbeam = re.search(r'Beam\D{0,6}([\d.]+(?:\s*/\s*[\d.]+)*)\s*mm', vals)
    beam = mbeam.group(1).replace(' ', '') if mbeam else None
    msp = re.search(r'String pattern\s+(\d+\s*x\s*\d+)', plain)
    string_pattern = msp.group(1).replace(' ', '') if msp else None
    mmat = re.search(r'Materials\s+(.+?)\s+(?:Grip|Weight|Balance|Head size|$)', plain)
    materials = mmat.group(1).strip() if mmat else None
    mhead = re.search(r'Head size\s+([\d.]+)\s*in', plain)
    if head_size is None and mhead:
        head_size = float(mhead.group(1))
    mtp = re.search(r'Test published on\s+([\d/]+)', plain)
    test_published = mtp.group(1) if mtp else None

    # --- スイートスポット分布 (4箇所 %、2026-07-03 追加) ---
    ss = {}
    for lab, key in [('Head', 'sweetspot_head'), ('Center', 'sweetspot_center'),
                     ('Side', 'sweetspot_side'), ('Bottom', 'sweetspot_bottom')]:
        m = re.search(r'>' + lab + r' sweetspot</span>\s*<span[^>]*>\s*(\d+)\s*%', t)
        ss[key] = int(m.group(1)) if m else None

    # --- 測定カード群 (Stiffness RA / TorsionBeam / Recoilweight / Vertical bending) ---
    cards = dict(re.findall(
        r'>([A-Za-z ]+?)\s*<i class="fas fa-question-circle"></i></span>\s*'
        r'<span class="d-block text-center fw-bolder fs-3">\s*([^<]+?)\s*</span>', t))
    mra = re.search(r'(\d+)\s*RA', cards.get('Stiffness', ''))
    ra = int(mra.group(1)) if mra else None
    torsion = cards.get('TorsionBeam') or None
    mrw = re.search(r'([\d.]+)', cards.get('Recoilweight', ''))
    recoil = float(mrw.group(1)) if mrw else None
    mvb = re.search(r'(\d+)\s*RA', cards.get('Vertical bending', ''))
    vertical = int(mvb.group(1)) if mvb else None

    # --- グリップ / 公称データ (Declared data カード) ---
    mg = re.search(r'>Grip</span>\s*<span[^>]*>([^<]+)<', t)
    grip = mg.group(1).strip() if mg else None
    dseg = t[t.find('Declared data'):t.find('Declared data') + 2500] if 'Declared data' in t else ''
    dplain = _plain(dseg)
    mprof = re.search(r'Profile\s+([\d,.\-]+\s*mm)', dplain)
    munw = re.search(r'Weight \(unstrung\)\s+([\d.]+)\s*g', dplain)
    munb = re.search(r'Balance \(unstrung\)\s+([\d.]+)\s*mm', dplain)

    # --- フレックスポイント分析 (7点 x 2系列: 曲げ剛性 EJ / 剛性)。大きい方が flexional ---
    flex_ej = flex_st = None
    for m in re.finditer(r'data:\s*\[([^\]\[]{5,200})\]', t):
        vals = m.group(1).split(',')
        if len(vals) == 7:
            try:
                nums = [float(x) for x in vals]
            except ValueError:
                continue
            if max(nums) > 500:
                flex_ej = ','.join(vals)
            else:
                flex_st = ','.join(vals)

    return {
        'name': name, 'year': year,
        'has_full_lab': radar is not None,
        'radar': radar,
        'head_size': head_size, 'weight': weight, 'balance': balance,
        'swingweight': swingweight, 'spinweight': spinweight, 'twistweight': twistweight,
        'beam': beam, 'length': length, 'string_pattern': string_pattern, 'materials': materials,
        'flex_hz': flex_hz, 'dra': dra, 'test_published': test_published,
        'ra_stiffness': ra, 'torsion_beam': torsion, 'recoil_weight': recoil, 'vertical_bending': vertical,
        'grip': grip,
        'profile_mm': mprof.group(1).strip() if mprof else None,
        'unstrung_weight': float(munw.group(1)) if munw else None,
        'unstrung_balance': float(munb.group(1)) if munb else None,
        **ss,
        'flex_flexional': flex_ej, 'flex_stiffness': flex_st,
        # 本家のスイートスポット完成画像 (ラケットごとの専用PNG、%入り)
        'sweetspot_img': (re.search(
            r'(https://cdn\.racketpedia\.com/media/rackets-data-sheets/[^"\'\s>]+sweetspot[^"\'\s>]+\.png)', t)
            or [None, None])[1] if 'sweetspot' in t else None,
    }


def parse_brand_list(t):
    """一覧ページ HTML -> 詳細 slug のリスト (重複除去)。"""
    return sorted(set(re.findall(r'/en-GB/tennis-string/([a-z0-9\-]+)', t)))


def parse_brand_index(t):
    """ブランド一覧 HTML -> brand slug のリスト。"""
    return sorted(set(re.findall(r'/en-GB/tennis-strings/brand/([a-z0-9\-]+)', t)))


def max_page(t):
    """一覧ページ HTML から最大ページ番号 (?p=N) を取る。無ければ 1。"""
    ps = [int(x) for x in re.findall(r'brand/[a-z0-9\-]+\?p=(\d+)', t)]
    return max(ps) if ps else 1


if __name__ == '__main__':
    import json, sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    t = open('gear/racketpedia/cache/string/head-lynx-tour-grey-125.html', encoding='utf-8').read()
    d = parse_detail(t)
    sim = d.pop('similar_radars')
    print(json.dumps(d, ensure_ascii=False, indent=2))
    print(f"\n同梱類似弦レーダー: {len(sim)} 件")
