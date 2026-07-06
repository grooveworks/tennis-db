# -*- coding: utf-8 -*-
"""tennis-one 個人アーカイブの閲覧ページ生成 (tennisone/reader.html)。
- 読みやすさ最優先の本文表示 (元サイトのテーマ・広告・装飾を全部外した素のテキスト)
- 全文検索 + カテゴリ複数選択 + 日付順
- 各記事に出典リンク (元記事) を明示。個人利用・非公開。"""
import io, sys, json, os, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'data', 'posts.json')
OUT = os.path.join(HERE, 'reader.html')

posts = json.load(open(SRC, encoding='utf-8'))


def sanitize(h):
    h = re.sub(r'<script\b.*?</script>', '', h, flags=re.S | re.I)
    h = re.sub(r'<style\b.*?</style>', '', h, flags=re.S | re.I)
    h = re.sub(r'<iframe\b.*?</iframe>', '', h, flags=re.S | re.I)
    h = re.sub(r'\son\w+="[^"]*"', '', h)
    h = re.sub(r'\sstyle="[^"]*"', '', h)  # インライン装飾を除去 = 読みやすさをこちらで統一
    h = re.sub(r'<a\b', '<a target="_blank" rel="noopener"', h, flags=re.I)
    return h


def text_of(h):
    t = re.sub(r'<[^>]+>', ' ', h)
    return re.sub(r'\s+', ' ', t).strip()


# 要約 (並列生成) があれば3層表示に使う。無くても動く
SUMS = {}
sum_path = os.path.join(HERE, 'data', 'summaries.json')
if os.path.exists(sum_path):
    SUMS = {int(k): v for k, v in json.load(open(sum_path, encoding='utf-8')).items()}


def md2html(md):
    """要約Markdownの最小変換 (**太字** / - 箇条書き / 改行)"""
    md = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', md)
    out, in_ul = [], False
    for line in md.split('\n'):
        s = line.strip()
        if s.startswith('- ') or s.startswith('・'):
            if not in_ul:
                out.append('<ul>')
                in_ul = True
            out.append('<li>' + s.lstrip('-・ ') + '</li>')
        else:
            if in_ul:
                out.append('</ul>')
                in_ul = False
            if s:
                out.append('<p>' + s + '</p>')
    if in_ul:
        out.append('</ul>')
    return ''.join(out)


rows = []
for p in posts:
    body = sanitize(p['html'])
    s = SUMS.get(int(p['id'])) or {}
    rows.append({
        'id': p['id'], 'title': p['title'], 'date': p['date'], 'link': p['link'],
        'cats': p['categories'], 'body': body, 'text': text_of(p['html'])[:20000],
        'short': s.get('short') or '',
        'detail': md2html(s.get('detail') or ''),
        'ad': s.get('ad_note') or '',
        'links': s.get('links') or [],
        'stext': (s.get('short') or '') + ' ' + (s.get('detail') or ''),
    })

cats = sorted({c for p in rows for c in p['cats']})
data_js = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
cats_js = json.dumps(cats, ensure_ascii=False)

PAGE = '''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tennis-one アーカイブ（個人利用）</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root{ --bg:#F2F2F7; --panel:#FFF; --border:#DADCE0; --divider:#E8EAED; --text:#202124; --sec:#5F6368; --muted:#80868B; --obj:#007AFF; }
  html,body{ font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Helvetica Neue",Arial,sans-serif; color:var(--text); background:var(--bg); line-height:1.6; }
  .wrap{ max-width:860px; margin:0 auto; padding:22px 16px 80px; }
  .title{ font-size:19px; font-weight:700; }
  .subtitle{ font-size:12px; color:var(--sec); margin:3px 0 14px; }
  .search{ width:100%; height:42px; padding:0 14px; border:1px solid var(--border); border-radius:12px; font:inherit; font-size:14px; outline:none; background:var(--panel); }
  .search:focus{ border-color:var(--obj); }
  .chips{ display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 4px; }
  .chip{ font-size:11.5px; font-weight:600; color:var(--sec); background:var(--panel); border:1px solid var(--border); border-radius:13px; padding:5px 11px; cursor:pointer; }
  .chip.on{ color:#0057B8; background:#E1F0FF; border-color:#A9D2FF; }
  .count{ font-size:12px; color:var(--muted); margin:8px 2px; }
  .list{ background:var(--panel); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .row{ padding:13px 16px; border-bottom:1px solid var(--divider); cursor:pointer; }
  .row:last-child{ border-bottom:none; }
  .row:hover{ background:#F7F8FA; }
  .rt{ font-size:14.5px; font-weight:600; }
  .rs{ font-size:12.5px; color:#3C4043; margin-top:4px; line-height:1.6; }
  .rm{ font-size:11.5px; color:var(--muted); margin-top:4px; }
  .rm .c{ color:#0057B8; background:#E1F0FF; border-radius:5px; padding:1px 6px; margin-right:5px; font-size:10.5px; }
  /* 展開 (詳細要約) */
  .rx{ display:none; background:#FAFBFC; border-top:1px solid var(--divider); padding:14px 16px 16px; cursor:default; }
  .row.open .rx{ display:block; }
  .rx .detail{ font-size:13.5px; line-height:1.9; color:#333; }
  .rx .detail ul{ margin:4px 0 10px 1.3em; }
  .rx .detail p{ margin:0 0 8px; }
  .rx .adnote{ font-size:11.5px; color:#7E5D00; background:#FEF7E0; border:1px solid #EAD79A; border-radius:8px; padding:6px 10px; margin:8px 0; }
  .rx .rlinks{ font-size:12px; color:var(--sec); margin:8px 0 10px; }
  .rx .openfull{ font:inherit; font-size:12.5px; font-weight:600; color:var(--obj); background:#E1F0FF; border:1px solid #A9D2FF; border-radius:9px; padding:7px 13px; cursor:pointer; }
  .caret{ float:right; color:var(--muted); font-size:11px; margin-top:2px; }
  /* 記事表示 */
  #article{ display:none; }
  .abox{ background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:26px 22px 30px; }
  .back{ font:inherit; font-size:13px; font-weight:600; color:var(--obj); background:#E1F0FF; border:1px solid #A9D2FF; border-radius:10px; padding:8px 14px; cursor:pointer; margin-bottom:14px; }
  .at{ font-size:21px; font-weight:700; line-height:1.5; }
  .am{ font-size:12px; color:var(--muted); margin:8px 0 4px; }
  .src{ font-size:12.5px; margin:6px 0 18px; }
  .src a{ color:var(--obj); }
  .body{ font-size:16px; line-height:2.0; color:#333; }
  .body p{ margin:0 0 1.2em; }
  .body h1,.body h2{ font-size:17px; font-weight:700; margin:1.8em 0 0.7em; padding-left:10px; border-left:4px solid var(--obj); }
  .body h3,.body h4{ font-size:16px; font-weight:700; margin:1.5em 0 0.6em; }
  .body ul,.body ol{ margin:0 0 1.2em 1.4em; }
  .body img{ max-width:100%; height:auto; border-radius:10px; margin:8px 0; }
  .body table{ border-collapse:collapse; margin:0 0 1.2em; }
  .body td,.body th{ border:1px solid var(--divider); padding:6px 10px; font-size:14px; }
  .body blockquote{ border-left:3px solid var(--border); padding-left:12px; color:var(--sec); margin:0 0 1.2em; }
</style>
</head>
<body>
<div class="wrap">
  <div id="home">
    <div class="title">tennis-one アーカイブ</div>
    <div class="subtitle">個人利用の控え。各記事の権利は tennis-one.jp に帰属（本文中に出典リンク）</div>
    <input class="search" id="q" placeholder="全文検索（例: スイングウェイト 硬さ 前衛）">
    <div class="chips" id="chips"></div>
    <div class="count" id="count"></div>
    <div class="list" id="list"></div>
  </div>
  <div id="article">
    <button class="back" id="back">← 一覧に戻る</button>
    <div class="abox">
      <div class="at" id="at"></div>
      <div class="am" id="am"></div>
      <div class="src" id="asrc"></div>
      <div class="body" id="abody"></div>
      <div class="src" id="asrc2" style="margin-top:22px"></div>
    </div>
  </div>
</div>
<script>
var DATA = __DATA__;
var CATS = __CATS__;
var state = { q:"", cats:[], openId:null };
try{ var s=JSON.parse(localStorage.getItem("to_state")||"null"); if(s){ state.q=s.q||""; state.cats=s.cats||[]; } }catch(e){}
function esc(x){ return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];}); }
function save(){ try{ localStorage.setItem("to_state", JSON.stringify(state)); }catch(e){} }
function filtered(){
  var q=state.q.toLowerCase();
  return DATA.filter(function(p){
    if(state.cats.length && !p.cats.some(function(c){ return state.cats.indexOf(c)!==-1; })) return false;
    if(q && (p.title+" "+p.stext+" "+p.text).toLowerCase().indexOf(q)===-1) return false;
    return true;
  });
}
function render(){
  save();
  document.getElementById("chips").innerHTML=CATS.map(function(c){
    return '<span class="chip'+(state.cats.indexOf(c)!==-1?" on":"")+'" data-c="'+esc(c)+'">'+esc(c)+'</span>';
  }).join("");
  var list=filtered();
  document.getElementById("count").textContent=list.length+" / "+DATA.length+" 記事";
  document.getElementById("list").innerHTML=list.map(function(p){
    var x='<div class="row'+(state.openId===p.id?" open":"")+'" data-id="'+p.id+'">';
    x+='<span class="caret">'+(state.openId===p.id?"▲":"▼")+'</span>';
    x+='<div class="rt">'+esc(p.title)+'</div>';
    if(p.short) x+='<div class="rs">'+esc(p.short)+'</div>';
    x+='<div class="rm">'+p.cats.map(function(c){ return '<span class="c">'+esc(c)+'</span>'; }).join("")+p.date+'</div>';
    x+='<div class="rx">';
    if(p.detail) x+='<div class="detail">'+p.detail+'</div>';
    else x+='<div class="detail" style="color:#80868B">詳細要約は準備中</div>';
    if(p.ad) x+='<div class="adnote">宣伝部分: '+esc(p.ad)+'</div>';
    if(p.links && p.links.length) x+='<div class="rlinks">関連: '+p.links.map(esc).join(" ／ ")+'</div>';
    x+='<button class="openfull" data-full="'+p.id+'">原文を読む</button>';
    x+='</div></div>';
    return x;
  }).join("")||'<div class="row" style="cursor:default;color:#80868B">該当なし</div>';
}
function openArticle(id){
  var p=DATA.filter(function(x){ return x.id===id; })[0];
  if(!p) return;
  document.getElementById("home").style.display="none";
  document.getElementById("article").style.display="block";
  document.getElementById("at").textContent=p.title;
  document.getElementById("am").innerHTML=p.cats.map(function(c){ return '<span class="c" style="color:#0057B8;background:#E1F0FF;border-radius:5px;padding:1px 6px;margin-right:5px">'+esc(c)+'</span>'; }).join("")+" "+p.date;
  var src='出典: <a href="'+esc(p.link)+'" target="_blank" rel="noopener">元記事を tennis-one.jp で開く</a>';
  document.getElementById("asrc").innerHTML=src;
  document.getElementById("asrc2").innerHTML=src;
  document.getElementById("abody").innerHTML=p.body;
  window.scrollTo(0,0);
}
document.getElementById("q").value=state.q;
document.getElementById("q").addEventListener("input",function(e){ state.q=e.target.value; render(); });
document.addEventListener("click",function(e){
  var ch=e.target.closest(".chip");
  if(ch){ var c=ch.getAttribute("data-c"); var i=state.cats.indexOf(c); if(i===-1) state.cats.push(c); else state.cats.splice(i,1); render(); return; }
  var fb=e.target.closest(".openfull");
  if(fb){ openArticle(parseInt(fb.getAttribute("data-full"),10)); return; }
  if(e.target.closest(".rx")) return;  // 展開部の中は閉じない
  var row=e.target.closest(".row[data-id]");
  if(row){ var id=parseInt(row.getAttribute("data-id"),10); state.openId=(state.openId===id)?null:id; render(); return; }
  if(e.target.closest("#back")){ document.getElementById("article").style.display="none"; document.getElementById("home").style.display="block"; }
});
render();
</script>
</body>
</html>
'''

page = PAGE.replace('__DATA__', data_js).replace('__CATS__', cats_js)
open(OUT, 'w', encoding='utf-8').write(page)
print('生成:', len(rows), '記事 /', len(page) // 1024, 'KB ->', OUT)
