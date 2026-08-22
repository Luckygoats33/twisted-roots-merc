#!/usr/bin/env python
"""
build_images.py -- responsive-image pipeline for twisted-roots-merc.

Four phases, all idempotent and safe to re-run:

  inventory  read-only census of every <img> in every .html
  generate   make the missing -600/-900 (+ -1400/-1920 full-bleed) variants
  rewrite    rewrite every <img> tag with srcset / sizes / width / height /
             loading / decoding, derived from the file's REAL intrinsic size
  verify     crawl the written HTML and stat every src and srcset URL

Usage:  python build_images.py [inventory|generate|rewrite|verify|weight|all]
        (default: all)

Design notes
------------
* srcset carries **WebP only**, `src` keeps the original raster.  A browser
  old enough to lack WebP (Safari <14, Firefox <65, IE) also lacks srcset, so
  it falls back to `src` and still gets a working image.
* <picture> is deliberately NOT used.  site.css targets `.cinema > img` with a
  direct-child combinator (site.css:493) and `.hero-img` is position:absolute
  inside a flex `.hero`; inserting a <picture> wrapper would break both, and
  this script is not allowed to touch the CSS.
* Variants are never upscaled.  If the source is narrower than the target the
  step is skipped and reported.
"""
import os, re, sys, glob, collections
from PIL import Image

ROOT   = os.path.dirname(os.path.abspath(__file__))
IMGDIR = os.path.join(ROOT, "assets", "img")

WEBP_Q     = 82
JPEG_Q     = 82
WIDTHS     = (600, 900)   # standard ladder
WIDE_EXTRA = (1400, 1920) # extra rungs for full-bleed 100vw images

# ---------------------------------------------------------------- sizes map
# Measured off the real CSS, not guessed:
#   .wrap        width:min(100% - 64px, 1560px)      site.css:55 (32px <=640)
#   .split       1.02fr .98fr, gap clamp(32,5.5vw,80); 1 col <=1080
#                                                    site.css:307 / 419
#   .figframe img width:100%                         site.css:311
#   .goods       repeat(auto-fit,minmax(260px,1fr))  site.css:264
#                -> 2 cols 641..900 (mobile.css:438), 1 col <=640
#   .good .ph img width:100% of the grid cell        site.css:267
#   .cinema > img / .hero-img  inset:0 width:100%    site.css:161 / 494
#   .foot-top img width:190px                        site.css:399
SIZES = {
    "fullbleed": "100vw",
    "split":     "(max-width:1080px) calc(100vw - 32px), min(47vw, 760px)",
    "card":      "(max-width:640px) calc(100vw - 32px), (max-width:900px) 46vw, 380px",
    "footlogo":  "190px",
    "default":   "(max-width:900px) calc(100vw - 32px), 760px",
}

# The footer logo is only 440px wide, so -600/-900 would be upscales.  It
# renders at a hard 190px, so it gets its own downscale-only ladder.
SPECIAL_LADDER = {"logo-foot.webp": (190, 380)}

TAG   = re.compile(r"<img\b[^>]*?/?>", re.I)
ATTRS = re.compile(r'([:@a-zA-Z_][-:.\w]*)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'>]+)))?')


def pages():
    return (sorted(glob.glob(os.path.join(ROOT, "*.html")))
            + sorted(glob.glob(os.path.join(ROOT, "blog", "*.html")))
            + sorted(glob.glob(os.path.join(ROOT, "recipes", "*.html"))))


_meta = {}
def meta(fn):
    """(exists, width, height, bytes) for a file in assets/img."""
    if fn not in _meta:
        p = os.path.join(IMGDIR, fn)
        if os.path.exists(p):
            try:
                with Image.open(p) as im:
                    _meta[fn] = (True, im.size[0], im.size[1], os.path.getsize(p))
            except Exception:
                _meta[fn] = (False, None, None, 0)
        else:
            _meta[fn] = (False, None, None, 0)
    return _meta[fn]


def parse_attrs(tag):
    body = tag[4:].rstrip(">").rstrip("/")
    out, order = {}, []
    for m in ATTRS.finditer(body):
        k = m.group(1).lower()
        v = m.group(2)
        if v is None:
            v = m.group(3)
        if v is None:
            v = m.group(4)
        if k in out:
            continue
        out[k] = v
        order.append(k)
    return out, order


# ------------------------------------------------------------------ context
OPEN = re.compile(
    r"<(div|section|figure|a|li|ul|ol|article|header|footer|main|aside|nav|p|span|picture)\b([^>]*)>"
    r"|</(div|section|figure|a|li|ul|ol|article|header|footer|main|aside|nav|p|span|picture)\s*>", re.I)


def ancestor_classes(html, pos):
    """Rough tag-stack walk to the given offset; returns [(tag, classattr), ...]."""
    stack = []
    for m in OPEN.finditer(html, 0, pos):
        if m.group(1):
            cm = re.search(r'class\s*=\s*"([^"]*)"', m.group(2) or "", re.I)
            stack.append((m.group(1).lower(), cm.group(1) if cm else ""))
        else:
            name = m.group(3).lower()
            for i in range(len(stack) - 1, -1, -1):
                if stack[i][0] == name:
                    del stack[i:]
                    break
    return stack


def classify(html, pos, a):
    """Decide the layout bucket for one <img>."""
    cls = a.get("class") or ""
    fn = os.path.basename((a.get("src") or "").split("?")[0])
    if fn == "logo-foot.webp" or "foot-logo" in cls:
        return "footlogo"
    if "hero-img" in cls:
        return "fullbleed"
    st = ancestor_classes(html, pos)
    if any("cinema" in c.split() for _, c in st):
        return "fullbleed"
    if any("figframe" in c.split() for _, c in st):
        return "split"
    if any(("good" in c.split() or "ph" in c.split()) for _, c in st):
        # a .good card sitting inside a .split is half-width, not a grid cell
        if any("split" in c.split() for _, c in st):
            return "split"
        return "card"
    if any("foot-top" in c.split() for _, c in st):
        return "footlogo"
    return "default"


# ---------------------------------------------------------------- generate
def targets_for(fn, bucket):
    if fn in SPECIAL_LADDER:
        return list(SPECIAL_LADDER[fn])
    t = list(WIDTHS)
    if bucket == "fullbleed":
        t.extend(WIDE_EXTRA)
    return t


def generate(sources):
    made, skipped_up, already = [], [], 0
    for fn, bucket in sorted(sources.items()):
        ok, w, h, _ = meta(fn)
        if not ok:
            continue
        src_ext = os.path.splitext(fn)[1].lower()
        stem = os.path.splitext(fn)[0]
        keep, skip = [], []
        for t in targets_for(fn, bucket):
            (keep if t < w else skip).append(t)
        for t in skip:
            skipped_up.append((fn, t, w))

        need = []
        for t in keep:
            need.append(("%s-%d.webp" % (stem, t), t, "webp"))
            if src_ext in (".jpg", ".jpeg"):
                need.append(("%s-%d.jpg" % (stem, t), t, "jpeg"))
        if src_ext != ".webp":
            need.append((stem + ".webp", w, "webp"))

        im = None
        for name, tw, fmt in need:
            out = os.path.join(IMGDIR, name)
            if os.path.exists(out):
                already += 1
                continue
            if im is None:
                im = Image.open(os.path.join(IMGDIR, fn))
                im.load()
            r = im if tw == w else im.resize(
                (tw, max(1, round(h * tw / w))), Image.LANCZOS)
            if fmt == "webp":
                r.save(out, "WEBP", quality=WEBP_Q, method=6)
            else:
                rr = r.convert("RGB") if r.mode not in ("RGB", "L") else r
                rr.save(out, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
            made.append((name, tw, os.path.getsize(out)))
            _meta.pop(name, None)
        if im is not None:
            im.close()

    print("generate: %d new variants, %d already present, %d upscale steps skipped"
          % (len(made), already, len(set(skipped_up))))
    for n, tw, b in made:
        print("   + %-34s %5dw %8.1f KB" % (n, tw, b / 1024.0))
    for fn, t, w in sorted(set(skipped_up)):
        print("   ~ skip %-28s -%-5d would upscale (source is %dpx wide)" % (fn, t, w))
    return made, skipped_up


# ----------------------------------------------------------------- rewrite
ATTR_ORDER = ["class", "id", "src", "srcset", "sizes", "width", "height",
              "alt", "loading", "decoding", "fetchpriority", "style"]


def build_srcset(fn, bucket, prefix):
    """WebP-only srcset string, or None if fewer than two candidates exist."""
    ok, w, h, _ = meta(fn)
    if not ok:
        return None
    stem, ext = os.path.splitext(fn)
    cands = []
    for t in sorted(targets_for(fn, bucket)):
        if t >= w:
            continue
        v = "%s-%d.webp" % (stem, t)
        if meta(v)[0]:
            cands.append((v, t))
    full = fn if ext.lower() == ".webp" else stem + ".webp"
    if meta(full)[0]:
        cands.append((full, w))
    if len(cands) < 2:
        return None
    return ", ".join("%sassets/img/%s %dw" % (prefix, v, t) for v, t in cands)


def rewrite_tag(tag, html, pos, prefix, is_lcp):
    a, _ = parse_attrs(tag)
    src = a.get("src") or ""
    fn = os.path.basename(src.split("?")[0])
    ok, w, h, _ = meta(fn)
    bucket = classify(html, pos, a)

    if ok:
        a["width"], a["height"] = str(w), str(h)     # always from the real file
        ss = build_srcset(fn, bucket, prefix)
        if ss:
            a["srcset"] = ss
            a["sizes"] = SIZES[bucket]
        else:
            a.pop("srcset", None)
            a.pop("sizes", None)

    if is_lcp:
        a.pop("loading", None)
        a.pop("decoding", None)
        a["fetchpriority"] = "high"
    else:
        a["loading"] = "lazy"
        a["decoding"] = "async"
        a.pop("fetchpriority", None)

    keys = ([k for k in ATTR_ORDER if k in a]
            + [k for k in sorted(a) if k not in ATTR_ORDER])
    parts = []
    for k in keys:
        v = a[k]
        parts.append(k if v is None else '%s="%s"' % (k, v))
    return "<img " + " ".join(parts) + ">", bucket


def rewrite(dry=False):
    changed = tags = 0
    lcp_log = {}
    buckets = collections.Counter()
    pgs = pages()
    for f in pgs:
        rel = os.path.relpath(f, ROOT).replace("\\", "/")
        prefix = "../" if "/" in rel else ""
        s = open(f, encoding="utf-8").read()
        # LCP = the first .hero-img on the page.  Pages with no hero have a
        # text LCP, so every image on them stays lazy.
        hero = None
        for m in TAG.finditer(s):
            a, _ = parse_attrs(m.group(0))
            if "hero-img" in (a.get("class") or ""):
                hero = m.start()
                break
        out, last = [], 0
        for m in TAG.finditer(s):
            tags += 1
            new, bucket = rewrite_tag(m.group(0), s, m.start(), prefix,
                                      is_lcp=(m.start() == hero))
            buckets[bucket] += 1
            if m.start() == hero:
                fn = os.path.basename(
                    (parse_attrs(m.group(0))[0].get("src") or "").split("?")[0])
                lcp_log[rel] = fn
            out.append(s[last:m.start()])
            out.append(new)
            last = m.end()
        out.append(s[last:])
        s2 = "".join(out)
        if s2 != s:
            changed += 1
            if not dry:
                # newline=None -> CRLF on Windows, matching what build.py /
                # build_blog.py / rehash.py already write into this tree.
                with open(f, "w", encoding="utf-8") as fh:
                    fh.write(s2)
    print("rewrite: %d <img> tags across %d pages; %d files changed"
          % (tags, len(pgs), changed))
    print("  buckets: " + ", ".join("%s=%d" % kv for kv in buckets.most_common()))
    return lcp_log


# ------------------------------------------------------------------ verify
def verify():
    missing, refs, noalt, emptyalt = [], set(), [], []
    for f in pages():
        rel = os.path.relpath(f, ROOT).replace("\\", "/")
        base = os.path.dirname(f)
        s = open(f, encoding="utf-8").read()
        for t in TAG.findall(s):
            a, _ = parse_attrs(t)
            if "alt" not in a:
                noalt.append((rel, " ".join(t.split())[:100]))
            elif not (a.get("alt") or "").strip():
                emptyalt.append((rel, " ".join(t.split())[:100]))
            urls = [a.get("src", "")]
            for c in (a.get("srcset") or "").split(","):
                c = c.strip().split(" ")[0]
                if c:
                    urls.append(c)
            for u in urls:
                if not u or u.startswith(("http", "data:")):
                    continue
                p = os.path.normpath(os.path.join(base, u.split("?")[0]))
                refs.add(p)
                if not os.path.exists(p):
                    missing.append((rel, u))
    print("verify: %d distinct image files referenced by src/srcset" % len(refs))
    print("verify: %d broken references" % len(missing))
    for r, u in missing[:40]:
        print("   !! %s -> %s" % (r, u))
    print("verify: %d <img> with no alt attribute, %d with empty alt"
          % (len(noalt), len(emptyalt)))
    for r, t in (noalt + emptyalt)[:20]:
        print("   !! %s %s" % (r, t))
    return missing, noalt


# --------------------------------------------------------------- inventory
def inventory(quiet=False):
    sources = {}
    rows = []
    for f in pages():
        rel = os.path.relpath(f, ROOT).replace("\\", "/")
        s = open(f, encoding="utf-8").read()
        for m in TAG.finditer(s):
            a, _ = parse_attrs(m.group(0))
            src = a.get("src") or ""
            fn = os.path.basename(src.split("?")[0])
            b = classify(s, m.start(), a)
            if fn and sources.get(fn) != "fullbleed":
                sources[fn] = b
            ok, w, h, by = meta(fn)
            rows.append({"page": rel, "file": fn, "bucket": b,
                         "declared": (a.get("width"), a.get("height")),
                         "intrinsic": (w, h), "bytes": by,
                         "srcset": bool(a.get("srcset")),
                         "alt": "alt" in a, "loading": a.get("loading")})
    if not quiet:
        print("inventory: %d pages, %d <img> tags, %d distinct source files"
              % (len(pages()), len(rows), len(sources)))
        print("  with srcset          : %d" % sum(1 for x in rows if x["srcset"]))
        print("  without srcset       : %d" % sum(1 for x in rows if not x["srcset"]))
        print("  missing width/height : %d" % sum(
            1 for x in rows if not x["declared"][0] or not x["declared"][1]))
        print("  missing alt          : %d" % sum(1 for x in rows if not x["alt"]))
        print("  no loading attr      : %d" % sum(1 for x in rows if not x["loading"]))
        bad = [x for x in rows if x["declared"][0] and x["intrinsic"][0]
               and (x["declared"][0], x["declared"][1])
               != (str(x["intrinsic"][0]), str(x["intrinsic"][1]))]
        print("  declared != intrinsic: %d" % len(bad))
        seen = set()
        for x in bad:
            k = (x["file"], x["declared"])
            if k in seen:
                continue
            seen.add(k)
            print("     %-22s %-20s declared %sx%s  intrinsic %sx%s"
                  % (x["page"], x["file"], x["declared"][0], x["declared"][1],
                     x["intrinsic"][0], x["intrinsic"][1]))
        bk = collections.Counter(x["bucket"] for x in rows)
        print("  buckets: " + ", ".join("%s=%d" % kv for kv in bk.most_common()))
    return sources, rows


# ------------------------------------------------------------------ weight
def _desktop_px(sizes):
    """The CSS px this `sizes` resolves to on a 1440px-wide desktop viewport."""
    if sizes == "100vw":
        return 1440
    if sizes == "190px":
        return 190
    if sizes.endswith("380px"):
        return 380
    return 760


def page_weight(rels):
    """HTML bytes + the image bytes a fresh 1x 1440px client would fetch."""
    tot = {}
    for rel in rels:
        f = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.exists(f):
            continue
        s = open(f, encoding="utf-8").read()
        base = os.path.dirname(f)
        n = os.path.getsize(f)
        seen = set()
        for t in TAG.findall(s):
            a, _ = parse_attrs(t)
            pick = a.get("src", "")
            if a.get("srcset"):
                cands = []
                for c in a["srcset"].split(","):
                    p = c.strip().split()
                    if len(p) == 2 and p[1].endswith("w"):
                        cands.append((int(p[1][:-1]), p[0]))
                cands.sort()
                if cands:
                    want = _desktop_px(a.get("sizes", ""))
                    pick = next((u for wd, u in cands if wd >= want), cands[-1][1])
            if not pick or pick.startswith(("http", "data:")):
                continue
            p = os.path.normpath(os.path.join(base, pick.split("?")[0]))
            if p in seen or not os.path.exists(p):
                continue
            seen.add(p)
            n += os.path.getsize(p)
        tot[rel] = n / 1024.0
    return tot


WEIGH = ["index.html", "merc.html", "shop.html", "kitchen.html",
         "blog/fix-caulk-a-bathtub.html"]

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what == "weight":
        for k, v in page_weight(WEIGH).items():
            print("  %-34s %9.1f KB" % (k, v))
        sys.exit(0)
    sources, _ = inventory()
    if what in ("generate", "all"):
        generate(sources)
    if what in ("rewrite", "all"):
        _meta.clear()
        log = rewrite()
        print("\n  LCP image per page (eager, fetchpriority=high, no lazy):")
        for k, v in sorted(log.items()):
            print("     %-26s %s" % (k, v))
        print("     (%d pages have a hero image; the other %d have a text LCP "
              "and keep every image lazy)" % (len(log), len(pages()) - len(log)))
    if what in ("verify", "all"):
        verify()
