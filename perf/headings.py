import re, glob, collections

files = sorted(glob.glob('*.html')) + sorted(glob.glob('blog/*.html')) + sorted(glob.glob('recipes/*.html'))
H = re.compile(r'<h([1-6])\b[^>]*>(.*?)</h\1>', re.S | re.I)
TAGS = re.compile(r'<[^>]+>')

viol = collections.defaultdict(list)   # signature -> [pages]
per_page = {}
for f in files:
    s = open(f, encoding='utf-8', errors='replace').read()
    body = s.split('<body', 1)[-1]
    seq = [(int(m.group(1)), TAGS.sub('', m.group(2)).strip()[:38], m.start()) for m in H.finditer(body)]
    prev = None
    bad = []
    for lvl, txt, pos in seq:
        if prev is not None and lvl > prev + 1:
            bad.append((prev, lvl, txt))
        prev = lvl
    if bad:
        per_page[f] = bad
        for p, l, t in bad:
            viol['h%d -> h%d  "%s"' % (p, l, t)].append(f)

print("pages scanned: %d   pages with heading-order violations: %d\n" % (len(files), len(per_page)))
print("=== DISTINCT VIOLATIONS (grouped) ===")
for sig, pages in sorted(viol.items(), key=lambda x: -len(x[1])):
    print("  x%-4d %-46s  e.g. %s" % (len(pages), sig, pages[0]))

print("\n=== per-page counts by section ===")
grp = collections.Counter()
for f in per_page:
    grp['blog/' if f.startswith('blog/') else ('recipes/' if f.startswith('recipes/') else 'root')] += 1
print(dict(grp))
