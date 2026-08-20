/* ==========================================================
   TWISTED ROOTS — THE LIVING ROOT SYSTEM
   ----------------------------------------------------------
   Procedurally grows a root network from the carved sign in
   the header, down the full height of the page, branching into
   every section as the visitor scrolls, and converging again
   in the footer.

   Everything is generated from the real measured page — so it
   re-grows correctly on resize and on any page length.
   ========================================================== */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- deterministic pseudo-random so the roots look the same
          every visit instead of rearranging on each reload ---- */
  function rng(seed) {
    var s = seed || 20260820;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  var state = { paths: [], tips: [], host: null, svg: null, docH: 0, raf: 0 };

  /* ---------- geometry helpers ---------- */

  /* A wandering vertical root: gentle sine wander + noise, so it
     reads as something that grew rather than something drawn. */
  function taproot(x0, y0, y1, amp, rand, drift) {
    var pts = [], steps = Math.max(8, Math.round((y1 - y0) / 90));
    var phase = rand() * 6.28;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var y = y0 + (y1 - y0) * t;
      var x = x0
        + Math.sin(phase + t * 7.5) * amp * (0.35 + t * 0.65)
        + Math.sin(phase * 2 + t * 19) * amp * 0.18
        + (drift || 0) * t;
      pts.push([x, y]);
    }
    return smooth(pts);
  }

  /* Catmull-Rom -> cubic bezier, so the path has no visible corners */
  function smooth(p) {
    if (p.length < 2) return "";
    var d = "M" + r(p[0][0]) + "," + r(p[0][1]);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + r(c1x) + "," + r(c1y) + " " + r(c2x) + "," + r(c2y) + " " + r(p2[0]) + "," + r(p2[1]);
    }
    return d;
  }
  function r(n) { return Math.round(n * 10) / 10; }

  /* A branch peeling off the taproot, arcing sideways and down */
  function branch(x, y, dir, len, droop, rand) {
    var pts = [[x, y]], steps = 5;
    var ax = 0, ay = 0;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      ax = dir * len * Math.pow(t, 0.72);
      ay = len * droop * t * t + len * 0.12 * t;
      pts.push([
        x + ax + (rand() - 0.5) * 9,
        y + ay + (rand() - 0.5) * 7
      ]);
    }
    return { d: smooth(pts), end: [x + ax, y + ay] };
  }

  /* ---------- build ---------- */

  function build() {
    var host = state.host;
    if (!host) return;
    host.innerHTML = "";
    state.paths = [];
    state.tips = [];

    var W = document.documentElement.clientWidth;
    var H = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    state.docH = H;
    host.style.height = H + "px";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    state.svg = svg;

    var rand = rng(20260820);

    /* Where the first root leaves the carved sign in the header */
    var brand = document.querySelector(".brand img");
    var seedX = 74;
    if (brand) {
      var b = brand.getBoundingClientRect();
      seedX = b.left + b.width / 2 + window.scrollX;
    }
    var headH = (document.querySelector(".site-head") || {}).offsetHeight || 86;

    /* Keep roots biased into the outer margins so they trace past
       the content column instead of through the middle of it. */
    var gutter = Math.max(52, Math.min(190, (W - 1300) / 2 + 96));
    var leftLane = Math.min(Math.max(seedX, 40), gutter);
    var rightLane = W - Math.max(46, gutter * 0.8);

    /* ---- 1. the taproot, sign -> footer ---- */
    var tap = mkPath(
      taproot(leftLane, headH - 8, H - 120, Math.min(46, W * 0.035), rand, gutter * 0.22),
      "rt-tap", 0, H
    );
    svg.appendChild(tap);

    /* ---- 2. a second root down the far side, starting lower ---- */
    var startR = Math.min(H * 0.22, 900);
    var tap2 = mkPath(
      taproot(rightLane, startR, H - 160, Math.min(38, W * 0.03), rand, -gutter * 0.16),
      "rt-major", startR - 400, H
    );
    svg.appendChild(tap2);

    /* ---- 3. a branch into every section ---- */
    var sections = Array.prototype.slice.call(
      document.querySelectorAll("main > section, main > div.ticker")
    );

    sections.forEach(function (sec, i) {
      var rect = sec.getBoundingClientRect();
      var top = rect.top + window.scrollY;
      var mid = top + Math.min(rect.height * 0.34, 260);
      var fromRight = i % 3 === 2;

      var baseX, dir;
      if (fromRight) {
        baseX = rightLane + Math.sin(i) * 14;
        dir = -1;
        if (mid < startR) return;
      } else {
        baseX = leftLane + Math.sin(i * 1.7) * 26;
        dir = 1;
      }

      var len = 70 + rand() * Math.min(150, W * 0.1);
      var br = branch(baseX, mid, dir, len, 0.55 + rand() * 0.5, rand);
      var p = mkPath(br.d, "rt-major", mid - window.innerHeight * 0.75, mid + 160);
      p.dataset.section = i;
      svg.appendChild(p);

      /* two or three finer roots off that branch */
      var n = 2 + Math.round(rand());
      for (var k = 0; k < n; k++) {
        var t2 = 0.45 + k * 0.22;
        var sub = branch(
          br.end[0] - dir * len * (1 - t2) * 0.55,
          br.end[1] - len * 0.22 * (1 - t2),
          dir, 26 + rand() * 54, 0.8 + rand() * 0.9, rand
        );
        svg.appendChild(mkPath(sub.d, "rt-minor", mid - window.innerHeight * 0.7, mid + 220));

        /* hair roots at the very end */
        for (var h = 0; h < 2; h++) {
          var hair = branch(sub.end[0], sub.end[1], dir * (h ? 1 : -0.6), 12 + rand() * 26, 1.1, rand);
          svg.appendChild(mkPath(hair.d, "rt-hair", mid - window.innerHeight * 0.66, mid + 260));
        }
      }

      /* the root tip that lights up when the section arrives */
      var tip = document.createElementNS(NS, "circle");
      tip.setAttribute("cx", r(br.end[0]));
      tip.setAttribute("cy", r(br.end[1]));
      tip.setAttribute("r", 3.4);
      svg.appendChild(tip);
      state.tips.push({ el: tip, y: mid });
    });

    /* ---- 4. the roots converge again at the footer sign ---- */
    var foot = document.querySelector(".site-foot img");
    if (foot) {
      var fr = foot.getBoundingClientRect();
      var fx = fr.left + fr.width / 2 + window.scrollX;
      var fy = fr.top + window.scrollY;
      [leftLane, rightLane].forEach(function (lane, idx) {
        var pts = [
          [lane + (idx ? -20 : 20), fy - 340],
          [lane + (fx - lane) * 0.35, fy - 210],
          [lane + (fx - lane) * 0.78, fy - 90],
          [fx + (idx ? 26 : -26), fy - 8]
        ];
        svg.appendChild(mkPath(smooth(pts), idx ? "rt-minor" : "rt-major", fy - 340 - window.innerHeight * 0.6, fy));
      });
    }

    host.appendChild(svg);

    /* measure every path once, then only touch dashoffset on scroll */
    state.paths.forEach(function (o) {
      var L = 0;
      try { L = o.el.getTotalLength(); } catch (e) { L = 2000; }
      o.len = L;
      o.el.style.strokeDasharray = L;
      o.el.style.strokeDashoffset = reduce ? 0 : L;
    });

    onScroll();
  }

  function mkPath(d, cls, y0, y1) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    state.paths.push({ el: p, y0: y0, y1: y1, len: 0 });
    return p;
  }

  /* ---------- grow on scroll ---------- */

  function onScroll() {
    if (reduce) return;
    var sy = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var eye = sy + vh * 0.88;

    for (var i = 0; i < state.paths.length; i++) {
      var o = state.paths[i];
      var span = Math.max(1, o.y1 - o.y0);
      var p = (eye - o.y0) / span;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      o.el.style.strokeDashoffset = o.len * (1 - p);
    }

    for (var j = 0; j < state.tips.length; j++) {
      var t = state.tips[j];
      if (!t.lit && eye > t.y + 40) {
        t.lit = true;
        t.el.classList.add("lit");
        if (j % 4 === 1) t.el.classList.add("pulse");
      }
    }
  }

  function queue() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(function () {
      state.raf = 0;
      onScroll();
    });
  }

  /* ---------- seedling markers next to section eyebrows ---------- */

  function sprouts() {
    var SPROUT =
      '<svg class="rootsprout" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M8 15 V6"/><path d="M8 8.5 C5 8 4 6 4 3.6 6.6 4 8 5.6 8 8.5Z"/>' +
      '<path d="M8 10 C11 9.4 12 7.6 12 5.4 9.4 5.8 8 7.4 8 10Z"/></svg>';
    var seen = document.querySelectorAll(".eyebrow");
    Array.prototype.forEach.call(seen, function (el, i) {
      if (i % 2) return;                  /* not every single one */
      if (el.querySelector(".rootsprout")) return;
      el.insertAdjacentHTML("afterbegin", SPROUT);
    });

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(document.querySelectorAll(".rootsprout"),
        function (s) { s.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(document.querySelectorAll(".rootsprout"),
      function (s) { io.observe(s); });
  }

  /* ---------- init ---------- */

  function init() {
    if (document.querySelector(".rootsys")) return;

    var host = document.createElement("div");
    host.className = "rootsys";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    state.host = host;

    if (getComputedStyle(document.body).position === "static") {
      document.body.style.position = "relative";
    }

    /* a short stem under the header sign, so the root clearly
       leaves the logo rather than appearing from nowhere */
    var brand = document.querySelector(".brand");
    if (brand && !brand.querySelector(".rt-seed")) {
      var stem = document.createElement("span");
      stem.className = "rt-seed";
      brand.appendChild(stem);
    }

    sprouts();
    build();

    window.addEventListener("scroll", queue, { passive: true });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(build, 220);
    }, { passive: true });

    /* the page grows as client-side lists render — re-measure once
       everything has settled, and whenever the document gets taller */
    setTimeout(build, 400);
    setTimeout(build, 1400);
    if ("ResizeObserver" in window) {
      var last = 0;
      var ro = new ResizeObserver(function () {
        var h = document.body.scrollHeight;
        if (Math.abs(h - last) > 240) { last = h; clearTimeout(rt); rt = setTimeout(build, 260); }
      });
      ro.observe(document.body);
    }

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-stormtoggle]")) setTimeout(build, 120);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
