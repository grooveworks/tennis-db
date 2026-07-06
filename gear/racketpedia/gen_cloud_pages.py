# -*- coding: utf-8 -*-
"""クラウド版ページ生成 (gear/*.html)。
ローカル生成ページから DATA を抜いた「器」を作る:
  開く → Google ログイン → 本人の Firestore (users/{uid}/cloudpages) から分割データ取得 → 元のページ script を起動。
器にはデータを一切含まない = GitHub Pages に公開しても会員データ・記事は漏れない。
アプリ本体 (v4/) には触れない。"""
import io, sys, os, re, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = ROOT
os.makedirs(OUTDIR, exist_ok=True)

# ストリングPC版(string_compare.html)はデザイン方式(SC_DATA)なので下部で専用処理。
# 残り3ページは従来の var DATA + appsrc 方式。
PAGES = [
    ('racketpedia/string_compare_mobile.html', 'strings', 'strings-mobile.html', 'ストリング比較 (モバイル)'),
    ('racketpedia/racket_compare.html', 'rackets', 'rackets.html', 'ラケット比較'),
    ('tennisone/reader.html', 'reader', 'reader.html', 'tennis-one アーカイブ'),
]

GATE_CSS = '''
  #cloudgate{ position:fixed; inset:0; background:#F2F2F7; z-index:9999; display:flex; align-items:center; justify-content:center; font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Helvetica Neue",Arial,sans-serif; }
  #cloudgate .gbox{ background:#fff; border:1px solid #DADCE0; border-radius:20px; padding:34px 30px; text-align:center; max-width:340px; }
  #cloudgate h1{ font-size:17px; font-weight:700; color:#202124; margin:0 0 6px; }
  #cloudgate p{ font-size:12.5px; color:#5F6368; margin:0 0 18px; line-height:1.7; }
  #cloudgate button{ font:inherit; font-size:14px; font-weight:700; color:#fff; background:#007AFF; border:none; border-radius:12px; padding:12px 22px; cursor:pointer; }
  #cloudgate .gst{ font-size:12px; color:#80868B; margin-top:14px; min-height:18px; }
'''

BOOT = '''
(function(){
  var CFG = {
    apiKey:"AIzaSyAXWAtHjBOi31FoNXZiAwW-A7ywZcDY2mM",
    authDomain:"tennis-db-ca9ae.firebaseapp.com",
    projectId:"tennis-db-ca9ae",
    storageBucket:"tennis-db-ca9ae.firebasestorage.app",
    messagingSenderId:"1031131288345",
    appId:"1:1031131288345:web:2adcb9f2eeafa5801ceb88"
  };
  var BLOB = "__BLOB__";
  firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG);
  var st = function(t){ var el=document.getElementById("gst"); if(el) el.textContent=t; };
  function boot(data){
    window.__CLOUD_DATA__ = data;
    var src = document.getElementById("appsrc").textContent;
    var s = document.createElement("script");
    s.textContent = src;
    document.body.appendChild(s);
    var g = document.getElementById("cloudgate");
    if(g) g.remove();
  }
  function load(user){
    st("データ取得中…");
    var col = firebase.firestore().collection("users").doc(user.uid).collection("cloudpages");
    col.doc(BLOB + "__meta").get().then(function(meta){
      if(!meta.exists){ st("このアカウントにはデータがありません"); return; }
      var total = meta.data().total;
      var jobs = [];
      for(var i=0;i<total;i++) jobs.push(col.doc(BLOB + "__" + i).get());
      Promise.all(jobs).then(function(parts){
        var json = parts.map(function(p){ return p.data().part; }).join("");
        st("展開中…");
        boot(JSON.parse(json));
      }).catch(function(e){ st("取得エラー: " + e.message); });
    }).catch(function(e){ st("取得エラー: " + e.message); });
  }
  firebase.auth().onAuthStateChanged(function(user){
    if(user){ load(user); }
    else { st(""); }
  });
  document.getElementById("glogin").addEventListener("click", function(){
    var p = new firebase.auth.GoogleAuthProvider();
    st("ログイン中…");
    firebase.auth().signInWithPopup(p).catch(function(){
      firebase.auth().signInWithRedirect(p);
    });
  });
})();
'''

for src_rel, blob, out_name, title in PAGES:
    h = open(os.path.join(ROOT, src_rel), encoding='utf-8').read()
    # 1) DATA を抜く (器にデータを残さない)
    h2, n = re.subn(r'var DATA = \[.*?\];', 'var DATA = window.__CLOUD_DATA__;', h, count=1, flags=re.S)
    assert n == 1, 'DATA が見つからない: ' + src_rel
    # 2) アプリ script を実行しない容器 (text/plain) に変えて、データ取得後に起動する
    m = re.search(r'<script>(.*)</script>', h2, re.S)
    assert m, 'script が見つからない: ' + src_rel
    app_src = m.group(1)
    assert '</script' not in app_src, 'script 終端文字列が本文に含まれる: ' + src_rel
    h2 = h2[:m.start()] + '<script type="text/plain" id="appsrc">' + app_src + '</script>' + h2[m.end():]
    # 3) ログインゲート + Firebase SDK + 起動スクリプトを </body> 直前に注入
    gate = ('<style>' + GATE_CSS + '</style>'
            + '<div id="cloudgate"><div class="gbox"><h1>' + title + '</h1>'
            + '<p>データは本人の Firebase にのみ保存。<br>Google ログインで表示します。</p>'
            + '<button id="glogin">Google でログイン</button><div class="gst" id="gst"></div></div></div>'
            + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>'
            + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>'
            + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>'
            + '<script>' + BOOT.replace('__BLOB__', blob) + '</script>')
    # 相互リンクナビ (add_nav.py 注入分) を gear/ の平坦名に書き換え
    h2 = (h2.replace('href="/racketpedia/string_compare.html"', 'href="strings.html"')
             .replace('href="/racketpedia/string_compare_mobile.html"', 'href="strings-mobile.html"')
             .replace('href="/racketpedia/racket_compare.html"', 'href="rackets.html"')
             .replace('href="/tennisone/reader.html"', 'href="reader.html"'))
    assert '</body>' in h2, 'body 終端が見つからない: ' + src_rel
    h2 = h2.replace('</body>', gate + '</body>', 1)
    out = os.path.join(OUTDIR, out_name)
    open(out, 'w', encoding='utf-8').write(h2)
    print(f'生成: gear/{out_name} ({len(h2)//1024} KB, blob={blob})')

# === ストリング比較 PC (デザイン方式: window.SC_DATA + 外部 support.js) 専用の器 ===
# DCランタイム(support.js)が自動起動し DCLogic が window.SC_DATA をポーリング → セットで描画。
# 器から会員データ(SC_DATA)を完全に抜き、ログイン後に Firestore の strings blob をセットする。
BOOT_SCDATA = '''
(function(){
  var CFG = {
    apiKey:"AIzaSyAXWAtHjBOi31FoNXZiAwW-A7ywZcDY2mM",
    authDomain:"tennis-db-ca9ae.firebaseapp.com",
    projectId:"tennis-db-ca9ae",
    storageBucket:"tennis-db-ca9ae.firebasestorage.app",
    messagingSenderId:"1031131288345",
    appId:"1:1031131288345:web:2adcb9f2eeafa5801ceb88"
  };
  var BLOB = "strings";
  firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG);
  var st = function(t){ var el=document.getElementById("gst"); if(el) el.textContent=t; };
  function apply(data){ window.SC_DATA = data; var g=document.getElementById("cloudgate"); if(g) g.remove(); }
  function load(user){
    st("データ取得中…");
    var col = firebase.firestore().collection("users").doc(user.uid).collection("cloudpages");
    col.doc(BLOB + "__meta").get().then(function(meta){
      if(!meta.exists){ st("このアカウントにはデータがありません"); return; }
      var total = meta.data().total, jobs = [];
      for(var i=0;i<total;i++) jobs.push(col.doc(BLOB + "__" + i).get());
      Promise.all(jobs).then(function(parts){
        var json = parts.map(function(p){ return p.data().part; }).join("");
        st("展開中…"); apply(JSON.parse(json));
      }).catch(function(e){ st("取得エラー: " + e.message); });
    }).catch(function(e){ st("取得エラー: " + e.message); });
  }
  firebase.auth().onAuthStateChanged(function(user){ if(user){ load(user); } else { st(""); } });
  document.getElementById("glogin").addEventListener("click", function(){
    var p = new firebase.auth.GoogleAuthProvider(); st("ログイン中…");
    firebase.auth().signInWithPopup(p).catch(function(){ firebase.auth().signInWithRedirect(p); });
  });
})();
'''

sc = open(os.path.join(ROOT, 'racketpedia/string_compare.html'), encoding='utf-8').read()
# 1) 会員データ(SC_DATA)を器から完全に抜く
sc, ns = re.subn(r'<script>window\.SC_DATA = \[.*?\];</script>', '', sc, count=1, flags=re.S)
assert ns == 1, 'SC_DATA スクリプトが見つからない'
assert 'window.SC_DATA = [' not in sc, '器に SC_DATA が残存している!'
assert 'SC_DATA =' not in sc.replace('window.SC_DATA = data', ''), 'SC_DATA 代入が残存!'
# 2) support.js を器の隣 (gear/) へコピー — 器の <script src="./support.js"> が解決する
shutil.copy(os.path.join(ROOT, 'racketpedia/support.js'), os.path.join(OUTDIR, 'support.js'))
# 3) 相互リンクナビを平坦名へ
sc = (sc.replace('href="/racketpedia/string_compare.html"', 'href="strings.html"')
        .replace('href="/racketpedia/string_compare_mobile.html"', 'href="strings-mobile.html"')
        .replace('href="/racketpedia/racket_compare.html"', 'href="rackets.html"')
        .replace('href="/tennisone/reader.html"', 'href="reader.html"'))
# 4) ログインゲート + Firebase SDK + SC_DATA セット用ブートを </body> 直前へ
gate_sc = ('<style>' + GATE_CSS + '</style>'
    + '<div id="cloudgate"><div class="gbox"><h1>ストリング比較</h1>'
    + '<p>データは本人の Firebase にのみ保存。<br>Google ログインで表示します。</p>'
    + '<button id="glogin">Google でログイン</button><div class="gst" id="gst"></div></div></div>'
    + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>'
    + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>'
    + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>'
    + '<script>' + BOOT_SCDATA + '</script>')
assert '</body>' in sc, 'body 終端が見つからない (strings)'
sc = sc.replace('</body>', gate_sc + '</body>', 1)
open(os.path.join(OUTDIR, 'strings.html'), 'w', encoding='utf-8').write(sc)
print('生成: gear/strings.html (デザイン方式・SC_DATA除去・support.js配信)')

print('完了。gear/ はデータを含まない器のみ = 公開可能')
