# Twisted Roots Merc — Background Video Library

Eight short, silent, looping background clips sourced from **Pexels**.
All are free for commercial use, no attribution required
([Pexels License](https://www.pexels.com/license/)). Attribution is still nice —
credits are listed below if you want to put a line in the site footer.

Every clip has been re-encoded to a common house spec so they drop into any
section without surprises:

| Setting | Value |
| --- | --- |
| Container / codec | MP4 / H.264 (`yuv420p`, Main profile, level 4.0) |
| Resolution | 1280 x 720 (16:9) |
| Duration | ~10 s, trimmed to a loopable section |
| Audio | **stripped** (`-an`) — required for reliable mobile autoplay |
| Quality | CRF 27, `preset slow` |
| Streaming | `-movflags +faststart` (moov atom up front, starts on first bytes) |

---

## The clips

| File | Subject | Resolution | Duration | Size | Poster | Poster size | Pexels source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hero-coast.mp4` | Forested headland, heavy surf, overcast Pacific coast | 1280x720 | 10.00 s | 0.62 MB | `hero-coast.jpg` | 34 KB | https://www.pexels.com/video/16608721/ |
| `hero-forest.mp4` | Fog hanging in a dense stand of evergreens, slow drift | 1280x720 | 10.01 s | 3.72 MB | `hero-forest.jpg` | 105 KB | https://www.pexels.com/video/10292320/ |
| `rain-window.mp4` | Rain running off a timber porch roof over a misty green valley | 1280x720 | 10.00 s | 3.57 MB | `rain-window.jpg` | 107 KB | https://www.pexels.com/video/34511532/ |
| `bakery.mp4` | Hands shaping bread dough on a warm wooden bench, bannetons | 1280x720 | 10.00 s | 0.81 MB | `bakery.jpg` | 29 KB | https://www.pexels.com/video/7405930/ |
| `coffee.mp4` | Coffee poured into a cup, close up, amber pour on dark wood | 1280x720 | 10.00 s | 0.63 MB | `coffee.jpg` | 26 KB | https://www.pexels.com/video/6950167/ |
| `woodgrain.mp4` | Slow pan across warm timber planks, knots and grain | 1280x720 | 10.00 s | 1.53 MB | `woodgrain.jpg` | 93 KB | https://www.pexels.com/video/7830311/ |
| `river.mp4` | River running through mossy evergreen forest | 1280x720 | 10.01 s | 4.67 MB | `river.jpg` | 239 KB | https://www.pexels.com/video/7430750/ |
| `storm.mp4` | Storm clouds stacked over heavy grey-teal surf | 1280x720 | 10.00 s | 4.44 MB | `storm.jpg` | 106 KB | https://www.pexels.com/video/11009608/ |

**Library total: 19.99 MB of video + 0.72 MB of posters = 20.71 MB.**
That is the whole library on disk, *not* the weight of any single page — see
[Page weight](#page-weight) below.

> Note: the Pexels detail pages above are reachable in a browser but return 403
> to plain `curl`/scripts (Cloudflare). Only Pexels *search* pages scrape
> cleanly — that is the pattern `fetch_stock.py` in the repo root uses.

---

## Copy-paste: accessible, mobile-safe background video

The video element ships with **no `src`**. It carries the poster and a
`data-src`. Script promotes `data-src` to `src` only when the visitor has not
asked for reduced motion, is not on a metered/slow connection, and the section
is actually on screen. If any of those fail — or if JS never runs at all — the
browser just paints the `poster` and the page still looks finished. That is the
whole trick: **the poster is the baseline, the video is the enhancement.**

### HTML

```html
<section class="tr-vidbg">
  <video
    class="tr-vidbg__media"
    data-src="/assets/video/hero-coast.mp4"
    poster="/assets/video/hero-coast.jpg"
    muted
    playsinline
    autoplay
    loop
    preload="metadata"
    disablepictureinpicture
    aria-hidden="true"
    tabindex="-1"></video>

  <div class="tr-vidbg__scrim" aria-hidden="true"></div>

  <div class="tr-vidbg__inner">
    <h1>Twisted Roots Merc</h1>
    <p>Mercantile, bakery, kitchen &amp; lumber yard — Siletz, Oregon.</p>
  </div>
</section>
```

`aria-hidden="true"` + `tabindex="-1"` keep the decorative video out of the
accessibility tree and out of the tab order. Never put content that matters
only in the video.

### CSS

```css
.tr-vidbg {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: clamp(28rem, 70vh, 44rem);
  display: grid;
  place-items: center;
  /* Belt and braces: poster also painted as a background, so the section is
     never a blank box while the video decodes (or if the <video> is blocked). */
  background: #2b2622 url("/assets/video/hero-coast.jpg") center / cover no-repeat;
}

.tr-vidbg__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  /* Fade in once the first frames are decoded, so there is no poster->video pop. */
  opacity: 0;
  transition: opacity 600ms ease;
}
.tr-vidbg__media.is-playing { opacity: 1; }

/* Warm scrim: keeps cream/rust type legible over any frame of the footage. */
.tr-vidbg__scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(28, 24, 21, 0.55) 0%, rgba(28, 24, 21, 0.30) 45%, rgba(28, 24, 21, 0.70) 100%);
}

.tr-vidbg__inner {
  position: relative;
  padding: 3rem 1.5rem;
  max-width: 52rem;
  text-align: center;
  color: #f4ece0; /* cream */
}

/* Reduced motion: never show the video at all, poster only. */
@media (prefers-reduced-motion: reduce) {
  .tr-vidbg__media { display: none; }
}
```

### JS (drop once, works for every `.tr-vidbg` on the page)

```html
<script>
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var conn   = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};

  function cheapEnough() {
    if (conn.saveData === true) return false;                 // Data Saver on
    var t = conn.effectiveType || '';
    return !(t === 'slow-2g' || t === '2g' || t === '3g');     // bail on slow links
  }

  function activate(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = '1';
    video.src = video.dataset.src;
    video.load();
    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
    }, { once: true });
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused: poster stays */ });
  }

  function teardown(video) {
    video.pause();
    video.classList.remove('is-playing');
    video.removeAttribute('src');
    video.load();                 // frees the buffer, poster comes back
    delete video.dataset.loaded;
  }

  var videos = [].slice.call(document.querySelectorAll('.tr-vidbg__media[data-src]'));
  if (!videos.length) return;

  function start() {
    if (reduce.matches || !cheapEnough()) return;
    if (!('IntersectionObserver' in window)) { videos.forEach(activate); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) activate(e.target);
        else if (e.target.dataset.loaded) e.target.pause();   // offscreen: stop burning CPU
      });
    }, { rootMargin: '200px 0px' });
    videos.forEach(function (v) { io.observe(v); });
  }

  // Respond live if the visitor flips the OS motion setting.
  var onChange = function () {
    if (reduce.matches) videos.forEach(teardown);
    else start();
  };
  if (reduce.addEventListener) reduce.addEventListener('change', onChange);
  else if (reduce.addListener) reduce.addListener(onChange);

  start();
})();
</script>
```

**Why each attribute is there**

- `muted` + `playsinline` — iOS Safari and Chrome Android refuse to autoplay
  without both. `playsinline` also stops iOS from throwing the clip into
  fullscreen.
- `autoplay` — kept in the markup so the video starts the instant `src` lands,
  with no extra `play()` round trip; the `play()` call in JS is the fallback for
  browsers that will not autoplay a late-assigned source.
- `loop` — seamless repeat; clips are trimmed to sections with no hard cut.
- `preload="metadata"` — with no `src` present this costs nothing; once JS sets
  the source the browser fetches progressively rather than greedily.
- `poster` — the fallback image *and* the first paint, so LCP is a ~30-240 KB
  JPEG rather than a multi-megabyte video.
- `disablepictureinpicture` — stops Chrome offering a PiP button on decoration.

---

## Page weight

A background video is the heaviest thing on a page, so treat it as a budget:

- **One autoplaying clip above the fold. Never two.** With `hero-coast.mp4` the
  hero costs **0.62 MB of video + 34 KB of poster**, and only the poster is on
  the critical path.
- Everything below the fold is lazy — the `IntersectionObserver` above means a
  visitor who never scrolls to the bakery section never downloads `bakery.mp4`.
- A realistic homepage using hero + two lower sections (say `bakery.mp4` and
  `woodgrain.mp4`) lands at roughly **3.0 MB of video** for a visitor who reads
  the whole page, and **~0.7 MB** for one who bounces at the fold.
- Keep `river.mp4` (4.67 MB) and `storm.mp4` (4.44 MB) off the homepage. They
  belong on the yard / storm interior pages where they can be the one big asset.
- Serve everything from the same origin with a long `Cache-Control`
  (`max-age=31536000, immutable`) — these files never change.

## Recommended homepage hero: `hero-coast.mp4`

1. **It is the brand in one frame.** Dark forested headland, heavy grey surf,
   flat overcast sky — that is the Oregon Coast in November, which is exactly
   the weathered-heritage register the mercantile is trading on. `hero-forest`
   is beautiful but reads as generic European spruce plantation; `hero-coast`
   reads as *here*.
2. **It is the cheapest clip in the set** — 0.62 MB, six times lighter than
   `river` or `storm`, because the low-contrast overcast frame compresses
   extremely well. The best-looking hero also happens to be the fastest one.
3. **It is built for type.** The frame is dark, low-contrast and busiest at the
   bottom edge, so cream headlines and a rust CTA sit cleanly in the upper two
   thirds with only a light scrim. Compare `bakery`, which has a bright dough
   mass moving through the middle of the frame and fights any centred headline.
4. **It loops invisibly.** Continuous surf with no camera cut, no subject
   entering or leaving frame, and no exposure shift across the 10 seconds — the
   wrap point is not perceivable. `coffee` and `bakery` have a clear narrative
   arc and visibly restart, so they work better as small section accents than as
   a hero.

Second choice: `storm.mp4` if you want the hero to feel more dramatic — same
palette, but 7x the bytes, so only if the hero is the page's single heavy asset.

---

## Credits (optional — not required by the Pexels License)

Footage from Pexels, video IDs 16608721, 10292320, 34511532, 7405930, 6950167,
7830311, 7430750, 11009608.
