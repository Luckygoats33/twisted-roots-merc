import os, sys, urllib.request
from fontTools.ttLib import TTFont

URLS = {
    'Bitter': 'https://fonts.gstatic.com/s/bitter/v42/rax8HiqOu8IVPmn7f4xpLjpSmw.woff2',
    'Public Sans': 'https://fonts.gstatic.com/s/publicsans/v21/ijwRs572Xtc6ZYQws9YVwnNGfJ7QwOk1.woff2',
    'Rye': 'https://fonts.gstatic.com/s/rye/v17/r05XGLJT86YzEZ7tfumh4g.woff2',
}
LOCAL = {
    'Georgia': r'C:\Windows\Fonts\georgia.ttf',
    'Times New Roman': r'C:\Windows\Fonts\times.ttf',
    'Arial': r'C:\Windows\Fonts\arial.ttf',
    'Segoe UI': r'C:\Windows\Fonts\segoeui.ttf',
}
os.makedirs('perf/fonts', exist_ok=True)


def metrics(path):
    f = TTFont(path, lazy=True)
    head, hhea = f['head'], f['hhea']
    upm = head.unitsPerEm
    os2 = f['OS/2'] if 'OS/2' in f else None
    # xWidthAvg: mean advance width of a-z weighted by English letter frequency
    freq = dict(zip('abcdefghijklmnopqrstuvwxyz ',
                    [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
                     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074, 18.0]))
    cmap = f.getBestCmap()
    hmtx = f['hmtx']
    tot = wsum = 0.0
    for ch, w in freq.items():
        g = cmap.get(ord(ch))
        if g and g in hmtx.metrics:
            tot += hmtx.metrics[g][0] * w
            wsum += w
    xavg = tot / wsum if wsum else 0
    r = {'upm': upm, 'ascent': hhea.ascent, 'descent': hhea.descent, 'lineGap': hhea.lineGap,
         'xWidthAvg': xavg}
    if os2:
        r['typoAsc'] = os2.sTypoAscender
        r['typoDesc'] = os2.sTypoDescender
        r['typoGap'] = os2.sTypoLineGap
        r['winAsc'] = os2.usWinAscent
        r['winDesc'] = -os2.usWinDescent
        r['useTypo'] = bool(os2.fsSelection & 128)
    f.close()
    return r


got = {}
for name, url in URLS.items():
    dst = 'perf/fonts/%s.woff2' % name.replace(' ', '')
    if not os.path.exists(dst):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        open(dst, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
    got[name] = metrics(dst)
    print("%-14s %s" % (name, got[name]))
for name, p in LOCAL.items():
    if os.path.exists(p):
        got[name] = metrics(p)
        print("%-14s %s" % (name, got[name]))
    else:
        print("%-14s MISSING %s" % (name, p))

print("\n\n=== @font-face fallback overrides ===")
PAIRS = [('Bitter', 'Georgia', 'Bitter-fb'),
         ('Bitter', 'Times New Roman', 'Bitter-fb-times'),
         ('Public Sans', 'Arial', 'PublicSans-fb'),
         ('Rye', 'Georgia', 'Rye-fb')]
for web, fb, alias in PAIRS:
    if web not in got or fb not in got:
        continue
    w, f = got[web], got[fb]
    size_adjust = (w['xWidthAvg'] / w['upm']) / (f['xWidthAvg'] / f['upm'])
    asc = (w['ascent'] / w['upm']) / size_adjust
    desc = (abs(w['descent']) / w['upm']) / size_adjust
    gap = (w['lineGap'] / w['upm']) / size_adjust
    print("""@font-face{
  font-family:"%s";
  src:local("%s");
  size-adjust:%.2f%%;
  ascent-override:%.2f%%;
  descent-override:%.2f%%;
  line-gap-override:%.2f%%;
}""" % (alias, fb, size_adjust * 100, asc * 100, desc * 100, gap * 100))
