# Full inventory of every <img> in every .html + variant/intrinsic facts.
# Read-only. Writes perf/img-inventory2.json
import os, re, glob, json, collections
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGDIR = os.path.join(ROOT, "assets", "img")
have = set(os.listdir(IMGDIR))

files = (sorted(glob.glob(os.path.join(ROOT, "*.html")))
         + sorted(glob.glob(os.path.join(ROOT, "blog", "*.html")))
         + sorted(glob.glob(os.path.join(ROOT, "recipes", "*.html"))))

TAG = re.compile(r'<img\b[^>]*?>', re.I)
def attr(t, a):
    m = re.search(r'\b%s\s*=\s*"([^"]*)"' % a, t, re.I)
    return m.group(1) if m else None

cache = {}
def info(fn):
    if fn in cache:
        return cache[fn]
    p = os.path.join(IMGDIR, fn)
    r = {"exists": os.path.exists(p)}
    if r["exists"]:
        r["bytes"] = os.path.getsize(p)
        try:
            with Image.open(p) as im:
                r["w"], r["h"] = im.size
        except Exception as e:
            r["w"] = r["h"] = None
            r["err"] = str(e)
    cache[fn] = r
    return r

rows = []
for f in files:
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    s = open(f, encoding="utf-8", errors="replace").read()
    for t in TAG.findall(s):
        src = (attr(t, "src") or "")
        base = src.split("?")[0]
        fn = os.path.basename(base)
        stem, ext = os.path.splitext(fn)
        variants = {v: (v in have) for v in
                    (stem + "-600.jpg", stem + "-900.jpg", stem + "-600.webp",
                     stem + "-900.webp", stem + ".webp")}
        rows.append({
            "page": rel,
            "src": src,
            "file": fn,
            "in_img_dir": base.replace("../", "").startswith("assets/img/"),
            "width": attr(t, "width"),
            "height": attr(t, "height"),
            "alt": attr(t, "alt"),
            "has_alt": re.search(r'\balt\s*=', t, re.I) is not None,
            "has_srcset": re.search(r'\bsrcset\s*=', t, re.I) is not None,
            "has_sizes": re.search(r'\bsizes\s*=', t, re.I) is not None,
            "loading": attr(t, "loading"),
            "decoding": attr(t, "decoding"),
            "fetchpriority": attr(t, "fetchpriority"),
            "class": attr(t, "class"),
            "data_parallax": attr(t, "data-parallax"),
            "in_picture": False,
            "intrinsic": info(fn) if fn else None,
            "variants": variants,
            "tag": t,
        })

# picture-wrapped?
for f in files:
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    s = open(f, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r'<picture\b.*?</picture>', s, re.S | re.I):
        blk = m.group(0)
        for t in TAG.findall(blk):
            for r in rows:
                if r["page"] == rel and r["tag"] == t:
                    r["in_picture"] = True

print("pages scanned:", len(files))
print("total <img> tags:", len(rows))
print("  no srcset:", sum(1 for r in rows if not r["has_srcset"]))
print("  no srcset AND some variant exists on disk:",
      sum(1 for r in rows if not r["has_srcset"] and any(r["variants"].values())))
print("  no srcset, no variant on disk:",
      sum(1 for r in rows if not r["has_srcset"] and not any(r["variants"].values())))
print("  missing width or height:", sum(1 for r in rows if not r["width"] or not r["height"]))
print("  missing alt attr:", sum(1 for r in rows if not r["has_alt"]))
print("  empty alt:", sum(1 for r in rows if r["has_alt"] and not r["alt"]))
print("  empty src:", sum(1 for r in rows if not r["src"]))
print("  no loading attr:", sum(1 for r in rows if not r["loading"]))
print("  inside <picture>:", sum(1 for r in rows if r["in_picture"]))
print("  src file missing from assets/img:",
      sum(1 for r in rows if r["file"] and r["intrinsic"] and not r["intrinsic"]["exists"]))

print("\n=== distinct source files referenced (%d) ===" %
      len({r["file"] for r in rows if r["file"]}))
cnt = collections.Counter(r["file"] for r in rows if r["file"])
print("%-30s %5s %6s %-12s %-11s %s" % ("file", "tags", "KB", "intrinsic", "declared", "variants on disk"))
for fn, n in cnt.most_common():
    i = info(fn)
    declared = collections.Counter(
        (r["width"], r["height"]) for r in rows if r["file"] == fn)
    stem = os.path.splitext(fn)[0]
    vs = [v.replace(stem, "*") for v in
          (stem + "-600.jpg", stem + "-900.jpg", stem + "-600.webp", stem + "-900.webp", stem + ".webp")
          if v in have]
    print("%-30s %5d %6.0f %-12s %-11s %s" % (
        fn, n, i.get("bytes", 0) / 1024,
        "%sx%s" % (i.get("w"), i.get("h")) if i.get("exists") else "MISSING",
        ";".join("%sx%s" % d for d in declared),
        ",".join(vs) or "-"))

print("\n=== MISMATCHED declared vs intrinsic (aspect-ratio trap) ===")
seen = set()
for r in rows:
    i = r["intrinsic"]
    if not i or not i.get("exists") or not r["width"] or not r["height"]:
        continue
    try:
        dw, dh = int(r["width"]), int(r["height"])
    except ValueError:
        continue
    if (dw, dh) == (i["w"], i["h"]):
        continue
    # ratio check
    ok = abs((dw / dh) - (i["w"] / i["h"])) < 0.01
    key = (r["file"], dw, dh)
    n = sum(1 for x in rows if x["file"] == r["file"] and x["width"] == r["width"] and x["height"] == r["height"])
    if key in seen:
        continue
    seen.add(key)
    print("  %-28s declared %sx%s  intrinsic %sx%s  ratio-ok=%s  tags=%d" % (
        r["file"], dw, dh, i["w"], i["h"], ok, n))

print("\n=== tags missing width/height, by file ===")
md = collections.Counter(r["file"] or "(empty src)" for r in rows if not r["width"] or not r["height"])
for fn, n in md.most_common():
    i = info(fn) if fn != "(empty src)" else {}
    print("  x%-4d %-30s intrinsic=%sx%s" % (n, fn, i.get("w"), i.get("h")))

json.dump(rows, open(os.path.join(ROOT, "perf", "img-inventory2.json"), "w", encoding="utf-8"), indent=1)
print("\nwrote perf/img-inventory2.json")
