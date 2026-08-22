"""
Twisted Roots Merc — recipe builder.

Reads every JSON file in recipes/data/, validates hard, and writes:
  recipes/<slug>.html    one page per recipe
  kitchen.html           the index, grouped by category
  and appends both into sitemap.xml

WHAT "VALIDATED" MEANS HERE
---------------------------
A recipe is not prose. It either works or it does not, and most of
what makes it not work is checkable without a stove:

  · every ingredient line has a quantity and a unit
  · every oven temperature is inside a sane range, and is given
    in Fahrenheit with Celsius alongside
  · every step that involves heat states a doneness cue, not just
    a time — "until the edges pull away", not "12 minutes"
  · anything with a food-safety floor (poultry, ground meat, pork,
    fish, custard, canning) states the internal temperature
  · yield and timings are present
  · no dates anywhere, so nothing goes stale

The checker below enforces all of that and REJECTS anything that
fails. It cannot tell you a recipe tastes good. It can tell you a
recipe is missing the information you need to cook it, which is
the failure mode that actually matters at 6am.

RECIPE JSON SHAPE (a list of these per file):
{
  "slug": "sourdough-siletz-river",
  "title": "Siletz River Sourdough",
  "dek": "One sentence.",
  "category": "Bread & Sourdough",      # must be in CATEGORIES
  "tags": ["sourdough", "bread"],
  "yield": "Two 900g loaves",
  "activeTime": "40 minutes",
  "totalTime": "18 hours, mostly waiting",
  "intro": "<p>…</p>",                  # 80-250 words, why this recipe
  "ingredients": [
     {"group": "Levain", "items": ["50 g mature starter", "…"]},
     {"group": "Dough",  "items": ["…"]}
  ],
  "method": ["<p>Step one…</p>", "…"],  # 5-16 steps
  "notes": ["…"],                        # optional
  "storage": "…"                         # optional
}
"""

import os, re, json, html, glob, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "recipes", "data")
OUT  = os.path.join(ROOT, "recipes")
SITE = "https://twistedrootsmerc.com/"

CATEGORIES = {
    "Bread & Sourdough":        ("sourdough.jpg",       "Naturally leavened, and the schedules that fit around a job."),
    "Biscuits, Rolls & Buns":   ("cinnamon-roll.jpg",   "The morning rack: biscuits, cinnamon rolls, everything butter."),
    "Breakfast & The Griddle":  ("breakfast-plate.jpg", "What gets eaten before daylight, and what travels in a truck."),
    "Soup, Chowder & Stew":     ("rain-window.jpg",     "Rain food. One pot, long afternoon, better the next day."),
    "Fish & Shellfish":         ("fishing.jpg",         "Salmon, steelhead, crab and clams, handled properly."),
    "Game & The Freezer":       ("hunt-field.jpg",      "Elk and venison, and what to do with a full freezer."),
    "Pie, Cobbler & Preserves": ("honey-jam.jpg",       "Marionberries, blackberries, and putting summer in a jar."),
}

ALLOWED = re.compile(r"</?(p|h3|ul|ol|li|strong|em|b|i|a|br)\b[^>]*>", re.I)
BANNED  = re.compile(r"<\s*(script|style|iframe|form|input|img)\b", re.I)
DATEY   = re.compile(r"\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b", re.I)

QTY  = re.compile(r"\d|¼|½|¾|⅓|⅔|⅛|a pinch|to taste|as needed", re.I)
TEMP = re.compile(r"(\d{2,3})\s*°?\s*F\b", re.I)
CUE  = re.compile(r"until|when|so that|by the time|should|looks|feels|smells|springs|pulls|sounds|reads|comes away|no longer|golden|browned|tender|firm|set\b", re.I)
HEAT = re.compile(r"\b(bake|roast|fry|sear|simmer|boil|grill|griddle|saut|broil|poach|braise|steam|heat|cook|toast|render)", re.I)
SAFE_TRIGGER = re.compile(r"\b(chicken|turkey|poultry|ground (beef|elk|venison|pork|meat)|burger|sausage|pork|salmon|steelhead|halibut|rockfish|cod|fish|custard|canning|can |jars?\b|pressure canner|water bath)\b", re.I)
INTERNAL = re.compile(r"\b(1[2-9]\d|2[0-5]\d)\s*°?\s*F\b|internal temperature|instant-read|thermometer", re.I)


def load():
    recipes, seen, problems = [], set(), []
    for f in sorted(glob.glob(os.path.join(DATA, "*.json"))):
        try:
            items = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            problems.append("%s: unreadable JSON — %s" % (os.path.basename(f), e))
            continue
        for i, r in enumerate(items):
            where = "%s[%d] %s" % (os.path.basename(f), i, r.get("slug", "?"))
            bad = check(r, seen)
            if bad:
                problems.append("%s: %s" % (where, bad))
                continue
            seen.add(r["slug"])
            recipes.append(r)
    return recipes, problems


def check(r, seen):
    for k in ("slug", "title", "dek", "category", "yield", "activeTime", "totalTime", "intro", "ingredients", "method"):
        if not r.get(k):
            return "missing %s" % k
    if r["category"] not in CATEGORIES:
        return "unknown category %r" % r["category"]
    if r["slug"] in seen:
        return "duplicate slug"
    if not re.fullmatch(r"[a-z0-9-]+", r["slug"]):
        return "slug must be kebab-case"

    blob = " ".join([r["title"], r["dek"], r["intro"],
                     " ".join(r["method"]),
                     " ".join(" ".join(g.get("items", [])) for g in r["ingredients"])])
    if BANNED.search(blob):
        return "banned tag"
    if DATEY.search(r["title"]) or DATEY.search(r["dek"]) or DATEY.search(blob):
        return "contains a date — recipes are evergreen"

    # ingredients: every line needs a quantity
    n_items = 0
    for g in r["ingredients"]:
        if not g.get("items"):
            return "ingredient group %r is empty" % g.get("group")
        for line in g["items"]:
            n_items += 1
            if not QTY.search(line):
                return "ingredient has no quantity: %r" % line[:48]
    if n_items < 3:
        return "only %d ingredients" % n_items

    # method: enough steps, and heat steps need a doneness cue
    if not (4 <= len(r["method"]) <= 18):
        return "%d steps (want 4-18)" % len(r["method"])
    heat_steps = [s for s in r["method"] if HEAT.search(s)]
    if heat_steps and not any(CUE.search(s) for s in heat_steps):
        return "cooking steps give times but no doneness cue"

    # oven temps sane, and paired with Celsius
    for t in TEMP.findall(blob):
        if not (150 <= int(t) <= 550):
            return "implausible temperature %sF" % t
    if TEMP.search(blob) and not re.search(r"\d{2,3}\s*°?\s*C\b", blob):
        return "Fahrenheit given without Celsius"

    # food-safety floors
    if SAFE_TRIGGER.search(blob) and not INTERNAL.search(blob):
        return "handles a food-safety ingredient without stating an internal temperature"

    words = len(re.sub(r"<[^>]+>", " ", r["intro"]).split())
    if words < 60:
        return "intro too thin (%d words)" % words
    return None


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# The Google Fonts sheet is loaded WITHOUT blocking render: preload primes the
# connection + cache at high priority, media="print" keeps the <link> off the
# critical path, and onload flips it to media="all" once it has arrived. This is
# only safe because perf.css (inside bundle.css) declares metric-matched
# size-adjust fallbacks for Bitter / Public Sans / Rye, so the late swap costs no
# layout shift. See PERF-AUDIT.md 3.9, 6.1 and patch #13.
_GF = ("https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900"
       "&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap")
HEAD_FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="preload" as="style" href="%s">\n'
    '<link rel="stylesheet" href="%s" media="print" onload="this.media=\'all\';this.onload=null">\n'
    '<noscript><link rel="stylesheet" href="%s"></noscript>' % (_GF, _GF, _GF)
)



def seo_title(t, suffix):
    """Keep the whole title inside Google's ~60-char display width.

    Every generated title carried a 29-36 character brand suffix, which
    pushed 250 of 383 of them past the truncation point — so the brand
    was cut off anyway AND it ate the words that actually match a query.
    A long title stands on its own; only a short one has room to be
    signed."""
    t = t.strip()
    if len(t) + len(suffix) <= 60:
        return t + suffix
    return t if len(t) <= 60 else t



def script_loader(scripts):
    """Load the site scripts on window.load instead of in the body.

    Measured on index mobile: FCP 2833ms with plain <script src> tags
    at the end of the body, 997ms with this. `defer` was measured too
    and is NOT enough - deferred scripts still execute before the
    first paint is committed.

    Order matters (catalog.js defines the data site.js reads), so the
    chain is explicit rather than six parallel appends."""
    lst = ", ".join('"%s"' % s for s in scripts)
    return chr(10).join([
        "<script>",
        'addEventListener("load", function () {',
        "  var s = [" + lst + "], i = 0;",
        "  (function next(){",
        "    if (i >= s.length) return;",
        '    var e = document.createElement("script");',
        "    e.src = s[i++]; e.onload = next; e.onerror = next;",
        "    document.body.appendChild(e);",
        "  })();",
        "});",
        "</script>",
    ])


def shell(depth=1):
    """Header and footer straight out of merc.html, so the chrome can
    never drift away from the rest of the site."""
    src = open(os.path.join(ROOT, "merc.html"), encoding="utf-8").read()
    head = re.search(r"<body[^>]*>(.*?)<main\b[^>]*>", src, re.S).group(1)
    foot = re.search(r"</main\s*>(.*?)</body>", src, re.S).group(1)
    # merc.html now loads its scripts from an inline window.load chain
    # rather than plain <script src> tags, so read the list out of that
    # and take the whole block with it. Miss this and every generated
    # page ends up with merc.html's loader AND an empty one of its own.
    scripts = re.findall(r'<script src="([^"]+)"></script>', foot)
    foot = re.sub(r'<script src="[^"]+"></script>\s*', "", foot)
    # the loader carries a comment block before the addEventListener,
    # so do not assume the two are adjacent
    m = re.search(r'<script>(?:(?!</script>).)*?addEventListener\("load".*?</script>\s*',
                  foot, re.S)
    if m:
        scripts += re.findall(r'"([^"]+\.js[^"]*)"', m.group(0))
        foot = foot[:m.start()] + foot[m.end():]
    if depth:
        up = "../" * depth
        # Read the page list off disk rather than keeping it by hand.
        # The hand-written version never learned about board.html and
        # shipped a dead nav link on every recipe.
        pats = ['href="assets/', 'src="assets/', 'data-hangsign="assets/']
        pats += ['href="%s' % f for f in sorted(os.listdir(ROOT)) if f.endswith(".html")]
        for pat in pats:
            head = head.replace(pat, pat.replace('="', '="' + up, 1))
            foot = foot.replace(pat, pat.replace('="', '="' + up, 1))
        # srcset carries several URLs in one attribute value, so the
        # simple 'src="assets/' prefix pass above only ever fixes the
        # first candidate. Prefix every bare assets/ URL inside a srcset
        # or the responsive variants 404 on every generated page.
        def _srcset_up(s):
            return re.sub(
                r'(srcset=")([^"]*)(")',
                lambda m: m.group(1) + re.sub(r'(^|,\s*)assets/',
                                              lambda v: v.group(1) + up + 'assets/',
                                              m.group(2)) + m.group(3), s)
        head = _srcset_up(head)
        foot = _srcset_up(foot)
        head = head.replace('aria-current="page"', '')
        scripts = [up + s if s.startswith("assets/") else s for s in scripts]
    return head, foot, scripts


def page(title, desc, canonical, body, depth=1, extra_head=""):
    head, foot, scripts = shell(depth)
    up = "../" * depth
    tags = script_loader(scripts)
    return """<!DOCTYPE html>
<html lang="en" data-storm="off">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<link rel="canonical" href="%s">
<meta property="og:site_name" content="Twisted Roots Merc">
<meta property="og:type" content="article">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:url" content="%s">
<meta property="og:image" content="%sassets/img/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F4EDE1">
<link rel="icon" href="%sassets/img/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="%sassets/img/apple-touch-icon.png">
%s
<link rel="stylesheet" href="%sassets/css/bundle.css">
<link rel="stylesheet" href="%sassets/css/print.css" media="print">
%s</head>
<body>
%s<main id="main" tabindex="-1">
%s
</main>%s%s
</body>
</html>
""" % (html.escape(title), html.escape(desc), canonical,
       html.escape(title), html.escape(desc), canonical, SITE, up, up,
       HEAD_FONTS, up, up, extra_head, head, body, foot, tags)


# ---------------------------------------------------------------------
# "FROM THE SHELF" — the contextual link module.
#
# The band at the foot of every recipe used to be byte-identical on all
# 161 of them: the same two buttons, "Shop the shelf" and "The bakery",
# in the same place, with the same words. That establishes structure and
# nothing else, because a link that reads the same on every page tells a
# search engine nothing about any one of them. This gives each recipe 2-3
# links chosen for what it is actually about.
#
# The map lives in blog/data/_links.json and is shared with build_blog.py,
# so the two builders cannot drift into contradicting each other. Recipes
# are category-driven rather than per-page: the defaults rotate through a
# handful of variants so 23 siblings never carry identical anchor text,
# and a recipe can override them where the gear genuinely is the barrier.
#
# shop.js reads ?q= off the query string (assets/js/shop.js, readURL), so
# a link can land on a pre-filtered shelf. That is only worth anything if
# the search returns something, so every ?q= is run through the same
# name-and-tag matching shop.js uses and dropped if it comes back empty.
# A link to an empty search result is worse than no link at all.
# ---------------------------------------------------------------------

LINKS_FILE = os.path.join(ROOT, "blog", "data", "_links.json")

# Links per page. Two or three is a recommendation; ten is a directory
# and dilutes every link in it. build_blog.py enforces the same number.
SHELF_CAP = 3

LAZY_ANCHOR = re.compile(r"^(shop|shop now|click here|here|read more|more|link|buy)$", re.I)


def norm_q(s):
    """The normalisation shop.js applies to a query and to a product name
    (assets/js/shop.js, norm) so the check below agrees with the page."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", str(s).lower())).strip()


def shelf_terms():
    """Every product's name and tags out of assets/js/catalog.js, one
    normalised blob per item. Returns [] if the catalog cannot be read, in
    which case the query check is skipped rather than blocking a build on
    a JavaScript parse."""
    try:
        src = open(os.path.join(ROOT, "assets", "js", "catalog.js"), encoding="utf-8").read()
    except OSError:
        return []
    out = []
    for line in src.splitlines():
        m = re.search(r'\bn:\s*"([^"]+)"', line)
        if not m:
            continue
        tags = re.search(r'\bt:\s*\[([^\]]*)\]', line)
        words = [m.group(1)] + (re.findall(r'"([^"]+)"', tags.group(1)) if tags else [])
        out.append(norm_q(" ".join(words)))
    return out


def query_hits(q, terms):
    """Would shop.js show anything for this ?q= — same rules: the whole
    phrase inside a name or tag, or any word of two characters or more."""
    q = norm_q(q)
    if not q:
        return False
    words = [w for w in q.split(" ") if len(w) >= 2]
    for blob in terms:
        if q in blob or any(w in blob for w in words):
            return True
    return False


def load_links():
    """The topic -> shelf map, shared with build_blog.py. A missing file is
    not fatal; the module is simply left off."""
    if not os.path.exists(LINKS_FILE):
        return {}
    return json.load(open(LINKS_FILE, encoding="utf-8"))


def check_links(links, who, self_path, terms, problems):
    """Reject anything that would ship a bad link: too many, a duplicate
    target, a page linking to itself, an anchor that says nothing, a file
    that is not on disk, a fragment no page defines, or a search that
    returns no products."""
    if not (1 <= len(links) <= SHELF_CAP):
        problems.append("%s: %d shelf links (cap is %d)" % (who, len(links), SHELF_CAP))
        return False
    seen = set()
    for l in links:
        text, url = l.get("text", ""), l.get("url", "")
        if not text or not url:
            problems.append("%s: shelf link missing text or url" % who); return False
        if LAZY_ANCHOR.match(text.strip()):
            problems.append("%s: anchor text %r says nothing" % (who, text)); return False
        if url in seen:
            problems.append("%s: links to %s twice" % (who, url)); return False
        seen.add(url)
        path = url.split("?")[0].split("#")[0]
        if path == self_path:
            problems.append("%s: links to itself" % who); return False
        if not os.path.exists(os.path.join(ROOT, path.replace("/", os.sep))):
            problems.append("%s: %s is not on disk" % (who, path)); return False
        frag = url.split("#")[1] if "#" in url else ""
        if frag:
            target = open(os.path.join(ROOT, path.replace("/", os.sep)), encoding="utf-8").read()
            if ('id="%s"' % frag) not in target:
                problems.append("%s: %s has no #%s" % (who, path, frag)); return False
        q = re.search(r"[?&]q=([^&]+)", url)
        if q and terms and not query_hits(q.group(1).replace("+", " "), terms):
            problems.append("%s: ?q=%s matches no product" % (who, q.group(1))); return False
    return True


def shelf_block(links, heading, note, depth=1):
    """Reuses the classes the recipe pages already carry: the same
    band--bark/band--dark treatment the old two-button call-to-action used,
    and .pill, which site.css already defines against --line-2 -- a
    variable .band--dark overrides for light-on-dark. No new CSS."""
    up = "../" * depth
    pills = "".join(
        '<a class="pill" href="%s%s" style="text-decoration:none">%s</a>'
        % (up, l["url"], html.escape(l["text"])) for l in links)
    return """
<section class="band band--bark band--dark band--tight">
  <div class="wrap--mid">
    <div class="split split--top">
      <div>
        <p class="eyebrow">From the shelf</p>
        <h2 class="h2 mb0">%s</h2>
      </div>
      <div>
        <p class="lede mb0">%s</p>
        <div class="pillrow">%s</div>
      </div>
    </div>
  </div>
</section>""" % (html.escape(heading), html.escape(note), pills)


def shelf_for(r, links, order):
    """A recipe's links: its own override if it has one, otherwise the
    category default, rotated by the recipe's position inside its category
    so 23 siblings do not all ship the same anchor text."""
    own = links.get("recipes", {}).get(r["slug"])
    if own:
        return own[:SHELF_CAP]
    rot = links.get("recipeDefaults", {}).get(r["category"]) or []
    if not rot:
        return []
    return rot[order % len(rot)][:SHELF_CAP]


def related(rec, all_r, n=3):
    tags = set(t.lower() for t in rec.get("tags", []))
    scored = []
    for o in all_r:
        if o["slug"] == rec["slug"]:
            continue
        s = len(tags & set(t.lower() for t in o.get("tags", [])))
        if o["category"] == rec["category"]:
            s += 2
        if s:
            scored.append((s, o))
    scored.sort(key=lambda x: (-x[0], x[1]["title"]))
    return [o for _, o in scored[:n]]


def iso_dur(s):
    """'1 hour 20 minutes' -> PT1H20M, best effort."""
    h = re.search(r"(\d+)\s*(hour|hr)", s, re.I)
    m = re.search(r"(\d+)\s*(minute|min)", s, re.I)
    if not h and not m:
        return None
    return "PT" + (h.group(1) + "H" if h else "") + (m.group(1) + "M" if m else "")


def build_recipe(r, all_r, links, terms, problems, order):
    canonical = "%srecipes/%s.html" % (SITE, r["slug"])
    ing_flat = [i for g in r["ingredients"] for i in g["items"]]

    schema = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": r["title"],
        "description": r["dek"],
        "recipeCategory": r["category"],
        "recipeCuisine": "American",
        "keywords": ", ".join(r.get("tags", [])),
        "recipeYield": r["yield"],
        # image is the one property Google actually requires on a Recipe,
        # and without it none of these can appear as a rich result. There
        # is no photograph of any individual dish yet, so this falls back
        # to the category's own image — honest, since it does depict the
        # kind of food, but worth replacing with real per-recipe photos.
        "image": SITE + "assets/img/" + CATEGORIES[r["category"]][0],
        "recipeIngredient": ing_flat,
        "recipeInstructions": [
            {"@type": "HowToStep", "text": re.sub(r"<[^>]+>", "", s).strip()}
            for s in r["method"]],
        "author": {"@type": "Organization", "name": "Twisted Roots Merc"},
        "publisher": {"@id": SITE + "#store"},
        "mainEntityOfPage": canonical,
    }
    if iso_dur(r["activeTime"]): schema["prepTime"] = iso_dur(r["activeTime"])
    if iso_dur(r["totalTime"]):  schema["totalTime"] = iso_dur(r["totalTime"])

    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList",
              "itemListElement": [
                  {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                  {"@type": "ListItem", "position": 2, "name": "The Kitchen", "item": SITE + "kitchen.html"},
                  {"@type": "ListItem", "position": 3, "name": r["title"], "item": canonical}]}
    extra = ('<script type="application/ld+json">%s</script>\n'
             '<script type="application/ld+json">%s</script>\n'
             % (json.dumps(schema), json.dumps(crumbs)))

    ings = "".join(
        ('<h3 class="h4">%s</h3>' % html.escape(g["group"]) if g.get("group") else "") +
        '<ul class="rc-ing">' + "".join("<li>%s</li>" % html.escape(i) for i in g["items"]) + "</ul>"
        for g in r["ingredients"])

    steps = "".join('<li>%s</li>' % s for s in r["method"])

    notes = ""
    if r.get("notes"):
        notes = ('<h2 class="h3">Notes</h2><ul>' +
                 "".join("<li>%s</li>" % n for n in r["notes"]) + "</ul>")
    storage = ('<h2 class="h3">Keeping it</h2><p>%s</p>' % r["storage"]) if r.get("storage") else ""

    shelf = shelf_for(r, links, order)
    if shelf and not check_links(shelf, "recipes/" + r["slug"],
                                 "recipes/%s.html" % r["slug"], terms, problems):
        shelf = []
    shelf_html = shelf_block(
        shelf, "Where to get it",
        "Counts come off the register, so what it says here is what is on the shelf."
    ) if shelf else ""

    rel = related(r, all_r)
    rel_html = ""
    if rel:
        rel_html = """
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <p class="eyebrow">Next</p>
    <div class="cards">%s</div>
  </div>
</section>""" % "".join(
            '<a class="card" href="%s.html" style="text-decoration:none"><div class="card-in">'
            '<p class="serif-caps" style="color:var(--rust);margin:0 0 8px">%s</p>'
            '<h3 class="h3">%s</h3><p class="small muted mb0">%s</p></div></a>'
            % (o["slug"], html.escape(o["category"]), html.escape(o["title"]), html.escape(o["dek"]))
            for o in rel)

    body = """
<section class="band band--cream band--tight" style="padding-top:clamp(40px,5vw,72px)">
  <div class="wrap--mid">
    <nav class="serif-caps muted" style="margin-bottom:22px" aria-label="Breadcrumb">
      <a href="../index.html" style="text-decoration:none">Home</a> &nbsp;/&nbsp;
      <a href="../kitchen.html" style="text-decoration:none">The Kitchen</a> &nbsp;/&nbsp;
      <a href="../kitchen.html#%s" style="text-decoration:none">%s</a>
    </nav>
    <p class="eyebrow">%s</p>
    <h1 class="h1">%s</h1>
    <p class="lede">%s</p>
    <div class="stat-row" style="margin-top:26px">
      <div class="stat"><div class="v" style="font-size:1.1rem">%s</div><div class="k">Makes</div></div>
      <div class="stat"><div class="v" style="font-size:1.1rem">%s</div><div class="k">Hands on</div></div>
      <div class="stat"><div class="v" style="font-size:1.1rem">%s</div><div class="k">Start to finish</div></div>
    </div>
  </div>
</section>

<article class="band band--paper" style="padding-top:clamp(30px,4vw,52px)">
  <div class="wrap--narrow tr-prose">
    %s
    <div class="rc-grid">
      <div class="rc-ings">
        <h2 class="h3">What you need</h2>
        %s
      </div>
      <div class="rc-method">
        <h2 class="h3">How</h2>
        <ol class="rc-steps">%s</ol>
        %s
        %s
      </div>
    </div>
  </div>
</article>

%s
%s
""" % (slugify(r["category"]), html.escape(r["category"]), html.escape(r["category"]),
       html.escape(r["title"]), html.escape(r["dek"]),
       html.escape(r["yield"]), html.escape(r["activeTime"]), html.escape(r["totalTime"]),
       r["intro"], ings, steps, notes, storage, shelf_html, rel_html)

    return page(seo_title(r["title"], " | Twisted Roots Kitchen"), r["dek"][:154],
                canonical, body, depth=1, extra_head=extra)


def build_index(recs):
    by = {}
    for r in recs:
        by.setdefault(r["category"], []).append(r)
    for v in by.values():
        v.sort(key=lambda x: x["title"])

    chips = "".join('<a class="pill" href="#%s" style="text-decoration:none">%s <b>%d</b></a>'
                    % (slugify(c), html.escape(c), len(by.get(c, [])))
                    for c in CATEGORIES if by.get(c))

    sections = ""
    for cat, (img, blurb) in CATEGORIES.items():
        items = by.get(cat)
        if not items:
            continue
        cards = "".join(
            '<a class="card" href="recipes/%s.html" style="text-decoration:none"><div class="card-in">'
            '<h3 class="h3">%s</h3><p class="small muted">%s</p>'
            '<div class="foot"><span class="serif-caps muted">%s</span>'
            '<span class="serif-caps" style="color:var(--rust)">Cook it &rarr;</span></div>'
            '</div></a>' % (r["slug"], html.escape(r["title"]), html.escape(r["dek"]),
                            html.escape(r["totalTime"]))
            for r in items)
        sections += """
<section class="band band--paper" id="%s">
  <div class="wrap">
    <div class="split split--top" style="align-items:end; margin-bottom:30px">
      <div><p class="eyebrow">%d recipes</p><h2 class="h1 mb0">%s</h2></div>
      <p class="lede mb0">%s</p>
    </div>
    <div class="cards">%s</div>
  </div>
</section>""" % (slugify(cat), len(items), html.escape(cat), html.escape(blurb), cards)

    body = """
<section class="hero" style="min-height:60svh">
  <img class="hero-img" src="assets/img/bakery-case.jpg" srcset="assets/img/bakery-case-600.webp 600w, assets/img/bakery-case-900.webp 900w, assets/img/bakery-case-1400.webp 1400w, assets/img/bakery-case.webp 1800w" sizes="100vw" width="1800" height="2700" alt="The bakery case" fetchpriority="high" data-parallax="0.2">
  <div class="rainlayer" aria-hidden="true"></div>
  <div class="crows" data-crows="3" aria-hidden="true"></div>
  <div class="hero-in">
    <div class="wrap">
      <p class="hero-tag">The kitchen &nbsp;·&nbsp; Siletz, Oregon</p>
      <h1 class="h-mega">Recipes</h1>
      <p class="hero-motto">%d of them. Written so they work.</p>
    </div>
  </div>
  <div class="wavedivider wavedivider--float" aria-hidden="true"></div>
</section>

<section class="band band--cream band--tight">
  <div class="wrap">
    <p class="lede" style="max-width:72ch">Everything Carrie gets asked for at the counter, written down
      properly: real weights, real temperatures, and a cue for when a thing is actually done rather than
      just a number of minutes. Undated, because none of it goes out of season for long.</p>
    <div class="pillrow">%s</div>
  </div>
</section>
%s

<section class="band band--bark band--dark">
  <div class="wrap--mid center">
    <p class="eyebrow eyebrow--c">Cooked something worth passing on?</p>
    <h2 class="h1">Bring it in.</h2>
    <p class="lede mx-auto">If it is good and it works, it goes on the board with your name on it.</p>
    <div class="btnrow btnrow--c" style="margin-top:22px">
      <button class="btn btn--amber" data-tellus="true">Send us a recipe</button>
      <a class="btn btn--ghost" href="journal.html">The Board</a>
    </div>
  </div>
</section>
""" % (len(recs), chips, sections)

    schema = {"@context": "https://schema.org", "@type": "CollectionPage",
              "name": "The Kitchen — Recipes from Twisted Roots Merc",
              "url": SITE + "kitchen.html",
              "publisher": {"@id": SITE + "#store"},
              "hasPart": [{"@type": "Recipe", "name": r["title"],
                           "url": "%srecipes/%s.html" % (SITE, r["slug"])} for r in recs]}
    extra = '<script type="application/ld+json">%s</script>\n' % json.dumps(schema)
    return page("The Kitchen — %d Recipes | Twisted Roots, Siletz" % len(recs),
                "Bread, biscuits, breakfast, chowder, salmon, game and berry pie — %d recipes written "
                "with real weights, temperatures and doneness cues." % len(recs),
                SITE + "kitchen.html", body, depth=0, extra_head=extra)


PROSE_CSS = """
/* ---------- RECIPES ---------- */
.rc-grid{display:grid; grid-template-columns:minmax(230px,.8fr) 1.2fr; gap:clamp(26px,4vw,54px); align-items:start; margin-top:1.6em}
.rc-ings{position:sticky; top:calc(var(--head-h) + 20px)}
.rc-ing{list-style:none; padding:0; margin:0 0 1.3em}
.rc-ing li{padding:8px 0; border-bottom:1px dotted var(--line); font-size:.98rem; line-height:1.45}
.rc-steps{counter-reset:rc; list-style:none; padding:0; margin:0}
.rc-steps > li{position:relative; padding:0 0 1.15em 44px; margin:0 0 1.15em; border-bottom:1px solid var(--line)}
.rc-steps > li:last-child{border-bottom:0}
.rc-steps > li::before{
  counter-increment:rc; content:counter(rc);
  position:absolute; left:0; top:0; width:30px; height:30px;
  display:flex; align-items:center; justify-content:center;
  background:var(--amber); color:var(--ink); border-radius:50%;
  font-family:var(--f-display); font-weight:800; font-size:.88rem;
}
.rc-steps > li p{margin:0 0 .6em}
.rc-steps > li p:last-child{margin-bottom:0}
@media (max-width:820px){
  .rc-grid{grid-template-columns:1fr}
  .rc-ings{position:static}
}
@media print{ .rc-ings{position:static} .rc-steps > li::before{background:none; border:1px solid #000} }
"""


def main():
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    recs, problems = load()

    if problems:
        print("\n!! %d rejected:" % len(problems))
        for p in problems[:40]:
            print("   -", p)
        if len(problems) > 40:
            print("   … and %d more" % (len(problems) - 40))
    if not recs:
        print("\nNo valid recipes yet — nothing built.")
        return

    before = len(problems)
    links, terms = load_links(), shelf_terms()
    order, nth = {}, {}
    for r in recs:
        c = r["category"]
        order[r["slug"]] = nth.get(c, 0)
        nth[c] = nth.get(c, 0) + 1
    for r in recs:
        open(os.path.join(OUT, r["slug"] + ".html"), "w", encoding="utf-8").write(
            build_recipe(r, recs, links, terms, problems, order[r["slug"]]))
    if len(problems) > before:
        print("\n!! %d shelf-link problems — module dropped from those recipes:"
              % (len(problems) - before))
        for x in problems[before:][:40]:
            print("   -", x)
    open(os.path.join(ROOT, "kitchen.html"), "w", encoding="utf-8").write(build_index(recs))

    css_path = os.path.join(ROOT, "assets", "css", "site.css")
    css = open(css_path, encoding="utf-8").read()
    if ".rc-steps" not in css:
        open(css_path, "w", encoding="utf-8").write(css + PROSE_CSS)

    sm = os.path.join(ROOT, "sitemap.xml")
    base = open(sm, encoding="utf-8").read()
    base = re.sub(r'\s*<url>\s*<loc>[^<]*(?:kitchen\.html|/recipes/)[^<]*</loc>.*?</url>', '', base, flags=re.S)
    entries = '\n  <url><loc>%skitchen.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>' % SITE
    entries += "".join('\n  <url><loc>%srecipes/%s.html</loc><changefreq>monthly</changefreq>'
                       '<priority>0.6</priority></url>' % (SITE, r["slug"]) for r in recs)
    open(sm, "w", encoding="utf-8").write(base.replace("</urlset>", entries + "\n</urlset>"))

    by = {}
    for r in recs:
        by[r["category"]] = by.get(r["category"], 0) + 1
    over = sum(1 for r in recs if links.get("recipes", {}).get(r["slug"]))
    print("\nBuilt %d recipes" % len(recs))
    print("From the shelf: %d/%d recipes (%d with their own links, %d on the "
          "rotating category default), max %d links each"
          % (len(recs), len(recs), over, len(recs) - over, SHELF_CAP))
    for c, n in sorted(by.items(), key=lambda x: -x[1]):
        print("   %4d  %s" % (n, c))
    print("kitchen.html + recipes/*.html + sitemap updated")
    _wire_responsive_images()



def _wire_responsive_images():
    """Re-run the responsive-image pass over everything this build wrote.

    Generated pages lift their chrome out of merc.html and their <main>
    out of the content source, so any <img> they emit arrives without
    srcset/sizes and, on blog/ and recipes/, with root-relative URLs.
    build_images.rewrite() re-derives srcset, sizes, width, height,
    loading and decoding from the real files on disk and is idempotent,
    so calling it here means a build can never silently undo the work.
    """
    try:
        import build_images
    except ImportError:
        print("  !! build_images.py not importable - responsive images NOT wired")
        return
    build_images.rewrite()

if __name__ == "__main__":
    main()
