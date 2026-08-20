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

   TIMING. An American crow beats around three times a second in
   level flight, and it covers ground unhurriedly. The sheet holds
   18 beat frames plus 7 of glide, so the beat is 18/25 of the
   cycle: a 0.44s cycle puts the beat itself near 0.32s. Faster
   than that and it turns into a sparrow; slower and it swims.
   Crossing takes 38-70s, because a bird in the middle distance
   does not shoot across a landscape.
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
      var scale = 0.30 + (1 - depth) * 0.42;
      var top   = SKY_TOP + t * (SKY_BOTTOM - SKY_TOP) + (i % 2 ? 3.5 : -2.5);
      var cross = 58 + depth * 34 + (i % 3) * 8;        /* seconds to cross */
      var delay = -(i * 6 + (i % 3) * 3.5);
      var flap  = 0.62 + depth * 0.16 + (i % 2) * 0.05; /* ~2 beats/sec, cruising */

      crow.style.cssText =
        "top:" + top.toFixed(1) + "%;" +
        "--cr-scale:" + scale.toFixed(2) + ";" +
        "--cr-cross:" + cross.toFixed(0) + "s;" +
        "--cr-delay:" + delay.toFixed(1) + "s;" +
        "--cr-flap:" + flap.toFixed(2) + "s;" +
        "--cr-bob:" + (5 + (1 - depth) * 6).toFixed(0) + "px;";

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
