# Hunt & Field — build notes

Built 2026-08-20. Files owned by this task:

- `_parts/hunt.html` — the `<main>` content (source of truth)
- `hunt.html` — the built page
- `HUNT-NOTES.md` — this file

Nothing else was edited. `_parts/pages.json`, `build.py`, `index.html`, `merc.html`,
`assets/js/catalog.js`, `assets/js/site.js` and all CSS are untouched.

---

## 1. How it was built

`hunt.html` is **not** produced by `build.py` — the page is not in `_parts/pages.json`
and that file is owned by another process. Instead the page was assembled by copying
`merc.html` verbatim and substituting the `<head>` and `<main>`, exactly as instructed.

The build script lives outside the repo at:

```
%TEMP%\claude\C--windows-system32\a8756d0b-121e-4bc8-b8b0-5b92a180bb26\scratchpad\build_hunt.py
```

It reads the current `merc.html`, pulls the stylesheet block out of it live (so the
`?v=` cache-busting hashes are always whatever merc is currently on rather than a
hardcoded copy), swaps head + main, clears `aria-current`, rewrites merc's two in-page
`#check` anchors to `merc.html#check`, and appends the `crows.js` tag lifted verbatim
from `yard.html`.

Chrome parity was verified by diffing everything between `<body>` and `<main>`, and
everything after `</main>`, against `yard.html`:

- footer chrome: **byte-identical**
- header chrome: **byte-identical** once `aria-current="page"` is normalised — hunt is
  not in the nav, so it has no current-page marker. See §5.1.

### Re-building after editing `_parts/hunt.html`

If the scratchpad script is gone, re-run the same three steps by hand, or add
`hunt.html` to `_parts/pages.json` once whoever owns that file is ready (note that
`build.py`'s head template is much thinner than what the built pages actually carry —
it emits only `site.css` with no hash, no canonical, no OG, no crows.js — so running
`build.py` over hunt would *downgrade* the head. This is already true of every other
page in the repo; the built pages have clearly been hand-patched after the last
`build.py` run).

---

## 2. Sections on the page

| # | Section | Band | Product hook |
|---|---------|------|--------------|
| 1 | Hero | `.hero` | — |
| 2 | "A hunt wall. Not a gun counter." + stat row | `band--cream band--tight` | — |
| 3 | "Three things we are not the place for" (no FFL / ODFW / not legal advice) | `band--bark band--dark` | — |
| 4 | Section nav (4 `.good` cards) | `band--sand band--tight` | — |
| 5 | Behind the counter | `band--paper` | `data-aisle="Behind Counter"` (12) |
| 6 | The hunt wall — knives & sharpening / field dressing & meat care | `band--cream` | `data-ids` ×2 (6 + 5) |
| 7 | Blaze orange, ears, eyes, gun care | `band--sand` | `data-ids` ×2 (5 + 3) |
| 8 | Optics & calls / archery | `band--pine band--dark` | `data-ids` ×2 (7 + 3) |
| 9 | Survival & navigation | `band--paper` | `data-ids` (9) |
| 10 | "Getting one out, in order" — 8-step pack-out `table.tr-table` | `band--sand` | — |
| 11 | "Before opening day" checklist + the small-store paragraph | `band--cream` | — |
| 12 | Whole department, one list + footer CTA | `band--bark band--dark` | `data-dept="hunt"` (48) |

**98 product rows render** across 9 hooks, zero empty. That is 50 rows in the grouped
sections (48 unique items, with the rangefinder `h25` and trail camera `h30` appearing
twice — once under Behind the Counter because that is genuinely where they live, once
under Optics because that is what they are) plus the full 48-item list at the bottom.

Every one of `h01`–`h48` appears in a grouped section. Coverage:

- Behind Counter (aisle hook): h01–h10, h25, h30
- Knives & sharpening: h11, h12, h13, h14, h16, h17
- Field dressing & meat care: h15, h18, h19, h20, h23
- Blaze orange & safety: h21, h22, h31, h32, h35
- Cleaning & sighting in: h33, h34, h36
- Optics & calls: h24, h25, h26, h27, h28, h29, h30
- Archery: h37, h38, h39
- Survival & navigation: h40–h48

### `data-kits` deliberately not used

`TR_KITS` in `catalog.js` contains six kits, none of which reference a `h*` item, and
`paintKits()` only mounts to the **first** `[data-kits]` on the page and renders **all**
kits regardless of department. Dropping it on this page would have rendered the fence
post kit and the leaky toilet kit under a hunting heading. If a hunt kit is added to
`TR_KITS` later, a `<div class="cards" data-rv-stagger="110" data-kits></div>` block
inside a `band--paper` section will pick it up — but it will pick up the other six too.

---

## 3. Design system

No new CSS, no `<style>` block, no inline styles beyond the same
`margin-top` / `align-items` one-offs that `yard.html`, `storm.html` and `roots.html`
already use. Classes used are all pre-existing: `.hero` `.hero-img` `.hero-in`
`.hero-tag` `.h-mega` `.hero-motto` `.hero-btns` `.rainlayer` `.crows[data-crows]`
`.wavedivider--float` `.band--*` `.wrap` `.wrap--mid` `.eyebrow` `.h1` `.h2` `.h3`
`.lede` `.split` `.split--top` `.figframe` `.goods` `.good` `.stat-row` `.stat`
`.tablewrap` `table.tr-table` `.pillrow` `.pill` `.btnrow` `.btn--amber` `.btn--ghost`
`.btn--light` `.rule` `.small` `.muted` `.mb0` `[data-tellus]` `[data-rv-stagger]`.

`.meters` was not used — the storm and yard pages own that idiom and a hunt page with
its own meter wall would read as a duplicate of the storm wall.

### Images (all verified 200 over the dev server, all decode)

| Path | Where | Alt |
|---|---|---|
| `assets/img/forest-road.jpg` | hero | "Rain falling through dark coastal trees before daylight" |
| `assets/img/tr-interior-sm.jpg` | good card 1 | "The front counter and the shelves behind it" |
| `assets/img/hunt-field-sm.jpg` | good card 2 | "Blaze orange vest, knife, ammunition and binoculars on a shop counter" |
| `assets/img/tools-wall.jpg` | good card 3 | "Tools hanging on a wall rack" |
| `assets/img/camping.jpg` | good card 4 | "Night sky over a snowy ridge" |
| `assets/img/coastal-forest.jpg` | survival figframe | "Fog lying across a forested ridge above a wet highway" |

Alt text describes what is actually in each photograph rather than what the section is
about — `forest-road.jpg`, despite its filename, is rain in dark foliage, not a road,
and `shelves-goods.jpg` (an obvious first pick) is a stack of pink Japanese canned fish,
so it was rejected.

`hunt-field.jpg` / `hunt-field-sm.jpg` appeared in `assets/img/` partway through this
build — another process shot a proper department still life (blaze vest, ammunition
boxes, fixed blade, bone saw, whetstone, binoculars, rope, wool socks) and wired it into
`merc.html` and `index.html`. The small crop is now good card 2 here, with the same alt
text those pages use. The **hero was deliberately left as `forest-road.jpg`**: every
other department hero on this site is atmosphere, not merchandise, and the department
still life already appears twice elsewhere. Swapping the hero to `hunt-field.jpg` is a
one-line change in `_parts/hunt.html` if that call goes the other way.

---

## 4. Every legal claim on the page — CHECK THESE BEFORE LAUNCH

The page was written to *under-claim*. It states no legal conclusion anywhere. These are
the only statements with any legal content, quoted so counsel can go straight to them.

### 4a. Statements of fact about Twisted Roots itself — Carrie and Eric must confirm

1. **"We don't sell them. Selling firearms requires a Federal Firearms License and
   Twisted Roots does not hold one, so there is no gun counter here and there isn't
   going to be one."**
   The whole page rests on this. Confirm they hold no FFL and have no application
   pending. If that ever changes, this page must change with it.
2. **"Ammunition isn't on an open shelf here. It sits behind the register and you ask
   for it by name"** — confirm this is actually how the store is merchandised.
3. **"We check ID."** and the pill **"We check ID"** — stated as store policy, not as a
   statement of what the law requires. Confirm it is the policy. Note that federal law
   does set minimum ages for ammunition sales and those differ by ammunition type; the
   page deliberately says nothing about what those ages are.
4. **"Toledo and Newport both have shops that do this properly"** — confirm there are
   currently FFL dealers in both towns before publishing a referral. The page names no
   specific business, which is intentional; the referral is made verbally at the counter
   ("Ask at the counter and we'll tell you who we'd send our own family to").
5. **"Neither is a long drive"** — no minutes or miles are stated. An earlier draft said
   "fifteen to thirty minutes"; it was removed rather than verified.
6. **"We don't have a press and we don't tune bows."** — confirm.
7. **"Several of these are on the storm wall as well, and their reorder minimums jump
   when Carrie flips Storm Mode."** — true in `catalog.js` today (h40–h44 carry
   `stormMin`). If those fields are removed, remove the sentence.
8. **"There are four rifle calibers on that shelf, plus .22, plus 12 and 20 gauge"** and
   the stat **"7 · Calibers & gauges"** — both derived from `catalog.js` (.30-06, .308,
   .270, .243, .22 LR, 12ga, 20ga). Recount if the department changes.
9. **"48 · Things in the department"** — count of `h01`–`h48`. Recount if items are
   added.
10. **"0 · Firearms, on purpose"** — restatement of item 1.

### 4b. Statements about the law — all three are deliberate non-statements

11. **"Oregon's rules around ammunition, magazines and knives have changed more than
    once in recent years, and pieces of them have been in and out of court while people
    were still arguing about what they meant. Measure 114 is the obvious example.
    ORS 166 is the other one, and it has things to say about certain blades and about
    how you carry them."**
    This says the law *has moved and is contested*. It does **not** say what the law
    currently is, does not say whether Measure 114's permit or magazine provisions are
    in force, does not say which knives ORS 166 reaches, and does not say anything is
    or is not legal to buy, own or carry. That is the intended posture and it should not
    be "improved" into something more specific.
    - `catalog.js`'s own comment block flags both of these and says to confirm with
      counsel and Oregon State Police before ordering. Nothing stocked is a magazine,
      and everything cutting is a fixed blade or a plain folding work knife.
12. **"So we're not going to stand behind a counter in a small town and give you a legal
    conclusion. Not because we're being coy — because we would be guessing, and you'd be
    the one holding the consequences."** — an explicit refusal to give legal advice.
    Keep it.
13. **"Oregon State Police publishes the current firearms rules, and a real attorney is
    worth an hour of anybody's money if a lot is riding on the answer."**
    Referral only. Confirm OSP is still the right pointer and that
    `https://www.oregon.gov/osp` still resolves.

### 4c. Hunting regulation — pointed entirely at ODFW

14. **"Oregon Department of Fish and Wildlife handles all of it, and the seasons and the
    draw move every single year."** No season, no date, no bag limit, no draw deadline
    appears anywhere on the page, by design. Link is `https://myodfw.com` — confirm that
    is still ODFW's public-facing domain.
15. **"It is worth knowing that ODFW has rules about visible orange for some hunters and
    some seasons, and that those rules are theirs to state and not ours — check before
    opening morning."**
    Says only *that rules exist*. It does not say who must wear orange, how much, or
    when. Oregon's requirement is age-limited and does not apply to every hunter or
    every season, so any attempt to summarise it here would very likely be wrong.
    Leave it vague.
16. **"Deal with the tag first, exactly the way the tag itself tells you to."** (pack-out
    table, step 1) and checklist item 1, **"Check your tag and the current season and
    rules on ODFW's site."** Both defer to the tag and to ODFW rather than describing
    validation or notching procedure.
17. Pills: **"No FFL, no firearms" · "ODFW for tags" · "OSP for the rules" · "We check
    ID"** — summarise the above, add nothing new.

### 4d. Things the page never says — keep it that way

- Never says any firearm, ammunition type, magazine, knife or carry method is legal or
  illegal in Oregon.
- Never states a season, a date, a draw deadline, a bag limit or a legal caliber
  minimum.
- Never states an age threshold for an ammunition sale.
- Never claims Twisted Roots can transfer, order or hold a firearm.
- Never names a specific gun shop or bow shop.
- Never gives blaze orange square-inch requirements.
- Contains no exclamation points (verified: the only `!` characters in the built file
  are the doctype and HTML comments).

### 4e. Non-legal advice that is still advice

The pack-out table and the opening-day checklist are practical field advice
("free advice, worth what you paid" — the same framing `yard.html` uses for the fence
post table). Nothing in either is a legal instruction, but someone who actually hunts
should read both before launch, particularly:

- step 2, opening the hide so heat can leave
- step 4, "plastic does the opposite of that"
- step 5, "get it into a creek in a bag"
- step 8, "properly cold within hours, not overnight"

These are conventional meat-care practice, not regulation, and are stated as the
store's opinion.

---

## 5. Known gaps / placeholder

1. **Hunt & Field is only half-wired into the site.** While this page was being built
   another process added inbound links, so it is no longer orphaned:
   - `index.html` has a `.good` card (No. 07) pointing at `hunt.html`
   - `merc.html` has an in-body section with an "All of Hunt & Field" button
   Still missing, and all of it lives in files this task does not own:
   - a nav link in `merc.html`'s `<nav class="nav">`, which propagates to every page
   - a footer link under "The Store" in `merc.html`
   - an entry in `_parts/pages.json` (with the caveat in §1 about `build.py`'s thin head)
   - a `<url>` entry in `sitemap.xml` — currently no `hunt` entry at all
   Because `hunt.html` is not in the nav it carries no `aria-current="page"`, which after
   normalising for that attribute makes its header and footer chrome **byte-identical to
   `yard.html`, `storm.html`, `local.html`, `roots.html` and `bakery.html`**.
2. **`?v=` hashes and the whole chrome drift, fast.** During this build `merc.html` moved
   `site.css` from `?v=794fc26b` to `?v=06a2175b`, gained `cart.js`, re-versioned
   `site.js`, and changed its nav CTA from "Check Stock" to "Shop Now"/`shop.html`. The
   build script therefore derives the stylesheet block, the script block and the entire
   header/footer from whatever `merc.html` says at build time rather than hardcoding any
   of it. **Re-run it after any shared-chrome change**, then re-diff against `yard.html`.
3. **`merc.html` has no `crows.js` tag**; every other built page does. The tag is copied
   verbatim from `yard.html` (it re-versioned to `?v=a06dbbea` mid-build). The build
   script skips the copy if merc ever grows its own.
4. **Prices and quantities are whatever is in `catalog.js`.** All 48 hunt items are
   currently in stock, so the page has never been seen with a "low" or "out" badge on it.
5. **`data-tellus` button** ("Ask us to stock a caliber") uses the existing site-wide
   request modal. Requests land wherever the other pages' requests land; nothing
   hunt-specific was added.

---

## 6. Verification performed

Dev server at `http://localhost:8899/`, Playwright Chromium, real viewports.

| Check | 1280×900 | 390×844 |
|---|---|---|
| Console errors / warnings / page errors | none | none |
| HTTP responses ≥400 | none | none |
| Horizontal overflow (`scrollWidth` vs `clientWidth`) | 1280 = 1280 | 390 = 390 |
| Product rows rendered | 98 | 98 |
| Empty `data-*` hooks | 0 | 0 |
| Broken images | 0 of 8 | 0 of 8 |
| Crow sprites mounted | 8 nodes | 8 nodes |
| Wave divider layers built | 3 | 3 |
| Hanging sign | renders | renders |

The pack-out `tr-table` is wider than a 390px viewport and scrolls inside its
`.tablewrap` (`overflow-x:auto`) without the document scrolling — the same behaviour as
the fence-post table on `yard.html`.

Full-page screenshots: `full-desk.png`, `full-m390.png` and `full-yard.png` in the
scratchpad directory named at the top of §1.
