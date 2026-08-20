# Twisted Roots Merc — Store-to-Website Technology Plan

**Twisted Roots Merc · 101 & 151 N Gaither St, Siletz, Oregon 97380**
Mercantile · The Yard · Bakery + Kitchen
Owners: Carrie and Eric. Staff at launch: Carrie and Eric.

**Document status:** v1.0 — the definitive build plan. Written to be handed to a contractor, argued with, and then executed.
**Last revised:** August 2026

---

## How to read this document

There are two audiences here and they need different things.

- **Carrie and Eric** should read [§0 The whole thing in one page](#0-the-whole-thing-in-one-page) and [§12 What you actually have to do](#12-what-carrie-and-eric-actually-have-to-do). That is roughly six minutes of reading and it is genuinely all they need.
- **Whoever builds this** should read everything, and should treat §3 (data model), §4 (sync), and §10 (failure modes) as the parts that will actually decide whether this works.

**On numbers in this document.** Anywhere a price, a rate, or a fee appears, it is marked as one of:

| Marker | Meaning |
|---|---|
| **[VERIFY]** | A real published price/behavior as of writing, which changes often enough that it must be re-checked before anyone signs anything. |
| **[EST]** | An estimate. A range built from comparable equipment or comparable businesses. Not a quote. |
| **[ASSUMPTION]** | A modeling input we chose, which drives downstream math. If it's wrong, the math after it is wrong. |

No number in this document should be entered into a budget without being re-priced first.

---

## Table of contents

0. [The whole thing in one page](#0-the-whole-thing-in-one-page)
1. [System architecture](#1-system-architecture)
2. [Square products, plans, and hardware](#2-square-products-plans-and-hardware)
3. [The item data model](#3-the-item-data-model)
4. [The sync layer](#4-the-sync-layer)
5. [Storm Mode](#5-storm-mode)
6. [The owner dashboard (Twisted Roots HQ)](#6-the-owner-dashboard-twisted-roots-hq)
7. [Bakery and Kitchen](#7-bakery-and-kitchen)
8. [The customer request pipeline](#8-the-customer-request-pipeline)
9. [Reporting that actually matters](#9-reporting-that-actually-matters)
10. [Security, permissions, PCI, backups, and the lights going out](#10-security-permissions-pci-backups-and-the-lights-going-out)
11. [Phased rollout](#11-phased-rollout)
12. [What Carrie and Eric actually have to do](#12-what-carrie-and-eric-actually-have-to-do)
13. [Total cost of ownership](#13-total-cost-of-ownership)
14. [Appendices](#14-appendices)

---

## 0. The whole thing in one page

There is **one** system: Square. Everything else is a window onto Square.

```
        Carrie and Eric only ever touch these two things:

        ┌────────────────────────┐        ┌────────────────────────┐
        │   THE REGISTER         │        │   TWISTED ROOTS HQ     │
        │   (Square for Retail)  │        │   (one private page)   │
        │                        │        │                        │
        │  Ring a sale           │        │  What's low            │
        │  Scan a delivery in    │        │  What to order         │
        │  Add a new product     │        │  Storm Mode button     │
        │  Set bakery counts     │        │  What people asked for │
        └────────────────────────┘        └────────────────────────┘
```

Everything the customer sees — live stock on the website, the storm supply page, the yard rack counts, the bakery board, the "hold it for pickup" button, the "You Asked, We Got It" board — is generated automatically from those two screens. Nobody types a stock number into a website. Nobody keeps a spreadsheet. Nobody logs into a second inventory system.

The ten rules this plan never breaks:

1. **Square is the only place inventory lives.** If a number exists in two systems, one of them is wrong and neither is trustworthy.
2. **The website reads. It never writes inventory.** The only thing the website writes into Square is a pickup order.
3. **Adding a product happens once, in one place, in about ninety seconds.**
4. **The website would rather say nothing than say something wrong.** A confidently wrong "12 in stock" costs a customer forever. "Call and we'll check" costs nothing.
5. **No customer accounts. No app. No subscriptions. No passwords for anybody who isn't Carrie or Eric.**
6. **The owner dashboard does arithmetic, not analytics.** It produces an order list, not a chart.
7. **One button for Storm Mode.** Weather data may *suggest* it. Only a human *flips* it.
8. **Card numbers never touch anything we build.** Ever. This is the whole PCI strategy.
9. **The store works with no internet and no power.** Degraded, but open.
10. **If a piece of software requires an evening of homework, it doesn't go in.**

---

## 1. System architecture

### 1.1 The diagram

```
                                  ┌──────────────────────────────────────────────┐
   PHYSICAL WORLD                 │            SQUARE  (source of truth)         │
   ────────────────               │                                              │
                                  │   Catalog   ─ items, variations, SKUs,       │
  ┌───────────────┐    receive    │               categories, prices, cost,      │
  │ RECEIVING     │──────────────▶│               custom attributes              │
  │ DOOR          │  scan against │   Inventory ─ qty on hand, per location      │
  │ (back of      │  the open PO  │   Vendors   ─ suppliers + lead time          │
  │  151 N        │               │   Orders    ─ every sale + every pickup      │
  │  Gaither)     │               │   Team      ─ who did what, PIN, permissions │
  └───────────────┘               └───────┬──────────────────────────┬───────────┘
                                          │                          │
  ┌───────────────┐   sale                │                          │
  │ THE COUNTER   │───────────────────────┘                          │
  │ Square        │   decrements                      ┌──────────────┴───────────┐
  │ Register +    │   inventory                       │   WEBHOOKS      +  API   │
  │ scanner       │                                   │ inventory.count.updated  │
  └───────────────┘                                   │ catalog.version.updated  │
                                                      │ order.created / .updated │
  ┌───────────────┐   count-in                        └──────────────┬───────────┘
  │ THE KITCHEN   │───────────────────────┐                          │
  │ Square Stand  │   morning bake counts │                          ▼
  │ + kitchen     │                       │      ┌─────────────────────────────────────┐
  │   printer     │                       │      │  TR-SYNC   (Cloudflare Worker)      │
  └───────────────┘                       │      │                                     │
                                          │      │  1. verify webhook signature        │
  ┌───────────────┐   receive / count     │      │  2. debounce 20s                    │
  │ THE YARD      │───────────────────────┘      │  3. pull changed catalog + counts   │
  │ Square        │   Terminal, out back         │  4. map Square ─▶ TR_CATALOG shape  │
  │ Terminal      │                              │  5. write catalog.json to R2/KV     │
  └───────────────┘                              │  6. purge CDN, stamp generated_at   │
                                                 │                                     │
                                                 │  + cron every 10 min: full reconcile│
                                                 │  + cron nightly 02:15: full export  │
                                                 └───────────┬─────────────────────────┘
                                                             │
                                     ┌───────────────────────┼───────────────────────┐
                                     ▼                       ▼                       ▼
                        ┌────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
                        │  catalog.json      │  │  storm.json         │  │  requests.json     │
                        │  (all web items,   │  │  (state, since,     │  │  (deduped board,   │
                        │   qty, min,        │  │   note, expires)    │  │   public statuses) │
                        │   stormMin, aisle) │  └─────────────────────┘  └────────────────────┘
                        └─────────┬──────────┘            │                        │
                                  └─────────────┬─────────┴────────────────────────┘
                                                ▼
                    ┌───────────────────────────────────────────────────────────────┐
                    │  twistedrootsmerc.com   (static site on Cloudflare Pages)     │
                    │                                                               │
                    │  index · merc · yard · storm · bakery · local · roots · visit  │
                    │  assets/js/site.js reads catalog.json instead of catalog.js    │
                    │  search · intents · kits · stock chips · meters · the board    │
                    └───────┬──────────────────────────────────┬────────────────────┘
                            │                                  │
                 "Hold it"  │                       "Order for pickup" (bakery)
                  name+phone│                                  │
                            ▼                                  ▼
                 ┌──────────────────────┐        ┌──────────────────────────────┐
                 │  tr-hold (Worker)    │        │  order.twistedrootsmerc.com  │
                 │  POST /v2/orders     │        │  Square Online — pickup only │
                 │  fulfillment=PICKUP  │        │  hosted checkout, slot times │
                 │  state=OPEN          │        │  Square takes the card       │
                 └──────────┬───────────┘        └──────────────┬───────────────┘
                            │                                   │
                            └───────────────┬───────────────────┘
                                            ▼
                            ┌──────────────────────────────────┐
                            │  Square Orders                   │
                            │   ─▶ prints at the counter       │
                            │   ─▶ prints in the kitchen       │
                            │      (category-routed ticket)    │
                            │   ─▶ texts customer when ready   │
                            └──────────────────────────────────┘

                    ┌───────────────────────────────────────────────────────────┐
                    │  hq.twistedrootsmerc.com  (private, Cloudflare Access)    │
                    │  reads catalog.json + Square Orders/Reports API           │
                    │  ─▶ needs-attention table   ─▶ supplier order sheets      │
                    │  ─▶ Storm Mode button       ─▶ requests board             │
                    └───────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────────────────────────┐
                    │  NWS api.weather.gov  ── cron 30 min ──▶ storm proposal    │
                    │  (proposes only — never flips the switch)                  │
                    └───────────────────────────────────────────────────────────┘
```

### 1.2 Walkthrough: a can of chili, from the truck to the website

A case of 24 cans of chili arrives on the Pacific Wholesale Grocers truck on a Tuesday.

1. **The PO is already open.** Last Sunday, Carrie hit "Create this week's orders" on HQ, and a purchase order to Pacific Wholesale went out. Square knows 24 cans of `EVR-CAN-0034` are inbound. Because Square knows they're inbound, HQ has *already stopped* nagging her to reorder chili — the reorder math subtracts on-order quantity.

2. **Eric receives against the PO.** He opens the PO on the counter iPad, scans one can, and types 24. He does not look up the item. He does not create anything. Square increments on-hand from 4 → 28 and closes the PO line. Total elapsed: about eight seconds per line.

3. **Square fires a webhook.** Within a second or two, Square sends an `inventory.count.updated` event to `https://sync.twistedrootsmerc.com/hooks/square`.

4. **TR-Sync verifies and debounces.** The Worker checks the `x-square-hmacsha256-signature` header against the webhook signature key. If it doesn't match, the request is dropped and logged. If it does, the Worker notes "something changed" and waits 20 seconds — because receiving a 40-line delivery would otherwise fire 40 rebuilds. One rebuild covers all 40.

5. **TR-Sync pulls the truth.** It calls `POST /v2/inventory/counts/batch-retrieve` for the changed variation IDs at the Siletz location, and `POST /v2/catalog/batch-retrieve` for anything whose catalog version moved. It does **not** trust the webhook payload's numbers — the webhook is a *doorbell*, not a *delivery*. This distinction matters: webhooks can arrive out of order, and a stale count written last is worse than no count at all.

6. **TR-Sync maps Square into the site's shape.** Square's `CatalogItemVariation` + `InventoryCount` + custom attributes become exactly the object `assets/js/catalog.js` already uses:
   ```json
   { "id":"e34", "sku":"EVR-CAN-0034", "n":"Canned Chili, 15oz", "d":"everyday",
     "p":3.29, "q":28, "min":12, "a":"Aisle 5", "t":["chili","canned","soup"] }
   ```
   Nothing about the site's rendering code has to change. That is deliberate: the demo catalog was written in the production shape on purpose.

7. **TR-Sync writes one file.** `catalog.json` goes to Cloudflare R2 with a `generated_at` timestamp and an `item_count`. The Worker then purges the CDN edge cache for that one URL.

8. **The website picks it up.** The next visitor to twistedrootsmerc.com fetches `catalog.json`, which is served from the edge with `Cache-Control: public, max-age=60, stale-while-revalidate=600`. Within about a minute of Eric scanning the case, `merc.html` says **In stock** instead of **Only 4 left**, and HQ's needs-attention table drops the chili row.

**Total human effort: one scan and one typed number.** Nobody touched the website.

### 1.3 Walkthrough: a pickup order, from the website to the counter

Two different flows, deliberately, because they have different needs.

**Flow A — "Hold it" (retail, no payment).** A neighbor searching for "leaky toilet" gets the intent card, sees the toilet flapper, and taps **Hold it**.

1. The modal asks for **name, phone, how many**. That is all. No account, no email, no password, no card. (This is exactly what `holdForm()` in `site.js` already does.)
2. The browser POSTs to `tr-hold`, a Worker with a *separate*, write-scoped Square token.
3. `tr-hold` re-checks live stock before accepting. If the item went to zero in the last 90 seconds, it responds "someone just got the last one — we'll tell Carrie" and converts it into a request instead of a false promise.
4. `tr-hold` creates a Square Order: fulfillment type `PICKUP`, state `OPEN`, `pickup_at` = today's closing time, recipient name + phone, a line item for the variation, and a note: `WEB HOLD — pay at counter`.
5. Square prints the hold slip at the counter printer. Eric walks it to the shelf, pulls the flapper, rubber-bands the slip to it, puts it in the hold bin behind the register.
6. The customer's screen shows the receipt-styled confirmation `site.js` already renders. **It's behind the counter. Just say your name.**
7. When they show up, Eric opens the order on the register, and it becomes a normal sale — inventory decrements at *that* moment, not at hold time.
8. Unclaimed holds auto-cancel at close via a nightly cron and the goods go back on the shelf. **Held stock is never removed from the public count.** Holds are a promise, not a reservation — with two owners and a hold bin, treating them as a reservation creates phantom outages.

**Flow B — Bakery pickup (food, paid).** A customer wants two cinnamon rolls and a breakfast sandwich for 7:30am.

1. The **Order for pickup** button on `bakery.html` hands off to `order.twistedrootsmerc.com`, a Square Online site restricted to the Bakery + Kitchen categories.
2. Square Online enforces the rules we configure: kitchen ordering window, minimum lead time, slot capacity, and — critically — **sold-out state for counted bakery items**, because those items are stock-tracked in Square.
3. The customer pays on Square's hosted checkout. **Our code never sees a card.**
4. The order lands in Square Orders → prints an order ticket in the kitchen on the impact printer, routed by category → Carrie sees it in the queue with the requested time.
5. Square texts the customer when the order is marked ready.

**Why two flows instead of one.** Retail holds need to be *frictionless and free* — the whole point is "don't drive over for nothing," and forcing a card through checkout for a $7.49 flapper kills that. Kitchen orders need to be *paid and time-slotted*, because a no-show breakfast burrito is food in the trash and a slot Carrie couldn't sell to someone else. Same Square, same order list on the counter screen, different front doors.

---

## 2. Square products, plans, and hardware

### 2.1 The subscription stack

| Product | Plan | Cost | Verdict |
|---|---|---|---|
| **Square for Retail** | **Plus** | **~$89/mo per location, billed annually; ~$109 month-to-month [VERIFY]** | **Day one. Required.** This is the whole plan. |
| Square Online | **Plus** | ~$29/mo [VERIFY] | Day one — needed for a custom domain (`order.twistedrootsmerc.com`) and order-ahead pickup scheduling. |
| Square Team | **Plus** | ~$35/mo per location [VERIFY] | **Not day one.** Two owners don't need permission sets. Add the day the first employee is hired. |
| Square for Restaurants | — | ~$69/mo Plus [VERIFY] | **No.** See §2.2. |
| Square Loyalty | — | ~$45/mo at the lowest tier [VERIFY] | **No, and probably never.** See §9.5. |
| Square Marketing | — | from ~$15/mo [VERIFY] | Month 6 at the earliest, and only for a storm-season list. |
| Square Payroll | — | ~$35/mo + ~$6/person [VERIFY] | Only when there's a W-2 employee. Two owners taking draws don't need it. |
| Square KDS | — | ~$20/mo per device [VERIFY] | No — requires Square for Restaurants. Kitchen printer instead. |

**Day-one software run rate: about $118/month** (Retail Plus annual + Online Plus). That is the entire software bill for the store side.

### 2.2 The single most important plan decision: Retail, not Restaurants

The obvious-looking move is Square for Retail *plus* Square for Restaurants, because there's a kitchen. **Don't.**

| | Retail Plus only (recommended) | Retail Plus + Restaurants Plus |
|---|---|---|
| Monthly | ~$89 | ~$158 |
| Logins to learn | 1 | 2 |
| Kitchen routing | Order ticket printed on a kitchen impact printer, routed by category [VERIFY the exact category-routing setting on the current Retail app] | Kitchen Display System, course firing, order timers |
| Inventory on retail SKUs | Full — POs, cost tracking, reorder points | Weak; Restaurants isn't built for 2,000 hard-goods SKUs |
| Tabs, coursing, table service | No | Yes |
| Who this fits | A counter-service kitchen inside a store | A restaurant |

Twisted Roots is a mercantile with a griddle, not a restaurant with a shelf. Breakfast and lunch are counter-service, order-and-wait, single-ticket. A $300 impact printer that spits a ticket in the kitchen solves 95% of what a KDS solves, costs nothing monthly, and — decisively — keeps the promise that Carrie and Eric learn **one** piece of software.

**Revisit if and only if:** ticket times consistently exceed 12 minutes at the breakfast rush, *or* they hire kitchen staff who need their own screen, *or* they start doing table service. Those are the honest trigger conditions. Until then, one system.

### 2.3 Hardware

Prices are street/list ranges. All **[EST]** unless marked.

#### Day one — genuinely required

| # | Item | Where | Est. cost | Why it's non-negotiable |
|---|---|---|---|---|
| 1 | **Square Register** (built-in customer display) | Main counter | ~$799 [VERIFY] | Purpose-built, doesn't wander off, has its own display for the customer. An iPad at the main register is a false economy — it gets picked up. |
| 2 | **Square Stand + iPad (10th gen or newer)** | Kitchen / second counter | ~$149 stand + ~$400 iPad [VERIFY] | Second register for the bakery rush; becomes the backup when the Register fails. |
| 3 | **Barcode scanner, Bluetooth** — Socket Mobile S700 or S740 | Counter + roaming | ~$250–320 | This is the item that makes 2,000 SKUs survivable. Roaming matters: receiving happens at the back door, cycle counts happen in the aisle. |
| 4 | **Barcode scanner, USB, wired** | Fixed at the Register | ~$70–140 | Cheap, fast, never needs charging. Have both. |
| 5 | **Receipt printer** — Star TSP143 / TSP100 series | Main counter | ~$230–320 | Drives the cash drawer too. |
| 6 | **Cash drawer** | Main counter | ~$110–170 | Rural Oregon. Cash is not optional. |
| 7 | **Kitchen impact printer** — Star SP742 (impact, not thermal) | Kitchen | ~$270–350 | **Impact specifically** — thermal paper goes black near a griddle. |
| 8 | **Label printer** — Dymo LabelWriter 550 or Brother QL-1110NWB | Back room | ~$130–220 [VERIFY Square's currently supported models] | Shelf labels and barcodes for the ~15% of stock with no manufacturer barcode: lumber, bulk hardware, local makers, own merch. |
| 9 | **Square Terminal** | The Yard, out back | ~$299 [VERIFY] | Handheld, prints, takes cards standing at Rack A in the rain. Also the roaming receiving device and the farmer's-market/event register. |
| 10 | **UPS ×2** — ~1500VA | Counter, network closet | ~$180–260 each | See §10.6. This is the difference between "we're on cash" and "we're closed." |
| 11 | **Router + cellular failover** — Peplink Balance 20X or similar | Network closet | ~$450–650 + antenna | See §2.4. |
| 12 | **Wi-Fi APs ×2** (one covering the yard/back) | Store + yard | ~$150–250 each | The Terminal and the roaming scanner need coverage out back and at the receiving door. |
| 13 | Cabling, mounts, surge, install labor | — | ~$600–1,200 | Always more than expected in an old building. |

**Day-one hardware subtotal: roughly $4,000 – $5,700 [EST].**

#### Later — real, but not week one

| Item | When | Est. cost | Trigger |
|---|---|---|---|
| **Legal-for-trade scale** (Brecknell 6720U or similar, NTEP-certified) | Only if selling by weight | ~$400–700 [EST] | Deli meat, bulk nails, bulk candy, cut-to-length rope/chain. **If nothing is priced per pound, skip it entirely.** Note: selling by weight in Oregon means a legal-for-trade scale and likely an ODA weights-and-measures license — that's a regulatory decision before it's a hardware one. |
| Second Square Terminal | Month 6 | ~$299 | Events, the second building (101 N Gaither), a line-buster at the storm rush. |
| Customer-facing tablet / self-checkout | Probably never | — | Two owners, one counter. Don't. |
| Square KDS | Only with Restaurants | ~$20/mo + display | See §2.2. |
| Handheld inventory sled | Year 2 | ~$400 | Only if annual counts hurt. |
| Backup Register | Year 2 | ~$799 | Once the store can't afford a down day. |

#### Explicitly not buying

- **A separate inventory system** (Lightspeed, Fishbowl, SOS, anything with "ERP" near it). The whole plan is one source of truth.
- **A separate e-commerce platform** (Shopify, WooCommerce). Square Online handles pickup orders; the marketing site is static and free.
- **A separate email/CRM platform** at launch. Square's built-ins are enough for two people.
- **RFID.** For a store this size it is a solution looking for a problem.

### 2.4 Network and backup internet

This is the Oregon Coast. Treat connectivity as an equipment problem, not a utility.

| Layer | Choice | Cost | Notes |
|---|---|---|---|
| **Primary** | Whatever wired service reaches 151 N Gaither — check Ziply/Peak/local co-op first | ~$80–150/mo [EST] | Wired beats satellite for latency and rain fade if it exists at the address. **Confirm serviceability before signing a lease clause.** |
| **Primary (if no wired)** | Starlink Business / Priority | ~$140–165/mo [VERIFY] | Works well here. Degrades in the heaviest rain and under tree cover — siting matters. |
| **Failover** | Cellular modem in the router, on the carrier with the best Siletz coverage (test in the building, not on a coverage map) | ~$25–50/mo [EST] | Auto-failover in under 30 seconds. The register should never notice. |
| **Router** | Peplink Balance 20X (SpeedFusion-capable) or Ubiquiti UXG + LTE backup | ~$450–650 [EST] | Must do automatic WAN failover, and must be on the UPS. |
| **Segmentation** | Three VLANs: `POS`, `BACK-OFFICE`, `GUEST` | — | The POS VLAN talks to Square and nothing else. Guest Wi-Fi cannot see the register. Non-negotiable, and it's a PCI point (§10.4). |

---

## 3. The item data model

### 3.1 The philosophy

At 200 SKUs any naming scheme works. At 2,000 SKUs, a catalog without conventions becomes unsearchable, and an unsearchable catalog means Carrie re-adds an item that already exists, which means two records, which means two stock numbers, which means the website is lying. **Convention is not bureaucracy; it's the thing that keeps §1 rule 1 true.**

So the model is designed around one question: *what does Carrie type when she's holding a product at 7:40am with a customer waiting?*

Answer: **eight fields, plus a scan and a photo.** Everything else is either derived, inherited from the category, or optional.

### 3.2 The Add Product screen — every field

Fields marked **★** are the eight that must be filled every time. Everything else has a default.

| ★ | Field | Square home | Example | Why it exists | Feeds |
|---|---|---|---|---|---|
| ★ | **Barcode (GTIN/UPC)** | Variation `upc` | `0 41333 00133 8` | The scan *is* the identity. Scanning at the register, at receiving, and at count time all key off this. | POS speed, receiving, cycle counts |
| ★ | **Name** | Item `name` | `AA Batteries, 8pk` | The single string the customer reads and searches. | `n` — website, search, receipt, shelf label |
| ★ | **Department** | Square Category | `Everyday` | Drives which page it lands on, which supplier group it orders under, and which storm rules apply. | `d` — page routing, PO grouping |
| ★ | **Cost** | Variation `default_unit_cost` | `$6.10` | Without cost there is no margin, and margin dollars are the #1 number in §9. | Margin reporting, PO value |
| ★ | **Price** | Variation `price_money` | `$9.99` | | `p` |
| ★ | **Supplier** | Square Vendor | `Ace / Hardware Wholesale` | The reorder screen groups by this. Wrong supplier = an item that never gets ordered. | PO grouping, lead time |
| ★ | **Minimum qty** | `tr_min` (custom attr) | `10` | The red line. Below this, it appears on HQ. | `min` — stock chips, HQ, meters |
| ★ | **Ideal qty** | `tr_ideal` (custom attr) | `24` | Where to refill *to*. Order qty = ideal − on hand − on order. | Reorder math |
| | **Case qty** | `tr_case_qty` | `12` | Orders round up to whole cases. Ordering 7 when the vendor ships 12s wastes everybody's time. | Reorder math |
| | **Storm minimum** | `tr_storm_min` | `100` | The raised floor when Storm Mode is on. Blank = not a storm item. | `stormMin` — §5 |
| | **Aisle / location** | `tr_aisle` (SELECTION) | `Front Counter` | The website tells people *where in the store*. This is one of the highest-value fields and it costs two seconds. | `a` |
| | **Search words** | `tr_tags` (STRING, comma-sep) | `aa, battery, batteries, power` | What people *actually type*. "AA Batteries, 8pk" doesn't match "double a". | `t` — search |
| | **Maker** | `tr_maker` | `Yaquina Bee Co.` | Local dept only. The whole point of Local is the name. | `maker` |
| | **Show on website** | `tr_web` (BOOLEAN, default true) | `true` | Lets things exist in Square without appearing publicly: age-restricted goods, one-offs, closeouts, employee items, the propane tank deposit line. | Sync filter |
| | **Photo** | Square item image | — | Taken on the counter iPad, on the shelf, once. | Website, Square Online |
| | **Track inventory** | Square toggle, default ON | `on` | **Off** for made-to-order kitchen items (§7). | `avail` |
| | **Sold by weight** | Square toggle, default OFF | `off` | Only if the scale exists. | POS |
| | **Taxable** | Inherited from department | — | Oregon has **no state sales tax** — this is one of the few genuinely easy parts of running retail here. Set once at the category level and never think about it. **[VERIFY current Oregon and Lincoln County rules, including any local taxes on prepared food.]** |
| | **SKU** | Variation `sku` | `EVR-BAT-0008` | **Auto-generated.** Carrie should never type this. See §3.4. | `sku`, `id` |

**What Carrie actually experiences:** scan → the barcode lookup often pre-fills name and sometimes an image → type/confirm name → tap department → cost, price → tap supplier → three numbers (min / ideal / case) → tap aisle → type a few search words → photo → Save. **Roughly 60–90 seconds.** That is the whole ceremony, and it happens once in the item's life.

### 3.3 Reconciling with `assets/js/catalog.js`

The demo catalog already uses the production shape. The mapping is one-to-one:

| Site field (`TR_CATALOG`) | Square source | Transform |
|---|---|---|
| `id` | derived from `sku` | Stable short slug. Keep the demo's `e01`/`f01`/`y01` style by deriving from department letter + sequence, but **`sku` is the real key** and `id` is a display/anchor convenience. |
| `sku` *(new field)* | Variation `sku` | Passed through. Add this to the shape — the demo doesn't have it and HQ needs it for PO lines. |
| `n` | Item `name` (+ variation name if not "Regular") | Passed through |
| `d` | Category name | Mapped through a fixed table to the seven keys in `TR_DEPTS`: `everyday`, `fixit`, `yard`, `storm`, `outdoors`, `local`, `bakery` |
| `p` | `price_money.amount` | ÷ 100 → dollars |
| `q` | `InventoryCount` where `state=IN_STOCK`, `location_id=<Siletz>` | Integer. Missing → item is excluded, not defaulted to 0 (§4.6) |
| `min` | `tr_min` | Integer; falls back to a department default if unset |
| `stormMin` | `tr_storm_min` | Integer; **omitted entirely if unset** — `site.js`'s `floorFor()` already handles absence correctly |
| `a` | `tr_aisle` | String |
| `t` | `tr_tags` | Split on comma, trim, lowercase, dedupe |
| `maker` | `tr_maker` | String; only present on `local` |

**Three additions the production shape needs beyond the demo:**

| New field | Type | Purpose |
|---|---|---|
| `ideal` | int | HQ needs it for order quantity. Not rendered publicly. |
| `case` | int | HQ rounds orders to case multiples. Not rendered publicly. |
| `conf` | `"exact" \| "band" \| "none"` | Per-item stock confidence, set by the sync layer. Drives graceful degradation (§4.7). This is the field that keeps the site from lying. |

**Two demo-isms to fix at build time:**

- `TR_BAKERY` uses `q:99` as a sentinel for "made to order, unlimited." Replace with an explicit `avail:"made"` vs `avail:"count"` (§7.2). A magic number will eventually be rendered as "99 left."
- `site.js` `STORE.address` reads `151 N Gaither St`. The business occupies **101 & 151**. Update `STORE.address` and every footer/schema instance before launch, and get the LocalBusiness JSON-LD to match Google Business Profile exactly.

### 3.4 SKU convention

**Format:** `DDD-CCC-NNNN`

```
   EVR   -   BAT   -   0008
   │         │         │
   │         │         └── 4-digit sequence within the class, assigned by Square/script
   │         └──────────── 3-letter class (see below)
   └────────────────────── 3-letter department
```

**Departments (fixed, seven, never expanded without a decision):**

| Code | Department | `d` key | Site page |
|---|---|---|---|
| `EVR` | Everyday | `everyday` | merc.html |
| `FIX` | Fix It | `fixit` | merc.html |
| `YRD` | The Yard | `yard` | yard.html |
| `STM` | Storm Ready | `storm` | storm.html |
| `OUT` | Outdoors | `outdoors` | merc.html |
| `LOC` | Local | `local` | local.html |
| `BAK` | Bakery + Kitchen | `bakery` | bakery.html |

**Classes** — roughly 6–10 per department, matching how the store is physically walked. These should be created *once*, at build time, from a walk of the floor plan, and then frozen.

| Dept | Classes |
|---|---|
| `EVR` | `PAP` paper · `CLN` cleaning · `BAT` batteries/light · `MED` health · `BAB` baby · `PET` pet · `PPR` paper goods/school · `FOD` shelf food · `CLD` cooler · `FUL` fuel/propane · `ICE` ice |
| `FIX` | `FST` fasteners · `TPE` tape/adhesive · `SEL` sealant/weather · `PLM` plumbing · `ELC` electrical · `PCH` patch/paint · `TOL` tools · `SAF` safety · `AUT` auto/trailer · `SAW` chainsaw/yard power |
| `YRD` | `LUM` lumber · `PST` posts/boards · `PNL` panels · `CON` concrete/masonry · `AGG` aggregate |
| `STM` | `LGT` light/power · `COV` tarp/cover · `WRM` warmth · `H2O` water/food · `AID` first aid/sanitation |
| `OUT` | `FSH` fishing · `CMP` camping · `APP` apparel/boots |
| `LOC` | `FOD` food/preserves · `CFT` craft/goods · `MRC` own merch |
| `BAK` | `BKD` baked · `BRK` breakfast · `LUN` lunch · `COF` coffee · `GRB` grab & go |

**Rules:**
1. **SKUs are generated, never typed.** A one-page "New SKU" helper in HQ takes department + class and returns the next number. Hand-typed SKUs produce `FIX-PLM-27`, `FIXPLM027`, and `fix-plm-0027` within a month.
2. **SKUs never get reused.** When an item is discontinued, archive it in Square. The SKU dies with it. Reused SKUs corrupt every historical sales report.
3. **A SKU is a variation, not an item.** A tee shirt is one item with S/M/L/XL variations and four SKUs. The website shows the item; stock is the sum of its variations, and the sync stores per-variation counts so "L is out" can be shown honestly.
4. **The barcode is separate from the SKU.** Manufacturer barcode goes in the UPC field. The SKU is ours. Items without a barcode (lumber, bulk, local makers) get a printed label with our SKU encoded, which is exactly what the label printer is for.

### 3.5 Naming convention

The name is the most-read string in the business. It's on the shelf label, the receipt, the website, and in search.

| Rule | Do | Don't |
|---|---|---|
| **Noun first, qualifier after a comma** | `Toilet Paper, 12 Double Rolls` | `12 Double Rolls of Toilet Paper` |
| **Size/count always in the qualifier** | `Concrete Mix, 60 lb` | `60lb Concrete` |
| **No brand unless the brand is the reason** | `Dog Food, 30 lb` · but `Purina Pro Plan, 35 lb` | `Kirkland Signature Premium Bath Tissue Ultra Soft` |
| **Title Case. Never ALL CAPS.** | `Push-Fit Coupling, ½"` | `PUSH FIT COUPLING 1/2 INCH` |
| **Real symbols** | `2×4×8` · `½"` · `2½"` | `2x4x8` · `1/2 in` |
| **Under 40 characters** | Fits a shelf label and a receipt line | 60-character vendor descriptions |
| **The customer's word wins** | `Fast-Setting Concrete, 50 lb` | `Rapid Set Cementitious Blend` |
| **Never encode stock or price in the name** | | `Toilet Paper (LAST 3)` |

The demo catalog follows all of these already. It is the style guide. `Exterior Deck Screws 2½", 1 lb`, `Cedar Fence Picket, 6 ft`, `Siletz Valley Wildflower Honey, 12oz` — that's the voice.

**Search words carry the slang, not the name.** The name stays clean and professional; `tr_tags` absorbs everything real people type. `Push-Fit Coupling, ½"` carries tags `sharkbite, push fit, coupling, pipe, burst pipe, leak`. This split is why the demo's search feels smart, and it's the single highest-leverage two seconds in the add-product flow.

**Minimum tag hygiene at 2,000 SKUs:**
- At least 3 tags per item, at least 6 for anything in Fix It or Storm.
- Include the wrong-but-common word (`sharkbite`, `flex tape`, `quikrete`, `band aid`, `advil`, `two by four`).
- Include the *problem*, not just the object (`burst pipe`, `running toilet`, `power outage`, `drafty`).
- HQ shows a "thin tags" list: any web-visible item with fewer than 3 tags. Ten minutes on a slow Tuesday clears it.

### 3.6 Department defaults

So that a rushed add still produces a sane record, each department carries defaults that apply when a field is left blank:

| Dept | Default min | Default ideal | Default lead time | Default supplier | Auto storm item? |
|---|---|---|---|---|---|
| Everyday | 6 | 18 | 1 wk | Pacific Wholesale Grocers | Only `BAT`, `H2O`, `FUL`, `ICE` |
| Fix It | 4 | 12 | 1 wk | Ace / Hardware Wholesale | Only `TPE`, `SEL`, `SAW` |
| The Yard | 8 | 24 | 2 wk | Coast Building Supply | No |
| Storm Ready | 6 | 18 | 1 wk | Ace / Hardware Wholesale | **Yes — all** |
| Outdoors | 4 | 10 | 3 wk | Northwest Outdoor Dist. | No |
| Local | 4 | 12 | 2 wk | *(the maker, direct)* | No |
| Bakery | n/a — daily par | n/a | n/a | *(house / Sysco-type)* | No |

Defaults are a starting point that the velocity math in §6.4 overrides within about 60 days of real sales data.

---

## 4. The sync layer

### 4.1 What it is

`tr-sync` is one small stateless service. Cloudflare Workers is the recommended host (free-to-$5/mo tier covers this load with enormous headroom, and the site is already going to sit on Cloudflare Pages). Fly.io, Render, or a $6 VPS all work; the design doesn't depend on the choice.

It has exactly four jobs:

1. Receive Square webhooks and turn them into "rebuild soon."
2. On a cron, rebuild anyway, in case webhooks were missed.
3. Read Square, write `catalog.json`.
4. Never, under any circumstances, publish a stock number it isn't sure about.

It holds no database. Its entire state is a handful of Cloudflare KV keys: `last_full_sync`, `last_catalog_version`, `dirty_variation_ids`, `storm_state`.

### 4.2 Square APIs used

| Purpose | Endpoint | Notes |
|---|---|---|
| Full catalog pull | `GET /v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY,CUSTOM_ATTRIBUTE_DEFINITION` | Cursor-paged. ~2,000 SKUs ≈ 20–40 pages. |
| Targeted catalog pull | `POST /v2/catalog/batch-retrieve` | For dirty items only. |
| Search by updated time | `POST /v2/catalog/search-catalog-objects` with `begin_time` | The delta path. |
| Stock counts | `POST /v2/inventory/counts/batch-retrieve` | Batch by variation ID, filtered to the Siletz `location_id` and `states:["IN_STOCK"]`. |
| Change audit | `POST /v2/inventory/changes/batch-retrieve` | Used by HQ for velocity math (§6.4) and by the nightly export. |
| Suppliers | `GET /v2/vendors` *(verify availability/version)* | For PO grouping and lead times. |
| Sales for velocity | `POST /v2/orders/search` | Nightly, 90-day rolling window. |
| Create a hold | `POST /v2/orders` | `tr-hold` only, separate token. |

Pin the `Square-Version` header to a specific dated API version (e.g. `2026-05-21`) and upgrade deliberately, never implicitly. **[VERIFY the current version at build time.]** Square deprecates versions on a schedule; an unpinned client is a future outage with a calendar date on it.

### 4.3 Webhooks

Subscribe to:

| Event | What it means | Reaction |
|---|---|---|
| `inventory.count.updated` | A count moved (sale, receipt, adjustment, return) | Mark variation dirty, schedule rebuild |
| `catalog.version.updated` | Something in the catalog changed | Mark catalog dirty, schedule rebuild |
| `order.created` / `order.updated` | A sale or pickup order | Update HQ's today numbers; kitchen queue |
| `order.fulfillment.updated` | A pickup order was marked ready/picked up | Clear it from the hold bin view |

**Verification is mandatory.** Compute HMAC-SHA256 over `notification_url + raw_body` with the webhook signature key, compare to `x-square-hmacsha256-signature` in constant time. Reject mismatches with 401 and log them. An unverified inventory webhook endpoint is an open door for someone to make the storm page say everything is in stock.

**Doorbell, not delivery.** The webhook body's numbers are never written. It only marks IDs dirty; the rebuild reads the authoritative counts. This makes out-of-order webhook delivery — which happens — harmless.

**Debounce 20 seconds.** Receiving a 40-line delivery fires 40 webhooks in a few seconds. One rebuild, 20 seconds after the last event, covers all of them. Cap at a forced rebuild every 90 seconds during sustained activity so a busy Saturday doesn't starve the queue.

**Idempotency.** Every rebuild is a full recomputation of the output file from Square's current state. Running it twice produces byte-identical output. There is no incremental mutation of the published JSON, which means there is no state to corrupt.

### 4.4 The scheduled fallback poll

Webhooks get missed. Endpoints go down for a deploy. Square has an incident. Cloudflare has an incident. **The cron is what makes the system self-healing.**

| Cadence | Job | Cost |
|---|---|---|
| **Every 10 minutes**, store hours ±1 hr | Delta reconcile: catalog search by `updated_at` since last sync + counts for the union of dirty-and-changed variations | 2–5 API calls |
| **Every 60 minutes**, overnight | Same, slower | 2–5 calls |
| **04:45 daily** (before the 6am open) | **Full rebuild from scratch.** Every item, every count, ignore all caches. | 40–80 calls |
| **02:15 daily** | Full export snapshot to R2 (catalog + counts + 24h of orders), 90-day retention | ~100 calls |

The 04:45 full rebuild is the important one. Whatever drift accumulated during the day, the store opens every morning on a catalog that was rebuilt from Square an hour earlier. Any bug that silently corrupts the incremental path has a maximum blast radius of one day.

Square's API rate limits are generous relative to this load **[VERIFY current limits]**, but implement exponential backoff with jitter on 429 and 5xx regardless, and cap total calls per rebuild.

### 4.5 The build artifact

One file. Cached hard, purged precisely.

```json
{
  "generated_at": "2026-08-19T14:22:07Z",
  "source": "square",
  "location": "Siletz",
  "item_count": 2043,
  "storm": { "state": "off", "since": null, "note": null },
  "health": { "full_sync_at": "2026-08-19T04:45:02Z", "degraded": false, "reason": null },
  "depts": { "everyday": { "name": "Everyday", "...": "..." } },
  "items": [
    { "id":"e08", "sku":"EVR-BAT-0008", "n":"AA Batteries, 8pk", "d":"everyday",
      "p":9.99, "q":6, "min":10, "stormMin":100, "ideal":24, "case":12,
      "a":"Front Counter", "t":["aa","battery","batteries","power"], "conf":"exact" }
  ],
  "bakery": [
    { "id":"b01", "n":"The Twisted Root", "p":6.50, "q":12, "avail":"count",
      "cat":"bakery", "star":true, "conf":"exact" }
  ]
}
```

| Layer | Setting | Rationale |
|---|---|---|
| Browser | `Cache-Control: public, max-age=60` | A minute of staleness is invisible to a human and eliminates 95% of requests. |
| Edge | `s-maxage=300, stale-while-revalidate=3600` | Edge serves for 5 min, then serves stale while it refreshes. **A slow origin never becomes a slow website.** |
| Purge | Targeted purge of `/data/catalog.json` on every rebuild | Real-world freshness is 60–90 seconds, not 5 minutes. |
| Size | ~2,000 items ≈ 350–500 KB raw, **~60–90 KB gzipped [EST]** | Fine. If it grows past ~150 KB gzipped, split into `catalog-core.json` (name/price/qty/dept) and `catalog-detail.json` (tags/description), and lazy-load the second. |
| Integrity | `ETag` + a `sha256` of the items array in `health` | Lets HQ prove the site and the dashboard are looking at the same data. |

Bakery counts get a **shorter TTL — `max-age=20, s-maxage=60`** — because "3 cinnamon rolls left" moves fast and disappointing someone at 7am over a stale count is a worse outcome than an extra request.

### 4.6 When the sync fails

Every failure mode, and what happens. This table is the contract.

| Failure | Detection | Behavior | Customer sees |
|---|---|---|---|
| One rebuild throws | Try/catch, error to log + alert | **Previous `catalog.json` stays published, untouched.** A failed build never publishes. | Nothing. Data is up to 10 min stale. |
| Square API 429 | HTTP status | Backoff + jitter, retry up to 5×, then defer to next cron | Nothing |
| Square API 5xx / outage | Status + health check | Same. After 3 consecutive failed rebuilds, set `health.degraded=true` | Timestamp banner appears (§4.7) |
| Webhook endpoint down | Square retries; cron catches up | Cron covers the gap entirely | Nothing |
| Webhook signature fails | HMAC mismatch | 401, log, alert if >5 in 10 min | Nothing |
| **A count is missing for an item** | Null from the counts API | **Item is published with `conf:"none"`, not `q:0`.** | "Call to check" — never a false "Out of stock" |
| Item has no `tr_min` | Null | Department default applied, item flagged on HQ's data-hygiene list | Normal |
| Item has `tr_web:false` | Flag | Excluded from `items[]` entirely | Item doesn't exist on the site |
| Catalog shrinks >10% in one build | Item-count delta check | **Refuse to publish.** Alert. Almost certainly a bad import or a pagination bug, not 200 real deletions. | Nothing — old file stands |
| Any price ≤ $0 or > $2,000 | Range check | Item excluded, flagged on HQ | Item missing rather than absurd |
| R2/KV write fails | Error | Retry 3×, then alert; old file stands | Nothing |
| Cloudflare down | External monitor | Site is down. Phone still works. | Site down |

**The governing principle: a build that isn't confident does not publish.** Stale-but-true beats fresh-but-wrong, every single time. The demo site's own footer already makes the promise — *"Stock shown is live from the register"* — and that promise is only worth making if it's defended this hard.

### 4.7 Graceful degradation — the confidence ladder

Age of `generated_at` drives what the site is willing to claim:

| Data age | `conf` | What renders | Example |
|---|---|---|---|
| **< 15 min** | `exact` | Exact numbers | `Only 6 left` · `34 out back` |
| **15–60 min** | `exact` | Exact numbers + a quiet timestamp | `Only 6 left` · *counts as of 2:07pm* |
| **1–6 hours** | `band` | **Bands only, no numbers** | `In stock` · `Running low` · `Out of stock` |
| **> 6 hours** or `degraded` | `none` | **No stock claim at all** | `Call to check — (541) 555-0134` + a visible notice |

Plus two per-item overrides applied at build time, regardless of freshness:

| Rule | Why |
|---|---|
| `q <= 2` on any item → render `conf:"band"` with **"Last one or two — call to confirm"** | A count of 1 is the most likely count to be wrong: shrink, a damaged unit, something in a customer's cart, a mis-scan. A wrong "1 left" produces a 27-minute drive for nothing, which is exactly the failure this whole website exists to prevent. |
| Any item that changed count within the last 60 seconds → `conf:"band"` on that item for 60 more seconds | Avoids showing a number mid-transaction. |

**Implementation note:** `site.js` already centralizes all of this in `stockState()`, `stockLabel()`, and `stockChip()`. Degradation is implemented by extending those three functions plus `floorFor()` — not scattered through the page templates. Roughly 30 lines of change to ship the entire ladder.

### 4.8 Monitoring

| Check | Tool | Threshold | Alert |
|---|---|---|---|
| `/data/health.json` freshness | UptimeRobot / Better Stack, 5-min interval | `generated_at` older than 25 min during store hours | SMS to the builder, **not** to Carrie |
| Site up | Same | 2 consecutive failures | SMS |
| Rebuild error rate | Worker logs | >3 failures/hour | Email |
| Item count delta | In-build | >10% swing | **Block publish** + SMS |
| Square webhook receipt | Counter in KV | Zero webhooks in 2 store hours | Email |
| Square Online orders | Square notification | Any new order | Push to the counter iPad |

**Carrie and Eric are never on the alert list for a technical failure.** If the sync is broken, the site degrades to a phone number and the store keeps running. Waking the owners about a Worker exception is how a system stops being invisible.

---

## 5. Storm Mode

### 5.1 What it is

Storm Mode is one boolean, one button, and about fifteen lines of consequence. It is deliberately the smallest possible amount of machinery that produces a visible, useful change across the entire business.

It exists because the Oregon Coast has a predictable, repeating pattern: a wind event is forecast, everyone in Siletz needs batteries, tarps, water, bar oil, and propane in the same 48 hours, and a store that reorders on normal minimums will be empty exactly when it matters. `storm.html` already states the philosophy: *"The power goes out here. It just does."*

### 5.2 The data design

**Per item — `stormMin` (Square custom attribute `tr_storm_min`, NUMBER, optional).**

Already in the demo catalog and already correctly implemented in `site.js`:

```js
const stormOn = () => document.documentElement.dataset.storm === "on";
const floorFor = it => (stormOn() && it.stormMin) ? it.stormMin : it.min;
```

That is the whole mechanism, and it's right. Three properties worth naming explicitly:

1. **Absence is meaningful.** An item without `stormMin` is not a storm item, and Storm Mode ignores it completely. Toilet flappers do not need a storm floor.
2. **It's a floor, not a target.** It raises the trigger line. The quantity to *order* still comes from the ideal/par math in §6.4, which is what makes Storm Mode produce sane orders rather than panic buying.
3. **It's a hand-set business judgment, not a formula.** `AA Batteries: min 10 → stormMin 100` is Eric saying "we sell a case of AAs in a night when the power's out." No algorithm knows that. The system should *suggest* storm minimums after a real storm's data comes in (§5.6), but a human sets them.

The demo's storm floors are a good starting table — they're already the ones on `storm.html`:

| Item | Normal min | Storm min | Multiple | The reasoning on the page |
|---|---|---|---|---|
| AA Batteries, 8pk | 10 | 100 | 10× | Ordered by the case, not the pack |
| LED Flashlight | 10 | 30 | 3× | Wall gets refaced and refilled |
| Tarp, 10×12 | 10 | 25 | 2.5× | Pallet stays out on the floor |
| Bottled Water, 24pk | 10 | 30 | 3× | Stacked by the door |
| Bar & Chain Oil | 6 | 24 | 4× | Because everybody forgets it |
| Propane, 1 lb | 8 | 36 | 4.5× | Camp stoves come out when the range won't light |

**Global — `storm.json`, a single tiny record in KV:**

```json
{
  "state": "on",
  "since": "2026-11-14T16:10:00Z",
  "set_by": "carrie",
  "source": "manual",
  "note": "Wind advisory on the coast. Storm supplies stocked and the yard is open.",
  "expires_at": "2026-11-17T18:00:00Z",
  "nws_event": "High Wind Warning",
  "nws_headline": "High Wind Warning until Sat 6 PM PST"
}
```

Three states, not two:

| State | Meaning | Reorder floors | Public banner |
|---|---|---|---|
| `off` | Normal | `min` | none |
| `watch` | Something's coming, pre-staging | **`min` + 50% of the gap to `stormMin`** | Quiet advisory line |
| `on` | It's happening | `stormMin` | Full `.stormbar` |

`watch` is the state that actually saves the weekend. Ordering at full storm floors 96 hours out is often too late — the distributor's truck runs Tuesday. `watch` puts the pre-order in on Monday, when the forecast first turns. Implementation is one line in `floorFor()`:

```js
const floorFor = it => {
  const s = TR_STORM.state;
  if (!it.stormMin || s === "off") return it.min;
  if (s === "watch") return Math.round(it.min + (it.stormMin - it.min) * 0.5);
  return it.stormMin;
};
```

### 5.3 What flipping it changes

Six things, at once, from one boolean:

| # | System | Change | Where in code |
|---|---|---|---|
| 1 | **Reorder floors** | `floorFor()` returns `stormMin`; every storm item instantly reads as at-or-below minimum | `site.js` `floorFor()` |
| 2 | **HQ needs-attention table** | Re-sorts, re-counts, recalculates order quantities, regroups POs by supplier | `hq.html` `render()` |
| 3 | **Stock chips sitewide** | `stockState()` flips storm items from `in` → `low`, so search and department lists visibly change | `site.js` `stockState()` |
| 4 | **The storm page re-scales** | Meters measure against `floorFor(it) * 2`, so bars that read "fine" now read "short" against the higher target | `site.js` `paintMeters()` |
| 5 | **Site banner** | `.stormbar` appears across every page with the `note` text and a link to `storm.html` | CSS on `html[data-storm="on"]` |
| 6 | **The board** | The homepage board's fourth cell swaps from "Out in the yard" to "Storm status" | `site.js` `paintBoard()` |

Two additions worth building beyond the demo:

7. **Search weighting.** While storm is on, add +20 to storm-department items in `searchItems()`. Someone typing "batteries" during an outage should see the storm wall's stock first.
8. **Ticker + kits reorder.** `ticker()` swaps to storm words; `paintKits()` leads with `kit2` (Storm Tarp Fix), `kit4` (Power Out Kit), `kit6` (Chainsaw Day).

**Storm Mode changes zero prices.** Not one cent. This should be written down somewhere the owners can point at, because the first time a tarp is the last tarp in Lincoln County, somebody will suggest it. Oregon has price-gouging statutes tied to declared emergencies **[VERIFY ORS 401.960 and current Oregon DOJ guidance]**, but the better reason is simpler: a store that raises tarp prices during a windstorm has ended its relationship with the town, and that relationship is the entire business model.

### 5.4 Who can flip it

| Who | Can flip | How |
|---|---|---|
| Carrie | Yes | HQ button; bookmark on the counter iPad and on her phone |
| Eric | Yes | Same |
| Any future employee | **No** | Read-only view of the storm state |
| The NWS feed | **No — proposes only** | §5.5 |
| The public | No | `localStorage` toggle in the demo is a **demo affordance only**. In production the public toggle is removed and state comes from `storm.json`. This must not ship as-is. |

Flipping writes an audit line: who, when, from what, why, and whether an NWS proposal was showing at the time. That log becomes genuinely useful in year two — "we've flipped Storm Mode nine times, seven of them Thursday afternoons, and the two we did on Saturday were the two we ran out of tarps."

### 5.5 Automatic NWS/NOAA proposals (Phase 2, month 3+)

**The design principle: the machine watches, the human decides.** Auto-flipping Storm Mode means a bad forecast puts a scary banner on the website with nobody in the building — that's a reputational risk with no upside. Proposing costs nothing and captures nearly all the value, because the failure mode being solved isn't "Carrie can't decide," it's "Carrie was elbow-deep in bread dough and didn't see the forecast."

**The feed.** `api.weather.gov` — the National Weather Service public API. No key, no cost, no rate-limit tier. Requires a descriptive `User-Agent` header identifying the app and a contact address; requests without one get rejected.

| What | Endpoint |
|---|---|
| Active alerts for the zone | `GET /alerts/active?zone={ZONE}` |
| Backup: alerts by county | `GET /alerts/active?area=OR` filtered to Lincoln County |
| Gridpoint forecast | `GET /gridpoints/PQR/{x},{y}/forecast` |
| Hourly (for gust values) | `GET /gridpoints/PQR/{x},{y}/forecast/hourly` |

**[VERIFY the exact zone and grid for Siletz.]** Siletz sits in Lincoln County, in the NWS Portland (PQR) forecast office area. Resolve the correct zone and gridpoint once, at build time, by calling `GET /points/{lat},{lon}` with the store's coordinates and caching the result. Do not hardcode a guessed zone code — a wrong zone means silently monitoring the wrong stretch of coast. Note also that Siletz is a few miles inland; the coastal zone alerts and the inland valley alerts can differ, so consider watching both and treating either as a trigger.

**Proposal rules** (cron every 30 minutes):

| Condition | Proposes |
|---|---|
| Active **High Wind Warning**, **Winter Storm Warning**, **Flood Warning**, or **Ice Storm Warning** | `on` |
| Active **Wind Advisory**, **Winter Weather Advisory**, **Flood Watch**, **High Surf Advisory** | `watch` |
| Forecast gusts **≥ 50 mph** within 72 hours | `on` |
| Forecast gusts **≥ 40 mph** within 96 hours | `watch` |
| Forecast rainfall **≥ 3" in 24h** | `watch` |
| **No** active alert and no forecast trigger, and storm has been `on` past `expires_at` | Proposes `off` |

**What Carrie sees.** A card at the top of HQ, and one SMS (rate-limited to at most one per 12 hours):

> **NWS: High Wind Warning for the Lincoln County coast until Saturday 6 PM.**
> Gusts to 65 mph forecast Friday night.
> *37 storm items would drop below their storm minimums.*
> **[ Turn Storm Mode on ]**  [ Set to Watch ]  [ Not this time ]

The line that makes it useful is the third one: the number of items that *would* flag. That's the difference between a weather notification (which she can already get on her phone) and a business decision (which she can't).

**Auto-off is also a proposal.** When the alert expires plus 48 hours, HQ proposes turning it off. It does not turn itself off — the storm might be over while the road to Toledo is still closed, and only a human knows that.

### 5.6 Learning storm minimums (month 6+)

After the first real event, the data to set storm floors properly exists. The dashboard compares the 72 hours before/during an event against a normal baseline week:

| What it observed | What it says |
|---|---|
| AA batteries sold 84 units in 3 days (baseline: 9/wk) | *Storm min for AA looks right at 100. Keep it.* |
| Tarps 10×12 sold 4 (baseline: 2/wk), never went below 9 on hand | *Storm min 25 may be high. 15 would have covered it.* |
| Bar & chain oil sold out in 14 hours | *Storm min 24 was too low. Suggest 40.* |
| Flashlight sales began rising **3 days before** the wind hit | *Flip Storm Mode Thursday, not Saturday.* |

That last row is already on the HQ demo page as an aspiration. It's a real, achievable query against Square order history — nothing exotic, just sales-by-day joined against the storm-state audit log.

---

## 6. The owner dashboard (Twisted Roots HQ)

### 6.1 What it is and isn't

HQ is a **single private page** at `hq.twistedrootsmerc.com`, behind Cloudflare Access (email one-time-code to Carrie's and Eric's addresses — no password to remember, no password to leak).

**It is:** a to-do list with arithmetic already done.
**It is not:** a BI tool, a dashboard-of-dashboards, a place with tabs, or anything with a date-range picker.

Square's own dashboard already has every report anybody could want. HQ exists precisely because *having every report* is the problem. HQ answers three questions and refuses to answer a fourth:

1. What needs ordering, and how many?
2. Is anything wrong right now?
3. What have people asked us to carry?

The existing `hq.html` demo is structurally correct. What follows specifies the math and the routines behind it.

### 6.2 The 60-second morning routine

On the counter iPad, before the doors open. **Target: under 90 seconds including the bakery numbers.**

```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, Carrie & Eric.        Wednesday · 5:41am     │
│                                                              │
│  ① TODAY'S BAKE ─ tap the number as each tray comes out      │
│     Twisted Root  [12]   Sourdough [ 7]   Hand Pie  [ 0]    │
│     Logger Cookie [19]   Biscuits  [ 9]   Cinn Loaf [ 0]    │
│                                                              │
│  ② STORM MODE                        ● Off                   │
│     NWS: nothing active. Next 72h: breezy, 1.1" rain.        │
│                                                              │
│  ③ RED TODAY (3)                                             │
│     ● Dog Food, 30 lb ......... 3 on hand, min 8            │
│     ● Fast-Set Concrete ....... 7 on hand, min 12           │
│     ● AA Batteries, 8pk ....... 6 on hand, min 10           │
│                                                              │
│  ④ WAITING AT THE COUNTER                                    │
│     2 pickup orders for this morning · 1 hold uncollected    │
│                                                              │
│  Yesterday: $2,840 · 96 tickets · avg $29.58                 │
└─────────────────────────────────────────────────────────────┘
```

Six taps for the bake numbers. Two seconds of reading for everything else. If nothing is red, the whole screen is one glance.

**The design constraint that makes this work:** if a morning routine takes longer than making a pot of coffee, it stops happening by week three. Every element above earns its place by being something that changes what happens in the next four hours.

### 6.3 The Sunday reorder routine — about twenty minutes

Once a week, kitchen table, glass of wine, iPad.

| Step | Time | What happens |
|---|---|---|
| 1. Open HQ → **Order this week** | — | The needs-attention table is already sorted by urgency (most-below-minimum first). |
| 2. Scan the list | 5 min | Red dot = at or below half of minimum, or zero. Amber = at or below minimum. Carrie reads the **Order** column and overrides anything she knows better than the math does ("no, skip the sunscreen, it's November"). |
| 3. Check the supplier cards | 5 min | Already grouped: Pacific Wholesale, Ace/Hardware, Coast Building, NW Outdoor, Local makers. Each card shows line count and estimated cost so a $4,200 order doesn't get placed by accident. |
| 4. **Create this week's orders** | 1 click | See §6.6 — what this button actually does. |
| 5. Requests board | 5 min | Anything crossing 5 distinct askers gets a decision: order it, think about it, or say no. (§8) |
| 6. Next week's specials / bake plan | 3 min | Human judgment. No system involved. |

`hq.html`'s copy already frames this exactly right: *"You don't have to understand inventory science. Look at the colour, look at the number in the last column, and hit the button at the bottom."*

### 6.4 The reorder math, explained so it can be argued with

Five inputs. All of them either come free from Square or get set once when the item is added.

| Symbol | Name | Where it comes from | Example (AA Batteries) |
|---|---|---|---|
| **V** | Sells per week | Computed from Square sales, 8-week trimmed mean | 9/wk |
| **L** | Lead time, in weeks | Set per supplier | 1 wk (Ace/Hardware) |
| **R** | Review period | How often you order = 1 week | 1 wk |
| **Q** | On hand | Square, live | 6 |
| **O** | On order | Square open POs | 0 |

**Velocity (V).** Take the last 8 weeks of units sold. Drop the highest week and the lowest week. Average the remaining 6. This "trimmed mean" is the whole trick — it means one Fourth of July, one storm, or one contractor buying out the deck screws doesn't permanently distort the ordering for a month. Items with fewer than 3 weeks of history fall back to the department default. In plain English on the screen: **"Sells about 9 a week."**

**Reorder point (the minimum).** How low it can get before there's a real risk of running out before the next delivery:

```
min  =  V × L   +   safety stock
        ───────      ───────────
        what sells    a half lead-time
        while you     of cushion,
        wait for the  because trucks
        truck         are late
```

```
safety stock = ceil(V × L × 0.5)

AA Batteries:  min = (9 × 1) + ceil(9 × 1 × 0.5) = 9 + 5 = 14
```

Note this suggests **14**, where the item is currently set to 10. HQ presents that as a suggestion — *"Minimum looks low. Suggest raising 10 → 14"* — on a monthly hygiene list. It never silently changes a number Carrie set. Owner-set values always win; the system's job is to notice and mention.

**Ideal / par level (refill to here).** Enough to cover the wait *plus* the time until the next order goes in:

```
ideal = V × (L + R) + safety stock

AA Batteries:  ideal = 9 × (1 + 1) + 5 = 23   →  rounds to 24 (a case of 12 × 2)
```

**Order quantity:**

```
raw    = ideal − on hand − on order
       = 24 − 6 − 0 = 18

cases  = ceil(18 ÷ 12) = 2 cases

ORDER  = 24 units   (2 cases)
```

**Case rounding.** Always round **up** to the case, with two guards:
- If rounding up more than doubles the raw need *and* raw need ≤ 3, round **down** to zero and wait a week. Ordering a case of 12 gate hinges because one is short is how a small store ties up its cash in slow-moving hardware.
- Anything in Storm Ready always rounds up, no exceptions. Being over on tarps costs storage; being under costs the town.

**Weeks of supply** — the sanity check, shown as a column:

```
weeks of supply = on hand ÷ V
```

Under 1.0 → red. 1.0–2.0 → amber. Over 8.0 → **flagged as overstock**, which is the other direction nobody watches and the one that quietly eats a small store's cash.

**Dead stock:** any item with 0 units sold in 90 days appears on a monthly "stop ordering this" list with the shelf space it occupies. `hq.html` already says it: *"Brand X paper towel: 2 sold in 90 days → Stop ordering. Free up the shelf."*

**Storm Mode changes exactly one input:** `min` becomes `stormMin`. The `ideal` formula stays put, so orders scale sensibly rather than exploding. This is why the design keeps `stormMin` as a *floor* rather than a *target*.

### 6.5 What the reorder screen looks like

Matching `hq.html`'s existing table, with two added columns:

| | Item | Dept | On hand | Min | Sells/wk | Weeks left | **Order** |
|---|---|---|---|---|---|---|---|
| 🔴 | Dog Food, 30 lb | Everyday | 3 | 8 | 6 | 0.5 | **Order 12** *(1 case)* |
| 🔴 | Fast-Setting Concrete, 50 lb | The Yard | 7 | 12 | 9 | 0.8 | **Order 30** *(1 pallet)* |
| 🟠 | AA Batteries, 8pk | Everyday | 6 | 10 | 9 | 0.7 | **Order 24** *(2 cases)* |
| 🟠 | 2×4×8 Pressure Treated | The Yard | 9 | 10 | 7 | 1.3 | **Order 16** |
| 🟠 | Structural Screws 3", 50ct | Fix It | 5 | 6 | 3 | 1.7 | **Order 7** |

Red = at or below half of minimum, or zero. Amber = at or below minimum.

Every quantity is editable inline. Nothing is ever ordered without a human looking at it.

### 6.6 What "Create this week's orders" actually does

**Be honest about a real constraint:** Square's *Purchase Orders* feature (a Retail Plus capability) does not, as far as can be determined, expose a public write API. The Vendors API exists for supplier records **[VERIFY both of these before building — this is the single most likely thing in this document to have changed]**.

So the button is designed to work either way, and to degrade to something genuinely useful rather than something broken:

| If... | The button does |
|---|---|
| **A PO write API exists** | Creates draft POs in Square, grouped by vendor, with cost and quantity per line. Carrie reviews and sends from Square. This is the ideal and the demo's copy assumes it. |
| **No PO write API** *(assume this)* | Produces, per supplier, all four of: **(a)** a printable order sheet, **(b)** a vendor-formatted CSV, **(c)** a pre-written email to the rep with the CSV attached, sitting in drafts awaiting one click, **(d)** a deep link into Square's PO screen pre-filtered to that vendor's low-stock items. Then it records the order in a local `on_order` ledger so the reorder math subtracts it next week. |

**The `on_order` ledger is the part that matters** and it's easy to skip. Without it, HQ nags for dog food again next Sunday because the truck hasn't arrived, Carrie orders it twice, and now there are 24 bags of dog food. Whether POs live in Square or in our ledger, `O` (on order) must be real, and receiving must clear it.

**Cost estimates** shown on the cards come from `default_unit_cost` in Square where present, and fall back to a department-typical margin assumption **[ASSUMPTION: ~38% blended retail margin, i.e. cost ≈ 62% of price — which is the factor the `hq.html` demo already uses]**. Real cost beats an assumption; this is one more argument for filling in the Cost field every time.

### 6.7 The four numbers on the HQ header

Already right in the demo:

| Cell | Source | Why it's there |
|---|---|---|
| **Sales today**, split Merc / Kitchen | Square Orders, category rollup | The kitchen split is the whole point — it answers "is the food thing working?" which is the biggest open question in the business plan. |
| **Transactions** + average ticket | Square Orders | Traffic vs. basket size. Two very different problems with two very different fixes. |
| **Needs reordered** | Live from `catalog.json` | The one-glance "is today normal?" |
| **Requests waiting** | Requests store | Keeps §8 from silently dying, which is what happens to every suggestion box ever installed. |

---

## 7. Bakery and Kitchen

### 7.1 Why food is a different problem

Retail inventory is **perpetual**: a can of chili sits there until someone buys it, and the count carries forward forever. Food inventory is **daily and perishable**: twelve cinnamon rolls exist at 6am, sell down to zero, and tomorrow there are twelve new ones with no relationship to yesterday's. Applying retail logic to a cinnamon roll produces "-3 in stock" and a reorder alert for a supplier that doesn't exist.

So the kitchen runs on three different models, and knowing which is which is the entire design:

| Model | Applies to | Count behavior | Website shows |
|---|---|---|---|
| **Counted** (`avail:"count"`) | Bakery rack, Grab & Go | Set each morning, decrements per sale, **resets at open**, sold out at 0 | `12 left today` → `Sold out` |
| **Made to order** (`avail:"made"`) | Breakfast, Lunch, Coffee | No count. Available whenever the kitchen is open. | Price, or `Kitchen closed` |
| **86'd** (`avail:"off"`) | Anything, temporarily | Manual toggle when an ingredient runs out | `Not today` |

The demo encodes this as `q:99` for made-to-order items. Replace that sentinel with the explicit `avail` field before launch (§3.3) — a magic number will eventually be rendered as "99 left," and it will be on the day a reporter takes a screenshot.

### 7.2 How it's implemented in Square

| Model | Square configuration |
|---|---|
| **Counted** | Item with **Track inventory: ON**. Stock is *set* (not received) each morning from the counter iPad — Square for Retail's stock adjustment, reason "Bake." Sales decrement it. At 0, Square Online marks it sold out automatically. |
| **Made to order** | Item with **Track inventory: OFF**. Always sellable at the register. Availability on the website is computed from `STORE.kitchen` hours, which `site.js` already does. |
| **86'd** | Toggle "Available at this location" **off** on the item. Takes one tap, works instantly at the register *and* on Square Online, and requires no separate system. |

**Do not build ingredient-level depletion.** Not "12 rolls consumes 3 lb of flour." Recipe-level inventory is where small-restaurant tech projects go to die: it requires perfect yields, perfect waste logging, and perfect prep tracking, and the moment any of those slips the numbers become fiction that people then stop trusting for anything. Carrie orders flour when the flour shelf looks low. That is correct and it should stay that way.

### 7.3 The morning count

Card ① of the morning routine (§6.2). Six numbers, tapped as trays come out.

- Bakery items default to their **usual bake** (a per-item `tr_par_bake`), so a normal Wednesday is *confirm six defaults* rather than *type six numbers*.
- Anything not baked today gets **0**, which the website renders as **Sold out** — which is honest and, importantly, is also a marketing signal. `bakery.html` already leans into this: *"Come earlier tomorrow."*
- Mid-morning corrections are one tap. Second batch of biscuits → tap `+6`.

The homepage board already sums this: `TR_BAKERY.filter(b => b.cat === "bakery").reduce((a,b) => a + b.q, 0)` → "On the bakery rack: 47 left." That single number is one of the best things on the site — it's a live, specific, checkable reason to drive over now instead of later.

### 7.4 Pickup order timing

Configured once in Square Online, then never touched:

| Setting | Value | Why |
|---|---|---|
| Fulfillment | **Pickup only** | No delivery at launch, per the decisions. |
| Ordering window | Opens 4:30am, closes 1:30pm | Kitchen runs 6am–2pm (`STORE.kitchen`). Closing orders 30 min before the kitchen closes protects the last ticket. |
| Minimum lead time | **20 minutes** | Enough for a sandwich; short enough to be useful to someone leaving Newport. |
| Slot granularity | **15 minutes** | Matches `bakery.html`'s existing time picker. |
| Slot capacity | **4 orders per 15-min slot** [ASSUMPTION — tune after two weeks] | One person on the griddle. Six orders landing at 7:15 is how a 7:30 pickup becomes 7:55 and a customer stops ordering ahead. |
| "As soon as it's ready" | Enabled, quotes live | Already the first option in the demo's picker. |
| Next-day ordering | Enabled, one day out | The demo's Today / Tomorrow toggle. |
| Auto-accept | On, during kitchen hours | Nobody should have to acknowledge orders during a rush. |
| Ready notification | SMS via Square | The demo already promises this: *"texts you when it's ready."* |

**Where the ticket goes.** Order lands → Square Orders → **prints on the kitchen impact printer** (category-routed: Bakery + Kitchen items print in the kitchen; retail items on the same order print at the counter) → Carrie sees requested time and name at the top of the ticket → marks Ready on the Stand → Square texts the customer → the bag goes on the pickup shelf with the ticket stapled on.

**The retail add-on.** `bakery.html` already offers *"While you're here…"* — milk, ice, dog food, AA batteries. Those lines print on the **counter** ticket, not the kitchen ticket, so Eric pulls them while Carrie cooks and both halves of the order meet at the pickup shelf. This is a small routing detail that makes the ordering experience feel like one store instead of two.

### 7.5 The daily reset

Cron at 03:30 daily:

1. Any counted bakery/grab item still above 0 from yesterday → set to 0, reason **"End of day."**
2. Log yesterday's ending count as **waste** if it was above 0 at close.
3. Clear any 86 flags set the previous day (so a missing ingredient doesn't silently hide an item for a week).
4. Publish the reset to `catalog.json` so the overnight website shows an honest empty rack.

That waste log — baked vs. sold, per item, per day — is the single most valuable number in the kitchen, and it comes free from doing steps 1 and 2:

| Item | Avg baked | Avg sold | Sell-through | Read |
|---|---|---|---|---|
| The Twisted Root | 12 | 11.6 | 97% | **Bake more.** Selling out by 9am is lost revenue, not a win. |
| Siletz River Sourdough | 8 | 5.1 | 64% | Bake 6. |
| Marionberry Hand Pie | 10 | 9.8 | 98% | **Bake 14.** |
| House Biscuits, ½ dz | 9 | 4.2 | 47% | Bake 6, or make it weekend-only. |

Sell-through above ~92% consistently means demand is being left on the counter. Below ~65% means dough in the compost. **Target band: 80–90%.** That one table, reviewed monthly, is worth more than any analytics package.

---

## 8. The customer request pipeline

### 8.1 Why this is a real system and not a suggestion box

Every store has a suggestion box. Nearly all of them are theater, and customers know it. What makes `TR_REQUESTS` different — and what makes the "You Asked, We Got It" section on the homepage work — is that requests are **counted, visible, and closed the loop on in public**. `hq.html`'s framing is exactly right: *"When something crosses about five requests, it's usually worth a shelf."*

The strategic point: in a store this size, the request board *is* the merchandising strategy. Carrie and Eric cannot out-guess what 1,200 people in Siletz need. They can count.

### 8.2 Intake

Three doors, one pipe:

| Source | How | Already exists? |
|---|---|---|
| **Website — "Tell us"** | `tellUsModal()` in `site.js`; item, brand, name, contact | ✅ built |
| **Website — failed search** | Zero-result search offers *"Tell Carrie & Eric"* pre-filled with the query | ✅ built — and this is the highest-signal source, because it's an unprompted statement of intent |
| **The counter** | Notepad by the register, typed into HQ on Sunday | Manual, and should stay manual |
| *Later* | An out-of-stock "Hold it" that fails converts to a request (§1.3 step 3) | Build it |

**Zero-result searches are logged automatically even without a submission.** Query text, timestamp, hashed IP. If forty people search "propane refill" in a month and none submit the form, that is louder than four people who did. This is nearly free to build and it is the best data the website produces.

### 8.3 Deduplication

The hard part. "Purina Pro Plan 35lb", "purina pro plan dog food", "the blue bag purina", and "Pro Plan large breed" are one request.

**Pipeline:**

```
raw text
  ↓ 1. NORMALIZE      lowercase · strip punctuation · collapse whitespace
  ↓ 2. EXTRACT SIZE   pull "35 lb", "12 oz", "3pk" into a size field, out of the name
  ↓ 3. STOPWORDS      drop: the, a, some, please, can you get, do you have,
  ↓                        would love, any chance, we need
  ↓ 4. SINGULARIZE    batteries→battery · boots→boot
  ↓ 5. ALIAS TABLE    hand-maintained, ~150 rows, the real workhorse
  ↓                   "pro plan"|"purina pro"|"blue bag purina" → purina_pro_plan
  ↓                   "half and half"|"half n half"|"1/2 & 1/2" → half_and_half
  ↓ 6. FUZZY MATCH    trigram similarity vs open requests; ≥ 0.82 → same request
  ↓ 7. REVIEW QUEUE   0.65–0.82 → HQ asks "same thing?" (one tap, and the answer
                      writes a new alias row, so the table teaches itself)
```

**The alias table is the whole system.** Fuzzy matching alone will merge "cat food" and "dog food" (high trigram overlap) and split "Pro Plan" from "Purina" (low overlap). A hand-maintained alias list, grown one tap at a time from the review queue, beats any clever algorithm at this scale. Budget ~150 rows in the first year, most added in the first eight weeks.

**Counting distinct askers, not submissions.** The count that matters is **distinct people**. Dedupe by, in order: phone number (normalized to 10 digits) → name + coarse IP → session. One enthusiastic person submitting six times is a 1, not a 6. Otherwise the board is trivially gameable and, worse, honestly misleading.

### 8.4 From count to shelf decision

**Threshold: 5 distinct askers**, matching the demo's language. It's not a rule, it's a trigger for a human to look.

| Status | Meaning | Public? | Renders as |
|---|---|---|---|
| `new` | Under threshold, uncounted | **No** | — |
| `thinking` | Crossed threshold, Eric's looking at margin/supplier/shelf | **Yes** | *Looking into it* |
| `ordered` | On a PO | **Yes** | *On order* |
| `stocked` | On the shelf, linked to a Square SKU | **Yes** | *Now stocked* |
| `declined` | No — no supplier, no margin, no space, or wrong store | **No** | — |
| `merged` | Folded into another request | No | — |

These map exactly onto `paintRequests()` in `site.js`, which already renders `stocked` / `ordered` / `thinking`.

**Decisions get made on Sunday, five minutes, in the reorder routine.** For anything at threshold, HQ shows: ask count, first-ask date, whether a supplier already in the mix carries it, estimated margin, and where it would physically go. Four data points, one decision.

**Saying no is a feature.** `declined` requests disappear from the public board rather than sitting at "thinking" for eight months. The demo copy sets exactly the right expectation: *"We're not promising to order everything — but if enough neighbors ask, it goes on the shelf."*

### 8.5 Closing the loop

When a request flips to `stocked`:

1. **A Square SKU must be attached.** Enforced. This makes the public card link to a live item with a live stock number — the "You Asked, We Got It" section proves itself continuously instead of being a static claim.
2. **Everyone who left contact info gets one text.** *"You asked for Purina Pro Plan 35 lb — it's on the shelf in Aisle 4 as of today. — Twisted Roots"* One message. No list, no marketing, no unsubscribe fatigue. This is the highest-return message the business will ever send.
3. **The note field gets a location.** `"Aisle 4, since June."` — exactly the demo's format. The note is what makes the board feel like a person wrote it.
4. **A 6-month review.** If a stocked-by-request item sells fewer than 6 units in 6 months, it goes on the dead-stock list like anything else. Being requested doesn't grant permanent shelf immunity — and knowing which requests panned out makes the next round of decisions better.

### 8.6 Storage

A single table. SQLite on the Worker (D1), or a JSON file in KV — at Twisted Roots' volume (**[EST]** 10–40 requests/month), either is fine.

```
requests
  id · canonical_key · display_name · brand · size
  ask_count · first_asked · last_asked
  status · status_note · square_sku · decided_by · decided_at
  askers[] { name, contact, source, at, contact_hash }
```

`requests.json` — the public projection, statuses `thinking|ordered|stocked` only, contact info stripped — is published by the same sync that writes `catalog.json`.

---

## 9. Reporting that actually matters

### 9.1 The five numbers

Square will offer roughly sixty reports. Here are the five that should ever be looked at, why, and how often.

| # | Number | Where | How often | What it answers | Act when |
|---|---|---|---|---|---|
| **1** | **Sales by department**, kitchen split out | Square Reports → Sales by Category | Weekly | *What is this store actually?* Is it a hardware store with a griddle or a café with a lumber rack? The answer determines every future decision about space, hours, and money. | Any department's share moves >5 points in a month |
| **2** | **Gross margin dollars by department** | Square, requires Cost filled in | Monthly | *Where does the money come from?* Not percentage — **dollars**. The Yard has thin margins and moves real volume; Local has fat margins and moves little. Percentage alone will talk you into the wrong shelf. | A department's margin dollars fall while its space stays the same |
| **3** | **Out-of-stock hours on the top 100 sellers** | HQ, computed from `catalog.json` history | Weekly | *What sales did we lose without ever knowing?* This is the number no POS reports and it is the most expensive blind spot in small retail — an empty peg is silent. | Any top-100 item is out more than 24 hrs in a week |
| **4** | **Transaction count and average ticket** | Square, HQ header | Daily glance, weekly think | *Traffic problem or basket problem?* Fewer people is a marketing problem. Same people spending less is a merchandising problem. Completely different fixes. | Either moves >10% for two weeks running |
| **5** | **Cash after vendors and draws** | The bank, plus Square's deposit report | Weekly, Sunday | *Are we OK?* A profitable store can still die of a $9,000 inventory buy in a slow month. Retail failure is nearly always a cash-timing failure, not a profit failure. | Below 3 weeks of operating expenses |

Two supporting lists, monthly, five minutes each:

| List | Question |
|---|---|
| **Dead stock** — 0 sold in 90 days | What is this shelf costing us? |
| **Bakery sell-through** (§7.5) | What are we throwing away, and what are we running out of? |

### 9.2 What to actively ignore

Ignoring reports is a skill. These will all be available, several will be prominent, and none of them should change a decision at this store:

| Ignore | Why |
|---|---|
| **Website bounce rate / sessions / pageviews** | The website's job is to prevent a wasted 27-minute drive. A visitor who checks stock and *doesn't* come — because we're out — is a **success**. Traffic metrics score that as failure. |
| **Social followers, likes, reach** | Not correlated with anything at this scale. |
| **Inventory turn ratio** | Correct concept, useless framing for two owners. **Weeks of supply** (§6.4) says the same thing in a unit a human can act on. |
| **Labor cost %** | Every benchmark is built on chain retail with hourly staff. Two owners taking draws break the formula entirely. |
| **Conversion rate** (any flavor) | There's one door and no funnel. |
| **Hourly sales heatmaps** | Interesting exactly once. Hours are set by what a small town needs, not by a heatmap. Look at it in month 3, then never again. |
| **Customer directory growth / retention cohorts** | It's a town of ~1,200. Carrie knows the customers by name. The directory is worse data than her memory. |
| **Category performance vs. "industry benchmarks"** | There is no benchmark for a mercantile-plus-bakery-plus-lumber-rack in a coastal town of 1,200. Comparing to one produces bad decisions with a confident tone. |
| **Anything requiring a date-range picker to interpret** | If understanding it takes configuration, it will not survive contact with a Tuesday. |

### 9.3 The weekly one-pager

Sunday 6pm, automated, one email. Text, not a dashboard link — a link is a thing you have to go to, and things you have to go to stop getting gone to.

```
TWISTED ROOTS — WEEK OF AUG 12
────────────────────────────────────────────
SALES              $18,240   ▲ 6% vs last week
  Merc              $11,890   65%
  The Yard           $2,410   13%
  Kitchen + Bakery   $3,940   22%
TICKETS                 587   avg $31.07  ▲ $1.49

MARGIN DOLLARS       $6,780   ▲ 4%
  Best:  Local        62% margin, $1,240
  Worst: The Yard     19% margin, $458

OUT OF STOCK          3 top-100 items, 41 hours total
  Dog Food 30lb (19h) · AA Batteries (14h) · Fast-Set (8h)

BAKERY               487 baked · 421 sold · 86% sell-through
  Sold out early:  Hand Pies (9:20am avg) — bake more
  Left over:       Biscuits (4/day avg)   — bake fewer

REQUESTS             3 new · 1 at threshold
  → Crab bait + rings (7 asks) needs a decision

ORDERS TO PLACE      4 suppliers · 61 lines · ~$4,180 est
  Open HQ when you're ready.
```

Nine lines a human actually reads. Every one connects to an action.

### 9.4 Month 6+ — when it starts recommending

Once ~26 weeks of history exists, the same data supports recommendations rather than just reporting. `hq.html` already lists the shape of these, and they're all straightforward queries — no machine learning, no vendor, no subscription:

| Observation | Recommendation | Query behind it |
|---|---|---|
| Milk sells 14 gal/wk, low variance | *Hold at 14. Don't grow it.* | Velocity + coefficient of variation |
| AAA sells 2× C | *Cut C to a half-facing, double AAA* | Velocity ratio within a class |
| Flashlights spike 3 days before wind events | *Flip Storm Mode Thursday, not Saturday* | Sales joined to the storm audit log |
| Pet food heavy Fri–Sun | *Face it Thursday night* | Day-of-week distribution |
| Poster board spikes late August | *Move it to the register Aug 15* | Year-over-year seasonality (needs year 2) |
| Brand X paper towel: 2 in 90 days | *Stop ordering. Free the shelf.* | Dead stock |
| Deck screws + PT lumber co-occur on 61% of tickets | *Put them on the same endcap* | Market-basket co-occurrence |
| Tuesday 2–4pm is 4% of weekly sales | *Bake, receive, and count then* | Hourly distribution — the one legitimate use |

### 9.5 On loyalty programs

Square Loyalty is ~$45/mo **[VERIFY]** and it's the most tempting unnecessary purchase in the stack. Skip it, for a specific reason: loyalty programs solve *"customers forget you exist and go to a competitor."* In Siletz, the nearest real competitor is 27 minutes away in Newport, and Carrie already knows everyone's name. The program would cost $540/year to formalize something that already works better informally.

**Revisit if** a competitor opens locally, or the customer base grows past the point where the owners recognize faces. Those are the actual trigger conditions.

---

## 10. Security, permissions, PCI, backups, and the lights going out

### 10.1 Accounts

| Account | Owner | 2FA | Recovery | Notes |
|---|---|---|---|---|
| Square (merchant) | Carrie — **account owner** | **Required**, authenticator app | Codes printed, in the safe | Eric gets a full-permission team account, **not** the owner login |
| Square Developer app | Builder | Required | — | Separate from the merchant account |
| Domain registrar | Carrie | Required | Codes in the safe | **Registrar lock ON.** A lost domain is unrecoverable in practice. |
| Cloudflare | Carrie owner, builder admin | Required | — | |
| Business bank | Carrie + Eric | Required | — | |
| Google Business Profile | Carrie | Required | — | Hours, address, photos — the single highest-traffic thing about the business |
| Business email | Carrie + Eric | Required | — | Google Workspace ~$7/user/mo **[VERIFY]** |
| Password manager | Both | Required | — | 1Password/Bitwarden family plan, ~$3–5/mo **[VERIFY]**. Non-negotiable. |

**Rules:** no shared logins, ever. No credentials in text messages. No credentials in the code repository — enforced with a pre-commit secret scanner. **Carrie owns every account, not the builder** — this is the clause that prevents the classic small-business disaster where the person who set everything up moves away and takes the store's identity with them.

### 10.2 Square permissions

| Role | Who | Can | Cannot |
|---|---|---|---|
| **Account owner** | Carrie | Everything, including banking | — |
| **Full permissions** | Eric | Everything operational | Change bank deposit account |
| **Manager** *(future)* | First real hire | Sell, refund with a reason, receive POs, adjust stock, set bake counts | See cost/margin, change prices, see banking, export the customer list |
| **Cashier** *(future)* | Part-time | Sell, no-sale drawer open | Refund without a manager PIN, discount above 10%, adjust stock, see any report |
| **Sync (API)** | `tr-sync` token | **Read only:** `ITEMS_READ`, `INVENTORY_READ`, `ORDERS_READ`, `MERCHANT_PROFILE_READ` | Write anything, ever |
| **Hold writer (API)** | `tr-hold` token | `ORDERS_WRITE`, `ORDERS_READ` only | Touch catalog or inventory |

**Two separate API tokens, deliberately.** If the public website's hold endpoint is ever compromised, the attacker can create junk orders — annoying, visible, cleaned up in ten minutes. They cannot change a price, zero out inventory, or read the sales history. A single all-scopes token would turn a nuisance into a catastrophe. Cost of the split: about twenty minutes of setup.

Per-person PIN codes on the POS from the first employee. Square Team Plus (~$35/mo) becomes worth it on that same day, not before.

### 10.3 Application security

| Surface | Control |
|---|---|
| `hq.twistedrootsmerc.com` | Cloudflare Access, email OTP, allow-list of exactly two addresses, 12-hour sessions. **No password to remember, no password to phish.** |
| `sync.twistedrootsmerc.com/hooks/square` | HMAC-SHA256 signature verification, constant-time compare, 401 + log on mismatch |
| `POST /hold` | Cloudflare Turnstile, rate limit 5/IP/hour, name ≤ 60 chars, phone validated to 10 digits, quantity capped at 12 |
| `POST /request` | Turnstile, rate limit 3/IP/day, 200-char cap, profanity + URL filter before it can ever reach the public board |
| API tokens | Cloudflare secrets, never in the repo, rotated annually and immediately on any staff change |
| Site headers | Strict CSP, HSTS with preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| Dependencies | Static site with **zero** runtime npm dependencies — the demo is vanilla JS and it should stay vanilla. The largest supply-chain attack surface in modern web development is simply absent. |

### 10.4 PCI scope

**The single most important architectural fact in this document: no system built for Twisted Roots ever touches a card number.**

| Where cards happen | Who handles it | Our exposure |
|---|---|---|
| At the counter | Square Register — hardware-encrypted, P2PE | **Zero** |
| In the Yard | Square Terminal | **Zero** |
| Bakery pickup order | Square Online hosted checkout, on Square's domain | **Zero** |
| "Hold it" | **No payment at all** — pay at the counter | **Zero** |
| Phone orders | Manual invoice via Square, or pay at pickup | **Zero** |

**No card field appears on any page we write.** No iframe we style, no tokenization we implement, no Square Web Payments SDK on our origin. The hold form collects a name and a phone number. That is the entire reason PCI is a paragraph in this document instead of a chapter.

**Consequences:**
- Square is a PCI-DSS Level 1 service provider and carries the compliance burden for the payment path **[VERIFY current attestation]**.
- Twisted Roots will still likely need to complete a self-assessment questionnaire — the lightest applicable one, given no card data is stored, processed, or transmitted by any merchant-controlled system beyond validated hardware. **[VERIFY the exact SAQ type with the acquirer — this is not a determination to make from a planning document.]**
- The **network segmentation in §2.4 is the one thing that could break this.** Guest Wi-Fi on the same flat network as the POS drags the whole network into scope. Three VLANs. Non-negotiable.
- If anyone ever writes a card number on a piece of paper, all of the above is void. Written policy, day one: **cards are never written down, ever, for any reason.**

### 10.5 Backups

Square backs up Square. These backups protect against **operator error**, which is by far the more likely disaster: a bad CSV import, a mis-scoped bulk price edit, an accidental category delete at 6:40am.

| What | When | Where | Keep | Restores what |
|---|---|---|---|---|
| Full catalog JSON (items, variations, custom attrs, categories, vendors) | Nightly 02:15 | Cloudflare R2 | 90 days | A botched bulk edit |
| Inventory counts, all items | Nightly 02:15 | R2 | 90 days | A botched bulk adjustment |
| Orders, prior 24h | Nightly 02:15 | R2 | 400 days | Sales history if an export is ever needed |
| Requests DB | Nightly | R2 | Forever — it's small | The request board |
| Storm audit log | On change | R2 | Forever | Storm decision history |
| Site source | Every commit | GitHub, private | Forever | The site |
| Worker source + config | Every commit | GitHub, private | Forever | The sync layer |
| **Monthly CSV export** (catalog + inventory + sales) | 1st of month | **Google Drive + a physical USB drive kept off-site** | 7 years | Taxes, an insurance claim, or leaving Square entirely |

**The off-site physical copy matters** for a building on the Oregon Coast. Fire, flood, and burglary are all more likely than Square losing data.

**Restore drill: once, in month 2, for real.** Delete a test item, restore it from the backup, time it. An untested backup is a hope. Write down the actual elapsed time — that number is what tells you whether the procedure is usable at 6am with a line at the counter.

### 10.6 When the internet goes out

It will. Plan for it as routine, not emergency.

| Duration | What happens | Customer sees |
|---|---|---|
| **< 30 sec** | Cellular failover engages. Register may not even notice. | Nothing |
| **Minutes to hours** | **Square Offline Mode.** Card payments are accepted and stored on the device, then settled when connectivity returns. **[VERIFY current behavior, per-transaction and total limits, and the settlement window — Square has changed this more than once.]** Cash normal. Inventory decrements locally and syncs later. | Nothing at the counter |
| **Hours** | Square Online orders stop arriving. The website serves its last-good cached `catalog.json` and walks down the confidence ladder (§4.7): exact → banded → "call us." | An honest timestamp, then a phone number |
| **All day** | Paper backup (§10.8). Post a sign. Post to the Google Business Profile from a phone on cellular. | A sign on the door |

**Offline Mode carries real risk and it should be a conscious decision, not a default.** Cards taken offline are not authorized at the time of sale — if the card later declines, the store eats it. Set a conservative cap: **[ASSUMPTION]** $500 per transaction, $2,500 total offline, then cash-only. For a store with a $29.58 average ticket, that cap covers roughly 85 transactions — well past a normal outage — while bounding a bad day at a survivable number.

### 10.7 When the power goes out

This is the Oregon Coast. `storm.html` says it plainly: *"The power goes out here. It just does."* There's something almost absurd about a store selling emergency supplies that can't operate in an emergency — so don't be that store.

| Layer | Equipment | Runtime | Covers |
|---|---|---|---|
| **UPS 1** | ~1500VA at the counter | 30–60 min **[EST]** | Register, receipt printer, cash drawer |
| **UPS 2** | ~1500VA in the network closet | 45–90 min **[EST]** | Router, modem, cellular, one AP |
| **Phones** | Cell + a charged power bank | Hours | Calls, Square on a phone |
| **Generator** | Business decision — sized for coolers/freezers first | Hours to days | If it exists, the register circuit and the network closet go on it. Coolers first — inventory loss dwarfs a few missed transactions. |
| **Emergency lighting** | Battery, over the counter and the aisle | Hours | Safety, and the ability to keep selling |

**The 20-minute rule.** In the first twenty minutes on UPS, the store is fully normal — ring sales, take cards, don't announce anything. If power isn't back at twenty minutes, switch deliberately to the paper procedure while the UPS still has charge for a clean shutdown. Making the switch *early*, with power still in reserve, is what keeps it calm.

**A genuine opportunity, not just a contingency:** a power outage is the highest-demand hour Twisted Roots will ever have. The neighbors need batteries, flashlights, water, and propane *right now*, and every other store is either closed or 27 minutes away. Being the store that stays open with a cash box and a headlamp is worth more than a month of advertising. Everything above exists to make that possible.

### 10.8 The paper procedure

Printed, laminated, taped inside the counter cabinet. Not in a binder — on the cabinet door.

```
POWER OR INTERNET IS OUT — WHAT TO DO
─────────────────────────────────────────────────────────
1. FLIP THE SIGN:  "OPEN — CASH ONLY, WE'RE ON PAPER"
2. Get the CASH BOX and the CARBON RECEIPT BOOK (under the counter)
3. For every sale, write:
      date/time · items · price each · total · CASH or IOU · name
   Customer gets the yellow copy. White copy stays in the book.
4. Prices: use the shelf tag. If there's no tag, ASK ERIC.
   Do NOT guess a price and do NOT round up.
5. NO CARDS. NO CHECKS over $50 without a phone number.
6. Regulars can run a tab — write the name and phone. They're good for it.
7. Count the cash box at close. Write the number on the last page.
8. NEXT MORNING, BEFORE OPEN:
      Enter every white slip into Square as a normal sale
      Reconcile the drawer against the total
      Note any difference and move on — don't hunt $3 for an hour
─────────────────────────────────────────────────────────
Square support: 1-855-700-6000     Internet: ______________
Power (Central Lincoln PUD): ______________
```

**Why the next-morning entry is mandatory, not optional:** paper sales that never get entered mean inventory counts silently drift, which means the website starts lying, which is the one thing this whole system is built not to do. One outage's worth of unentered slips can poison the reorder math for a month.

### 10.9 Daily reconciliation

Ninety seconds at close, every day, no exceptions.

1. Count the drawer. Type the number into Square's close-of-day.
2. Square reports the expected amount and the variance.
3. Variance under **[ASSUMPTION]** $5 → note it, move on. Over $5 → check the last few transactions for a keying error, then move on.
4. Cash goes to the safe; a fixed float stays in the drawer.
5. Weekly: variance trend. A drifting variance is a training issue or a theft issue, and the trend surfaces it long before any single day does.

---

## 11. Phased rollout

Owners: **C** = Carrie · **E** = Eric · **B** = Builder (technical) · **V** = Vendor/installer

### 11.1 Pre-opening: weeks −8 to 0

#### Weeks −8 to −6 — Foundations

| Task | Owner | Done when |
|---|---|---|
| Open the Square account; confirm business/bank details; enable 2FA | C | Square dashboard live, deposits test-verified |
| Create the Siletz **location** (both addresses noted: 101 & 151 N Gaither) | C | Location exists, hours match `STORE.hours` |
| Order all day-one hardware (§2.3) — **long lead items first** | E + B | POs placed; Register, Terminal, Stand confirmed shipping |
| Confirm internet serviceability at 151 N Gaither; order primary + cellular failover | E | Install date scheduled |
| Register `twistedrootsmerc.com`; registrar lock + 2FA; Cloudflare nameservers | B | DNS resolving |
| Create the **seven Square categories** exactly matching `TR_DEPTS` | C + B | 7 categories, no more |
| Create the **class list** (§3.4) by walking the actual floor plan | C + E | Frozen class list, ~40 codes |
| Create the **custom attribute definitions**: `tr_min`, `tr_ideal`, `tr_case_qty`, `tr_storm_min`, `tr_aisle`, `tr_tags`, `tr_maker`, `tr_web`, `tr_par_bake` | B | Visible on the item screen |
| Set up Square **Vendors** with lead times | E | 5+ vendors |
| Password manager, shared vault, every account in it | C + E | All logins stored |

#### Weeks −6 to −4 — The catalog (this is the hard part)

**Reality check:** 2,000 SKUs at 90 seconds each is **50 hours of typing.** This is the largest hidden cost in the entire project and the single most common reason store openings slip. Attack it deliberately.

| Task | Owner | Done when |
|---|---|---|
| Get **vendor catalog files** from every distributor (CSV/Excel with UPC, description, cost, case qty) | E | Files in hand from 4 of 5 |
| Build a **normalizing import script**: vendor CSV → Square CSV, applying naming rules (§3.5) and generating SKUs (§3.4) | B | Runs clean on a 50-row sample |
| Import in **department batches**, review each batch before the next | B + C | 7 clean imports |
| Hand-enter the remainder: lumber, local makers, own merch, oddballs — **[EST] ~350–450 items** | C + E | All departments complete |
| Fill `tr_tags` for **every Fix It and Storm item** — 6+ tags each | C | Zero Fix It/Storm items with <3 tags |
| Set `tr_storm_min` on all Storm Ready + the storm-relevant Everyday/Fix It items | E | ~60 items carry a storm min |
| Print and apply **shelf labels** | C + E | Every facing labeled |
| Photograph every item that will show on the website | C | Photos on ≥90% of web items |
| Set opening quantities (**receive** them, don't "adjust" — receiving creates the cost basis) | E | On-hand matches the physical count |

**Sequencing note:** do the naming and SKU conventions *before* the first import, not after. Renaming 2,000 items later is not a task, it's a project.

#### Weeks −4 to −2 — The technology

| Task | Owner | Done when |
|---|---|---|
| Install network, VLANs, APs, UPS units | V + B | Yard has coverage; failover tested by unplugging the WAN |
| Set up Register, Stand, Terminal, printers, drawer, scanners | B | Full test transaction on each device |
| Configure kitchen printer **category routing** | B | A test order prints in the kitchen; retail lines print at the counter |
| Build & deploy `tr-sync`; subscribe webhooks; verify signatures | B | `catalog.json` publishing on real data |
| Convert the site from `catalog.js` to fetching `catalog.json` | B | Site renders live Square data |
| Implement the confidence ladder (§4.7) | B | Ladder verified by manually aging `generated_at` |
| Build `tr-hold`; test end-to-end to a printed slip | B | Hold prints at the counter |
| Build HQ: needs-attention, supplier grouping, storm button, requests | B | Reorder math matches a hand calculation on 10 items |
| Cloudflare Access on `hq.` — two emails only | B | Third address is denied |
| Square Online store on `order.` — bakery/kitchen only, pickup only | C + B | Test order paid, printed, texted |
| Monitoring + alerting (§4.8) | B | A forced failure produces an SMS |
| Nightly backup job | B | Two nights of snapshots in R2 |

#### Weeks −2 to 0 — Dress rehearsal

| Task | Owner | Done when |
|---|---|---|
| **Friends-and-family day.** Real transactions, real cards, real receipts. | C + E + B | 50+ transactions rung |
| **Run the whole day on the paper procedure** (§10.8), then enter it all next morning | C + E | Slips entered, drawer reconciled |
| **Pull the internet** during the rehearsal. Verify offline mode, verify the site degrades. | B | Ladder observed live |
| **Restore drill**: delete a test item, restore from backup, time it | B | Documented elapsed time |
| Flip **Storm Mode** on and off; verify all six effects (§5.3) | C | Every effect confirmed |
| Full cycle count of the whole store the day before open | C + E | Square matches the shelf |
| Google Business Profile: hours, address, photos, categories | C | Verified, live |
| Print and mount the paper procedure inside the counter cabinet | E | Laminated, taped |
| **Seed the requests board** with 6–8 real pre-opening asks | C | Board isn't empty on day one |

### 11.2 Opening week

**Rule for the week: nobody builds anything.** Every hour goes to running the store and fixing what breaks. Feature requests get written on a list and looked at in week three.

| Day | Focus | Owner |
|---|---|---|
| **Day 1** | Run the store. B on-site all day. Cash-only fallback rehearsed at open so everyone's calm about it. | All |
| **Day 1 close** | First real reconciliation. Compare Square's day total to the drawer and to the shelves. | C + E |
| **Day 2** | Fix whatever hurt on day 1. Usually: a mis-priced item, a printer that won't wake, a scanner that keeps disconnecting. | B |
| **Day 3** | First bakery sell-through read. Adjust the par bakes. | C |
| **Day 4** | Spot-count 50 fast movers against Square. **Expect discrepancies** — the fix is the process, not the number. | E |
| **Day 5** | First real reorder run through HQ. B watches Carrie do it and shuts up. | C + B |
| **Day 6** | Watch the website: are people searching things that return nothing? Every zero-result query is a merchandising note. | C + B |
| **Day 7** | The **honest retro**. What took too long? What did we look up twice? What almost made someone give up? | All |

**Watch specifically for:** items ringing at the wrong price (fix the tag *and* Square), items with no barcode slowing the line (label them that night), the kitchen printer running out of paper mid-rush (keep three rolls under the counter), and any moment where Carrie had to ask "where do I do that?" — that last one is the highest-value bug report the project will ever get.

### 11.3 First 90 days

**Weeks 2–4 — Make it habit**

| Task | Owner |
|---|---|
| Morning routine every single day until it's automatic | C |
| Sunday reorder every week without exception | C + E |
| Fix data quality as it surfaces: bad tags, wrong departments, wrong aisles | C |
| Tune minimums using the first real velocity data (§6.4) | B, reviewed by E |
| Tune bakery par bakes toward the 80–90% sell-through band | C |
| First alias rows in the request dedupe table | B |
| Kill anything nobody uses. **Removing an unused feature is a win.** | B |

**Weeks 4–8 — Tighten**

| Task | Owner |
|---|---|
| First full cycle-count cycle: one department per week, rotating | E |
| Turn on the weekly Sunday email (§9.3) | B |
| Ship the **out-of-stock hours** report — the #3 number, and the one nobody else has | B |
| First real "You Asked, We Got It" close-out, including the text to the askers | C |
| Review offline-mode caps against real ticket sizes | E |
| **First storm event** — flip it live, then write down what actually happened | C + E |

**Weeks 8–13 — Prove it**

| Task | Owner |
|---|---|
| First storm retrospective: which storm minimums were right, wrong, missing (§5.6) | E + B |
| Ship the NWS proposal feed (§5.5) | B |
| First 90-day dead-stock list, and actually clear it | C + E |
| First quarterly margin review by department (§9.1 #2) | C + E |
| Full restore drill again, this time with C or E driving | C or E |
| **90-day review:** what part of this plan was wrong? | All |

### 11.4 Month 6 and beyond

By month 6 there are ~26 weeks of velocity data, at least one storm, and one full seasonal turn. The system stops describing and starts suggesting.

| Month | What ships | Owner |
|---|---|---|
| 6 | **Reorder recommendations** — suggested min/ideal per item from real velocity, presented as a monthly accept/reject list | B |
| 6 | Storm-minimum recommendations from event data (§5.6) | B |
| 7 | Seasonal flags: poster board in August, ice in July, tarps in October, propane in December | B |
| 7 | Market-basket co-occurrence → endcap and kit suggestions | B |
| 8 | Bakery demand forecast by day-of-week and weather | B |
| 9 | Automatic dead-stock and overstock lists, monthly, in the Sunday email | B |
| 9 | **Delivery question revisited** — count actual demand signals (asks, distance, order value). Build a Tuesday/Friday run **only if the data says yes.** | C + E |
| 12 | Year-over-year seasonality — the first genuinely valuable YoY comparisons | B |
| 12 | **Annual review:** re-price every subscription, re-verify every **[VERIFY]** in this document, cancel anything unused | All |

**The month-6 test, in one sentence:** *Can Carrie place a week's orders in under ten minutes, mostly by accepting what the screen suggests?* If yes, the system works. If no, the reorder math needs another pass — not more features.

---

## 12. What Carrie and Eric actually have to do

*One page. Plain language. This is the page to print and stick on the office wall.*

### Every morning — about two minutes

1. Open **Twisted Roots HQ** on the counter iPad.
2. **Tap in today's bake numbers** as the trays come out. Six taps.
3. Glance at the **red rows** — anything at zero or nearly out.
4. Glance at **pickup orders** for this morning.

That's it. If nothing is red, that's the whole morning routine.

### Every time something new comes on the shelf — about ninety seconds, once

1. **Scan** the barcode on the counter iPad.
2. **Take the photo** right there on the shelf.
3. Type **name, cost, price**. Tap **department** and **supplier**.
4. Type three numbers: **minimum, ideal, case size**.
5. Tap the **aisle** it lives in, and type a few **words people would search for**.
6. **Save.**

It's now at the register, in inventory, and on the website. You never do this item again.

### Every delivery — about ten seconds a line

1. Open the **purchase order** on the iPad.
2. **Scan one item** from the box, type how many came.
3. Repeat down the truck. Done.

The website updates itself within about a minute.

### Every Sunday — about twenty minutes

1. Open **HQ → Order this week**.
2. Read down the list. **Change any number you disagree with.** You know things the computer doesn't.
3. Look at the **supplier cards** — they're already grouped and totaled.
4. Press **Create this week's orders**.
5. Read the **requests board**. Anything five or more neighbors asked for: order it, think about it, or say no.

### When the forecast turns

Press **Storm Mode**. One button.

Your reorder minimums jump to storm levels, the order screen regroups, the storm page on the website re-scales, and a banner goes up across the site. Press it again when it's over.

*(After month 3, the screen will also tell you when the National Weather Service posts a warning — and ask whether you want it on. It will never turn itself on.)*

### Every night at close — about ninety seconds

1. Count the drawer.
2. Type the number into Square.
3. Go home.

---

### What you will NEVER have to do

- ❌ **Never** update stock on the website. Not once. Not ever.
- ❌ **Never** keep a spreadsheet of inventory.
- ❌ **Never** enter the same product into two systems.
- ❌ **Never** learn a second piece of software.
- ❌ **Never** calculate how much to order. The screen already did.
- ❌ **Never** figure out which supplier gets which items. It's already grouped.
- ❌ **Never** manually mark a bakery item sold out. It happens when the count hits zero.
- ❌ **Never** write a website update, edit HTML, or call anybody to change a price.
- ❌ **Never** manage customer accounts, passwords, or logins. Customers don't have any.
- ❌ **Never** process a credit card by hand or write a card number down. Ever.
- ❌ **Never** read a report you didn't ask for.
- ❌ **Never** analyze anything at night.
- ❌ **Never** be woken up because a server had an error. If the website breaks, it quietly shows your phone number and the store keeps running.
- ❌ **Never** be locked out of your own business — **you own every account**, not the person who built it.

---

## 13. Total cost of ownership

*Every figure here is **[EST]** unless marked **[VERIFY]**. Nothing in this section is a quote.*

### 13.1 One-time setup

| Category | Low | High | Notes |
|---|---|---|---|
| **Hardware (day one, §2.3)** | $4,000 | $5,700 | Register, Stand+iPad, Terminal, 2 scanners, 2 printers, drawer, label printer, 2 UPS, router, 2 APs, cabling/install |
| **Network install** (drops, mounts, labor) | $600 | $1,200 | Old buildings surprise you |
| **Software build** — sync layer, HQ dashboard, site wiring, hold flow, requests pipeline, monitoring | $8,000 | $18,000 | **[EST]** ~80–140 hrs at $100–150/hr contract rate. Substantially less if built in-house or as a fixed-fee project — **state the actual arrangement rather than using this range as a budget line.** |
| **Catalog build labor** | $1,500 | $4,000 | **The hidden one.** ~50 hrs of data entry at an assumed $30/hr if hired out; free-but-exhausting if the owners do it. Vendor CSV imports cut it by roughly 70%. |
| Shelf labels, label stock, receipt/impact paper (initial) | $200 | $400 | |
| Domain, first year | $15 | $40 | |
| Signage tied to tech (hours, "cash only," pickup shelf) | $150 | $400 | |
| Professional photos of key products/departments | $0 | $1,200 | iPad photos are genuinely fine to start |
| Contingency @ 15% | $2,200 | $4,600 | |
| **TOTAL SETUP** | **~$16,700** | **~$35,500** | Midpoint ≈ **$26,000** |

**The honest read:** the hardware is a third of it, and the software build is the swing factor. A store that builds the website and dashboard in-house lands near the low end. One that contracts everything lands near the high end.

### 13.2 Monthly run rate

| Item | Monthly | Notes |
|---|---|---|
| **Square for Retail Plus** | **$89** | **[VERIFY]** Annual billing. $109 month-to-month. |
| **Square Online Plus** | **$29** | **[VERIFY]** Custom domain + order-ahead pickup |
| Internet (primary) | $80–165 | Wired if available; Starlink Business otherwise **[VERIFY]** |
| Cellular failover data | $25–50 | |
| Cloudflare Workers + R2 + KV | $5–10 | Workers Paid tier; R2 storage is pennies at this volume |
| Cloudflare Pages, Access (up to 50 users) | $0 | Free tier is genuinely sufficient |
| Domain (amortized) | $2 | |
| Google Workspace, 2 users | $14 | **[VERIFY]** ~$7/user |
| Password manager | $5 | **[VERIFY]** |
| Uptime monitoring | $0–20 | Free tier works |
| Accounting (QuickBooks/Wave + Square sync) | $0–35 | **[VERIFY]** |
| **SUBTOTAL, day one** | **~$250 – $420** | |
| *Later:* Square Team Plus | +$35 | First employee **[VERIFY]** |
| *Later:* Square Payroll | +$35 + $6/person | First W-2 **[VERIFY]** |
| *Later:* Square Marketing | +$15 | Month 6+ **[VERIFY]** |
| *Maybe never:* Square Loyalty | +$45 | §9.5 **[VERIFY]** |
| **Realistic year-one average** | **~$300/month** | ≈ **$3,600/year** |

**For context:** roughly the cost of one part-time shift per week, to run the entire technology stack of a seven-department store with a kitchen and a live website.

### 13.3 Payment processing

This is the real cost, and it dwarfs everything above.

**Published rates [VERIFY — these change]:**

| Type | Rate |
|---|---|
| In person, Square for Retail **Plus** | **2.5% + $0.10** |
| In person, free plan | 2.6% + $0.10 |
| Square Online / e-commerce | **2.9% + $0.30** |
| Manually keyed | 3.5% + $0.15 |
| Invoices | 3.3% + $0.30 |

**The per-transaction fee matters more than the percentage at this ticket size**, and that's a fact worth internalizing:

| Ticket | 2.5% | + $0.10 | Total | **Effective rate** |
|---|---|---|---|---|
| $5.00 | $0.13 | $0.10 | $0.23 | **4.6%** |
| $10.00 | $0.25 | $0.10 | $0.35 | **3.5%** |
| **$29.58** *(the demo's avg)* | $0.74 | $0.10 | $0.84 | **2.84%** |
| $75.00 | $1.88 | $0.10 | $1.98 | **2.64%** |
| $250.00 | $6.25 | $0.10 | $6.35 | **2.54%** |

**Implications:**
- **A $3 coffee costs $0.18 to process — 6% of the sale.** Coffee is a traffic driver, not a margin line, and this is why. It's an argument for a coffee punch card (paper, free) or for gently nudging small purchases toward cash — never a surcharge, which would be corrosive in a town this size.
- **Cash costs roughly nothing** (a small deposit fee, plus the real but unglamorous cost of counting and banking it). In rural Oregon, cash is likely 20–35% of tickets **[ASSUMPTION]**, and every one of those saves ~2.8%.
- The Retail Plus rate discount (2.6% → 2.5%) pays for the $89 subscription at about **$89,000/month in card volume [VERIFY the qualifying conditions]**. Below that, the subscription is justified by the inventory features — purchase orders, cost tracking, reorder points — not by the rate. That's the honest framing.

**Modeled monthly cost [ASSUMPTION-heavy — replace with real numbers in month 2]:**

| Assumption | Value |
|---|---|
| Monthly gross sales | $65,000 **[ASSUMPTION]** |
| Card share | 75% → $48,750 |
| Online (pickup) share of card | 6% → $2,925 |
| In-person card | $45,825 |
| Average ticket | $29.58 |

```
In person:  $45,825 × 2.5%              = $1,146
            ($45,825 ÷ $29.58) × $0.10  =   $155
Online:     $2,925 × 2.9%               =    $85
            (~40 orders) × $0.30        =    $12
                                          ───────
                          MONTHLY TOTAL ≈ $1,398   (~2.87% of card volume)
                           ANNUAL TOTAL ≈ $16,800
```

**Processing is roughly 4.6× the entire software bill.** Which is the point: obsessing over a $29 subscription while ignoring a $1,400 processing line is exactly backwards. The genuine levers on processing cost are **average ticket size** (attachment, kits, "while you're here…") and **cash share** — not the software stack.

### 13.4 Five-year view

| Year | Setup | Software | Processing | Hardware refresh | Total |
|---|---|---|---|---|---|
| 1 | $26,000 | $3,600 | $16,800 | — | **$46,400** |
| 2 | — | $4,200 | $18,500 | $500 | **$23,200** |
| 3 | — | $4,400 | $20,300 | $1,500 | **$26,200** |
| 4 | — | $4,600 | $22,300 | $800 | **$27,700** |
| 5 | — | $4,800 | $24,500 | $2,500 | **$31,800** |
| | | | | **5-yr total** | **~$155,300** |

**[ASSUMPTION]** 10% annual sales growth; 5% annual software price inflation; hardware refreshed on a ~4-year cycle.

**Sanity check:** roughly $31,000/year averaged, against **[ASSUMPTION]** $780,000/year in sales = **~4.0% of revenue**, of which 2.9 points is card processing that any store pays regardless of how it's built. The *discretionary* technology spend is closer to **1.1% of revenue** — which is a defensible number for a system that eliminates a spreadsheet, a second inventory system, and roughly an hour a day of owner time.

---

## 14. Appendices

### A. Glossary for Carrie and Eric

| Term | Plain English |
|---|---|
| **API** | The way one program asks another program a question. Our website asks Square "how many AA batteries?" |
| **Webhook** | Square tapping our system on the shoulder to say "something changed." |
| **Cache** | A saved copy, so the website is fast. Ours is a minute old at most. |
| **SKU** | Our own code for a product, like `EVR-BAT-0008`. The computer's name for it. |
| **Barcode / UPC** | The manufacturer's stripes. What the scanner reads. |
| **Sync** | The small program that copies Square's numbers to the website, every minute or so. |
| **Reorder point / minimum** | The number where you should order more. |
| **Par / ideal** | The number you refill *to*. |
| **Velocity** | How many you sell in a week. |
| **Lead time** | How long the truck takes. |
| **Weeks of supply** | How long what's on the shelf will last. Under 1 is trouble. |
| **Sell-through** | Of what we baked, how much sold. 80–90% is the target. |
| **PCI** | The credit card industry's security rules. We avoid nearly all of them by never touching a card number. |
| **Offline mode** | The register keeping working when the internet doesn't. |
| **Degrade gracefully** | The website saying "call us" instead of guessing wrong. |

### B. Things this plan deliberately does NOT do

| Not doing | Why |
|---|---|
| A mobile app | Nobody downloads a store's app. The website works on a phone. |
| Customer accounts | Nothing to log in *for*. Accounts mean passwords, resets, and a data-breach surface. |
| Subscriptions / memberships | Wrong business for it, and it creates recurring obligations for two people. |
| Delivery at launch | Pickup only. Revisit at month 9 **only** if the request data says so (§11.4). |
| Ingredient-level recipe inventory | §7.2. It fails and then poisons trust in everything else. |
| Real-time stock updates (sub-second) | A minute is invisible to a human and 100× cheaper. |
| Reserving inventory on a hold | §1.3. Creates phantom outages. |
| Auto-flipping Storm Mode | §5.5. The machine proposes; the human decides. |
| Dynamic/surge pricing | §5.3. Ends the relationship with the town. |
| A loyalty program at launch | §9.5. |
| Marketing automation at launch | Two owners. One text when a requested item lands is worth more than a drip campaign. |
| A second POS for the kitchen | §2.2. One system to learn. |
| Anything requiring a nightly manual export | If a human has to remember it, it will be forgotten in week four. |

### C. Open questions to resolve before building

| # | Question | Blocks | Owner |
|---|---|---|---|
| 1 | Does Square expose a **Purchase Orders write API**? | §6.6 button behavior | B |
| 2 | Exact **NWS zone and gridpoint** for Siletz — coastal, inland, or both? | §5.5 | B |
| 3 | Is there **wired internet** at 151 N Gaither, and at what speed? | §2.4, budget | E |
| 4 | Will anything be **sold by weight**? | Scale purchase + ODA licensing | C + E |
| 5 | Are **101 and 151 N Gaither one Square location or two**? | Inventory model, subscription count | C |
| 6 | Any **local tax on prepared food** in Lincoln County? | Tax config | C |
| 7 | Which **carrier** actually works inside the building? Test on site. | Failover | E |
| 8 | Current **Square for Retail Plus** price and whether the rate discount conditions still hold | Budget | B |
| 9 | Does **Square Online Plus** still gate custom domains + order-ahead scheduling? | §7.4 | B |
| 10 | Which **SAQ type** applies, per the acquirer? | §10.4 | C |
| 11 | Does the store carry **age-restricted goods** (beer/wine/tobacco)? | POS prompts, `tr_web` flags, compliance | C + E |
| 12 | Confirm **Square Offline Mode** limits and settlement window as currently implemented | §10.6 caps | B |

### D. Field reference — quick card

*Print this for the back room.*

```
ADDING A PRODUCT — the eight that matter
────────────────────────────────────────────────
  BARCODE     scan it
  NAME        Noun first, size after a comma
              "AA Batteries, 8pk"  not  "8pk AA"
  DEPARTMENT  Everyday · Fix It · The Yard · Storm Ready
              Outdoors · Local · Bakery + Kitchen
  COST        what we pay
  PRICE       what they pay
  SUPPLIER    who we order it from
  MINIMUM     order more when we hit this
  IDEAL       fill back up to this

  ALSO WORTH 10 SECONDS
  CASE QTY    how many come in a box
  AISLE       where it physically lives
  SEARCH WORDS  what people actually type
              (sharkbite · quikrete · band aid · two by four)
  STORM MIN   only for storm items
────────────────────────────────────────────────
  SKU is generated. Never type one.
```

---

*Twisted Roots Merc — Store-to-Website Technology Plan, v1.0*
*The customer experience is simple. The technology is invisible.*
*Good food. Good goods. Deep roots.*
