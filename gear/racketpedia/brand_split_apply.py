# -*- coding: utf-8 -*-
"""①ブランド/モデル/太さ分離を、確定事項を反映してバックアップ上で適用(プレビュー)。
ライブには触れない。出力: racketpedia/out/step1_preview.json + 全件表示。"""
import json, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d = json.load(open('.claude/data-latest.json', encoding='utf-8'))

MULTI = ['signum pro', 'pro kennex', 'weiss cannon', 'big breakers']
SINGLE = ['yonex', 'head', 'babolat', 'wilson', 'tecnifibre', 'luxilon', 'solinco', 'gosen',
          'toalson', 'prince', 'dunlop', 'volkl', 'kirschbaum', 'polyfibre', 'msv', 'gamma',
          'tourna', 'isospeed', 'genesis', 'diadem', 'prospro']
DISP = {'msv': 'MSV', 'ytex': 'YTEX', 'prospro': 'ProsPro'}
BRANDS = sorted(MULTI + SINGLE, key=len, reverse=True)

# ユーザー確定事項(元name -> (brand, model, gauge or None))。Noneのgaugeは自動抽出。
OVERRIDE = {
    'Babolat ALU Power': ('Luxilon', 'ALU Power', None),
    'ベロシティマルチ': ('Head', 'Velocity MLT', None),
    'LYNX POWER 1.25': ('Head', 'Lynx Power', '1.25'),
    'サムライストリング 1.25': ('', 'サムライストリング', '1.25'),
}
REMOVE = {'Yonex製ストリング全般'}


def disp(b):
    return DISP.get(b, b.title())


def auto_split(name):
    low = (name or '').lower().strip()
    brand = None
    rest = (name or '').strip()
    for b in BRANDS:
        if low.startswith(b + ' ') or low == b:
            brand = disp(b); rest = (name or '').strip()[len(b):].strip(); break
    m = re.search(r'1\.\d\d', rest)
    gauge = m.group(0) if m else None
    if gauge:
        rest = re.sub(r'\s*' + re.escape(gauge) + r'\s*', ' ', rest).strip()
    rest = re.sub(r'\s*/\s*$', '', rest).strip()              # 末尾"/"除去
    rest = re.sub(r'\s+17\s*$', '', rest).strip()             # 末尾US番手"17"除去
    rest = re.sub(r'\bLYNX\b', 'Lynx', rest)                  # 大文字ゆれ
    rest = re.sub(r'\bTOUR\b', 'Tour', rest)
    return brand, rest, gauge


def split(name):
    if name in OVERRIDE:
        b, mo, g = OVERRIDE[name]
        if g is None:
            _, _, g = auto_split(name)
        return b, mo, g
    return auto_split(name)


# --- strings ---
new_strings = []
for s in d.get('strings', []):
    name = s.get('name')
    if name in REMOVE:
        continue
    b, mo, g = split(name)
    new_strings.append({'id': s.get('id'), 'brand': b or '', 'model': mo, 'gauge': g or '',
                        'status': s.get('status'), 'qty': s.get('qty'), 'note': s.get('note'),
                        'order': s.get('order'), '_orig_name': name})

# --- rackets ---
new_rackets = []
for r in d.get('rackets', []):
    name = r.get('name')
    b, mo, g = auto_split(name)  # ラケットに太さ概念なし(gは無視)
    new_rackets.append({'id': r.get('id'), 'brand': b or '', 'model': mo,
                        'status': r.get('status'), '_orig_name': name})

json.dump({'strings': new_strings, 'rackets': new_rackets},
          open('gear/racketpedia/out/step1_preview.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

ST = {'confirmed': '確定', 'good': '好印象', 'testing': '検証中', 'candidate': '候補',
      'hold': '保留', 'rejected': '除外', 'active': 'active', 'sub': 'サブ', 'considering': '検討',
      'support': '補助', 'retired': '引退'}
print('=== ① 分離後ストリングマスター (%d件・"全般"除外で1件減) ===' % len(new_strings))
for r in new_strings:
    print("  [%-4s] %-9s | %-22s | %-5s" % (ST.get(r['status'], r['status'] or '-'),
                                            r['brand'] or 'ノーブランド', r['model'], r['gauge'] or '-'))
print()
print('=== ① 分離後ラケットマスター (%d件) ===' % len(new_rackets))
for r in new_rackets:
    print("  [%-4s] %-9s | %s" % (ST.get(r['status'], r['status'] or '-'), r['brand'] or '?', r['model']))
print()
print('出力(プレビュー・ライブ未反映): racketpedia/out/step1_preview.json')
