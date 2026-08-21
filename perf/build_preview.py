import os, re, sys

PAGES = ['index.html', 'merc.html', 'shop.html', 'journal.html', 'board.html', 'kitchen.html', 'visit.html']
OUT = 'perf/preview'
os.makedirs(OUT, exist_ok=True)

LINK = '<link rel="stylesheet" href="/assets/css/perf.css">'
BASE = '<base href="/">'

for p in PAGES:
    if not os.path.exists(p):
        print("skip missing", p)
        continue
    s = open(p, encoding='utf-8').read()
    # insert <base> immediately after <head> so every relative URL resolves at site root
    s2 = re.sub(r'(<head[^>]*>)', r'\1\n' + BASE, s, count=1)
    # control build: base tag only
    open(os.path.join(OUT, 'ctl-' + p), 'w', encoding='utf-8').write(s2)
    # treatment build: base tag + perf.css last in head
    s3 = s2.replace('</head>', LINK + '\n</head>', 1)
    assert LINK in s3, p
    open(os.path.join(OUT, 'fix-' + p), 'w', encoding='utf-8').write(s3)
    print("built ctl-%s / fix-%s" % (p, p))
