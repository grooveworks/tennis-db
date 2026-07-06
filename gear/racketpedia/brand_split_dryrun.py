# -*- coding: utf-8 -*-
"""①ブランド/モデル/太さ分離の空打ち。バックアップ(data-latest.json)上だけ。ライブ無傷。
strings/rackets マスターの name を brand+model(+弦は太さ)に分け、曖昧な所を出す。
弦は Racketpedia とモデルを突合してブランド取り違え(例:ALU Power=Luxilon)も検出。"""
import json, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d = json.load(open('.claude/data-latest.json', encoding='utf-8'))
rp = json.load(open('gear/racketpedia/out/strings.json', encoding='utf-8'))

MULTI = ['signum pro', 'pro kennex', 'weiss cannon', 'big breakers', 'string kong',
         'string project', 'robin soderling', 'decathlon artengo']
SINGLE = ['yonex', 'head', 'babolat', 'wilson', 'tecnifibre', 'luxilon', 'solinco', 'gosen',
          'toalson', 'prince', 'dunlop', 'volkl', 'kirschbaum', 'polyfibre', 'msv', 'gamma',
          'tourna', 'isospeed', 'genesis', 'diadem', 'pacific', 'ashaway', 'toroline', 'topspin',
          'mantis', 'ytex', 'mayami', 'discho', 'dyreex', 'starburn', 'snauwaert', 'prospro',
          'artemik', 'donnay', 'silvester', 'polystar', 'stringlab', 'kamado', 'gosen']
DISP = {'msv': 'MSV', 'ytex': 'YTEX', 'signum pro': 'Signum Pro', 'pro kennex': 'Pro Kennex',
        'prospro': 'ProsPro', 'weiss cannon': 'Weiss Cannon', 'big breakers': 'Big Breakers'}
BRANDS = sorted(MULTI + SINGLE, key=len, reverse=True)  # 長いものから一致


def disp(b):
    return DISP.get(b, b.title())


def split_brand(name):
    low = (name or '').lower().strip()
    for b in BRANDS:
        if low.startswith(b + ' ') or low == b:
            rest = (name or '').strip()[len(b):].strip()
            return disp(b), rest
    if 'サムライ' in (name or ''):
        return 'サムライ', (name or '').replace('サムライ', '').strip()
    return None, (name or '').strip()  # ブランド不明


def split_gauge(model):
    m = re.search(r'1\.\d\d', model)
    if m:
        g = m.group(0)
        return re.sub(r'\s*' + re.escape(g) + r'\s*', ' ', model).strip(), g
    return model, None


# Racketpedia: モデル語 -> ブランド(slug) の逆引き(ブランド取り違え検出用)
rp_idx = []
for r in rp:
    nm = (r.get('name') or '').lower()
    rp_idx.append((set(re.findall(r'[a-z0-9]+', nm)), r.get('brand') or ''))


def rp_brands_for(model):
    toks = set(re.findall(r'[a-z0-9]+', (model or '').lower())) - {'1', '17', '125', '120', '130'}
    if len(toks) < 1:
        return set()
    hits = set()
    for tks, br in rp_idx:
        if toks and toks <= tks:
            hits.add(br)
    return hits


print('=== ① ストリング マスター(28) ブランド/モデル/太さ 分離(案) ===')
for s in d.get('strings', []):
    name = s.get('name')
    brand, model = split_brand(name)
    model, gauge = split_gauge(model)
    flag = ''
    if brand is None:
        flag = ' ← ✕ブランド不明(要確認)'
    else:
        rpb = rp_brands_for(model)
        if rpb and brand.lower() not in {x.replace('-', ' ') for x in rpb} and not any(brand.lower() in x for x in rpb):
            flag = f' ← △ブランド要確認(Racketpediaでは {",".join(sorted(rpb))})'
    print("  brand=%-10s | model=%-22s | 太さ=%-5s%s   〔元: %s〕" % (str(brand), model, gauge or '-', flag, name))

print()
print('=== ① ラケット マスター(6) ブランド/モデル 分離(案) ===')
for r in d.get('rackets', []):
    name = r.get('name')
    brand, model = split_brand(name)
    flag = '' if brand else ' ← ✕ブランド不明(要確認)'
    print("  brand=%-10s | model=%-28s%s   〔元: %s〕" % (str(brand), model, flag, name))
