# -*- coding: utf-8 -*-
"""tennis-one.jp の記事を WordPress 公開API から個人アーカイブ用に取得。
- 個人利用のみ (git 管理外・非公開)。出典は常に元記事リンクで示す。
- 丁寧に: 1リクエスト間隔 1.5秒 / per_page=50 (全279本 ≈ 6リクエスト+カテゴリ1)。
- 再実行時は差分のみ追加 (id 基準)。
出力: tennisone/data/posts.json"""
import io, sys, json, os, time, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = 'https://www.tennis-one.jp/wp/wp-json/wp/v2'
OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(OUTDIR, exist_ok=True)
OUT = os.path.join(OUTDIR, 'posts.json')
UA = {'User-Agent': 'personal-archive/1.0 (private use)'}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


existing = {}
if os.path.exists(OUT):
    for p in json.load(open(OUT, encoding='utf-8')):
        existing[p['id']] = p
    print('既存:', len(existing), '本 (差分のみ取得)')

print('カテゴリ一覧を取得...')
cats = {}
for c in get(BASE + '/categories?per_page=100&_fields=id,name'):
    cats[c['id']] = c['name']
time.sleep(1.5)

posts = dict(existing)
page = 1
new_n = 0
while True:
    url = (BASE + '/posts?per_page=50&page=%d&_fields=id,title,date,modified,link,categories,content' % page)
    try:
        batch = get(url)
    except Exception as e:
        if 'HTTP Error 400' in str(e):  # ページ超過
            break
        raise
    if not batch:
        break
    for p in batch:
        pid = p['id']
        if pid in posts and posts[pid].get('modified') == p.get('modified'):
            continue
        posts[pid] = {
            'id': pid,
            'title': p['title']['rendered'],
            'date': p['date'][:10],
            'modified': p.get('modified'),
            'link': p['link'],
            'categories': [cats.get(c, str(c)) for c in p.get('categories', [])],
            'html': p['content']['rendered'],
        }
        new_n += 1
    print(f'  page {page}: 累計 {len(posts)} 本')
    if len(batch) < 50:
        break
    page += 1
    time.sleep(1.5)

rows = sorted(posts.values(), key=lambda x: x['date'], reverse=True)
json.dump(rows, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('保存:', len(rows), '本 (新規/更新', new_n, ') ->', OUT)
