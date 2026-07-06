# -*- coding: utf-8 -*-
"""ID化の空打ち(dry-run): バックアップ(data-latest.json)の上で、
記録が"名前"で指している弦/ラケットを、マスターのIDに解決できるか調べる。
ライブには一切触れない。移行が直面する現実(きれい/曖昧/参照先なし)を出すだけ。"""
import json, io, sys
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d = json.load(open('.claude/data-latest.json', encoding='utf-8'))

# --- マスターの 名前→ID ---
name2ids = defaultdict(list)
for s in d.get('strings', []):
    nm = (s.get('name') or '').strip()
    if nm:
        name2ids[nm].append(s.get('id'))
rname2ids = defaultdict(list)
for r in d.get('rackets', []):
    nm = (r.get('name') or '').strip()
    if nm:
        rname2ids[nm].append(r.get('id'))

# --- 記録が参照している名前を集める ---
str_refs = Counter()
rk_refs = Counter()


def addS(v):
    v = (v or '').strip()
    if v:
        str_refs[v] += 1


def addR(v):
    v = (v or '').strip()
    if v:
        rk_refs[v] += 1


def scan(rec):
    addS(rec.get('stringMain')); addS(rec.get('stringCross')); addR(rec.get('racketName'))
    for m in (rec.get('matches') or []):
        addS(m.get('stringMain')); addS(m.get('stringCross')); addR(m.get('racketName'))


for k in ['practices', 'trials', 'tournaments']:
    for rec in d.get(k, []):
        scan(rec)
for s in d.get('stringSetups', []):
    addS(s.get('stringMain')); addS(s.get('stringCross'))
for r in d.get('rackets', []):
    addS(r.get('currentStringMain')); addS(r.get('currentStringCross'))


def classify(refs, name2ids, label):
    clean = amb = orph = 0
    amb_l = []; orph_l = []
    for nm, cnt in refs.items():
        ids = name2ids.get(nm, [])
        if len(ids) == 1:
            clean += 1
        elif len(ids) > 1:
            amb += 1; amb_l.append((nm, len(ids), cnt))
        else:
            orph += 1; orph_l.append((nm, cnt))
    print(f'=== {label}: 参照されている名前 {len(refs)}種 / 延べ {sum(refs.values())}回 ===')
    print(f'  ○ID一意に解決      : {clean}種')
    print(f'  △同名がマスターに複数(=どのIDか曖昧): {amb}種')
    for nm, n, cnt in sorted(amb_l, key=lambda x: -x[2]):
        print(f'      「{nm}」 マスターに{n}件・記録で{cnt}回使用')
    print(f'  ✕マスターに無い(参照先なし=孤児): {orph}種')
    for nm, cnt in sorted(orph_l, key=lambda x: -x[1])[:25]:
        print(f'      「{nm}」 記録で{cnt}回')
    print()


classify(str_refs, name2ids, 'ストリング')
classify(rk_refs, rname2ids, 'ラケット')
