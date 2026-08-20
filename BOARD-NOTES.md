# The Board — build notes

`board.html` is the store's notice board and journal. It is the page that earns the local
searches nothing else on the site is aimed at: *siletz storm*, *siletz road closure*,
*what's running siletz river*, *siletz oregon store*. It is also the page a neighbour is
meant to check when they are not shopping.

Files that belong to this page:

| File | What it is |
|---|---|
| `_parts/board.html` | the `<main>` content — the only file you edit to write a post |
| `_parts/board-pages.json` | one-entry pages file (title, description, head block) |
| `board.html` | the built page, produced from the two above |
| `BOARD-NOTES.md` | this file |

Nothing else was touched. `_parts/pages.json`, `build.py`, `merc.html`, `site.css`,
`site.js` and every other page are exactly as they were.

---

## What's on the page

Three short **notices** at the top (the bookmark bait — hours, roads, power), then ten
posts newest first. Every post is written the way Carrie or Eric would say it at the
counter: no exclamation points, no marketing, specific numbers where there are numbers.

| Date | Category | Title |
|---|---|---|
| Aug 17 | Notice | Kitchen closed Wednesday morning, store open |
| Aug 16 | Notice | 229 north is one lane at the slide above Ojalla |
| Aug 10 | Notice | Power out Aug 9, 6:40pm to a little after eleven |
| Aug 12, 2026 | Storms & power | Two weeks ready, minus the parts that don't apply out here |
| Aug 6, 2026 | Around town | The last week of August, which is mostly poster board |
| Jul 28, 2026 | The river | What's running in the Siletz, roughly by month |
| Jul 15, 2026 | You asked | You asked, we got it — the summer round-up |
| Jul 2, 2026 | Fix It | Setting a post that's still standing in ten years |
| Jun 18, 2026 | The Yard | Buy your firewood now, in June, when it's warm and nobody wants it |
| Jun 4, 2026 | Local makers | The local shelf is three people, and that's on purpose |
| May 19, 2026 | Bakery | Why the rack is empty by nine, and how to get around it |
| Apr 8, 2026 | Winter driving | What lives in the truck from November on |
| Mar 24, 2026 | Roads | The road to town, honestly |

The category row under the notices is `.pillrow` / `.pill` markup, static, no JS. The pills
are plain anchors that jump to the matching `id` further down. They deliberately do **not**
filter, and the line under them says so.

---

## Placeholder / needs a real answer before this goes live

These are the only things on the page that were invented rather than known. Everything else
is either general Oregon Coast fact or store voice.

1. **The three notices are examples.** Dates, the slide location ("above Ojalla"), the hood
   cleaning and the Aug 9 outage times are all made up to show the shape. Replace with real
   ones before publishing, or delete the two you don't need.
2. **No phone number for Central Lincoln PUD.** The storm post and the notices reference the
   outage line and TripCheck by name but give no number or URL on purpose — a wrong outage
   number is worse than none. Add the real PUD outage number and a link to
   `tripcheck.com` when someone confirms them.
3. **The "you asked" round-up** uses plausible items and ask-counts. Swap in whatever is
   actually on the request pad. The two declines (produce, lottery) are the most linkable
   part of that post, so keep a couple of honest nos in there.
4. **River dates are a starting point, not regulations.** The post says so in its own first
   paragraph. Eric should read the table before it ships, and the ODFW rules change yearly.
5. **`Aug 17` in the "Last written on" strip** is hardcoded. Bump it when you add a post.
6. **No nav link.** The header nav lives in `merc.html`, which this task did not own, so
   The Board is not in the top nav or the footer yet. To add it, put
   `<a href="board.html">The Board</a>` in the `<nav class="nav">` block of `merc.html`
   and rebuild every page. Until then the page is reachable only by URL and from search.
7. **Not in `sitemap.xml`** for the same reason. Add
   `<url><loc>https://twistedrootsmerc.com/board.html</loc></url>` when the page ships.

---

## How to add a new post

1. Open `_parts/board.html`.
2. Copy one of the existing post `<section>` blocks — there are two shapes:

   **With a photo** (used by the storm, river, Fix It, makers, bakery, winter driving and
   roads posts):

   ```html
   <section class="band band--cream" id="your-id">
     <div class="wrap">
       <div class="split split--top">
         <figure class="figframe" style="margin:0">
           <img src="assets/img/something.jpg" alt="…" loading="lazy">
           <figcaption>A dry one-liner</figcaption>
         </figure>
         <div style="max-width:60ch">
           <p class="eyebrow">Month D, YYYY · Category</p>
           <h2 class="h2">Title</h2>
           <p>…</p>
         </div>
       </div>
     </div>
   </section>
   ```

   Add `split--rev` next to `split--top` to put the photo on the right instead.

   **Text only** (the school-supply and firewood posts):

   ```html
   <section class="band band--paper" id="your-id">
     <div class="wrap--mid">
       <p class="eyebrow">Month D, YYYY · Category</p>
       <h2 class="h2">Title</h2>
       <div style="max-width:60ch">
         <p>…</p>
       </div>
     </div>
   </section>
   ```

3. Paste it **directly under the category pillrow section** — the page runs newest first.
4. Alternate the band colour so two of the same don't touch. The rotation in use is
   `band--bark band--dark`, `band--paper`, `band--cream`, `band--paper`,
   `band--pine band--dark`, `band--sand`, `band--paper`, `band--cream`,
   `band--teal band--dark`, `band--paper`.
5. Add a pill for it: `<a class="pill" href="#your-id">Category</a>`.
6. Bump the `Last written on` value in the `.drive` strip near the top.
7. Rebuild (below).

**Rules that keep it looking right:** invent no CSS classes and add no `<style>` block —
everything here is existing `site.css`. Keep the `max-width:60ch` on prose containers; that
is what holds lines at roughly 65–75 characters. Posts run 150–400 words. Use only images
that exist in `assets/img/` — several of the stock files in there are wrong for this site
(`chalkboard.jpg` is a Russian menu board, `concrete-bags.jpg` is a plastic bag on black,
`truck.jpg` is a Ford Ranger in Mexico), so look at a file before you use it.

**Notices** go in the `#notices` `.menu-list` at the top, newest first, in this shape:

```html
<div class="menu-item">
  <span class="nm">What changed</span>
  <span class="dots"></span>
  <span class="pr">Aug 17</span>
  <p class="ds mb0" style="max-width:60ch">Two or three sentences.</p>
</div>
```

---

## How to rebuild `board.html`

The site builder (`build.py`) reads `_parts/pages.json`, which this page deliberately stays
out of. `board.html` was produced by a throwaway script that used the same `merc.html` shell
logic against `_parts/board-pages.json`, then deleted. To rebuild, drop this in the repo
root as `_build_board.py`, run `python _build_board.py`, and delete it again:

```python
# throwaway: builds board.html only, from _parts/board-pages.json
import os, re, json
ROOT = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(ROOT, "merc.html"), encoding="utf-8").read()
HEAD_RE = re.compile(r"(<title>).*?(</head>)", re.S)
MAIN_RE = re.compile(r"<main>.*?</main>", re.S)
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900'
         '&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap" rel="stylesheet">')

for p in json.load(open(os.path.join(ROOT, "_parts", "board-pages.json"), encoding="utf-8")):
    body = open(os.path.join(ROOT, "_parts", p["part"]), encoding="utf-8").read()
    head = (f'<title>{p["title"]}</title>\n'
            f'<meta name="description" content="{p["desc"]}">\n'
            f'{FONTS}\n\n{p.get("head","")}\n</head>')
    s = HEAD_RE.sub(lambda m: head, shell, count=1)
    s = MAIN_RE.sub(lambda m: "<main>\n" + body + "\n</main>", s, count=1)
    s = s.replace(' aria-current="page"', '')
    # every page except index/merc points the header button at the merc search
    s = s.replace('href="#check">Check Stock', 'href="merc.html#check">Check Stock')
    if p.get("active"):
        s = re.sub(r'(<a href="%s")' % re.escape(p["active"]), r'\1 aria-current="page"', s, count=1)
    open(os.path.join(ROOT, p["file"]), "w", encoding="utf-8").write(s)
    print("built", p["file"], len(s), "bytes")
```

The `head` string in `_parts/board-pages.json` carries the canonical, the Open Graph and
Twitter tags, the theme colour, the favicons and the `site.css` / `motion.css` / `roots.css`
links, in the same order the other built pages use. If The Board ever gets a nav entry and
moves into the shared `_parts/pages.json`, that head block has to move with it — `build.py`'s
own head template is the older, shorter one and would drop the canonical and the OG tags.

**Verified after build:** header and footer are byte-identical to `yard.html` apart from the
active-nav marker (which The Board correctly does not have, since it is not in the nav yet);
zero console errors and no failed image requests; no horizontal overflow; the hanging sign,
Storm Mode toggle and the `data-tellus` modal all behave the same as on every other page.
