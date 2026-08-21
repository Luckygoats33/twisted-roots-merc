# SHOP-NOTES.md — the shop page

`shop.html` · `assets/js/shop.js` · `assets/css/shop.css`

The browse-and-buy page. Everything the store has, in one grid, with a
filter rack over the top of it. No existing file was edited to build it.

---

## What it is

A storefront that is honest about not being a checkout. Twisted Roots takes
payment at the counter, so this page fills a **pickup basket** — `cart.js`,
already written, already styled — and the copy never says buy, cart or
order. It says basket, set aside, and pay when you collect.

Structure, top to bottom:

1. **Hero** — one screen-inch of it. States what the page is and what
   happens when you press Add. A utility page does not get a cover.
2. **The controls** — live search, department chips, price chips, location
   chips, an in-stock toggle and a sort. All in one sand band.
3. **The count line** — a live region that says what is on screen and out
   of how many.
4. **The grid** — every matching item as a card.
5. **How the basket works** — three sentences and the "tell us what to
   carry" button, which is the same one the whole site uses.

---

## The shelf: where the 260 items come from

| Source | Items | Basketable |
|---|---|---|
| `TR_CATALOG` (hard goods) | 236 | yes — `data-add` |
| `TR_BAKERY` (bakery rack, kitchen, coffee, grab & go) | 24 | no |
| **Total on the page** | **260** | 236 |

**`TR_CATALOG` is 236 items, not ~270.** The brief said ~270; that is what
the two lists come to together, so the page renders both.

The `bakery` department exists in `TR_DEPTS` but **has no members in
`TR_CATALOG`** — the bakery lives in `TR_BAKERY`, which is a different
shape (`{id,n,desc,p,q,cat,img,star}`, no `d`, no `a`, no `t`, no `min`).
`shop.js` normalises both into one list at load so the eighth department
chip is a real chip with 24 things behind it rather than a dead zero.

Two consequences worth knowing:

- **`TRCart.add()` cannot hold a bakery item.** It resolves ids against
  `TR_CATALOG` only, so `add("b01")` returns false. Rather than ship an Add
  button that silently does nothing, kitchen items get a real link to
  `bakery.html#order`, which is where kitchen orders actually go.
- **Kitchen items carry `q:99`** as a sentinel for "made to order", not as
  a count. So they show a *Made to order* chip instead of "In stock", and
  the "most on hand" sort pushes them to the bottom instead of letting a
  sandwich outrank a pallet of 2×4s (`onHand()` in `shop.js`).

### Measured department counts

| Department | Count |
|---|---|
| Everyday | 36 |
| Fix It | 88 |
| The Yard | 17 |
| Storm Ready | 22 |
| Outdoors | 13 |
| Hunt & Field | 48 |
| Local | 12 |
| Bakery + Kitchen | 24 |
| **Total** | **260** |

### Measured stock spread

`TR_CATALOG` contains **zero out-of-stock items**. The only two things on
the whole page that are out are bakery — Marionberry Hand Pie and Cinnamon
Bread Loaf, both `q:0`. They are the page's only live test of the
out-of-stock path, and both render a `data-tellus` button and no `data-add`.

- In stock: 252 · Only N left: 6 · Out of stock: 2
- With Storm Mode on the raised `stormMin` floors move 38 items from
  *In stock* to *Only N left* (6 → 44). The page repaints off a
  `MutationObserver` on `<html data-storm>` rather than a second event.

### The location facet

Twenty-eight distinct aisle strings would be twenty-eight chips, which is
a list, not a filter. They are grouped into twelve places you would
actually walk to:

Aisles 1–6 (25) · Fix It wall (88) · Hunt wall (35) · Front counter (7) ·
Behind the counter (12) · Storm wall (22) · Outdoors corner (12) ·
Cooler & ice (5) · Local shelf (10) · Out back (18) · Out front (2) ·
Bakery counter (24). Sums to 260.

---

## How the filters combine

**AND across types, OR within a type.** Pick Fix It and Storm Ready and you
get both departments; add the $10–$25 band and you get both departments
inside that band. Verified:

- `q=battery` → 6
- `q=battery` + `dept=fixit` → 1
- `q=battery` + `dept=fixit,storm` → 3
- `price=50up` → 11 · `+ loc=hunt` → 5

**Facet counts ignore their own filter.** The number on a department chip
is how many you would get *if you pressed it*, computed against every other
active filter — not how many survive the filter you have already applied.
Otherwise every unselected chip reads 0 the moment you select one, which
tells nobody anything.

---

## The URL is the state

`?q=battery&dept=fixit,storm&price=10-25&loc=behind&stock=in&sort=price-asc`

Everything round-trips. Defaults are omitted, so an untouched page has a
clean URL. Unknown values are dropped on read rather than trusted.

- Typing **replaces** the history entry (debounced 140ms). Nobody wants to
  press back eleven times to undo the word "flashlight".
- Chips, the sort and the reset **push** one entry each, so back walks the
  filters off one at a time. `popstate` re-reads the URL, re-syncs the
  input and select, and re-renders.
- Verified: three filters forward, three backs, one forward — controls and
  results matched the URL at every step, including a hard reload.

---

## Performance — measured, not guessed

Chrome, `localhost`, 260 cards, `performance.now()` around the whole
render (evaluate + facet counts + sort + one `innerHTML` write):

| | ms |
|---|---|
| innerHTML write only | ~6 |
| render + **forced full layout**, no `content-visibility` | 26–30 |
| render + forced full layout, **with `content-visibility:auto`** | 5.6–11.2 |

The `innerHTML` write was never the problem. Laying out 260 cards that are
mostly below the fold was. `.prodcard` carries
`content-visibility:auto; contain-intrinsic-size:auto 183px` (183px is the
measured real card height), which takes a filter change from about two
frames to well under one.

**So there is no "show more" button and no windowing.** The whole shelf
renders in one pass every time, because measurement said there is nothing
to protect anyone from. Steady-state renders on a warm page run 0.5–8ms.

---

## Accessibility

- Every filter is a real `<button type="button">` with `aria-pressed`.
  "Everything" is a pressed-when-nothing-else-is reset.
- Each chip row is a `role="group"` labelled by its own heading, so a
  screen reader announces "Department, group" before the chips.
- `#shopCount` is `role="status" aria-live="polite" aria-atomic="true"` and
  is the input's `aria-describedby`, so the result count is announced as
  you type.
- Focus is the site's own `:focus-visible` amber ring; nothing removes it.
- One `<h1>`. Add buttons carry `aria-label="Add <name> to the basket"` so
  a list of buttons all reading "Add" is never what gets announced.

### Tap targets

At 390px every control on the page measures ≥44px. The sizing block is
`@media (max-width:640px), (pointer:coarse)` — a 768px tablet is still a
thumb, so it keys off the input device, not just the width. At 1280px with
a mouse the chips sit at 39.5px, which is the site's existing `.chip` size
and deliberate.

### Responsive

No horizontal overflow at 390 / 768 / 1280px; nothing on the page has a
box crossing the viewport edge. Grid columns: 1 / 2 / 4.

---

## Things that would have broken and did not

- **`data-dept` is taken.** `site.js`'s `paintLists()` does
  `$$("[data-dept]").innerHTML = …product rows…`, and it runs again on
  every Storm Mode toggle. Department chips are therefore
  `data-deptchip`, price `data-pricechip`, location `data-locchip`.
  Toggling Storm Mode with `data-dept` would have replaced the entire
  filter rack with a list of groceries.
- **`.btn` beats `[hidden]`.** `.btn{display:inline-flex}` is a class
  selector and outranks the UA sheet's `[hidden]{display:none}`, so the
  "Clear it all" button sat there offering to clear filters nobody had
  set. Fixed with `[data-shopreset][hidden]{display:none}` in `shop.css`.
- **Search input id.** `site.js` binds `#siteSearch` and `[data-searchform]`
  and writes into `#searchResults`. This page uses `#shopSearch` and
  `[data-shopform]` so the two search engines never touch each other.
- **`in-cart` marks.** `cart.js` paints `.in-cart` onto the `[data-add]`
  buttons that exist *at the time*. Ours are replaced on every render, so
  the class is written into the template from `TRCart.has()` and re-applied
  on `tr-cart-change`.

---

## Verified in Chrome at localhost:8899

- Zero console messages, errors or warnings, on load and after exercising
  every control.
- All 260 items render; department counts as tabled above.
- Search, all four filter types and all five sorts work, and work together.
- Add → `TRCart.count()` 0 → 2, header badge shows 2, subtotal $33.98,
  button goes `in-cart`.
- 236 Add buttons on the page, 2 Tell-us buttons, and **0** items that are
  out of stock and addable.
- URL state round-trips through a hard reload; back and forward walk the
  filter history correctly.
- Empty state (no search match, and impossible filter combination) renders
  in voice and its Tell-us button opens the site's own modal prefilled
  with the query.
- Storm Mode repaints the grid and leaves the filter rack intact.

---

## If the catalogue changes

Nothing here hardcodes an item. Departments come from `TR_DEPTS`, so a new
one only needs adding to `DEPT_ORDER` in `shop.js` to get a chip. A new
aisle string that matches none of the twelve `LOCATIONS` tests falls into
no location bucket — it still renders and still searches, it just will not
appear under any location chip, so add a test when you add a room.
