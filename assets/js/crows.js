/* ==========================================================
   TWISTED ROOTS — CROWS
   ----------------------------------------------------------
   A loose group of crows working their way across the hero.
   Real crow shape: broad wings, fingered tips, a wedge tail,
   and a slow deliberate flap with a glide in the middle of it.

   Drop <div class="crows" data-crows="5"></div> in a
   position:relative parent. Everything else happens here.
   ========================================================== */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  /* A crow in profile, facing the direction of travel. The wings
     are rooted well inside the body so there is never a seam
     between them, however far the flap swings. */
  function crowSVG() {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 56");
    svg.setAttribute("class", "crow__svg");
    svg.setAttribute("aria-hidden", "true");

    /* Body: wedge tail at the back, deep chest, small head, short
       heavy beak. That heavy beak is most of what says crow
       rather than gull. */
    var body = document.createElementNS(NS, "path");
    body.setAttribute("class", "crow__body");
    body.setAttribute("d",
      "M14 27 C22 24.6 34 23.4 48 23.4 C62 23.4 74 24.4 84 26 " +
      "C90 27 95 28 99 29 L107 30.8 C109.6 31.4 110 32.8 108 33.2 " +
      "C106 33.6 102.6 33.4 99 32.8 L92 31.6 C86 33.4 76 34.6 64 34.8 " +
      "C50 35 34 33.8 22 31.6 L14 30 C12.4 29.6 12.4 27.4 14 27 Z");

    /* Near wing — broad arm, swept hand, three fingers at the tip. */
    var wl = document.createElementNS(NS, "path");
    wl.setAttribute("class", "crow__wing crow__wing--l");
    wl.setAttribute("d",
      "M66 32 C56 26 44 17 33 10 C27 6.2 21 3.4 15 2 " +
      "C18 7 23 13 29 18.6 C34.6 24 41 28.4 47 31.2 " +
      "C53 33.4 60 34 66 33.6 Z");

    /* Far wing — the same arm, shorter and higher, so the bird
       reads as three dimensional instead of flat. */
    var wr = document.createElementNS(NS, "path");
    wr.setAttribute("class", "crow__wing crow__wing--r");
    wr.setAttribute("d",
      "M60 31 C64 25 70 18 77 12.6 C81.4 9.2 85.8 6.8 90 5.6 " +
      "C88.6 10 86 14.8 82.6 19.2 C79 23.8 74.6 27.6 70.4 30 " +
      "C66.6 32 63 32.6 60 32.4 Z");

    svg.appendChild(wr);      /* far wing behind the body */
    svg.appendChild(body);
    svg.appendChild(wl);      /* near wing in front */
    return svg;
  }

  function build(host) {
    var n = parseInt(host.dataset.crows || "4", 10);
    n = Math.max(1, Math.min(7, n));
    host.innerHTML = "";

    for (var i = 0; i < n; i++) {
      var crow = document.createElement("span");
      crow.className = "crow";

      /* Deterministic spread so the flock looks arranged, not random.
         Leaders are larger and lower; stragglers smaller and higher. */
      var t = i / Math.max(1, n - 1);
      var scale = 0.5 + (i % 3) * 0.26;                 /* depth */
      var top = 12 + t * 34 + (i % 2 ? 6 : -4);         /* % from top */
      var cross = 46 + i * 9 + (i % 3) * 5;             /* seconds to cross */
      var delay = -(i * 7 + (i % 3) * 4);               /* stagger, already in flight */
      var flap = 0.62 + (i % 3) * 0.16;                 /* wingbeat */

      crow.style.cssText =
        "top:" + top.toFixed(1) + "%;" +
        "--cr-scale:" + scale.toFixed(2) + ";" +
        "--cr-cross:" + cross + "s;" +
        "--cr-delay:" + delay + "s;" +
        "--cr-flap:" + flap.toFixed(2) + "s;" +
        "--cr-bob:" + (5 + (i % 3) * 3) + "px;";

      crow.appendChild(crowSVG());
      host.appendChild(crow);
    }
  }

  function init() {
    var hosts = document.querySelectorAll(".crows");
    if (!hosts.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* one crow, parked, so the hero still has a bird in it */
      Array.prototype.forEach.call(hosts, function (h) {
        h.dataset.crows = "1";
        build(h);
      });
      return;
    }
    Array.prototype.forEach.call(hosts, build);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
