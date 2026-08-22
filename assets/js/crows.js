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
  var SIT     = [12, 28];
  /* THE TAKE-OFF IS FOUR FRAMES, NOT ONE.
     Frames 29-31 are the wind-up — measured, the silhouette goes
     60x79 -> 67x71 -> 75x65 and the centroid drops from 0.45 to
     0.51, which is a bird crouching to spring. 32 is the launch,
     wings out, centroid up at 0.20.

     They used to be inside the SIT band, played at ~250ms a frame
     along with the head turns, and then frame 32 appeared out of
     nowhere. So the bird sat perfectly still and then was suddenly
     wings-out in one jump — that is the snap at take-off. They run
     as their own band now at roughly the rate they were filmed,
     about 57ms a frame, so the crouch reads as a crouch.

     Frame 33 is deliberately excluded: the bird is already half out
     of the cell there, and cross-fading out of a cropped bird is a
     cut, not a transition. */
  var TAKEOFF = [29, 32];

  var FLY_FRAMES = 25;
  var FLAP_MS = 400;            /* same working beat as the flock */
  var FEET  = 0.74;             /* where the feet sit in the perch cell */
  var RATIO = 190 / 147;        /* perch cell aspect */

  var MS = { approach: 2400, land: 560, sit: 5000, takeoff: 230, depart: 2600 };
  var BLEND = 200;              /* cross-fade at each sheet swap */
  /* The flock cruises at 3.2 body lengths a second (see the flock
     block above). A bird leaving a perch is a little brisker than
     cruising, but only a little — anything more reads as a
     catapult, which is exactly what the old number did. */
  var OUT_BODY_PER_SEC = 5.0;
  /* how long it takes to get up to that speed - a few wingbeats */
  var ACCEL_MS = 420;
  /* everything up to the moment it leaves. The exit itself is
     timed per run, from the width of the screen and the bird's
     own speed, so MS.depart is only a floor. */
  var UPTO = MS.approach + MS.land + MS.sit + MS.takeoff;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }        /* easeOutCubic */

  function band(range, p) {
    var n = range[1] - range[0] + 1;
    return range[0] + Math.min(n - 1, Math.floor(Math.max(0, p) * n));
  }

  /* Land it on the crossbar of the T in "Twisted".
     MEASURED off logo-head.png rather than guessed: scanning the
     carved (dark, opaque) pixels row by row, the crossbar reaches
     its full width at y = 0.237 of the plate height and runs from
     x = 0.218 to x = 0.595, so its middle is x = 0.407.

     It used to sit at 0.62/0.16, which is the bare wooden shoulder
     above the lettering — a bird standing on nothing in particular.
     The top of a letter is something to stand on. */
  function place(el, plate, h) {
    var r = plate.getBoundingClientRect();
    var PERCH_X = 0.40, PERCH_Y = 0.237;

    var landX = r.left + r.width * PERCH_X;
    var landY = r.top + r.height * PERCH_Y;

    /* A bird needs room above whatever it stands on. Size it to
       the headroom that actually exists rather than assuming. */
    var headroom = landY - 4;
    if (headroom < h * FEET) h = Math.max(22, headroom / FEET);

    var w = Math.round(h * RATIO);
    el.style.width  = w + "px";
    el.style.height = Math.round(h) + "px";
    /* The element is position:fixed, so no window.scrollY term. Two
       reasons it has to be fixed. The header is sticky on desktop and
       fixed on mobile, so the sign never leaves the top of the
       viewport and an absolutely-positioned bird would slide off it
       the moment the page moved. And an absolute element translated
       hundreds of pixels sideways enlarges the document's scrollable
       area — on a phone that briefly widened the page and shoved the
       centred logo to the right and back as the crow set off. */
    el.style.left = Math.round(landX - w * 0.5) + "px";
    el.style.top  = Math.round(landY - h * FEET) + "px";
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
      /* The bird is in a completely different place and size at each
         end of the performance, so ONE flying geometry cannot match
         both. Arriving it has to match perch frame 02; leaving, it
         has to match frame 33 — which is why the take-off still
         jumped after the landing was fixed. Both measured off the
         sheet the same way. */
      var P_IN  = { span: 0.516, cx: 0.112, cy: 0.340 };   /* perch f02 */
      var P_OUT = { span: 0.684, cx: 0.597, cy: 0.200 };   /* perch f32 */

      /* On the way OUT the handover is pinned to one specific flying
         frame instead of whatever the free-running flap clock happens
         to be showing. Frame 11 is the closest match to perch f32's
         silhouette — aspect 1.156 against 1.354, the nearest of the
         25 — so the two poses very nearly coincide and the fade has
         almost nothing to hide. Its own metrics are used for the
         match rather than the sheet average. */
      var OUT_FRAME = 11;
      var FLY_OUT = { span: 0.969, cx: 0.459, cy: 0.434 };

      function flyGeom(m, fm) {
        fm = fm || { span: FLY_SPAN, cx: FLY_CX, cy: FLY_CY };
        var w = Math.round(g.w * m.span / fm.span);
        var h2 = Math.round(w * 80 / 104);
        return { w: w, h: h2,
                 left: Math.round(g.w * m.cx - w * fm.cx),
                 top:  Math.round(g.h * m.cy - h2 * fm.cy) };
      }
      var GIN = flyGeom(P_IN), GOUT = flyGeom(P_OUT, FLY_OUT);
      var fw = GIN.w, fh = GIN.h, applied = null;

      function useGeom(gm) {
        if (applied === gm) return;
        applied = gm; fw = gm.w; fh = gm.h;
        fly.style.width  = gm.w + "px";
        fly.style.height = gm.h + "px";
        fly.style.backgroundSize = (gm.w * FLY_FRAMES) + "px 100%";
        fly.style.left = gm.left + "px";
        fly.style.top  = gm.top + "px";
      }
      useGeom(GIN);

      sit.style.backgroundSize = (g.w * SHEET) + "px 100%";

      var hero = document.querySelector(".hero");
      var hr = hero ? hero.getBoundingClientRect()
                    : { top: 0, height: window.innerHeight };

      /* It starts out over the middle of the hero, at the altitude
         the flock uses, and finishes just left of the sign — which
         is where the perch sheet's own first frames pick it up, so
         the handover between the two sheets is not a jump. It is
         also clamped inside the viewport, so a fixed element being
         translated cannot reach past the right edge. */
      var startX = Math.min(g.x + Math.max(260, window.innerWidth * 0.36),
                            window.innerWidth - fw - 8);
      var startY = hr.top + hr.height * 0.24;
      var endX   = g.x - g.w * 0.33;
      var endY   = g.y - g.h * 0.09;

      /* Where it goes, and therefore how long it takes. Both are
         derived rather than fixed: the bird has to reach past the
         right edge, it has to come back down to the flock's band on
         the way, and it has to do the whole thing at the same body
         lengths per second as everything else in the sky. A fixed
         duration would have made it fast on a wide screen and slow
         on a narrow one. */
      var flockY = hr.top + hr.height * 0.16;
      var exitDx = window.innerWidth - g.x + fw + 24;
      var exitDy = Math.max(0, flockY - g.y);
      var pathLen = Math.sqrt(exitDx * exitDx + exitDy * exitDy);

      /* The push-off is a FIXED length of time, not a fraction of the
         flight. It used to be 40% of the whole exit — and because the
         exit is sized from the width of the screen, that worked out at
         three and a half seconds of acceleration, so the bird crept
         forward 3px in its first third of a second and read as stuck
         to the sign. A bird gets up to speed in a few wingbeats
         whether it is crossing a yard or a valley. */
      var outV = OUT_BODY_PER_SEC * fw;              /* px per second */
      var departMs = Math.round(1000 * pathLen / outV + ACCEL_MS / 2);
      /* a floor only - the duration is the screen divided by the speed,
         and the speed is the thing that must not change */
      departMs = Math.max(1600, departMs);
      var TOTAL = UPTO + departMs;

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
        } else if (t < UPTO) {
          phase = "sit"; dx = 0; dy = 0;
          idx = band(TAKEOFF, (t - MS.approach - MS.land - MS.sit) / MS.takeoff);
        } else {
          /* LEAVING.
             This used to be a straight linear ramp across 55% of the
             window in 1.7s — about 450 px/s for a bird drawn 34px
             wide, which is four times the speed the flock flies at
             and is why it shot off the sign.

             Two things wrong with a linear ramp anyway: it starts at
             full speed, so the bird goes from perfectly still to
             cruising between one frame and the next, and the speed
             itself was a made-up fraction of the viewport rather
             than anything to do with the bird.

             So it uses the same measure as the flock — body lengths
             per second, off the rendered cell width — and integrates
             a velocity that ramps up from rest over the first 40% of
             the phase. A shade brisker than cruise, because a bird
             leaving a perch is going somewhere. */
          /* It used to climb away off the top of the screen. A crow
             leaving a sign drops back to the height it was flying at
             and carries on across — so it rejoins the flock's own sky
             band and leaves to the right, the way the others do.
             There is still a small pop upward off the push-off,
             because that is what wings do. */
          phase = "fly";
          var tau = t - UPTO;                    /* ms since it let go */
          /* distance covered: velocity ramps 0 -> outV over ACCEL_MS,
             then holds. Integrated, not eased by feel. */
          var gone = tau < ACCEL_MS
            ? outV * tau * tau / (2 * ACCEL_MS * 1000)
            : outV * (tau - ACCEL_MS / 2) / 1000;
          var far = Math.min(1, gone / pathLen);

          dx = far * exitDx;
          dy = far * exitDy
               - Math.sin(Math.PI * Math.min(1, far / 0.35)) * g.h * 0.45;
          idx = TAKEOFF[1];
        }

        el.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";

        /* Both sheets stay in the DOM through the swap and cross-fade
           over BLEND ms. Matching the geometry gets it most of the
           way; the blend covers the wing pose, which cannot match
           because the two takes were shot separately. */
        var IN = MS.approach, OUT = UPTO;
        var flyA = 1, sitA = 0;
        if (t < IN - BLEND)      { flyA = 1; sitA = 0; }
        else if (t < IN)         { sitA = (t - (IN - BLEND)) / BLEND; flyA = 1 - sitA; }
        else if (t < OUT)        { flyA = 0; sitA = 1; }
        else if (t < OUT + BLEND){ flyA = (t - OUT) / BLEND; sitA = 1 - flyA; }
        else                     { flyA = 1; sitA = 0; }

        /* OPACITY ONLY — never display:none mid-performance.
           Toggling display throws the sprite's compositing layer
           away and forces the browser to re-raster a 190KB sheet on
           the very frame the bird changes phase. That is the hitch
           at take-off on desktop, and on a phone it is enough to
           drop frames outright. Both children stay painted for the
           whole run and simply fade past each other. */
        fly.style.opacity = flyA.toFixed(3);
        sit.style.opacity = sitA.toFixed(3);

        if (flyA > 0) {
          useGeom(t < IN ? GIN : GOUT);
          fly.style.transform = mirror || t < IN ? "scaleX(-1)" : "none";
          /* A bird climbing off a perch beats harder than one already
             up and cruising, and settles back over the first second. */
          var beat = FLAP_MS;
          if (t >= OUT) {
            var into = Math.min(1, (t - OUT) / 1000);
            beat = 330 + (FLAP_MS - 330) * into;
          }
          /* leaving, the loop starts on the frame the handover was
             matched to, so the first flying pose is the one that
             lines up with the perched sprite */
          var fIdx = t < IN
            ? Math.floor(t / beat * FLY_FRAMES) % FLY_FRAMES
            : (OUT_FRAME + Math.floor((t - OUT) / beat * FLY_FRAMES)) % FLY_FRAMES;
          fly.style.backgroundPositionX = (-fIdx * fw) + "px";
        }
        if (sitA > 0) {
          /* Holding the right frame while the sheets cross-fade.
             Arriving, the perch sheet holds its FIRST frame so the two
             birds are in the same place at the same size. Leaving, it
             has to hold its LAST — this said LAND[0] either way, so on
             the way out the bird snapped back into its landing pose for
             the 200ms of the fade before vanishing. That was the
             take-off twitch. */
          var sIdx = phase === "sit" ? idx : (t < IN ? LAND[0] : TAKEOFF[1]);
          sit.style.backgroundPositionX = (-sIdx * g.w) + "px";
        }

        /* Fade on as it arrives, and fade out over the last third of
           the exit rather than in the final 420ms. It should thin out
           into the distance the way the flock does, not blink off at
           the edge of the screen. */
        var op = 1;
        if (t < 260) op = t / 260;
        else if (t >= UPTO) {
          var fd = (t - UPTO) / departMs;
          if (fd > 0.70) op = Math.max(0, 1 - (fd - 0.70) / 0.26);
        }
        el.style.opacity = op.toFixed(3);

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
      fly.style.display = "block";
      sit.style.display = "block";
      fly.style.opacity = "0";
      sit.style.opacity = "0";
      rafId = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () {
      h = window.innerWidth < 900 ? 30 : 40;
    }, { passive: true });

    /* Decode both sheets while nothing is happening. Otherwise the
       first frame of the first flight pays for decoding them, which
       is exactly the wrong moment. */
    function warm() {
      /* Resolve the image paths off a stylesheet link rather than
         guessing the depth: blog and recipe pages sit one level down,
         and a wrong prefix would silently 404 and warm nothing. */
      var link = document.querySelector('link[rel="stylesheet"][href*="assets/css/"]');
      var base = link ? link.getAttribute("href").replace(/assets\/css\/.*$/, "") : "";
      ["assets/img/crow-perch.webp", "assets/img/crow-sprite.webp"].forEach(function (src) {
        var i = new Image();
        i.src = base + src;
        if (i.decode) i.decode().catch(function () {});
      });
    }
    if (window.requestIdleCallback) requestIdleCallback(warm); else setTimeout(warm, 900);

    setTimeout(run, 4200);          /* first visit */
    setInterval(run, 165000);       /* now and then */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
