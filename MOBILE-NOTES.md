# Mobile & Responsive Refinement — findings and fixes

Everything below lives in **`assets/css/mobile.css`**, which must be loaded
**after** `site.css`, `motion.css` and `roots.css`:

```html
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/motion.css">
<link rel="stylesheet" href="assets/css/roots.css">
<link rel="stylesheet" href="assets/css/mobile.css">   <!-- last -->
```

No existing `.html`, `.css` or `.js` file was touched.

## How it was tested

Every page (`index`, `merc`, `bakery`, `yard`, `storm`, `local`, `roots`,
`visit`, `hq`) was rendered in an iframe pinned to an exact CSS width —
**360, 390, 414, 768, 834, 1024** — with classic scrollbars suppressed so the
layout viewport matched the nominal width the way a phone's does. At each
width a script compared `document.documentElement.scrollWidth` against
`window.innerWidth` and then walked every element in `<body>`, flagging any
whose `getBoundingClientRect().right` exceeded the viewport (or whose `left`
went negative) **and** which no ancestor below `<body>` clipped. The detector
was validated by injecting a deliberate 600px-wide probe into a 360px
viewport — it caught it.

Interactive states were driven too: burger open, hold-modal open, tables
scrolled, storm mode on, short landscape viewport.

---

## 1. Horizontal overflow

**Result: zero genuine overflow escapes, at any of the six widths, on any of
the nine pages — before or after my changes.** The lead dev's base layout is
clean on this. The `body{overflow-x:clip}` in `site.css` was *not* masking
anything: with the clip discounted, nothing still reached past the viewport.

The two intentionally-clipped pieces were checked rather than "fixed":

| Piece | Status |
|---|---|
| `.ticker-track` (`width:max-content`, animated `translateX(-50%)`) | Contained by `.ticker{overflow:hidden}` at 360–1024. Left alone. |
| `.hangsign` swing arc (`--hs-sway` / `--hs-swing` rotations) | The `padding-inline:calc((drop + h) * .11)` arc reservation holds. At 360 the sign's right edge is **85px**; the burger starts at **291px**. No overlap, no overflow. Left alone. |
| `.bird` flight path (`translate3d(116vw, …)`) | Contained by `.birds{overflow:hidden}`. Left alone. |

What I *did* add is insurance, not a fix: `pointer-events:none` and
`max-width:100% / overflow:hidden` are re-asserted on `.rootsys`, `.rain`,
`.rainlayer`, `.birds`, `.bird`, `.fogdrift`, `.wavedivider`, `.treeline` and
`.hero::after` so a future edit to `motion.css` or `roots.css` cannot turn a
decorative layer into a tap-blocker or a scrollbar. All of them already
measured `pointer-events: none` at 360.

---

## 2. Problems found and fixed

Each row: what was wrong, where it shows, and the rule that fixes it.

### The three worst

**A. Product rows were built wrong at ≤640px** — *every page with a `.prod`
list (`merc`, `index` search results, `storm`, `yard`, `local`, `bakery`), at
360 / 390 / 414.*
`site.css` reflows `.prod` to `1fr auto` and then pins `.pr` and `.act` to
column 2 and `.stk` to column 1. Auto-placement resolved that into **three**
rows — name / (chip + price) / button — with a dead empty cell bottom-left,
the price stranded a row above the button it belongs to, and rows running
**166–187px tall**. On a 137-item list that is a ~23,000px page.
Re-plotted as a real mobile list row with explicit areas:

```
"nm  nm  nm"      Toilet Paper, 12 Double Rolls
"stk pr  act"     EVERYDAY · AISLE 1
                  [IN STOCK]        $11.99  [ HOLD IT ]
```

`grid-template-columns:auto minmax(0,1fr) auto` + `grid-template-areas`, with
`.prod > :first-child{grid-area:nm; min-width:0}`. The name now gets the full
row width (long names wrap less), the price sits directly beside its button,
and the row is **127px** instead of 187 — three products now fit where two
did. Added `:active` feedback because `:hover` never fires on a phone, and a
≤380px tier that shrinks the chip and button padding before anything wraps.

**B. The modal close button was 21×24px and scrolled away** — *`#trModal`,
any page, 360×600.*
On a short phone the card scrolls internally (content 688px in a 540px card),
and `.modal-head` scrolled with it, so the only close affordance disappeared
off the top. Fixed: `.modal-head{position:sticky; top:0}` and the button is
now a 44×44 flex box with negative margins so it does not grow the header.
Also `max-height:100%` (instead of `90vh`) so the card respects the modal's
own padding and the safe-area inset, plus `overscroll-behavior:contain`.
Verified: scrolling the card to the bottom leaves Close on screen.

**C. Sub-44px tap targets throughout** — *all pages, all phone widths.*
Measured at 390 on `index`: burger **70×43**, `.btn--sm` **41** tall,
`.stormtoggle` **40**, and every footer link a **18px-tall** hit box (14 of
them), plus the `tel:` link. All now clear 44px:
`.burger{min-height:44px;min-width:44px}`, `.btn--sm{min-height:44px}`,
`.chip{min-height:44px}`, `.foot-top a` / `.foot-legal a` /
`a[href^="tel:"]` / `a[href^="mailto:"]` as `inline-flex` with
`min-height:44px` (and `min-width:44px` on footer links, for the short ones
like "Lunch"). `.nav a` already measured 58px — left as-is.
**After: 0 sub-44px targets on all nine pages at 360 / 390 / 414 / 768.**

### The rest

| # | Problem | Where | Fix |
|---|---|---|---|
| 1 | `.h-mega` sat on its clamp floor (2.6rem = 41.6px) below 400px and overset the hero's 3 authored lines into **6** rendered lines, 232px tall | `index` @360 | `@media (max-width:400px){.h-mega{font-size:max(2rem,10.2vw)}}` → 36.7px, back to **3 lines / 102px** |
| 2 | Tables scroll correctly but with **no affordance** — nothing tells the user there are more columns | `yard`, `storm`, `visit`, `hq` @≤760 | Sticky `::after` hint — "⟷ Swipe the table" — that rides the left edge while you swipe. Scoped with `:has(table.tr-table:not([style*="min-width:0"]))` so the hours table on `visit.html` (which opts out with inline `min-width:0` and does **not** scroll) never shows a hint it can't honour |
| 3 | `#hqTable` is 7 columns squeezed into `min-width:560px` — unreadable at 360 | `hq` @360–414 | `#hqTable{min-width:720px}`; it scrolls inside `.tablewrap` like the others |
| 4 | `.board-grid` / `.drive-grid` go two-up at ≤1080 but only have `border-left` — rows 1 and 2 merged into one visual block | all pages with a board or drive strip, 360–1024 | `border-top` on `:nth-child(n+3)` |
| 5 | `.stat-row` (`minmax(170px,1fr)`) collapsed to **one** column at 360 — a tall stack of near-empty cards | `index`, `merc`, `storm`, `visit`, `roots` @≤640 | Forced 2 columns; `:last-child:nth-child(odd)` spans the row so the 1px grid gap never shows an empty grey cell (index has 3 stats, the rest have 4) |
| 6 | `.foot-top` collapsed to one column at ≤640 — four stacked blocks, a very long footer | all pages @≤640 | 2 columns, brand block spans full width, logo 190→150px |
| 7 | Mobile nav capped at `calc(100vh - var(--head-h))` — on iOS the last item can sit under the collapsing URL bar | all pages @≤900 | `100dvh` (with the `vh` line kept first as fallback), `overscroll-behavior:contain` so scrolling the menu doesn't chain into the page, `-webkit-overflow-scrolling:touch`, and a drop shadow so it reads as a layer |
| 8 | The page scrolled freely behind the open nav panel | all pages @≤900 | `body:has(.nav.open){overflow:hidden}` — CSS-only, no JS touched. Scoped to `(hover:none)` so a narrow **desktop** window doesn't jump by the width of its classic scrollbar |
| 9 | No current-page indicator in the mobile menu — `.nav a::after` is `display:none` at ≤900 | `merc`, `bakery`, `yard`, `storm`, `local`, `roots`, `visit` | 3px rust inset bar + rust text on `[aria-current="page"]`; amber in storm mode |
| 10 | No safe-area handling anywhere — header, storm bar, nav panel and footer ran under the notch / home indicator | all pages, notched phones | `env(safe-area-inset-*)` on `.head-in`, `.stormbar .wrap`, `.nav` (incl. bottom), `.site-foot`, `.modal`; `.wrap` variants get left/right insets in landscape, where the notch actually bites body copy |
| 11 | Storm banner was **147px** tall at 360 (four wrapped lines plus a link on its own row) | any page with `data-storm="on"` @≤480 | Tighter type, `padding:9px 0`, `a{margin-left:0}` → **110px** |
| 12 | `.hero{min-height:min(78vh,760px)}` — the first fold jumps when the mobile URL bar collapses | all pages @≤900 | `78dvh` |
| 13 | Short landscape phones got a 70px header plus a 78vh hero on a 400px-tall viewport | 720×400 and similar | `--head-h:56px`, smaller `.hangsign--sm`, `.hero{min-height:auto}`, tighter `.hero-in` padding. Bounded by `max-width:950px` so a merely-short desktop window is unaffected |
| 14 | No word-break rule on display type — a long product or place name had nothing to fall back on | all pages @≤900 | `overflow-wrap:break-word` on `.h-mega/.h1/.h2/.h3/.h4`, `.prod .nm`, `.menu-item .nm`, `.good .lab h3`, `.stat .v`, `.board-cell .v`, `.drive-cell .t`, `.result-head h3` (breaks only when it must) |
| 15 | Ragged 2–3 line headings and single-word orphans in body copy | all pages @≤900 | `text-wrap:balance` on `.h1/.h2/.h3/.hero-tag/.foot-motto/.eyebrow/.result-head h3/.good .lab h3`; `text-wrap:pretty` on `.lede`, `.card-in p`, `.req .nt`, `.menu-item .ds`, `.intent-note` |
| 16 | `.band` kept 64px of vertical padding at 360, and the hero tag/motto letter-spacing was set for a wide screen | all pages @≤480 | `.band{padding:56px 0}`, `.band--tight{34px}`, tighter footer/eyebrow/btnrow/pillrow rhythm; `.hero-tag` letter-spacing `.26em → .18em` below 400px |
| 17 | 641–900px (the awkward middle) let `auto-fit` decide `.goods` / `.cards` / `.foot-top` | `merc`, `index`, `yard` @768/834 | Forced clean 2-up; `.prod` keeps its desktop 4-column row here but gets a 44px button and roomier gaps |
| 18 | Department tiles are 4:5 photos — eight of them stacked one-up is a lot of thumb | `index`, `merc` @≤640 | `aspect-ratio:4/3.4`, tighter label insets |
| 19 | Board head `.when` used `margin-left:auto` and fought the wrap | pages with `.board` @≤640 | `margin-left:0; flex-basis:100%` — the timestamp gets its own line |

### Forms (item 9 of the brief)

Already correct — every input measured **16px** at 360 and 390, so iOS will
not zoom on focus. I added an explicit floor anyway
(`.field input/.formbox/.modal/bare input,textarea,select{font-size:16px}`)
so a future `.9rem` tweak can't reintroduce the zoom, plus `min-height:48px`
on inputs and a `clamp(1rem,4.4vw,1.3rem)` on `.searchbox input` that can
never resolve below 16px.

---

## 3. Deliberately left alone

- **The ticker, the hanging sign and the birds.** Verified contained (see
  §1). Not touched.
- **`body{overflow-x:clip}`** in `site.css`. It isn't hiding anything, and
  removing it is the lead dev's call.
- **`.modal-card`'s `pop` animation.** Untouched. (Note for whoever owns
  `site.css`: it has no `animation-fill-mode`, and under automation the card
  measured stuck at `scale(.95)`. Harmless in a real browser, but `both`
  would make it deterministic.)
- **"Check Stock" (`.head-cta .btn`) stays hidden below 900px.** There is no
  room for it beside the sign, the wordmark and the burger at 360 — the sign
  ends at 85px and the burger starts at 291px. Moving it into the nav panel
  needs a markup change, which I don't own. Flagging it: the primary CTA is
  currently absent from the phone header.
- **`.meters` stays one-up at 360.** `storm.html` renders 30 of them; two-up
  at ~160px truncates the item names, which is worse than the scroll.
- **`.goods` / `.cards` / `.reqs` / `.split` / `.two-col`** single-column
  collapses below 640 — already correct, nothing added beyond spacing.
- **The generic `table.tr-table{min-width:560px}`.** Right for the 2–4 column
  tables; only `#hqTable` (7 columns) needed more.
- **`.pill`** (37px tall). It's a label, not a control — no target sizing.
- **The desktop nav at 1024.** `.nav a` measures 39×57 there — under 44 tall.
  All the touch-target rules stop at 900px on purpose: 1024 is the small-laptop
  breakpoint and padding the links to 44 would change the header rhythm on
  every desktop width. Worth revisiting only if iPad-landscape (1024, touch)
  is a real audience — it would want `@media (min-width:901px) and (hover:none)`.
- **`prefers-reduced-motion`.** `site.css`, `motion.css` and `roots.css`
  already cover it and `mobile.css` introduces no animation, so there was
  nothing to add.

---

## 4. Browser features used

`env(safe-area-inset-*)`, `dvh`, `:has()`, `text-wrap: balance|pretty`,
`overscroll-behavior`, `position:sticky` on a `::after`. All degrade
silently: if `:has()` is missing the menu behaves exactly as it does today
and the table hint simply doesn't render; if `dvh` is missing the `vh` line
that precedes it wins; if `text-wrap` is missing the text just wraps
normally.
