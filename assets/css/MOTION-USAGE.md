# Twisted Roots Merc — Motion Layer

Two files, both purely additive. They do not touch a single class that `site.css`
or `site.js` already owns.

```
assets/css/motion.css
assets/js/motion.js
```

## Wiring it up (once, per page)

`motion.css` goes **after** `site.css`. `motion.js` goes **after** `site.js`.

```html
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/motion.css">
...
<script src="assets/js/catalog.js"></script>
<script src="assets/js/site.js"></script>
<script src="assets/js/motion.js"></script>
```

That is the whole install. Everything below is opt-in markup.

**No JS?** The sign still hangs and still swings on load and on hover (pure CSS),
and every wood/carved/burned class works. The generated SVG pieces
(`.wavedivider`, `.treeline`, `.birds`) need `motion.js` to draw their paths —
without it they render as empty transparent space, never as broken layout.

**Reduced motion.** Everything in here is disabled or reduced to a static pose
under `@media (prefers-reduced-motion: reduce)`. Nothing needs to be done per page.

---

# 1. The hanging sign — `.hangsign`

A logo plate hung off a wooden beam by two chains with forged eye-bolts. It swings
like a real heavy sign: a damped pendulum (4° → −3° → 2.2° → −1.5° → 1° → −0.6° → 0)
layered on top of a slow continuous 0.8° idle sway. It swings hard on load,
again on hover/focus/tap, and it never settles while storm mode is on.

The swing arc is reserved as inline padding on the container, so the sign can never
push layout or create a horizontal scrollbar — no wrapper needed.

### Easiest: let JS build it

```html
<span class="hangsign hangsign--md"
      data-hangsign="assets/img/logo-trans-sm.png"
      data-hangsign-alt="Twisted Roots Merc"></span>
```

Add `data-hangsign-board` to hang the logo on a wooden plaque:

```html
<span class="hangsign hangsign--xl hangsign--block"
      data-hangsign="assets/img/logo-trans-sm.png"
      data-hangsign-alt="Twisted Roots Merc"
      data-hangsign-board></span>
```

### Full markup (works with JS off)

```html
<span class="hangsign hangsign--md">
  <span class="hangsign__beam" aria-hidden="true"></span>
  <span class="hangsign__pivot">
    <span class="hangsign__rig">
      <i class="hangsign__chain hangsign__chain--l" aria-hidden="true"></i>
      <i class="hangsign__chain hangsign__chain--r" aria-hidden="true"></i>
      <img class="hangsign__plate" src="assets/img/logo-trans-sm.png"
           alt="Twisted Roots Merc" draggable="false">
    </span>
  </span>
</span>
```

Wrap the `<img>` in `<span class="hangsign__board"> … </span>` for the wooden plaque.

### In the sticky header (drop-in replacement for `.brand img`)

```html
<a class="brand" href="index.html">
  <span class="hangsign hangsign--sm"
        data-hangsign="assets/img/logo-trans-sm.png"
        data-hangsign-alt="Twisted Roots Merc"></span>
  <span class="brand-txt"><b>Twisted Roots</b><span>Siletz, Oregon</span></span>
</a>
```

`--sm` is 56px of plate (78px total) — it clears the 86px header, and shrinks
itself to 42px under 900px where `--head-h` drops to 70px.

### In a hero

```html
<div class="hero-in">
  <div class="wrap center">
    <span class="hangsign hangsign--xl hangsign--block"
          data-hangsign="assets/img/logo-trans-sm.png"
          data-hangsign-alt="Twisted Roots Merc" data-hangsign-board></span>
    <h1 class="h-mega">The stuff Siletz actually needs.</h1>
  </div>
</div>
```

### Classes

| Class | What it does |
|---|---|
| `.hangsign` | The component. Default plate height 120px. |
| `.hangsign--sm` | 56px plate — sized for the sticky header. |
| `.hangsign--md` | 120px plate (same as default). |
| `.hangsign--lg` | 170px plate. |
| `.hangsign--xl` | 240px plate — sized for a hero. |
| `.hangsign--block` | `display:block` + auto margins, for centring in a hero. |
| `.hangsign--hooks` | Two forged iron rods instead of chain links. |
| `.hangsign--beamwide` | Beam overhangs the sign on both sides. |
| `.hangsign--nobeam` | Hide the beam (hang it off an existing header rule). |
| `.hangsign__board` | Optional wooden plaque behind the transparent logo. |
| `.hangsign.storm-on` | Force storm behaviour on one sign regardless of site state. |

### Tuning (CSS custom properties, set inline or in a rule)

```html
<span class="hangsign" style="--hs-h:96px; --hs-drop:34px; --hs-swing:6deg; --hs-sway:1.4deg"
      data-hangsign></span>
```

`--hs-h` plate height · `--hs-drop` chain length · `--hs-beam-h` beam thickness ·
`--hs-chain-x` chain inset · `--hs-swing` first throw · `--hs-sway` idle sway ·
`--hs-dur` swing length · `--hs-idle-dur` sway period.

### Triggering it from code

```js
TRMotion.swing(document.querySelector('.hangsign'));   // normal shove
TRMotion.swingAll(true);                                // storm-strength, every sign
```

Storm mode is automatic: motion.js watches `<html data-storm>` and `.storm-on`
(on `<html>` or `<body>`) and throws every sign hard the moment it flips on.

---

# 2. Wood surfaces

### `.wood` — light board

```html
<div class="wood" style="padding:clamp(28px,4vw,56px)">
  <h2 class="h2 carved">Today at the Merc</h2>
</div>
```

### `.wood--dark` — bark-dark board

```html
<section class="band wood wood--dark">
  <div class="wrap"><h2 class="h1 carved--light">Out in the Yard</h2></div>
</section>
```

### `.wood--plank` — real plank seams

Board pitch is `--mo-plank` (default 58px).

```html
<div class="wood wood--plank" style="--mo-plank:72px; padding:56px 40px">
  <p class="serif-caps burned">Est. Siletz, Oregon</p>
</div>
```

### `.wood--tex` — blended with `assets/img/wood-texture.jpg`

Stackable with `--dark` and `--plank`.

```html
<div class="wood wood--tex wood--dark wood--plank" style="padding:60px 40px">
  <h2 class="h1 carved--light">The Board</h2>
</div>
```

### `.wood--breathe`

Optional 22s brightness drift, like light crossing the boards. Add to any of the above.

```html
<div class="wood wood--plank wood--breathe" style="padding:48px"> … </div>
```

### `.carved` — chiselled into the wood

```html
<h2 class="h1 carved">Good Food. Good Goods.</h2>
<h2 class="h1 carved--deep">Deep Roots.</h2>        <!-- heavier chisel -->
<h2 class="h1 carved--light">On dark wood</h2>       <!-- for .wood--dark -->
```

### `.burned` — branded in with a hot iron

```html
<p class="serif-caps burned">Twisted Roots Merc · Siletz, Oregon</p>
<p class="serif-caps burned--hot">Storm Mode</p>     <!-- + slow ember glow -->
```

---

# 3. Coast motion dividers

All five are drop-in bands. `.wavedivider`, `.treeline` and `.birds` have their SVG
built by `motion.js` — you only ever write the empty element.

## `.wavedivider` — the carved wave, in parallax

Three teal wave layers scrolling at 34s / 23s / 15s in opposing directions.
Background is transparent, so it takes the colour of whatever sits behind it.

```html
<div class="wavedivider" aria-hidden="true"></div>
```

Sitting on the bottom edge of a hero or photo:

```html
<section class="hero">
  <img class="hero-img" src="assets/img/storm-coast.jpg" alt="">
  <div class="hero-in"> … </div>
  <div class="wavedivider wavedivider--float" aria-hidden="true"></div>
</section>
```

| Option | Effect |
|---|---|
| `.wavedivider--flip` | Crests point up (use above a section). |
| `.wavedivider--float` | Absolutely pinned to the bottom of a `position:relative` parent. |
| `style="--mo-wave-h:150px"` | Band height (default `clamp(64px, 8.5vw, 128px)`). |
| `data-wave-front` / `data-wave-mid` / `data-wave-back` | Override the three fills. Defaults `#3D95A8` / `#215C6B` / `#14424E`. |

Speeds up automatically in storm mode.

## `.treeline` — Douglas fir silhouette

Two seeded, seamless fir ridges in `--pine`, drifting at 240s and 150s. Deterministic —
identical on every page and every reload.

```html
<div class="treeline" aria-hidden="true"></div>
```

Hanging off the top edge of the section below it:

```html
<section class="band band--cream mo-relative">
  <div class="treeline treeline--top treeline--float" aria-hidden="true"
       style="top:0; bottom:auto"></div>
  <div class="wrap"> … </div>
</section>
```

| Option | Effect |
|---|---|
| `.treeline--top` | Flipped — trees hang down from a top edge. |
| `.treeline--float` | Absolutely pinned to the bottom of a `position:relative` parent. |
| `style="--mo-tree-h:190px"` | Band height (default `clamp(84px, 10.5vw, 168px)`). |
| `data-tree-near` / `data-tree-far` | Override the fills. Defaults `#254E3D` / `#2E5B47`. |

## `.fogdrift` — fog banks over a forest photo

Absolutely positioned, so the parent needs `position:relative` (`.hero`, `.figframe`
and `.mo-relative` all qualify). The `<i>` is the optional third bank.

```html
<figure class="figframe mo-relative" style="margin:0">
  <img src="assets/img/coastal-forest.jpg" alt="Fog in the firs">
  <div class="fogdrift" aria-hidden="true"><i></i></div>
</figure>
```

| Option | Effect |
|---|---|
| `.fogdrift--light` | 30% opacity. |
| `.fogdrift--heavy` | 78% opacity. |
| `.fogdrift--low` | Hugs the bottom 65% of the image. |

Thickens automatically in storm mode.

## `.rainlayer` — the storm sheet

Three sheets at different angles, densities and speeds. An improved stand-in for the
`.rain` already in `site.css` — use it instead, not alongside. It is invisible until
storm mode turns on, and cross-fades in over 0.9s.

```html
<section class="hero">
  <img class="hero-img" src="assets/img/storefront.jpg" alt="">
  <div class="rainlayer" aria-hidden="true"></div>
  <div class="hero-in"> … </div>
</section>
```

| Option | Effect |
|---|---|
| `.rainlayer--heavy` | Denser downpour when storm mode is on. |
| `.rainlayer--on` / `.is-on` | Force it on regardless of storm mode. |
| `.rainlayer--always` | Permanent light drizzle (it *is* the Oregon coast). |

## `.birds` — the pair over the firs in the logo

Two or three gulls cross the hero, wings flapping, roughly once every 40–60 seconds,
each with its own size, altitude, speed and delay.

```html
<section class="hero">
  <img class="hero-img" src="assets/img/beach.jpg" alt="">
  <div class="birds" data-birds="3" aria-hidden="true"></div>
  <div class="hero-in"> … </div>
</section>
```

| Option | Effect |
|---|---|
| `data-birds="2"` | How many (1–5, default 3). |
| `.birds--light` | Cream birds, for dark photos. |
| `.birds--pine` | Pine-green birds, for pale skies. |

---

# 4. Scroll motion

## Parallax — `[data-parallax]`

Transform only, one shared `requestAnimationFrame`, passive listeners, reads batched
before writes, and each element gated by an `IntersectionObserver` so off-screen
elements cost nothing. The value is the strength; `0.18` if you omit it.

```html
<img class="hero-img" src="assets/img/storefront.jpg" alt="" data-parallax="0.3">
```

```html
<figure class="figframe mo-clip" style="margin:0">
  <img src="assets/img/cinnamon-roll.jpg" alt="" loading="lazy" data-parallax="0.12">
</figure>
```

`<img>` elements are given `scale(1.16)` automatically so the travel never reveals an
edge. Add `data-parallax-cover` to get the same on a non-image, or override with
`style="--mo-pscale:1.25"`. Travel is capped at 22% of viewport height.

Good values: `0.08`–`0.15` for figure images, `0.25`–`0.4` for hero backgrounds.

## Staggered reveals — `[data-rv-stagger]`

`site.js` already adds `.in` to `.rv` elements. Put `data-rv-stagger` on their
container and its `.rv` children reveal in sequence instead of together.

```html
<div class="goods" data-rv-stagger="110">
  <a class="good rv" href="merc.html#everyday"> … </a>
  <a class="good rv" href="merc.html#fixit"> … </a>
  <a class="good rv" href="yard.html"> … </a>
</div>
```

The number is the per-child delay in milliseconds (default 90ms, capped after 12
children). If the container has no `.rv` children, `.mo-rise` is added to its direct
children so they fade-and-rise instead.

`.mo-rise` also works standalone anywhere you want the effect without `.rv`:

```html
<div class="mo-rise">Rises into view on scroll.</div>
```

motion.js runs its own reveal observer as a safety net, so `.rv` elements added to
the DOM after `site.js` finished still reveal correctly.

## Count-ups

Automatic — no attribute needed — on `.stat .v` and `.drive-cell .t` when they scroll
into view. The leading number animates up; any prefix (`$`) and suffix (`min`, `%`)
is preserved, thousands separators and decimal places are kept, and the element lands
on the exact string you authored.

```html
<div class="stat"><div class="v">4 min</div><div class="k">From town center</div></div>
<div class="stat"><div class="v">$1,240</div><div class="k">Saved on gas</div></div>
<div class="drive-cell"><b>Newport</b><div class="t">27 min</div></div>
```

Opt anything else in with `data-count`:

```html
<span class="h2" data-count>1,918 neighbors</span>
```

Automatically skipped: ranges (`6am – 7pm`), elements with child markup, and anything
`site.js` repaints (`data-todayhours`, `data-todayname`, `data-boardwhen`).
Opt out by hand with `data-no-count`.

---

# 5. Utilities

| Class | What it does |
|---|---|
| `.mo-relative` | `position:relative` — the anchor for `.fogdrift`, `.rainlayer`, `.birds`, `--float` dividers. |
| `.mo-clip` | `position:relative; overflow:hidden` — for parallax inside a figure. |
| `.mo-x-safe` | `overflow-x:clip; max-width:100%` — belt-and-braces on any wrapper holding motion. |
| `.mo-counting` | Tabular numerals; applied automatically while a count-up runs. |

---

# 6. JavaScript API — `window.TRMotion`

| Call | What it does |
|---|---|
| `TRMotion.swing(el, hard)` | Kick one `.hangsign` into a fresh damped swing. |
| `TRMotion.swingAll(hard)` | Kick every sign on the page. |
| `TRMotion.refresh()` | Re-scan the DOM after injecting markup — rebuilds SVGs, re-arms reveals, count-ups and parallax. Safe to call repeatedly. |
| `TRMotion.buildHangsign(el)` | Build the rig inside one empty `.hangsign`. |
| `TRMotion.buildWaves(el)` / `buildTreeline(el)` / `buildBirds(el)` | Build one divider by hand. |
| `TRMotion.reduced()` | `true` if the visitor asked for reduced motion. |

Call `TRMotion.refresh()` after any `site.js` paint that injects new markup
(`paintLists`, `paintKits`, `renderSearch`, …) if that markup contains motion classes.

---

# 7. Performance notes

- Every animation is `transform` or `opacity` only, except `.rainlayer`, which
  animates `background-position` (matching the existing `.rain` technique) and is
  only visible in storm mode.
- One `requestAnimationFrame` loop drives all parallax; scroll, resize and
  orientationchange listeners are all `{ passive: true }`.
- Parallax does one read pass then one write pass — no interleaved layout thrash —
  and skips any element whose offset moved less than 0.25px.
- `IntersectionObserver` gates parallax, reveals and count-ups. Observers unobserve
  once fired.
- Dividers carry `contain: paint`; moving layers carry `will-change: transform` and
  `backface-visibility: hidden`.
- The treeline path is generated once from a seeded PRNG, so it costs nothing to ship
  and is byte-identical across pages and reloads.
