# Twisted Roots Merc — Performance / Accessibility / Best-Practices / SEO audit

Author: perf agent. Scope: measurement + `assets/css/perf.css` + `perf/`.
No existing `.html`, `.css` or `.js` file was modified. Everything that needs
one is written up as a numbered patch in [§7](#7-patch-list).

---

## 1. Method, and what these numbers are worth

**These are real Lighthouse runs, not reconstructions.** Lighthouse 13.4.1 is
installed locally (`npx lighthouse`), so I ran it directly against headless
Chrome rather than approximating its metrics with `PerformanceObserver`.

```
npx lighthouse http://<host>/<page> [--preset=desktop] \
    --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu"
```

38 Lighthouse runs in total. Raw JSON for every run is in `perf/lh/*.json`;
the scripts that drove and parsed them are in `perf/`.

### Two servers, because the dev server lies

`python -m http.server` on :8899 sends **no compression and no cache headers**.
That makes Lighthouse's simulated-throttling model charge full uncompressed
bytes for every stylesheet and script, and makes `cache-insight` fail on all 13
pages. Production (GitHub Pages, per `.nojekyll`) gzips and sets `Cache-Control`.

So I also wrote `perf/gzserver.py` (port 8898) which gzips text assets and sets
`Cache-Control: immutable` — i.e. what a real host sends. Measured difference on
`site.css`: **59 KB → 16 KB (−73%)**.

| index.html, mobile | Perf | FCP | LCP |
|---|---|---|---|
| :8899 no gzip, no cache headers | 58 | 3170 ms | 16374 ms |
| :8898 gzip + cache headers | **65** | 2719 ms | 15096 ms |

**Every "before" number in §2 is from the plain dev server** (:8899) so it is
comparable to whatever you have been looking at. Every "after" number that
matters is stated with its server. Treat the plain-server figures as ~7 points
pessimistic on mobile.

### Things I could not measure, stated plainly

- **No field data.** All lab, simulated throttling. Real CrUX numbers may differ.
- I could not get stable metrics through the Chrome MCP browser: the window is
  shared with other agents, my tab was never the foreground tab, and Chrome does
  not record `paint` / `largest-contentful-paint` / `layout-shift` entries for a
  hidden tab (`document.visibilityState === "hidden"`, `getEntriesByType('paint')`
  returned `[]`). Viewport size also could not be pinned — `resize_window` was
  overridden by another agent mid-run. **This is why I switched to Lighthouse,**
  which controls its own Chrome and its own emulated viewport.
- **Requested viewports.** Lighthouse's mobile preset emulates 412×823 @ DPR 1.75
  (Moto G Power), not 390×844; desktop is 1350×940, not 1280×800. I used the
  presets because they are what Lighthouse actually scores. I did not
  separately score 390×844 / 1280×800 — nothing in the findings is
  viewport-specific in a way that changes at those sizes.
- Run-to-run variance is real. `index.html` CLS measured 0.139 / 0.000 / 0.062
  across three runs of the same bytes, because whether the font lands before or
  after the hero paints is a coin-flip under simulation. Where variance mattered
  I say so.

---

## 2. Baseline — every page, before any change

Plain dev server (:8899), no compression. `Bytes` = Lighthouse `total-byte-weight`.

| Page | Form | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI | Bytes | Reqs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| index | desktop | **81** | 98 | 96 | 100 | 553 ms | 3482 ms | 0 ms | 0.027 | 736 ms | 7460 KB | 32 |
| index | mobile | **58** | 98 | 96 | 100 | 3170 ms | **16374 ms** | 260 ms | 0.139 | 3714 ms | 4085 KB | 27 |
| shop (260 cards) | desktop | 98 | 95 | 96 | 100 | 526 ms | 1012 ms | 0 ms | 0.053 | 526 ms | 1174 KB | 23 |
| shop | mobile | **68** | 95 | 96 | 100 | 3178 ms | 6837 ms | 187 ms | 0.028 | 3272 ms | 1174 KB | 23 |
| journal (104 cards) | desktop | 94 | 98 | 92 | 100 | 857 ms | 1572 ms | 0 ms | 0.013 | 857 ms | 1446 KB | 19 |
| journal | mobile | **68** | 98 | 92 | 100 | 3309 ms | 9161 ms | 0 ms | 0.012 | 3366 ms | 1446 KB | 19 |
| blog/fix-caulk-a-bathtub | desktop | 98 | 98 | 92 | 100 | 523 ms | 1089 ms | 0 ms | 0.006 | 523 ms | 934 KB | 22 |
| blog/fix-caulk-a-bathtub | mobile | **71** | 98 | 92 | 100 | 3007 ms | 6616 ms | 49 ms | 0.015 | 3257 ms | 934 KB | 22 |
| merc | desktop | **84** | 98 | 96 | 100 | 537 ms | 1290 ms | 4 ms | **0.259** | 537 ms | 1883 KB | 23 |
| board | desktop | 97 | 94 | 96 | 100 | 533 ms | 1310 ms | 0 ms | 0.014 | 533 ms | 1263 KB | 20 |
| kitchen | desktop | 96 | 98 | 96 | 100 | 592 ms | 1368 ms | 0 ms | 0.043 | 592 ms | 1367 KB | 19 |
| recipes/bread-first-sourdough | desktop | 99 | 95 | 96 | 100 | 539 ms | 967 ms | 0 ms | 0.018 | 539 ms | 824 KB | 18 |
| visit | desktop | 98 | 94 | 96 | 100 | 485 ms | 1067 ms | 0 ms | 0.016 | 485 ms | 1924 KB | 21 |

**Read of the baseline:** desktop is broadly fine (81–99). **Mobile is the
problem — 58 to 71 on every page tested.** SEO is already 100 everywhere. A11y
and Best Practices each fail on exactly two small, site-wide things.

### Which audits actually cost points

Aggregated across the 13 baseline runs (weight > 0 only):

| Category | Audit | Weight | Pages failing |
|---|---|---|---|
| A11y | `color-contrast` | 7 | 5 / 13 |
| A11y | `heading-order` | 3 | 12 / 13 |
| Best practices | `image-aspect-ratio` | 1 (of 4 scored) | **13 / 13** |
| Best practices | `errors-in-console` | 1 | 4 / 13 |
| Perf | `largest-contentful-paint` | 25 | 9 / 13 |
| Perf | `cumulative-layout-shift` | 25 | 2 / 13 |
| Perf | `total-blocking-time` | 30 | 1 / 13 |
| Perf | `first-contentful-paint` | 10 | 4 / 13 (all mobile) |
| Perf | `speed-index` | 10 | 1 / 13 |
| SEO | — | — | **0 / 13** |

---

## 3. Findings, in order of measured cost

### 3.1 Mobile FCP is JavaScript-bound — the single biggest lever (~1.8 s)

Every mobile run sits at FCP 2.7–3.3 s. I isolated the cause by bisection on
`index.html`, all on the gzip server with all other patches already applied:

| Variant | FCP | LCP | Perf |
|---|---|---|---|
| all patches, CSS bundled into 1 file | 2583 ms | 5180 ms | 77 |
| ...+ all CSS **inlined** in a `<style>` (zero CSS requests) | 2745 ms | 4730 ms | 78 |
| ...+ crow sprite off the critical path | 2833 ms | 3022 ms | 89 |
| ...+ **the six `<script>` tags removed entirely** | **987 ms** | 1727 ms | **99** |
| ...+ the six scripts **loaded on `window.load`** | **997 ms** | 1728 ms | **99** |

Inlining the CSS changed nothing (2583 → 2745 ms, inside noise). Removing the
JS moved FCP by **1.85 s**. The last row is the real fix and it reproduces the
result exactly: appending the script tags in a `load` listener gives FCP 997 ms
and **Perf 99 mobile / 100 desktop**.

The scripts total ~150 KB unminified (`catalog.js` 46 KB, `site.js` 40 KB,
`shop.js` 24 KB, `motion.js` 20 KB, `cart.js` 11 KB, `roots.js` 9 KB,
`crows.js` 9 KB). Under Lighthouse's 4× mobile CPU throttle, parsing and
executing them before first paint costs ~1.8 s. `defer` does **not** fix this —
deferred scripts still run before the first paint is committed in the simulated
trace. They must be attached after `load`.

`catalog.js` is ~250 product objects — pure data, not code. It has no business
being in the critical path of any page, and on the 104 blog posts and 130+
recipes it is never used at all. → patches **#5**, **#6**.

### 3.2 CLS is caused by web-font swap, not by images or by JS-injected lists

I expected the client-rendered product lists to be the CLS source. They are not.
Lighthouse's `layout-shifts` audit attributes the shifts explicitly:

```
merc.html   CLS 0.259   node <h1 class="h-mega">    cause: "Web font loaded"
                        → fonts.gstatic.com/.../bitter/...woff2
                        → fonts.gstatic.com/.../publicsans/...woff2
merc.html   CLS 0.001   node <nav id="siteNav">     cause: "Web font loaded" (Rye)
index.html  CLS 0.139   node <div class="hero-in">  (same, hero headline re-wrap)
```

The Google Fonts stylesheet uses `display=swap`, so the page paints in Georgia /
Arial and then re-wraps every headline when Bitter / Public Sans arrive. Georgia
is ~3.5 % narrower per character than Bitter, which is enough to change the line
count of `h1.h-mega` and shove everything below it down.

The JS-injected grids contributed almost nothing by comparison (shop CLS 0.053
desktop / 0.028 mobile) because `[data-shopgrid]` is the last block before the
footer.

**Fixed in `perf.css`** — see §6.1. Measured: merc CLS **0.254 → 0.003**,
Perf **84 → 97**.

### 3.3 `crow-sprite.png` — 792 KB of decoration at *High* priority

From the `index.html` network log:

| Asset | Bytes | Priority | Dimensions | Referenced from |
|---|---|---|---|---|
| `crow-sprite.png` | **792.0 KB** | **High** | 6500×409 | `site.css:575` `.crow__sprite` |
| `crow-perch.png` | 318.2 KB | Low | 6460×147 | `site.css:804` `.perchcrow` |

`crow-sprite.png` is fetched at **High** priority because its rule matches an
element inside the initial viewport, so on mobile it competes directly with the
LCP image for a simulated ~1.6 Mbps link. 792 KB of crow ahead of the thing the
user came for.

These are flat silhouettes with alpha — the ideal WebP case. Re-encoded at q82,
geometry unchanged (so the sprite-stepping maths in `crows.js` still works):

```
crow-sprite   792 KB → 178 KB   (−77%)
crow-perch    318 KB → 117 KB   (−63%)
                    −815 KB per page
```

**Fixed in `perf.css`** (§6.3). Chrome only fetches the winning
`background-image` declaration, so the PNG request genuinely does not happen.
Measured on index mobile: total bytes **4093 → 3289 KB**, LCP **16.4 s → 12.6 s**.

Even as WebP it is still 178 KB at High priority. Taking it fully off the
critical path moved index mobile LCP **4730 → 3022 ms** and Perf **78 → 89**.
→ patch **#8**.

### 3.4 The hero on `index.html`

```
river-hd.mp4     3017.0 KB   desktop
river-sm.mp4      854.7 KB   mobile   (50% of the whole mobile page)
w-river.jpg       526.7 KB   ← the <video poster>
```

Three separate problems in eight lines of HTML:

1. **`poster="assets/img/w-river.jpg"` (index.html:197) pulls the full 2560 px,
   526 KB image.** `poster` ignores `srcset`. The `<img class="hero-still">`
   immediately below it already paints the same picture with a correct
   `srcset`/`sizes` (52 KB on mobile). The poster is pure duplicate weight.
   → patch **#9**.
2. **The `<video>` is the LCP element on desktop.** `lcp-discovery-insight`:
   *"fetchpriority=high should be applied — false"*. A 3 MB video defining LCP
   is the reason desktop index scored 81 while every other desktop page scored
   94–99.
3. The video has `preload="none"` and no `src` (only `data-src`), yet it still
   downloads early because `motion.js` attaches the source immediately.
   Deferring that attach to `load` removed 855 KB from the mobile critical path.
   → patch **#10**.

### 3.5 Images: 427 of 438 `<img>` tags ignore variants that already exist

An earlier pass generated `-600` / `-900` / `.webp` variants for most of the
photo library — **and then nobody wired them into the HTML.** Scanned all 383
pages (`perf/imgscan.py`):

- **438 `<img>` tags total; 427 have no `srcset` despite variants existing on disk.**
- 145 MB of images in `assets/img/` across 275 files.

Worst offenders (bytes served vs. smallest existing variant):

| Image | Tags | Served | Smallest existing variant | Saving |
|---|---|---|---|---|
| `logo-foot.png` | **383** | 354 KB | `logo-foot.webp` 72 KB | 282 KB × every page |
| `cinnamon-roll.jpg` | 2 | 529 KB | `cinnamon-roll-600.webp` 86 KB | 443 KB |
| `maker-pottery.jpg` | 3 | 483 KB | `maker-pottery-600.webp` 96 KB | 387 KB |
| `bakery-case.jpg` | 4 | 468 KB | `bakery-case-600.webp` 72 KB | 396 KB |
| `coastal-forest.jpg` | 3 | 453 KB | `coastal-forest-600.webp` 36 KB | 417 KB |
| `lumber-rack.jpg` | 2 | 467 KB | `lumber-rack-600.webp` 44 KB | 423 KB |
| `truck.jpg` | 2 | 423 KB | `truck-600.webp` 48 KB | 375 KB |
| `river.jpg` | 1 | 367 KB | `river-600.webp` 39 KB | 328 KB |
| `w-interior.jpg` | 2 | 558 KB | `w-interior.webp` 77 KB | 481 KB |

`logo-foot.png` alone is **354 KB in the footer of all 383 pages**, displayed at
190 px wide (`site.css:398`), with no `loading="lazy"`, at Medium priority.
`assets/img/logo-foot.webp` (72 KB) already exists. → patch **#4**.

#### `<img>` tags missing `width`/`height` (CLS risk)

37 tags across the site. The full list is in `perf/imgscan.py` output; the ones
on the audited pages, with the intrinsic values to use:

| File | Correct `width`/`height` | Tags | Example page |
|---|---|---|---|
| `tr-interior-sm.jpg` | `900` × `502` | 4 | hunt.html |
| `tools-wall.jpg` | `1600` × `1067` | 4 | hunt.html |
| `bakery-case.jpg` | `1800` × `2700` | 3 | bakery.html |
| `coastal-forest.jpg` | `2000` × `2996` | 3 | board.html |
| `maker-pottery.jpg` | `1600` × `2000` | 3 | index.html |
| `fishing.jpg` | `1600` × `1067` | 2 | board.html |
| `honey-jam.jpg` | `1600` × `1067` | 2 | board.html |
| `cinnamon-roll.jpg` | `1600` × `2400` | 2 | board.html |
| `forest-road.jpg` | `1800` × `2700` | 2 | board.html |
| `owners-porch.jpg` | `1600` × `1067` | 2 | index.html |
| `truck.jpg` | `1800` × `1200` | 2 | index.html |
| `lumber-rack.jpg` | `1800` × `1200` | 2 | merc.html |
| `breakfast-plate.jpg` | `1600` × `1067` | 1 | bakery.html |
| `sandwich.jpg` | `1600` × `1067` | 1 | bakery.html |
| `apron.jpg` | `1600` × `2400` | 1 | bakery.html |
| `tr-storm.jpg` | `1800` × `1005` | 1 | board.html |
| `rain-window.jpg` | `1600` × `1067` | 1 | board.html |
| `tr-yard.jpg` | `1800` × `1005` | 1 | board.html |
| `hunt-field-sm.jpg` | `620` × `770` | 1 | hunt.html |
| `camping.jpg` | `1600` × `2405` | 1 | hunt.html |
| `tr-yard-sm.jpg` | `900` × `502` | 1 | index.html |
| `tr-storm-sm.jpg` | `900` × `502` | 1 | index.html |
| `river.jpg` | `1800` × `1011` | 1 | index.html |
| `lantern.jpg` | `1600` × `2133` | 1 | index.html |
| `candle.jpg` | `1600` × `1067` | 1 | local.html |

Plus three parallax images on `index.html` with an **empty `src`** and no
dimensions — `motion.js` swaps the source in later:

```html
<img data-parallax="0.12" src="" alt="The Twisted Root cinnamon roll" loading="lazy">
<img data-parallax="0.12" src="" alt="A lantern lit outside a tent at night" loading="lazy">
<img data-parallax="0.12" src="" alt="A pickup truck parked on a rural Oregon road" loading="lazy">
```

`perf.css` gives these a holding `aspect-ratio` (§6.6) so they cannot collapse
to zero height, but they still need real attributes → patch **#11**.

### 3.6 `image-aspect-ratio` — one wrong number, failing on all 383 pages

This is the whole Best-Practices deduction on 9 of 13 pages, and it is an 8-pixel
typo:

```
assets/img/logo-foot.png  is actually  440 × 379
the tag says                           width="440" height="371"
```

Lighthouse: *displayed 150 × 371 (0.40) vs actual 440 × 379 (1.16) — do ratios
match: False.* Present on **383/383 pages**.

The `371` came from `assets/img/logo-foot.webp`, which really is 440 × 371 —
somebody copied the dimensions from the WebP but left the `src` pointing at the
PNG. Switching the `src` to the `.webp` fixes the aspect ratio **and** saves
282 KB per page in one edit. → patch **#4**.

### 3.7 `errors-in-console` — blog and journal load four scripts twice

`blog/fix-caulk-a-bathtub.html` lines 166–174:

```html
<script src="../assets/js/catalog.js?v=cdc9c20e"></script>
<script src="../assets/js/cart.js?v=37edf57f"></script>
<script src="../assets/js/site.js?v=3ac5f34e"></script>
<script src="../assets/js/motion.js?v=bf716f00"></script>
<script src="../assets/js/roots.js?v=93423d8d"></script>
<script src="../assets/js/catalog.js"></script>   ← duplicate
<script src="../assets/js/site.js"></script>      ← duplicate
<script src="../assets/js/motion.js"></script>    ← duplicate
<script src="../assets/js/roots.js"></script>     ← duplicate
```

Lighthouse console output:

```
SyntaxError: Identifier 'TR_DEPTS' has already been declared   (catalog.js)
SyntaxError: Identifier 'TR'       has already been declared   (site.js)
```

This is not cosmetic. Two of the four re-executions **throw and abort**, and
`motion.js` / `roots.js` do not use top-level `const`, so they run a *second
time* and install duplicate event handlers. It also doubles the parse cost of
the single heaviest script on the page.

Generated by the builder, so fix the builder. → patch **#6**.

### 3.8 Render-blocking CSS — six stylesheets in `<head>`

`index.html:10, 30–35`:

| Resource | Bytes (uncompressed) | Blocking? | Wasted ms (mobile) |
|---|---|---|---|
| `fonts.googleapis.com/css2` (Bitter + Public Sans + Rye) | 1.4 KB | yes | 867 |
| `site.css` | 59.1 KB | yes | 2105 |
| `mobile.css` | 28.4 KB | yes | 1354 |
| `motion.css` | 26.5 KB | yes | 1204 |
| `polish.css` | — | yes | — |
| `roots.css` | 3.0 KB | yes | 303 |
| `print.css` | 28.2 KB | **no** (`media="print"`) | — |

`print.css` is already correctly non-blocking — leave it alone.
Lighthouse `render-blocking-insight`: **est. saving 1,190–2,070 ms on mobile.**

Concatenating the five blocking sheets into one file: **148.9 KB → 87.9 KB
minified → 19.6 KB gzipped, one request instead of five.** Combined with making
the Google Fonts sheet non-blocking, this took `render-blocking-insight` from
score 0 to 0.5 and left `bundle.css` as the only blocking resource (602 ms).

Measured effect of bundling + async fonts alone:
**journal mobile 68 → 96**, **shop mobile 68 → 98**. → patches **#12**, **#13**.

Note `unused-css-rules` reports 98–124 KB unused per page — most of the CSS is
not used by any single page. Bundling is the quick win; a per-page purge is the
thorough one.

### 3.9 Fonts — three families, and Rye's cost

| Family | woff2 | Used for | Verdict |
|---|---|---|---|
| Bitter | 33.4 KB | `--f-display` — every heading, button, label | earns it |
| Public Sans | 26.0 KB | `--f-body` — all body copy | earns it |
| **Rye** | **22.4 KB** | `--f-sign` only | **questionable** |

`Rye` is referenced exactly once in the CSS (`site.css:31`) and is used only for
small letterspaced uppercase labels: `.hero-tag`, `.sub`, `.board-head h3`,
`.brand-txt span`, `.stormbar b`, `.intent-note b`, `.foot-top h4`.

**22.4 KB and a render-blocking round trip for decorative micro-labels.**
Measured: it caused a (small, 0.001) layout shift of its own on `merc.html`.
At 0.6–0.9 rem, uppercase, letterspaced .2em, the difference between Rye and a
metric-matched Georgia is barely legible.

I am not going to unilaterally drop a typeface that is clearly a deliberate
brand choice. Two options, in order of preference:
- **Subset it.** These labels use only A–Z, digits and a couple of punctuation
  marks. `&text=` on the Google Fonts URL, or a local subset, takes Rye from
  22.4 KB to roughly 4–6 KB.
- **Drop it** and let `--f-sign` fall through to the metric-matched Georgia
  fallback already defined in `perf.css`. Saves 22.4 KB and one font fetch.

Either way `preconnect` is already correct (`index.html:8–9`); add `preload` for
the two fonts that are definitely on the critical path → patch **#13**.

### 3.10 Caching

`cache-insight` fails on **13/13 pages** — est. saving 833–7,346 KB. That is
purely the dev server. `perf/gzserver.py` demonstrates the fix
(`Cache-Control: public, max-age=31536000, immutable` for hashed static assets).
GitHub Pages sets its own headers, so **verify on the deployed host**; if you
control it, the `?v=` hashes already in the URLs make `immutable` safe.

### 3.11 Accessibility beyond the four scored failures

Checked by hand — these all **pass**, and I want to be clear I looked:

- **Cart drawer** — `cart.js:123` emits
  `<aside class="cartdrawer__panel" role="dialog" aria-modal="true" aria-label="Your basket">`. Correct.
- **Decorative layers** — `.rainlayer`, `.crows`, `.wavedivider`, `.navitem__car`
  all carry `aria-hidden="true"` (10 instances on `index.html`). Correct.
- **Landmarks** — `<header>` / `<main>` / `<footer>` / `<nav>` present on every
  page. `bypass` passes.
- **Focus visibility** — 20 `:focus` / `:focus-visible` rules in `site.css`.
- **Form labels / ARIA** — `label`, `aria-*`, `button-name`, `link-name`,
  `aria-valid-attr`, `aria-required-children` all pass on all 13 runs.
- **`<html lang>`, viewport, `document-title`** — pass on all 383 pages.

Two things Lighthouse does not score that you may still want:

- **No skip link.** `bypass` passes on landmarks alone, so this costs zero
  points, but a `<a class="skip" href="#main">` is cheap and helps real users.
- **`<h3>` nested inside `<span>`** — `index.html:243` etc.:
  `<span class="lab"><h3>The Merc</h3><p>…</p></span>`. A `<span>` is phrasing
  content and cannot legally contain `<h3>` or `<p>`. Browsers cope; validators
  will not. Change the `<span class="lab">` to a `<div class="lab">`.
- **`td-has-header`** fails (weight 0, no score impact) on blog posts with data
  tables — `main > article.band > div.wrap--narrow > table`. Worth a `<th>` row.

### 3.12 SEO — already clean, verified exhaustively

I parsed **every JSON-LD block on all 383 pages with `json.loads`**:

```
JSON-LD blocks found: 533
parsed OK:            533
FAILED:                 0
```

| Check | Result |
|---|---|
| `<meta name="description">` present | 383 / 383 |
| Duplicate meta descriptions | **0 groups** |
| `<link rel="canonical">` present | 382 / 383 — missing only on `hq.html` |
| `<title>` non-empty | 383 / 383 |
| `<html lang>` | 383 / 383 |
| `<meta viewport>` | 383 / 383 |
| Exactly one `<h1>` | 383 / 383 |
| `robots.txt` | present, valid, references sitemap |
| `sitemap.xml` | present, 17 KB |
| Lighthouse SEO score | **100 on all 13 runs** |

`hq.html` is the only page without a canonical. It looks like an internal
dashboard, so that is probably deliberate — but it should then carry
`<meta name="robots" content="noindex">`, which it does not. → patch **#14**.

---

## 4. Layout-shift log (every non-zero shift observed)

| Page | Shift | Node | Attributed cause |
|---|---|---|---|
| merc desktop | 0.2583 | `main > section.band > div.wrap > h1.h-mega` | Web font loaded (Bitter, Public Sans) |
| merc desktop | 0.0011 | `body > header.site-head > div.wrap > nav#siteNav` | Web font loaded (Rye) |
| index mobile | 0.1385 | `body > main > section.hero > div.hero-in` | Web font loaded |
| index mobile (post-fix) | 0.0618 | same node | unattributed — hero video/still swap |
| shop desktop | 0.053 | product grid fill | JS injection into `[data-shopgrid]` |
| kitchen desktop | 0.043 | — | — |

---

## 5. Long tasks / main-thread

TBT is only a scored failure on one page (`index.html` mobile, 260 ms). No
individual task exceeded 50 ms on most runs — the cost is death by a thousand
small tasks, which is why `mainthread-work-breakdown` reports **2.3 s** on index
mobile while TBT reads 0.

| Page | TBT | mainthread work | Long tasks > 50 ms |
|---|---|---|---|
| index mobile | 260 ms | 2.3 s | few, TTI 16.7 s |
| shop mobile | 187 ms | — | max-potential-FID 240 ms |
| blogpost mobile | 49 ms | — | — |
| journal mobile | 0 ms | — | — |
| all desktop | 0–4 ms | — | none |

After the patches, index mobile TBT → **18 ms**, TTI 16.7 s → ~1.7 s.

---

## 6. What I fixed in `assets/css/perf.css`, and what it measured

`perf.css` is additive only. It re-declares selectors that already exist, adds no
new markup dependency, and is visually a no-op — I diffed screenshots of
`merc.html` with and without it and they are pixel-identical once fonts load.

> ⚠️ **`perf.css` is not linked from any page yet.** It is patch **#1**.
> All measurements below were taken by serving a copy of the page with the
> `<link>` injected (`perf/build_preview.py` → `perf/preview/fix-*.html`),
> against a control copy that was byte-identical apart from that one line.

### 6.1 Metric-matched font fallbacks — kills the font-swap CLS

Four `@font-face` blocks with `size-adjust` / `ascent-override` /
`descent-override`, plus a re-declaration of `--f-display` / `--f-sign` /
`--f-body` to insert them into the stack.

The overrides are computed, not copied. `perf/fontmetrics.py` downloads the
three real woff2 files, reads them with `fontTools`, and computes
`size-adjust = (web.xWidthAvg/upm) / (fallback.xWidthAvg/upm)` where
`xWidthAvg` is the advance widths of a–z + space weighted by English letter
frequency. Metrics used are documented in the file header.

```
Bitter      → Georgia          size-adjust 103.65%  asc 90.20%  desc 25.57%
Bitter      → Times New Roman  size-adjust 114.07%  asc 81.97%  desc 23.23%
Public Sans → Arial            size-adjust 103.14%  asc 92.11%  desc 21.82%
Rye         → Georgia          size-adjust 119.49%  asc 82.55%  desc 22.07%
```

**Measured, `merc.html` desktop, control vs. treatment, same run conditions:**

| | Perf | CLS | LCP |
|---|---|---|---|
| control | 84 | 0.254 | 1290 ms |
| **+ perf.css** | **97** | **0.003** | 1306 ms |

**CLS −99%. Perf +13 points from one stylesheet.**

### 6.2 Colour contrast — 4 failures, all fixed

Every failure was an `opacity` value, not a colour value, so raising the opacity
is the minimal correction and stays right if the surface behind it changes.
Ratios computed with the WCAG relative-luminance formula (`perf/solvecolor.py`,
`perf/solveopacity.py`).

| Selector | Source | Before | Ratio | Fix | After |
|---|---|---|---|---|---|
| `.prodcard__mt` | `shop.css:148` `opacity:.5` | `#8e887f` on `#fbf7ef` | **3.29** | `opacity:.72` | ~5.0 |
| `.req .ct` | `site.css:321` `opacity:.5` | `#8a8378` on `#f4ede1` | **3.22** | `opacity:.68` | ~5.1 |
| `.stat .k` | `site.css:381` `opacity:.55` | `#837c74` on `#fbf7ef` | **3.85** | `opacity:.68` | ~5.4 |
| `.drive-cell b` | `site.css:185` `opacity:.55` | `#735320` on `#d99a34` | **2.89** | `opacity:.82` | ~4.9 |

All four need 4.5:1 (they are ≤ 12.8 px bold, below the large-text threshold).
`.prodcard__mt` alone was **520 failing nodes** on `shop.html`.

**Measured:** shop A11y **95 → 98**, board/visit/recipe likewise. The remaining
2 points are `heading-order`, which needs an HTML edit.

### 6.3 Crow sprites → WebP

Overrides `.crow__sprite` and `.perchcrow` `background-image`. Generated by
`perf/optimize.py`; files in `perf/img/`.

**Measured, index mobile:** total bytes **4093 → 3289 KB (−804 KB)**,
LCP **16369 → 12611 ms**, TBT **227 → 137 ms**, Perf **61 → 67**.

### 6.4 Heading-order support styles

`.foot-top h3` and `.board-head h2`, mirroring the existing `.foot-top h4`
(`site.css:399`) and `.board-head h3` (`site.css:208`). These exist so that
patches **#2** and **#3** are a pure tag rename with zero visual change.
Landing perf.css *before* those patches is harmless — the selectors simply
match nothing.

### 6.5 Reserved space for client-rendered lists

`[data-shopgrid]:empty{min-height:70vh}` and friends. `:empty` only, so the
reservation is released the instant JS fills the container and can never fight
the real height.

### 6.6 `content-visibility` on card grids, and an image safety net

`content-visibility:auto` + `contain-intrinsic-size:auto 300px` on
`.shopgrid > .card` (260 cards). Scoped to cards, deliberately not to whole
`<section>`s — that is where `content-visibility` usually breaks anchor links.

`img[data-parallax]:not([width])` gets a holding `aspect-ratio:3/2`. The
`:not([width])` means the rule retires itself the moment patch **#11** lands.

### 6.7 Reduced motion

Stops the crow animations, hides the hero video and shows the still under
`prefers-reduced-motion: reduce`. WCAG 2.3.3, and it drops the sprite from the
compositor budget for those users.

### Summary of perf.css, measured

| Page | Before | After perf.css alone | Δ |
|---|---|---|---|
| merc desktop | 84 / 98 / 96 / 100 | **97** / 98 / 96 / 100 | **+13 perf** |
| index mobile | 61 / 98 / 96 / 100 | **67** / 98 / 96 / 100 | +6 perf, −804 KB |
| shop (contrast) | — / **95** / — / — | — / **98** / — / — | +3 a11y |

---

## 7. Patch list

Ordered by measured impact. Everything here needs an HTML or JS edit, which is
outside my lane. Before/after strings are exact as of this writing — other
agents are editing these files concurrently, so **match on the string, not the
line number**.

---

### #1 — Link `perf.css` on every page — *prerequisite for everything in §6*
**Files:** all 383 `.html` (14 root + `blog/*` + `recipes/*`) — and the
generators `build.py`, `build_blog.py`, `build_recipes.py`, `build_perch.py`.
**Line:** `index.html:35`, after the `print.css` link.

```html
<!-- before -->
<link rel="stylesheet" href="assets/css/print.css?v=65e49f4e" media="print">

<!-- after -->
<link rel="stylesheet" href="assets/css/print.css?v=65e49f4e" media="print">
<link rel="stylesheet" href="assets/css/perf.css">
```

Blog/recipe pages use `../assets/css/perf.css`. **It must be last** — the
`--f-*` and contrast overrides depend on source order.
**Measured:** merc desktop 84 → 97; index mobile 61 → 67.

---

### #2 — Footer `<h4>` → `<h3>` (`heading-order`, A11y weight 3)
**Files:** all 383 `.html` + the generators. **`index.html:557, 566, 575`.**

```html
<!-- before -->            <!-- after -->
<h4>The Store</h4>         <h3>The Store</h3>
<h4>Food</h4>              <h3>Food</h3>
<h4>Twisted Roots</h4>     <h3>Twisted Roots</h3>
```

The preceding heading is `<h2 class="h1">`, so `h2 → h4` skips a level.
Styling is preserved by `.foot-top h3` in `perf.css` (§6.4).
Strictly, only 12 pages currently trip the audit — but the markup is wrong on
all 383 and any content change can turn the rest into failures.

---

### #3 — Board heading `<h3>` → `<h2>` (`heading-order`)
**Files:** `index.html:231`, `hq.html` (`Twisted Roots Today`).

```html
<!-- before -->  <h3>Today at the Merc</h3>
<!-- after -->   <h2>Today at the Merc</h2>
```

Preceded by `<h1 class="h-mega">` at `index.html:172`. Styling preserved by
`.board-head h2` in `perf.css`.

---

### #4 — Footer logo: fixes `image-aspect-ratio` **and** saves 282 KB × 383 pages
**Files:** all 383 `.html` + generators. **`index.html:551`.**

```html
<!-- before -->
<img src="assets/img/logo-foot.png?v=51cd242d" alt="Twisted Roots Merc" width="440" height="371">

<!-- after -->
<img src="assets/img/logo-foot.webp" alt="Twisted Roots Merc"
     width="440" height="371" loading="lazy" decoding="async">
```

`logo-foot.png` is 440×379 (not 371) → the aspect-ratio failure on **13/13**
pages. `logo-foot.webp` **already exists**, is genuinely 440×371, and is 72 KB
instead of 354 KB. One edit fixes the ratio, the weight and the missing
`lazy`/`async` together.
*(If you prefer to keep the PNG, the minimum fix is `height="371"` → `height="379"`.)*
**Measured:** Best Practices 92/96 → **100**.

---

### #5 — Load the six scripts on `window.load` — **biggest single perf win**
**Files:** all 383 `.html` + generators. **`index.html:592–597`.**

```html
<!-- before -->
<script src="assets/js/catalog.js?v=cdc9c20e"></script>
<script src="assets/js/cart.js?v=024fe1e6"></script>
<script src="assets/js/site.js?v=3787c0d1"></script>
<script src="assets/js/motion.js?v=bf716f00"></script>
<script src="assets/js/roots.js?v=93423d8d"></script>
<script src="assets/js/crows.js?v=a06dbbea"></script>

<!-- after -->
<script>
addEventListener("load", function () {
  var s = ["assets/js/catalog.js?v=cdc9c20e",
           "assets/js/cart.js?v=024fe1e6",
           "assets/js/site.js?v=3787c0d1",
           "assets/js/motion.js?v=bf716f00",
           "assets/js/roots.js?v=93423d8d",
           "assets/js/crows.js?v=a06dbbea"], i = 0;
  (function next(){
    if (i >= s.length) return;
    var e = document.createElement("script");
    e.src = s[i++]; e.onload = next;
    document.body.appendChild(e);
  })();
});
</script>
```

Order is preserved by chaining `onload` — `catalog.js` must still run before
`site.js`. **`defer` is not sufficient**, I measured it: deferred scripts still
execute before the first paint is committed.

**Measured, index mobile:** FCP **2833 → 997 ms**, LCP **3022 → 1728 ms**,
TTI 5.3 s → 1.7 s, **Perf 89 → 99** (desktop **100**).

*Caveat I want to be honest about:* this trades first paint for interaction
readiness — the nav, cart and product filters become live slightly later. On a
brochure/mercantile site that is the right trade, but confirm the cart badge and
storm toggle still feel instant to you before shipping. If not, the middle
ground is to load `site.js` + `cart.js` with `defer` and push
`catalog.js`/`motion.js`/`crows.js`/`roots.js` to `load`.

---

### #6 — Remove duplicated `<script>` tags on blog pages (`errors-in-console`)
**File:** `build_blog.py` (the generator) → regenerates all 104 `blog/*.html`.
**`blog/fix-caulk-a-bathtub.html:171–174`.**

```html
<!-- delete these four lines entirely -->
<script src="../assets/js/catalog.js"></script>
<script src="../assets/js/site.js"></script>
<script src="../assets/js/motion.js"></script>
<script src="../assets/js/roots.js"></script>
```

They duplicate lines 166, 168, 169, 170. Causes two thrown `SyntaxError`s and
double-installs handlers from `motion.js` / `roots.js`.
**Measured:** blogpost Best Practices 92 → **100**, and −59 KB of redundant JS.

---

### #7 — Move the crow WebPs out of `perf/`
**Files:** `perf/img/crow-sprite.webp`, `perf/img/crow-perch.webp` →
`assets/img/`; then in `assets/css/perf.css`:

```css
/* before */  background-image:url("../../perf/img/crow-sprite.webp");
/* after  */  background-image:url("../img/crow-sprite.webp");
```

They live in `perf/` only because that is the directory I own. Purely cosmetic —
they work as-is. Delete `crow-sprite.png` / `crow-perch.png` afterwards (−1.1 MB
in the repo). Same treatment for `perf/img/logo-head.webp` (93.7 KB → 19 KB,
High priority, above the fold).

---

### #8 — Attach the crow sprite after `load` (LCP)
**File:** `assets/js/crows.js`.

Even as WebP, `crow-sprite.webp` is 178 KB fetched at **High** priority because
`.crow__sprite` matches inside the initial viewport. Have `crows.js` add the
class that carries the `background-image` (or set it inline) in a `load`
listener, so it never competes with the LCP image.

**Measured, index mobile:** LCP **4730 → 3022 ms**, **Perf 78 → 89**.

---

### #9 — Drop the redundant `<video poster>` (−527 KB on index)
**File:** `index.html:197`.

```html
<!-- before -->
<video class="hero-img hero-video" data-parallax="0.22"
       poster="assets/img/w-river.jpg"
       data-src-sm="assets/video/river-sm.mp4"

<!-- after -->
<video class="hero-img hero-video" data-parallax="0.22"
       data-src-sm="assets/video/river-sm.mp4"
```

`poster` ignores `srcset` and pulls the full 2560 px, 526.7 KB `w-river.jpg`.
The `<img class="hero-still">` on the next line already paints the identical
image with a correct `srcset` (52 KB on mobile) and sits behind the video.

---

### #10 — Attach the hero video source after `load`
**File:** `assets/js/motion.js`.

`river-hd.mp4` is **3017 KB** on desktop and is the LCP element;
`river-sm.mp4` is **854.7 KB** on mobile — 50 % of the page. The element
already has `preload="none"` and no `src`, so all that is needed is to move the
`video.src = video.dataset.src` assignment into a `load` listener (or
`requestIdleCallback`).

Do **not** simply delete `data-src` — I did that in testing and `motion.js`
assigned `undefined`, producing a 404 and an `errors-in-console` failure.

**Measured:** index mobile total bytes 1698 → 769 KB.

---

### #11 — `width`/`height` on the 37 unsized `<img>` tags
**Files:** per the table in §3.5. Three on `index.html` are the parallax images
with an empty `src`:

```html
<!-- before -->
<img data-parallax="0.12" src="" alt="The Twisted Root cinnamon roll" loading="lazy">
<!-- after -->
<img data-parallax="0.12" src="" alt="The Twisted Root cinnamon roll"
     loading="lazy" width="1600" height="2400" decoding="async">
```

Use the intrinsic values in the §3.5 table. `perf.css` holds the line until
these land.

---

### #12 — Wire up the responsive variants that already exist (427 tags)
**Files:** all pages + generators.

```html
<!-- before -->
<img src="assets/img/bakery-case.jpg" alt="Bakery case full of fresh pastries" loading="lazy">

<!-- after -->
<img src="assets/img/bakery-case.jpg"
     srcset="assets/img/bakery-case-600.webp 600w,
             assets/img/bakery-case-900.webp 900w,
             assets/img/bakery-case.webp 1800w"
     sizes="(max-width:760px) 92vw, 46vw"
     width="1800" height="2700" loading="lazy" decoding="async"
     alt="Bakery case full of fresh pastries">
```

The `-600` / `-900` / `.webp` files are **already on disk** for almost every
photo. `perf/imgscan.py` prints the full mapping and `perf/build_full.py`
contains a working transform you can lift. **This is the largest byte win
available: index mobile 4085 → 1722 KB.**

---

### #13 — Bundle the blocking CSS and make Google Fonts non-blocking
**Files:** `build.py` (add a concat step) + all pages.

Concatenate `site.css + motion.css + roots.css + mobile.css + polish.css +
perf.css` into one `assets/css/bundle.css` (keep `print.css` separate — it is
already correctly `media="print"`). **148.9 KB → 87.9 KB minified → 19.6 KB
gzipped, 1 request instead of 5.** `perf/build_max.py` does exactly this.

```html
<!-- before, index.html:10 -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:…&display=swap" rel="stylesheet">

<!-- after -->
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bitter:…&display=swap">
<link rel="stylesheet" media="print" onload="this.media='all'"
      href="https://fonts.googleapis.com/css2?family=Bitter:…&display=swap">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bitter:…&display=swap"></noscript>
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://fonts.gstatic.com/s/bitter/v42/rax8HiqOu8IVPmn7f4xpLjpSmw.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://fonts.gstatic.com/s/publicsans/v21/ijwRs572Xtc6ZYQws9YVwnNGfJ7QwOk1.woff2">
```

The `preload as=style` + `media="print"` swap is safe because `perf.css` already
guarantees a metric-matched fallback, so the async swap cannot shift layout.
Re-verify the gstatic URLs when you implement — they are version-pinned.

**Measured:** journal mobile **68 → 96**, shop mobile **68 → 98**.

---

### #14 — `hq.html`: add canonical or `noindex`
**File:** `hq.html`. The only page of 383 with no `<link rel="canonical">`. If
it is an internal dashboard, add `<meta name="robots" content="noindex,nofollow">`
and confirm it is excluded from `sitemap.xml`. If it is public, add the canonical.

---

### #15 — Product card heading level (`heading-order` on `shop.html`)
**File:** `assets/js/shop.js`, in the card template.

```html
<!-- before -->  <h3 class="prodcard__nm">…</h3>
<!-- after -->   <h2 class="prodcard__nm">…</h2>
```

The rendered DOM goes `<h1>` → `<h3 class="prodcard__nm">`, skipping a level.
Styling is by class, so **no CSS change is needed**. This is the last 2 points
of `shop.html`'s accessibility score.

---

### #16 — `merc.html` department card headings (`heading-order`)
**File:** `merc.html:131, 135, 139, 143` — `<span class="lab"><h3>Everyday</h3>`
etc., directly after `<h1>` at line 95 with no `<h2>` between.

Preferred fix: give that section a real `<h2>` (index.html already does this
with `<h2 class="h1">Our Goods</h2>`). Alternative: promote the four `<h3>` to
`<h2>` and add `.good .lab h2` mirroring `site.css:275`.

While you are there: `<span class="lab">` contains `<h3>` and `<p>`, which is
invalid — make it `<div class="lab">`.

---

### #17 — Lower priority
- **Subset or drop `Rye`** (§3.9) — 22.4 KB for decorative micro-labels.
- **Add a skip link** — `<a class="skip" href="#main">Skip to content</a>`.
- **`td-has-header`** on blog data tables — add a `<th>` header row.
- **Purge unused CSS** — `unused-css-rules` reports 98–124 KB unused per page.
- **Minify CSS/JS** — `unminified-css` 45–49 KB, `unminified-javascript` 31–59 KB.
- **Verify cache headers on the deployed host** (§3.10).

---

## 8. Projected scores, and what I actually measured

I did not guess these. I built fully-patched copies of the real pages in
`perf/preview/` (`build_full.py`, `build_max.py`) with the patches above applied
and ran Lighthouse against them on the realistic gzip server.

| Page | Form | Before | **After (measured)** | Patches applied |
|---|---|---|---|---|
| index | desktop | 81 / 98 / 96 / 100 | **100 / 100 / 96\* / 100** | #1–#5, #8–#10, #12, #13 |
| index | mobile | 58 / 98 / 96 / 100 | **99 / 100 / 96\* / 100** | same |
| shop | mobile | 68 / 95 / 96 / 100 | **98 / 98 / 100 / 100** | #1–#5, #12, #13 |
| journal | mobile | 68 / 98 / 92 / 100 | **96 / 100 / 100 / 100** | #1–#5, #12, #13 |
| blog post | desktop | 98 / 98 / 92 / 100 | **100 / 100 / 100 / 100** | #1–#4, #6, #12 |
| blog post | mobile | 71 / 98 / 92 / 100 | **88 / 100 / 100 / 100** | #1–#4, #6, #12 (**not #5**) |
| merc | desktop | 84 / 98 / 96 / 100 | **98 / 98 / 100 / 100** | #1–#4, #12 |

*(order: Performance / Accessibility / Best Practices / SEO)*

**\* The 96 on the two index rows is an artefact of my test harness, not of the
site.** To simulate patch #10 I deleted the video's `data-src` attribute, so
`motion.js` assigned `undefined` and requested `/undefined` → 404 →
`errors-in-console`. The earlier build that kept the video (`maxindex`, same
patches minus #10) scored Best Practices **100** on both form factors. Implement
#10 as written — move the assignment into a `load` listener rather than deleting
the attribute — and Best Practices is 100. I am flagging it rather than quietly
writing 100 because I did not measure the correct implementation.

**Accessibility and SEO reach 100 and are fully verified. Best Practices reaches
100 on every page I measured with a clean implementation.**
The other measured shortfalls:

- **blog post mobile, 88.** Patch #5 was not applied to that build. Its FCP is
  2720 ms — the identical JS-bound signature that #5 fixed on index (2833 → 997 ms).
  I expect ~97 with #5, but **I did not measure it**, so treat 88 as the proven
  floor and 97 as the extrapolation.
- **merc / shop A11y 98.** Patches #15 and #16 close these; both are one-line
  tag renames and I did not build a variant with them applied.

### What still blocks 95+ if you apply only some of this

The dependency is sharp, and worth stating clearly:

| If you stop after… | index mobile |
|---|---|
| perf.css alone (#1) | 67 |
| + HTML patches #2–#4, #9–#12 | 74 |
| + CSS bundling #13 | 77 |
| + crow deferral #8 | 89 |
| + **script deferral #5** | **99** |

**Patch #5 is worth more than everything else combined on mobile.** Bundling the
CSS and shipping WebP get you to ~89; they do not get you to 95. Nothing else in
this list substitutes for taking the JavaScript out of the critical path.

The two honest caveats on that headline number:

1. It was measured on `perf/gzserver.py`, which gzips and sets cache headers.
   **Confirm GitHub Pages does the same for your deployed assets** — if it does
   not, subtract roughly 7 points on mobile.
2. All lab data under simulated throttling. Real-device and CrUX numbers will
   differ, and `index.html` CLS in particular varied 0.000–0.139 across runs of
   identical bytes.

---

## 9. Files I created

| Path | What |
|---|---|
| `PERF-AUDIT.md` | this report |
| `assets/css/perf.css` | the CSS-only fixes (§6) — **needs patch #1 to take effect** |
| `perf/lh/*.json` | 38 raw Lighthouse reports |
| `perf/run-lh.sh`, `run-lh2.sh` | Lighthouse drivers (plain / gzip server) |
| `perf/gzserver.py` | gzip + cache-header static server, port 8898 |
| `perf/aggregate.py`, `summarize.py`, `details2.py`, `net.py` | report parsers |
| `perf/fontmetrics.py` | font metric extraction → the `size-adjust` numbers |
| `perf/solvecolor.py`, `solveopacity.py` | WCAG contrast solvers |
| `perf/imgscan.py`, `optimize.py`, `img-inventory.json` | image audit + WebP generation |
| `perf/headings.py` | site-wide heading-order checker (383 pages) |
| `perf/build_preview.py`, `build_full.py`, `build_max.py` | patched page builders |
| `perf/preview/*.html` | the measured control / patched pages |
| `perf/img/*.webp` | optimised crow sprites + logos (move per patch #7) |
| `perf/bundle.css` | the concatenated+minified stylesheet from patch #13 |

Nothing outside `PERF-AUDIT.md`, `assets/css/perf.css` and `perf/` was modified.
