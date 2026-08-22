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
   One bird, one performance: it flies in from the left, flares,
   lands on the beam the carved sign hangs from, settles, looks
   left, looks right, then drops off the beam and goes.

   It is a 34-frame sprite cut from a single green-screen take,
   so the whole thing is one continuous piece of real footage
   rather than poses stitched together. Stepped once through,
   never looped — a bird that lands on a loop is a screensaver.

   It is positioned off the real beam every time it runs, so it
   stays put when the header resizes or the sign grows.
   ========================================================== */
(function () {
  "use strict";

  var FRAMES = 34;
  var FEET   = 0.74;      /* where the feet sit in the cell, top-down */
  var RATIO  = 190 / 147; /* cell aspect */
  var RUN_MS = 7600;      /* one performance */

  /* Land it on the sign's SHOULDER — the flatter stretch of the
     carved top edge, right of the peak with the firs on it. The
     beam rides above the top of the screen, so nothing can stand
     on it; the shoulder is the highest thing actually visible. */
  function place(el, plate, h) {
    var r = plate.getBoundingClientRect();

    var SHOULDER_X = 0.62;    /* across the plate, right of the peak */
    var SHOULDER_Y = 0.16;    /* down from the plate's top edge      */

    var landX = r.left + r.width * SHOULDER_X;
    var landY = r.top + r.height * SHOULDER_Y;

    /* A bird needs room above whatever it stands on. Size it to
       the headroom that actually exists rather than assuming. */
    var headroom = landY - 4;
    if (headroom < h * FEET) h = Math.max(22, headroom / FEET);

    var w = Math.round(h * RATIO);
    el.style.height = Math.round(h) + "px";
    el.style.width  = w + "px";
    el.style.setProperty("--pc-w", w + "px");   /* exact cell width */
    el.style.left = Math.round(landX - w * 0.5) + "px";
    el.style.top  = Math.round(landY + window.scrollY - h * FEET) + "px";
  }

  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* motion.js builds the sign after this file loads, so resolve
       the plate at run time rather than at init. */
    function plateNow(){ return document.querySelector(".brand .hangsign__plate"); }
    if (!document.querySelector(".brand")) return;

    var el = document.createElement("div");
    el.className = "perchcrow";
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--pc-frames", FRAMES);
    el.style.setProperty("--pc-run", RUN_MS + "ms");
    document.body.appendChild(el);

    var h = window.innerWidth < 900 ? 30 : 40;   /* a crow is small next to a shop sign */
    var busy = false;

    function run() {
      if (busy || document.hidden) return;
      /* only when the header is actually on screen */
      if ((window.scrollY || window.pageYOffset) > window.innerHeight * 0.6) return;
      busy = true;
      var plate = plateNow();
      if (!plate) { busy = false; return; }
      place(el, plate, h);
      el.classList.remove("is-flying");
      void el.offsetWidth;               /* restart the animation */
      el.classList.add("is-flying");
      setTimeout(function () {
        el.classList.remove("is-flying");
        busy = false;
      }, RUN_MS + 120);
    }

    /* keep it on the beam if the header moves under it */
    window.addEventListener("resize", function () {
      h = window.innerWidth < 900 ? 30 : 40;
      var pl = plateNow();
      if (busy && pl) place(el, pl, h);
    }, { passive: true });

    setTimeout(run, 3800);                          /* first visit */
    setInterval(run, 165000);                       /* now and then */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
