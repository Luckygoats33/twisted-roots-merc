# Internal Linking — patches for the pages I do not own

Companion to `seo/INTERNAL-LINKING.md`. The two builders are done: all
208 blog posts and all 161 recipes now carry a **From the shelf** module
with 2 contextual links each, and `blog/data/_links.json` holds the map.
This file is the other half — **Module C, the hubs linking down** — which
lives in eight hand-written pages that neither builder generates.

I have not edited any of these eight files. Each patch below is exact:
the file, the insertion point, and the markup.

---

## Before you start

**These eight pages are not generated, so nothing here needs a rebuild.**
Every block goes **inside `<main>`, immediately before the closing
`</main>`** — above the footer, which is where the plan puts them.

That placement also matters for one specific reason on `merc.html`:
`build_blog.py` and `build_recipes.py` lift that file's chrome with
`<body>…<main>` and `</main>…</body>`, so anything **inside** `<main>` is
*not* copied to the 369 generated pages. Adding this block there is safe
and will not propagate.

The inverse is the trap: **if you change `merc.html`'s header or footer —
anything outside `<main>` — you must re-run both builders**, or the change
is invisible on 369 pages.

**Markup:** every block reuses `.band--sand .band--tight`, `.split`,
`.eyebrow`, `.lede`, `.cards`, `.card` and `.card-in`. All of these are
already defined in `assets/css/site.css` and already used in this exact
combination by the "Keep reading" band on every blog post. **No new CSS
is required, and none should be added.**

**Verified before this file was written:** every `href` below resolves to
a file that exists on disk, every `#fragment` exists on its target page,
no page links to itself, and no link is repeated inside a block. If you
edit any of these links, re-check them the same way — a link into a
cluster is only worth having if it lands.

---

## P1 — `merc.html`

**File:** `merc.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 497 in the copy I measured).  
**Links:** 7

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Before you drive over</p>
        <h2 class="h2 mb0">Read it first, then come get the part</h2>
      </div>
      <p class="lede mb0">Every one of these ends with the thing you need and where it is on the wall.</p>
    </div>
    <div class="cards">
      <a class="card" href="blog/fix-running-toilet-diagnose.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Why your toilet runs, and which part is bad</h3>
          <p class="small muted mb0">Twenty minutes and some food colouring tells you which two-dollar part to buy.</p>
        </div></a>
      <a class="card" href="blog/fix-dripping-faucet.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">A dripping faucet, and whether to repair it</h3>
          <p class="small muted mb0">When a washer fixes it and when you are better off replacing the whole thing.</p>
        </div></a>
      <a class="card" href="blog/fix-gfci-tripping.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">GFCI outlets that keep tripping</h3>
          <p class="small muted mb0">What the test button actually proves, and the three usual causes.</p>
        </div></a>
      <a class="card" href="blog/fix-extension-cord-gauge.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Extension cords: gauge, length and heat</h3>
          <p class="small muted mb0">Why the cheap one gets warm, and what gauge you need for the run.</p>
        </div></a>
      <a class="card" href="blog/fix-drywall-anchors.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Drywall anchors that actually hold</h3>
          <p class="small muted mb0">Four kinds on the wall, and which weight each one really takes.</p>
        </div></a>
      <a class="card" href="blog/fix-twenty-things-worth-owning.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Twenty things worth owning first</h3>
          <p class="small muted mb0">The short list, before you need any of it at nine at night.</p>
        </div></a>
      <a class="card" href="journal.html#fix-it" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 52 Fix It guides</h3>
          <p class="small muted mb0">Plumbing, electrical, drywall, doors, sealants and the tool wall.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P2 — `storm.html`

**File:** `storm.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 404 in the copy I measured).  
**Links:** 7

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Before the power goes out</p>
        <h2 class="h2 mb0">The reading that makes the shelf make sense</h2>
      </div>
      <p class="lede mb0">Written for a four-day outage on a well, which is what actually happens out here.</p>
    </div>
    <div class="cards">
      <a class="card" href="blog/storm-two-week-kit.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Two weeks ready, minus what does not apply</h3>
          <p class="small muted mb0">The kit Oregon recommends, cut down to what matters on this coast.</p>
        </div></a>
      <a class="card" href="blog/storm-batteries.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Battery types, shelf life and the dead drawer</h3>
          <p class="small muted mb0">Why the ones in the kitchen drawer are already flat when you need them.</p>
        </div></a>
      <a class="card" href="blog/storm-generator-fuel.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Generator fuel: storing it, stabilizing it</h3>
          <p class="small muted mb0">How long gas actually keeps, and how much you need for four days.</p>
        </div></a>
      <a class="card" href="blog/storm-camp-stove-indoors.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">When a camp stove can come inside</h3>
          <p class="small muted mb0">And when it absolutely cannot. This one is worth reading before the wind.</p>
        </div></a>
      <a class="card" href="blog/storm-carbon-monoxide.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Carbon monoxide, and what actually kills people</h3>
          <p class="small muted mb0">The one that does not announce itself, and the alarm that does.</p>
        </div></a>
      <a class="card" href="blog/storm-king-tides.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">King tides and coastal flooding</h3>
          <p class="small muted mb0">Why the combination of tide, surge and river matters more than any one.</p>
        </div></a>
      <a class="card" href="journal.html#storm-ready" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 52 storm guides</h3>
          <p class="small muted mb0">Power, water, heat, roads, tarps and the walk-around afterwards.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P3 — `yard.html`

**File:** `yard.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 399 in the copy I measured).  
**Links:** 7

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Before you buy the lumber</p>
        <h2 class="h2 mb0">Work out what you need before you load it</h2>
      </div>
      <p class="lede mb0">Cheaper to read this than to make two trips, which is the whole point of the yard.</p>
    </div>
    <div class="cards">
      <a class="card" href="blog/yard-how-many-bags-a-post-hole-takes.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">How many bags a post hole takes</h3>
          <p class="small muted mb0">Actual numbers by hole size, so you buy the right count the first time.</p>
        </div></a>
      <a class="card" href="blog/yard-setting-a-post-in-coastal-clay.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Setting a post in wet coastal clay</h3>
          <p class="small muted mb0">Gravel first, fast-set dry, and why the hole drains or the post rots.</p>
        </div></a>
      <a class="card" href="blog/yard-cedar-vs-pressure-treated-on-the-coast.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Cedar or pressure treated: what goes where</h3>
          <p class="small muted mb0">Which one belongs in the ground here, and which one is worth the money.</p>
        </div></a>
      <a class="card" href="blog/yard-ground-contact-rating-explained.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Ground contact rating, and why the tag matters</h3>
          <p class="small muted mb0">The stamp on the end of the board, and what it is promising you.</p>
        </div></a>
      <a class="card" href="blog/yard-fasteners-that-survive-salt-air.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Fasteners that survive salt air</h3>
          <p class="small muted mb0">Coated, galvanized and what happens to the wrong screw in two winters.</p>
        </div></a>
      <a class="card" href="blog/yard-why-a-2x4-is-not-2-by-4.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Why a 2x4 is not two inches by four</h3>
          <p class="small muted mb0">Nominal against actual, and how to plan a cut list around it.</p>
        </div></a>
      <a class="card" href="journal.html#the-yard" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 52 yard and project guides</h3>
          <p class="small muted mb0">Concrete, fences, decks, sheds, drainage and tying down a load.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P4 — `hunt.html`

**File:** `hunt.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 492 in the copy I measured).  
**Links:** 6

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Once it is down</p>
        <h2 class="h2 mb0">What to do with it when you get it home</h2>
      </div>
      <p class="lede mb0">The hunt wall covers the field. The kitchen covers the other three days.</p>
    </div>
    <div class="cards">
      <a class="card" href="recipes/game-aging-and-trimming.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Aging and trimming an animal</h3>
          <p class="small muted mb0">How long, at what temperature, and what to cut away before you freeze it.</p>
        </div></a>
      <a class="card" href="recipes/game-unfamiliar-cut.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Cooking a cut you have never seen</h3>
          <p class="small muted mb0">How to work out whether it wants fast heat or five hours.</p>
        </div></a>
      <a class="card" href="recipes/game-venison-burgers.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Venison burgers, with the fat put back</h3>
          <p class="small muted mb0">What ratio, what fat, and the internal temperature that keeps it safe.</p>
        </div></a>
      <a class="card" href="recipes/game-summer-sausage.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Summer sausage, and a word about nitrite</h3>
          <p class="small muted mb0">Cure, casings and the part people get wrong and should not.</p>
        </div></a>
      <a class="card" href="recipes/game-grinding-and-packaging.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Grinding and packing the freezer</h3>
          <p class="small muted mb0">Getting it wrapped so it is still worth eating in March.</p>
        </div></a>
      <a class="card" href="kitchen.html#game-the-freezer" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 23 game recipes</h3>
          <p class="small muted mb0">Elk and venison, from the hanging pole to the last of the trim.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P5 — `bakery.html`

**File:** `bakery.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 426 in the copy I measured).  
**Links:** 7

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">If you would rather make it</p>
        <h2 class="h2 mb0">The same bread, written down</h2>
      </div>
      <p class="lede mb0">We will happily sell you a loaf. If you want to bake it instead, here is how we do it.</p>
    </div>
    <div class="cards">
      <a class="card" href="recipes/bread-keeping-a-starter-alive.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Keeping a starter, and bringing one back</h3>
          <p class="small muted mb0">Feeding schedules that fit a job, and reviving one you neglected.</p>
        </div></a>
      <a class="card" href="recipes/bread-siletz-river-sourdough.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Siletz River sourdough</h3>
          <p class="small muted mb0">The loaf on the rack, with the timings for a damp coastal kitchen.</p>
        </div></a>
      <a class="card" href="recipes/roll-buttermilk-biscuits.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">House buttermilk biscuits</h3>
          <p class="small muted mb0">The ones under the gravy, with the lamination step that makes them.</p>
        </div></a>
      <a class="card" href="recipes/brk-truck-sandwich.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">A breakfast sandwich that survives a truck</h3>
          <p class="small muted mb0">Built so it is still worth eating forty minutes up the road.</p>
        </div></a>
      <a class="card" href="recipes/brk-skillet-potatoes.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Skillet potatoes with a roughed-up crust</h3>
          <p class="small muted mb0">Par-boil, rough them up, then leave them alone in the pan.</p>
        </div></a>
      <a class="card" href="recipes/soup-chowder-base-that-holds.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">A chowder base that does not break</h3>
          <p class="small muted mb0">Thickened properly, so it reheats on day two without splitting.</p>
        </div></a>
      <a class="card" href="kitchen.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 161 recipes</h3>
          <p class="small muted mb0">Bread, biscuits, breakfast, chowder, salmon, game and berry pie.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P6 — `local.html`

**File:** `local.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 362 in the copy I measured).  
**Links:** 5

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">What to do with it</p>
        <h2 class="h2 mb0">Once you have got the jar home</h2>
      </div>
      <p class="lede mb0">Most of what our makers put up has a recipe on the other side of it.</p>
    </div>
    <div class="cards">
      <a class="card" href="recipes/pie-marionberry.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Marionberry pie</h3>
          <p class="small muted mb0">The berry this coast is actually known for, and the thickener that suits it.</p>
        </div></a>
      <a class="card" href="recipes/pie-marionberry-jam.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Marionberry jam</h3>
          <p class="small muted mb0">If you would rather put it up yourself than buy ours.</p>
        </div></a>
      <a class="card" href="blog/sil-blackberries.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Blackberries around Siletz</h3>
          <p class="small muted mb0">Free food and a full-time enemy, and where the good canes are.</p>
        </div></a>
      <a class="card" href="blog/sil-huckleberries.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Huckleberries, and why nobody tells you where</h3>
          <p class="small muted mb0">What to look for, when they ripen, and the etiquette about patches.</p>
        </div></a>
      <a class="card" href="kitchen.html#pie-cobbler-preserves" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">All 23 pie, cobbler and preserve recipes</h3>
          <p class="small muted mb0">Crust, lattice, jam, the gel stage and putting summer in a jar.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P7 — `shop.html`

**File:** `shop.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 294 in the copy I measured).  
**Links:** 5

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Not sure what you need?</p>
        <h2 class="h2 mb0">Work out the part before you search for it</h2>
      </div>
      <p class="lede mb0">The shelf search is quicker when you already know what you are looking for.</p>
    </div>
    <div class="cards">
      <a class="card" href="journal.html#fix-it" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Fix It guides</h3>
          <p class="small muted mb0">52 repairs, each one ending in a part off our wall.</p>
        </div></a>
      <a class="card" href="journal.html#storm-ready" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Storm guides</h3>
          <p class="small muted mb0">52 on power, water, heat, roads and the clean-up.</p>
        </div></a>
      <a class="card" href="journal.html#the-yard" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Yard and project guides</h3>
          <p class="small muted mb0">52 on concrete, lumber, fences, decks and drainage.</p>
        </div></a>
      <a class="card" href="journal.html#around-siletz" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Around Siletz</h3>
          <p class="small muted mb0">52 on the river, the woods, the weather and living out here.</p>
        </div></a>
      <a class="card" href="kitchen.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">The Kitchen</h3>
          <p class="small muted mb0">161 recipes written with real weights and a cue for when it is done.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## P8 — `index.html`

**File:** `index.html`  
**Where:** inside `<main>`, immediately before the closing `</main>` (line 540 in the copy I measured).  
**Links:** 3

**Insert:**

```html
<section class="band band--sand band--tight">
  <div class="wrap--mid">
    <div class="split split--top" style="align-items:end; margin-bottom:26px">
      <div>
        <p class="eyebrow">Written down properly</p>
        <h2 class="h2 mb0">Three hundred and sixty nine things worth knowing</h2>
      </div>
      <p class="lede mb0">None of it dated, because none of it goes stale.</p>
    </div>
    <div class="cards">
      <a class="card" href="journal.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">208 guides on fixing, storms and the yard</h3>
          <p class="small muted mb0">Everything Carrie and Eric get asked at the counter, written down.</p>
        </div></a>
      <a class="card" href="kitchen.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">161 recipes, written so they work</h3>
          <p class="small muted mb0">Real weights, real temperatures, and a cue for when a thing is done.</p>
        </div></a>
      <a class="card" href="board.html" style="text-decoration:none">
        <div class="card-in">
          <h3 class="h3">Storms, roads and the river</h3>
          <p class="small muted mb0">The live notice board: what is running, what is closed, what is out.</p>
        </div></a>
    </div>
  </div>
</section>
```

---

## Why these counts

Five to seven links per hub block, three on `index.html`, and two per
generated page. Those are different numbers on purpose.

A hub block is a *directory* — the reader arrived at `storm.html` wanting
an overview, and seven guides is a table of contents. A block on a single
blog post is a *recommendation*, and the value of a recommendation falls
off fast with volume: two links that are obviously the right two carry
more weight, and get clicked more, than eight that are merely related.
Eight links on 369 pages would also be roughly 3,000 new internal links,
which is the volume at which a link graph starts to look generated rather
than written.

## What is deliberately not here

- **No footer changes.** The footer already links every commercial page.
  Adding more dilutes the ones there. `seo/INTERNAL-LINKING.md` §6
  proposes adding cluster anchors to it; I would do that separately and
  carefully, because it touches `merc.html` chrome and therefore forces a
  rebuild of all 369 pages.
- **No `rel="nofollow"`.** These are internal links. There is no reason
  for it and it wastes the link.
- **No links to `hq.html`.** It is `noindex,nofollow` and disallowed.
- **`robots.txt` needs no change.** It already allows `?q=` — the block
  the audit flagged as P7 has been removed and the file now carries a
  comment explaining why the parameter must stay crawlable.
