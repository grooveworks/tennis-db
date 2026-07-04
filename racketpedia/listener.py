# -*- coding: utf-8 -*-
"""ローカル受け口: ブラウザのユーザースクリプトから POST された HTML を取り込む。
127.0.0.1 のみ待受 (外部公開しない)。個人利用専用。
起動: python racketpedia/listener.py   (Windows ログイン時に自動起動も可)
"""
import sys, io, os, json, datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
sys.path.insert(0, 'racketpedia')
import store

# 画面あり(python)は utf-8 で表示。画面なし(pythonw/自動起動)は sys.stdout が None なので
# クラッシュせず、ログをファイル racketpedia/listener.log に出す。
if getattr(sys.stdout, 'buffer', None) is not None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
else:
    _lf = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'listener.log'),
               'a', encoding='utf-8', buffering=1)
    sys.stdout = _lf
    sys.stderr = _lf
PORT = 8765
S2B = store._slug2brand()  # 起動時に1回ロード


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):  # ヘルスチェック + 比較ページ配信 (レイアウト検証用・このパスのみ)
        if self.path in ('/compare', '/compare-racket', '/compare-mobile', '/reader'):
            fn = {'/compare': 'string_compare.html', '/compare-racket': 'racket_compare.html',
                  '/compare-mobile': 'string_compare_mobile.html',
                  '/reader': os.path.join('..', 'tennisone', 'reader.html')}[self.path]
            p = os.path.join(os.path.dirname(os.path.abspath(__file__)), fn)
            body = open(p, 'rb').read()
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true,"service":"racketpedia-listener"}')

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(n).decode('utf-8', 'replace')
            if self.path == '/sample':  # 解析器開発用: 生HTMLをそのまま保管 (取込はしない)
                inbox = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache', 'inbox')
                os.makedirs(inbox, exist_ok=True)
                fn = 'sample_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S') + '.html'
                open(os.path.join(inbox, fn), 'w', encoding='utf-8').write(body)
                out = json.dumps({'saved': fn}).encode('utf-8')
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(out)
                return
            html_text = body
            if body[:1] == '{':  # {html:...} 形式も許容
                try:
                    html_text = json.loads(body).get('html', body)
                except Exception:
                    pass
            kind, slug, status, name = store.ingest_html(html_text, S2B)
            if kind:
                store.rebuild(kind)
            else:
                # 未対応ページは捨てずに保管箱へ (新ページ種の解析器を後から作れるように)
                inbox = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache', 'inbox')
                os.makedirs(inbox, exist_ok=True)
                fn = datetime.datetime.now().strftime('%Y%m%d_%H%M%S') + '.html'
                open(os.path.join(inbox, fn), 'w', encoding='utf-8').write(html_text)
                status = f'inbox:{fn}'
            resp = {'kind': kind, 'slug': slug, 'status': status, 'name': name}
            print(f"[ingest] {kind or 'skip':7} {status:7} {slug or '-'}  {name or ''}")
        except Exception as e:
            resp = {'error': str(e)}
            print(f"[error] {e}")
        out = json.dumps(resp, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass  # アクセスログ抑制 (ingest 行だけ出す)


if __name__ == '__main__':
    print(f"Racketpedia listener: http://127.0.0.1:{PORT}/ingest  (Ctrl+C で停止)")
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
