# -*- coding: utf-8 -*-
"""ストア層: slug をキーに upsert (重複なし・最新で上書き・変化検知・取得日記録)。
弦/ラケット共通。listener.py(ライブ取り込み) と scrape.py(一括) の両方が使う。
方針: 新規取得で値が埋まれば古い null を上書き(=specs-only→full へ enrich)。
同じ値の再取得は last_captured だけ更新(重複行ゼロ・静か)。値が変われば changed_at を立てる。"""
import os, json, csv, sqlite3, datetime
import extract

OUT = os.path.join('gear', 'racketpedia', 'out')
STATE = os.path.join('gear', 'racketpedia', 'state')
BASE = 'https://www.racketpedia.com'
os.makedirs(OUT, exist_ok=True)

META = ['slug', 'first_captured', 'last_captured', 'changed_at']

STRING_FIELDS = ['name', 'brand', 'lab_data', 'typology', 'shape', 'composition', 'colors', 'gauges',
                 'static_stiffness_avg', 'ss_10_15', 'ss_15_20', 'ss_20_25', 'ss_25_30', 'ss_30_35',
                 'dynamic_stiffness_gmm', 'dynamic_stiffness_sim_lbsin', 'elongation_5_35_mm',
                 'radar_power', 'radar_resilience', 'radar_elasticity', 'radar_spin', 'radar_control',
                 'radar_tension_holding', 'radar_stability', 'radar_comfort',
                 'radar_delta_power', 'radar_delta_resilience', 'radar_delta_elasticity', 'radar_delta_spin',
                 'radar_delta_control', 'radar_delta_tension_holding', 'radar_delta_stability', 'radar_delta_comfort',
                 'tension_range', 'resilience_range', 'playing_life', 'prestretch',
                 'progressive_plasticization', 'stiffness_badge', 'test_published', 'tags', 'source_url']

RACKET_FIELDS = ['name', 'brand', 'year', 'lab_data', 'head_size', 'weight', 'balance', 'swingweight',
                 'spinweight', 'twistweight', 'beam', 'length', 'string_pattern', 'materials',
                 'flex_hz', 'dra', 'radar_power', 'radar_spin', 'radar_control', 'radar_maneuverability',
                 'radar_stability', 'radar_comfort',
                 'ra_stiffness', 'torsion_beam', 'recoil_weight', 'vertical_bending', 'grip',
                 'profile_mm', 'unstrung_weight', 'unstrung_balance',
                 'sweetspot_head', 'sweetspot_center', 'sweetspot_side', 'sweetspot_bottom',
                 'sweetspot_img', 'flex_flexional', 'flex_stiffness',
                 'test_published', 'source_url']

FIELDS = {'string': STRING_FIELDS, 'racket': RACKET_FIELDS}


def _now():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _store_path(kind):
    return os.path.join(OUT, f'store_{kind}.json')


def load_store(kind):
    p = _store_path(kind)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def save_store(kind, store):
    json.dump(store, open(_store_path(kind), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def _slug2brand():
    p = os.path.join(STATE, 'slugs.json')
    if not os.path.exists(p):
        return {}
    d = json.load(open(p, encoding='utf-8'))
    return {s: b for b, ss in d.items() for s in ss}


def string_row(slug, d, s2b=None):
    s2b = s2b if s2b is not None else _slug2brand()
    r = {f: None for f in STRING_FIELDS}
    for k in ['name', 'typology', 'shape', 'composition', 'colors', 'gauges',
              'static_stiffness_avg', 'ss_10_15', 'ss_15_20', 'ss_20_25', 'ss_25_30', 'ss_30_35',
              'dynamic_stiffness_gmm', 'dynamic_stiffness_sim_lbsin', 'elongation_5_35_mm',
              'tension_range', 'resilience_range', 'playing_life', 'prestretch',
              'progressive_plasticization', 'stiffness_badge', 'test_published']:
        r[k] = d.get(k)
    rad = d.get('radar') or {}
    dlt = d.get('radar_delta') or {}
    for k in ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort']:
        r['radar_' + k] = rad.get(k)
        r['radar_delta_' + k] = dlt.get(k)
    r['brand'] = s2b.get(slug, slug.split('-')[0])
    r['lab_data'] = 'full' if d.get('has_full_lab') else 'specs-only'
    r['tags'] = ", ".join(d.get('tags') or [])
    r['source_url'] = f"{BASE}/en-GB/tennis-string/{slug}"
    return r


def racket_row(slug, d):
    r = {f: None for f in RACKET_FIELDS}
    for k in ['name', 'year', 'head_size', 'weight', 'balance', 'swingweight', 'spinweight',
              'twistweight', 'beam', 'length', 'string_pattern', 'materials', 'flex_hz', 'dra', 'test_published',
              'ra_stiffness', 'torsion_beam', 'recoil_weight', 'vertical_bending', 'grip',
              'profile_mm', 'unstrung_weight', 'unstrung_balance',
              'sweetspot_head', 'sweetspot_center', 'sweetspot_side', 'sweetspot_bottom',
              'sweetspot_img', 'flex_flexional', 'flex_stiffness']:
        r[k] = d.get(k)
    rad = d.get('radar') or {}
    for k in ['power', 'spin', 'control', 'maneuverability', 'stability', 'comfort']:
        r['radar_' + k] = rad.get(k)
    r['brand'] = slug.split('-')[0]
    r['lab_data'] = 'full' if d.get('has_full_lab') else 'specs-only'
    r['source_url'] = f"{BASE}/en-GB/tennis-racket/{slug}"
    return r


def _looks_translated(name):
    """ブラウザ自動翻訳で日本語等になった名前を検知 (CJK/かな文字を含むか)。
    DB の name は原文(英語)で統一する。2026-07-02: Chrome 自動翻訳が英語名を上書きした事故を受けて。"""
    return isinstance(name, str) and any(ord(ch) > 0x2E80 for ch in name)


def _slug_name(slug):
    """slug から英語名を導出 (翻訳名しか無い新規レコード用の最後の砦)。"""
    return ' '.join(w.capitalize() for w in slug.split('-'))


def upsert(kind, slug, data):
    """戻り値 status: 'new' | 'changed' | 'same'。"""
    store = load_store(kind)
    now = _now()
    # 自動翻訳された値(CJK混入)は全項目で保存しない (racketpedia の原文は英語のみ)。
    # name は既存英語名 / slug 導出で救済、他項目は None に落として既存値を維持する。
    data = {k: (None if k != 'name' and _looks_translated(v) else v) for k, v in data.items()}
    if _looks_translated(data.get('name')):
        old_name = store.get(slug, {}).get('name')
        data['name'] = old_name if old_name and not _looks_translated(old_name) else _slug_name(slug)
    if slug not in store:
        rec = dict(data)
        rec['slug'] = slug
        rec['first_captured'] = rec['last_captured'] = now
        rec['changed_at'] = None
        store[slug] = rec
        status = 'new'
    else:
        old = store[slug]
        # 既存値を保持しつつ、新取得の非空値で上書き (specs-only -> full enrich)
        merged = {k: old.get(k) for k in FIELDS[kind]}
        changed = False
        for k in FIELDS[kind]:
            nv = data.get(k)
            if nv not in (None, '') and nv != merged.get(k):
                merged[k] = nv
                changed = True
        merged['slug'] = slug
        merged['first_captured'] = old.get('first_captured', now)
        merged['last_captured'] = now
        merged['changed_at'] = now if changed else old.get('changed_at')
        store[slug] = merged
        status = 'changed' if changed else 'same'
    save_store(kind, store)
    return status


def ingest_html(html_text, s2b=None):
    """生HTML -> 種類判定 -> 解析 -> upsert。戻り値 (kind, slug, status, name)。
    個別ページ (og:url) を最優先、次に モデルページ (全バリエーション一括)。"""
    kind, slug = extract.detect_kind(html_text)
    if kind and slug:
        if kind == 'string':
            row = string_row(slug, extract.parse_detail(html_text), s2b)
        else:
            row = racket_row(slug, extract.parse_racket(html_text))
        status = upsert(kind, slug, row)
        return (kind, slug, status, row.get('name'))
    mkind, mslug = extract.detect_model(html_text)
    if mkind == 'string_model':
        pm = extract.parse_model(html_text)
        results = []
        for v in pm['variants']:
            row = string_row(v['slug'], v['data'], s2b)
            row['lab_data'] = None  # ダイジェストで個別ページの full 判定を上書きしない
            results.append(upsert('string', v['slug'], row))
        if results:
            agg = f"new:{results.count('new')} chg:{results.count('changed')} same:{results.count('same')}"
            return ('string', f"model:{mslug}", agg, pm.get('name'))
    # racket_model はまだ解析器なし -> None を返して listener の inbox 保管に回す
    return (None, None, 'skip', None)


def rebuild(kind):
    """ストア -> CSV + SQLite + フラット JSON を再生成。"""
    store = load_store(kind)
    cols = META[:1] + FIELDS[kind] + META[1:]
    rows = sorted(store.values(), key=lambda r: r.get('slug', ''))
    # JSON
    json.dump(rows, open(os.path.join(OUT, f'{kind}s.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # CSV
    with open(os.path.join(OUT, f'{kind}s.csv'), 'w', encoding='utf-8-sig', newline='') as fp:
        w = csv.DictWriter(fp, fieldnames=cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    # SQLite
    db = os.path.join(OUT, 'racketpedia.db')
    con = sqlite3.connect(db)
    cur = con.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {kind}s")
    cur.execute(f"CREATE TABLE {kind}s ({', '.join(c + ' TEXT' for c in cols)})")
    cur.executemany(f"INSERT INTO {kind}s VALUES ({','.join('?' * len(cols))})",
                    [[r.get(c) for c in cols] for r in rows])
    con.commit()
    con.close()
    if kind == 'string':  # 弦データ更新時に公開カタログ(別体)も自動再生成。v4/アプリには触れない。
        try:
            import build_catalog
            build_catalog.build_catalog()
        except Exception as e:
            print('  (catalog 再生成スキップ:', e, ')')
        try:  # 比較ページも自動再生成 (デザイン取り込みはスキップ = --no-import)。モバイル版も続けて同期
            import subprocess, sys as _sys
            subprocess.run([_sys.executable, os.path.join('gear', 'racketpedia', 'build_compare.py'), '--no-import'],
                           capture_output=True, timeout=60)
            subprocess.run([_sys.executable, os.path.join('gear', 'racketpedia', 'build_mobile_compare.py')],
                           capture_output=True, timeout=60)
            subprocess.run([_sys.executable, os.path.join('gear', 'racketpedia', 'add_nav.py')],
                           capture_output=True, timeout=30)
            _cloud_sync()
        except Exception as e:
            print('  (比較ページ再生成スキップ:', e, ')')
    if kind == 'racket':  # ラケット比較ページも自動再生成
        try:
            import subprocess, sys as _sys
            subprocess.run([_sys.executable, os.path.join('gear', 'racketpedia', 'build_racket_compare.py')],
                           capture_output=True, timeout=60)
            subprocess.run([_sys.executable, os.path.join('gear', 'racketpedia', 'add_nav.py')],
                           capture_output=True, timeout=30)
            _cloud_sync()
        except Exception as e:
            print('  (ラケット比較ページ再生成スキップ:', e, ')')
    return len(rows)


_CLOUD_KEY = 'D:/Downloads/tennis-db-ca9ae-firebase-adminsdk-fbsvc-36d6de85c9.json'


def _cloud_sync():
    """クラウド版 (gear/) のデータを本人専用 Firestore へ非同期アップロード。
    受け口の応答を遅らせないよう投げっぱなし (Popen)。鍵が無い環境では静かにスキップ。"""
    try:
        import subprocess
        if not os.path.exists(_CLOUD_KEY):
            return
        subprocess.Popen(['node', os.path.join('.claude', 'cloud-upload.js'), _CLOUD_KEY, '--apply'],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print('  (クラウド同期スキップ:', e, ')')
