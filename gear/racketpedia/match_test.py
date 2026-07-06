# -*- coding: utf-8 -*-
"""現実検証: ユーザーの登録弦28本を Racketpedia 全1104件に自動照合し、
どこで破綻するかを生で出す。マージが"簡単に見えて実際は破綻する"を実証する用。"""
import json, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d = json.load(open('.claude/data-latest.json', encoding='utf-8'))
rp = json.load(open('gear/racketpedia/out/strings.json', encoding='utf-8'))
rp_brands = set(r.get('brand') for r in rp)

ST = {'confirmed': '確定', 'good': '好印象', 'testing': '検証中', 'candidate': '候補',
      'hold': '保留', 'rejected': '除外', 'active': 'active(異常)'}


def toks(s):
    s = (s or '')
    for k, v in [('ベロシティ', 'velocity'), ('サムライ', 'samurai'), ('マルチ', 'mlt'),
                 ('ストリング', ''), ('製', ' '), ('全般', 'general')]:
        s = s.replace(k, v)
    return [t for t in re.split(r'[^a-z0-9]+', s.lower()) if t]


def gauge_u(s):
    m = re.search(r'1\.(\d\d)', s or '')
    if m:
        return '1' + m.group(1)
    m = re.search(r'\b1(\d\d)\b', s or '')
    return '1' + m.group(1) if m else None


def gauge_r(r):
    m = re.search(r'(\d{3})\b', r.get('name', '') or '')
    return m.group(1) if m else None


for r in rp:
    r['_t'] = set(toks(r.get('name', '')))
    r['_g'] = gauge_r(r)

KNOWN_BRAND = {'head', 'babolat', 'yonex', 'solinco', 'luxilon', 'toalson', 'tecnifibre',
               'prince', 'gosen', 'dunlop'}

n_clean = n_amb = n_none = n_notprod = 0
print('=== あなたの28弦 → Racketpedia 全1104件 自動照合 ===')
for u in d.get('strings', []):
    name = u.get('name')
    st = ST.get(u.get('status'), u.get('status') or '-')
    ut = set(toks(name))
    ug = gauge_u(name)
    sig = ut - {'1', '17'}
    if 'general' in ut or len(sig) <= 1:
        print(f'  ✕商品でない [{st}] {name}')
        n_notprod += 1
        continue
    cands = []
    for r in rp:
        ov = len(ut & r['_t'])
        if ov >= 2 and (ug is None or r['_g'] is None or ug == r['_g']):
            cands.append((ov, r))
    cands.sort(key=lambda x: -x[0])
    uniq = []
    seen = set()
    for ov, r in cands:
        if r['slug'] not in seen:
            seen.add(r['slug'])
            uniq.append(r)
    if not uniq:
        print(f'  ✕該当なし   [{st}] {name}')
        n_none += 1
    elif len(uniq) == 1:
        print(f'  ○一意       [{st}] {name}  → {uniq[0]["name"]}')
        n_clean += 1
    else:
        print(f'  △{len(uniq)}候補     [{st}] {name}  → ' + ' / '.join(x['name'] for x in uniq[:4]))
        n_amb += 1

print()
print(f'集計: ○一意 {n_clean} / △複数で曖昧 {n_amb} / ✕該当なし {n_none} / ✕商品でない {n_notprod}')
# 重複(同一name)
from collections import Counter
names = [s.get('name') for s in d.get('strings', [])]
dup = {k: v for k, v in Counter(names).items() if v > 1}
print('リスト内の重複name:', dup)
