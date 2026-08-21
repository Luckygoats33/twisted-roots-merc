from PIL import Image
import glob, re, os, collections

for n in ['logo-foot.png', 'logo-carved-web.png', 'logo-carved.png', 'logo-trans.png', 'hero-store.jpg']:
    p = 'assets/img/' + n
    if os.path.exists(p):
        with Image.open(p) as im:
            print(n, im.size, "%.0f KB" % (os.path.getsize(p) / 1024))

files = sorted(glob.glob('*.html')) + sorted(glob.glob('blog/*.html')) + sorted(glob.glob('recipes/*.html'))
c = collections.Counter()
for f in files:
    s = open(f, encoding='utf-8', errors='replace').read()
    if '<h4>The Store</h4>' in s:
        c['footer_h4_TheStore'] += 1
    if 'logo-foot.png" alt="Twisted Roots Merc" width="440" height="371"' in s:
        c['logo_foot_wrong_height'] += 1
    if re.search(r'board-head">\s*<h3>', s):
        c['board_head_h3'] += 1
    if 'logo-foot.png' in s:
        c['pages_with_logo_foot'] += 1
print()
for k, v in sorted(c.items()):
    print("%-28s %d" % (k, v))
print("total pages: %d" % len(files))
