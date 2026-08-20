# Meta Plan — Twisted Roots Merc

What each page should say to Google, and what each page is actually trying to win.

Ground rules we are working under:

- Every title has **Siletz** or **Twisted Roots** in it. Nobody is beating Home Depot on "hardware store." Everybody can beat Home Depot on "Siletz."
- Titles stay under 60 characters and descriptions under 155, so Google shows the whole thing instead of cutting it off mid-sentence.
- The description is not a keyword list. It is the sentence that decides whether somebody in a truck taps the result or scrolls past. Put the useful fact in it — hours, distance, whether we have the thing.
- One H1 per page. The H1 is for the person; the title tag is for the search result. They do not have to match and mostly should not.
- `hq.html` is not in this plan. It gets no title work, no description, no indexing.

Current titles on the site are all 60 to 90 characters and get truncated in results. The recommendations below are shorter versions of the same idea, not a change of direction.

---

## The table

### index.html

| | |
|---|---|
| **Title** (49) | `Twisted Roots Merc — Store & Bakery in Siletz, OR` |
| **Description** (152) | Mercantile, bakery and kitchen in Siletz, Oregon. Groceries, hardware, lumber, storm supplies and breakfast from 6am. Check stock before you drive over. |
| **H1** | The stuff Siletz actually needs, when we need it. |
| **Primary keyword** | siletz oregon store |
| **Secondary** | general store siletz oregon · siletz mercantile · store near me siletz · twisted roots merc · what's open in siletz |

Note: the homepage is the page that has to win "siletz oregon store" and the brand name. It should not try to win "hardware" or "bakery" — those have their own pages, and pointing both at the homepage means neither one ranks.

---

### merc.html

| | |
|---|---|
| **Title** (52) | `Siletz Hardware & General Store — Twisted Roots Merc` |
| **Description** (149) | Hardware, plumbing, electrical, household and pet basics in Siletz, Oregon. The $7 part that saves the drive to Newport. Live stock off the register. |
| **H1** | The stuff you actually need. |
| **Primary keyword** | siletz hardware |
| **Secondary** | hardware store near me siletz oregon · plumbing parts siletz · general store lincoln county oregon · toilet flapper near me · hardware store open now siletz |

Note: "hardware store near me" is the highest-intent query on this whole site — somebody standing in a flooded bathroom. That intent is what the Fix-It Kits section serves, so keep the kits above the fold on mobile.

---

### bakery.html

| | |
|---|---|
| **Title** (46) | `Siletz Bakery & Breakfast — Twisted Roots Merc` |
| **Description** (142) | Breakfast from 6am, lunch till 2, coffee all day and a bakery rack baked every morning in Siletz, Oregon. See today's count, order for pickup. |
| **H1** | Bakery + Kitchen |
| **Primary keyword** | siletz bakery |
| **Secondary** | siletz breakfast · breakfast near me siletz oregon · siletz coffee · cinnamon rolls oregon coast · lunch in siletz oregon · bakery near newport oregon |

Note: this page carries three separate intents — bakery, breakfast, coffee. The section headings (Breakfast, Lunch, Coffee, Grab & Go) already split them properly. Anchor links to `#breakfast` and `#lunch` are worth putting in the Google Business Profile so those sections get their own path in.

---

### yard.html

| | |
|---|---|
| **Title** (55) | `Lumber & Concrete in Siletz — The Yard at Twisted Roots` |
| **Description** (150) | Framing lumber, pressure treated posts, fence pickets and fast-setting concrete, out back and under cover in Siletz. Check the racks before you drive. |
| **H1** | The Yard |
| **Primary keyword** | siletz lumber |
| **Secondary** | siletz concrete · fast setting concrete near me · pressure treated posts lincoln county oregon · fence pickets siletz · 4x4 post near me · where to buy concrete siletz oregon |

Note: the post-setting table is the best link bait on the site and it is already written. It is marked up as a HowTo in `schema-snippets.html`. Do not water it down into a generic "how to build a fence" article — the specific bit ("pour the fast-set in dry, then pour water on top") is why anybody would link to it.

---

### storm.html

| | |
|---|---|
| **Title** (46) | `Storm & Outage Supplies — Siletz, Oregon Coast` |
| **Description** (145) | Flashlights, batteries, lanterns, tarps, water and NOAA radios stocked in Siletz before the wind hits. Live storm supply status off the register. |
| **H1** | Storm Ready |
| **Primary keyword** | storm supplies oregon coast |
| **Secondary** | power outage supplies near me · generator fuel siletz · tarps near me oregon coast · d batteries near me siletz · emergency kit lincoln county oregon · is anything open during the power outage siletz |

Note: this page is seasonal and it is the single biggest traffic opportunity on the site. It should be fully live and indexed by **September 1** — before the first October system, not during it. Traffic here spikes at exactly the moment nobody has time to build a page.

---

### local.html

| | |
|---|---|
| **Title** (48) | `Oregon-Made Goods in Siletz — Twisted Roots Merc` |
| **Description** (145) | Honey, stoneware, candles and soap from makers within an hour of Siletz, plus Twisted Roots hats and stickers. Every maker is somebody we've met. |
| **H1** | Local Goods |
| **Primary keyword** | oregon made gifts siletz |
| **Secondary** | local honey lincoln county oregon · oregon coast pottery · handmade gifts newport oregon area · siletz valley honey · oregon coast souvenirs |

Note: this is the page tourists find, not neighbors. It is also the easiest page to earn links to, because every maker named on it has a reason to link back. Ask each of the three for a link when you hand them their next check.

---

### roots.html

| | |
|---|---|
| **Title** (45) | `Our Roots — Carrie & Eric's Siletz Mercantile` |
| **Description** (139) | Why Carrie and Eric opened a mercantile, bakery and kitchen in Siletz, Oregon — and why they deliberately kept it to two people and no app. |
| **H1** | Our Roots |
| **Primary keyword** | twisted roots merc siletz owners |
| **Secondary** | new store in siletz oregon · siletz oregon small business · who owns twisted roots merc · carrie and eric siletz |

Note: this page will not bring in search traffic and should not be asked to. It converts the people who already landed somewhere else, and it is what a reporter reads before writing about the store. Leave it as it is.

---

### visit.html

| | |
|---|---|
| **Title** (47) | `Hours & Directions — Twisted Roots Merc, Siletz` |
| **Description** (148) | Open 6am most days, 7am Sundays. 151 N Gaither St, Siletz, Oregon. Parking out front, the Yard around back, and somebody actually answers the phone. |
| **H1** | Visit |
| **Primary keyword** | twisted roots merc hours |
| **Secondary** | siletz oregon store hours · what time does twisted roots open · directions to siletz oregon store · store open now near siletz · 151 n gaither st siletz |

Note: "hours" queries are the highest volume branded search any local business gets, and most of them get answered by the Google Business Profile without a click. That is fine. The job of this page is to be right, so the profile stays right.

---

### hq.html

Excluded. `Disallow: /hq.html` in robots.txt, absent from sitemap.xml, no structured data. If it ever gets linked from anywhere public, add `<meta name="robots" content="noindex,nofollow">` to its head — robots.txt stops crawling but only a noindex tag reliably keeps a page out of the index.

---

## Two technical things to fix while you are in the head tags

1. **Canonicals.** Only `index.html` has one. Every page needs its own self-referencing `<link rel="canonical">` or the stock-search query strings will spawn duplicates.
2. **Open Graph.** Only `index.html` has og tags. Every page needs at least `og:title`, `og:description` and `og:image` — this store's traffic will come off Facebook shares in a windstorm, and a link with no image gets scrolled past.

---

## Local content worth writing

Twelve ideas. The test for each one is: would somebody in Siletz screenshot this and text it to a neighbor? If not, it does not go up. None of these need keyword stuffing — they rank because nothing else on the internet covers them.

1. **What to have in the house before the wind hits — a Siletz-specific list.** Not the FEMA list retyped. The version that accounts for the fact that our power goes out for two days, not two hours, and that the nearest open store at 8pm is 27 minutes away. Publish mid-September, update every October. This is the anchor piece.

2. **What's running in the river.** Short, dated post — chinook, steelhead, when the bank access is worth it, what people are actually catching. Eric already knows this and already tells people. Updating it every couple of weeks builds the kind of return visits that make a small site rank. It is also the only page on the internet where that information will live.

3. **When the power goes out in Siletz: who to call, what to check, how long it usually lasts.** Central Lincoln PUD's outage map, the outage number, the road-closure source, and what we do at the store when it happens. Genuinely useful once a year and linked forever.

4. **The road to Newport, honestly.** Highway 229 and Highway 20 conditions, what closes when a tree comes down, which route to take when, and how long it actually takes versus what the map says. Every new resident asks this.

5. **Setting a fence post in coastal soil.** Already on yard.html. Give it its own page with photos of the actual dry shed and the actual bag, and it will earn links from Oregon home and garden sites.

6. **How we decide what goes on the shelf.** The request board, in public: what people asked for, what got stocked, what got turned down and why. This is the most linkable thing about the business, because almost no store shows it. Run it quarterly.

7. **A field guide to the Siletz Valley makers.** Long form on the three makers plus whoever comes next — where their honey comes from, what the glaze is, where the beeswax was cured. Each maker links back. That is three real local links from one afternoon of writing.

8. **What a two-week emergency water supply actually looks like for a family of four.** With the real number of gallons, the real shelf space it takes, and what it costs at our prices. Concrete beats abstract advice every time.

9. **Twenty things people drive to Newport for that we have.** Written as a list with prices. It answers the exact question in a neighbor's head and it is the single most conversion-useful thing on the site.

10. **A calendar of the Siletz year.** Nesika Illahee Pow-Wow in August, the fair, hunting seasons, when the crabbing turns, when the first storm usually lands, when the school supply run happens. One page, updated annually, becomes the page people bookmark.

11. **Chainsaw day: what to have before the tree comes down, not after.** Bar oil, correct chain, fuel mix, eye protection, and the honest note that we sell all of it and it still runs out the morning after a storm.

12. **What we don't carry, and who does.** The merc.html section expanded, with real phone numbers for Siletz River Lumber and Toledo Do it Best. Sending business away is the fastest way to get linked to by the people you sent it to, and it is the most on-brand thing this store could publish.

**Cadence:** one piece a month is plenty. Two seasonal pieces (#1 in September, #2 refreshed through the run) matter more than the other ten combined. Nothing goes up that Carrie or Eric would not say out loud at the counter.
