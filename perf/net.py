import json, sys, os

p = sys.argv[1]
r = json.load(open(p, encoding='utf-8'))
a = r['audits']
print("##", os.path.basename(p))
its = (a.get('network-requests', {}).get('details', {}) or {}).get('items', [])
tot = 0
print("\n--- ALL REQUESTS by transfer size ---")
for it in sorted(its, key=lambda x: -(x.get('transferSize') or 0)):
    ts = it.get('transferSize') or 0
    tot += ts
    print("  %8.1f KB  %-12s %-6s %s" % (ts / 1024, it.get('resourceType', ''), it.get('priority', ''),
                                          str(it.get('url', '')).split('?')[0].replace('http://localhost:8899', '')))
print("  TOTAL %.1f KB over %d requests" % (tot / 1024, len(its)))

for aid in ['largest-contentful-paint-element', 'lcp-discovery-insight', 'lcp-lazy-loaded', 'prioritize-lcp-image', 'render-blocking-insight', 'render-blocking-resources']:
    au = a.get(aid)
    if not au:
        continue
    d = au.get('details', {}) or {}
    print("\n--- %s (score=%s) %s" % (aid, au.get('score'), au.get('displayValue', '')))
    for it in (d.get('items') or [])[:8]:
        s = json.dumps(it, ensure_ascii=False)
        print("   ", s[:600])
