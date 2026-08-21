/* ==========================================================
   TWISTED ROOTS MERC — THE BASKET
   ----------------------------------------------------------
   A real cart, with one deliberate difference from Amazon:
   nothing is paid for here. Twisted Roots takes payment at the
   counter, so this builds a PICKUP BASKET — we set it aside
   under your name and you pay when you collect it.

   That is not a limitation, it is the business. It also means
   no card data ever touches this site, which keeps the whole
   thing out of PCI scope.

   Everything lives in localStorage, so a basket survives a
   refresh, a closed tab, and the walk from the sofa to the truck.

   PUBLIC API (used by shop.html and the product rows):
     TRCart.add(id, qty)      add, clamped to what is on hand
     TRCart.remove(id)
     TRCart.setQty(id, qty)
     TRCart.clear()
     TRCart.items()           [{id, qty, item}]
     TRCart.count()           total units
     TRCart.total()           subtotal
     TRCart.open() / close()
     TRCart.has(id)
   Fires "tr-cart-change" on document whenever it changes.
   ========================================================== */

const TRCart = (() => {
  "use strict";

  var KEY = "tr-basket-v1";
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + n.toFixed(2); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c];
    });
  };

  var state = load();

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (l) { return l && l.id && l.qty > 0; }) : [];
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("tr-cart-change", { detail: { count: count() } }));
    paint();
  }

  function find(id) {
    return (typeof TR_CATALOG !== "undefined")
      ? TR_CATALOG.filter(function (x) { return x.id === id; })[0] : null;
  }
  function onHand(id) { var it = find(id); return it ? it.q : 0; }

  /* ---------- operations ---------- */

  function add(id, qty) {
    var it = find(id);
    if (!it || it.q <= 0) return false;
    qty = Math.max(1, parseInt(qty || 1, 10));
    var line = state.filter(function (l) { return l.id === id; })[0];
    var have = line ? line.qty : 0;
    /* never let anyone basket more than is on the shelf */
    var want = Math.min(have + qty, it.q);
    if (want === have) { flash(id, "max"); return false; }
    if (line) line.qty = want; else state.push({ id: id, qty: want });
    save();
    flash(id, "added");
    return true;
  }
  function setQty(id, qty) {
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty <= 0) return remove(id);
    var line = state.filter(function (l) { return l.id === id; })[0];
    if (!line) return add(id, qty);
    line.qty = Math.min(qty, onHand(id));
    save();
  }
  function remove(id) {
    state = state.filter(function (l) { return l.id !== id; });
    save();
  }
  function clear() { state = []; save(); }

  function items() {
    return state.map(function (l) {
      return { id: l.id, qty: l.qty, item: find(l.id) };
    }).filter(function (l) { return l.item; });
  }
  function count() { return state.reduce(function (a, l) { return a + l.qty; }, 0); }
  function total() {
    return items().reduce(function (a, l) { return a + l.item.p * l.qty; }, 0);
  }
  function has(id) { return state.some(function (l) { return l.id === id; }); }

  /* ---------- little confirmation on the button you pressed ---------- */
  function flash(id, kind) {
    $$('[data-add="' + id + '"]').forEach(function (b) {
      b.classList.remove("is-added", "is-max");
      void b.offsetWidth;
      b.classList.add(kind === "max" ? "is-max" : "is-added");
      setTimeout(function () { b.classList.remove("is-added", "is-max"); }, 1400);
    });
  }

  /* ---------- the drawer ---------- */

  function build() {
    if ($("#trCart")) return;

    var el = document.createElement("div");
    el.id = "trCart";
    el.className = "cartdrawer";
    el.innerHTML =
      '<div class="cartdrawer__veil" data-cartclose></div>' +
      '<aside class="cartdrawer__panel" role="dialog" aria-modal="true" aria-label="Your basket">' +
        '<header class="cartdrawer__head">' +
          '<h3>Your basket</h3>' +
          '<button class="cartdrawer__x" data-cartclose aria-label="Close basket">&times;</button>' +
        '</header>' +
        '<div class="cartdrawer__body" data-cartbody></div>' +
        '<footer class="cartdrawer__foot" data-cartfoot></footer>' +
      '</aside>';
    document.body.appendChild(el);

    /* a button in the header that shows how full it is */
    $$("[data-carttoggle]").forEach(function (b) { b.hidden = false; });
  }

  function paint() {
    var n = count();

    /* every basket button on the page */
    $$("[data-cartcount]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    $$("[data-carttoggle]").forEach(function (b) {
      b.classList.toggle("has-items", n > 0);
      b.setAttribute("aria-label", n ? "Basket, " + n + " item" + (n > 1 ? "s" : "") : "Basket, empty");
    });

    /* mark rows already in the basket */
    $$("[data-add]").forEach(function (b) {
      b.classList.toggle("in-cart", has(b.dataset.add));
    });

    var body = $("[data-cartbody]"), foot = $("[data-cartfoot]");
    if (!body) return;

    var list = items();
    if (!list.length) {
      body.innerHTML =
        '<div class="cartempty">' +
          '<p class="h3">Nothing in it yet.</p>' +
          '<p class="small muted">Add anything on the shelf and we will set it aside under your name. ' +
            'You pay at the counter when you collect it.</p>' +
          '<a class="btn btn--amber" href="shop.html" data-cartclose>Start shopping</a>' +
        '</div>';
      foot.innerHTML = "";
      return;
    }

    body.innerHTML = list.map(function (l) {
      var it = l.item, low = it.q <= (it.min || 0);
      return '<div class="cartline">' +
        '<div class="cartline__main">' +
          '<div class="cartline__nm">' + esc(it.n) + '</div>' +
          '<div class="cartline__mt">' + esc(TR_DEPTS[it.d].name) + ' · ' + esc(it.a) +
            (low ? ' · <b style="color:var(--rust)">only ' + it.q + ' left</b>' : '') + '</div>' +
        '</div>' +
        '<div class="cartline__qty">' +
          '<button data-qtydown="' + it.id + '" aria-label="One fewer">&minus;</button>' +
          '<input data-qtyset="' + it.id + '" value="' + l.qty + '" inputmode="numeric" aria-label="Quantity">' +
          '<button data-qtyup="' + it.id + '" aria-label="One more"' + (l.qty >= it.q ? " disabled" : "") + '>+</button>' +
        '</div>' +
        '<div class="cartline__pr">' + money(it.p * l.qty) + '</div>' +
        '<button class="cartline__x" data-cartdel="' + it.id + '" aria-label="Remove ' + esc(it.n) + '">&times;</button>' +
      '</div>';
    }).join("");

    foot.innerHTML =
      '<div class="cartfoot__row"><span>Subtotal</span><b>' + money(total()) + '</b></div>' +
      '<p class="small muted" style="margin:6px 0 14px">No tax in Oregon, and nothing is charged here — ' +
        'you pay at the counter when you pick it up.</p>' +
      '<button class="btn btn--wide btn--amber" data-cartcheckout>Reserve for pickup</button>' +
      '<button class="btn btn--wide btn--ghost btn--sm" data-cartclear style="margin-top:10px">Empty the basket</button>';
  }

  function open()  { build(); $("#trCart").classList.add("open"); document.body.style.overflow = "hidden"; paint(); }
  function close() { var c = $("#trCart"); if (c) c.classList.remove("open"); document.body.style.overflow = ""; }

  /* ---------- reserve for pickup ---------- */
  function checkout() {
    var list = items();
    if (!list.length) return;
    var lines = list.map(function (l) {
      return '<div class="rw"><span>' + l.qty + ' x ' + esc(l.item.n) + '</span><span>' +
             money(l.item.p * l.qty) + '</span></div>';
    }).join("") +
      '<hr><div class="rw"><span>SUBTOTAL</span><span>' + money(total()) + '</span></div>';

    close();
    if (typeof TR !== "undefined" && TR.basketModal) { TR.basketModal(lines, list); return; }
    /* if site.js is not around for some reason, do not lose the basket */
    alert("Basket reserved. Bring your name to the counter.");
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var addBtn = t.closest("[data-add]");
    if (addBtn) {
      e.preventDefault();
      add(addBtn.dataset.add, addBtn.dataset.addQty || 1);
      if (addBtn.hasAttribute("data-add-open")) open();
      return;
    }
    if (t.closest("[data-carttoggle]")) { e.preventDefault(); open(); return; }
    if (t.closest("[data-cartclose]"))  { close(); return; }
    var up = t.closest("[data-qtyup]");   if (up) { var i1 = up.dataset.qtyup; setQty(i1, (state.filter(function(l){return l.id===i1;})[0]||{}).qty + 1); return; }
    var dn = t.closest("[data-qtydown]"); if (dn) { var i2 = dn.dataset.qtydown; setQty(i2, (state.filter(function(l){return l.id===i2;})[0]||{}).qty - 1); return; }
    var del = t.closest("[data-cartdel]"); if (del) { remove(del.dataset.cartdel); return; }
    if (t.closest("[data-cartclear]")) { clear(); return; }
    if (t.closest("[data-cartcheckout]")) { checkout(); return; }
  });

  document.addEventListener("change", function (e) {
    var q = e.target.closest("[data-qtyset]");
    if (q) setQty(q.dataset.qtyset, q.value);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  function init() {
    build();
    paint();
    /* a basket can go stale: if something sold out while it sat
       there, trim it rather than promising stock we do not have */
    var trimmed = false;
    state.forEach(function (l) {
      var h = onHand(l.id);
      if (l.qty > h) { l.qty = h; trimmed = true; }
    });
    state = state.filter(function (l) { return l.qty > 0; });
    if (trimmed) save();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { add:add, remove:remove, setQty:setQty, clear:clear, items:items,
           count:count, total:total, open:open, close:close, has:has, money:money };
})();

/* Expose it: other scripts, and anyone debugging in a console or an
   extension's isolated world, need to reach the basket. A top-level
   const alone is not on window. */
window.TRCart = TRCart;
