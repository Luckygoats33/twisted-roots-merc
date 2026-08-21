"""Static server that gzips text assets and sets far-future cache headers,
so Lighthouse sees what a real host (GitHub Pages, Netlify, Cloudflare) sends.
The plain `python -m http.server` on :8899 does neither, which makes FCP/LCP
look far worse than production and makes `cache-insight` fail on every page.
"""
import gzip, io, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = r'C:\Users\willw\twisted-roots-merc'
GZIP_TYPES = ('text/html', 'text/css', 'application/javascript', 'text/javascript',
              'application/json', 'image/svg+xml', 'text/plain', 'application/xml')
STATIC_EXT = ('.css', '.js', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.woff2', '.mp4', '.svg', '.ico')


class H(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        p = self.path.split('?')[0].lower()
        if p.endswith(STATIC_EXT):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        else:
            self.send_header('Cache-Control', 'public, max-age=600')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for idx in ('index.html',):
                if os.path.exists(os.path.join(path, idx)):
                    path = os.path.join(path, idx)
                    break
            else:
                return super().send_head()
        if not os.path.exists(path):
            self.send_error(404)
            return None
        ctype = self.guess_type(path)
        base = ctype.split(';')[0]
        raw = open(path, 'rb').read()
        accepts = 'gzip' in self.headers.get('Accept-Encoding', '')
        if accepts and base in GZIP_TYPES:
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6, mtime=0) as f:
                f.write(raw)
            body = buf.getvalue()
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        return io.BytesIO(raw)


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8898
ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
