# -*- coding: utf-8 -*-
"""並列要約の班別ファイル (data/summaries/batch_*.json) を summaries.json に統合。"""
import io, sys, json, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(HERE, 'data', 'summaries', 'batch_*.json')))
merged = {}
bad = []
for f in files:
    try:
        arr = json.load(open(f, encoding='utf-8'))
        for s in arr:
            merged[int(s['id'])] = s
    except Exception as e:
        bad.append((os.path.basename(f), str(e)))
json.dump(merged, open(os.path.join(HERE, 'data', 'summaries.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('統合:', len(merged), '記事 /', len(files), 'ファイル')
for b in bad:
    print('  読めず:', b[0], b[1][:80])
