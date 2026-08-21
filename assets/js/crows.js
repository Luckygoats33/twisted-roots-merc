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

   TIMING. These are distant birds, and distance flattens motion:
   the further away something is, the slower it appears to move
   even though it is doing the same thing. So the beat runs long
   and the crossing runs very long — two and a half to four
   minutes to clear the frame. They should register as something
   happening at the edge of the valley, not as an animation.
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

      /* Further away: smaller, higher, slower across, and the beat
         appears slower because it is further from the eye. */
      var scale = 0.26 + (1 - depth) * 0.62;
      var top   = SKY_TOP + t * (SKY_BOTTOM - SKY_TOP) + (i % 2 ? 3.5 : -2.5);
      var cross = 150 + depth * 70 + (i % 3) * 22;      /* seconds to cross */
      var delay = -(i * 6 + (i % 3) * 3.5);
      var flap  = 1.45 + depth * 0.35 + (i % 2) * 0.12; /* far off, unhurried */

      /* Pixel-exact sprite maths needs the cell size in px, not a
         percentage — see the CROWS block in site.css. */
      var cw = 104, ch = Math.round(cw * (147 / 190));

      crow.style.cssText =
        "top:" + top.toFixed(1) + "%;" +
        "--cr-w:" + cw + "px;" +
        "--cr-h:" + ch + "px;" +
        "--cr-scale:" + scale.toFixed(2) + ";" +
        "--cr-cross:" + cross.toFixed(0) + "s;" +
        "--cr-delay:" + delay.toFixed(1) + "s;" +
        "--cr-flap:" + flap.toFixed(2) + "s;" +
        "--cr-haze:" + depth.toFixed(2) + ";" +
        "--cr-bob:" + (7 + (1 - depth) * 9).toFixed(0) + "px;";

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
