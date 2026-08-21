"""full-*.html plus the two changes that need a build step:
     - the four render-blocking stylesheets concatenated into one request
     - the Google Fonts stylesheet made non-blocking (preload + onload swap)
   Purely to measure the ceiling; nothing here touches the real pages."""
import os, re, sys
sys.path.insert(0, 'perf')

CSS = [p for p in ['assets/css/site.css', 'assets/css/motion.css', 'assets/css/roots.css',
                   'assets/css/mobile.css', 'assets/css/polish.css', 'assets/css/perf.css']
       if os.path.exists(p)]
OUT = 'perf/preview'


def minify(c):
    c = re.sub(r'/\*.*?\*/', '', c, flags=re.S)          # comments
    c = re.sub(r'\s*\n\s*', '\n', c)                      # leading/trailing ws
    c = re.sub(r'\n{2,}', '\n', c)
    c = re.sub(r'\s*([{};:,>])\s*', r'\1', c)
    c = re.sub(r';}', '}', c)
    return c.strip()


bundle = []
raw_total = 0
for p in CSS:
    t = open(p, encoding='utf-8').read()
    raw_total += len(t.encode())
    # url(../img/..) stays correct: the bundle lives in the same assets/css dir
    bundle.append('/* %s */\n' % os.path.basename(p) + t)
joined = '\n'.join(bundle)
mini = minify(joined)
# bundle lives in perf/ (the dir I own), so rewrite relative asset urls to absolute
mini = re.sub(r'url\(\s*"?\.\./img/', 'url("/assets/img/', mini)
mini = re.sub(r'url\(\s*"?\.\./video/', 'url("/assets/video/', mini)
open('perf/bundle.css', 'w', encoding='utf-8').write(mini)
print("bundled %d files: %.1f KB raw -> %.1f KB minified" % (len(CSS), raw_total / 1024, len(mini.encode()) / 1024))

FONTS_ASYNC = (
    '<link rel="preload" as="style" '
    'href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900'
    '&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap">\n'
    '<link rel="stylesheet" media="print" onload="this.media=\'all\'" '
    'href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900'
    '&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap">\n'
    '<noscript><link rel="stylesheet" '
    'href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900'
    '&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap"></noscript>\n'
)

for f in sorted(os.listdir(OUT)):
    if not f.startswith('full-'):
        continue
    s = open(os.path.join(OUT, f), encoding='utf-8').read()
    # drop the blocking Google Fonts <link>, re-add asynchronously
    s = re.sub(r'<link href="https://fonts\.googleapis\.com/css2[^>]*rel="stylesheet">', FONTS_ASYNC, s)
    # replace the five separate stylesheet links with the single bundle
    s = re.sub(r'<link rel="stylesheet" href="(?:/)?assets/css/(?:site|motion|roots|mobile|polish|perf)\.css[^>]*>\s*', '', s)
    s = s.replace('</head>', '<link rel="stylesheet" href="/perf/bundle.css">\n</head>', 1)
    # print.css stays as-is (media=print, already non-blocking)
    out = 'max-' + f[5:]
    open(os.path.join(OUT, out), 'w', encoding='utf-8').write(s)
    n = len(re.findall(r'<link rel="stylesheet"', s))
    print("  %s  stylesheet links now: %d" % (out, n))
