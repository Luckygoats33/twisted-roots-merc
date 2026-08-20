/* ==========================================================
   TWISTED ROOTS — THE LIVING ROOT SYSTEM
   ----------------------------------------------------------
   One root system. It leaves the carved sign in the header and
   works its way down the whole page as you scroll.

   Two rules govern everything here:

   1. CONNECTED. Every branch starts at a point sampled off the
      parent path with getPointAtLength(), so roots genuinely
      join the trunk instead of floating alongside it.
   2. QUIET. This is background. Few roots, clean curves, no
      fuzz. If it competes with the copy, it is wrong.
   ========================================================== */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Seeded RNG so the system looks identical on every visit
     rather than rearranging itself on each reload. */
  function rng(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  var S = { host: null, svg: null, paths: [], tips: [], raf: 0, built: 0 };

  /* ---------- path helpers ---------- */

  function round(n) { return Math.round(n * 10) / 10; }

  /* Catmull-Rom through the points, as cubic beziers — no corners. */
  function curve(pts) {
    if (pts.length < 2) return "";
    var d = "M" + round(pts[0][0]) + "," + round(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i],
          p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += "C" + round(p1[0] + (p2[0] - p0[0]) / 6) + "," + round(p1[1] + (p2[1] - p0[1]) / 6)
         + " " + round(p2[0] - (p3[0] - p1[0]) / 6) + "," + round(p2[1] - (p3[1] - p1[1]) / 6)
         + " " + round(p2[0]) + "," + round(p2[1]);
    }
    return d;
  }

  /* A trunk that drifts slowly. One low-frequency wave only —
     the old version wobbled and read as a scribble. */
  function trunk(x0, y0, y1, amp, drift, rand) {
    var pts = [], steps = Math.max(6, Math.round((y1 - y0) / 220));
    var phase = rand() * 6.283;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      pts.push([
        x0 + Math.sin(phase + t * 3.1) * amp * (0.3 + t * 0.7) + drift * t,
        y0 + (y1 - y0) * t
      ]);
    }
    return curve(pts);
  }

  /* A branch leaving a parent path at `atY`, found by walking the
     parent's own geometry. This is what makes it look connected. */
  function branchFrom(parentEl, atY, dir, len, rand) {
    var total = parentEl.getTotalLength();
    if (!total) return null;

    /* binary search the parent for the point nearest atY */
    var lo = 0, hi = total, pt = null;
    for (var i = 0; i < 18; i++) {
      var mid = (lo + hi) / 2;
      pt = parentEl.getPointAtLength(mid);
      if (pt.y < atY) lo = mid; else hi = mid;
    }
    if (!pt) return null;

    /* a short tangent so the branch leaves at a believable angle */
    var back = parentEl.getPointAtLength(Math.max(0, lo - 26));
    var ang = Math.atan2(pt.y - back.y, pt.x - back.x);

    var pts = [[pt.x, pt.y]], steps = 4, ex = pt.x, ey = pt.y;
    for (var k = 1; k <= steps; k++) {
      var t = k / steps;
      /* peel away from the trunk, then bend back down under its own weight */
      var spread = dir * len * Math.pow(t, 0.62);
      var fall = len * (0.30 + rand() * 0.22) * t * t;
      ex = pt.x + Math.cos(ang) * len * 0.10 * t + spread;
      ey = pt.y + Math.sin(ang) * len * 0.10 * t + fall;
      pts.push([ex, ey]);
    }
    return { d: curve(pts), end: [ex, ey], at: [pt.x, pt.y] };
  }

  function addPath(d, cls, y0, y1) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    S.svg.appendChild(p);
    S.paths.push({ el: p, y0: y0, y1: y1, len: 0 });
    return p;
  }

  /* ---------- build ---------- */

  function build() {
    if (!S.host) return;
    S.host.innerHTML = "";
    S.paths = [];
    S.tips = [];

    var W = document.documentElement.clientWidth;
    var H = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    S.host.style.height = H + "px";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    S.svg = svg;
    S.host.appendChild(svg);          /* in the DOM before measuring */

    var rand = rng(20260820);

    /* Start directly under the carved sign in the header. */
    var brandImg = document.querySelector(".brand img");
    var seedX = 74;
    if (brandImg) {
      var b = brandImg.getBoundingClientRect();
      seedX = b.left + b.width / 2 + window.scrollX;
    }
    var headH = (document.querySelector(".site-head") || {}).offsetHeight || 86;

    /* Stay in the margin. On a narrow screen the margin is the
       page edge, so hug it rather than crossing the text. */
    var lane = Math.max(34, Math.min(seedX, W * 0.10));
    var amp = Math.min(34, W * 0.022);

    /* ---- the trunk: sign to footer, one continuous root ---- */
    var tapEl = addPath(
      trunk(lane, headH - 6, H - 90, amp, Math.min(90, W * 0.05), rand),
      "rt-tap", 0, H
    );

    /* ---- branches, one every other section, alternating ---- */
    var secs = Array.prototype.slice.call(document.querySelectorAll("main > section"));
    var picks = secs.filter(function (_, i) { return i < 3 || i % 2 === 0; });

    picks.forEach(function (sec, n) {
      var r = sec.getBoundingClientRect();
      var top = r.top + window.scrollY;
      var atY = top + Math.min(r.height * 0.4, 300);
      if (atY < headH + 60 || atY > H - 160) return;

      var len = 60 + rand() * Math.min(120, W * 0.075);
      var br = branchFrom(tapEl, atY, 1, len, rand);
      if (!br) return;

      addPath(br.d, "rt-major", atY - window.innerHeight * 0.7, atY + 130);

      /* one child root, so it reads as a system and not a comb */
      if (n % 2 === 0) {
        var sub = branchFrom(S.paths[S.paths.length - 1].el,
                             br.at[1] + len * 0.42, 1, len * 0.5, rand);
        if (sub) addPath(sub.d, "rt-minor", atY - window.innerHeight * 0.66, atY + 200);
      }

      var tip = document.createElementNS(NS, "circle");
      tip.setAttribute("cx", round(br.end[0]));
      tip.setAttribute("cy", round(br.end[1]));
      svg.appendChild(tip);
      S.tips.push({ el: tip, y: atY });
    });

    /* ---- the trunk returns to the sign in the footer ---- */
    var foot = document.querySelector(".site-foot img");
    if (foot) {
      var fr = foot.getBoundingClientRect();
      var fx = fr.left + fr.width / 2 + window.scrollX;
      var fy = fr.top + window.scrollY;
      addPath(curve([
        [lane + 14, fy - 300],
        [lane + (fx - lane) * 0.4, fy - 180],
        [lane + (fx - lane) * 0.82, fy - 70],
        [fx - 18, fy - 4]
      ]), "rt-major", fy - 300 - window.innerHeight * 0.6, fy);
    }

    /* measure once; from here on we only touch stroke-dashoffset */
    S.paths.forEach(function (o) {
      var L = 2000;
      try { L = o.el.getTotalLength() || 2000; } catch (e) {}
      o.len = L;
      o.el.style.strokeDasharray = L;
      o.el.style.strokeDashoffset = reduce ? 0 : L;
    });

    S.built = H;
    paint();
  }

  /* ---------- grow as you scroll ---------- */

  function paint() {
    if (reduce) return;
    var eye = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.9;

    for (var i = 0; i < S.paths.length; i++) {
      var o = S.paths[i];
      var p = (eye - o.y0) / Math.max(1, o.y1 - o.y0);
      o.el.style.strokeDashoffset = o.len * (1 - (p < 0 ? 0 : p > 1 ? 1 : p));
    }
    for (var j = 0; j < S.tips.length; j++) {
      var t = S.tips[j];
      if (!t.lit && eye > t.y + 60) { t.lit = 1; t.el.classList.add("lit"); }
    }
  }

  function queue() {
    if (S.raf) return;
    S.raf = requestAnimationFrame(function () { S.raf = 0; paint(); });
  }

  /* ---------- init ---------- */

  function init() {
    if (document.querySelector(".rootsys")) return;

    var host = document.createElement("div");
    host.className = "rootsys";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    S.host = host;

    if (getComputedStyle(document.body).position === "static") {
      document.body.style.position = "relative";
    }

    var brand = document.querySelector(".brand");
    if (brand && !brand.querySelector(".rt-seed")) {
      var stem = document.createElement("span");
      stem.className = "rt-seed";
      brand.appendChild(stem);
    }

    build();
    window.addEventListener("scroll", queue, { passive: true });

    var t;
    function later() { clearTimeout(t); t = setTimeout(build, 250); }
    window.addEventListener("resize", later, { passive: true });

    /* the page gets taller as the client-side lists render */
    setTimeout(build, 500);
    setTimeout(build, 1600);
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        if (Math.abs(document.body.scrollHeight - S.built) > 300) later();
      }).observe(document.body);
    }
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-stormtoggle]")) setTimeout(build, 140);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
