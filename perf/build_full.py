"""Builds perf/preview/full-*.html : the original page with EVERY proposed
HTML patch applied, so the resulting Lighthouse score is measured rather than
guessed. Nothing here writes to the real pages."""
import os, re
from PIL import Image

PAGES = ['index.html', 'merc.html', 'shop.html', 'journal.html']
OUT = 'perf/preview'
os.makedirs(OUT, exist_ok=True)
have = set(os.listdir('assets/img'))
dims = {}


def dim(fn):
    if fn not in dims:
        try:
            with Image.open('assets/img/' + fn) as im:
                dims[fn] = im.size
        except Exception:
            dims[fn] = None
    return dims[fn]


PRELOAD = (
    '<link rel="preload" as="font" type="font/woff2" crossorigin '
    'href="https://fonts.gstatic.com/s/bitter/v42/rax8HiqOu8IVPmn7f4xpLjpSmw.woff2">\n'
    '<link rel="preload" as="font" type="font/woff2" crossorigin '
    'href="https://fonts.gstatic.com/s/publicsans/v21/ijwRs572Xtc6ZYQws9YVwnNGfJ7QwOk1.woff2">\n'
)


def patch(s, page):
    # P1 <base> so the preview can live in perf/preview/
    s = re.sub(r'(<head[^>]*>)', r'\1\n<base href="/">', s, count=1)

    # P2 footer logo: correct dims + already-existing webp + lazy/async
    s = re.sub(
        r'<img\b[^>]*\bsrc="(?:\.\./)?assets/img/logo-foot\.png(?:\?[^"]*)?"[^>]*>',
        '<img src="assets/img/logo-foot.webp" alt="Twisted Roots Merc" '
        'width="440" height="371" loading="lazy" decoding="async">', s)

    # P3 heading order: footer h4 -> h3, board-head h3 -> h2
    s = re.sub(r'<h4>(The Store|Food|Twisted Roots)</h4>', r'<h3>\1</h3>', s)
    s = re.sub(r'(<div class="board-head">\s*)<h3>(.*?)</h3>', r'\1<h2>\2</h2>', s, flags=re.S)

    # P4 hero video: drop the redundant full-size poster (the hero-still <img>
    #    behind it already paints, with a proper srcset)
    s = s.replace(' poster="assets/img/w-river.jpg"\n', '\n')
    s = s.replace('poster="assets/img/w-river.jpg"', '')

    # P5 defer every body script
    s = re.sub(r'<script src="((?:\.\./)?assets/js/[^"]+)"></script>',
               r'<script src="\1" defer></script>', s)

    # P6 de-duplicate repeated script srcs (blog/journal load 4 files twice)
    seen = set()

    def dedupe(m):
        base = m.group(1).split('?')[0]
        if base in seen:
            return ''
        seen.add(base)
        return m.group(0)
    s = re.sub(r'<script src="((?:\.\./)?assets/js/[^"]+)"[^>]*></script>\s*', dedupe, s)

    # P7 font preload
    s = s.replace('<link rel="canonical"', PRELOAD + '<link rel="canonical"', 1)

    # P8 responsive webp for every <img> that has variants but no srcset
    def img(m):
        t = m.group(0)
        if 'srcset' in t.lower():
            return t
        sm = re.search(r'src="(?:\.\./)?assets/img/([^"?]+)(\?[^"]*)?"', t)
        if not sm:
            return t
        fn = sm.group(1)
        stem = os.path.splitext(fn)[0]
        if stem.endswith('.webp') or fn.endswith('.webp'):
            return t
        cand = [(stem + '-600.webp', 600), (stem + '-900.webp', 900), (stem + '.webp', None)]
        parts = []
        for v, w in cand:
            if v not in have:
                continue
            d = dim(v)
            if not d:
                continue
            parts.append('assets/img/%s %dw' % (v, w or d[0]))
        if not parts:
            return t
        t = t[:-1] + ' srcset="%s" sizes="(max-width:760px) 92vw, 46vw">' % ', '.join(parts)
        # add intrinsic width/height when missing
        if not re.search(r'\bwidth=', t):
            d = dim(fn)
            if d:
                t = t[:-1] + ' width="%d" height="%d">' % d
        if 'loading=' not in t and 'fetchpriority' not in t:
            t = t[:-1] + ' loading="lazy" decoding="async">'
        return t
    s = re.sub(r'<img\b[^>]*>', img, s)

    # P9 perf.css last
    s = s.replace('</head>', '<link rel="stylesheet" href="/assets/css/perf.css">\n</head>', 1)
    return s


for p in PAGES:
    if not os.path.exists(p):
        continue
    src = open(p, encoding='utf-8').read()
    out = patch(src, p)
    open(os.path.join(OUT, 'full-' + p), 'w', encoding='utf-8').write(out)
    print("full-%-16s  %d -> %d bytes" % (p, len(src), len(out)))
