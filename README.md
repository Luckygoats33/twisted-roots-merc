# Twisted Roots Merc — twistedrootsmerc.com

Static website for **Twisted Roots Merc** — mercantile, bakery and kitchen at
**101 & 151 N Gaither St, Siletz, Oregon 97380**.

> Good food. Good goods. Deep roots.

No build step, no framework, no dependencies. Plain HTML, CSS and vanilla JS.
Open `index.html` or serve the folder and it runs.

```bash
cd twisted-roots-merc
python -m http.server 8899
# http://localhost:8899
```

---

## The idea the site is built around

The business has **two halves under one roof**:

| | |
|---|---|
| **The Merc** | Everyday · Fix It · The Yard · Storm Ready · Outdoors · Local |
| **Bakery + Kitchen** | Breakfast · Lunch · Coffee · Fresh baked |

The food side creates the traffic. The merc side is why the trip to Newport
doesn't happen. The website exists to answer two questions fast:

1. **Does Twisted Roots have it right now?**
2. **What can I grab to eat while I'm there?**

Everything else is secondary.

---

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — hero, drive-time comparison, live board, stock search, the two halves, Our Goods, kits, storm status, requests |
| `merc.html` | The Merc — Everyday, Fix It (7 sections), Outdoors, and an honest "what we don't carry" |
| `bakery.html` | Bakery + Kitchen — today's rack with live counts, breakfast, lunch, coffee, grab & go, pickup ordering |
| `yard.html` | The Yard — lumber and concrete stock by rack, plus a how-to-set-a-post guide |
| `storm.html` | Storm Ready — live storm supply status, categories, kits, and how Storm Mode works |
| `local.html` | Local Goods — maker stories, the full local shelf, Twisted Roots merch |
| `roots.html` | Our Roots — Carrie & Eric, why the store exists, what they deliberately didn't build |
| `visit.html` | Visit — hours, directions, the four counters, contact, and who else to call |
| `hq.html` | **Private owner dashboard demo** — low stock, reorder quantities, supplier POs. Excluded from search. |

---

## How the data works

Everything on the site is driven by **`assets/js/catalog.js`**, which is a
stand-in for the live Square catalog.

```js
{ id:"e08", n:"AA Batteries, 8pk", d:"everyday",
  p:9.99, q:6, min:10, stormMin:100,
  a:"Front Counter", t:["aa","battery","batteries","power"] }
```

| Field | Meaning |
|---|---|
| `id` | Stable item id |
| `n` | Display name |
| `d` | Department key (`everyday`, `fixit`, `yard`, `storm`, `outdoors`, `local`) |
| `p` | Price |
| `q` | Quantity on hand |
| `min` | Reorder floor — at or below this the item reads **low** |
| `stormMin` | Raised floor used when Storm Mode is on |
| `a` | Aisle / location shown to the customer |
| `t` | Search tags — what a person would actually type |

**In production a small sync job writes Square Catalog + Inventory into this
exact shape.** Nothing else on the site changes. See `TECH-PLAN.md`.

Also in that file: `TR_BAKERY` (menu + daily counts), `TR_INTENTS` (natural
language → what you need), `TR_KITS` (project bundles), `TR_REQUESTS` (the
public "you asked, we got it" board).

### Template hooks

Drop these attributes on an empty element and `site.js` fills it in:

| Attribute | Renders |
|---|---|
| `data-dept="fixit"` | Every item in a department |
| `data-aisle="Fix It 4"` | Every item in one aisle |
| `data-ids="f27,f28,f30"` | A hand-picked list |
| `data-meters="s01,e08,..."` | Stock level bars |
| `data-kits` | The project kit cards |
| `data-bakery="breakfast"` | A menu section |
| `data-requests` | The customer request board |
| `data-board` | The "Today at the Merc" status board |
| `data-ticker` | The scrolling item ticker |

---

## The features worth knowing about

**Search that understands plain English.** Type `leaky toilet` and you get a
flapper, fill valve and supply line with a note from the counter — not zero
results. The mapping lives in `TR_INTENTS`. Try `power out`, `fence post`,
`clogged drain`, `going camping`, `car won't start`.

**Live stock, honestly.** `In stock` / `Only 3 left` / `Out of stock`, and for
the yard, `18 out back`. Out-of-stock items are ranked down in search and offer
"Tell us" instead of "Hold it".

**Hold for pickup.** No account, no prepay. Name and phone, and it prints a
receipt-style ticket. Wired to `TR_KITS` too, so a whole kit can be held.

**Storm Mode.** One toggle (footer, storm page, and the HQ dashboard). It raises
every `stormMin` threshold, re-scales the public status bars, changes the board,
puts a banner across the site, turns the roots teal and starts the rain. It is
the same switch Carrie flips behind the counter.

**The root system.** `assets/js/roots.js` procedurally grows a root network out
of the carved sign in the header, down the full measured height of the page,
branching into every section as you scroll and converging again at the footer
logo. It re-grows on resize and as client-rendered lists change the page height.

**The owner dashboard** (`hq.html`) turns the same catalog into "here is what to
order, grouped by supplier, press one button."

---

## Files

```
twisted-roots-merc/
├── index.html … visit.html      pages
├── hq.html                      private owner dashboard
├── assets/
│   ├── css/site.css             design system
│   ├── css/roots.css            the living root system
│   ├── css/motion.css           hanging sign, wood, coastal motion
│   ├── js/catalog.js            THE DATA (swap for Square sync)
│   ├── js/site.js               search, stock, storm mode, holds
│   ├── js/roots.js              procedural root growth
│   ├── js/motion.js             scroll motion, parallax, count-ups
│   ├── img/                     photography + generated storefronts
│   └── video/                   background clips
├── _parts/ + build.py           page assembler (shared header/footer)
├── TECH-PLAN.md                 store → website technology plan
├── QA-REPORT.md                 audit findings
└── seo/, print/                 metadata, schema, Vistaprint copy
```

### Rebuilding pages

The header and footer are shared. `merc.html` is the template. To change the nav
or footer, edit `merc.html`, then:

```bash
python build.py     # rebuilds bakery, yard, storm, local, roots, visit, hq
```

`index.html` is hand-maintained and is **not** regenerated by the builder —
update its header/footer by hand if you change them.

---

## Imagery

The storefront, interior and yard images (`assets/img/tr-*.jpg`) are generated
concept art: the real building at 101 & 151 N Gaither St reimagined as an Old
West false-front mercantile, with the actual carved Twisted Roots sign. **Replace
these with real photography once the store is built.**

All other photography is Pexels stock (free for commercial use, no attribution
required). Sources are recorded in `assets/img/_manifest.json`.

The logo is `assets/img/logo-carved.png`; `logo-trans.png` and
`logo-trans-sm.png` are background-removed versions for use on any colour.

---

## Before this goes live

- [ ] Replace the placeholder phone number `(503) 706-2801` everywhere
- [ ] Replace generated storefront art with real photos of the finished building
- [ ] Real photos of Carrie and Eric on `roots.html`
- [ ] Confirm final hours in `assets/js/site.js` → `STORE.hours` **and** `visit.html`
- [ ] Point `catalog.js` at the Square sync instead of demo data
- [ ] Wire the pickup, order and contact forms to a real endpoint (they are demos)
- [ ] Put `hq.html` behind real authentication, or move it off the public site
- [ ] Confirm prices — everything in `catalog.js` is a plausible placeholder
