# Twisted Roots Merc — accessibility audit

383 site pages (14 hand-written + 208 blog + 161 recipes), audited and fixed
2026-08-21.

Everything below was **measured**, not asserted. Tools: axe-core 4.x driven
through Playwright/Chromium 147, Lighthouse 12 (the copy bundled with
`@danielsogl/lighthouse-mcp`), the Chrome DevTools Protocol accessibility tree
for real computed accessible names, `getComputedStyle` for the contrast and
motion checks, and a Python heading-order scanner run over every one of the 383
pages. Where I could not measure something I say so.

---

## Contents

1. [Headline numbers](#1-headline-numbers)
2. [a11y.css is not linked yet — the one line you need](#2-a11ycss-is-not-linked-yet--the-one-line-you-need)
3. [Method](#3-method)
4. [Heading order, site-wide](#4-heading-order-site-wide)
5. [Landmarks and structure](#5-landmarks-and-structure)
6. [Keyboard](#6-keyboard)
7. [Forms](#7-forms)
8. [Images and icons](#8-images-and-icons)
9. [Colour and motion](#9-colour-and-motion)
10. [What I changed](#10-what-i-changed)
11. [Patch list — the things I do not own](#11-patch-list--the-things-i-do-not-own)
12. [The single worst remaining issue](#12-the-single-worst-remaining-issue)

---

## 1. Headline numbers

### Lighthouse accessibility, measured before and after

"Before" is not a memory — it is the same pages served through a reverting
proxy (`beforeserver.py`) that undoes every edit in this audit on the fly, so
both runs hit the same CSS, the same JS and the same Chrome, one minute apart.
Desktop form factor, screen emulation off.

| Page | before | after (HTML fixes) | after + `a11y.css` | audits that were failing |
|---|---|---|---|---|
| `index.html` | 98 | **100** | 100 | `heading-order` ×2 |
| `shop.html` | 98 | **100** | 100 | `heading-order` ×2 |
| `merc.html` | 98 | **100** | 100 | `heading-order` ×2 |
| `hq.html` | **92** | **100** | 100 | `heading-order` ×2, `label` ×6 |
| `visit.html` | 98 | **100** | 100 | `heading-order` ×1 |
| `storm.html` | 94 | 96 | **100** | `color-contrast` ×25, `heading-order` ×1 |
| `yard.html` | 94 | 96 | **100** | `color-contrast` ×25, `heading-order` ×1 |
| `bakery.html` | 94 | 97 | **100** | `color-contrast` ×1, `heading-order` ×1 |
| `blog/fix-caulk-a-bathtub.html` | 98 | **100** | 100 | `heading-order` ×1, `td-has-header` ×1 |
| `recipes/bread-baguettes.html` | 100 | 100 | 100 | — |

`hunt.html`, `local.html`, `roots.html` also measured 100 with `a11y.css`.

### axe-core, same 16 pages, all rules including best-practice

| | rule violations | failing nodes |
|---|---|---|
| before | **22** | **79** |
| after HTML fixes (`a11y.css` still not linked) | 3 | 51 |
| after HTML fixes **+ `a11y.css`** | **0** | **0** |

The 51 nodes that survive without `a11y.css` are all one thing: the colour
contrast in §9.

### Heading order across all 383 pages

| | violations | pages clean |
|---|---|---|
| before | **56** | 327 / 383 |
| after | **0** | 383 / 383 |

Exactly one `<h1>` on 383 / 383 pages, before and after.

---

## 2. `a11y.css` is not linked yet — the one line you need

I created `assets/css/a11y.css`. **Nothing loads it.** I was not allowed to
touch `<link>` tags, so it is inert until someone adds it. Three of the
findings in this audit — the promoted blog headings' size, the two colour
contrast failures, and the invisible `.totop` tab stop — depend on it. The
other twenty-odd are already live in the HTML and need nothing.

Every page now loads a single `assets/css/bundle.css` built by `build_css.py`,
whose own docstring says *"If pages are meant to load it, add it to SOURCES"*.
So the preferred fix is one line, not 383:

**Preferred — `build_css.py`, `SOURCES` (line 45).** Add `a11y.css` **last**,
after `perf.css`:

```python
SOURCES = [
    "site.css",
    "motion.css",
    "roots.css",
    "mobile.css",
    "polish.css",
    "perf.css",
    "a11y.css",      # <-- add this line, and keep it last
]
```

then `python build_css.py && python rehash.py`. It must be last for the same
reason `perf.css` is: `.card-in ul li span` and `.tr-prose > h2.a11y-rank-h3`
win on source order, not on specificity alone.

**Alternative — a real `<link>`, if you would rather not bundle it.** On the 14
hand-written pages, immediately after the `bundle.css` line (`index.html:32`
and its siblings):

```html
<link rel="stylesheet" href="assets/css/a11y.css">
```

`build_blog.py:233` and `build_recipes.py:285` need the depth-prefixed form —
in `build_blog.py` (f-string):

```python
<link rel="stylesheet" href="{up}assets/css/a11y.css">
```

and in `build_recipes.py` (`%`-format — remember to add one more `up` to the
argument tuple at the bottom of that template):

```python
<link rel="stylesheet" href="%sassets/css/a11y.css">
```

Then `python build_blog.py && python build_recipes.py && python rehash.py`.

**Measured with the link in place** (via a proxy that injects exactly that
tag): `storm.html`, `yard.html`, `bakery.html`, `merc.html`, `hunt.html`,
`local.html`, `index.html` and a blog post all score **Lighthouse
accessibility 100 with zero failing audits**, and axe-core reports **0
violations / 0 nodes** across 20 pages.

---

## 3. Method

- **Heading order:** `hscan.py` parses every `<hN>` on all 383 files in
  document order, reports level skips, first-heading-not-h1, and `<h1>` counts,
  aggregated by page template. Run before and after. Not spot-checked —
  every page, every heading.
- **axe-core:** injected into a real Chromium page *after* `load` plus 1.5 s,
  so the JS-rendered product grid, cart drawer and crow layers are in the DOM
  when the scan runs. Rule set: `wcag2a, wcag2aa, wcag21a, wcag21aa,
  best-practice`.
- **Lighthouse:** the real thing, headless Chrome, `onlyCategories:
  ['accessibility']`, desktop, screen emulation disabled.
- **Accessible names:** `Accessibility.getFullAXTree` over CDP — the browser's
  own computed name, not a guess from the markup.
- **Keyboard:** actual `Tab` keypresses in a real browser, reading
  `document.activeElement` after each one, plus `:focus-visible` matching and
  computed `outline`/`box-shadow` for the focus indicator.
- **Contrast:** `getComputedStyle` for the rendered colour, opacity and the
  first non-transparent ancestor background, composited by hand, then the WCAG
  relative-luminance formula. Rendered pixels, not authored hex.
- **Motion:** two browser contexts, `reducedMotion: 'reduce'` and
  `'no-preference'`, comparing computed `animation-name`,
  `animation-play-state` and `display` on every animated layer.
- **Visual regression:** computed font-size / weight / family / line-height /
  letter-spacing / margins compared element-by-element before and after every
  heading rank change, plus screenshots.

The dev server is `http://localhost:8899/`. Two throwaway servers were used for
the before/after comparison and killed afterwards; they wrote nothing.

---

## 4. Heading order, site-wide

### What was wrong, counted rather than sampled

| Template | pages | violations | the skips |
|---|---|---|---|
| `blog/*` | 208 | **41** | `h1 -> h3` |
| `index.html` | 1 | 2 | `h1 -> h3`, `h2 -> h4` |
| `merc.html` | 1 | 2 | `h1 -> h3`, `h2 -> h4` |
| `bakery` `board` `journal` `kitchen` `local` `roots` `shop` `storm` `visit` `yard` | 10 | 1 each | `h2 -> h4` |
| `hq.html` | 1 | 1 | `h1 -> h3` |
| `hunt.html` | 1 | 0 | — |
| `recipes/*` | 161 | 0 | — |
| **total** | **383** | **56** | |

Two things that table understates, and both matter:

- **The footer `<h4>` is on all 383 pages, not 12.** The static scan only
  counts it as a *skip* on the 14 hand-written pages, because on blog and
  recipe pages an `<h3>` in the related-cards block happens to sit between the
  `<h2>` and the footer and absorbs the jump. The markup is wrong either way:
  **1,149 `<h4>` tags** (383 × 3) that are not a fourth-level anything.
  PERF-AUDIT patch #2 called this and was right.
- **`shop.html`'s product cards never appear in a static scan at all.** They
  are rendered by `shop.js` after load. axe-core caught them at runtime:
  `article:nth-child(1) > .prodcard__nm` is an `<h3>` directly under the page
  `<h1>`, ×260 cards.

### What I did, and what holds the size

Every rank change was checked by comparing the full computed type spec before
and after. Nothing moved by a pixel.

| Where | change | what preserves the size | measured |
|---|---|---|---|
| Footer, **all 383 pages** | `<h4>` → `<h3>` ×3 | `.foot-top h3` — **`perf.css:255`** (already shipped, already loaded via `bundle.css`) | `11.52px / w400 / Rye / ls 2.304px / uppercase / #D99A34 / margin 0 0 18px` — **identical** |
| `index.html:229`, `hq.html` board header | `<h3>` → `<h2>` | `.board-head h2` — **`perf.css:261`** (already shipped) | `14.4px / w400 / Rye / ls 2.88px / uppercase / #F2B953 / margin 0` — **identical** |
| `merc.html` department cards | *no rank change* — added `<h2 class="visually-hidden">Departments</h2>` above the grid | nothing needed | promoting the four `.lab` `<h3>`s would have gone `24px/w900/Bitter` → `25.5px/w700/Public Sans`; adding the missing level instead costs nothing |
| `shop.html` product grid | *no rank change* — added `<h2 class="visually-hidden">Products</h2>` above `[data-shopgrid]` | nothing needed | this is why PERF-AUDIT patch #15 is **not needed**: `shop.js` is untouched and `heading-order` still clears |
| 41 blog posts | leading `<h3>` → `<h2 class="a11y-rank-h3">`, in `build_blog.py` | **`.tr-prose > h2.a11y-rank-h3` — `a11y.css` §1** | `18.56px / w800 / Bitter / lh 32.48px / ls normal / margin 33.408px 0 9.28px` — **byte-for-byte identical to the bare `<h3>`** |

The blog fix is in the generator, not the output. `fix_headings()` in
`build_blog.py` is a general clamp — it walks the body's headings and pins each
one to at most `previous + 1` starting from the page `<h1>`, and stamps the
original rank on any tag it promotes so `a11y.css` can pin the size back. A
future post that opens at `h4`, or jumps `h2 -> h4`, is corrected the same way
without anyone noticing. Both closing and opening tags are rewritten together
(the regex matches whole elements), so the markup cannot desync.

`merc.html`'s `<h2 class="visually-hidden">` also reaches all 369 generated
pages for free — `build_blog.py:shell()` and `build_recipes.py:shell()` lift
their header and footer straight out of `merc.html`, which is also why the
footer `<h4>` → `<h3>` propagated everywhere from one edit.

**Result: 0 heading-order violations on 383 / 383 pages** (Python scanner), and
**0 `heading-order` findings** from axe-core and Lighthouse on every page
sampled.

---

## 5. Landmarks and structure

### Before

`<header>` / `<nav>` / `<main>` / `<footer>` were present on every page —
PERF-AUDIT §3.11 was right about that, and `bypass` passed. What was missing:

- **No skip link anywhere.** `grep -i skip *.html` matched once, in body copy.
  Measured: the first `Tab` on `index.html` landed on `a.brand`, and a keyboard
  user then walked the same 8 header controls on all 383 pages before reaching
  content.
- **`<main>` had no `id`,** so there was nothing for a skip link to target.
- **Two unnamed `<nav>` landmarks on all 369 generated pages** — the site nav
  and the breadcrumb. axe: `landmark-unique` on `#siteNav`, every blog and
  recipe page.
- **The live region did not exist until something spoke.** `#trLive` is created
  by `site.js:say()` on first use — `document.querySelectorAll('[aria-live]')`
  returned **0** on every page at load. A region inserted and populated in the
  same breath is exactly the case screen readers are least reliable about.

### After

| Check | result |
|---|---|
| skip link, first tab stop | 383 / 383 |
| `<main id="main" tabindex="-1">` | 383 / 383 |
| exactly one `<main>` | 383 / 383 |
| exactly one `<h1>` | 383 / 383 |
| `<nav aria-label="Main">` | 383 / 383 |
| `<nav aria-label="Breadcrumb">` on generated pages | 369 / 369 |
| `#trLive` present in the HTML at load, `role="status" aria-live="polite"` | 383 / 383 |
| pages with more than one nav and an unnamed one | **0** |

### The skip link, verified by measuring where focus lands

Not by looking at it. On `index.html`, `shop.html` and
`recipes/bread-baguettes.html`, from a cold load:

```
Tab      -> A.skip-link "SKIP TO CONTENT"   visible, outline 3px rgb(217,154,52)
Enter    -> document.activeElement === MAIN#main        ← focus really moves
Tab      -> index:   A.btn--amber "DOES THE MERC HAVE IT?"   (first control in main)
            shop:    INPUT#shopSearch
            recipe:  A "HOME" (breadcrumb)
```

`tabindex="-1"` is what makes `.focus()` actually take; without it the browser
moves the *sequential navigation start point* but leaves
`document.activeElement` on `<body>`, and several screen readers do not follow.
Confirmed visually in Chrome too: on focus the link paints at 12,12 as a dark
`#20180F` panel with white Bitter caps and the amber ring. `.skip-link` was
already styled in `polish.css` §8f (now inside `bundle.css`) waiting for
exactly this markup — no CSS follow-up was needed.

**One consequence you should know about:** adding `id="main" tabindex="-1"` to
`<main>` broke `build.py`, which used a literal `"<main>"` string to find and
rebuild the seven `_parts/`-driven pages. It would have silently deleted the
skip target on the next build. I fixed it (`MAIN_RE` now matches attributes and
`keep_main()` preserves whatever opening tag the page already has). While in
there I also scoped the `aria-current="page"` injection to `<nav id="siteNav">`
— the old blind first-match had landed on the storm-bar CTA on `storm.html` and
announced a non-nav link as the current page. I have **not run `build.py`**: it
calls `build_images.rewrite()`, which touches `<img>` tags I do not own. The
`_parts/*.html` sources are already updated to match the live pages, so the
next run of it by whoever owns images will be a no-op on my changes.

### `aria-current`

| Page | before | after |
|---|---|---|
| `journal.html` | on **Merc** | on **Notes** (its own nav entry) |
| `kitchen.html` | on **Merc** | on **Recipes** (its own nav entry) |
| `storm.html` | on the nav link **and** on the storm-bar "See storm stock →" CTA | nav link only |
| `hunt.html` | already correct | unchanged |

UX-AUDIT patch 19 said to move `journal.html`'s marker to *Board*. I marked
*Notes* instead — `journal.html` has its own nav entry pointing at itself, and
`aria-current="page"` means "this link points at the page you are on", so
marking the self-link is the literal truth. Deliberate deviation, flagged here.

---

## 6. Keyboard

Real `Tab` presses in a real browser, reading `document.activeElement` after
each one.

### Focus indicators

Every focusable element on `index.html`, `shop.html` and
`recipes/bread-baguettes.html` was programmatically focused and its computed
`outline` and `box-shadow` read.

**Focusables with no visible focus indicator: 0, 0 and 0.** The site ships a
consistent `outline: 3px rgb(217,154,52)` (and a box-shadow variant on form
inputs). This is genuinely good and I found nothing to fix. The one apparent
miss — `.carttoggle` showing no ring — was an artefact of focusing it by
*click*: `:focus-visible` correctly withholds the ring from a mouse click, and
focusing the same button from the keyboard produces the ring.

### Elements reachable but not operable

**One, on every page above 1010px: `.totop`.**
`mobile.css:653` (now `bundle.css:1110`) gives it `display:flex; opacity:0`
until JS adds `.show`. `display:flex` keeps it in the tab order, so an
invisible "Back to top" button sits in the tab sequence. Measured on
`recipes/bread-baguettes.html`: **tab stop 34 of 35**, `opacity: 0`, right
before focus leaves the document.

Fixed in `a11y.css` §3 with `.totop:not(.show){visibility:hidden}`. Measured
after: `visibility: hidden`, and 70 consecutive `Tab` presses never reach it.
I deliberately did **not** add `visibility` to the transition list — doing so
delays the state flip by 250 ms, which is long enough for a fast Tab to still
land on the button. (I made that mistake first, measured it, and backed it out.)

### Elements operable but not reachable

None found.

### The nav submenus — hover AND click

This is the specific path I was asked to verify. The markup is better than the
audits implied: `[data-subtoggle]` is a real `<button>` with `aria-expanded`
and `aria-controls`, and `<nav>` now carries `aria-label="Main"`.

```
focus  Shop toggle        aria-expanded="false"
Enter                     aria-expanded="true"   #sub-shop display:flex, height 223px
Tab                       "SHOP EVERYTHING"      (inside the submenu)
Tab                       "THE MERC"
Tab                       "THE YARD"
Escape                    focus back on the Shop toggle, aria-expanded="false"
```

That is a correct keyboard path — open, traverse, close, focus returns. Two
real problems around it:

1. **Hover opens the menu without touching `aria-expanded`.** Measured: after
   `page.hover('[data-navitem]')`, `#sub-shop` has height 223px and is visible,
   while its button still reports `aria-expanded="false"`. The state is a lie
   for anyone reading it. The open-on-hover is CSS
   (`.navitem:hover > .subnav`, `bundle.css`) so I cannot fix it from where I
   sit — **patch A2**.
2. **A hover-opened menu collapses under you the moment you start tabbing.**
   There is no `:focus-within` rule, so the links vanish mid-traversal as soon
   as the pointer leaves. Fixed in `a11y.css` §4:
   `.navitem:focus-within > .subnav{display:flex}`. Verified with the pointer
   parked 1300,860 (nowhere near the nav) and `.open` stripped: submenu
   `display: flex` while focus is inside, `display: none` the instant focus
   moves to the basket button.

### The two dialogs

| | suggestion modal (`site.js`) | cart drawer (`cart.js`) |
|---|---|---|
| `role="dialog"` | yes, on `.modal-card` | yes, on `.cartdrawer__panel` |
| `aria-modal="true"` | yes | yes |
| accessible name | `aria-labelledby="trModalTitle"`, title changes per context ("What should we carry?", "Hold this kit") | `aria-label="Your basket"` |
| focus moves in on open | **partly** — lands on the phone link in the demo note, not the dialog or the first field | **no** — focus stays on the basket button |
| focus trap | **yes**, 9 consecutive Tabs all stayed inside and wrapped | **no** — the *first* Tab escapes to "DOES THE MERC HAVE IT?" behind the scrim, and every Tab after it walks the page underneath |
| Escape closes + returns focus | **yes**, back to the trigger | Escape closes, but focus is left wherever it drifted to on the page behind |

Someone has clearly been working on `site.js` — it has a `trap()` helper and a
`say()` live-region helper, and the modal is in good shape. `cart.js` has not
had the same treatment. That gap is **patch A3**, and it is the worst thing
left on the site.

---

## 7. Forms

Four surfaces checked end to end, by filling and submitting them in a browser.

### Labels, required, and names

| Form | fields | label tied to input | `required` | accessible name computed |
|---|---|---|---|---|
| `visit.html` contact | `#cn` `#cc` `#cm` | 3/3 via `for`/`id` | 3/3 | 3/3 |
| `bakery.html` pickup order | `#on` `#op` `#ow` `#ot` `#od` | 5/5 | 3/5 (the two `<select>`s always have a value) | 5/5 |
| "What should we carry?" modal | `#tw` `#tb` `#tn` `#tp` | 4/4 | 1/4 (correct — only the request itself is mandatory) | 4/4 |
| pickup hold modal | `#hn` `#hp` `#hq` | 3/3 | 2/3 | 3/3 |
| `hq.html` "Add product" | 6 readonly inputs | **0/6 before** | n/a | **0/6 before → 6/6 after** |

`hq.html:163-172` had six `<div class="field"><label>Barcode</label><input
value="…" readonly>` — a `<label>` with no `for`, an `<input>` with no `id`,
six times, all focusable and all nameless. axe rated it **critical**;
Lighthouse scored the page **92**. I gave each input an `aria-label` matching
its visible label. Mirrored into `_parts/hq.html` so `build.py` cannot undo it.
`hq.html` is now **100**.

Its table also opened with a bare `<th></th>` (`empty-table-header`), and the
blog data tables did the same, which is also what produced `td-has-header` on
those posts. Both now carry `<th scope="col"><span
class="visually-hidden">…</span></th>`, and every other header cell in the blog
tables gained `scope="col"` — done in `build_blog.py`, so all 208 posts.
`aria-label` on a `<th>`, which I tried first, does *not* satisfy axe's
`empty-table-header`; measured, then replaced.

### `#trLive` — is it used, or just present?

**Both halves of the question had a bad answer, and one is now fixed.**

- *Present?* No. Before this pass, `#trLive` did not exist in any HTML file. It
  was created on demand by `site.js:say()`, so at page load every page had
  **zero** live regions (`shop.html` excepted — it has `#shopCount`). Creating
  an `aria-live` node and writing to it 40 ms later is the pattern that
  screen readers most often miss entirely. I added the region to the static
  HTML of all 383 pages:
  `<p id="trLive" class="visually-hidden" role="status" aria-live="polite"></p>`.
  `site.js:say()` finds it by id and reuses it — no JS change required, and the
  announcement now goes into a region that has existed since first paint.
- *Used?* Only by the basket. Measured on `shop.html`, pressing Add:
  `#trLive.textContent === "Toilet Paper, 12 Double Rolls added. Basket has 1
  item."` That is exactly right. But **none of the four forms speak**. After a
  successful submit of the contact form, the pickup order, the suggestion modal
  or the pickup hold, `#trLive` is still empty and `document.activeElement` is
  `<body>`. You complete a reservation and are told nothing, from nowhere. That
  is **patch A5**, and it is `site.js`, so I could not do it.

`shop.html`'s `#shopCount` (`role="status" aria-live="polite"
aria-atomic="true"`) is used properly and re-announces on every filter change —
"260 things on the shelf, all of them in this list." That pattern is the model;
it should be lifted onto merc/storm/yard/hunt, as UX-AUDIT already said.

### Error states

No inline error messaging anywhere: `aria-invalid`, `role="alert"` and any
error class are absent from all seven form surfaces. All of them fall back to
native constraint validation. That is not nothing — measured, submitting the
empty contact form moves focus to `#cn` and produces
`validationMessage: "Please fill out this field."`, which is announced — but a
native bubble evaporates on blur and cannot be re-read. **Patch A7.**

### The result of submitting

- Both `[data-formnote]` success notes (`visit.html`, `bakery.html`) now carry
  `role="status"`. Mirrored into `_parts/`. That is as far as HTML can take it;
  the note is toggled with `hidden`, and moving focus to it is the JS half.
- `visit.html` still disables **every** control on submit, permanently
  (measured: `disabled` on all four of input, input, textarea, button), so the
  form cannot be corrected or resubmitted without a page reload, and focus
  drops to `<body>`. **Patch A6.**

---

## 8. Images and icons

Nothing to fix. Verified rather than assumed.

**Static, all 384 HTML files:**

```
<img> tags:              438
missing alt:               0
```

**Runtime, 16 pages after load (catches the JS-injected hanging sign, crow
sprites and decorative layers, which the static scan cannot see):**

```
<img> in the live DOM:   111
missing alt:               0
alt=""  (decorative):     24    ← deliberate, and correct: crow sprites,
                                  wave dividers, the hanging-sign layers
inline <svg>:             78
  aria-hidden="true":     78
  labelled:                0
  UNMARKED:                0
controls with no accessible name (CDP accessibility tree, computed):  0
```

Every inline SVG on the site is decorative and every one is hidden. There is no
icon-only button anywhere without a name — `.burger` has `aria-label="Menu"`,
`.carttoggle` has `aria-label="Basket, empty"` (and it updates), the modal close
has `aria-label="Close"`. `a.brand` looks nameless in a naive `innerText` check
because `.brand-txt` is collapsed at desktop widths, but the browser's own
computed accessible name is non-empty — I checked the AX tree specifically
because I had flagged it as a suspect.

PERF-AUDIT §3.11's claim that the decorative layers all carry `aria-hidden` is
confirmed, at runtime, on every page I sampled.

---

## 9. Colour and motion

### Did the four earlier contrast fixes hold? Yes — all four, re-measured

PERF-AUDIT §6.2 fixed four failures in `perf.css` by raising opacity. Every one
is still in the cascade (`perf.css` is now concatenated into `bundle.css`,
which is what the pages load) and every one still passes against the actual
rendered pixels:

| Selector | page | opacity now | contrast now | |
|---|---|---|---|---|
| `.prodcard__mt` | `shop.html`, 260 nodes | 0.72 | **6.72:1** | PASS |
| `.req .ct` | `board.html`, 8 nodes | 0.68 | **5.64:1** | PASS |
| `.stat .k` | `index.html`, 3 nodes | 0.68 | **5.86:1** | PASS |
| `.drive-cell b` | `yard.html` / `bakery.html`, 4 nodes each | 0.82 | **5.22:1** | PASS |

### Two failures that pass did not reach

Both are opacity, not colour — same species as the four above, so the same
minimal correction applies.

| Selector | source | rendered | before | after | nodes |
|---|---|---|---|---|---|
| `.card-in ul li span` — the price on every stock card | `site.css:291` / `bundle.css`, `opacity:.55` | `#20180F` at .55 on `#FBF7EF`, 14.88px / 600 | **3.85:1 FAIL** | `.68` → **5.86:1** | **25 on `storm.html`, 25 on `yard.html`** |
| `.serif-caps` "While you're here…" | **inline** `style="opacity:.6"` at `bakery.html:389` | `#20180F` at .6 on `#EAE0CE`, 12.8px / 700 | **4.19:1 FAIL** | `.72` → **6.05:1** | 1 |

Both need 4.5:1 — neither qualifies as large text (14.88px bold is under the
18.66px bold threshold; 12.8px is nowhere near it).

Fixed in `a11y.css` §2. The bakery one is an **inline** style, so the override
needs `!important` and a scoped selector; the cleaner fix is to delete the
inline value, which is **patch A1**. Screenshotted before and after: the price
column is still visibly lighter than the item name, so the intended hierarchy
survives, it is just legible now.

### `prefers-reduced-motion`

Measured in two browser contexts on `index.html`, comparing computed
`animation-name` / `animation-play-state` / `display` on every animated layer.
All four things I was asked about are honoured:

| Layer | `no-preference` | `reduce` | |
|---|---|---|---|
| **Hanging sign** `.hangsign`, `.hangsign img` | transition 0.45s | `animation:none`, `transition: 1e-06s` | honoured |
| **Roots** `.rootsys .rt-strand` (14 strands) | static, opacity .2–.3 | `animation:none`, opacity pinned .2 (`roots.css:52`) | honoured |
| **Crows** `.crow` ×5 | `crow-cross` 74–130 s + `crow-flap`/`crow-drift` | `.crow{display:none}`, sprite `animation:none`, `.perchcrow` removed from the DOM entirely | honoured |
| **Rain** `.rainlayer` ×2 | `mo-rain-far` 2.1 s running | `animation:none` | honoured |
| **Rain, storm mode ON** | `mo-rain-far` running, opacity .42 | **`animation:none`**, opacity .42 | honoured — I set `data-storm="on"` and re-measured, because the storm path is a separate rule |
| Hero video `video.hero-img` | playing, opacity .66 | `display:none` | honoured |
| Ticker `.ticker-track` | `tick` 55 s | `animation:none` | honoured |
| Reveal-on-scroll `.rv` | fade + 22px rise | opacity 1, no transform, no transition | honoured |

The JS agrees with the CSS: `crows.js:31,170`, `roots.js:31`, `motion.js:30`
and four sites in `site.js` all consult
`matchMedia("(prefers-reduced-motion: reduce)")`, including the smooth-scroll
in `site.js:705`. Nothing to fix here.

---

## 10. What I changed

### `assets/css/a11y.css` — new, **not linked yet** (see §2)

Six sections, all additive, all measured: promoted-heading size preservation,
the two contrast corrections, `.totop`, the submenu `:focus-within` rule, a
note on the skip-link focus ring (emits nothing on purpose), and a restatement
of `.visually-hidden` as a safety net.

### All 14 hand-written pages

- `<a class="skip-link" href="#main">Skip to content</a>` as the first child of
  `<body>`
- `<main>` → `<main id="main" tabindex="-1">`
- `<nav class="nav" id="siteNav">` → `+ aria-label="Main"`
- footer `<h4>` ×3 → `<h3>` ×3
- `<p id="trLive" class="visually-hidden" role="status" aria-live="polite"></p>`
  before `</body>`

### Page-specific

- `index.html`, `hq.html` — board header `<h3>` → `<h2>`
- `merc.html` — `<h2 class="visually-hidden">Departments</h2>` above the
  department grid
- `shop.html` — `<h2 class="visually-hidden">Products</h2>` above
  `[data-shopgrid]`
- `hq.html` — `aria-label` on 6 readonly inputs; `scope="col"` on every header
  cell; a `visually-hidden` label for the status column
- `visit.html`, `bakery.html` — `role="status"` on `[data-formnote]`
- `journal.html`, `kitchen.html`, `storm.html` — `aria-current` corrections
- `_parts/hq.html`, `_parts/visit.html`, `_parts/bakery.html` — same edits
  mirrored, so `build.py` cannot revert them

### Generators

- **`build_blog.py`** — `fix_headings()` (rank clamp + size-preserving class +
  `scope`/label on table headers), `<main id="main" tabindex="-1">`,
  `aria-label="Breadcrumb"` on the breadcrumb nav
- **`build_recipes.py`** — `<main id="main" tabindex="-1">`,
  `aria-label="Breadcrumb"`
- **`build.py`** — `MAIN_RE`/`keep_main()` so a rebuild preserves `main#main`
  instead of deleting it; `aria-current` injection scoped to `<nav id="siteNav">`

Skip link, nav label, footer headings and the live region reach the 369
generated pages automatically, because both generators lift their chrome out of
`merc.html`.

### Build verification

```
python build_blog.py     -> Built 208 posts, 145,457 words; journal.html + blog/*.html + sitemap updated
python build_recipes.py  -> Built 161 recipes; kitchen.html + recipes/*.html + sitemap updated
python rehash.py         -> scanned 391 pages; re-stamped 0
```

All clean, no warnings. `build.py` was edited but deliberately **not run** — it
calls `build_images.rewrite()`, which is not mine.

---

## 11. Patch list — the things I do not own

Ordered by how much they cost a real user.

---

### A3 — Focus management for the cart drawer *(`assets/js/cart.js`)* — **the big one**

The drawer opens with correct ARIA and no focus handling at all. Measured, from
the keyboard: focus stays on the basket button, the **first** Tab lands on
"DOES THE MERC HAVE IT?" *behind the scrim*, and Escape leaves focus wherever
it drifted.

`site.js` already has the two helpers this needs — `trap()` and a
`modal._returnTo` pattern. Reuse them rather than writing new ones.

In `cart.js`, at the point the drawer is opened (after `paint()`, around
`cart.js:197`):

```js
    drawer._returnTo = document.activeElement;
    var f = document.querySelector(".cartdrawer__x");
    if (f) setTimeout(function () { f.focus(); }, 40);
    trap(document.querySelector(".cartdrawer__panel"));
```

and in the close path (around `cart.js:198`):

```js
    if (drawer._returnTo && document.contains(drawer._returnTo)) drawer._returnTo.focus();
    drawer._returnTo = null;
```

If `trap()` is not exported from `site.js`, the shared helper in UX-AUDIT patch
3c is the same shape. Also guard the `document.body.style.overflow` reset so
closing the drawer does not unlock scrolling while the modal is still open
(UX-AUDIT patch 3e).

---

### A5 — Every form completes silently *(`assets/js/site.js`)*

`say()` and `#trLive` both exist and work — the basket proves it. The four form
submit handlers do not call them. Measured after a successful submit of all
four: `#trLive.textContent === ""`, `document.activeElement === <body>`.

At each submit success point (`site.js` ≈ 827, 836, 851, 860), add the
announcement and move focus to the receipt heading:

```js
    say("Reserved. Reservation " + num + ". We'll hold it behind the counter until close.");
    var h = document.querySelector("#trModalTitle"); if (h) { h.tabIndex = -1; h.focus(); }
```

Use wording specific to each form — the pickup hold, the bakery order, the
suggestion and the contact form are four different outcomes.

---

### A6 — `visit.html` disables the whole form forever *(`assets/js/site.js:865-871`)*

Measured: after submit, `disabled` is true on all four controls. The form
cannot be corrected or resubmitted without a reload, and focus lands on
`<body>`. Disable the submit button only, and offer "Start another order".
(This is UX-AUDIT M8 / patch 22; I am restating it because it is also a
keyboard dead end, not only a UX one.)

---

### A4 — Modal initial focus lands on a phone number *(`assets/js/site.js`)*

Measured: opening "What should we carry?" or "Hold this kit" from the keyboard
puts focus on the `(541) 555-0134` link inside the demo note — the first
focusable in the panel — rather than on the dialog or its first field. The trap
and the focus-return are both correct; only the entry point is wrong. Focus the
dialog heading (`#trModalTitle`, `tabIndex = -1`) or the first form control.

---

### A7 — No inline error state on any form *(`assets/js/site.js`)*

`aria-invalid`, `role="alert"` and any error class are absent from all seven
form surfaces. Add a `submit` handler that calls `checkValidity()`, sets
`aria-invalid="true"` and points `aria-describedby` at a
`<p class="field__err" role="alert">` under the offending field. Native bubbles
are announced once and then gone.

---

### A2 — Hover opens the submenu without updating `aria-expanded` *(`bundle.css` source + `assets/js/site.js`)*

Measured: after hovering `[data-navitem]`, `#sub-shop` is 223px tall and
visible while `[data-subtoggle]` still reports `aria-expanded="false"`.

Two ways out. Either drop the CSS hover-open
(`.navitem:hover > .subnav{display:flex}`, `site.css` ≈ 1169) and let the
existing `mouseenter`/`click` JS set `.open` and `aria-expanded` together — one
code path, one source of truth. Or keep it and have `site.js` toggle
`aria-expanded` on `mouseenter`/`mouseleave` as well. The first is cleaner.
`a11y.css` §4 already handles the *keyboard* consequence
(`:focus-within`); this patch is about the state being truthful.

---

### A1 — `bakery.html:389` inline opacity

```html
<!-- before -->
<p class="serif-caps" style="margin:0 0 12px; opacity:.6">While you're here…</p>
<!-- after -->
<p class="serif-caps" style="margin:0 0 12px; opacity:.72">While you're here…</p>
```

`#20180F` at .6 on `#EAE0CE` is **4.19:1** at 12.8px/700 and needs 4.5:1;
`.72` gives **6.05:1**. `a11y.css` §2b covers it with `!important` so the page
passes either way, but an inline style that needs an `!important` override is a
smell — better to fix it at source. Mirror into `_parts/bakery.html`.

---

### A9 — `<span class="lab">` contains `<h3>` and `<p>` — invalid nesting

`index.html` ×11, `merc.html` ×4. A `<span>` is phrasing content and cannot
legally contain flow content. Browsers cope and no tool scores it, but
validators will not, and it is the kind of thing that breaks the day someone
switches to a stricter parser. Change `<span class="lab">` to
`<div class="lab">`; `.good .lab` is positioned absolutely so `display` is
irrelevant and nothing moves. PERF-AUDIT patch #16 called this too. I left it
because it is neither a heading tag nor an ARIA attribute.

---

### A8 — `role="status"` on the modal body *(`assets/js/site.js:357`)*

`.modal-body` has no `role` and no `aria-live`, so re-rendering the panel
in place (form → receipt) is silent. Add
`role="status" aria-live="polite"` when the element is created. Pairs with A5.

---

### A10 — `autocomplete` and `inputmode`

`site.js`'s hold form already has `autocomplete="name"` / `"tel"`. The
`visit.html` (`#cn`, `#cc`) and `bakery.html` (`#on`, `#op`) fields do not, and
the two "Phone or email" fields have no `inputmode`. Cheap, and it is WCAG 1.3.5
(Identify Input Purpose).

---

### Not an accessibility bug, but noticed while measuring

`hq.html` throws `TR_CATALOG is not defined` (`cart.js:57`) on every load — it
is the only page of the six I instrumented that does not load `catalog.js`.
The other five are console-clean. Not mine (I touched no `<script>` tag), and
it costs no accessibility points, but the basket cannot resolve an item on that
page. Passing it to whoever owns the script loader.

### Not needed any more

- **PERF-AUDIT patch #15** (`shop.js` `.prodcard__nm` `<h3>` → `<h2>`) —
  superseded. Adding `<h2 class="visually-hidden">Products</h2>` above the grid
  fixes `heading-order` without touching `shop.js` at all, and keeps the cards
  at the right rank relative to a real section heading. `shop.html` measures
  100.
- **PERF-AUDIT patch #17's "add a skip link"** and **UX-AUDIT patch 28** —
  done, on all 383 pages, and verified by measuring where focus lands.
- **PERF-AUDIT patch #17's `td-has-header`** — done in `build_blog.py`,
  all 208 posts.

---

## 12. The single worst remaining issue

**The cart drawer is a keyboard trap in reverse — patch A3.**

Every other dialog on the site behaves. The suggestion modal traps focus
correctly, wraps at both ends, and returns focus to its trigger on Escape. The
drawer does none of it: opening it leaves focus on the basket button, the very
first `Tab` steps *out* of the dialog and onto a link behind the scrim, and
every `Tab` after that walks a page the user cannot see and did not ask to be
on. Escape closes the drawer but leaves focus stranded wherever it wandered to.

It is the worst one for three reasons. It sits on the *primary* journey — the
basket is the end of every shopping path on the site, and it is reachable from
the header of all 383 pages. It scores zero points in any automated tool, so
nothing else in this report will ever flag it. And it is the one failure here
that makes a task genuinely impossible rather than merely unpleasant: a screen
reader user who opens the basket has no reliable way to find out what is in it,
because the reading cursor is not in the dialog and the dialog is
`aria-modal="true"`, which tells the screen reader to ignore everything outside
it. The result is a user standing in an empty room.

The fix is about ten lines, and `site.js` already contains both helpers it
needs.
