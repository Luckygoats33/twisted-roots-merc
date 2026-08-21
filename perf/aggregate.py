import json, glob, os, collections

rows = []
allfail = collections.defaultdict(lambda: {'pages': set(), 'w': 0, 'title': ''})
for p in sorted(glob.glob('perf/lh/*.json')):
    r = json.load(open(p, encoding='utf-8'))
    name = os.path.basename(p)[:-5]
    c, a = r['categories'], r['audits']
    g = lambda k: (a.get(k, {}).get('numericValue') or 0)
    rows.append((name,
                 c['performance']['score'] * 100, c['accessibility']['score'] * 100,
                 c['best-practices']['score'] * 100, c['seo']['score'] * 100,
                 g('first-contentful-paint'), g('largest-contentful-paint'),
                 g('total-blocking-time'), g('cumulative-layout-shift'),
                 g('speed-index'), g('total-byte-weight') / 1024,
                 a.get('network-requests', {}).get('details', {}).get('items', []).__len__()))
    for cat in ['performance', 'accessibility', 'best-practices', 'seo']:
        for ref in r['categories'][cat]['auditRefs']:
            au = a.get(ref['id'], {})
            s = au.get('score')
            if s is None or s >= 0.9:
                continue
            if ref.get('weight', 0) == 0 and cat != 'performance':
                pass
            k = (cat, ref['id'], ref.get('weight', 0))
            allfail[k]['pages'].add(name)
            allfail[k]['title'] = au.get('title', '')

print("| Page | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI | Bytes | Reqs |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in sorted(rows):
    print("| %s | %.0f | %.0f | %.0f | %.0f | %.0fms | %.0fms | %.0fms | %.3f | %.0fms | %.0f KB | %d |" % r)

print("\n\n=== ALL FAILING AUDITS (weight>0 only) ===")
for (cat, aid, w), d in sorted(allfail.items(), key=lambda x: (x[0][0], -x[0][2])):
    if w == 0:
        continue
    print("[%s] w=%2d  %-32s  %d/%d pages: %s" % (cat[:4], w, aid, len(d['pages']), len(rows), ', '.join(sorted(d['pages']))))

print("\n=== zero-weight diagnostics (informational) ===")
for (cat, aid, w), d in sorted(allfail.items()):
    if w > 0:
        continue
    print("[%s] %-34s %d/%d pages" % (cat[:4], aid, len(d['pages']), len(rows)))
