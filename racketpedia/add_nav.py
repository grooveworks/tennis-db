# -*- coding: utf-8 -*-
"""4ページ (弦PC / 弦モバイル / ラケット / 記事) の相互リンクナビを後処理で注入。
- 純HTML/CSS (スクリプトなし) = クラウド器のログイン前画面でも機能する
- ローカルは絶対パス (localhost:8080 のルート=リポジトリ)。gear/ 版は gen_cloud_pages が平坦名に書き換える
- 再実行しても二重にならない (既存ナビを除去してから注入)"""
import io, sys, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGES = [
    ('racketpedia/string_compare.html', 'strings'),
    ('racketpedia/string_compare_mobile.html', 'mobile'),
    ('racketpedia/racket_compare.html', 'rackets'),
    ('tennisone/reader.html', 'reader'),
]

LINKS = [
    ('strings', '/racketpedia/string_compare.html', '弦'),
    ('mobile', '/racketpedia/string_compare_mobile.html', '弦📱'),
    ('rackets', '/racketpedia/racket_compare.html', 'ラケット'),
    ('reader', '/tennisone/reader.html', '記事'),
]

NAV_CSS = ('#xnav{position:fixed;top:8px;right:8px;z-index:2000;display:flex;gap:4px;'
           'font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",Arial,sans-serif;}'
           '#xnav a{font-size:11px;font-weight:700;text-decoration:none;color:#5F6368;'
           'background:rgba(255,255,255,0.92);border:1px solid #DADCE0;border-radius:9px;padding:4px 9px;}'
           '#xnav a.cur{color:#0057B8;background:#E1F0FF;border-color:#A9D2FF;}')

for rel, key in PAGES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print('  なし(スキップ):', rel)
        continue
    h = open(p, encoding='utf-8').read()
    h = re.sub(r'<style id="xnavcss">.*?</style>', '', h, flags=re.S)
    h = re.sub(r'<div id="xnav">.*?</div>', '', h, flags=re.S)
    nav = '<style id="xnavcss">' + NAV_CSS + '</style><div id="xnav">'
    for k, href, label in LINKS:
        nav += '<a href="' + href + '"' + (' class="cur"' if k == key else '') + '>' + label + '</a>'
    nav += '</div>'
    assert '</body>' in h, rel
    h = h.replace('</body>', nav + '</body>', 1)
    open(p, 'w', encoding='utf-8').write(h)
    print('  ナビ注入:', rel)
print('完了')
