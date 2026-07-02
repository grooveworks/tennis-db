# -*- coding: utf-8 -*-
"""Racketpedia 取得オーケストレータ。
礼儀: 1リクエストずつ / 取得間隔 DELAY 秒 / HTMLキャッシュ(再取得しない) / 増分・再開可能。
robots: 一覧(brand)は明確に許可。個別(tennis-string)はテンプレ崩れ指定で実URLは技術的に対象外。
使い方:
  python racketpedia/scrape.py brands           # ブランド一覧を取得・保存
  python racketpedia/scrape.py lists [--limit N] # 全ブランドの一覧ページ(全ページ)取得→slug一覧
  python racketpedia/scrape.py details [--limit N] # 個別ページを未取得分だけ取得(キャッシュ)
  python racketpedia/scrape.py build            # キャッシュ済みHTML -> SQLite/CSV/JSON
  python racketpedia/scrape.py status           # 進捗確認
"""
import os, re, sys, io, json, time, sqlite3, urllib.request, urllib.error
import extract

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "https://www.racketpedia.com"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
ROOT = "racketpedia"
CACHE = os.path.join(ROOT, "cache")
STATE = os.path.join(ROOT, "state")
OUT = os.path.join(ROOT, "out")
DELAY = 1.5  # 秒 (礼儀)

for d in (CACHE, os.path.join(CACHE, "brand"), os.path.join(CACHE, "string"), STATE, OUT):
    os.makedirs(d, exist_ok=True)


def fetch(url, cache_path, force=False):
    """取得(キャッシュ優先)。戻り値 (text, from_cache)。"""
    if os.path.exists(cache_path) and not force and os.path.getsize(cache_path) > 0:
        return open(cache_path, encoding='utf-8').read(), True
    time.sleep(DELAY)  # 礼儀: ネット取得の前に必ず待つ
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        print(f"  ! HTTP {e.code} {url}")
        return None, False
    except Exception as e:
        print(f"  ! ERR {type(e).__name__} {url}")
        return None, False
    with open(cache_path, 'w', encoding='utf-8') as f:
        f.write(data)
    return data, False


def load_json(p, default):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default


def save_json(p, obj):
    json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


# ---------------- stage: brands ----------------
def stage_brands():
    text, cached = fetch(BASE + "/en-GB/tennis-strings/brands",
                         os.path.join(CACHE, "brands-index.html"))
    brands = extract.parse_brand_index(text) if text else []
    save_json(os.path.join(STATE, "brands.json"), brands)
    print(f"brands: {len(brands)} 件 ({'cache' if cached else 'net'}) -> state/brands.json")
    print("  " + ", ".join(brands))


# ---------------- stage: lists ----------------
def stage_lists(limit=None):
    brands = load_json(os.path.join(STATE, "brands.json"), [])
    if not brands:
        print("先に `brands` を実行"); return
    slugs_by_brand = load_json(os.path.join(STATE, "slugs.json"), {})
    fetched = 0
    for b in brands:
        if b in slugs_by_brand:  # 取得済みブランドはスキップ(増分)
            continue
        slugs = set()
        # p=1 を取って最大ページ数を判定
        url1 = f"{BASE}/en-GB/tennis-strings/brand/{b}?p=1"
        t1, c1 = fetch(url1, os.path.join(CACHE, "brand", f"{b}_p1.html"))
        if not c1: fetched += 1
        if not t1:
            slugs_by_brand[b] = []; continue
        mp = extract.max_page(t1)
        slugs |= set(extract.parse_brand_list(t1))
        for p in range(2, mp + 1):
            tp, cp = fetch(f"{BASE}/en-GB/tennis-strings/brand/{b}?p={p}",
                           os.path.join(CACHE, "brand", f"{b}_p{p}.html"))
            if not cp: fetched += 1
            if tp:
                slugs |= set(extract.parse_brand_list(tp))
        slugs_by_brand[b] = sorted(slugs)
        save_json(os.path.join(STATE, "slugs.json"), slugs_by_brand)
        print(f"  {b}: {mp}p, {len(slugs)} strings")
        if limit and fetched >= limit:
            print(f"  (limit {limit} 到達、中断。再実行で続き)"); break
    allslugs = sorted({s for v in slugs_by_brand.values() for s in v})
    save_json(os.path.join(STATE, "all_slugs.json"), allslugs)
    print(f"lists: {len(slugs_by_brand)}/{len(brands)} ブランド処理済, slug 合計 {len(allslugs)}")


# ---------------- stage: details ----------------
def stage_details(limit=None):
    allslugs = load_json(os.path.join(STATE, "all_slugs.json"), [])
    if not allslugs:
        print("先に `lists` を実行"); return
    done = fetched = 0
    for s in allslugs:
        cp = os.path.join(CACHE, "string", f"{s}.html")
        if os.path.exists(cp) and os.path.getsize(cp) > 0:
            done += 1; continue
        t, c = fetch(f"{BASE}/en-GB/tennis-string/{s}", cp)
        if not c: fetched += 1
        if t: done += 1
        if fetched and fetched % 25 == 0:
            print(f"  ... {fetched} 件取得 (累計キャッシュ {done}/{len(allslugs)})")
        if limit and fetched >= limit:
            print(f"  (limit {limit} 到達、中断。再実行で続き)"); break
    print(f"details: キャッシュ済 {done}/{len(allslugs)} (今回net {fetched})")


# ---------------- stage: build ----------------
COLS = ['slug', 'name', 'brand', 'lab_data', 'typology', 'shape', 'composition', 'colors', 'gauges',
        'static_stiffness_avg', 'ss_10_15', 'ss_15_20', 'ss_20_25', 'ss_25_30', 'ss_30_35',
        'dynamic_stiffness_gmm', 'dynamic_stiffness_sim_lbsin', 'elongation_5_35_mm',
        'radar_power', 'radar_resilience', 'radar_elasticity', 'radar_spin',
        'radar_control', 'radar_tension_holding', 'radar_stability', 'radar_comfort',
        'tension_range', 'resilience_range', 'playing_life', 'prestretch',
        'progressive_plasticization', 'stiffness_badge', 'test_published', 'tags', 'source_url']


def _norm(s):
    """名前/slug 照合用キー (英数のみ小文字)。"""
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def _row(slug, d):
    r = {c: None for c in COLS}
    r['slug'] = slug
    r['source_url'] = f"{BASE}/en-GB/tennis-string/{slug}"
    r['brand'] = slug.split('-')[0]
    r['lab_data'] = 'full' if d.get('has_full_lab') else 'specs-only'
    for k in ['name', 'typology', 'shape', 'composition', 'colors', 'gauges',
              'static_stiffness_avg', 'ss_10_15', 'ss_15_20', 'ss_20_25', 'ss_25_30', 'ss_30_35',
              'dynamic_stiffness_gmm', 'dynamic_stiffness_sim_lbsin', 'elongation_5_35_mm',
              'tension_range', 'resilience_range', 'playing_life', 'prestretch',
              'progressive_plasticization', 'stiffness_badge', 'test_published']:
        r[k] = d.get(k)
    rad = d.get('radar') or {}
    for k in ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort']:
        r['radar_' + k] = rad.get(k)
    r['tags'] = ", ".join(d.get('tags') or [])
    return r


def stage_build():
    import csv
    sdir = os.path.join(CACHE, "string")
    files = sorted(f for f in os.listdir(sdir) if f.endswith('.html'))
    # slug -> brand 逆引き (brand は slug 先頭ハイフン分割では誤る: big-breakers 等)
    slug2brand = {}
    for b, ss in load_json(os.path.join(STATE, "slugs.json"), {}).items():
        for s in ss:
            slug2brand[s] = b
    rows = []
    radar_only = {}  # name -> 8軸 (同梱類似弦)
    for f in files:
        slug = f[:-5]
        t = open(os.path.join(sdir, f), encoding='utf-8').read()
        d = extract.parse_detail(t)
        row = _row(slug, d)
        row['brand'] = slug2brand.get(slug, row['brand'])
        rows.append(row)
        for nm, vals in (d.get('similar_radars') or {}).items():
            radar_only.setdefault(nm, vals)
    # カルーセル同梱 radar を、カタログ弦(slug)へ名前一致で充填。
    # full ページが自前 radar を持つ弦は対象外。specs-only 弦に radar を補える。
    radar_by_norm = {_norm(nm): vals for nm, vals in radar_only.items()}
    rkeys = ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort']
    filled = 0
    matched_norms = set()
    for r in rows:
        if r['radar_power'] is not None:
            continue  # full ページの自前 radar
        v = radar_by_norm.get(_norm(r['slug']))
        if v:
            for k, val in zip(rkeys, v):
                r['radar_' + k] = val
            r['lab_data'] = 'radar-carousel'
            filled += 1
            matched_norms.add(_norm(r['slug']))
    # 主役弦・カタログ充填済を radar_only から除外 (= カタログ外の余り弦だけ残す)
    main_names = {r['name'] for r in rows if r['name']}
    radar_only = {k: v for k, v in radar_only.items()
                  if k not in main_names and _norm(k) not in matched_norms}
    print(f"  カルーセル radar 充填: {filled} 件 (specs-only 弦へ)")

    # JSON
    save_json(os.path.join(OUT, "strings.json"), rows)
    save_json(os.path.join(OUT, "radar_only.json"),
              [{'name': k, 'radar': dict(zip(
                  ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort'], v))}
               for k, v in sorted(radar_only.items())])
    # CSV
    with open(os.path.join(OUT, "strings.csv"), 'w', encoding='utf-8-sig', newline='') as fp:
        w = csv.DictWriter(fp, fieldnames=COLS); w.writeheader(); w.writerows(rows)
    # SQLite
    db = os.path.join(OUT, "racketpedia.db")
    if os.path.exists(db): os.remove(db)
    con = sqlite3.connect(db); cur = con.cursor()
    cur.execute(f"CREATE TABLE strings ({', '.join(c + ' TEXT' for c in COLS)})")
    cur.executemany(f"INSERT INTO strings VALUES ({','.join('?' * len(COLS))})",
                    [[r[c] for c in COLS] for r in rows])
    cur.execute("CREATE TABLE radar_only (name TEXT, power,resilience,elasticity,spin,control,tension_holding,stability,comfort)")
    cur.executemany("INSERT INTO radar_only VALUES (?,?,?,?,?,?,?,?,?)",
                    [[k] + v for k, v in sorted(radar_only.items())])
    con.commit(); con.close()
    print(f"build: 主役弦 {len(rows)} 件 / 同梱類似弦レーダー {len(radar_only)} 件")
    print(f"  -> {OUT}/racketpedia.db , strings.csv , strings.json , radar_only.json")
    try:  # 弦データ更新時に公開カタログ(別体)も自動再生成
        import build_catalog
        n = build_catalog.build_catalog()
        print(f"  -> catalog/strings-catalog.json 再生成 ({n} 本)")
    except Exception as e:
        print('  (catalog 再生成スキップ:', e, ')')


# ---------------- stage: status ----------------
def stage_status():
    brands = load_json(os.path.join(STATE, "brands.json"), [])
    sbb = load_json(os.path.join(STATE, "slugs.json"), {})
    allslugs = load_json(os.path.join(STATE, "all_slugs.json"), [])
    cached = len([f for f in os.listdir(os.path.join(CACHE, "string")) if f.endswith('.html')]) if os.path.isdir(os.path.join(CACHE, "string")) else 0
    print(f"ブランド総数: {len(brands)}")
    print(f"一覧処理済ブランド: {len(sbb)}/{len(brands)}")
    print(f"発見slug総数: {len(allslugs)}")
    print(f"個別ページ取得済(キャッシュ): {cached}/{len(allslugs)}")
    if allslugs:
        remain = len(allslugs) - cached
        print(f"残り取得: {remain} 件 (約 {remain * DELAY / 60:.0f} 分 @ {DELAY}s/件)")


if __name__ == '__main__':
    args = sys.argv[1:]
    cmd = args[0] if args else 'status'
    limit = None
    if '--limit' in args:
        limit = int(args[args.index('--limit') + 1])
    {'brands': stage_brands,
     'lists': lambda: stage_lists(limit),
     'details': lambda: stage_details(limit),
     'build': stage_build,
     'status': stage_status}.get(cmd, stage_status)()
