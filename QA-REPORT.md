# Twisted Roots Merc — QA Audit Report

**Audited:** 2026-08-19 · **Scope:** 9 pages, `assets/css/site.css`, `assets/js/site.js`, `assets/js/catalog.js`, `assets/img/*`
**Method:** static reference crawl (urllib + `os.path` against `http://localhost:8899`), catalog ID cross-validation in Node, live DOM probing in Chrome, media-query testing via same-origin iframes at 390 / 768 / 1280 / 1600 px, opacity-composited WCAG contrast math.

> **Note on concurrency.** Other agents were editing this tree during the audit (`motion.css`, `motion.js`, `roots.css`, `roots.js`, image swaps). Findings below reflect the tree as of the final verification pass. Two defects I found early — a corrupted address string (`101 & 101 & 151 N Gaither St`) on all 9 footers + `site.js:12` + the JSON-LD, and a missing `aria-current` on `storm.html` — were **fixed by another agent mid-audit** and are recorded under "Fixed During Audit" rather than as open findings. Line numbers shifted during the audit; all line numbers below were re-verified at the end.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 4 |
| MEDIUM | 6 |
| LOW | 7 |
| NITPICK | 4 |
| **Total** | **21** |

**Nothing is broken enough to block launch.** There are zero 404s, zero JS runtime errors, zero catalog-ID mismatches, and zero horizontal overflow at any tested breakpoint. The issues are a dead header button, one responsive dead-zone, image weight, and a cluster of accessibility gaps.

---

## What Is Working Well

Verified working, not assumed:

- **Zero broken references.** All 333 `src`/`href` targets across all 9 pages resolve — on disk *and* over HTTP 200. No missing images, CSS, JS, favicons, or internal page links.
- **Catalog integrity is perfect.** 188 items, 188 unique IDs, no duplicates. Every ID referenced by `data-ids="…"` (6 lists on `storm.html`, 5 on `local.html`) and `data-meters="…"` (30 IDs on `storm.html`, 8 each on `index.html`/`yard.html`) exists in `TR_CATALOG`. Every `data-aisle` value matches a real aisle, every `data-dept` matches a real dept, every `data-bakery` category matches real items. All 6 `TR_KITS` reference valid items and existing images; all 18 `TR_INTENTS` reference valid picks. **Nothing silently renders empty.**
- **Every client-side hook populates.** All 9 hook types checked on all 9 pages — zero empty mounts, zero console errors on any page.
- **Search and intent matching work well.** `"leaky toilet"` → *Running or leaking toilet*, `"power out"` → *The power is out*, `"fence post"` → *Setting or resetting a post*, all with sensible product picks. `"dog food"` → 5 items, top hit correct. Nonsense query (`"asdfghjkl qwerty"`) correctly falls through to the "Nothing on the shelf" state with the Tell-Us CTA. The scoring penalty for out-of-stock items is a nice touch.
- **The full hold-for-pickup flow works end to end.** Click *Hold it* → modal opens with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, body scroll locked, first field auto-focused; submit → correctly formatted receipt with hold number, name, qty, item, price, and a "held until" time derived from today's actual closing hour.
- **Storm Mode genuinely changes state**, not just styling: low-stock chips 3 → 34, meters `ok` 28 → 0, banner reveals, `aria-pressed` flips, all 3 toggles stay in sync, and the choice persists via `localStorage`.
- **Responsive is clean.** Zero horizontal overflow on all 9 pages at 390, 768, 1280, and 1600 px. The burger toggles correctly with proper `aria-expanded` and `aria-controls`; the sticky header behaves at every width.
- **Nav and footer are consistent.** Header nav markup is byte-identical across all 9 pages; `aria-current="page"` is correct on all 7 nav pages (correctly absent on `index.html` and `hq.html`, neither of which is a nav target). The footer is byte-identical on 8 pages and differs only in whitespace on `index.html`.
- **Hours are consistent.** The table in `visit.html:68–74` matches `STORE.hours` in `site.js:16–24` exactly for all 7 days, and the kitchen hours match too. Phone number is identical in all 27 occurrences.
- **Contrast is good in the main body copy.** Hero tag 10.25:1, lede 16.39:1, nav 7.88:1, amber buttons 8.85:1, footer body 11.16:1. The failures listed below are confined to small de-emphasized labels.
- Escape closes the modal and restores body scroll. `:focus-visible` gives a 3px amber outline globally. All 9 pages have `lang="en"` and complete OG/Twitter/canonical metadata. Every image has an `alt` attribute.

---

## HIGH

### H1 — Header "Check Stock" button is clipped off-screen between 889px and 928px
**Pages:** all 9 · **File:** `assets/css/site.css:426` (`@media (max-width:900px)`), interacting with `assets/css/site.css:44` (`body{overflow-x:clip}`)

The mobile burger doesn't appear until `max-width:900px`, but the desktop header stops fitting at ~1000px. Measured `.head-in` intrinsic width is **914px** and the CTA's right edge sits at **936px**, both fixed. Measured across a viewport sweep:

| Viewport | `.head-in` overflows | CTA right edge | CTA visible |
|---|---|---|---|
| 998px | no | 976 | yes |
| 958px | no | 936 | yes |
| 948px | **yes** (914 vs 904) | 936 | yes (barely) |
| 928px | **yes** (914 vs 884) | 936 | **NO — 8px off-screen** |
| 889px | **yes** (914 vs 845) | 936 | **NO — 47px off-screen** |

**Symptom:** On any viewport from 889–928px (a half-width laptop window, a small Surface, a 1024px tablet in a split view), the primary site-wide call-to-action is simply gone. Because `body{overflow-x:clip}` suppresses the horizontal scrollbar, the user cannot scroll to reach it and gets no visual hint it exists. Between 929–948px the header is already overflowing its wrapper even though the button happens to still be on screen.

**Fix:** Raise the burger breakpoint so the mobile header takes over before the desktop header stops fitting — change `assets/css/site.css:426` from `@media (max-width:900px)` to `@media (max-width:1010px)`. (Minimal alternative: add `.head-cta .btn{display:none}` to a new `@media (max-width:1010px)` block, but that hides the CTA entirely in that range rather than moving it into the burger menu.)

---

### H2 — `href="#check"` is a dead link on 7 of 9 pages
**Pages:** `bakery.html:60`, `yard.html:60`, `storm.html:60`, `local.html:60`, `roots.html:60`, `visit.html:60`, `hq.html:44`

`id="check"` exists on only two pages — `index.html:212` and `merc.html:78`. The other seven all carry the same header button pointing at a fragment that does not exist on their own page.

**Symptom:** Clicking the amber **Check Stock** button in the header does nothing at all on Bakery, The Yard, Storm, Local, Our Roots, Visit, and HQ. The URL gains a `#check` and the page doesn't move. This is the site's most prominent CTA and it is inert on 78% of pages.

**Fix:** Change the `href` to `merc.html#check` on those 7 pages. `html{scroll-padding-top:calc(var(--head-h) + 24px)}` (site.css:43) is already set, so the cross-page jump will land correctly under the sticky header. Leave `index.html:141` and `merc.html:60` as same-page `#check`.

*(Related and correct: `index.html:159` `href="#check"` resolves fine — `index.html` has the target.)*

---

### H3 — Oversized images: a 2.99 MB logo and a 450 KB header icon on every page
**Files:** `assets/img/logo-carved.png`, `assets/img/logo-trans-sm.png` · **Referenced from:** `local.html`, `index.html`, and all 9 page headers

| File | Size | Intrinsic | Displayed | Waste |
|---|---|---|---|---|
| `logo-carved.png` | **2,992 KB** | 1380×1140 | ~600px wide on `local.html` | ~2.8 MB |
| `logo-trans-sm.png` | **450 KB** | 520×438 | **76×62 CSS px** (`site.css:125`) | ~445 KB × 9 pages |

`logo-trans-sm.png` is a PNG with an alpha channel being used as a 76×62 header mark. It alone accounts for roughly half the byte weight of `hq.html`, `visit.html`, `storm.html`, and `yard.html`.

Measured total page weight (HTML + CSS + JS + all referenced images):

| Page | Total | Largest contributor |
|---|---|---|
| `local.html` | **4.46 MB** | logo-carved.png 2,992 KB |
| `index.html` | **3.95 MB** | cinnamon-roll.jpg 529 KB |
| `roots.html` | 1.90 MB | coastal-forest.jpg 452 KB |
| `bakery.html` | 1.65 MB | bakery-case.jpg 468 KB |
| `merc.html` | 1.47 MB | lumber-rack.jpg 466 KB |
| `yard.html` | 1.02 MB | logo-trans-sm.png 450 KB |
| `visit.html` | 0.97 MB | logo-trans-sm.png 450 KB |
| `storm.html` | 0.94 MB | logo-trans-sm.png 450 KB |
| `hq.html` | 0.60 MB | logo-trans-sm.png 450 KB |

**Symptom:** On the rural-coastal mobile connections this site is explicitly built for ("check what's in stock before you drive over"), `local.html` is a 4.5 MB page and every single page ships a 450 KB header logo before anything renders.

**Fix:**
1. Re-export `logo-trans-sm.png` at 152×124 (2× of display size) as PNG-8 or WebP → expect ~8–15 KB. Saves ~435 KB on **every** page.
2. Re-export `logo-carved.png` at ~1200px wide as WebP/optimized PNG → expect ~150–250 KB. Saves ~2.8 MB on `local.html`.
3. Convert the 12 referenced JPEGs over 400 KB to WebP at quality ~80 (`cookie.jpg` 535 KB, `cinnamon-roll.jpg` 529 KB, `sourdough.jpg` 502 KB, `maker-pottery.jpg` 483 KB, `bakery-case.jpg` 468 KB, `lumber-rack.jpg` 466 KB, `coastal-forest.jpg` 452 KB, `storm-coast.jpg` 451 KB, `truck.jpg` 423 KB, `coffee-pour.jpg` 415 KB) with `<picture>` + JPEG fallback.

---

### H4 — No image on the site has `width`/`height` attributes
**Pages:** all 9 (15 images on `index.html`, 5 on `merc.html`, 4 on `bakery.html` and `roots.html`, 5 on `local.html`, 2 on `visit.html`, 1 each on `yard.html`/`storm.html`/`hq.html`) · Also `assets/js/site.js:282` (kit card `<img>`)

Not a single `<img>` in the HTML or generated by `paintKits()` declares intrinsic dimensions, and `site.css:47` sets `img{max-width:100%; display:block}` with no `aspect-ratio` fallback.

**Symptom:** Cumulative Layout Shift on every page. Text reflows downward as each image finishes decoding — worst on `index.html` (15 images) and on slow connections, where the 450 KB header logo alone shifts the whole header. Users tap the wrong thing while the page settles.

**Fix:** Add `width` and `height` attributes matching each file's intrinsic aspect ratio (the browser scales them via the existing `max-width:100%`). For the kit cards, add them to the template at `site.js:282`. As a blanket safety net, add `aspect-ratio` to the relevant image rules in `site.css`.

---

## MEDIUM

### M1 — Bakery "· N left today" text is effectively unreadable (1.77:1)
**File:** `assets/js/site.js:321` · **Pages:** `index.html`, `bakery.html`

```js
<b style="color:var(--rust)">· ${b.q} left today</b>
```

`--rust` is `#8E4826`, rendered inside `.menu-item .ds` which has `opacity:.68` (`site.css:300`), on a `.band--bark` background of `#2A1F14`. Measured effective contrast: **1.77:1** against a 4.5:1 requirement — a 2.5× shortfall. Verified the ancestor chain: no background image is involved, the computed background really is `rgb(42,31,20)`.

**Symptom:** The single most decision-relevant number on the bakery board — how many cinnamon rolls are left — is dark red-brown on dark brown at 68% opacity. It is essentially invisible, especially outdoors on a phone.

**Fix:** Use a light accent on the dark band instead of `--rust`. `var(--amber-hi)` (`#F2B953`) on `#2A1F14` measures ~9.5:1 even after the 0.68 opacity. Change `site.js:321` to `color:var(--amber-hi)`, or move the `<b>` outside `.ds` so it isn't dimmed and give it `--wood-lt`.

---

### M2 — The modal does not trap focus and does not restore it
**File:** `assets/js/site.js:328–353`

Verified in-browser: the modal contains 5 focusable elements, but there is **no `keydown` handler for `Tab`** anywhere in `site.js` (only `Escape`, at line 340). Background content is neither `inert` nor `aria-hidden` — measured `main[aria-hidden]` = `null`, `main[inert]` = `false`. `closeModal()` (line 349–353) removes the `open` class and clears `body.overflow` but never returns focus to the element that opened the dialog.

**Symptom:** A keyboard or screen-reader user who opens *Hold it* can Tab straight out of the dialog into the page behind it, where they can interact with content the dialog is supposed to be blocking — while the screen reader still believes it's in a modal. On close, focus is dumped to the top of the document, so they lose their place entirely. This violates WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap's converse requirement for modals).

**Fix:** In `modal()`, store `document.activeElement` before opening. Add a `keydown` handler on the modal card that cycles `Tab`/`Shift+Tab` between the first and last focusable descendants. Set `inert` on `<main>`, `<header>`, and `<footer>` while open. In `closeModal()`, remove `inert` and call `.focus()` on the stored trigger element.

---

### M3 — Six form inputs on `hq.html` have no accessible name
**File:** `hq.html:137, 139, 140, 143, 144, 146`

```html
<div class="field"><label>Barcode</label><input value="0 41333 00133 8" readonly></div>
```

The `<label>` is a **sibling** of the `<input>`, not a wrapper, and carries no `for` attribute. The `<input>` has no `id`, no `aria-label`, and no `aria-labelledby`. Verified in-browser: all 6 report `hasLabel=false`, `inLabel=false`, `aria-label=-`, `placeholder=-`.

**Symptom:** A screen reader announces six consecutive "edit text" fields with no name at all — Barcode, Cost, Price, Minimum, Ideal, Storm minimum are indistinguishable. Clicking the label text also fails to focus its field. (Impact is bounded: these are `readonly` demo fields on the internal HQ page.)

**Fix:** Wrap each input inside its label — `<label>Barcode <input value="…" readonly></label>` — or give each input an `id` and its label a matching `for`. Note `.field label{display:block}` (`site.css:329`) already produces the stacked layout either way.

---

### M4 — Sold-out bakery items fall below AA
**File:** `assets/css/site.css:301–302` · **Pages:** `index.html`, `bakery.html`

`.menu-item.sold .nm{opacity:.45}` measures **3.91:1** at 18.2px/800 (needs 4.5:1 — just under the 18.66px large-text threshold), and `.menu-item.sold .pr{opacity:.4}` measures **3.38:1** at 17.3px/800.

**Symptom:** "Marionberry Hand Pie — Sold out" is legible-ish for most users but fails AA. The dimming is clearly intentional design, but it's overshot: the item name is still information the user needs.

**Fix:** Raise to `opacity:.62` for `.nm` (≈4.6:1) and `.opacity:.58` for `.pr` (≈4.5:1). The line-through on `.nm` already carries the "sold out" signal, so it doesn't need to be this faint.

---

### M5 — Three small-label styles fail AA contrast
**Files:** `assets/css/site.css:232` (`.chips .lbl`), `:250` (`.prod .mt`), footer copyright span

| Selector | Measured | Required | Text | Where |
|---|---|---|---|---|
| `.chips .lbl` (`opacity:.5`) | **3.31:1** | 4.5:1 | "Try" | `index.html:225`, `merc.html`, `bakery.html` |
| `.prod .mt` (`opacity:.55`) | **3.85:1** | 4.5:1 | "Everyday · Aisle 1" | every product row, every page |
| footer `span` (`opacity:.55`) | **4.25:1** | 4.5:1 | "© 2026 Twisted Roots Merc" | all 9 footers |

`.prod .mt` is the significant one — it renders under **every** product name in every search result and department list, and it carries the aisle location, which is the whole point of the site.

**Fix:** `.prod .mt` → `opacity:.68` (≈4.9:1). `.chips .lbl` → `opacity:.68` (≈4.9:1). Footer span → `opacity:.62` (≈4.7:1). All three remain visually de-emphasized.

---

### M6 — Heading hierarchy skips a level on every page
**Pages:** all 9 (footer), plus `merc.html`

Every page's footer jumps from an `<h2>` in the last content section straight to `<h4>` column headings ("The Store", "The Counter", "Twisted Roots"), skipping `<h3>`. Separately, `merc.html:48→113` goes `h1` ("The stuff you actually need.") → `h3` ("Everyday"), skipping `h2`. Verified heading sequences: `index.html` = `13223323333333322333333222444`, `merc.html` = `1333322333333322 3444`.

**Symptom:** Screen-reader users navigating by heading level get a broken outline — footer columns read as sub-sections of something that doesn't exist, and on `merc.html` the department names read as sub-sub-sections of the page title.

**Fix:** Change the three footer `<h4>` elements to `<h3>` on all 9 pages. On `merc.html`, either promote the department headings to `<h2>` or add a section-level `<h2>` above them. Exactly one `<h1>` per page — that part is already correct everywhere.

---

## LOW

### L1 — `"2x4"` and `"2×4"` return different results
**File:** `assets/js/site.js:89` (`norm()`)

`norm()` preserves the `×` (U+00D7) character but does not fold it to `x`. Measured: `"2×4"` → **4 items** (matches product names like *2×4×8 Construction Lumber*, *Project Panel, 2×4 ft Plywood*); `"2x4"` → **2 items** (matches only via the literal `"2x4"` tag on `y01`/`y02`).

**Symptom:** Nobody types `×`. The two Project Panel products are unreachable via the query a real customer would use. **Fix:** add `.replace(/×/g,"x")` to `norm()` at `site.js:89` and normalize the catalog side identically.

### L2 — Search results are not announced to screen readers
**File:** `index.html:233`, `merc.html:95` — `<div class="results" id="searchResults"></div>`

`renderSearch()` (`site.js:197`) replaces `innerHTML` and calls `scrollIntoView`, but the container has no `aria-live`. There is **no `aria-live`, `role="status"`, or `role="alert"` anywhere in the codebase**. A screen-reader user typing in the search box gets no feedback that results appeared or how many. **Fix:** add `role="status" aria-live="polite" aria-atomic="false"` to `#searchResults`.

### L3 — Form success confirmations are not announced
**Files:** `visit.html:163`, `bakery.html:213` (`[data-formnote]`), `assets/js/site.js:536`

The handler un-hides the note and scrolls to it, but with no live region the confirmation ("Sent — Demo form…") is silent for screen readers, and focus stays on the now-disabled submit button. Verified: the form correctly disables all fields and reveals the note. **Fix:** add `role="status"` to the `[data-formnote]` elements and move focus to the note after revealing it.

### L4 — No skip-to-content link
**Pages:** all 9. Verified: zero occurrences of "skip" in the markup. With 7 nav links plus branding before `<main>` (`index.html:146`, `merc.html:65`), keyboard users must tab through the entire header on every page. **Fix:** add `<a class="skip" href="#main">Skip to content</a>` as the first child of `<body>` and `id="main"` on `<main>`.

### L5 — Mobile nav has no keyboard dismissal or focus management
**File:** `assets/js/site.js:445–452`

The burger toggles `.open` and updates `aria-expanded` correctly, but Escape does not close the menu, focus is not moved into it when opened, and it is not dismissed by clicking outside. The nav is `position:fixed` covering the viewport (`site.css:429`). **Fix:** add an Escape handler and an outside-click handler that call the same close path.

### L6 — Render-blocking Google Fonts request
**File:** `index.html:10` (and identically on all 9 pages)

One blocking stylesheet requests **3 families across 14 weights** (Bitter 400/600/700/800/900, Public Sans 300/400/500/600/800, Rye 400). `preconnect` hints are present (lines 8–9) and `display=swap` is set, which is good, but the CSS request still blocks first paint on a third-party origin. **Fix:** drop unused weights (audit which are actually referenced — `site.css` uses 400/500/600/700/800/900 unevenly), and consider self-hosting the subset as WOFF2 to eliminate the cross-origin round trip entirely.

### L7 — Three render-blocking stylesheets in `<head>`
**File:** `index.html:30–32` — `site.css`, `motion.css`, `roots.css` on all 9 pages. Three separate blocking requests where one would do. *(`motion.css` is owned by a concurrent agent — flagging the aggregate pattern only.)* **Fix:** concatenate at build time; `build.py` already exists in the repo root.

---

## NITPICK

### N1 — ~56 MB of unreferenced images in `assets/img/`
34 files are present on disk but referenced by no page, script, or stylesheet. The largest: `tr-interior.png` (10.8 MB), `tr-yard.png` (10.4 MB), `tr-storm.png` (10.1 MB), `tr-storefront-storm.png` (7.4 MB), `tr-storefront.png` (6.5 MB), `logo-trans.png` (2.6 MB). These are the un-downsized PNG originals of images that now ship as JPEGs. They don't affect page weight but they bloat the repo and any deploy. **Fix:** move to a `_source/` directory outside the deploy path, or delete once the JPEGs are confirmed final.

### N2 — No search intent for chainsaw / tree-down
`TR_KITS` includes `kit6` "Chainsaw Day — Tree's down across the drive" (`catalog.js:321`), and the storm intent's note is literally *"Get bar oil now. Everybody remembers the chainsaw and forgets the oil."* — but there is no `TR_INTENTS` entry for it. Verified: `"chainsaw"` returns 3 raw item matches and **no** intent card. Given 18 intents exist for far less likely scenarios (school projects, baby runs), this is a conspicuous gap for a coastal-Oregon storm store. **Fix:** add an intent with `q:["tree down","tree fell","chainsaw","limb down","tree across driveway"]` and `picks:["f79","f80","f81","f69","f70"]`.

### N3 — `visit.html:58` maps link uses a partial address
`https://www.google.com/maps/search/?api=1&query=151+N+Gaither+St…` omits the `101 &` portion that the rest of the page displays. This is likely deliberate (Maps resolves a single street number more reliably), but it's the one place the address string diverges. **Fix:** confirm intentional, or add a comment so a future find-and-replace doesn't "correct" it.

### N4 — `hq.html` "Owner login" is unauthenticated
Linked from all 9 footers as *Owner login*, but `hq.html` is a plain static page with no auth of any kind — anyone who guesses the URL sees the owner dashboard mockup. Fine for a demo; worth a note before this goes near production. **Fix:** if the real HQ ships, put it behind auth and drop the public footer link.

---

## Fixed During Audit

These were live defects when the audit started and were corrected by concurrent work before it finished. Recorded for completeness — **re-verify they haven't regressed**:

1. **Corrupted address string.** `101 &amp; 101 & 151 N Gaither St` appeared in all 9 page footers, in `site.js:12` (`STORE.address`), in the `index.html` JSON-LD `streetAddress` (which also mixed a raw `&` with an `&amp;` inside a JSON string, where entities are not decoded), and in the `visit.html` address `<h2>`. Clearly a botched find-and-replace. Now reads `101 & 151 N Gaither St` everywhere. **Verified correct in all 18 current occurrences.**
2. **Missing `aria-current="page"` on `storm.html`.** The Storm nav link had no current-page marker while the other six did. Now present. **Verified: all 7 nav pages correct; correctly absent on `index.html` and `hq.html`.**

---

## Verification Notes

A few things worth recording so they aren't re-flagged as bugs by the next audit:

- **`body{overflow-x:clip}` (`site.css:44`) makes `document.scrollWidth` useless as an overflow test.** It clamps `scrollWidth` to `clientWidth`, so the standard "compare `scrollWidth` to `innerWidth`" check reports clean even when content genuinely overflows — which is exactly how H1 hides. Overflow must be detected by measuring individual element bounding boxes against the container, which is how H1 was found.
- **The `.ticker-track` marquee on `index.html` reports ~36 elements past the viewport edge.** This is correct behavior — the track is duplicated (`site.js:430`) inside an `overflow:hidden` container to produce a seamless loop. Not a bug.
- **`.rv` reveal elements sit at `opacity:0` until they scroll into view.** Any automated contrast checker will report them as 1:1 failures. All contrast figures above were measured after forcing `.rv.in`, and computed with the full inherited opacity chain composited against the resolved ancestor background — not from the raw `color` value, which would have shown all of them as passing.
- **`bakery` has 0 entries in `TR_CATALOG`** — that is by design; bakery items live in the separate `TR_BAKERY` array and render through `data-bakery`. Not a defect.
