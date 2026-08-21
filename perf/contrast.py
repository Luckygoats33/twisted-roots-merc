import json, glob, os, re, collections

pat = re.compile(r'contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+), font size: ([\d.]+)pt \(([\d.]+)px\), font weight: (\w+)\)')
agg = collections.defaultdict(lambda: {'n': 0, 'pages': set(), 'sel': set(), 'label': set()})
for p in sorted(glob.glob('perf/lh/*.json')):
    r = json.load(open(p, encoding='utf-8'))
    a = r['audits'].get('color-contrast', {})
    for it in (a.get('details', {}) or {}).get('items', []):
        n = it.get('node', {})
        m = pat.search(n.get('explanation', ''))
        if not m:
            continue
        key = (m.group(2), m.group(3), m.group(5), m.group(6), m.group(1))
        d = agg[key]
        d['n'] += 1
        d['pages'].add(os.path.basename(p)[:-5])
        d['sel'].add(n.get('selector', '')[-70:])
        d['label'].add((n.get('nodeLabel', '') or '')[:30].replace('\n', ' '))

print("DISTINCT COLOR-CONTRAST FAILURES (from Lighthouse/axe):\n")
for (fg, bg, px, wt, ratio), d in sorted(agg.items(), key=lambda x: -x[1]['n']):
    need = 3.0 if (float(px) >= 24 or (float(px) >= 18.66 and wt == 'bold')) else 4.5
    print("fg=%s bg=%s %spx %s -> ratio %s (need %.1f)  x%d nodes" % (fg, bg, px, wt, ratio, need, d['n']))
    print("   pages: %s" % ', '.join(sorted(d['pages'])))
    for s in sorted(d['sel']):
        print("   sel: %s" % s)
    print("   text: %s" % ', '.join(sorted(d['label'])[:4]))
    print()
if not agg:
    print("(none found)")
