/* ==========================================================
   TWISTED ROOTS — CROWS
   ----------------------------------------------------------
   Real crows, not a drawn shape. The sprite is one complete
   wingbeat cut out of green-screen footage, keyed, solidified
   and aligned on the body, with a glide held on the end so the
   loop beats and then coasts the way a crow actually flies.

   Three things keep it from reading as a looping GIF:
     · they only fly in the sky band, never over the treeline
     · every bird has its own beat, speed, size and altitude
     · they drift with the scroll, so they sit in the scene
       instead of on top of it

   TIMING. Worth knowing why this took several passes: while the
   sprite maths was broken it painted two half-birds at once, so
   any natural rate looked frantic and the only way to calm it
   was to slow it past the point of realism. With the frames
   landing correctly a normal beat reads as a normal beat.

   The sheet is 18 beat frames plus 7 of glide, so the beat is
   18/25 of the cycle: a 0.80s cycle puts the beat near 0.58s.
   Distance flattens apparent motion, so the far birds run a
   little slower again. Crossing takes 74-120s.
   ========================================================== */

(function () {
  "use strict";

  var SHEET_FRAMES = 25;                  /* 18 beat + 7 glide */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  var flock = [];
  var raf = 0;

  function build(host) {
    var n = parseInt(host.dataset.crows || "4", 10);
    n = Math.max(1, Math.min(7, n));
    host.innerHTML = "";
    host.style.setProperty("--cr-frames", SHEET_FRAMES);

    /* Sky only. The horizon in these heroes sits around 45-55%,
       so everything stays well clear of the treeline. */
    var SKY_TOP = 3, SKY_BOTTOM = 29;

    for (var i = 0; i < n; i++) {
      var crow = document.createElement("span");
      crow.className = "crow";

      var t = n > 1 ? i / (n - 1) : 0.5;
      var depth = (i % 3) / 2;             /* 0 near … 1 far */

      /* Pixel-exact sprite maths needs the cell size in px, not a
         percentage — see the CROWS block in site.css. Declared up
         here because the speed maths below is expressed in body
         lengths and needs it. */
      var cw = 104, ch = Math.round(cw * (147 / 190));

      /* Further away: smaller, higher, slower across, and the beat
         appears slower because it is further from the eye. */
      var scale = 0.26 + (1 - depth) * 0.36;
      var top   = SKY_TOP + t * (SKY_BOTTOM - SKY_TOP) + (i % 2 ? 3.5 : -2.5);

      /* HOW FAST A BIRD SHOULD ACTUALLY GO
         ---------------------------------
         The old numbers were 74-130 seconds to cross, which on a
         1400px hero is ~28px/s. A crow drawn 90px long covering its
         own body length in three seconds is the slow-motion tell —
         nothing alive moves like that.

         So speed is set in BODY LENGTHS PER SECOND, which is the
         measure that stays honest at any size or screen width, and
         the crossing time falls out of it. A crow in level flapping
         flight covers something like 20 body lengths a second; that
         is a two-second streak across a hero and useless as scenery,
         so this is deliberately an unhurried cruise rather than a
         commute. It is the one place here that is dialled back from
         life, and it is dialled back once, in one number.

         Because px/s is proportional to apparent size, a far bird
         gets the SAME physical speed and simply takes longer to
         cross - which is exactly what perspective does. */
      var BODY_PER_SEC = 3.2;
      var travel = (window.innerWidth || 1400) * 1.52;   /* -26vw to 126vw */
      var cross  = travel / (BODY_PER_SEC * cw * scale);
      var delay  = -(i * (cross / n) + (i % 3) * 1.7);

      /* The beat does NOT slow with distance. A far crow's wings do
         not flap slower; it only crosses the frame slower, which the
         line above already handles. 18 of the 25 frames are one full
         beat, so 0.40s a cycle is 18/25 x 0.40 = 0.29s a beat, about
         3.4 a second - a real crow's working rate. */
      var flap  = 0.40 + (i % 3) * 0.03;

      crow.style.cssText =
        "top:" + top.toFixed(1) + "%;" +
        "--cr-w:" + cw + "px;" +
        "--cr-h:" + ch + "px;" +
        "--cr-scale:" + scale.toFixed(2) + ";" +
        "--cr-cross:" + cross.toFixed(0) + "s;" +
        "--cr-delay:" + delay.toFixed(1) + "s;" +
        "--cr-flap:" + flap.toFixed(2) + "s;" +
        "--cr-haze:" + depth.toFixed(2) + ";" +
        "--cr-bob:" + (3 + (1 - depth) * 4).toFixed(0) + "px;";

      var sprite = document.createElement("i");
      sprite.className = "crow__sprite";
      crow.appendChild(sprite);
      host.appendChild(crow);

      flock.push({ el: crow, drift: 24 + (1 - depth) * 72 });
    }
  }

  /* Scroll coupling. The flock slides and lifts a little as the
     page moves, so the birds belong to the scene behind them
     rather than floating over the top of it. */
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var k = (window.scrollY || window.pageYOffset) / Math.max(1, window.innerHeight);
      for (var i = 0; i < flock.length; i++) {
        var f = flock[i];
        f.el.style.setProperty("--cr-drift", (-k * f.drift).toFixed(1) + "px");
        f.el.style.setProperty("--cr-rise",  (-k * f.drift * 0.32).toFixed(1) + "px");
      }
    });
  }

  function init() {
    var hosts = document.querySelectorAll(".crows");
    if (!hosts.length) return;

    Array.prototype.forEach.call(hosts, function (h) {
      if (reduce.matches) h.dataset.crows = "2";
      build(h);
    });

    if (!reduce.matches) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ==========================================================
   THE CROW THAT LANDS ON THE SIGN
   ----------------------------------------------------------
   One bird, one performance, in five phases:

     APPROACH  it is already out over the hero with the others,
               turns, and flies in toward the sign
     LAND      flares and drops onto the sign's shoulder
     SIT       settles, looks left, looks right  (3 seconds)
     TAKE OFF  pushes off the carving
     DEPART    climbs away to the right and is gone

   The version before this one skipped straight to LAND, so the
   bird materialised on the sign out of clear air. The fix is not
   a longer landing animation — it is that the bird has to arrive
   from somewhere the eye has already been looking, which is the
   flock over the hero.

   Two sprite sheets do the work and the module swaps between
   them: the 25-frame flying sheet for the two travelling phases,
   the 34-frame perch sheet for the three at the sign. The perch
   sheet is one continuous green-screen take, so the landing and
   the head turns are real footage rather than poses stitched
   together, and the frame bands below were MEASURED off the sheet
   (alpha coverage and bounding box per cell) rather than guessed:

     frames  0-1    empty, the bird is still out of frame
     frames  2-11   wings spread, flaring in, then folding
     frames 12-31   perched, narrow silhouette, head moving
     frames 32-33   wings out again, pushing off and up

   Frames are stepped from a rAF loop rather than a CSS steps()
   animation, because the position has to move at the same time
   and the two have to stay in step.
   ========================================================== */
(function () {
  "use strict";

  var SHEET   = 34;
  var LAND    = [2, 11];        /* measured, see above */
  var SIT     = [12, 31];
  var TAKEOFF = [32, 33];

  var FLY_FRAMES = 25;
  var FLAP_MS = 400;            /* same working beat as the flock */
  var FEET  = 0.74;             /* where the feet sit in the perch cell */
  var RATIO = 190 / 147;        /* perch cell aspect */

  var MS = { approach: 2400, land: 560, sit: 5000, takeoff: 260, depart: 1700 };
  var BLEND = 200;              /* cross-fade at each sheet swap */
  var TOTAL = MS.approach + MS.land + MS.sit + MS.takeoff + MS.depart;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }        /* easeOutCubic */

  function band(range, p) {
    var n = range[1] - range[0] + 1;
    return range[0] + Math.min(n - 1, Math.floor(Math.max(0, p) * n));
  }

  /* Land it on the sign's SHOULDER — the flatter stretch of the
     carved top edge, right of the peak with the firs on it. The
     beam rides above the top of the screen, so nothing can stand
     on it; the shoulder is the highest thing actually visible. */
  function place(el, plate, h) {
    var r = plate.getBoundingClientRect();
    var SHOULDER_X = 0.62, SHOULDER_Y = 0.16;

    var landX = r.left + r.width * SHOULDER_X;
    var landY = r.top + r.height * SHOULDER_Y;

    /* A bird needs room above whatever it stands on. Size it to
       the headroom that actually exists rather than assuming. */
    var headroom = landY - 4;
    if (headroom < h * FEET) h = Math.max(22, headroom / FEET);

    var w = Math.round(h * RATIO);
    el.style.width  = w + "px";
    el.style.height = Math.round(h) + "px";
    el.style.left = Math.round(landX - w * 0.5) + "px";
    el.style.top  = Math.round(landY + window.scrollY - h * FEET) + "px";
    return { w: w, h: h, x: landX, y: landY };
  }

  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!document.querySelector(".brand")) return;
    /* motion.js builds the sign after this file loads, so resolve
       the plate at run time rather than at init. */
    function plateNow() { return document.querySelector(".brand .hangsign__plate"); }

    var el = document.createElement("div");
    el.className = "perchcrow";
    el.setAttribute("aria-hidden", "true");

    var fly = document.createElement("i");
    fly.className = "perchcrow__fly";
    var sit = document.createElement("i");
    sit.className = "perchcrow__sit";
    el.appendChild(fly);
    el.appendChild(sit);
    document.body.appendChild(el);

    var h = window.innerWidth < 900 ? 30 : 40;
    var busy = false, rafId = 0;

    function run() {
      if (busy || document.hidden) return;
      /* only when the header is actually on screen */
      if ((window.scrollY || window.pageYOffset) > window.innerHeight * 0.6) return;
      var plate = plateNow();
      if (!plate) return;
      busy = true;

      var g = place(el, plate, h);

      /* THE HANDOVER, MEASURED RATHER THAN EYEBALLED.
         Swapping sheets is where this glitched: the flying bird was
         sized off the perch CELL, but the perch cell is mostly empty
         air around the bird, so the bird itself halved in size and
         jumped sideways the instant the sheets changed.

         Both sheets were measured (alpha coverage per cell):
           flying    bird spans 0.85 of its cell, centroid 0.500/0.538
           perch f02 bird spans 0.516 of its cell, centroid 0.112/0.340
         Matching the BIRDS rather than the cells means the wingspan
         is continuous across the swap, and putting the two centroids
         at the same point means it does not jump. */
      var FLY_SPAN = 0.85, FLY_CX = 0.500, FLY_CY = 0.538;
      var P2_SPAN  = 0.516, P2_CX  = 0.112, P2_CY  = 0.340;

      var fw = Math.round(g.w * P2_SPAN / FLY_SPAN);
      var fh = Math.round(fw * 80 / 104);
      fly.style.width  = fw + "px";
      fly.style.height = fh + "px";
      fly.style.backgroundSize = (fw * FLY_FRAMES) + "px 100%";
      /* put the flying bird's centroid exactly where perch frame 2
         puts its own, in the element's own coordinates */
      fly.style.left = Math.round(g.w * P2_CX - fw * FLY_CX) + "px";
      fly.style.top  = Math.round(g.h * P2_CY - fh * FLY_CY) + "px";

      sit.style.backgroundSize = (g.w * SHEET) + "px 100%";

      /* It starts out over the middle of the hero, at the altitude
         the flock uses, and finishes just left of the sign — which
         is where the perch sheet's own first frames pick it up, so
         the handover between the two sheets is not a jump. */
      var hero = document.querySelector(".hero");
      var hr = hero ? hero.getBoundingClientRect()
                    : { top: 0, height: window.innerHeight };
      var startX = g.x + Math.max(260, window.innerWidth * 0.36);
      var startY = hr.top + hr.height * 0.24;
      var endX   = g.x - g.w * 0.33;
      var endY   = g.y - g.h * 0.09;

      var t0 = performance.now();

      function frame(now) {
        var t = now - t0;
        if (t >= TOTAL) { stop(); return; }

        var dx, dy, phase, idx, mirror = false;

        if (t < MS.approach) {
          phase = "fly";
          var k = ease(t / MS.approach);
          dx = (startX - endX) * (1 - k);
          dy = (startY - endY) * (1 - k)
               /* a bird flares UP before it drops onto a perch */
               - Math.sin(Math.PI * k) * g.h * 0.55;
          idx = Math.floor(t / FLAP_MS * FLY_FRAMES) % FLY_FRAMES;
          mirror = true;                       /* travelling leftward */
        } else if (t < MS.approach + MS.land) {
          phase = "sit"; dx = 0; dy = 0;
          idx = band(LAND, (t - MS.approach) / MS.land);
        } else if (t < MS.approach + MS.land + MS.sit) {
          phase = "sit"; dx = 0; dy = 0;
          idx = band(SIT, (t - MS.approach - MS.land) / MS.sit);
        } else if (t < TOTAL - MS.depart) {
          phase = "sit"; dx = 0; dy = 0;
          idx = band(TAKEOFF, (t - MS.approach - MS.land - MS.sit) / MS.takeoff);
        } else {
          phase = "fly";
          var d = (t - (TOTAL - MS.depart)) / MS.depart;
          dx = d * window.innerWidth * 0.55;
          dy = -d * g.h * 3.4 - Math.sin(Math.PI * d * 0.5) * g.h * 0.6;
          idx = TAKEOFF[1];
        }

        el.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";

        /* Both sheets stay in the DOM through the swap and cross-fade
           over BLEND ms. Matching the geometry gets it most of the
           way; the blend covers the wing pose, which cannot match
           because the two takes were shot separately. */
        var IN = MS.approach, OUT = TOTAL - MS.depart;
        var flyA = 1, sitA = 0;
        if (t < IN - BLEND)      { flyA = 1; sitA = 0; }
        else if (t < IN)         { sitA = (t - (IN - BLEND)) / BLEND; flyA = 1 - sitA; }
        else if (t < OUT)        { flyA = 0; sitA = 1; }
        else if (t < OUT + BLEND){ flyA = (t - OUT) / BLEND; sitA = 1 - flyA; }
        else                     { flyA = 1; sitA = 0; }

        fly.style.display = flyA > 0 ? "block" : "none";
        sit.style.display = sitA > 0 ? "block" : "none";
        fly.style.opacity = flyA.toFixed(2);
        sit.style.opacity = sitA.toFixed(2);

        if (flyA > 0) {
          fly.style.transform = mirror || t < IN ? "scaleX(-1)" : "none";
          var fIdx = Math.floor(t / FLAP_MS * FLY_FRAMES) % FLY_FRAMES;
          fly.style.backgroundPositionX = (-fIdx * fw) + "px";
        }
        if (sitA > 0) {
          /* during the fade-in the perch sheet holds its first frame,
             so the two birds are in the same place at the same size */
          var sIdx = phase === "sit" ? idx : LAND[0];
          sit.style.backgroundPositionX = (-sIdx * g.w) + "px";
        }

        /* fade the whole bird on as it comes, off as it goes */
        el.style.opacity = t < 260 ? (t / 260).toFixed(2)
                         : (t > TOTAL - 420 ? ((TOTAL - t) / 420).toFixed(2) : "1");

        rafId = requestAnimationFrame(frame);
      }

      function stop() {
        cancelAnimationFrame(rafId);
        el.style.opacity = "0";
        fly.style.display = "none";
        sit.style.display = "none";
        busy = false;
      }

      el.style.opacity = "0";
      rafId = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () {
      h = window.innerWidth < 900 ? 30 : 40;
    }, { passive: true });

    setTimeout(run, 4200);          /* first visit */
    setInterval(run, 165000);       /* now and then */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
