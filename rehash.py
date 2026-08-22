# Re-stamp every ?v= cache-bust token from the asset's real content hash.
import os, re, hashlib
ROOT = r"C:\Users\willw\twisted-roots-merc"
cache = {}

def h(rel):
    rel = rel.replace("/", os.sep)
    if rel in cache:
        return cache[rel]
    p = os.path.join(ROOT, rel)
    v = hashlib.md5(open(p, "rb").read()).hexdigest()[:8] if os.path.exists(p) else None
    cache[rel] = v
    return v

# The ?v= is optional: build_blog.py and build_recipes.py write their
# own <head> and never added one, so 369 pages were shipping uncached.
REF = re.compile(r'((?:href|src)=")((?:\.\./)*)(assets/[^"?]+\.(?:css|js|png|jpg|jpeg|webp|svg|woff2?))(?:\?v=[0-9a-f]{6,10})?(")')
JSREF = re.compile(r'"((?:\.\./)*)(assets/(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]{6,10})?"')
changed = 0
pages = 0
for dp, dn, fn in os.walk(ROOT):
    if any(x in dp for x in (".git", "node_modules", "_parts", "perf")):
        continue
    for f in fn:
        if not f.endswith(".html"):
            continue
        p = os.path.join(dp, f)
        s = open(p, encoding="utf-8").read()
        pages += 1
        def sub(m):
            v = h(m.group(3))
            return m.group(1) + m.group(2) + m.group(3) + ("?v=" + v if v else "") + m.group(4)
        s2 = REF.sub(sub, s)
        # The window.load script chain lists its sources as plain JS
        # strings, not as src= attributes, so they need stamping too or
        # every generated page ships a stale hash forever.
        def sub2(m):
            v = h(m.group(2))
            return '"' + m.group(1) + m.group(2) + ("?v=" + v if v else "") + '"'
        s2 = JSREF.sub(sub2, s2)
        if s2 != s:
            open(p, "w", encoding="utf-8").write(s2)
            changed += 1
print("scanned", pages, "pages; re-stamped", changed)
for k, v in sorted(cache.items()):
    if k.endswith((".css", ".js")):
        print("  ", k, v)
