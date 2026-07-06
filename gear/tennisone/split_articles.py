# -*- coding: utf-8 -*-
"""posts.json を1記事1ファイル (data/articles/<id>.txt) に分割。要約の並列処理用。"""
import io, sys, json, re, os, html as H
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

posts = json.load(open('gear/tennisone/data/posts.json', encoding='utf-8'))
outdir = 'gear/tennisone/data/articles'
os.makedirs(outdir, exist_ok=True)


def to_text(html_src):
    t = re.sub(r'<style.*?</style>|<script.*?</script>', ' ', html_src, flags=re.S)
    t = re.sub(r'<br\s*/?>|</p>|</h\d>|</li>', '\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = H.unescape(t)
    return re.sub(r'\n{3,}', '\n\n', t).strip()


n = 0
for p in posts:
    text = to_text(p['html'])
    body = (f"ID: {p['id']}\nタイトル: {p['title']}\n日付: {p['date']}\nURL: {p['link']}\n"
            f"カテゴリ: {p['categories']}\n文字数: {len(text)}\n{'=' * 30}\n{text}\n")
    open(os.path.join(outdir, f"{p['id']}.txt"), 'w', encoding='utf-8').write(body)
    n += 1
print('分割完了:', n, '記事 ->', outdir)
