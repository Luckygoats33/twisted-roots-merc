/* ==========================================================
   TWISTED ROOTS — THE ROOT SYSTEM
   ----------------------------------------------------------
   Not a line down the side of the page. A root.

   Four things make it read as a root rather than a stroke:

   1. FILLED, TAPERING RIBBONS. A stroked path has one width for
      its whole length, which is exactly what a root does not do.
      Every strand here is a filled outline whose width falls off
      along its length and wobbles locally, so it thins, swells
      and finally comes to a point.

   2. BRAIDED STRANDS. Three strands share a centreline and each
      carries its own rotating phase, so they cross over one
      another on the way down. That crossing is the twist.

   3. FRACTAL WANDER. The centreline is several octaves of noise
      rather than one sine, so it never repeats a shape the eye
      can predict.

   4. GROWTH BY CLIP. Because the shapes are filled, growth is a
      clip rectangle tied to the scroll — so the root genuinely
      grows on the way down and contracts on the way back up.
   ========================================================== */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var S = { host: null, svg: null, g: null, clip: null, H: 0, raf: 0, built: 0 };

  /* ---------- deterministic value noise ---------- */
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noiseField(seed, n) {
    var r = mulberry(seed), a = [];
    for (var i = 0; i < n; i++) a.push(r() * 2 - 1);
    return function (x) {
      var i = Math.floor(x), f = x - i;
      var v0 = a[(i % n + n) % n], v1 = a[((i + 1) % n + n) % n];
      var s = f * f * (3 - 2 * f);
      return v0 + (v1 - v0) * s;
    };
  }
  function fractal(fn, x) {
    return fn(x) * 0.6 + fn(x * 2.3 + 11) * 0.28 + fn(x * 5.1 + 29) * 0.12;
  }

  /* ---------- a filled, tapering, gnarled ribbon ---------- */
  function ribbon(pts, w0, w1, wob, seed) {
    var nz = noiseField(seed, 24);
    var L = [], R = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;

      var w = w0 + (w1 - w0) * Math.pow(t, 0.72);
      w *= 1 + fractal(nz, t * 7) * wob;
      w = Math.max(0.35, w);

      L.push([p[0] + nx * w * 0.5, p[1] + ny * w * 0.5]);
      R.push([p[0] - nx * w * 0.5, p[1] - ny * w * 0.5]);
    }
    R.reverse();
    return "M" + L.concat(R).map(function (q) {
      return q[0].toFixed(1) + "," + q[1].toFixed(1);
    }).join("L") + "Z";
  }

  /* ---------- a braided root ---------- */
  function braid(x0, y0, y1, amp, drift, seed, strands, w0, w1) {
    var nz = noiseField(seed, 32);
    var steps = Math.max(26, Math.round((y1 - y0) / 26));
    var centre = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      centre.push([x0 + fractal(nz, t * 3.4) * amp + drift * t, y0 + (y1 - y0) * t]);
    }
    var out = [];
    for (var k = 0; k < strands; k++) {
      var phase = (k / strands) * Math.PI * 2;
      var pts = centre.map(function (p, i) {
        var t = i / steps;
        /* the twist: each strand swings around the centreline and
           tightens as the root thins toward the tip */
        var swing = Math.sin(t * 9.5 + phase) * (w0 * 0.42) * (1 - t * 0.55);
        var wob = fractal(nz, t * 6 + k * 3) * w0 * 0.16;
        return [p[0] + swing + wob, p[1]];
      });
      out.push({ d: ribbon(pts, w0 * (0.62 + 0.2 * (k % 2)), w1, 0.34, seed + k * 97), pts: pts });
    }
    return { strands: out, centre: centre };
  }

  function offshoot(pts, at, dir, len, seed, w0) {
    var nz = noiseField(seed, 20);
    var p = pts[Math.min(pts.length - 1, Math.max(0, at))];
    var steps = 14, out = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      out.push([
        p[0] + dir * len * Math.pow(t, 0.66) + fractal(nz, t * 5) * len * 0.16,
        p[1] + len * (0.34 + fractal(nz, t * 3 + 7) * 0.16) * t * t + len * 0.1 * t
      ]);
    }
    return { d: ribbon(out, w0, 0.5, 0.42, seed + 31), pts: out };
  }

  function add(d, cls) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    S.g.appendChild(p);
    return p;
  }

  /* ---------- build ---------- */
  function build() {
    if (!S.host) return;
    S.host.innerHTML = "";

    var W = document.documentElement.clientWidth;
    var H = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    S.H = H;
    S.host.style.height = H + "px";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    S.svg = svg;

    var defs = document.createElementNS(NS, "defs");
    var cp = document.createElementNS(NS, "clipPath");
    cp.setAttribute("id", "tr-rootclip");
    var rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", 0); rect.setAttribute("y", 0);
    rect.setAttribute("width", W);
    rect.setAttribute("height", reduce ? H : 0);
    cp.appendChild(rect); defs.appendChild(cp); svg.appendChild(defs);
    S.clip = rect;

    var g = document.createElementNS(NS, "g");
    g.setAttribute("clip-path", "url(#tr-rootclip)");
    svg.appendChild(g);
    S.g = g;
    S.host.appendChild(svg);

    var brandImg = document.querySelector(".brand img");
    var seedX = 74;
    if (brandImg) {
      var b = brandImg.getBoundingClientRect();
      seedX = b.left + b.width / 2 + window.scrollX;
    }
    var headH = (document.querySelector(".site-head") || {}).offsetHeight || 86;
    var lane = Math.max(30, Math.min(seedX, W * 0.085));
    var amp = Math.min(46, W * 0.032);
    var thick = W < 700 ? 13 : 19;

    var main = braid(lane, headH - 20, H - 80, amp, Math.min(110, W * 0.06),
                     20260820, 3, thick, 1.1);
    main.strands.forEach(function (s, i) {
      add(s.d, i === 0 ? "rt-strand rt-strand--a" : "rt-strand rt-strand--b");
    });

    /* offshoots taken off the real strand, so they are attached
       rather than floating next to it */
    var secs = Array.prototype.slice.call(document.querySelectorAll("main > section"));
    var host = main.strands[0].pts;
    var y0 = host[0][1], y1 = host[host.length - 1][1];
    secs.forEach(function (sec, n) {
      if (n % 2) return;
      var r = sec.getBoundingClientRect();
      var y = r.top + window.scrollY + Math.min(r.height * 0.36, 280);
      if (y < headH + 40 || y > H - 140) return;
      var idx = Math.round((y - y0) / Math.max(1, y1 - y0) * (host.length - 1));
      var len = 60 + (n % 3) * 34 + Math.min(120, W * 0.07);
      var o = offshoot(host, idx, 1, len, 4000 + n * 131, thick * 0.4);
      add(o.d, "rt-strand rt-strand--c");
      if (n % 4 === 0) {
        var o2 = offshoot(o.pts, Math.round(o.pts.length * 0.55), 1, len * 0.5,
                          7000 + n * 17, thick * 0.2);
        add(o2.d, "rt-strand rt-strand--d");
      }
    });

    S.built = H;
    paint();
  }

  /* ---------- grow and contract with the scroll ---------- */
  function paint() {
    if (!S.clip || reduce) return;
    var y = window.scrollY || window.pageYOffset;
    var reach = y + window.innerHeight * 0.92;
    S.clip.setAttribute("height", Math.max(0, Math.min(S.H, reach)).toFixed(0));
  }
  function queue() {
    if (S.raf) return;
    S.raf = requestAnimationFrame(function () { S.raf = 0; paint(); });
  }

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

    build();
    window.addEventListener("scroll", queue, { passive: true });

    var t;
    function later() { clearTimeout(t); t = setTimeout(build, 240); }
    window.addEventListener("resize", later, { passive: true });
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
