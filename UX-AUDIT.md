# Twisted Roots Merc — UI/UX Audit

**Date:** 2026-08-21
**Build audited:** `http://localhost:8899/` — 14 top-level pages, 208 blog pages, 161 recipe pages
**Method:** measured, not eyeballed. Computed styles read from the live DOM; responsive behaviour measured in same-origin iframes at nine widths; contrast computed by compositing the actual header colour over the actual hero pixels; all four core journeys walked end to end with real clicks; the basket exercised against a deliberately low-stock item.
**Author owns only:** `UX-AUDIT.md` and `assets/css/polish.css`. Everything needing HTML or JS is written as a numbered patch in [§7](#7-patches).

---

## Contents

1. [Scores](#1-scores)
2. [What is working well](#2-what-is-working-well)
3. [Findings by severity](#3-findings-by-severity)
4. [The four journeys, walked](#4-the-four-journeys-walked)
5. [Responsive matrix](#5-responsive-matrix)
6. [Motion inventory](#6-motion-inventory)
7. [Patches](#7-patches)
8. [Shortest path to 9.5](#8-shortest-path-to-95)

---

## 1. Scores

| | As found | With `polish.css` linked | Ceiling after all patches |
|---|---|---|---|
| **UI** | **8.4 / 10** | 8.9 | 9.6 |
| **UX** | **6.9 / 10** | 7.2 | 9.5 |

**Why UI is already high.** The type scale is genuinely one system. Measured at a 1443px viewport across all 14 pages, `.h-mega` is 122.2px/113.7 in every case, `.h2` 41.6/44.9, `.h3` 22.7/27.7, `.lede` 20.8/33.3, `.eyebrow` 12.5/20.6. Not one page drifts. `.wrap` resolves to the same width everywhere, `.wrap--mid` to 1180px everywhere. Band padding is 124/124 standard and 72/72 tight with only two one-pixel-scale exceptions. That is unusual discipline. The points come off for a measured WCAG contrast failure in the header, a full-bleed band that is misaligned at every desktop width, and a heading system where ten `<h2 class="h1">` on one page render identically and flatten all rank.

**Why UX is much lower.** Individual mechanisms are well built — the search is fast and forgiving, the stock clamp is correct, the basket persists. But they do not add up to one product. There are **four** unconnected ways to reserve something, under **nine** different labels, and nothing anywhere explains the difference. The most persistent call to action on mobile says "Order Online" on a site whose whole proposition is that it does not sell online. The bakery shows you a priced menu with live counts and then asks you to re-type it into a textarea. And the confirmation screen is convincing enough that a real user could leave believing an order was placed.

---

## 2. What is working well

Protect these. Several of them are better than the equivalent on real commercial sites.

1. **The type scale and spacing rhythm are one system, and hold across 14 pages.** Numbers above. Do not let per-page tuning creep in.
2. **The stock clamp is correct and gracefully explained.** AA Batteries (`e08`) has `q:6`. Clicking Add eight times gives 1,2,3,4,5,6,6,6 and the button flashes "That's all we have" (`site.css:974`). Typing 99 into the drawer clamps to 6. There is no path to basket more than exists.
3. **The basket survives everything.** `localStorage` key `tr-basket-v1`; verified across page navigation and reload. `init()` also trims lines whose stock dropped while the basket sat there (`cart.js:249-255`) rather than promising stock that is gone. That is a detail most carts get wrong.
4. **Search quality.** Typing "batteries" on the home page returned all three battery SKUs, correctly ranked, in under 500ms, with intent mapping for phrases like "power out" and "leaky toilet". `shop.js` debounces at 140ms and `site.js` at 220ms.
5. **`shop.html`'s empty state is a model.** Two distinct messages for "no query match" versus "over-filtered", plus two recovery actions, plus a `role="status" aria-live="polite"` count. It is the only live region on the site. Lift this pattern onto merc/storm/yard/hunt.
6. **The yard and the bakery already show real counts** — "34 out back", "12 left today". This is the site's promise kept. The rest of the catalogue should follow them, not the other way round.
7. **The reduced-motion discipline in JavaScript is excellent.** Every JS module carries its own `matchMedia` check rather than trusting CSS: `motion.js:30`, `roots.js:31`, `crows.js:31`, `site.js:510/642/698`, and `motion.js:534-543` even handles a mid-session change of heart by clearing inline transforms. The gaps are all in CSS, and they are all fixed in `polish.css`.
8. **`content-visibility:auto` with `contain-intrinsic-size` on the 260 shop cards.** The right tool, correctly configured.
9. **Mobile is genuinely solid.** At 360px, across all 14 pages: **zero** horizontal overflow, and exactly **one** control under 44px (the header Basket button at 42px). That is a better result than most responsive audits produce.
10. **The recipe and blog writing is the best content on the site.** The sourdough starter page tells you the smell on day four and that this is where people quit. Nobody writes that. The information design of `yard.html`'s post-setting table is likewise excellent.
11. **The voice.** "Free advice, worth what you paid." "Not a lumberyard. A project rescue." "Eat it before a shift, not after." The brand is fully realised in the copy and it is the site's biggest single asset.

---

## 3. Findings by severity

**Counts — 2 BLOCKER · 17 HIGH · 15 MEDIUM · 11 LOW · 8 POLISH (53 total).**
Items marked ✅ are already fixed in `assets/css/polish.css` and need only Patch 1 (link the file).

---

### BLOCKER

#### B1 — The demo confirmations are indistinguishable from real ones
**Pages:** every page (the basket), `bakery.html`, `yard.html`, `merc.html`, `storm.html`, `index.html`
**Evidence.** Reserving a basket of AA batteries and dog food produced this, verbatim:

```
Set aside for you                      ← modal title, 16.8px
TWISTED ROOTS MERC · Siletz, Oregon · (503) 706-2801
HOLD      TR-260821-910                ← real-looking confirmation number, today's date
FOR       Will
QTY       3
2 x AA Batteries, 8pk        $19.98
1 x Dog Food, 30 lb          $44.99
SUBTOTAL                     $64.97
HELD UNTIL   8pm                       ← computed from the store's real hours table
It's behind the counter. Just say your name.        ← 14.4px, opacity 1

This is a demo — in the live store this drops straight
into Square and prints at the counter.               ← 13.92px, opacity .66
```

The one sentence that says nothing happened is the **smallest and palest element in the modal** (ink at 66% over paper ≈ 4.4:1, right on the AA boundary) and it sits **below** three lines that read as a completed transaction. Source: `site.js:367-386`.

It is worse in two other places:

* **`tellUsModal` has no disclaimer at all.** `site.js:835-841` hand-builds its own receipt instead of calling `receipt()`, and `receipt()` is where the demo line lives. The user is told: *"Thanks — it's on the list" / "Noted at the counter" / "Carrie reads these Sunday nights. If enough neighbors ask for the same thing, it goes on the shelf."* A named person, a weekly cadence, and nothing recorded anywhere. This is the **most-linked form on the site** — it is in the footer of all 14 pages.
* **`cart.js:213`** falls back to `alert("Basket reserved. Bring your name to the counter.")` if `site.js` fails to load. No demo framing whatsoever.

**Symptom.** A user drives to Siletz expecting a bag behind the counter.
**Fix.** ✅ `polish.css` §3 promotes the disclaimer to a rust-ruled, full-opacity, labelled notice ("DEMO SITE —", 6.6:1 contrast). That is a mitigation, not the fix. Patch 2 moves it above the hold number, adds it to `tellUsModal`, and replaces the `alert()`.

#### B2 — Dialogs have no focus trap, no focus return, and announce nothing
**Files:** `assets/js/site.js:328-353`, `assets/js/cart.js:197-198`
**Evidence, measured.**

| Step | `document.activeElement` after |
|---|---|
| Open the basket drawer | `INPUT` — the *search box on the page behind*. `cart.js:197` contains no `.focus()` call. |
| Reserve → modal opens | `INPUT#bn` — correct, via `site.js:346` |
| Submit the reserve form | `BODY` — the submit button was destroyed with the innerHTML swap |
| Submit the bakery form | `BODY`, and 6 form controls left permanently `disabled` |

`document.querySelectorAll('[aria-live]').length` on `index.html` returns **0**. The only live region on the whole site is `#shopCount` on `shop.html`. Adding to the basket, changing a quantity, emptying the basket and completing a reservation are all silent. Tab walks straight out of both dialogs into the page behind the scrim — grep for `trapFocus|inert` in `site.js` returns nothing.

**Symptom.** With a keyboard or a screen reader the primary journey is a dead end: you complete a reservation and are dumped, silently, to the top of the document.
**Fix.** Patch 3.

---

### HIGH

#### H1 — Header text fails WCAG AA over three hero photographs ✅
**Evidence.** `site.css:765` sets the un-scrolled header to `rgba(244,237,225,.25)` with ink (`#20180F`) nav, burger and brand text on top. Contrast computed by compositing that cream over the actual hero pixels under the 87px header strip, worst 120px sample:

| Page | Hero | Contrast | |
|---|---|---|---|
| `local.html` | maker-pottery.jpg | **2.73:1** | FAIL |
| `bakery.html` | bakery-case.jpg | **3.16:1** | FAIL |
| `roots.html` | owners-porch.jpg | **3.84:1** | FAIL |
| `board.html` | tr-storm.jpg | 5.37:1 | pass |
| `index.html` | w-river.jpg | 9.36:1 | pass |
| `storm.html` | storm-coast.jpg | 10.38:1 | pass |
| `yard.html` | lumber-rack.jpg | 11.28:1 | pass |

On `index.html` the background is a **looping video**, so the contrast is not even a fixed number.
**Fix.** ✅ `polish.css` §2 raises the alpha to `.52`, lifting the worst case to 5.35:1 while keeping the header visibly translucent.

#### H2 — Full-bleed bands overhang the viewport at every desktop width ✅
**Page:** `index.html` (3 sections, lines 328, 344, 440)
**Evidence.** `site.css:479` uses `width:100vw` with `-50vw` margins. `100vw` includes the scrollbar.

| Viewport | clientWidth | Band left | Band right |
|---|---|---|---|
| 1024 | 1027 | **−6** | **1033** |
| 1280 | 1283 | −6 | 1289 |
| 1440 | 1443 | −6 | 1449 |
| 1920 | 1923 | −6 | 1929 |

`body{overflow-x:clip}` hides the scrollbar this would create, so the symptom is silent: the three cinema bands are cropped 6px each side and are the only elements on the page not aligned to the grid. `mobile.css:519-521` already has the right fix, scoped to ≤1010px only.
**Fix.** ✅ `polish.css` §1. Verified: 3 offenders → 0 at 1024/1280/1440/1920.

#### H3 — ~300 controls under 44px between 901px and 1180px ✅
**Evidence.** The header collapses to a burger below 1180px — the site's own declaration that these widths are touch. Every tap-target floor in `mobile.css` is scoped to `max-width:900px` (`mobile.css:319-333`) or `1010px`. Measured on `shop.html` at a 1093px viewport, **before** the fix:

* 32 × `.chip` filter buttons at 40px
* ~260 × `.btn--sm` Add buttons at 84 × **42**
* `select#shopSort` at 192 × **40** (also short at 768 and 834)
* `.burger` 69 × **43**, `.carttoggle` 81 × **42**, `.stormtoggle` 166 × **39**
* `.navitem__top` burger-panel rows at **39**

1024px is iPad landscape.
**Fix.** ✅ `polish.css` §4 extends the existing floors to `max-width:1180px`. Verified on `shop.html` at 1093px: ~300 → **0**. Verified 0 at 360/768/1024 on index, shop, bakery.

#### H4 — The basket's own controls are the smallest on the site ✅
**Evidence.** `site.css:1012` `.cartline__qty button{width:34px;height:34px}`, `:1015` input `38 × 34`, `:1017` remove `~20px`. `grep cartline assets/css/mobile.css` returns **nothing** — there is no mobile override at any width. These are the controls a phone user touches most.
**Fix.** ✅ `polish.css` §4 → measured 44 × 44, 48 × 44, 44 × 44 at ≤1180px.

#### H5 — Four unconnected ways to reserve something, under nine labels
**Evidence.**

| # | Mechanism | Entry | Ends in |
|---|---|---|---|
| i | The basket | `data-add` on every product row (`site.js:157`) and shop card (`shop.js:318`) | drawer → "Reserve for pickup" → name/phone → receipt, basket cleared |
| ii | Hold a kit | `data-holdkit` on every kit card (`site.js:290`) — merc, storm, yard, index | its own name/phone/qty modal (`site.js:355-365`). **Never touches the basket.** |
| iii | Bakery order | `bakery.html:186-225` | a `data-fakeform` that disables itself |
| iv | The mobile order pop-up | the dock CTA at ≤1010px (`site.js:795-800`) | `orderModal()` (`site.js:408-444`) — **a different form** from (iii), with different time options |

The labels for one act: *Add · Reserve for pickup · Reserve it · Hold this kit · Hold it for me · Order for pickup · Reserve tomorrow's · Send it to the kitchen · Order Online.*

A user with three things in the basket who then holds a kit has **two independent reservations under the same name**, two receipt numbers, and a basket that was not cleared. The header Basket badge does not move. The only explainer on the site — `shop.html:163-171`, "Three steps, none of them a checkout" — covers path (i) only, and lives on the one page that has no kits.
**Fix.** Patches 4 and 5.

#### H6 — The most persistent CTA on mobile says "Order Online"
**File:** `assets/js/site.js:591`, injected on **every page** including `shop.html`, `yard.html` and `merc.html`.
**Evidence.** `bar.innerHTML = '<a class="dockbar__cta" href="' + href + '">Order Online</a>'` where `href` is always `bakery.html#order`. Confirmed live on `shop.html`: `document.querySelector('.dockbar').innerText` → `"Order Online"`.
**Symptom.** Two problems at once. (a) The site's entire proposition is that it does *not* sell online — `shop.html:83-85`, `cart.js:9-11` ("no card data ever touches this site"), `roots.html:145-147` ("no app, no account"). The single most permanent button on mobile contradicts all of it. (b) A shopper halfway through filling a basket on `shop.html` has a fixed bar offering to take them to the bakery. There is no basket in the dock at all.
**Fix.** Patch 6.

#### H7 — The bakery shows you a menu and then asks you to type it out again
**Page:** `bakery.html`
**Evidence.** `document.querySelectorAll('[data-bakery] [data-add]').length` → **0**. The rack renders "The Twisted Root · $6.50 · 12 left today" and the order form's only item field is a free-text textarea (`bakery.html:194`). There is no price and no total anywhere in the order form.
**Symptom.** This is the whole of journey B. You read a priced, counted menu, scroll ~1,400px, and re-type "2 cinnamon rolls" from memory. You never learn what it costs.
**Fix.** Patch 7.

#### H8 — "In stock" hides the number the site exists to show
**Files:** `assets/js/site.js:46-57`, `assets/js/shop.js:146-150`
**Evidence.** The rule is `q <= floorFor(it)` where `floorFor` is the **reorder minimum**, not a scarcity threshold.

| Item | q | min | Renders | Reality |
|---|---|---|---|---|
| AA Batteries 8pk (`e08`) | 6 | 10 | **"Only 6 left"** | a normal shelf, below the reorder floor |
| Toilet Paper 12pk (`e01`) | 23 | 10 | **"In stock"** | number withheld |
| 2×4×8 (`y01`) | 34 | — | "34 out back" | correct |
| Cinnamon roll | 12 | — | "12 left today" | correct |

Three consequences:

1. **The number is withheld from ~200 of 260 items** on a site whose promise, stated on `index.html:205`, `shop.html:83-85`, `storm.html:111`, `merc.html` meta and the footer of all 14 pages, is *"Counts come off the register, so if it says four left, there are four left."* For most of the catalogue it never says four.
2. **Two rows cannot be compared.** A low-turn item with `min:2` shows "In stock" at 3 units. A high-turn item with `min:10` shows "Only 12 left" at 12.
3. **Storm Mode inverts it.** `e08.stormMin` is 100. Flip the toggle and a shelf holding 90 packs of AA batteries — the deepest it is ever stocked — announces **"Only 90 left."** The label lies hardest on the page that matters most.

**Fix.** Patch 8. Show the count in all three states (`23 on the shelf` / `6 on the shelf`), keep `N out back` for the yard, and reserve urgency for an absolute threshold (`· last few` when `q <= 3`).

#### H9 — Reserving lumber tells you it is behind the counter
**Page:** `yard.html` → the basket
**Evidence.** Added a 2×4×8 from Rack A. The reserve modal said *"We will pull these and set them **behind the counter** under your name"* (`site.js:449-450`) and the receipt said *"It's **behind the counter**. Just say your name."* (`site.js:382`). `yard.html:78` says "Out back · Under cover · Pull the truck around" and `yard.html:95` promises "Loading help — Always". Neither appears anywhere in the reservation flow. Regex-checked the confirmation text for `load|out back|truck`: **no match**.
**Fix.** Patch 11.

#### H10 — Every destructive basket action is instant, silent and irreversible
**Evidence, measured.**

| Action | Result | Confirmation | Undo |
|---|---|---|---|
| Set the quantity field to `0` | line removed | none | none |
| Press `−` past 1 | line removed | none | none |
| "Empty the basket" | 5 units → 0 instantly | none | none |
| Submit a reservation | basket cleared (`site.js:852`) | none | none |

`setQty` routes `<= 0` straight to `remove()` (`cart.js:80`). "Empty the basket" is a plain `btn--ghost` sitting directly under the primary CTA (`cart.js:194`) with no `confirm()` and no toast.
**Symptom.** One nudge too many on `−` and the line is gone with no trace of what it was; the user has to go and find the item again.
**Fix.** Patch 9.

#### H11 — Typing a quantity above stock clamps silently
**Evidence.** Typed `99` into the drawer quantity field for AA batteries (stock 6). The field became `6`. No message, no flash, nothing. Compare the Add button, which does the right thing and shows "That's all we have" (`site.css:974`). The drawer and the button disagree about whether the user deserves an explanation.
**Fix.** Patch 9.

#### H12 — `board.html` is orphaned
**Evidence.** `grep -l 'href="board.html"' *.html blog/*.html recipes/*.html` returns **nothing**. `grep -c board.html sitemap.xml` returns **0**. It is a 38KB, hand-written, genuinely good page (community notices, river reports, a lost-and-found) that no user can reach. Meanwhile the nav slot labelled "Board" points at `journal.html`, which has the **same `<h1>` ("The Board") and the same `<title>`**. Two pages called The Board; the blog got the nav slot.
**Fix.** Patch 10.

#### H13 — `shop.html` has no sticky search or filters over a 23,346px page
**Evidence.** `document.documentElement.scrollHeight` → **23,346px**; the grid alone is 20,869px; 260 cards. `getComputedStyle(document.querySelector('.shop-controls')).position` → **`relative`**. The search box, the four filter groups and the sort control all scroll away permanently after the first screen. There is no pagination, no "load more", and no in-page anchor back to the controls — only a generic back-to-top in the dock.
**Symptom.** Scroll 12,000px, decide to narrow to "Fix It", and the only way back is to scroll 12,000px up.
**Fix.** Patch 12.

#### H14 — `bakery.html` says you can pay on the site
**Evidence.** `bakery.html:182-183`: *"Pick your time, we'll have it bagged with your name on it. **Pay here or pay at the counter** — both are fine with us."* There is no payment surface anywhere on the site; `cart.js:9-11` states the opposite as a design principle.
**Fix.** Patch 13.

#### H15 — 209 pages throw two uncaught SyntaxErrors
**Evidence.** `journal.html:1445-1453` loads `catalog.js`, `site.js`, `motion.js` and `roots.js` **twice** — once versioned, once not. Console on `journal.html`:

```
[EXCEPTION] catalog.js — SyntaxError: Identifier 'TR_DEPTS' has already been declared
[EXCEPTION] site.js    — SyntaxError: Identifier 'TR' has already been declared
```

Counted: `journal.html` **plus all 208 files in `blog/`** have `site.js` twice. `recipes/` (161 files) is clean.
**Symptom.** The second copies fail to parse, so behaviour survives — but every one of these pages redownloads and reparses ~90KB for nothing, and any error monitoring added later will drown.
**Fix.** Patch 14.

#### H16 — 161 recipes with no search and no index
**Page:** `kitchen.html`
**Evidence.** 161 recipe links, `scrollHeight` **18,946px**, `document.querySelector('input[type=search]')` → **null**. The only navigation is seven category anchors, and they sit below the fold under a 40-word lede. There is no `recipes/index.html`. Same shape on `journal.html`: 104 posts, no search, no `blog/index.html`. Both card walls are a single point of failure for hundreds of pages.
**Fix.** Patch 16.

#### H17 — A recipe cannot send you to the shelf
**Page:** `recipes/*.html`
**Evidence.** `document.querySelectorAll('[data-add]').length` on a recipe page → **0**. The sourdough starter page's "What you need" block lists whole rye flour, bread flour, a tub — none linked, none addable. The only shelf link is a generic "Shop the shelf" → the unfiltered 260-card grid. And `grep -i 'flour' assets/js/catalog.js` returns **nothing**: the store does not stock the ingredients its recipes call for.
**Symptom.** Journey D ends here. The whole point of a mercantile's recipe section is that you buy the ingredients from the mercantile.
**Fix.** Patch 17.

---

### MEDIUM

#### M1 — 33 animations still running with nothing on screen ✅ (partly)
**Evidence.** `index.html`, Storm Mode **off**, scrolled to the foot of a 25,000px page, `document.getAnimations().filter(a => a.playState === 'running')`:

```
hs-idle × 1      hs-swing × 1     mo-rain-far × 2   mo-rain-mid × 2
mo-rain-near × 2 crow-cross × 5   crow-flap × 5     crow-drift × 5
mo-wave-scroll × 3   tick × 1     flipin × 4        mo-tree-drift × 2
                                              total: 33
```

The six rain animations are the worst offender: `motion.css:531` sets `.rainlayer{opacity:0}` but the three `background-position` loops (2.1s, 1.25s and **0.72s**) run unconditionally, on `index.html` ×2, `hunt`, `kitchen` and `journal`. Nothing pauses on `document.hidden` — the only `visibilitychange` handler in the codebase is `site.js:549-553`, and it only pauses the hero video.
**Fix.** ✅ `polish.css` §5 pauses the rain layers when Storm Mode is off (6 animations per page reclaimed). Pausing the rest on `document.hidden` is Patch 20.

#### M2 — Animated wave crests cross the hero copy; roots paint over the ticker ✅
**Evidence.** `.wavedivider--float` is `z-index:4` (`motion.css:439`) while `.hero-in` is `z-index:3` (`site.css:163`). The band is `clamp(64px, 8.5vw, 128px)` tall with three infinitely-scrolling layers (15s fastest, 8.5s in storm) and on a short or landscape viewport the crests pass over the hero motto and both hero buttons. Separately, `.rootsys` is `z-index:3` and `roots.css:66-71` lifts `.wrap`, `.hero-in` and the footer above it — but `.ticker` (`index.html:185`) is `position:static` with no z-index (`site.css:194`), so brown root fill paints over its 0.8rem uppercase text. The root's lane is x = 30–190px, straight through the ticker's first words.
**Fix.** ✅ `polish.css` §6.

#### M3 — Reduced-motion gaps, all in CSS ✅
**Evidence.** The JS is thorough; the CSS is not. Unguarded: `flipin` (`site.css:216`, board cells rotateX(−85°)), `pop` (`:346`, modal), `cart-in` (`:991`, drawer), `add-pop` (`:972`), `.drive .bar i` width transition 1s (`:188`), `.meter .bar i` width transition .9s (`:365`), `.btn:hover` translateY (`:104`), `.card:hover` (`:286`), `.good .ph img:hover` scale (`:268`), `.nav a::after` scaleX (`:139`), `html{scroll-behavior:smooth}` (`:41`). **`mobile.css` contains no `prefers-reduced-motion` block at all.** The bars matter most: a reduce user still watches eight stock meters grow.
**Fix.** ✅ `polish.css` §7, including an explicit `animation:none` (not a duration nuke) for the "Added" badge so the confirmation still renders.

#### M4 — Blank containers with no empty state
**Pages:** index, merc, bakery, yard, storm, hunt, local, roots, hq
**Evidence.** `paintLists()` (`site.js:255-271`), `paintMeters()` (`:236`), `paintKits()` (`:274`) and `paintRequests()` (`:299`) all assign `innerHTML` unconditionally. There is no fallback copy anywhere. `storm.html` is the sharp case: six `[data-ids]` blocks plus `[data-meters]` plus `[data-kits]`, so a sold-out storm wall — the exact scenario the page exists for — renders as live headings over whitespace. `hq.html:102` and `:116` do the same, so the **good** day (nothing needs reordering) renders as a broken dashboard with an empty `<thead>` and an enabled "Create purchase orders" button.
**Fix.** Patch 15. `shop.js:336-351` already has the pattern.

#### M5 — Heading rank is decorative, not semantic
**Evidence.** `index.html` has **ten** `<h2 class="h1">`, so "Our Goods", "Hungry?" and "Fix-It Kits" all render identically and the page reads as ten equal chapters. Level skips `h1 → h3`: `index.html:192`, `merc.html:113`, `hq.html:71`. Tag and size fully decoupled: `<h3 class="h2">` at `merc.html:216`, `hunt.html:365`, `local.html:111/128/145`, `roots.html:110/128`. On `bakery.html`, "Breakfast" and "Lunch" are `.h1` while "Coffee" and "Grab & Go" are `.h2` — same rank, two sizes. On `board.html` the marketing CTA is `.h1` while all ten actual notices are `.h2`.
**Fix.** Patch 18.

#### M6 — Navigation state is wrong on four pages, and one page's nav is short
**Evidence.** `aria-current="page"` marks **Merc** on `journal.html:46` and `kitchen.html:46`. `storm.html` and `hunt.html` mark nothing at all despite having a nav link to themselves. `visit.html:51-62` omits the `<a class="nav-cta" href="shop.html">Shop Now</a>` that all 13 other pages carry — 10 nav items instead of 11.
**Fix.** Patch 19.

#### M7 — `visit.html` gives two different addresses
**Evidence.** `visit.html:82` (an `<h2>`, and the most important content on the page) says **"Highway 229, Siletz, Oregon 97380"**. The footer of every page, and the JSON-LD at `index.html:57`, say **"101 & 151 N Gaither St"**. The "Get directions" link (`visit.html:86`) queries `Siletz+Oregon+97380` with **no street at all**, so it drops a pin on the town.
**Fix.** Patch 21.

#### M8 — No validation or error UI anywhere
**Evidence.** Grep across the project for `aria-invalid`, `role="alert"` or any error class returns nothing. All seven form surfaces rely entirely on native browser bubbles. `visit.html`'s contact form goes further: `site.js:865-871` disables **every** control including the submit button, permanently, so the form cannot be corrected or resubmitted without a reload, and focus drops to `<body>`. Its success note has no `role="status"`.
**Fix.** Patch 22.

#### M9 — One modal wears four different names
**Evidence.** `tellUsModal` (`site.js:389-401`) is titled **"What should we carry?"** with the field label "What are you looking for?" and the placeholder "Purina Pro Plan dog food, 35 lb". It is opened by:

* `kitchen.html:161` **"Send us a recipe"**
* `journal.html:745` **"Send us a question"**
* `local.html:199` **"Send us a note"** — on a page whose copy four lines above says "no submission portal"; a maker who clicks it is asked what the store should stock
* `board.html:587` **"Tell us what to carry"** under copy promising "the notices usually within the hour"

**Fix.** Patch 23.

#### M10 — Search result rows have no accessible name and no quantity
**Evidence.** `site.js:157` renders `<button ... data-add="${it.id}">Add</button>` with **no `aria-label`**. Verified live: `btn.getAttribute('aria-label')` → `null`. A screen-reader user hears "Add, Add, Add". `shop.js:321` gets this right (`aria-label="Add ... to the basket"`); `site.js` was not updated to match. There is also no quantity control on a row — the only way to basket three is to press Add three times, silently.
**Fix.** Patch 24.

#### M11 — Two identical "Shop Now" buttons in the header of every page
**Evidence.** `shop.html:63` (`.nav-cta`) and `shop.html:67` (`.head-cta .btn--amber`) — same label, same destination, side by side, on all 14 pages including `shop.html` itself where one of them carries `aria-current="page"`.
**Fix.** Patch 25.

#### M12 — `hq.html` ships six unlabelled inputs and a public footer
**Evidence.** `hq.html:144-153` — `<div class="field"><label>Barcode</label><input value="0 41333 00133 8" readonly></div>` — `<label>` with no `for`, `<input>` with no `id`, six times. They are focusable and nameless. The button at `hq.html:118` relabels itself **"Purchase orders drafted in Square ✓"** on click; only the caption below carries the caveat, and it has no `aria-live`. The customer header and footer ship intact on the owner dashboard, including a footer link back to "Owner login" from inside the owner dashboard.
**Fix.** Patch 26.

#### M13 — Bakery pickup times are fiction
**Evidence.** `bakery.html:196-207` renders a fixed list — *As soon as it's ready, 7:00am, 7:30am, 8:00am, 8:30am, 9:00am, 10:30am, 11:30am, 12:00pm, 12:30pm* — with a separate Today/Tomorrow select. Tested at 01:00 local: "Today / 7:00 am" is selectable. The site already computes real hours (`site.js:65-74`) and uses them in the receipt ("HELD UNTIL 8pm").
**Fix.** Patch 27.

#### M14 — No skip link on any page
**Evidence.** `grep -i skip *.html` matches once, in body copy on `merc.html:179`. With an 11-item nav plus a burger plus a basket button, every keyboard user tabs the same 14 controls on every page.
**Fix.** ✅ `polish.css` §8f already styles `.skip-link`; Patch 28 is the one-line markup.

#### M15 — `kitchen.html` breaks the band alternation
**Evidence.** Band sequence measured across the 14 pages. Thirteen alternate cream/paper/sand against ink/bark/pine/teal/rust. `kitchen.html` runs **eight consecutive `band--paper`** sections before its single dark band:

```
kitchen: cream-tight, paper, paper, paper, paper, paper, paper, paper, bark-dark
```

With 161 cards and no search, that is 18,946px of identical background with no landmark to scroll against.
**Fix.** Patch 16 covers it (alternate the seven category bands).

---

### LOW

* **L1 — Search labels are `display:none`.** ✅ `.hide` is `display:none !important` (`site.css:384`) and is used for the `<label for>` on all three search inputs. The accessible name still computes, but the label can never be shown, not even on focus. `polish.css` §8e swaps them to a clip pattern.
* **L2 — `.btn--add.in-cart` still says "Add".** ✅ `site.css:967` turns it pine green when the item is in the basket but the label never changes, so a returning user cannot tell it is there, or how many. `polish.css` §8b prefixes a check mark.
* **L3 — Inert chips that look tappable.** ✅ `bakery.html:216-219` — "Gallon of milk / Bagged ice / Dog food / AA batteries" are `<span class="pill">` inside a form, next to real controls. Verified: they are `SPAN`s and do nothing. `polish.css` §8a makes them read as labels.
* **L4 — The drawer shows only the line total.** `cart.js:184` prints `money(it.p * l.qty)` — "$59.94" for 6 × AA batteries — with no unit price anywhere. The drawer header is "Your basket", not "Your basket (6)".
* **L5 — Stale stock line in the drawer.** `cart.js:180` still prints "only 6 left" on a line where all 6 are in your basket.
* **L6 — The scrolled header is cold white.** ✅ `site.css:768` `rgba(255,255,255,.82)` on a site whose paper is `#FBF7EF`. `polish.css` §2 warms it.
* **L7 — Three walls of prose.** `board.html:206-211` is ~100 words and is *literally a checklist* — can opener, cash, bar oil, D cells, prescription, power bank, CO detector batteries — written as one paragraph. Also `storm.html:97-100` (~65 words, eight kit items as prose) and `hunt.html:142-145` (~62 words of legal caution).
* **L8 — Duplicated CTAs.** Four routes to the bakery on `index.html` (176, 296, 356, 373). Three Storm Mode toggles on `storm.html` (83, 118, 216) plus the stormbar. "Tell us what to carry" verbatim twice on `board.html` (365, 587) plus the footer.
* **L9 — Inline band padding.** `merc.html:91` and `visit.html:90` carry `style="padding-top:clamp(48px,6vw,84px)"`, giving 84/72 where every other tight band is 72/72. `shop.html:81` carries an inline padding that equals the default and does nothing.
* **L10 — Static counters go stale.** `board.html:92-93` hard-codes "Current notices **3**" and "Last written on **Aug 17**" as text.
* **L11 — Storm Mode is a toggle in a CTA slot.** `storm.html:83` puts the Storm Mode switch as the *second hero button*, at equal weight to the primary action, where it re-scales the very bars the reader is about to interpret.

### POLISH

* **P1 — `.prodcard` focus ring.** ✅ Added in `polish.css` §8c so keyboard users tabbing a 260-card `content-visibility` grid never lose their place.
* **P2 — Dead code.** `site.js:777-782` handles `[data-hold]`; nothing in the repo emits it. `.fogdrift` (`motion.css:494-510`) and `.birds` (`:582-602`) appear in no HTML.
* **P3 — `shop.html` is the only page whose `<h1>` is `.h1`, not `.h-mega`** (41.6px instead of 122.2px), so the Shop page's title is the same size as every other page's section headings. Defensible ("short on purpose") but it makes a primary destination read as a subsection.
* **P4 — Inline style density.** `kitchen.html` 340, `journal.html` 216, `board.html` 38, against 12–28 on the hand-written pages. Generator output, but it is where the design system leaks.
* **P5 — Timers that never stop.** `site.js:877` `setInterval(paintOpenPills, 60000)` and `crows.js:211` `setInterval(run, 165000)` run for the life of the page in a background tab.
* **P6 — No `type="email"` exists anywhere on the site.** Two fields labelled "Phone or email" (`visit.html:167`, `site.js:398`) are bare text inputs with no `inputmode`.
* **P7 — `autocomplete` is inconsistent.** Present on the three JS-generated modals (`autocomplete="name"`, `"tel"`), absent on both hand-written HTML forms (`visit.html:166-170`, `bakery.html:189-207`) and on `tellUsModal`.
* **P8 — Cross-dialog scroll-lock conflict.** `cart.js:198` and `site.js:352` both reset `document.body.style.overflow = ""`, so closing the drawer while the receipt modal is open unlocks background scroll behind the modal.

---

## 4. The four journeys, walked

### A. "I need batteries" — 8/10, the best journey on the site

Home → hero CTA "Does the Merc have it?" → jumps to `#check` → typed *batteries* → three correct results in under 500ms → clicked Add → clicked Basket → Reserve for pickup → name and phone → receipt.

**Where I hesitated.**

1. **"Add" to what?** The button says only "Add" (`site.js:157`). The basket is a small outline button in the top-right corner labelled "Basket". Nothing on the results row uses the word basket. I pressed it not knowing where the item would go.
2. **After pressing it, almost nothing happened.** A 1.4s green "Added" flash on the button, and a badge went from hidden to "1" some 900px away in the corner. The drawer does not open. There is no live region (`[aria-live]` count on `index.html`: 0).
3. **Two of three results refused to tell me the count.** "AAA Batteries — IN STOCK", "AA Batteries — ONLY 6 LEFT", "D Batteries — IN STOCK", on a page headed *"The shelf list is live, straight off the register."* (H8)
4. **No quantity on the row.** Wanting four packs meant pressing Add four times, silently.
5. **The receipt read as a real transaction.** (B1)

**What was excellent.** The stock clamp — eight presses produced 1,2,3,4,5,6,6,6 with "That's all we have" on the last three. The basket survived a full page navigation to `shop.html`. Nothing about "you pay at the counter" was ambiguous: the drawer footer, the reserve modal and the receipt all say it plainly.

### B. "What's for breakfast" — 4/10, the weakest journey

Home → "See today's menu" → `bakery.html` → the rack renders beautifully: "The Twisted Root · $6.50 · **12 left today**", "Marionberry Hand Pie · **Sold out**". Then it stops.

**Where I hesitated.**

1. **Nothing on the menu is actionable.** Zero `[data-add]` buttons. Every price and every count is decoration.
2. **The order form is a textarea.** I scrolled ~1,400px to `#order` and typed "2 cinnamon rolls" from memory into "What are we making?". The product I had just been shown, priced and counted, had to be re-entered as prose. (H7)
3. **I never learned the price.** No line items, no total, anywhere in the order flow.
4. **"Pay here or pay at the counter"** (`bakery.html:182`). There is no "here". (H14)
5. **Four chips labelled "Gallon of milk / Bagged ice / Dog food / AA batteries"** sit inside the form and do nothing. (L3)
6. **The form disabled itself permanently.** Six controls, `disabled`, no way back without a reload. (M8)

**What was good.** The success note is the best demo disclosure on the site: amber background, ink text, immediately adjacent to the confirmation — *"Got it — Demo order received. In the live store this lands in Square, prints in the kitchen, and texts you when it's ready."* This is the pattern `receipt()` should copy.

### C. "Is the lumber in stock" — 7/10

Home → nav "Yard" → hero CTA "Check yard stock" → `#stock` → five racks render with **real counts**: "2×4×8 Construction Lumber · Rack A · **34 out back** · $5.98 · Add". Added one, reserved it.

**Where I hesitated.**

1. **The confirmation told me it was behind the counter.** (H9) The page I had just left says "pull the truck around" and "we help you load". Nothing in the reservation flow mentions the yard, loading, or where to drive.
2. **"Fence post fix"** as the second hero button is internal jargon for a kit block; "Get the fence post kit" further down goes to the same anchor.
3. **A kit and a board go into different systems.** "Hold this kit" on the same page opens its own name/phone modal and never touches the basket, so wanting the fence post kit *plus* two extra bags of fast-set means submitting twice. (H5)

**What was excellent.** This is the page where the stock model works: real numbers, a location ("Rack A", "Dry Shed"), and honest scope ("If you need twelves, fourteens, sheet goods or an actual load — call Siletz River Lumber"). The post-setting table is the best information design on the site.

### D. "I want a recipe" — 5/10

Home → nav "Recipes" → `kitchen.html` → 161 cards, 18,946px, no search → seven category anchors → a recipe → back.

**Where I hesitated.**

1. **No way to find anything.** 161 recipes, no search box, no filter, no tag list, no ingredient index. Seven category anchors, below the fold. (H16)
2. **The recipe was excellent and completely disconnected from the store.** "What you need" lists whole rye flour, unbleached bread flour, a straight-sided tub. None linked, none addable, and `catalog.js` contains no flour at all. (H17)
3. **"Shop the shelf" dumps you on the unfiltered 260-card grid.** From a sourdough recipe, the useful destination is flour — not everything.
4. **"Send us a recipe"** at the foot opens a modal titled **"What should we carry?"** asking "What are you looking for?" with a dog-food placeholder. (M9)

**What was good.** The return path is genuinely well made: the breadcrumb goes back to `../kitchen.html#bread-sourdough`, the exact category you came from, not the top of the page. A related-recipe link sits at the foot. Keep both.

---

## 5. Responsive matrix

Measured in same-origin iframes at nine widths across all 14 pages. Overflow detection walks every element, compares `getBoundingClientRect()` against `documentElement.clientWidth`, and skips anything an ancestor legitimately clips — `body{overflow-x:clip}` makes `scrollWidth` comparison useless here, so it was not used.

| Width | Overflow (before) | Overflow (after ✅) | Tap targets < 44px (before) | (after ✅) |
|---|---|---|---|---|
| 360 | 0 | 0 | 1 per page (`.carttoggle` 81×42) | 0 |
| 390 | 0 | 0 | 1 per page | 0 |
| 414 | 0 | 0 | 1 per page | 0 |
| 768 | 0 | 0 | 1 per page, +`#shopSort` 192×40 on shop | 0 |
| 834 | 0 | 0 | 1 per page, +`#shopSort` on shop | 0 |
| **1024** | **3 on index** (`.fullbleed` −6…1033) | 0 | **~300 on shop**, 8+ per page elsewhere | 0 |
| **1280** | **3 on index** (−6…1289) | 0 | 28 on local (mouse territory, acceptable) | 19–28 |
| **1440** | **3 on index** (−6…1449) | 0 | 19 on index (mouse territory) | 19 |
| **1920** | **3 on index** (−6…1929) | 0 | mouse territory | — |

**No text clipping, no overlap and no image distortion was found at any width.** Every image carries intrinsic `width`/`height` or an `aspect-ratio`. `mobile.css:506-510` already applies `overflow-wrap:anywhere` to every long-name class. This is a well-built responsive layout with two specific defects, both now fixed.

**The one structural gap** is the 901–1180px band: the burger appears below 1180px but every touch-target floor in `mobile.css` stops at 900px or 1010px. `polish.css` §4 realigns them.

---

## 6. Motion inventory

Judged against: does it distract, does it hurt readability, does it respect `prefers-reduced-motion`.

| Effect | Where | Verdict |
|---|---|---|
| **Hanging-sign idle sway** `hs-idle`, 7.4s infinite (`motion.css:101`) | every page, incl. blog and recipes | **Keep.** ±0.8° is right. It is the brand. |
| **Sign swing on load / hover** (`motion.css:112, 215`) | all pages | **Keep.** Guarded, damped, once. |
| **Crows crossing the sky** — 5 birds × 3 infinite animations (`site.css:569, 592-594`) | index (5), hunt (4), kitchen (3) | **Dial back to 3 on index.** 15 concurrent infinite animations including a stepped sprite over a 2600px PNG, and `z-index:2` keeps them under the copy, which is correct. The count is the issue, not the idea. |
| **Perch crow**, 34-frame sprite, every 165s (`site.css:812`, `crows.js:210`) | index | **Keep, but restack.** `z-index:201` puts it *above* the sticky header (`:200`), so it crosses the nav labels for 7.6s. Move it below 200. |
| **Wave dividers**, 3 layers infinite (`motion.css:424`) | index, hunt, kitchen, journal | **Keep, restacked.** ✅ It was `z-index:4` against `.hero-in`'s 3 — crests crossing the hero buttons. Fixed. |
| **Procedural root system** (`roots.js:130-213`) | all pages | **Keep — it is the best idea on the site.** One correction: it paints over the ticker. ✅ Fixed. |
| **Storm rain**, 6 infinite animations at `opacity:0` (`motion.css:528-567`) | index ×2, hunt, kitchen, journal | **Dial back.** ✅ Paused when Storm Mode is off. When it *is* on, `mo-rain-near` at 0.72s over the hero `h1` is genuinely hard to read; consider 1.0s. |
| **Treeline drift**, 240s + 150s (`motion.css:458`) | index | **Keep.** Imperceptible per frame, which is the point. |
| **News ticker**, 55s infinite, pauses on hover (`site.css:195`) | index | **Keep.** Pausing on hover is the right call. |
| **Board cell flip** `flipin`, rotateX(−85°) (`site.css:216`) | index, hq | **Keep, guarded.** ✅ Was the single most vestibular effect and was not behind the media query. |
| **Stock meter / drive bars**, width transitions (`site.css:188, 365`) | yard, storm, merc, hq | **Keep, guarded.** ✅ Eight bars growing was unguarded. |
| **Parallax**, 8 elements on index (`motion.js:298-350`) | index, hunt, journal, kitchen, merc | **Keep.** Transform-only, batched, capped at ±22vh, properly guarded. Textbook. |
| **Reveal on scroll `.rv`**, count-ups | site-wide | **Keep.** Guarded twice over. |
| **Sign grow / tilt on scroll velocity** (`site.js:656-684`) | all | **Keep, with a caveat.** The CSS transitions (`site.css:650, 723`) are *not* guarded; they are inert only because the JS never writes the custom properties. That is a load-bearing coupling — one stray write and a reduce user gets a tilting sign. |

**Overall motion verdict: restrained and well-engineered, with one thing to cut.** Nothing here is gratuitous and nothing hurts readability once the two z-index errors are fixed. The single change worth making beyond the fixes is **reducing the index crow flock from 5 to 3** — 33 simultaneously-running animations at the foot of a page with none of them on screen is the number that decides it.

---

## 7. Patches

Ordered by impact. Everything here needs an HTML or JS change and is therefore for the lead developer.

---

### Patch 1 — Link `polish.css` (do this first; it activates 12 fixes)

**Files:** all 14 top-level pages, `blog/*.html` (208), `recipes/*.html` (161)
**Where:** immediately after the last existing stylesheet link — after `mobile.css` on 13 pages, after `shop.css` on `shop.html`, and **before** `print.css`.

Before (`index.html:~40`):
```html
<link rel="stylesheet" href="assets/css/mobile.css?v=1c92929c">
<link rel="stylesheet" href="assets/css/print.css?v=65e49f4e" media="print">
```
After:
```html
<link rel="stylesheet" href="assets/css/mobile.css?v=1c92929c">
<link rel="stylesheet" href="assets/css/polish.css">
<link rel="stylesheet" href="assets/css/print.css?v=65e49f4e" media="print">
```
On `blog/` and `recipes/` pages the href is `../assets/css/polish.css`.
`polish.css` must load **last** among screen stylesheets — several of its rules deliberately tie on `!important` with the "HEADER STATE — final word" block at `site.css:764-776` and win on source order.

---

### Patch 2 — Make the demo status unmissable *(fixes B1)*

**2a. `assets/js/site.js:370-386`** — move the disclaimer above the receipt.

Before:
```js
    return `<div class="receipt">
      <div class="big">Twisted Roots Merc</div>
```
After:
```js
    return `<p class="demo-banner"><b>Demo site</b> — nothing has been ordered, reserved
      or charged. In the live store this drops straight into Square and prints at the counter.</p>
    <div class="receipt">
      <div class="big">Twisted Roots Merc</div>
```
and delete the trailing `<p class="small muted" style="margin-top:18px">This is a demo — …</p>` at `site.js:384`.

**2b. `assets/js/site.js:836-843`** — `tellUsModal`'s success has no disclaimer at all. Insert the same `<p class="demo-banner">` as the first line of the replacement `innerHTML`, and soften `"Carrie reads these Sunday nights"` to `"In the live store, Carrie reads these Sunday nights."`

**2c. `assets/js/cart.js:213`** — replace the bare fallback.

Before: `alert("Basket reserved. Bring your name to the counter.");`
After: `alert("Demo site — nothing was reserved and nothing was charged. In the live store this would be set aside under your name.");`

**2d.** Retitle the three success modals so the title itself carries the state: `"We've got it"` → `"Demo — kit hold"`, `"Set aside for you"` → `"Demo — basket reserved"`, `"In the kitchen"` → `"Demo — order sent"` (`site.js:828, 850, 859`).

---

### Patch 3 — Focus management for both dialogs *(fixes B2)*

**3a. Focus return.** In `site.js`, store the trigger before opening and restore on close.

`site.js:328` (`modal()`), add near the top:
```js
    modal._returnTo = document.activeElement;
```
`site.js:349-353` (`closeModal()`), add before the function ends:
```js
    if (modal._returnTo && document.contains(modal._returnTo)) modal._returnTo.focus();
    modal._returnTo = null;
```
Same pair in `cart.js:197` / `cart.js:198`.

**3b. Focus in, for the drawer.** `cart.js:197`, after `paint()`:
```js
    var f = $(".cartdrawer__x"); if (f) setTimeout(function(){ f.focus(); }, 40);
```

**3c. Focus trap.** Add one shared helper and call it from both `open()` functions:
```js
  function trap(panel){
    panel.addEventListener("keydown", function(e){
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
  }
```

**3d. Announce results.** Add `role="status" aria-live="polite"` to `.modal-body` (`site.js:334`) and to `[data-cartbody]` (`cart.js:126`), and move focus to the receipt heading after each submit (`site.js:827, 836, 851, 860`).

**3e.** `site.js:352` and `cart.js:198` both reset `document.body.style.overflow`. Guard: only reset if no other dialog is open.

---

### Patch 4 — Make "Hold this kit" use the basket *(fixes H5, the biggest single UX win)*

**File:** `assets/js/site.js:290` and the `[data-holdkit]` handler.

Before — `data-holdkit` opens `holdForm()`, a second reservation system.
After — the button adds every item in the kit to the basket and opens the drawer:
```js
    if (t.closest("[data-holdkit]")){
      e.preventDefault();
      var k = TR_KITS.filter(function(x){ return x.id === t.closest("[data-holdkit]").dataset.holdkit; })[0];
      if (k){ k.items.forEach(function(id){ TRCart.add(id, 1); }); TRCart.open(); }
      return;
    }
```
Relabel the button from **"Hold this kit"** to **"Add the kit"** (`site.js:290`). Delete the now-unused `holdForm()` (`site.js:355-365`) and its submit handler (`site.js:816-829`), plus the already-dead `[data-hold]` branch at `site.js:777-782`.

---

### Patch 5 — Say which reservation is which

Add one line under every kit card and at the top of the bakery order form:

> *Kits and shelf items go in the same basket. Hot food is a separate order to the kitchen.*

And move `shop.html:163-171` ("Three steps, none of them a checkout") into a shared partial so it also appears on `merc.html`, `yard.html` and `storm.html` — the three pages that render kits.

---

### Patch 6 — Fix the mobile dock CTA *(fixes H6)*

**File:** `assets/js/site.js:584-591`

Before:
```js
    var onBakery = location.pathname.indexOf("bakery.html") > -1;
    var href = onBakery ? "#order" : "bakery.html#order";
    …
      '<a class="dockbar__cta" href="' + href + '">Order Online</a>' +
```
After — make the dock reflect the page, and never claim online ordering:
```js
    var p = location.pathname;
    var food = /bakery|kitchen|recipes/.test(p);
    var href = food ? (p.indexOf("bakery.html") > -1 ? "#order" : "bakery.html#order") : "shop.html";
    var label = food ? "Order for pickup" : "Shop the shelf";
    …
      '<a class="dockbar__cta" href="' + href + '">' + label + '</a>' +
```
Then add a basket button to the dock so the basket is reachable on a phone without scrolling to the header:
```js
      '<button class="dockbar__btn" data-carttoggle aria-label="Basket, empty">' +
        '<span class="cartbadge" data-cartcount hidden>0</span>…</button>' +
```

---

### Patch 7 — Connect the bakery menu to the bakery order *(fixes H7)*

**File:** `assets/js/site.js:311-325` (`paintBakery`) and `bakery.html:186-225`

Give every in-stock menu row an **"Add to order"** button that appends `"1 × The Twisted Root"` to `#ow` and scrolls to `#order`:
```js
      `<button class="btn btn--sm btn--amber" data-bakeadd="${esc(b.n)}">Add to order</button>`
```
```js
    var ba = t.closest("[data-bakeadd]");
    if (ba){
      var ta = $("#ow");
      ta.value = (ta.value ? ta.value + "\n" : "") + "1 x " + ba.dataset.bakeadd;
      $("#order").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
      ta.focus();
      return;
    }
```
Then render a running total above the submit button from the menu prices, so the user knows what they are about to owe.

---

### Patch 8 — Show the count in every stock state *(fixes H8)*

**File:** `assets/js/site.js:51-57`

Before:
```js
  function stockLabel(it){
    const st = stockState(it);
    if (st === "out") return "Out of stock";
    if (it.d === "yard") return `${it.q} out back`;
    if (st === "low")  return `Only ${it.q} left`;
    return "In stock";
  }
```
After:
```js
  function stockLabel(it){
    if (it.q <= 0) return "None left";
    if (it.d === "yard") return `${it.q} out back`;
    if (it.q <= 3)       return `${it.q} left — last few`;
    return `${it.q} on the shelf`;
  }
```
This makes every row comparable, keeps the yard and bakery wording that already works, survives Storm Mode without inverting (`stormMin` still drives the meters and the `.stk--low` colour, just not the words), and finally keeps the promise the footer makes on all 14 pages. `shop.js:146-150` calls straight through and needs no change.

---

### Patch 9 — Guard the destructive basket actions *(fixes H10, H11)*

**File:** `assets/js/cart.js`

**9a.** `cart.js:80` — do not let `−` or a typed `0` delete a line. Clamp to 1 and require the explicit `×`:
```js
    if (isNaN(qty) || qty <= 0) { qty = 1; }
```
**9b.** `cart.js:83` — tell the user when a typed quantity is clamped, reusing the existing pattern:
```js
    var want = Math.min(qty, onHand(id));
    if (want < qty) flash(id, "max");
    line.qty = want;
```
**9c.** `cart.js:194` — confirm before emptying:
```js
    if (t.closest("[data-cartclear]")) {
      if (count() && !confirm("Empty the basket? This cannot be undone.")) return;
      clear(); return;
    }
```
**9d.** `cart.js:181` — the quantity input has no `type`, so it accepts letters:
```js
'<input type="text" inputmode="numeric" pattern="[0-9]*" data-qtyset="…" aria-label="Quantity of ' + esc(it.n) + '">'
```
Note the per-item `aria-label`; today every row's input, `−` and `+` are named identically ("Quantity", "One fewer", "One more").
**9e.** `cart.js:184` — show the unit price: `money(it.p) + " each"` beside the line total. And put the count in the drawer heading: `<h3>Your basket <span data-cartcount>0</span></h3>`.

---

### Patch 10 — Rescue `board.html` *(fixes H12)*

1. `board.html` and `journal.html` have the same `<h1>` and `<title>` ("The Board"). Rename `journal.html` to **"Notes"** or **"How-To"** — it is 104 how-to articles — and leave "The Board" to the page that is actually a notice board.
2. Add `board.html` to the header nav on all 14 pages, or at minimum to the footer "Twisted Roots" column beside "The Board" (`shop.html:196` and its 13 siblings).
3. Add `<url><loc>https://twistedrootsmerc.com/board.html</loc></url>` to `sitemap.xml` — `grep -c board.html sitemap.xml` currently returns 0.
4. `board.html:92-93` hard-codes "Current notices 3" and "Last written on Aug 17". Derive both, or delete them.

---

### Patch 11 — Tell yard customers where to collect *(fixes H9)*

**File:** `assets/js/site.js:449` and `:382`

Make both strings conditional on whether the basket contains any `d === "yard"` line:

Before (`site.js:382`): `It's behind the counter. Just say your name.`
After:
```js
      ${hasYard
        ? "The small stuff is behind the counter and the yard items are stacked out back. Pull the truck round — we will load it."
        : "It's behind the counter. Just say your name."}
```
Same treatment for the pre-submit copy at `site.js:449-450`.

---

### Patch 12 — A compact sticky control bar on `shop.html` *(fixes H13)*

**Files:** `shop.html:88-152`, `assets/js/shop.js`

The full controls band is too tall to make sticky as-is. Split it: leave the four filter groups in the scrolling band, and lift a single compact row — the search input, the active-filter count, and a "Filters" disclosure — into a sticky bar:
```html
<div class="shopstick">
  <form data-shopform role="search">…</form>
  <button type="button" class="btn btn--sm btn--ghost" data-shopfilters aria-expanded="false">Filters <b data-shopfiltern></b></button>
  <p class="shopbar__count" id="shopCount" role="status" aria-live="polite"></p>
</div>
```
```css
.shopstick{ position:sticky; top:var(--head-h); z-index:150; background:var(--sand);
  display:flex; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line) }
```
Context: `document.documentElement.scrollHeight` on `shop.html` is 23,346px and the grid alone is 20,869px.

---

### Patch 13 — Remove the payment claim *(fixes H14)*

**File:** `bakery.html:182-183`
Before: `Pick your time, we'll have it bagged with your name on it. Pay here or pay at the counter — both are fine with us.`
After: `Pick your time, we'll have it bagged with your name on it. Nothing is charged here — you pay at the counter when you collect it.`

---

### Patch 14 — Delete the duplicate script tags *(fixes H15)*

**File:** `journal.html:1450-1453` and all 208 files in `blog/`

Delete these four lines wherever they appear:
```html
<script src="assets/js/catalog.js"></script>
<script src="assets/js/site.js"></script>
<script src="assets/js/motion.js"></script>
<script src="assets/js/roots.js"></script>
```
(keep the `?v=` versioned copies above them). Verify with:
```sh
for f in *.html blog/*.html recipes/*.html; do n=$(grep -c 'js/site.js' "$f"); [ "$n" = 1 ] || echo "$f x$n"; done
```
which should print nothing. Then check `journal.html`'s console is clean — it currently throws `SyntaxError: Identifier 'TR_DEPTS' has already been declared` and `SyntaxError: Identifier 'TR' has already been declared`.

---

### Patch 15 — Empty states for every data container *(fixes M4)*

**File:** `assets/js/site.js` — `paintLists()` (`:255-271`), `paintMeters()` (`:236`), `paintKits()` (`:274`), `paintRequests()` (`:299`)

Add one shared helper and use it in all four:
```js
  function empty(msg, ask){
    return `<p class="emptystate">${esc(msg)}
      <button class="btn btn--sm btn--ghost" data-tellus="${esc(ask || "true")}">Tell us to stock it</button></p>`;
  }
```
```js
    mount.innerHTML = items.length ? items.map(prodRow).join("") : empty("Nothing on this shelf right now.");
```
Priority order: `storm.html` (7 containers, and a sold-out storm wall is the page's own scenario), `hq.html` (the *good* day renders as a broken dashboard — empty `<thead>`, enabled "Create purchase orders" button), then merc, yard, hunt, local, roots, index.

---

### Patch 16 — Make 161 recipes and 104 posts findable *(fixes H16, M15)*

1. Add a client-side search box to `kitchen.html` and `journal.html`, filtering the already-rendered cards — the same debounce-and-filter pattern as `shop.js:499-522`.
2. Alternate the band backgrounds on `kitchen.html`. It currently runs **eight consecutive `band--paper`** sections; every other page alternates.
3. Create `recipes/index.html` and `blog/index.html`, or `<link rel="canonical">` them to their hubs. 265 pages currently hang off two card walls with no second route in.

---

### Patch 17 — Connect recipes to the shelf *(fixes H17)*

**Files:** `build_recipes.py`, `recipes/*.html`

1. Tag each recipe with the catalogue ids it needs, then render an **"On our shelf"** block under "What you need" using the existing `prodRow()` output so the ingredients are addable.
2. Point "Shop the shelf" at a pre-filtered URL — `../shop.html?q=flour` — and teach `shop.js` to read `?q=` on load.
3. Stock the ingredients the recipes call for. `grep -i flour assets/js/catalog.js` currently returns nothing, on a site with 34 bread recipes.

---

### Patch 18 — Repair the heading ranks *(fixes M5)*

* `index.html` — ten `<h2 class="h1">`. Keep `.h1` for the three or four genuine chapters; move the rest to `.h2`.
* Level skips `h1 → h3`: `index.html:192`, `merc.html:113`, `hq.html:71`. Insert the missing `<h2>` or promote.
* `<h3 class="h2">` at `merc.html:216`, `hunt.html:365`, `local.html:111/128/145`, `roots.html:110/128`. Choose the tag for rank and the class for size deliberately, not to fit.
* `bakery.html` — "Breakfast"/"Lunch" are `.h1` and "Coffee"/"Grab & Go" are `.h2` at the same rank.
* `roots.html:101-138` — the Carrie/Eric section has no section heading at all; each person's name lives in a `<p class="eyebrow">` while the `<h3 class="h2">` above them reads "Runs the front, the kitchen, and most of the decisions." with no subject.
* `board.html` — the closing CTA is `.h1` while all ten notices are `.h2`.

---

### Patch 19 — Navigation state *(fixes M6)*

* `journal.html:46` and `kitchen.html:46` — `aria-current="page"` is on the **Merc** link. Move it to Board and Recipes respectively.
* `storm.html`, `hunt.html` — add `aria-current="page"` to their own nav links.
* `visit.html:51-62` — restore the missing `<a class="nav-cta" href="shop.html">Shop Now</a>`.

---

### Patch 20 — Pause motion in a background tab *(fixes M1)*

One listener, in `motion.js`:
```js
  document.addEventListener("visibilitychange", function(){
    document.getAnimations().forEach(function(a){
      if (a.effect && a.effect.getTiming().iterations === Infinity){
        document.hidden ? a.pause() : a.play();
      }
    });
  });
```
Context: 33 animations were still `running` at the foot of `index.html` with none of them on screen. Also reduce `index.html:168` from `data-crows="5"` to `data-crows="3"`, and move `.perchcrow` (`site.css:802`) from `z-index:201` to `199` so it stops crossing the sticky nav.

---

### Patch 21 — One address *(fixes M7)*

**File:** `visit.html:82` and `:86`
`<h2>` says "Highway 229, Siletz, Oregon 97380"; the footer, every other page and the JSON-LD at `index.html:57` say "101 & 151 N Gaither St". The directions link queries `Siletz+Oregon+97380` with no street. Pick one and make the map link street-accurate.

---

### Patch 22 — Validation, errors and recoverable forms *(fixes M8)*

* Add inline error messaging: `aria-invalid`, a `.field__err` with `role="alert"`, and a `submit` handler that calls `checkValidity()` before proceeding. Seven form surfaces currently rely entirely on native bubbles.
* `site.js:865-871` — stop permanently disabling every control. Disable the submit button only, and offer "Start another order".
* Add `role="status"` to `[data-formnote]` (`visit.html:172`, `bakery.html:223`) and to `#hqCreateNote`.
* Add `autocomplete="name"` / `"tel"` to `visit.html:166-170`, `bakery.html:189-207` and `site.js:394-398`.
* Give the two "Phone or email" fields (`visit.html:167`, `site.js:398`) a real `inputmode`, or split them.

---

### Patch 23 — Give the suggestion modal a title per context *(fixes M9)*

**File:** `assets/js/site.js:389`
Accept a `kind` argument and switch the title, the field label and the placeholder:

| Trigger | Title | Field label |
|---|---|---|
| footer, shop, merc, yard, hunt | What should we carry? | What are you looking for? |
| `kitchen.html:161` | Send us a recipe | What's the recipe? |
| `journal.html:745` | Ask the board | What's the question? |
| `local.html:199` | Tell us about your work | What do you make? |
| `board.html:587` | Something for the board | What's the notice? |

---

### Patch 24 — Accessible names on product actions *(fixes M10)*

**File:** `assets/js/site.js:157`
Before: `<button class="btn btn--sm btn--amber btn--add" data-add="${it.id}">Add</button>`
After: `<button class="btn btn--sm btn--amber btn--add" data-add="${it.id}" aria-label="Add ${esc(it.n)} to the basket">Add</button>`
`shop.js:321` already does this. While there, consider a `−/+` on the row so basketing four does not mean four silent clicks.

---

### Patch 25 — One "Shop Now" in the header *(fixes M11)*

**Files:** all 14 pages, the `.nav-cta` at `shop.html:63` and its siblings
Two identical amber buttons with the same label and destination sit side by side in the header of every page. Keep the `.head-cta` one (it stays visible when the nav collapses) and drop the `.nav-cta`. The freed space is where the basket count and the open/closed pill should live below 1180px.

---

### Patch 26 — `hq.html` housekeeping *(fixes M12)*

* `hq.html:144-153` — six `<label>` without `for` and `<input>` without `id`. Add matching pairs, or make them non-focusable `<p>` elements since they are readonly mock-ups.
* `hq.html:271` — the button relabels itself "Purchase orders drafted in Square ✓". Prefix it: "Demo — POs drafted ✓".
* `hq.html:102` and `:116` — hide the `<thead>` and show "Nothing needs reordering today." when the tbody is empty.
* Ship a stripped header and footer on the owner dashboard: no customer nav, no "Shop Now" ×2, no basket, no "Owner login" link from inside the owner login.

---

### Patch 27 — Real pickup times *(fixes M13)*

**File:** `bakery.html:196-207`
Build the options from `STORE.hours` and the clock (`site.js:65-74` already computes both), so a 1am visitor cannot pick "Today / 7:00 am", and so the list changes when Today/Tomorrow changes.

---

### Patch 28 — Skip link *(fixes M14)*

**Files:** all 14 pages, first child of `<body>`
```html
<a class="skip-link" href="#main">Skip to content</a>
```
and add `id="main"` to the existing `<main>`. `polish.css` §8f already styles it — no CSS follow-up needed.

---

### Patch 29 — Remove dead code and inline padding *(fixes L9, P2)*

* `site.js:777-782` — the `[data-hold]` branch is unreachable; nothing emits `data-hold=`.
* `motion.css:494-510` `.fogdrift` and `:582-602` `.birds` appear in no HTML.
* `merc.html:91`, `visit.html:90` — delete `style="padding-top:clamp(48px,6vw,84px)"` so `.band--tight` is 72/72 everywhere.
* `shop.html:81` — delete `style="padding-top:clamp(40px,5vw,72px)"`; it equals the default.

---

### Patch 30 — Break up the three prose walls *(fixes L7)*

* `board.html:206-211` (~100 words) is literally a checklist — can opener, cash, bar oil, D cells, prescription, power bank, CO detector batteries — written as one paragraph. Make it a `<ul>`.
* `storm.html:97-100` (~65 words) — eight kit items as a comma list. Same treatment.
* `hunt.html:142-145` (~62 words) — six unbroken paragraphs of legal caution in `#notus`. Add subheads.

---

## 8. Shortest path to 9.5

Ten items. Everything else in §7 is worth doing but does not move the number.

| # | Patch | Fixes | Effort |
|---|---|---|---|
| 1 | **Link `polish.css`** | H1, H2, H3, H4, M1, M2, M3, M14, L1, L2, L3, L6, and mitigates B1 | 30 min |
| 2 | **Patch 2** — demo banner first, `tellUsModal` disclaimer, `alert()` copy | **B1** | 1 h |
| 3 | **Patch 3** — focus trap, focus return, `aria-live` | **B2** | 3 h |
| 4 | **Patch 8** — show the count in every stock state | H8, and the site's central promise | 30 min |
| 5 | **Patch 4** — "Hold this kit" adds to the basket; delete `holdForm` | H5 | 2 h |
| 6 | **Patch 6** — dock CTA stops saying "Order Online"; add a basket button | H6 | 1 h |
| 7 | **Patch 7** — bakery menu rows add to the order; show a total | H7 | 3 h |
| 8 | **Patch 9** — confirm/clamp/undo on the basket | H10, H11 | 1 h |
| 9 | **Patch 12** — sticky compact shop bar | H13 | 3 h |
| 10 | **Patch 14 + 13 + 10** — duplicate scripts, "Pay here", `board.html` orphan | H15, H14, H12 | 2 h |

**≈ 17 hours.** Items 1–4 alone (about 5 hours) take UI to ~9.2 and UX to ~8.0 — they are the ones where the site is currently either failing a standard or actively misleading someone. Items 5–9 are what turn four disconnected mechanisms into one product, and they are the difference between 8 and 9.5 on UX.

The two things not on this list that would matter most afterwards: **Patch 17** (recipes that can put their ingredients in the basket) and **Patch 16** (search for 265 content pages). Both are larger than a polish pass, and both would take the content side of the site from good writing to a working product.

---

*Companion file: `assets/css/polish.css` — every rule annotated with the measurement that justifies it.*
