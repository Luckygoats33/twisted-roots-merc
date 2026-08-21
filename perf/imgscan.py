import os, re, glob, collections
from PIL import Image

for n in ['logo-foot.webp', 'logo-foot.png']:
    p = 'assets/img/' + n
    if os.path.exists(p):
        with Image.open(p) as im:
            print("%-18s %s  %.0f KB" % (n, im.size, os.path.getsize(p) / 1024))

have = set(os.listdir('assets/img'))
files = sorted(glob.glob('*.html')) + sorted(glob.glob('blog/*.html')) + sorted(glob.glob('recipes/*.html'))

TAG = re.compile(r'<img\b[^>]*>', re.I)
ATTR = lambda t, a: (re.search(r'\b%s\s*=\s*"([^"]*)"' % a, t, re.I) or [None, None])[1]

no_dim = collections.Counter()
no_dim_ex = {}
no_srcset_variants = collections.Counter()
no_lazy = collections.Counter()
big_no_srcset = collections.Counter()
sizes_cache = {}
total_imgs = 0


def dim(fn):
    if fn not in sizes_cache:
        p = 'assets/img/' + fn
        try:
            with Image.open(p) as im:
                sizes_cache[fn] = (im.size, os.path.getsize(p))
        except Exception:
            sizes_cache[fn] = (None, 0)
    return sizes_cache[fn]


for f in files:
    s = open(f, encoding='utf-8', errors='replace').read()
    for t in TAG.findall(s):
        total_imgs += 1
        src = ATTR(t, 'src') or ''
        fn = os.path.basename(src.split('?')[0])
        w, h = ATTR(t, 'width'), ATTR(t, 'height')
        has_srcset = 'srcset' in t.lower()
        lazy = 'loading=' in t.lower()
        if not w or not h:
            no_dim[fn] += 1
            no_dim_ex.setdefault(fn, (f, t[:150]))
        if not lazy:
            no_lazy[fn] += 1
        stem = os.path.splitext(fn)[0]
        if fn and not has_srcset:
            variants = [v for v in (stem + '-600.jpg', stem + '-900.jpg', stem + '-600.webp',
                                    stem + '-900.webp', stem + '.webp') if v in have]
            if variants:
                no_srcset_variants[fn] += 1
            d, b = dim(fn)
            if b > 150 * 1024:
                big_no_srcset[fn] += 1

print("\ntotal <img> tags across %d pages: %d" % (len(files), total_imgs))

print("\n=== IMG TAGS MISSING width/height (CLS risk) ===")
for fn, n in no_dim.most_common(25):
    d, b = dim(fn) if fn else (None, 0)
    pg, tag = no_dim_ex.get(fn, ('', ''))
    print("  x%-5d %-30s intrinsic=%-12s %6.0f KB  (e.g. %s)" % (n, fn or '(empty src)', d, b / 1024, pg))

print("\n=== NO srcset BUT responsive/webp variants ALREADY EXIST ===")
tot = 0
for fn, n in no_srcset_variants.most_common(25):
    d, b = dim(fn)
    stem = os.path.splitext(fn)[0]
    vs = [v for v in (stem + '-600.webp', stem + '-900.webp', stem + '.webp') if v in have]
    best = min((os.path.getsize('assets/img/' + v) for v in vs), default=b)
    print("  x%-5d %-28s %6.0f KB -> smallest variant %6.0f KB  %s" % (n, fn, b / 1024, best / 1024, vs[:3]))
    tot += n
print("  (%d img tags total)" % tot)

print("\n=== LARGE images (>150KB) with NO srcset ===")
for fn, n in big_no_srcset.most_common(20):
    d, b = dim(fn)
    print("  x%-5d %-28s %6.0f KB %s" % (n, fn, b / 1024, d))
