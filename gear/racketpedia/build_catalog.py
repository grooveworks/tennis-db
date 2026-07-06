# -*- coding: utf-8 -*-
"""公開用カタログ (catalog/strings-catalog.json) を out/strings.json から作り直す。
再実行可能・手作業を置換。データ更新時に自動で走らせる (store.rebuild / scrape build の末尾から呼ぶ)。
アプリ本体(v4/)には触れない。別体のカタログのみ。"""
import os, json, html

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'out', 'strings.json')
OUT = os.path.join(HERE, '..', 'catalog', 'strings-catalog.json')

RK = ['power', 'resilience', 'elasticity', 'spin', 'control', 'tension_holding', 'stability', 'comfort']


def _u(s):
    return html.unescape(s) if isinstance(s, str) else s


def build_catalog():
    if not os.path.exists(SRC):
        return None
    src = json.load(open(SRC, encoding='utf-8'))
    out = []
    for s in src:
        radar = None
        if s.get('radar_power') is not None:
            radar = {
                'power': s.get('radar_power'), 'resilience': s.get('radar_resilience'),
                'elasticity': s.get('radar_elasticity'), 'spin': s.get('radar_spin'),
                'control': s.get('radar_control'), 'tensionHolding': s.get('radar_tension_holding'),
                'stability': s.get('radar_stability'), 'comfort': s.get('radar_comfort'),
            }
        out.append({
            'slug': s.get('slug'), 'name': _u(s.get('name')), 'brand': s.get('brand'),
            'gauge': _u(str(s.get('gauges') or '')), 'typology': _u(s.get('typology') or ''),
            'shape': _u(s.get('shape') or ''), 'composition': _u(s.get('composition') or ''),
            'colors': _u(s.get('colors') or ''), 'stiffness': s.get('static_stiffness_avg'),
            'tensionRange': _u(s.get('tension_range') or ''), 'radar': radar,
        })
    doc = {'source': 'racketpedia', 'count': len(out), 'strings': out}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, separators=(',', ':')))
    return len(out)


if __name__ == '__main__':
    import io, sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    n = build_catalog()
    print('catalog 再生成:', n, '本' if n is not None else '(out/strings.json 無し)')
