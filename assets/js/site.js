/* ==========================================================
   TWISTED ROOTS MERC — SITE ENGINE
   Search · stock · storm mode · pickup holds · the board
   ========================================================== */

const TR = (() => {
  "use strict";

  /* ---------------- STORE CONFIG ---------------- */
  const STORE = {
    name: "Twisted Roots Merc",
    address: "101 & 151 N Gaither St, Siletz, Oregon 97380",
    phone: "(503) 706-2801",
    phoneHref: "tel:+15037062801",
    /* 0=Sun … 6=Sat — [openMinutes, closeMinutes] or null */
    hours: {
      0: [7 * 60, 16 * 60],
      1: [6 * 60, 19 * 60],
      2: [6 * 60, 19 * 60],
      3: [6 * 60, 19 * 60],
      4: [6 * 60, 19 * 60],
      5: [6 * 60, 20 * 60],
      6: [6 * 60 + 30, 20 * 60]
    },
    kitchen: { open: 6 * 60, close: 14 * 60, label: "6am – 2pm" },
    yard:    { label: "Open store hours · pull up out back" }
  };
  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  /* ---------------- HELPERS ---------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => "$" + n.toFixed(2);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const fmtTime = m => {
    const h = Math.floor(m / 60), mm = m % 60;
    const ap = h >= 12 ? "pm" : "am";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return mm ? `${hh}:${String(mm).padStart(2,"0")}${ap}` : `${hh}${ap}`;
  };

  const stormOn = () => document.documentElement.dataset.storm === "on";
  const floorFor = it => (stormOn() && it.stormMin) ? it.stormMin : it.min;

  /* Stock state: out / low / in */
  function stockState(it){
    if (it.q <= 0) return "out";
    if (it.q <= floorFor(it)) return "low";
    return "in";
  }
  function stockLabel(it){
    const st = stockState(it);
    if (st === "out") return "Out of stock";
    if (it.d === "yard") return `${it.q} out back`;
    if (st === "low")  return `Only ${it.q} left`;
    return "In stock";
  }
  function stockChip(it){
    const st = stockState(it);
    return `<span class="stk stk--${st}">${esc(stockLabel(it))}</span>`;
  }
  const byId = id => TR_CATALOG.find(x => x.id === id);

  /* ---------------- HOURS / OPEN NOW ---------------- */
  function todayHours(d = new Date()){ return STORE.hours[d.getDay()]; }
  function openState(d = new Date()){
    const h = todayHours(d);
    if (!h) return { open:false, text:"Closed today" };
    const now = d.getHours() * 60 + d.getMinutes();
    if (now < h[0]) return { open:false, text:`Opens ${fmtTime(h[0])}` };
    if (now >= h[1]) return { open:false, text:`Closed · opens ${fmtTime(STORE.hours[(d.getDay()+1)%7]?.[0] ?? 360)}` };
    const left = h[1] - now;
    return { open:true, text: left <= 60 ? `Open · closes ${fmtTime(h[1])}` : `Open until ${fmtTime(h[1])}` };
  }
  function paintOpenPills(){
    const s = openState();
    $$("[data-openpill]").forEach(el => {
      el.classList.toggle("is-closed", !s.open);
      el.innerHTML = `<i></i>${esc(s.text)}`;
    });
    $$("[data-todayhours]").forEach(el => {
      const h = todayHours();
      el.textContent = h ? `${fmtTime(h[0])} – ${fmtTime(h[1])}` : "Closed";
    });
    $$("[data-todayname]").forEach(el => { el.textContent = DAYS[new Date().getDay()]; });
  }

  /* ---------------- SEARCH ---------------- */
  const norm = s => s.toLowerCase().replace(/[^a-z0-9½¼¾⅝×"' ]/g, " ").replace(/\s+/g, " ").trim();

  function findIntent(qRaw){
    const q = norm(qRaw);
    if (q.length < 3) return null;
    let best = null, bestScore = 0;
    TR_INTENTS.forEach(intent => {
      intent.q.forEach(phrase => {
        const p = norm(phrase);
        let score = 0;
        if (q === p) score = 100;
        else if (q.includes(p) || p.includes(q)) score = 60 + Math.min(p.length, q.length);
        else {
          const qw = q.split(" ").filter(w => w.length > 2);
          const pw = p.split(" ").filter(w => w.length > 2);
          const hits = qw.filter(w => pw.some(x => x.startsWith(w) || w.startsWith(x))).length;
          if (hits >= 2 || (hits === 1 && pw.length === 1)) score = 30 + hits * 8;
        }
        if (score > bestScore) { bestScore = score; best = intent; }
      });
    });
    return bestScore >= 38 ? best : null;
  }

  function searchItems(qRaw, limit = 24){
    const q = norm(qRaw);
    if (!q) return [];
    const words = q.split(" ").filter(Boolean);
    const scored = [];
    TR_CATALOG.forEach(it => {
      const name = norm(it.n);
      const tags = (it.t || []).map(norm);
      const dept = norm(TR_DEPTS[it.d].name);
      let s = 0;
      if (name === q) s += 120;
      if (name.startsWith(q)) s += 60;
      if (name.includes(q)) s += 40;
      tags.forEach(t => {
        if (t === q) s += 90;
        else if (t.startsWith(q) || q.startsWith(t)) s += 45;
        else if (t.includes(q)) s += 25;
      });
      if (dept.includes(q)) s += 18;
      words.forEach(w => {
        if (w.length < 2) return;
        if (name.includes(w)) s += 14;
        if (tags.some(t => t.includes(w))) s += 12;
      });
      if (s > 0){
        if (stockState(it) === "out") s -= 25;
        if (stockState(it) === "in")  s += 4;
        scored.push([s, it]);
      }
    });
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit).map(x => x[1]);
  }

  function prodRow(it){
    const d = TR_DEPTS[it.d];
    const canHold = it.q > 0;
    return `<div class="prod">
      <div>
        <div class="nm">${esc(it.n)}</div>
        <div class="mt">${esc(d.name)} · ${esc(it.a)}</div>
      </div>
      ${stockChip(it)}
      <div class="pr">${it.p > 0 ? money(it.p) : "Free"}</div>
      <div class="act">${canHold
        ? `<button class="btn btn--sm btn--amber btn--add" data-add="${it.id}">Add</button>`
        : `<button class="btn btn--sm btn--ghost" data-tellus="${esc(it.n)}">Tell us</button>`}</div>
    </div>`;
  }

  function renderSearch(qRaw, mountSel = "#searchResults"){
    const mount = $(mountSel);
    if (!mount) return;
    const q = (qRaw || "").trim();
    if (!q){ mount.innerHTML = ""; return; }

    const intent = findIntent(q);
    const items  = searchItems(q);
    let html = "";

    if (intent){
      const picks = intent.picks.map(byId).filter(Boolean);
      html += `<div class="result-head">
          <h3>${esc(intent.title)}</h3>
          <span class="cnt">What you'll probably need</span>
        </div>
        <div class="intent-note"><b>From the counter</b><span>${esc(intent.note)}</span></div>
        ${picks.map(prodRow).join("")}`;
      const extra = items.filter(i => !intent.picks.includes(i.id)).slice(0, 8);
      if (extra.length){
        html += `<div class="result-head" style="margin-top:44px">
            <h3>Also matching “${esc(q)}”</h3><span class="cnt">${extra.length} item${extra.length>1?"s":""}</span>
          </div>${extra.map(prodRow).join("")}`;
      }
    } else if (items.length){
      html += `<div class="result-head">
          <h3>“${esc(q)}”</h3><span class="cnt">${items.length} item${items.length>1?"s":""}</span>
        </div>${items.map(prodRow).join("")}`;
    } else {
      html += `<div class="result-head"><h3>Nothing on the shelf for “${esc(q)}”</h3></div>
        <div class="intent-note"><b>Not yet</b><span>We don't carry that today — but tell Carrie &amp; Eric.
        If enough neighbors ask for it, it goes on the shelf.</span></div>
        <p><button class="btn btn--amber" data-tellus="${esc(q)}">Tell Carrie &amp; Eric</button></p>`;
    }
    mount.innerHTML = html;
    mount.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }

  /* ---------------- THE BOARD ---------------- */
  function paintBoard(){
    const mount = $("[data-board]");
    if (!mount) return;
    const s = openState();
    const h = todayHours();
    const bakeLeft = TR_BAKERY.filter(b => b.cat === "bakery").reduce((a, b) => a + b.q, 0);
    const lowCount = TR_CATALOG.filter(i => stockState(i) === "low" || stockState(i) === "out").length;
    const lumber   = TR_CATALOG.filter(i => i.d === "yard").reduce((a, b) => a + b.q, 0);

    const cells = [
      { k:"The store", v: s.open ? "Open" : "Closed", s: h ? `${fmtTime(h[0])} – ${fmtTime(h[1])} today` : "Closed today" },
      { k:"Kitchen",   v: (new Date().getHours()*60 + new Date().getMinutes()) < STORE.kitchen.close && s.open ? "Cooking" : "Closed", s:`Breakfast &amp; lunch · ${STORE.kitchen.label}` },
      { k:"On the bakery rack", v: bakeLeft ? `${bakeLeft} left` : "Sold out", s: bakeLeft ? "Cinnamon rolls, sourdough, cookies" : "Come earlier tomorrow" },
      stormOn()
        ? { k:"Storm status", v:"Stocked up", s:"Storm minimums raised · supplies on the wall" }
        : { k:"Out in the yard", v:`${lumber} pcs`, s:"Lumber &amp; concrete, under cover" }
    ];

    mount.innerHTML = cells.map((c, i) =>
      `<div class="board-cell">
        <div class="k">${c.k}</div>
        <div class="v"><span class="flip" style="animation-delay:${i * 90}ms">${c.v}</span><small>${c.s}</small></div>
      </div>`).join("");

    const when = $("[data-boardwhen]");
    if (when){
      const d = new Date();
      when.textContent = `${DAYS[d.getDay()]} · ${d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}`;
    }
    void lowCount;
  }

  /* ---------------- METERS (storm / yard stock) ---------------- */
  function paintMeters(){
    $$("[data-meters]").forEach(mount => {
      const ids = mount.dataset.meters.split(",").map(s => s.trim());
      mount.innerHTML = ids.map(id => {
        const it = byId(id); if (!it) return "";
        const target = Math.max(floorFor(it) * 2, it.q, 1);
        const pct = Math.min(100, Math.round((it.q / target) * 100));
        const st = stockState(it);
        return `<div class="meter ${st === "in" ? "ok" : st}">
          <div class="top"><span class="nm">${esc(it.n)}</span><span class="vl">${it.q} on hand</span></div>
          <div class="bar"><i style="width:0%" data-w="${pct}"></i></div>
        </div>`;
      }).join("");
    });
    requestAnimationFrame(() => {
      setTimeout(() => $$(".meter .bar i[data-w]").forEach(i => { i.style.width = i.dataset.w + "%"; }), 120);
    });
  }

  /* ---------------- DEPARTMENT LISTS ---------------- */
  function paintLists(){
    $$("[data-dept]").forEach(mount => {
      const dept = mount.dataset.dept;
      const limit = parseInt(mount.dataset.limit || "999", 10);
      const items = TR_CATALOG.filter(i => i.d === dept).slice(0, limit);
      mount.innerHTML = items.map(prodRow).join("");
    });
    $$("[data-aisle]").forEach(mount => {
      const aisle = mount.dataset.aisle;
      const items = TR_CATALOG.filter(i => i.a === aisle);
      mount.innerHTML = items.map(prodRow).join("");
    });
    $$("[data-ids]").forEach(mount => {
      const items = mount.dataset.ids.split(",").map(s => byId(s.trim())).filter(Boolean);
      mount.innerHTML = items.map(prodRow).join("");
    });
  }

  /* ---------------- KITS ---------------- */
  function paintKits(){
    const mount = $("[data-kits]");
    if (!mount) return;
    mount.innerHTML = TR_KITS.map(k => {
      const items = k.items.map(byId).filter(Boolean);
      const total = items.reduce((a, b) => a + b.p, 0);
      const allIn = items.every(i => i.q > 0);
      return `<article class="card">
        <img src="assets/img/${k.img}" alt="" loading="lazy">
        <div class="card-in">
          <h3 class="h3">${esc(k.n)}</h3>
          <p class="small muted mb0">${esc(k.sub)}</p>
          <ul>${items.map(i => `<li>${esc(i.n)}<span>${money(i.p)}</span></li>`).join("")}</ul>
          <div class="foot">
            <span class="tot">${money(total)}</span>
            ${allIn
              ? `<button class="btn btn--sm" data-holdkit="${k.id}">Hold this kit</button>`
              : `<span class="stk stk--low">Ask at the counter</span>`}
          </div>
        </div>
      </article>`;
    }).join("");
  }

  /* ---------------- REQUESTS BOARD ---------------- */
  function paintRequests(){
    const mount = $("[data-requests]");
    if (!mount) return;
    mount.innerHTML = TR_REQUESTS.map(r => `<div class="req">
      <div class="top"><span class="nm">${esc(r.item)}</span><span class="ct">${r.count} asked</span></div>
      <span class="st st--${r.status}">${r.status === "stocked" ? "Now stocked" : r.status === "ordered" ? "On order" : "Looking into it"}</span>
      <div class="nt">${esc(r.note)}</div>
    </div>`).join("");
  }

  /* ---------------- BAKERY BOARD ---------------- */
  function paintBakery(){
    $$("[data-bakery]").forEach(mount => {
      const cat = mount.dataset.bakery;
      const items = TR_BAKERY.filter(b => cat === "all" || b.cat === cat);
      mount.innerHTML = items.map(b => {
        const sold = b.q === 0;
        const left = b.cat === "bakery" || b.cat === "grab";
        return `<div class="menu-item ${sold ? "sold" : ""}">
          <span class="nm">${esc(b.n)}</span>
          <span class="dots"></span>
          <span class="pr">${sold ? "Sold out" : money(b.p)}</span>
          <span class="ds">${esc(b.desc)}${left && !sold ? ` <b style="color:var(--amber-hi)">· ${b.q} left today</b>` : ""}</span>
        </div>`;
      }).join("");
    });
  }

  /* ---------------- HOLD FOR PICKUP ----------------

     THE DEMO NOTICE. None of these forms send anywhere yet. The
     receipt in particular is convincing — a hold number, a real
     closing time, "just say your name" — and the only thing that
     said otherwise was the smallest, palest line in the box, last.
     Somebody would drive to Siletz on the strength of it.

     So the notice goes FIRST, at the top of every one of these
     dialogs, in the same place every time, and it is not styled
     to be ignored. Delete demoNote() the day these post to Square,
     not before.                                                  */
  function demoNote(what){
    return '<p class="demonote" role="note"><b>Preview site.</b> ' + what +
           ' Nothing is sent to the store yet and nothing is charged. ' +
           'To actually reserve something, call <a href="' + STORE.phoneHref + '">' +
           esc(STORE.phone) + '</a>.</p>';
  }

  /* what had focus before a dialog opened, so it can go back */
  var lastFocus = null;

  function modal(title, bodyHtml){
    let m = $("#trModal");
    if (!m){
      m = document.createElement("div");
      m.id = "trModal"; m.className = "modal";
      m.innerHTML = `<div class="modal-bg" data-close></div>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="trModalTitle">
          <div class="modal-head"><h3 id="trModalTitle"></h3><button data-close aria-label="Close">×</button></div>
          <div class="modal-body"></div>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target.hasAttribute("data-close")) closeModal(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
    }
    $("#trModalTitle", m).textContent = title;
    $(".modal-body", m).innerHTML = bodyHtml;
    m.classList.add("open");
    document.body.style.overflow = "hidden";
    /* remember where we came from so Escape does not dump the user
       at the top of the page */
    lastFocus = document.activeElement;
    const f = $(".modal-body input, .modal-body button, .modal-body a", m) || $(".modal-head button", m);
    if (f) setTimeout(() => f.focus(), 60);
    trapFocus(m);
    return m;
  }
  function closeModal(){
    const m = $("#trModal");
    if (m) m.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch(e){} }
    lastFocus = null;
  }

  /* Tab must not walk out of an open dialog and start operating the
     page behind it. One listener, installed once per dialog element. */
  function trapFocus(box){
    if (box.dataset.trapped) return;
    box.dataset.trapped = "1";
    var SEL = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    box.addEventListener("keydown", function(e){
      if (e.key !== "Tab") return;
      var f = $$(SEL, box).filter(function(el){ return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
  }

  /* One polite live region for the whole site. Adding to the basket,
     reserving, and every form result speak through it, so a screen
     reader is told what happened instead of nothing happening. */
  function say(msg){
    var r = $("#trLive");
    if (!r){
      r = document.createElement("p");
      r.id = "trLive"; r.className = "visually-hidden";
      r.setAttribute("role", "status");
      r.setAttribute("aria-live", "polite");
      document.body.appendChild(r);
    }
    r.textContent = "";
    setTimeout(function(){ r.textContent = msg; }, 40);
  }

  function holdForm(titleLines, ref){
    return demoNote("This hold form is a preview of how it will work.") +
      `<p class="small muted" style="margin-top:0">We'll set it behind the counter with your name on it and hold it until close.
      No account, no prepay — pay when you pick it up.</p>
      <div style="background:var(--sand); padding:14px 16px; margin:18px 0; font-family:var(--f-display); font-weight:700">${titleLines}</div>
      <form data-holdform data-ref="${esc(ref)}">
        <div class="field"><label for="hn">Your name</label><input id="hn" name="name" required autocomplete="name" placeholder="First name is fine"></div>
        <div class="field"><label for="hp">Phone</label><input id="hp" name="phone" required type="tel" autocomplete="tel" placeholder="(503) 706-2801"></div>
        <div class="field"><label for="hq">How many?</label><input id="hq" name="qty" type="number" min="1" value="1"></div>
        <button class="btn btn--wide btn--amber" type="submit">Hold it for me</button>
      </form>`;
  }

  function receipt(name, lines, qty){
    const d = new Date();
    const num = "TR-" + String(d.getFullYear()).slice(2) + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0") + "-" + Math.floor(100 + Math.random()*899);
    return demoNote("Nothing was actually held.") + `<div class="receipt">
      <div class="big">Twisted Roots Merc</div>
      Siletz, Oregon<br>
      ${esc(STORE.phone)}
      <hr>
      <div class="rw"><span>HOLD</span><span>${num}</span></div>
      <div class="rw"><span>FOR</span><span>${esc(name)}</span></div>
      <div class="rw"><span>QTY</span><span>${esc(qty || 1)}</span></div>
      <hr>
      ${lines}
      <hr>
      <div class="rw"><span>HELD UNTIL</span><span>${fmtTime(todayHours() ? todayHours()[1] : 1140)}</span></div>
      <div style="margin-top:14px">It's behind the counter. Just say your name.</div>
    </div>
    <p class="small muted" style="margin-top:18px">In the live store this drops straight into Square and prints at the counter.</p>
    <button class="btn btn--wide" data-close style="margin-top:8px">Done</button>`;
  }

  /* Every one of these forms swapped the dialog's contents and then
     said nothing and moved nothing. Sighted users saw a receipt
     appear; a screen reader was told nothing at all, and focus was
     left on a submit button that no longer existed, which drops it
     to <body>. One helper, called from all four. */
  function resultShown(title, spoken){
    $("#trModalTitle").textContent = title;
    say(spoken);
    var box = $(".modal-body");
    var go = box && (box.querySelector("button, a[href], input"));
    if (go) setTimeout(function(){ go.focus(); }, 40);
  }

  /* ---------------- SUGGESTION FORM ---------------- */
  function tellUsModal(prefill = ""){
    modal("What should we carry?", demoNote("This suggestion box is a preview.") + `
      <p class="small muted" style="margin-top:0">Tell Carrie &amp; Eric what Twisted Roots should stock.
        We're not promising to order everything — but if enough neighbors ask, it goes on the shelf.</p>
      <form data-tellform>
        <div class="field"><label for="tw">What are you looking for?</label>
          <input id="tw" name="item" required value="${esc(prefill)}" placeholder="Purina Pro Plan dog food, 35 lb"></div>
        <div class="field"><label for="tb">Brand, if you know it</label><input id="tb" name="brand" placeholder="Optional"></div>
        <div class="field"><label for="tn">Your name</label><input id="tn" name="name" placeholder="Optional"></div>
        <div class="field"><label for="tp">Phone or email</label><input id="tp" name="contact" placeholder="Optional — so we can tell you when it lands"></div>
        <button class="btn btn--wide btn--amber" type="submit">Send it to the counter</button>
      </form>`);
  }

  /* ---------------- ORDER, AS A POP-UP ----------------
     On a phone the dock bar's job is to get an order started
     without losing the page you are on. So it opens the kitchen
     right there instead of navigating away — pick a time, say
     what you want, done.                                        */
  function orderModal(){
    var star = (typeof TR_BAKERY !== "undefined")
      ? TR_BAKERY.filter(function(b){ return b.star || b.cat === "bakery"; }).slice(0, 6)
      : [];
    var chips = star.map(function(b){
      var out = b.q === 0;
      return '<button type="button" class="chip" data-additem="' + esc(b.n) + '"' +
             (out ? ' disabled style="opacity:.45"' : '') + '>' +
             esc(b.n) + (out ? " · sold out" : " · " + money(b.p)) + '</button>';
    }).join("");

    var h = todayHours();
    var open = h ? fmtTime(h[0]) + " – " + fmtTime(STORE.kitchen.close === 840 ? 840 : h[1]) : "closed today";

    modal("Order for pickup", demoNote("This order form is a preview.") +
      '<p class="small muted" style="margin-top:0">Kitchen is on ' + esc(STORE.kitchen.label) +
      '. Bakery rack goes out at six and is usually gone by nine. No account, no prepay — ' +
      'pay at the counter.</p>' +
      '<div class="chips" style="margin:16px 0 18px"><span class="lbl">Tap to add</span>' + chips + '</div>' +
      '<form data-orderform>' +
        '<div class="field"><label for="onm">Your name</label>' +
          '<input id="onm" name="name" required autocomplete="name" placeholder="First name is fine"></div>' +
        '<div class="field"><label for="oph">Phone</label>' +
          '<input id="oph" name="phone" required type="tel" autocomplete="tel" placeholder="(503) 706-2801"></div>' +
        '<div class="field"><label for="oit">What are we making?</label>' +
          '<textarea id="oit" name="items" required placeholder="2 Siletz sandwiches, 1 biscuits &amp; gravy, 2 drip coffees"></textarea></div>' +
        '<div class="field"><label for="otm">Pickup</label><select id="otm" name="when">' +
          '<option>As soon as it is ready</option><option>7:00 am</option><option>7:30 am</option>' +
          '<option>8:00 am</option><option>8:30 am</option><option>9:00 am</option>' +
          '<option>10:30 am</option><option>11:30 am</option><option>12:30 pm</option>' +
          '<option>Tomorrow morning</option></select></div>' +
        '<button class="btn btn--wide btn--amber" type="submit">Send it to the kitchen</button>' +
      '</form>' +
      '<p class="small muted" style="margin:14px 0 0">Rather talk to somebody? ' +
      '<a href="' + STORE.phoneHref + '">' + esc(STORE.phone) + '</a></p>');
    void open;
  }

  /* ---------------- RESERVE THE BASKET ---------------- */
  function basketModal(lines, list){
    modal("Reserve for pickup", demoNote("This reservation is a preview.") +
      '<p class="small muted" style="margin-top:0">We will pull these and set them behind the counter ' +
      'under your name. Nothing is charged now — you pay when you collect.</p>' +
      '<div style="background:var(--sand); padding:14px 16px; margin:16px 0">' +
        '<b style="font-family:var(--f-display)">' + list.length + ' line' + (list.length>1?"s":"") +
        '</b> <span class="muted">· held until close today</span></div>' +
      '<form data-basketform>' +
        '<div class="field"><label for="bn">Your name</label><input id="bn" name="name" required autocomplete="name" placeholder="First name is fine"></div>' +
        '<div class="field"><label for="bp">Phone</label><input id="bp" name="phone" required type="tel" autocomplete="tel" placeholder="(503) 706-2801"></div>' +
        '<button class="btn btn--wide btn--amber" type="submit">Reserve it</button>' +
      '</form>');
    var f = $("[data-basketform]");
    if (f) f.dataset.lines = lines;
  }

  /* ---------------- STORM MODE ---------------- */
  function setStorm(on){
    document.documentElement.dataset.storm = on ? "on" : "off";
    try { localStorage.setItem("tr-storm", on ? "on" : "off"); } catch(e){}
    $$("[data-stormtoggle]").forEach(b => {
      b.innerHTML = `<i></i>Storm Mode ${on ? "On" : "Off"}`;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    paintBoard(); paintMeters(); paintLists(); paintKits();
    const q = $("#siteSearch"); if (q && q.value) renderSearch(q.value);
  }

  /* ---------------- REVEAL ---------------- */
  function reveals(){
    if (!("IntersectionObserver" in window)){ $$(".rv").forEach(e => e.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin:"0px 0px -60px 0px", threshold:.08 });
    $$(".rv").forEach(e => io.observe(e));
  }

  /* ---------------- TICKER ---------------- */
  function ticker(){
    const t = $("[data-ticker]");
    if (!t) return;
    const words = ["Milk & eggs","AA batteries","Dog food, 30 lb","2×4×8","Cinnamon rolls at 6am","Bagged ice","Propane exchange","Toilet flappers","Fast-set concrete","Bar & chain oil","Firewood bundles","Tarps & rope","Drip coffee, $3","Fence pickets","Work gloves","Local honey","Poster board","Jumper cables","Marionberry jam","Fishing tackle"];
    const row = words.map(w => `<span>${esc(w)}</span>`).join("");
    t.innerHTML = row + row;
  }

  /* ---------------- DRIVE BARS ---------------- */
  function driveBars(){
    $$(".drive-cell .bar i[data-w]").forEach((i, n) => {
      setTimeout(() => { i.style.width = i.dataset.w + "%"; }, 250 + n * 120);
    });
  }

  /* ---------------- HERO VIDEO ----------------
     The still is what actually ships in the HTML. The video is
     only fetched when it will not cost the visitor anything they
     would mind: motion allowed, not on Save-Data, not on a slow
     connection, and only once the hero is on screen. If any of
     that fails, the still is the finished design, not a fallback.  */
  function heroVideo(){
    var vids = $$("video.hero-video");
    if (!vids.length) return;

    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var net = navigator.connection || {};
    var slow = net.saveData === true ||
               /^(slow-)?2g$/.test(net.effectiveType || "") ||
               net.effectiveType === "3g";

    vids.forEach(function(v){
      if (mq.matches || slow) return;            /* still only */

      var start = function(){
        if (v.dataset.loaded) return;
        v.dataset.loaded = "1";
        var small = window.innerWidth < 900 || (net.effectiveType === "4g" && net.downlink && net.downlink < 3);
        v.src = small ? v.dataset.srcSm : v.dataset.src;
        v.preload = "auto";
        v.load();
        var go = function(){
          var p = v.play();
          if (p && p.catch) p.catch(function(){});
        };
        v.addEventListener("canplay", function(){
          go();
          v.classList.add("is-playing");         /* cross-fades over the still */
        }, { once:true });
        go();
      };

      if ("IntersectionObserver" in window){
        var io = new IntersectionObserver(function(es){
          es.forEach(function(e){
            if (e.isIntersecting){ start(); }
            else if (v.dataset.loaded) { v.pause(); }
          });
        }, { threshold:.05 });
        io.observe(v);
      } else {
        start();
      }

      document.addEventListener("visibilitychange", function(){
        if (!v.dataset.loaded) return;
        if (document.hidden) v.pause();
        else { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
      });
    });

    /* respect a mid-session change of heart */
    if (mq.addEventListener) mq.addEventListener("change", function(){
      if (mq.matches) vids.forEach(function(v){ v.pause(); v.classList.remove("is-playing"); });
    });
  }

  /* ---------------- DOCK BAR + BACK TO TOP ----------------
     One always-reachable action on a phone, and a way back to the
     top once the page is long enough to need it. Injected here so
     every page gets it without touching markup.                   */
  function dockbar(){
    if ($(".dockbar")) return;

    /* the storm banner is fixed on phones, so its height has to be
       fed to the layout rather than guessed */
    var measure = function(){
      var sb = $(".stormbar");
      var h = (sb && getComputedStyle(sb).display !== "none") ? sb.offsetHeight : 0;
      document.documentElement.style.setProperty("--stormbar-h", h + "px");
    };
    measure();
    window.addEventListener("resize", measure, { passive:true });

    /* The one action worth having permanently in reach on a phone
       is ordering food, not a contact form. */
    /* Href is still a real link, so it works with JS off and can
       be opened in a new tab. The click handler intercepts it on
       phones and opens the kitchen in place. */
    /* "Order Online" was on every page, always pointing at the
       bakery — including on shop.html and yard.html, on a site whose
       whole proposition is that it does NOT sell online. The dock now
       offers whatever the page you are on is actually for. */
    var path = location.pathname;
    var here = function(n){ return path.indexOf(n) > -1; };
    var onBakery = here("bakery.html");
    var href  = onBakery ? "#order" : "bakery.html#order";
    var label = "Order food";
    if (here("shop.html") || here("merc.html") || here("hunt.html") || here("storm.html")) {
      href = "shop.html"; label = "Shop the shelf";
    } else if (here("yard.html")) {
      href = "yard.html#stock"; label = "Check the yard";
    } else if (here("visit.html")) {
      href = STORE.phoneHref; label = "Call the counter";
    } else if (here("kitchen.html") || path.indexOf("/recipes/") > -1) {
      href = onBakery ? "#order" : "../bakery.html#order";
      if (path.indexOf("/recipes/") === -1) href = "bakery.html#order";
      label = "Order food";
    }

    var bar = document.createElement("div");
    bar.className = "dockbar";
    bar.setAttribute("aria-label", "Quick actions");
    bar.innerHTML =
      '<a class="dockbar__cta" href="' + href + '">' + label + '</a>' +
      '<a class="dockbar__btn" href="' + STORE.phoneHref + '" aria-label="Call Twisted Roots Merc">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"/></svg>' +
      '</a>' +
      '<button class="dockbar__btn dockbar__top" data-totop aria-label="Back to top">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>' +
      '</button>';
    document.body.appendChild(bar);

    var top = document.createElement("button");
    top.className = "totop";
    top.setAttribute("data-totop", "");
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(top);

    var btns = $$("[data-totop]");
    var showAt = Math.max(600, window.innerHeight * 0.9);
    var tick = 0;
    var onScroll = function(){
      if (tick) return;
      tick = requestAnimationFrame(function(){
        tick = 0;
        var on = (window.scrollY || window.pageYOffset) > showAt;
        btns.forEach(function(b){ b.classList.toggle("show", on); });
      });
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();

    document.addEventListener("click", function(e){
      if (e.target.closest("[data-totop]")){
        e.preventDefault();
        window.scrollTo({ top:0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    });
  }

  /* ---------------- THE SIGN, AND THE HEADER ON SCROLL ----------
     A hanging sign does not sit still while the page moves past
     it. The tilt is driven by scroll VELOCITY, not position, so
     it leans into the direction of travel and settles when you
     stop — which is what a real sign on two chains does.

     The header is transparent over the hero and picks up a white
     sheet once you are into the page, so the nav always has
     something to sit on.                                        */
  function signAndHeader(){
    var head  = $(".site-head");
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* motion.js builds the hanging sign after this file runs, so the
       plate does not exist yet at init. Resolve it lazily and cache
       it once it turns up, rather than binding to nothing. */
    var signs = [];
    function targets(){
      if (!signs.length) signs = $$(".brand .hangsign__plate, .brand img");
      return signs;
    }

    var last = window.scrollY || window.pageYOffset;
    var vel = 0, raf = 0, settle = 0;

    var run = function(){
      if (raf) return;
      raf = requestAnimationFrame(function(){
        raf = 0;
        var y = window.scrollY || window.pageYOffset;
        var d = y - last;
        last = y;

        if (head) head.classList.toggle("is-scrolled", y > 40);
        if (still || !targets().length) return;

        /* velocity, damped — a heavy sign has momentum */
        vel = vel * 0.82 + d * 0.18;
        var tilt = Math.max(-7, Math.min(7, vel * 0.55));
        var grow = 1 + Math.min(1, y / Math.max(1, window.innerHeight * 0.5)) * 0.18;

        targets().forEach(function(el){
          el.style.setProperty("--sign-tilt", tilt.toFixed(2) + "deg");
          el.style.setProperty("--sign-grow", grow.toFixed(3));
        });

        /* when scrolling stops, let it swing back to rest */
        clearTimeout(settle);
        settle = setTimeout(function(){
          vel = 0;
          targets().forEach(function(el){ el.style.setProperty("--sign-tilt", "0deg"); });
        }, 140);
      });
    };

    window.addEventListener("scroll", run, { passive:true });
    run();
  }

  /* ---------------- THE SIGN ANSWERS THE PHONE ----------------
     Tilt the handset and the sign leans with it, the way a sign
     on two chains would. Uses the device's roll (gamma), damped
     and clamped so it is a lean, not a spin.

     iOS needs an explicit grant, and only from a real gesture, so
     we ask once on the first tap and never nag again.            */
  function signTilt(){
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.DeviceOrientationEvent) return;

    var signs = [];
    function targets(){
      if (!signs.length) signs = $$(".brand .hangsign__plate, .brand img");
      return signs;
    }

    var lean = 0, raf = 0;
    function onTilt(e){
      var g = e.gamma;                       /* roll, -90..90 */
      if (g === null || g === undefined) return;
      /* damp hard: a heavy sign does not track a wobbling hand */
      lean = lean * 0.86 + Math.max(-9, Math.min(9, g * 0.22)) * 0.14;
      if (raf) return;
      raf = requestAnimationFrame(function(){
        raf = 0;
        targets().forEach(function(el){
          el.style.setProperty("--sign-lean", lean.toFixed(2) + "deg");
        });
      });
    }

    function listen(){ window.addEventListener("deviceorientation", onTilt, { passive:true }); }

    if (typeof DeviceOrientationEvent.requestPermission === "function"){
      var ask = function(){
        document.removeEventListener("touchend", ask);
        DeviceOrientationEvent.requestPermission()
          .then(function(state){ if (state === "granted") listen(); })
          .catch(function(){});
      };
      document.addEventListener("touchend", ask, { once:true, passive:true });
    } else {
      listen();
    }
  }

  /* ---------------- INIT ---------------- */
  function init(){
    try { if (localStorage.getItem("tr-storm") === "on") document.documentElement.dataset.storm = "on"; } catch(e){}

    /* mobile nav */
    const burger = $("[data-burger]"), nav = $("#siteNav");
    if (burger && nav){
      burger.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Close menu" : "Menu");
        burger.classList.toggle("is-open", open);
        document.documentElement.classList.toggle("nav-open", open);
      });
    }

    /* storm toggle */
    $$("[data-stormtoggle]").forEach(b => b.addEventListener("click", () => setStorm(!stormOn())));
    setStorm(stormOn());

    /* search */
    const form = $("[data-searchform]"), input = $("#siteSearch");
    if (form && input){
      form.addEventListener("submit", e => { e.preventDefault(); renderSearch(input.value); });
      let t;
      input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { if (input.value.trim().length > 2) renderSearch(input.value); else $("#searchResults").innerHTML = ""; }, 220);
      });
      const pre = new URLSearchParams(location.search).get("q");
      if (pre){ input.value = pre; renderSearch(pre); }
    }
    $$("[data-chip]").forEach(c => c.addEventListener("click", () => {
      const v = c.dataset.chip;
      if (input){ input.value = v; renderSearch(v); input.focus(); }
      else location.href = "merc.html?q=" + encodeURIComponent(v);
    }));

    /* delegated actions */
    document.addEventListener("click", e => {
      const hold = e.target.closest("[data-hold]");
      if (hold){
        const it = byId(hold.dataset.hold);
        if (it) modal("Hold it for pickup", holdForm(`${esc(it.n)} — ${money(it.p)}<br><span style="font-weight:400;font-size:.86rem;opacity:.7">${esc(TR_DEPTS[it.d].name)} · ${esc(it.a)}</span>`, it.id));
        return;
      }
      const kit = e.target.closest("[data-holdkit]");
      if (kit){
        const k = TR_KITS.find(x => x.id === kit.dataset.holdkit);
        if (k){
          const items = k.items.map(byId).filter(Boolean);
          modal("Hold this kit", holdForm(
            `${esc(k.n)}<br><span style="font-weight:400;font-size:.86rem;opacity:.75">${items.map(i => esc(i.n)).join("<br>")}</span>`, k.id));
        }
        return;
      }
      const tell = e.target.closest("[data-tellus]");
      if (tell){ tellUsModal(tell.dataset.tellus === "true" ? "" : tell.dataset.tellus); return; }
      var cta = e.target.closest(".dockbar__cta");
      /* Only the FOOD dock opens the kitchen in place. On a shop or
         yard page the dock is a real link to a real page and must be
         left alone, or it would open a bakery order from the lumber
         rack. */
      if (cta && /#order$/.test(cta.getAttribute("href") || "") &&
          window.matchMedia("(max-width:1010px)").matches){
        e.preventDefault();
        orderModal();
        return;
      }
      var addit = e.target.closest("[data-additem]");
      if (addit){
        var ta = $("#oit");
        if (ta){
          var v = ta.value.trim();
          ta.value = (v ? v + ", " : "") + addit.dataset.additem;
          ta.focus();
        }
        return;
      }
      const close = e.target.closest("[data-close]");
      if (close){ closeModal(); }
    });

    /* form submits */
    document.addEventListener("submit", e => {
      const hf = e.target.closest("[data-holdform]");
      if (hf){
        e.preventDefault();
        const fd = new FormData(hf);
        const ref = hf.dataset.ref;
        const it = byId(ref), k = TR_KITS.find(x => x.id === ref);
        let lines = "";
        if (it) lines = `<div class="rw"><span>${esc(it.n)}</span><span>${money(it.p)}</span></div>`;
        if (k) lines = k.items.map(byId).filter(Boolean)
          .map(i => `<div class="rw"><span>${esc(i.n)}</span><span>${money(i.p)}</span></div>`).join("");
        $(".modal-body").innerHTML = receipt(fd.get("name") || "Neighbor", lines, fd.get("qty"));
        resultShown("We've got it", "Preview only. Nothing was actually held, and nothing was charged.");
        return;
      }
      const tf = e.target.closest("[data-tellform]");
      if (tf){
        e.preventDefault();
        const fd = new FormData(tf);
        $(".modal-body").innerHTML = `<div class="receipt">
            <div class="big">Noted at the counter</div><hr>
            <div class="rw"><span>ITEM</span><span>${esc(fd.get("item"))}</span></div>
            ${fd.get("brand") ? `<div class="rw"><span>BRAND</span><span>${esc(fd.get("brand"))}</span></div>` : ""}
            <hr>
            <div>Carrie reads these Sunday nights. If enough neighbors ask for the same thing, it goes on the shelf — and we'll post it under <b>You Asked, We Got It.</b></div>
          </div>
          <button class="btn btn--wide" data-close style="margin-top:18px">Done</button>`;
        resultShown("Thanks — it's on the list", "Preview only. Your suggestion was not sent to the store.");
        return;
      }
      const bf = e.target.closest("[data-basketform]");
      if (bf){
        e.preventDefault();
        const fd = new FormData(bf);
        $(".modal-body").innerHTML = receipt(fd.get("name") || "Neighbor", bf.dataset.lines || "", TRCart.count());
        TRCart.clear();
        resultShown("Set aside for you", "Preview only. Nothing was reserved and nothing was charged.");
        return;
      }
      const of_ = e.target.closest("[data-orderform]");
      if (of_){
        e.preventDefault();
        const fd = new FormData(of_);
        $("#trModalTitle").textContent = "In the kitchen";
        $(".modal-body").innerHTML = receipt(fd.get("name") || "Neighbor",
          `<div class="rw"><span>PICKUP</span><span>${esc(fd.get("when"))}</span></div>` +
          `<div style="margin-top:8px">${esc(fd.get("items"))}</div>`, 1);
        return;
      }
      const sf = e.target.closest("[data-fakeform]");
      if (sf){
        e.preventDefault();
        const note = sf.querySelector("[data-formnote]");
        sf.querySelectorAll("input,textarea,button,select").forEach(el => el.disabled = true);
        if (note){ note.hidden = false; note.scrollIntoView({ behavior:"smooth", block:"center" }); }
      }
    });

    heroVideo(); dockbar(); signAndHeader(); signTilt();
    paintOpenPills(); paintBoard(); paintLists(); paintMeters();
    paintKits(); paintRequests(); paintBakery(); ticker(); reveals(); driveBars();
    setInterval(paintOpenPills, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { STORE, searchItems, findIntent, renderSearch, stockState, stockLabel, setStorm, money, byId, tellUsModal, basketModal, say };
})();


/* ==========================================================
   NAV SUBMENUS
   ----------------------------------------------------------
   CSS opens them on hover for a mouse. This is here for the
   other two ways in: a click and a keyboard. It also makes sure
   only one is ever open, closes on Escape, and closes when you
   click away - three things a hover-only menu gets wrong the
   moment a finger is involved.
   ========================================================== */
(function () {
  "use strict";
  function all() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-navitem]"));
  }
  function shut(it) {
    it.classList.remove("open");
    var b = it.querySelector("[data-subtoggle]");
    if (b) b.setAttribute("aria-expanded", "false");
  }
  function shutAll(except) {
    all().forEach(function (it) { if (it !== except) shut(it); });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-subtoggle]");
    if (btn) {
      e.preventDefault();
      var it = btn.closest("[data-navitem]");
      var open = !it.classList.contains("open");
      shutAll(it);
      it.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    /* a link inside a submenu is navigating away, so leave it alone,
       but a click anywhere else closes whatever is hanging open */
    if (!(e.target.closest && e.target.closest("[data-navitem]"))) shutAll(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = all().filter(function (it) { return it.classList.contains("open"); })[0];
    if (!open) return;
    var b = open.querySelector("[data-subtoggle]");
    shutAll(null);
    if (b) b.focus();
  });

  /* leaving the group with a mouse closes it, so the panel does not
     sit there after the pointer has moved on */
  document.addEventListener("mouseleave", function (e) {
    if (!window.matchMedia("(min-width:1011px)").matches) return;
    var it = e.target.closest && e.target.closest("[data-navitem]");
    if (it) shut(it);
  }, true);

  /* closing the burger drawer must not leave an accordion open */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-burger]")) shutAll(null);
  });
})();
