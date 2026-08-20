/* ==========================================================
   TWISTED ROOTS MERC — MOTION ENGINE
   Companion to assets/css/motion.css. Additive: touches nothing
   that site.js owns. Load AFTER site.js.

     <link rel="stylesheet" href="assets/css/motion.css">
     <script src="assets/js/motion.js" defer></script>

   Builds:  hanging-sign swing triggers · SVG waves · SVG treeline
            · SVG birds · scroll parallax · staggered reveals
            · number count-ups · storm hooks
   Rules:   transform + opacity only, passive listeners, one rAF loop,
            reads batched before writes, and everything off under
            prefers-reduced-motion.
   Public:  window.TRMotion
   ========================================================== */

var TRMotion = (function () {
  "use strict";

  var doc  = document;
  var root = doc.documentElement;
  var $$   = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var SVGNS = "http://www.w3.org/2000/svg";

  /* Tell motion.css that JS is live (it drops its CSS-only hover fallback). */
  root.setAttribute("data-motion", "js");

  /* ---------------- reduced motion ---------------- */
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(rmq && rmq.matches); }

  /* ---------------- tiny helpers ---------------- */
  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* deterministic PRNG so the treeline is identical on every load/page */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function svg(viewBox, cls) {
    var s = doc.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", viewBox);
    s.setAttribute("preserveAspectRatio", "none");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    if (cls) s.setAttribute("class", cls);
    return s;
  }
  function path(d, fill, opacity) {
    var p = doc.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", fill);
    if (opacity != null) p.setAttribute("fill-opacity", String(opacity));
    return p;
  }
  function r1(n) { return Math.round(n * 10) / 10; }


  /* ==========================================================
     1. HANGING SWINGING SIGN
     ========================================================== */

  var HS_DEFAULT_LOGO = "assets/img/logo-trans-sm.png";

  /* Build the rig for `<div class="hangsign" data-hangsign="…logo.png">` */
  function buildHangsign(el) {
    if (el.querySelector(".hangsign__rig")) return;          // already marked up
    var src = el.getAttribute("data-hangsign") || "";
    if (src === "" || src === "true") src = HS_DEFAULT_LOGO;
    var alt   = el.getAttribute("data-hangsign-alt") || "";
    var board = el.hasAttribute("data-hangsign-board");

    var beam  = doc.createElement("span"); beam.className = "hangsign__beam"; beam.setAttribute("aria-hidden", "true");
    var pivot = doc.createElement("span"); pivot.className = "hangsign__pivot";
    var rig   = doc.createElement("span"); rig.className = "hangsign__rig";
    var cl    = doc.createElement("i"); cl.className = "hangsign__chain hangsign__chain--l"; cl.setAttribute("aria-hidden", "true");
    var cr    = doc.createElement("i"); cr.className = "hangsign__chain hangsign__chain--r"; cr.setAttribute("aria-hidden", "true");
    var img   = doc.createElement("img");
    img.className = "hangsign__plate";
    img.src = src;
    img.alt = alt;
    if (!alt) img.setAttribute("aria-hidden", "true");
    img.setAttribute("draggable", "false");

    rig.appendChild(cl); rig.appendChild(cr);
    if (board) {
      var b = doc.createElement("span"); b.className = "hangsign__board";
      b.appendChild(img); rig.appendChild(b);
    } else {
      rig.appendChild(img);
    }
    pivot.appendChild(rig);
    el.appendChild(beam);
    el.appendChild(pivot);
  }

  /* Kick a sign into a fresh damped swing. hard = storm-strength throw. */
  function swing(el, hard) {
    if (!el || reduced()) return;
    var rig = el.querySelector(".hangsign__rig");
    if (!rig) return;
    el.classList.remove("is-swinging", "is-swinging--hard");
    /* forced reflow restarts the keyframes cleanly */
    void rig.offsetWidth;
    el.classList.add("is-swinging");
    if (hard) el.classList.add("is-swinging--hard");
  }
  function swingAll(hard) { $$(".hangsign").forEach(function (el) { swing(el, hard); }); }

  function initHangsigns() {
    $$(".hangsign").forEach(function (el) {
      if (el.hasAttribute("data-hangsign")) buildHangsign(el);
      if (el.__moSign) return;
      el.__moSign = true;

      var rig = el.querySelector(".hangsign__rig");
      if (rig) {
        rig.addEventListener("animationend", function (e) {
          if (e.animationName === "hs-swing") el.classList.remove("is-swinging", "is-swinging--hard");
        });
      }
      /* hover / keyboard focus give it a shove */
      el.addEventListener("mouseenter", function () { swing(el, false); });
      el.addEventListener("focusin",    function () { swing(el, false); });
      /* a tap on touch devices, too */
      el.addEventListener("touchstart", function () { swing(el, false); }, { passive: true });
    });
  }


  /* ==========================================================
     2. WAVE DIVIDER  (3 parallax layers of the logo's carved wave)
     ========================================================== */

  /* Seamless sine built from half-period cubics. Total spans an even
     number of periods, so the layer can translate -50% forever. */
  function wavePath(period, amp, mid, total, floorY, phase) {
    var half = period / 2;
    var startX = -period + (phase || 0) * period;
    var dir = -1;                                  // first hump rises
    var d = "M" + r1(startX) + "," + r1(mid);
    var x = startX;
    var guard = 0;
    while (x < total + period && guard++ < 400) {
      var x1 = x + half;
      var c = amp * 1.3 * dir;
      d += "C" + r1(x + period / 6) + "," + r1(mid + c) +
           " " + r1(x1 - period / 6) + "," + r1(mid + c) +
           " " + r1(x1) + "," + r1(mid);
      x = x1;
      dir = -dir;
    }
    d += "L" + r1(x) + "," + floorY + "L" + r1(startX) + "," + floorY + "Z";
    return d;
  }

  function buildWaves(el) {
    if (el.querySelector(".wavedivider__layer")) return;
    var TOTAL = 2880, PERIOD = 720, H = 150, FLOOR = 170;
    var c1 = el.getAttribute("data-wave-back")  || "#14424E";
    var c2 = el.getAttribute("data-wave-mid")   || "#215C6B";   /* --teal    */
    var c3 = el.getAttribute("data-wave-front") || "#3D95A8";   /* --teal-lt */
    var spec = [
      { cls: "wavedivider__layer--1", fill: c3, amp: 30, mid: 52,  phase: 0.00 },
      { cls: "wavedivider__layer--2", fill: c2, amp: 26, mid: 86,  phase: 0.44 },
      { cls: "wavedivider__layer--3", fill: c1, amp: 19, mid: 116, phase: 0.79 }
    ];
    var frag = doc.createDocumentFragment();
    spec.forEach(function (s) {
      var layer = doc.createElement("span");
      layer.className = "wavedivider__layer " + s.cls;
      var sv = svg("0 0 " + TOTAL + " " + H);
      sv.appendChild(path(wavePath(PERIOD, s.amp, s.mid, TOTAL, FLOOR, s.phase), s.fill));
      layer.appendChild(sv);
      frag.appendChild(layer);
    });
    el.appendChild(frag);
  }


  /* ==========================================================
     3. TREELINE  (Douglas fir silhouette, seamless, slow drift)
     ========================================================== */

  function firPath(seed, periodW, baseY, minH, maxH, spacing) {
    var rnd = mulberry32(seed);
    var trees = [];
    var x = -50;
    while (x < periodW + 50) {
      trees.push({
        cx: x,
        w:  36 + rnd() * 34,
        h:  minH + rnd() * (maxH - minH),
        n:  5 + Math.floor(rnd() * 3)
      });
      x += spacing * (0.72 + rnd() * 0.72);
    }
    function one(cx, w, h, n) {
      var pts = [[cx - w, baseY]], i, t, yu, tier = h / n;
      for (i = 0; i < n; i++) {                       // up the left side
        t = (i + 1) / n; yu = baseY - h * t;
        pts.push([cx - w * (1 - t) * 0.5, yu]);
        if (i < n - 1) pts.push([cx - w * (1 - t), yu + tier * 0.32]);
      }
      pts.push([cx, baseY - h - h * 0.07]);           // the spire
      var right = [];
      for (i = 0; i < n; i++) {                       // mirrored right side
        t = (i + 1) / n; yu = baseY - h * t;
        if (i < n - 1) right.push([cx + w * (1 - t), yu + tier * 0.32]);
        right.push([cx + w * (1 - t) * 0.5, yu]);
      }
      right.reverse();
      pts = pts.concat(right);
      pts.push([cx + w, baseY]);
      return "M" + pts.map(function (p) { return r1(p[0]) + "," + r1(p[1]); }).join("L") + "Z";
    }
    var d = "M-60," + baseY + "L" + (periodW * 2 + 60) + "," + baseY +
            "L" + (periodW * 2 + 60) + "," + (baseY + 60) + "L-60," + (baseY + 60) + "Z";
    for (var pass = 0; pass < 2; pass++) {
      var off = pass * periodW;
      for (var k = 0; k < trees.length; k++) {
        d += one(trees[k].cx + off, trees[k].w, trees[k].h, trees[k].n);
      }
    }
    return d;
  }

  function buildTreeline(el) {
    if (el.querySelector(".treeline__layer")) return;
    var PERIOD = 1200, H = 200, BASE = 200;
    var near = el.getAttribute("data-tree-near") || "#254E3D";   /* --pine */
    var far  = el.getAttribute("data-tree-far")  || "#2E5B47";
    var spec = [
      { cls: "treeline__layer--far",  fill: far,  seed: 20240,  minH: 78,  maxH: 132, spacing: 52 },
      { cls: "treeline__layer--near", fill: near, seed: 197601, minH: 104, maxH: 182, spacing: 64 }
    ];
    var frag = doc.createDocumentFragment();
    spec.forEach(function (s) {
      var layer = doc.createElement("span");
      layer.className = "treeline__layer " + s.cls;
      var sv = svg("0 0 " + (PERIOD * 2) + " " + H);
      sv.appendChild(path(firPath(s.seed, PERIOD, BASE, s.minH, s.maxH, s.spacing), s.fill));
      layer.appendChild(sv);
      frag.appendChild(layer);
    });
    el.appendChild(frag);
  }


  /* ==========================================================
     4. BIRDS
     ========================================================== */

  function buildBirds(el) {
    if (el.querySelector(".bird")) return;
    var count = clamp(parseInt(el.getAttribute("data-birds"), 10) || 3, 1, 5);
    var frag = doc.createDocumentFragment();
    for (var i = 1; i <= count; i++) {
      var b = doc.createElement("span");
      b.className = "bird bird--" + i;
      b.setAttribute("aria-hidden", "true");
      var sv = svg("0 0 40 14");
      sv.removeAttribute("preserveAspectRatio");
      var g = doc.createElementNS(SVGNS, "g");
      g.setAttribute("class", "bird__w");
      ["M2 10C7 1.6 13 1.6 19.5 8.6", "M19.5 8.6C26 1.6 32 1.6 38 10"].forEach(function (d) {
        var p = doc.createElementNS(SVGNS, "path");
        p.setAttribute("d", d);
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", "currentColor");
        p.setAttribute("stroke-width", "2");
        p.setAttribute("stroke-linecap", "round");
        g.appendChild(p);
      });
      sv.appendChild(g);
      b.appendChild(sv);
      frag.appendChild(b);
    }
    el.appendChild(frag);
  }


  /* ==========================================================
     5. PARALLAX  —  [data-parallax]  (transform only, one rAF)
     ========================================================== */

  var pItems = [], pTicking = false, pIO = null;

  function collectParallax() {
    if (reduced()) return;
    if (!pIO && "IntersectionObserver" in window) {
      pIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.target.__moP) e.target.__moP.on = e.isIntersecting;
        });
        requestTick();
      }, { rootMargin: "20% 0px 20% 0px" });
    }
    $$("[data-parallax]").forEach(function (el) {
      if (el.__moP) return;
      var speed = num(el.getAttribute("data-parallax"), 0.18);
      if (!speed) speed = 0.18;
      var rec = { el: el, speed: speed, on: !pIO, y: 0 };
      el.__moP = rec;
      pItems.push(rec);
      if (pIO) pIO.observe(el);
    });
  }

  function paintParallax() {
    pTicking = false;
    if (reduced() || !pItems.length) return;
    var vh = window.innerHeight || 800;
    var half = vh / 2;
    var cap = vh * 0.22;
    var i, rec, r, reads = [];
    /* READ pass */
    for (i = 0; i < pItems.length; i++) {
      rec = pItems[i];
      if (!rec.on || !rec.el.isConnected) { reads.push(null); continue; }
      r = rec.el.getBoundingClientRect();
      reads.push(r.height ? ((r.top + r.height / 2) - half) / vh : null);
    }
    /* WRITE pass */
    for (i = 0; i < pItems.length; i++) {
      if (reads[i] === null) continue;
      rec = pItems[i];
      var y = clamp(-reads[i] * rec.speed * vh * 0.42, -cap, cap);
      if (Math.abs(y - rec.y) < 0.25) continue;
      rec.y = y;
      rec.el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0) scale(var(--mo-pscale,1))";
    }
  }

  function requestTick() {
    if (pTicking) return;
    pTicking = true;
    requestAnimationFrame(paintParallax);
  }


  /* ==========================================================
     6. REVEALS  —  safety-net observer + [data-rv-stagger]
     ========================================================== */

  var rIO = null;

  function initReveals() {
    /* Stagger: write transition-delay onto the .rv children of a
       container. Works whether site.js or we add `.in`. */
    $$("[data-rv-stagger]").forEach(function (box) {
      var step = num(box.getAttribute("data-rv-stagger"), 0);
      if (!step) step = num(getComputedStyle(box).getPropertyValue("--mo-rv-step"), 90) || 90;
      var kids = $$(".rv, .mo-rise", box);
      if (!kids.length) {
        kids = Array.prototype.slice.call(box.children);
        kids.forEach(function (k) { k.classList.add("mo-rise"); });
      }
      kids.forEach(function (k, i) {
        if (reduced()) { k.style.transitionDelay = ""; return; }
        k.style.transitionDelay = Math.min(i, 12) * step + "ms";
      });
    });

    /* Safety net: reveal anything not already handled (incl. .mo-rise
       and any .rv added after site.js finished its own pass). */
    var pending = $$(".rv:not(.in), .mo-rise:not(.in)");
    if (!pending.length) return;
    if (reduced() || !("IntersectionObserver" in window)) {
      pending.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    if (!rIO) {
      rIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); rIO.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -60px 0px", threshold: 0.08 });
    }
    pending.forEach(function (e) { rIO.observe(e); });
  }


  /* ==========================================================
     7. COUNT-UP  —  .stat .v · .drive-cell .t · [data-count]
     ========================================================== */

  var COUNT_SEL = ".stat .v, .drive-cell .t, [data-count]";
  var SKIP_ATTR = ["data-todayhours", "data-todayname", "data-boardwhen", "data-no-count"];
  var NUM_RE = /^([^0-9]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

  function parseCount(el) {
    if (el.children.length) return null;                    // leave rich markup alone
    for (var i = 0; i < SKIP_ATTR.length; i++) if (el.hasAttribute(SKIP_ATTR[i])) return null;
    var txt = (el.textContent || "").trim();
    if (!txt || /[–—]|\s-\s|\bto\b/i.test(txt)) return null; // ranges like "6am – 7pm"
    var m = NUM_RE.exec(txt);
    if (!m) return null;
    var raw = m[2];
    var target = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(target)) return null;
    var dot = raw.indexOf(".");
    return {
      el: el,
      prefix: m[1],
      suffix: m[3],
      target: target,
      dec: dot === -1 ? 0 : raw.length - dot - 1,
      group: raw.indexOf(",") !== -1,
      original: txt
    };
  }

  function fmtCount(v, c) {
    var s = c.dec ? v.toFixed(c.dec) : String(Math.round(v));
    if (c.group) {
      var parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = parts.join(".");
    }
    return c.prefix + s + c.suffix;
  }

  function runCount(c) {
    if (c.done) return;
    c.done = true;
    if (reduced() || c.target === 0) { c.el.textContent = c.original; return; }
    var dur = 1150 + Math.min(650, c.target * 1.6);
    var t0 = 0;
    c.el.classList.add("mo-counting");
    function step(ts) {
      if (!t0) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      c.el.textContent = fmtCount(c.target * easeOutCubic(p), c);
      if (p < 1) requestAnimationFrame(step);
      else c.el.textContent = c.original;                   // exact original string wins
    }
    c.el.textContent = fmtCount(0, c);
    requestAnimationFrame(step);
  }

  function initCounts() {
    var list = [];
    $$(COUNT_SEL).forEach(function (el) {
      if (el.__moC) return;
      var c = parseCount(el);
      if (!c) return;
      el.__moC = c;
      list.push(c);
    });
    if (!list.length) return;
    if (reduced() || !("IntersectionObserver" in window)) return;   // leave text as authored
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.__moC) runCount(e.target.__moC);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.35 });
    list.forEach(function (c) { io.observe(c.el); });
  }


  /* ==========================================================
     8. STORM HOOKS
     ========================================================== */

  function stormOn() {
    return root.getAttribute("data-storm") === "on" ||
           root.classList.contains("storm-on") ||
           (doc.body && doc.body.classList.contains("storm-on"));
  }

  function watchStorm() {
    var was = stormOn();
    var mo = new MutationObserver(function () {
      var now = stormOn();
      if (now === was) return;
      was = now;
      if (now) swingAll(true);                               // the gust hits
      else swingAll(false);                                  // it settles
    });
    mo.observe(root, { attributes: true, attributeFilter: ["data-storm", "class"] });
    if (doc.body) mo.observe(doc.body, { attributes: true, attributeFilter: ["class"] });
  }


  /* ==========================================================
     9. BOOT
     ========================================================== */

  function buildAll() {
    $$(".wavedivider").forEach(buildWaves);
    $$(".treeline").forEach(buildTreeline);
    $$(".birds").forEach(buildBirds);
    initHangsigns();
  }

  function refresh() {
    buildAll();
    initReveals();
    initCounts();
    collectParallax();
    requestTick();
  }

  function init() {
    buildAll();
    initReveals();
    initCounts();

    if (!reduced()) {
      collectParallax();
      window.addEventListener("scroll", requestTick, { passive: true });
      window.addEventListener("resize", requestTick, { passive: true });
      window.addEventListener("orientationchange", requestTick, { passive: true });
      requestTick();
    }

    watchStorm();

    /* If the user flips reduced-motion mid-session, drop everything. */
    if (rmq && rmq.addEventListener) {
      rmq.addEventListener("change", function () {
        if (reduced()) {
          pItems.forEach(function (r) { r.el.style.transform = ""; });
          $$(".hangsign").forEach(function (el) { el.classList.remove("is-swinging", "is-swinging--hard"); });
        } else {
          refresh();
        }
      });
    }
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();

  return {
    swing: swing,
    swingAll: swingAll,
    buildHangsign: buildHangsign,
    buildWaves: buildWaves,
    buildTreeline: buildTreeline,
    buildBirds: buildBirds,
    refresh: refresh,
    reduced: reduced
  };
})();

if (typeof window !== "undefined") window.TRMotion = TRMotion;
