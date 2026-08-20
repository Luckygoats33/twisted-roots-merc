/* ==========================================================
   TWISTED ROOTS — CROWS
   ----------------------------------------------------------
   A loose group of crows working across the hero.

   The bird is a real silhouette, not a drawn path: a 4-frame
   sprite (up, level, down, level) generated from photographic
   crow references and aligned on the body so the wingbeat does
   not jitter. Frames are stepped, so the flap is a real
   wingbeat rather than a rotating shape.
   ========================================================== */

(function () {
  "use strict";

  var FRAMES = 4;

  function build(host) {
    var n = parseInt(host.dataset.crows || "4", 10);
    n = Math.max(1, Math.min(7, n));
    host.innerHTML = "";

    for (var i = 0; i < n; i++) {
      var crow = document.createElement("span");
      crow.className = "crow";

      /* Deterministic, so the flock is arranged rather than random.
         Nearer birds are bigger, lower and beat slower. */
      var t = n > 1 ? i / (n - 1) : 0.5;
      var scale = 0.34 + (i % 3) * 0.19;
      var top = 10 + t * 36 + (i % 2 ? 7 : -5);
      var cross = 52 + i * 11 + (i % 3) * 6;
      var delay = -(i * 9 + (i % 3) * 5);
      var flap = 0.72 + (i % 3) * 0.2;

      crow.style.cssText =
        "top:" + top.toFixed(1) + "%;" +
        "--cr-scale:" + scale.toFixed(2) + ";" +
        "--cr-cross:" + cross + "s;" +
        "--cr-delay:" + delay + "s;" +
        "--cr-flap:" + flap.toFixed(2) + "s;" +
        "--cr-bob:" + (6 + (i % 3) * 4) + "px;";

      var wing = document.createElement("i");
      wing.className = "crow__sprite";
      crow.appendChild(wing);
      host.appendChild(crow);
    }
  }

  function init() {
    var hosts = document.querySelectorAll(".crows");
    if (!hosts.length) return;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    Array.prototype.forEach.call(hosts, function (h) {
      if (still) h.dataset.crows = "2";
      build(h);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
