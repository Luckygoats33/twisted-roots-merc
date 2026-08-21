/* ==========================================================
   TWISTED ROOTS MERC — THE SHOP PAGE
   ----------------------------------------------------------
   One page that shows the whole shelf and lets somebody cut it
   down to the six things they actually drove over for.

   It owns nothing that already exists. The basket is cart.js,
   the stock language is site.js, the styling is site.css. This
   file only decides WHICH items are on screen and in what order,
   then hands the result to those three.

   Three rules it keeps:
     1. Filters AND across types, OR within a type. Pick two
        departments and you get both; add a price band and you
        get both departments inside that band.
     2. The URL is the state. Every search, chip and sort lands
        in the query string, so a filtered shelf can be texted
        to somebody and the back button walks back through it.
     3. One innerHTML write per render. 260 cards built one
        node at a time is how a page starts to feel cheap.
   ========================================================== */

(function () {
  "use strict";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  };
  var money = function (n) { return "$" + n.toFixed(2); };

  /* Same normalisation site.js uses, so a search here and a search
     on the Merc page agree with each other. */
  var norm = function (s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9½¼¾⅝×"' ]/g, " ")
      .replace(/\s+/g, " ").trim();
  };

  /* ==========================================================
     1. THE SHELF
     TR_CATALOG is the hard goods. TR_BAKERY is the kitchen and
     the bakery rack, which is a different shape and — this is the
     important part — is NOT in TR_CATALOG, so the basket cannot
     hold it. Kitchen items therefore get an order link instead of
     an Add button rather than a button that quietly does nothing.
     ========================================================== */

  var BAKERY_ROOM = {
    bakery:    { a:"Bakery rack",      t:["bakery","pastry","baked","rack"] },
    breakfast: { a:"The kitchen",      t:["breakfast","kitchen","hot food","eggs"] },
    lunch:     { a:"The kitchen",      t:["lunch","sandwich","kitchen","hot food"] },
    coffee:    { a:"Coffee bar",       t:["coffee","drink","espresso","hot drink"] },
    grab:      { a:"Grab & go cooler", t:["grab and go","quick","to go","cooler"] }
  };

  var ITEMS = [];

  function buildShelf() {
    var i;
    for (i = 0; i < TR_CATALOG.length; i++) {
      var c = TR_CATALOG[i];
      ITEMS.push({
        id: c.id, n: c.n, d: c.d, p: c.p, q: c.q,
        min: c.min, stormMin: c.stormMin, a: c.a,
        t: c.t || [], maker: c.maker || "",
        kind: "goods", ord: ITEMS.length
      });
    }
    if (typeof TR_BAKERY === "undefined") return;
    for (i = 0; i < TR_BAKERY.length; i++) {
      var b = TR_BAKERY[i];
      var room = BAKERY_ROOM[b.cat] || { a:"The kitchen", t:[] };
      ITEMS.push({
        id: b.id, n: b.n, d: "bakery", p: b.p, q: b.q,
        min: 0, stormMin: 0, a: room.a,
        t: room.t.concat([b.cat]), maker: "",
        kind: "kitchen", ord: ITEMS.length
      });
    }
  }

  /* ==========================================================
     2. FACETS
     ========================================================== */

  var DEPT_ORDER = ["everyday","fixit","yard","storm","outdoors","hunt","local","bakery"];

  var PRICE_BANDS = [
    { k:"u10",   label:"Under $10", test:function(p){ return p <  10; } },
    { k:"10-25", label:"$10 – $25", test:function(p){ return p >= 10 && p < 25; } },
    { k:"25-50", label:"$25 – $50", test:function(p){ return p >= 25 && p < 50; } },
    { k:"50up",  label:"$50 and up",test:function(p){ return p >= 50; } }
  ];

  /* Where a thing physically lives, grouped the way somebody
     walking the store would group it — not one chip per aisle. */
  var LOCATIONS = [
    { k:"aisles",  label:"Aisles 1–6",    test:function(it){ return /^Aisle /.test(it.a); } },
    { k:"fixit",   label:"Fix It wall",   test:function(it){ return /^Fix It /.test(it.a); } },
    { k:"hunt",    label:"Hunt wall",     test:function(it){ return it.a === "Hunt Wall"; } },
    { k:"counter", label:"Front counter", test:function(it){ return it.a === "Front Counter"; } },
    { k:"behind",  label:"Behind the counter", test:function(it){ return it.a === "Behind Counter"; } },
    { k:"storm",   label:"Storm wall",    test:function(it){ return it.a === "Storm Wall"; } },
    { k:"outdoor", label:"Outdoors corner", test:function(it){ return it.a === "Outdoors"; } },
    { k:"cooler",  label:"Cooler &amp; ice", test:function(it){ return it.a === "Cooler" || it.a === "Ice Chest"; } },
    { k:"local",   label:"Local shelf",   test:function(it){ return it.a === "Local Shelf"; } },
    { k:"yard",    label:"Out back",      test:function(it){ return /^Rack |^Dry Shed$|^Out Back$/.test(it.a); } },
    { k:"front",   label:"Out front",     test:function(it){ return it.a === "Out Front"; } },
    { k:"kitchen", label:"Bakery counter",test:function(it){ return it.kind === "kitchen"; } }
  ];

  function locOf(it) {
    for (var i = 0; i < LOCATIONS.length; i++) if (LOCATIONS[i].test(it)) return LOCATIONS[i].k;
    return "";
  }
  function bandOf(p) {
    for (var i = 0; i < PRICE_BANDS.length; i++) if (PRICE_BANDS[i].test(p)) return PRICE_BANDS[i].k;
    return "";
  }

  /* ==========================================================
     3. STOCK
     site.js owns the language for hard goods so the chips read the
     same here as they do on every other page. The kitchen is the
     one exception: a sandwich is not "in stock", it is made when
     you ask for it.
     ========================================================== */

  function stockOf(it) {
    if (it.q <= 0) return "out";
    if (it.kind === "kitchen") return it.q <= 4 ? "low" : "in";
    return TR.stockState(it);
  }
  function stockText(it) {
    if (it.q <= 0) return it.kind === "kitchen" ? "Sold out today" : "Out of stock";
    if (it.kind === "kitchen") return it.q >= 99 ? "Made to order" : it.q + " left today";
    return TR.stockLabel(it);
  }

  /* ==========================================================
     4. SEARCH
     Scored the same way site.js scores it — name, then tags, then
     department — but over the whole shelf and with no cap, because
     this page is where you go to see all of it.
     ========================================================== */

  var NAME_CACHE = null;
  function cacheNames() {
    NAME_CACHE = ITEMS.map(function (it) {
      return {
        name: norm(it.n),
        tags: it.t.map(norm),
        dept: norm(TR_DEPTS[it.d].name),
        maker: norm(it.maker || "")
      };
    });
  }

  function score(qRaw) {
    var q = norm(qRaw);
    var out = { hit:null, best:0 };
    if (!q) return out;
    var words = q.split(" ").filter(Boolean);
    var hit = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var c = NAME_CACHE[i], s = 0, j;
      if (c.name === q) s += 120;
      if (c.name.indexOf(q) === 0) s += 60;
      if (c.name.indexOf(q) > -1) s += 40;
      for (j = 0; j < c.tags.length; j++) {
        var t = c.tags[j];
        if (t === q) s += 90;
        else if (t.indexOf(q) === 0 || q.indexOf(t) === 0) s += 45;
        else if (t.indexOf(q) > -1) s += 25;
      }
      if (c.dept.indexOf(q) > -1) s += 18;
      if (c.maker && c.maker.indexOf(q) > -1) s += 30;
      for (j = 0; j < words.length; j++) {
        var w = words[j];
        if (w.length < 2) continue;
        if (c.name.indexOf(w) > -1) s += 14;
        for (var k = 0; k < c.tags.length; k++) { if (c.tags[k].indexOf(w) > -1) { s += 12; break; } }
      }
      if (s > 0) {
        if (ITEMS[i].q <= 0) s -= 25;
        else s += 4;
        hit[ITEMS[i].id] = s;
      }
    }
    out.hit = hit;
    return out;
  }

  /* ==========================================================
     5. STATE, WHICH IS THE URL
     ========================================================== */

  var S = { q:"", dept:[], price:[], loc:[], stock:false, sort:"relevance" };
  var SORTS = ["relevance","name-asc","price-asc","price-desc","qty-desc"];

  function readURL() {
    var p = new URLSearchParams(location.search);
    var list = function (key, valid) {
      var raw = (p.get(key) || "").split(",").map(function (x) { return x.trim(); });
      return raw.filter(function (x) { return x && valid.indexOf(x) > -1; });
    };
    S.q     = (p.get("q") || "").slice(0, 80);
    S.dept  = list("dept", DEPT_ORDER);
    S.price = list("price", PRICE_BANDS.map(function (b) { return b.k; }));
    S.loc   = list("loc", LOCATIONS.map(function (l) { return l.k; }));
    S.stock = p.get("stock") === "in";
    S.sort  = SORTS.indexOf(p.get("sort")) > -1 ? p.get("sort") : "relevance";
  }

  function toQuery() {
    var p = new URLSearchParams();
    if (S.q) p.set("q", S.q);
    if (S.dept.length)  p.set("dept", S.dept.join(","));
    if (S.price.length) p.set("price", S.price.join(","));
    if (S.loc.length)   p.set("loc", S.loc.join(","));
    if (S.stock)        p.set("stock", "in");
    if (S.sort !== "relevance") p.set("sort", S.sort);
    var s = p.toString();
    return s ? "?" + s : location.pathname.split("/").pop() || "shop.html";
  }

  function writeURL(push) {
    var url = toQuery();
    try {
      if (push) history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    } catch (e) { /* file:// — the page still works, the link just won't */ }
  }

  function isFiltered() {
    return !!(S.q || S.dept.length || S.price.length || S.loc.length || S.stock || S.sort !== "relevance");
  }

  /* ==========================================================
     6. FILTER + SORT
     AND across the four filter types, OR inside each one.
     ========================================================== */

  var LAST = { hit:null, results:[], counts:null };

  function evaluate() {
    var sc = score(S.q);
    var hit = sc.hit;
    var rows = [];
    for (var i = 0; i < ITEMS.length; i++) {
      var it = ITEMS[i];
      rows.push({
        it: it,
        s: hit ? (hit[it.id] || 0) : 0,
        mQ: hit ? Object.prototype.hasOwnProperty.call(hit, it.id) : true,
        mD: !S.dept.length  || S.dept.indexOf(it.d) > -1,
        mP: !S.price.length || S.price.indexOf(bandOf(it.p)) > -1,
        mL: !S.loc.length   || S.loc.indexOf(locOf(it)) > -1,
        mS: !S.stock        || it.q > 0
      });
    }

    /* Facet counts ignore their own filter, so a chip tells you how
       many you would get if you pressed it — not how many you have
       already excluded by pressing it. */
    var counts = { dept:{}, price:{}, loc:{}, stock:0, total:0 };
    var results = [];
    for (var r = 0; r < rows.length; r++) {
      var x = rows[r], it2 = x.it;
      if (x.mQ && x.mP && x.mL && x.mS) counts.dept[it2.d] = (counts.dept[it2.d] || 0) + 1;
      if (x.mQ && x.mD && x.mL && x.mS) { var b = bandOf(it2.p); counts.price[b] = (counts.price[b] || 0) + 1; }
      if (x.mQ && x.mD && x.mP && x.mS) { var l = locOf(it2); counts.loc[l] = (counts.loc[l] || 0) + 1; }
      if (x.mQ && x.mD && x.mP && x.mL && it2.q > 0) counts.stock++;
      if (x.mQ && x.mD && x.mP && x.mL && x.mS) results.push(x);
    }
    counts.total = results.length;

    var by = S.sort;
    results.sort(function (a, b2) {
      if (by === "name-asc")   return a.it.n.localeCompare(b2.it.n);
      if (by === "price-asc")  return a.it.p - b2.it.p || a.it.n.localeCompare(b2.it.n);
      if (by === "price-desc") return b2.it.p - a.it.p || a.it.n.localeCompare(b2.it.n);
      if (by === "qty-desc")   return b2.it.q - a.it.q || a.it.n.localeCompare(b2.it.n);
      /* relevance: score when there is a query, shelf order when not */
      if (S.q) return b2.s - a.s || a.it.n.localeCompare(b2.it.n);
      return a.it.ord - b2.it.ord;
    });

    LAST.hit = hit; LAST.results = results; LAST.counts = counts;
    return { results:results, counts:counts };
  }

  /* ==========================================================
     7. DRAWING IT
     ========================================================== */

  var PAGE = 96;               /* measured, see SHOP-NOTES.md */
  var shown = PAGE;

  function card(it) {
    var st = stockOf(it);
    var can = it.q > 0;
    var act;
    if (!can) {
      act = '<button type="button" class="btn btn--sm btn--ghost prodcard__btn" data-tellus="' +
            esc(it.n) + '">Tell us</button>';
    } else if (it.kind === "kitchen") {
      act = '<a class="btn btn--sm btn--ghost prodcard__btn" href="bakery.html#order">Order it</a>';
    } else {
      act = '<button type="button" class="btn btn--sm btn--amber btn--add prodcard__btn' +
            (TRCart.has(it.id) ? " in-cart" : "") + '" data-add="' + it.id +
            '" aria-label="Add ' + esc(it.n) + ' to the basket">Add</button>';
    }
    return '<article class="card prodcard">' +
      '<div class="prodcard__top">' +
        '<span class="prodcard__dept">' + esc(TR_DEPTS[it.d].name) + '</span>' +
        '<span class="stk stk--' + st + '">' + esc(stockText(it)) + '</span>' +
      '</div>' +
      '<h3 class="prodcard__nm">' + esc(it.n) + '</h3>' +
      '<p class="prodcard__mt">' + esc(it.a) + (it.maker ? ' · ' + esc(it.maker) : '') + '</p>' +
      '<div class="prodcard__foot">' +
        '<span class="prodcard__pr">' + money(it.p) + '</span>' + act +
      '</div>' +
    '</article>';
  }

  function emptyState() {
    var tell = S.q ? esc(S.q) : "true";
    return '<div class="shopempty">' +
      '<p class="eyebrow">Not on the shelf</p>' +
      '<h2 class="h2">' + (S.q
        ? 'Nothing here for &ldquo;' + esc(S.q) + '&rdquo;'
        : 'Nothing left once you filter it that hard') + '</h2>' +
      '<p class="lede">' + (S.q
        ? 'Either we do not carry it, or it is filed under a name nobody uses. Loosen a filter and look again — ' +
          'or tell Carrie and Eric, because enough neighbours asking is how things end up on the shelf.'
        : 'That combination does not exist out there. Drop a filter and it will come back.') + '</p>' +
      '<div class="btnrow">' +
        '<button type="button" class="btn btn--amber" data-tellus="' + tell + '">Tell us what to carry</button>' +
        '<button type="button" class="btn btn--ghost" data-shopreset>Start over</button>' +
      '</div>' +
    '</div>';
  }

  function countLine(n, total) {
    if (!isFiltered()) return n + " things on the shelf, all of them in this list.";
    var bits = [];
    if (S.q) bits.push("matching &ldquo;" + esc(S.q) + "&rdquo;");
    if (S.dept.length) bits.push("in " + S.dept.map(function (d) { return esc(TR_DEPTS[d].name); }).join(" or "));
    if (S.stock) bits.push("on the shelf now");
    var tail = bits.length ? " " + bits.join(", ") : "";
    if (n === 0) return "Nothing" + tail + ".";
    if (n === 1) return "One thing" + tail + ".";
    return n + " things" + tail + " · out of " + total + ".";
  }

  var grid, more, moreWrap, countEl, resetEl;
  var lastRenderMs = 0;

  function render() {
    var t0 = performance.now();
    var out = evaluate();
    var res = out.results;

    paintChips(out.counts);

    if (!res.length) {
      grid.className = "shopgrid shopgrid--empty";
      grid.innerHTML = emptyState();
      moreWrap.hidden = true;
    } else {
      grid.className = "shopgrid";
      var take = Math.min(shown, res.length);
      var html = new Array(take);
      for (var i = 0; i < take; i++) html[i] = card(res[i].it);
      grid.innerHTML = html.join("");
      moreWrap.hidden = take >= res.length;
      if (!moreWrap.hidden) {
        $("[data-shopmorebtn]").textContent = "Show " + Math.min(PAGE, res.length - take) + " more";
      }
    }

    countEl.innerHTML = countLine(res.length, ITEMS.length);
    resetEl.hidden = !isFiltered();

    /* "Best match" only means anything while there is something to
       match against. The rest of the time it is just shelf order. */
    var relOpt = $('#shopSort option[value="relevance"]');
    if (relOpt) relOpt.textContent = S.q ? "Best match" : "The way the shelf runs";

    lastRenderMs = performance.now() - t0;
    window.TRShop.lastRenderMs = lastRenderMs;
    window.TRShop.lastCount = res.length;
  }

  /* ---------- the chips ---------- */

  function chipHTML(key, label, on, n, attr) {
    return '<button type="button" class="chip' + (on ? " is-on" : "") + (n === 0 ? " is-zero" : "") +
      '" ' + attr + '="' + key + '" aria-pressed="' + (on ? "true" : "false") + '">' +
      label + ' <b class="chip__n">' + n + '</b></button>';
  }

  function buildChips() {
    $("[data-deptchips]").innerHTML =
      '<button type="button" class="chip chip--all" data-deptall aria-pressed="true">Everything</button>' +
      DEPT_ORDER.map(function (d) {
        return chipHTML(d, esc(TR_DEPTS[d].name), false, 0, "data-dept");
      }).join("");
    $("[data-pricechips]").innerHTML = PRICE_BANDS.map(function (b) {
      return chipHTML(b.k, b.label, false, 0, "data-price");
    }).join("");
    $("[data-locchips]").innerHTML = LOCATIONS.map(function (l) {
      return chipHTML(l.k, l.label, false, 0, "data-loc");
    }).join("");
  }

  function paintOne(el, on, n) {
    el.classList.toggle("is-on", on);
    el.classList.toggle("is-zero", n === 0 && !on);
    el.setAttribute("aria-pressed", on ? "true" : "false");
    var b = el.querySelector(".chip__n");
    if (b) b.textContent = n;
  }

  function paintChips(counts) {
    $$("[data-dept]").forEach(function (el) {
      var k = el.dataset.dept;
      paintOne(el, S.dept.indexOf(k) > -1, counts.dept[k] || 0);
    });
    $$("[data-price]").forEach(function (el) {
      var k = el.dataset.price;
      paintOne(el, S.price.indexOf(k) > -1, counts.price[k] || 0);
    });
    $$("[data-loc]").forEach(function (el) {
      var k = el.dataset.loc;
      paintOne(el, S.loc.indexOf(k) > -1, counts.loc[k] || 0);
    });
    var all = $("[data-deptall]");
    if (all) {
      all.classList.toggle("is-on", S.dept.length === 0);
      all.setAttribute("aria-pressed", S.dept.length === 0 ? "true" : "false");
    }
    var sc = $("[data-stockchip]");
    if (sc) {
      sc.classList.toggle("is-on", S.stock);
      sc.setAttribute("aria-pressed", S.stock ? "true" : "false");
      $("[data-stockn]").textContent = counts.stock;
    }
  }

  /* ---------- controls follow the state, not the other way round ---------- */
  function syncControls() {
    var input = $("#shopSearch");
    if (input && input.value !== S.q) input.value = S.q;
    var sel = $("[data-shopsort]");
    if (sel && sel.value !== S.sort) sel.value = S.sort;
  }

  /* ==========================================================
     8. WIRING
     ========================================================== */

  function toggle(arr, k) {
    var i = arr.indexOf(k);
    if (i > -1) arr.splice(i, 1); else arr.push(k);
  }

  function change(push) {
    shown = PAGE;
    writeURL(push !== false);
    render();
  }

  function init() {
    grid     = $("[data-shopgrid]");
    if (!grid) return;
    moreWrap = $("[data-shopmore]");
    countEl  = $("#shopCount");
    resetEl  = $("[data-shopreset]");

    buildShelf();
    cacheNames();
    buildChips();
    readURL();
    syncControls();

    var stat = $('[data-shopstat="items"]');
    if (stat) stat.textContent = ITEMS.length + " things on the shelf";

    render();

    /* live search, debounced. Typing replaces the history entry
       rather than pushing one per keystroke — nobody wants to press
       back eleven times to undo the word "flashlight". */
    var input = $("#shopSearch"), t;
    if (input) {
      input.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          S.q = input.value.trim();
          shown = PAGE;
          writeURL(false);
          render();
        }, 140);
      });
    }
    var form = $("[data-shopform]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(t);
      S.q = input.value.trim();
      change(true);
    });

    var sel = $("[data-shopsort]");
    if (sel) sel.addEventListener("change", function () {
      S.sort = SORTS.indexOf(sel.value) > -1 ? sel.value : "relevance";
      change(true);
    });

    document.addEventListener("click", function (e) {
      var el;

      el = e.target.closest("[data-dept]");
      if (el) { toggle(S.dept, el.dataset.dept); change(true); return; }

      el = e.target.closest("[data-price]");
      if (el) { toggle(S.price, el.dataset.price); change(true); return; }

      el = e.target.closest("[data-loc]");
      if (el) { toggle(S.loc, el.dataset.loc); change(true); return; }

      if (e.target.closest("[data-deptall]")) { S.dept = []; change(true); return; }

      if (e.target.closest("[data-stockchip]")) { S.stock = !S.stock; change(true); return; }

      if (e.target.closest("[data-shopreset]")) {
        S.q = ""; S.dept = []; S.price = []; S.loc = []; S.stock = false; S.sort = "relevance";
        syncControls();
        change(true);
        window.scrollTo({ top: $(".shop-controls").offsetTop - 90, behavior:"smooth" });
        return;
      }

      if (e.target.closest("[data-shopmorebtn]")) {
        shown += PAGE;
        render();
        return;
      }
    });

    /* the back button walks back through the filters */
    window.addEventListener("popstate", function () {
      readURL();
      syncControls();
      shown = PAGE;
      render();
    });

    /* Storm Mode raises the reorder floors, which changes what counts
       as "only N left". site.js repaints its own lists; this repaints
       ours off the same attribute rather than a second event. */
    if ("MutationObserver" in window) {
      new MutationObserver(function () { render(); })
        .observe(document.documentElement, { attributes:true, attributeFilter:["data-storm"] });
    }

    /* the basket marks its own buttons, but only the ones that exist
       at the time — so re-mark after every render of ours */
    document.addEventListener("tr-cart-change", function () {
      $$("[data-add]", grid).forEach(function (b) {
        b.classList.toggle("in-cart", TRCart.has(b.dataset.add));
      });
    });
  }

  window.TRShop = {
    items: function () { return ITEMS; },
    state: function () { return S; },
    results: function () { return LAST.results.map(function (r) { return r.it; }); },
    counts: function () { return LAST.counts; },
    lastRenderMs: 0,
    lastCount: 0,
    render: render
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
