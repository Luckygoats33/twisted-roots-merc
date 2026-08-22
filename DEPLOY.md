# Deploying Twisted Roots Merc

**Site:** static HTML/CSS/vanilla JS. No build step, no framework, no
dependencies, no database.
**Domain:** `twistedrootsmerc.com`
**Publish directory:** the repository root (`.`) — there is nothing to build.

---

## Read this first: the one big gotcha

**Cloudflare Pages permanently redirects `/merc.html` to `/merc`, and there is
no setting to turn it off.**

This repo is built entirely around the `.html` form. Every internal link, all
ten `<link rel="canonical">` tags, all eight `<loc>` entries in `sitemap.xml`,
and the `Disallow: /hq.html` line in `robots.txt` use it. Deploy as-is and:

- every page load costs an extra 308 redirect hop before the HTML arrives;
- Google follows `.../merc.html` → 308 → `/merc`, sees a canonical tag pointing
  at a URL that redirects, and Search Console reports **"Page with redirect"**
  for the whole sitemap;
- **`robots.txt`'s `Disallow: /hq.html` stops matching**, because the URL the
  crawler actually lands on is `/hq`;
- and most seriously, **an access rule scoped to `/hq.html` does not protect
  `/hq`** — you can end up with a login prompt that a visitor bypasses simply
  by dropping the extension. Section 4 handles this explicitly.

Nothing here is fatal and nothing here is hidden — but it must be *dealt with*,
not discovered in week three. There are two clean fixes:

| Fix | Effort | Who does it |
|---|---|---|
| **A. Go extensionless** — change internal `href`s, canonicals and sitemap `<loc>`s to drop `.html` (`href="merc"`, `<loc>https://twistedrootsmerc.com/merc</loc>`) | ~60 small edits across 10 HTML files + sitemap.xml + robots.txt | Whoever owns page content — **not this document**. Ask for it before launch. |
| **B. Deploy to Netlify instead** and set `pretty_urls = false` | one config line (`deploy/netlify.toml` already has it) | You, in 30 seconds |

**Recommendation: do A, stay on Cloudflare.** Fix B solves this one problem and
costs you free password protection for `hq.html`, which is the harder problem.
Until A happens, Cloudflare Access must be configured to cover *both*
spellings — section 4 shows exactly how.

### Second gotcha, smaller but sharper

`C:\Users\willw` is **itself a git repository** (`home-scripts`) whose
`.gitignore` is a single `*`. Running `git status` inside
`twisted-roots-merc` today reports *that* repo, not this one. If you run
`git add -A` from this folder before running `git init`, you are staging
against the home-directory repo. **Run `git init` here first** (section 2,
step 1) and confirm `git rev-parse --show-toplevel` prints the
`twisted-roots-merc` path before you add anything.

---

## 1. Which host, and why

The three candidates were judged on the three things this site actually needs:
password-protect one page, free HTTPS on a custom domain, and room for a
scheduled serverless function later.

| | **Cloudflare Pages** | Netlify | GitHub Pages |
|---|---|---|---|
| Free HTTPS on custom domain | Yes, automatic | Yes, automatic | Yes, but tick "Enforce HTTPS" by hand after the cert issues |
| Password-protect **one page** | **Yes — Cloudflare Access, free for up to 50 users**, email one-time-PIN or Google login, scoped to a path | **No, not on free.** Dashboard password protection is Pro+, and it is *site-wide* — the whole store, not one page. `_headers` Basic-Auth is Pro+ on new accounts. Free path is a hand-written edge function. | **No.** None. No auth of any kind on a public Pages site. |
| Scheduled serverless function later | Yes — Workers Cron Triggers, free tier | Yes — Netlify Scheduled Functions, free tier | **No.** No functions at all, ever. |
| Custom response headers (CSP, cache) | Yes, `_headers` | Yes, `_headers` / `netlify.toml` | **No.** Cannot set a single header. |
| Redirects | Path-only in `_redirects`; host/protocol via dashboard rules | Full, including hostname matching | **No.** |
| Apex domain | CNAME flattening — no A records to maintain | ALIAS via Netlify DNS, or a documented A record | Four hardcoded A records you must keep current |
| Serves `/merc.html` as-is | **No — 308s to `/merc`, not disableable** | **Yes**, with `pretty_urls = false` | Yes |

### Recommendation: **Cloudflare Pages**

It is the only one of the three that satisfies all three deciding factors on a
free plan. Cloudflare Access gives you a real login screen in front of
`hq.html` — configured from a form, with no password stored in the repo and no
code to maintain — for $0 up to 50 users; Netlify charges for the equivalent
and only offers it site-wide, and GitHub Pages cannot do it at any price.
Cloudflare also solves the apex-domain problem more permanently than the others
(CNAME flattening means no IP addresses to go stale), and it is the natural
home for the Square sync Worker later, on the same account and the same
dashboard. The `.html` redirect is a genuine cost, but it is a one-time content
edit; free per-page authentication is a permanent capability.

**Where I am uncertain, plainly:**

- Free-tier limits move. The Cloudflare Zero Trust free tier was 50 users at
  the time of writing, Workers free was 100,000 requests/day with a 10 ms CPU
  cap and 5 cron triggers per account. **Check
  `https://developers.cloudflare.com/workers/platform/limits/` and the Zero
  Trust plan page before relying on any of those numbers.**
- Cloudflare's free plan includes Redirect Rules, but the exact allowance has
  changed over time. If the www→apex rule in section 3 is unavailable on your
  plan, the fallback (also in section 3) needs no rule at all.
- I have **not** verified whether the Access path pattern `/hq*` matches
  `/hq.html` on the current build. Section 4 therefore tells you to configure
  both spellings explicitly and to *test it in a private window*. Do not skip
  that test.
- Netlify's `pretty_urls = false` is documented and long-standing, but verify
  with `curl -sSI https://twistedrootsmerc.com/merc.html | head -1` after
  deploy rather than trusting it.

---

## 2. Deploying, step by step

You need: a GitHub account, a Cloudflare account (free), and access to whoever
controls the `twistedrootsmerc.com` domain registration.

### Step 1 — make this folder its own git repository

```bash
cd /c/Users/willw/twisted-roots-merc

git init -b main
git rev-parse --show-toplevel     # MUST print .../twisted-roots-merc
```

If that last command prints `C:/Users/willw`, stop — `git init` did not take,
and you are about to commit into the home-directory repo. See "Second gotcha"
above.

### Step 2 — put the deploy config where hosts can see it

The files in `deploy/` do nothing while they are in `deploy/`.

```bash
git mv deploy/_headers   _headers      # or just: mv, then git add
git mv deploy/_redirects _redirects
```

You do **not** need `netlify.toml`, `github-pages.yml` or `wrangler.toml` for
this deploy. Leave them in `deploy/` as reference.

### Step 3 — check what is about to become public

`.gitignore` already excludes the working material. Confirm it worked:

```bash
git add -A
git status --short | grep -Ei '_parts|build.*\.py|_build_board|TECH-PLAN|QA-REPORT|contact.*png|\.log|slots.*json|seo/|print/|email/|blog/data|tr-.*\.png|w-.*\.png'
```

**Expected output: nothing.** If anything appears — especially
`_parts/hq.html` — do not commit. Fix `.gitignore` first.

Then see the whole list one last time:

```bash
git status --short | wc -l      # expect roughly 280 files
```

Roughly 97 MB will ship. Cloudflare Pages allows 20,000 files per deployment
and 25 MiB per file; the largest shipping file is about 4.9 MB
(`assets/video/river.mp4`), so you are well inside both. **Verify these limits
in Cloudflare's current docs** — they have changed before.

### Step 4 — first commit and push

```bash
git commit -m "Twisted Roots Merc — initial site"
```

Create an **empty** repo on GitHub named `twisted-roots-merc`. Do not let
GitHub add a README, a licence or a `.gitignore` — this repo already has what
it needs and you will only create a merge conflict on your first push.

```bash
git remote add origin https://github.com/<your-account>/twisted-roots-merc.git
git push -u origin main
```

Public or private repo both work with Cloudflare Pages. **Private is better** —
it keeps `hq.html`'s markup out of casual view even before Access is switched
on.

### Step 5 — connect Cloudflare Pages

1. `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Pages** tab →
   **Connect to Git**.
2. Authorise GitHub, pick `twisted-roots-merc`.
3. Build settings — **this is the screen people get wrong**:

   | Field | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | **leave completely empty** |
   | Build output directory | `/` &nbsp;(a single slash — the repo root) |
   | Root directory | leave empty |

   **There is no build.** No `npm install`, no `npm run build`, nothing. If you
   put anything in the build command box the deploy will fail with an error
   about a missing `package.json`, and the fix is to empty that box — not to
   add a `package.json`.

4. **Save and Deploy.** It takes under a minute. You get a URL like
   `twisted-roots-merc.pages.dev`.

### Step 6 — check the preview before touching DNS

Open the `.pages.dev` URL and click through all ten pages. Confirm the roots
animation draws, the stock search returns results for `leaky toilet`, and the
Storm Mode toggle in the footer turns the site teal.

Then check your headers actually landed:

```bash
curl -sSI https://twisted-roots-merc.pages.dev/ | grep -i 'content-security\|x-content-type\|cache-control'
curl -sSI https://twisted-roots-merc.pages.dev/assets/css/site.css | grep -i cache-control
```

Open the browser console on the home page. **Zero CSP violation errors** is the
pass condition. If the fonts look wrong or the console shows
`Refused to load the stylesheet`, the CSP in `_headers` did not survive the
move to the root — check the file is at `./_headers` with no extension.

### Step 7 — turn off public preview deployments

Every branch you push creates a *public* preview URL. That includes any branch
where `_parts/` sneaks back in.

Pages project → **Settings** → **General** → **Access Policy** (under preview
deployments) → restrict previews to members of your Cloudflare account. Free,
takes ten seconds, closes a real hole.

---

## 3. DNS for twistedrootsmerc.com

### The apex-CNAME problem, and why Cloudflare makes it disappear

`twistedrootsmerc.com` with no subdomain is the **apex** (or "root", or "naked
domain"). Cloudflare Pages does not give you an IP address — it gives you a
hostname, `twisted-roots-merc.pages.dev`. Pointing a name at another name is a
`CNAME` record, but **DNS forbids a CNAME at the apex**, because the apex must
also carry `SOA` and `NS` records and a CNAME cannot coexist with other
records. That is the classic problem, and it is why hosts that only give you a
hostname traditionally cannot serve a naked domain.

Different providers dodge it differently: some invent non-standard record types
(`ALIAS`, `ANAME`), GitHub publishes four fixed IPs you hardcode as `A` records
and hopes they never change.

**Cloudflare uses CNAME flattening.** You store what looks like a `CNAME` at
the apex; Cloudflare's own resolvers follow it internally and hand the world
back plain `A`/`AAAA` records. The result is standards-compliant, and if
Cloudflare ever renumbers, nothing on your side changes. **You do not maintain
any IP addresses.** This is the single best structural reason to pick
Cloudflare for this site.

### Step 1 — move the domain's nameservers to Cloudflare

This is required. Access, CNAME flattening, Redirect Rules and "Always Use
HTTPS" all need the domain on Cloudflare DNS — a partial setup will not do.

1. Cloudflare dashboard → **Add a site** → `twistedrootsmerc.com` → **Free**
   plan.
2. Cloudflare scans the existing DNS and shows you what it found. **Screenshot
   this page.** If the domain currently has email (`MX` records) or anything
   else, those records must survive the move. Compare them afterwards.
3. Cloudflare gives you two nameservers, e.g. `xxx.ns.cloudflare.com` and
   `yyy.ns.cloudflare.com`.
4. Log in at the **registrar** (whoever the domain was bought from) and replace
   the existing nameservers with those two. Remove the old ones entirely — do
   not add Cloudflare's alongside them.
5. Wait. Usually minutes; the registrar may say up to 24 hours. Cloudflare
   emails you when the zone goes active.

> If the store's email runs on this domain, **check the `MX` records came
> across before you go any further.** A missed `MX` record means silently lost
> customer email, and it will not be obvious for days. This is the most common
> way a domain move causes real damage.

### Step 2 — attach the domains to the Pages project

Pages project → **Custom domains** → **Set up a custom domain**.

Add **`twistedrootsmerc.com`**, then repeat and add
**`www.twistedrootsmerc.com`**.

Because the zone is already on your Cloudflare account, **Cloudflare creates
the DNS records for you.** You should not have to type a record by hand. Go
look at what it made — DNS → Records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `CNAME` | `twistedrootsmerc.com` (shown as `@`) | `twisted-roots-merc.pages.dev` | **Proxied** (orange cloud) |
| `CNAME` | `www` | `twisted-roots-merc.pages.dev` | **Proxied** (orange cloud) |

The apex row will look like a CNAME in the dashboard and answer as `A` records
on the wire. That is CNAME flattening doing its job.

**Both rows must be Proxied (orange cloud), not DNS-only (grey).** Grey-clouded
means traffic bypasses Cloudflare's edge, and then `_headers`, `_redirects`,
Redirect Rules, "Always Use HTTPS" and — critically — **Cloudflare Access all
stop applying.** A grey cloud on the apex is how a "protected" dashboard
quietly becomes public.

### Step 3 — HTTPS

Cloudflare issues and renews the certificate automatically once the domain is
attached — typically a few minutes, occasionally up to 24 hours. Watch **SSL/TLS
→ Edge Certificates**; the certificate for `twistedrootsmerc.com` and
`www.twistedrootsmerc.com` must read **Active** before you announce anything.

While on that screen:

- **Always Use HTTPS** → **ON**. This is what forces `http://` → `https://`.
  It cannot be done from `_redirects` — do not go looking for it there.
- **Automatic HTTPS Rewrites** → **ON**.
- **Minimum TLS Version** → 1.2.
- **HSTS** → leave **OFF for now.** Turn it on a week after launch, once you
  are certain HTTPS is solid on both hostnames. HSTS tells browsers to refuse
  plain HTTP for months; if you enable it and something is wrong, you cannot
  take it back quickly. It is a good setting and a bad thing to rush.

Also set **SSL/TLS → Overview → encryption mode = Full (strict)**. "Flexible"
can cause redirect loops with Pages.

### Step 4 — canonical host: apex, with www redirecting to it

The apex wins, and this is not a preference — every `<link rel="canonical">`
in the ten pages and every `<loc>` in `sitemap.xml` already say
`https://twistedrootsmerc.com/...`. Choosing `www` would mean editing all of
them.

`_redirects` cannot do this: on Cloudflare Pages it matches on **path only**,
never on hostname. Use a Redirect Rule:

**Rules → Redirect Rules → Create rule**

- Name: `www to apex`
- When incoming requests match → **Custom filter expression**
  - Field `Hostname`, Operator `equals`, Value `www.twistedrootsmerc.com`
- Then → **Dynamic** redirect
  - Expression: `concat("https://twistedrootsmerc.com", http.request.uri.path)`
  - Status code: **301**
  - **Preserve query string: ON** — the stock search links to
    `merc.html?q=...`, and dropping the query breaks them.
- Deploy.

> **If Redirect Rules are unavailable on your plan:** do not add `www` as a
> Pages custom domain at all. Instead create a proxied `AAAA` record for `www`
> pointing at `100::` (Cloudflare's discard address) plus a Bulk Redirect, or
> simply skip `www` entirely — it is 2026 and nobody types it. The site works
> perfectly on the apex alone. What you must **not** do is leave `www` resolving
> to the same content with no redirect: that is duplicate content on two
> hostnames and it will confuse Google.

### Step 5 — verify propagation

```bash
# Apex resolves to Cloudflare IPs (104.x / 172.67.x), not a hosting IP
dig +short twistedrootsmerc.com
dig +short www.twistedrootsmerc.com

# The apex serves the site over HTTPS
curl -sSI https://twistedrootsmerc.com/ | head -1          # expect 200

# http is forced to https
curl -sSI http://twistedrootsmerc.com/ | head -3           # expect 301 -> https://

# www lands on the apex, query string intact
curl -sSI "https://www.twistedrootsmerc.com/merc?q=tarp" | head -5

# Certificate covers both names
echo | openssl s_client -connect twistedrootsmerc.com:443 \
  -servername twistedrootsmerc.com 2>/dev/null | openssl x509 -noout -text \
  | grep -A1 "Subject Alternative Name"
```

Then check from outside your own network and DNS cache —
`dnschecker.org/#A/twistedrootsmerc.com` shows resolvers worldwide. Also test
on a phone **with wifi off**, which uses a completely different resolver.

If the old site or a parking page still appears after an hour, it is almost
always your own machine's DNS cache. On Windows: `ipconfig /flushdns`.

---

## 4. Protecting hq.html

### Why what is there now is not protection

`hq.html` currently has `<meta name="robots" content="noindex,nofollow">`, and
`robots.txt` has `Disallow: /hq.html`. Neither one prevents access, and it is
worth being precise about why, because the two are often assumed to be a lock:

- **`robots.txt` is a request to well-behaved crawlers**, and nothing more. It
  is a public file — `twistedrootsmerc.com/robots.txt` is readable by anyone,
  and it *advertises* the existence of `/hq.html` to anybody curious enough to
  look. It has no effect on a human typing the URL, on a browser, or on a
  crawler that ignores it.
- **`noindex` is an instruction about search results**, not about access. It
  asks Google not to *list* the page. Google still fetched it to read that tag.
  Anyone who has the URL still gets the page, in full.
- Neither survives the URL being shared: pasted into a group chat, forwarded in
  an email, sitting in a browser history on a shared machine, or auto-linked by
  a messaging app that fetches previews.
- And the `.html` gotcha bites here too: `Disallow: /hq.html` does not match
  `/hq`, which is the URL Cloudflare Pages actually serves.

Keep both — they are correct hygiene, and `_headers` adds an `X-Robots-Tag`
that works even if the meta tag is missed. But **they are a "please", not a
door.** The page shows supplier names, reorder quantities and purchase orders.
It needs a door.

### Option 1 (recommended) — move it to its own hostname behind Cloudflare Access

This is both "host-level password protection" and "a separate private deploy",
and combining them removes the path-matching problem completely.

1. In the repo, `hq.html` stops being part of the public site. Create a second,
   **private** repo — `twisted-roots-hq` — containing `hq.html` (renamed
   `index.html`) plus the `assets/` it needs.
2. New Cloudflare Pages project from that repo. Custom domain:
   **`hq.twistedrootsmerc.com`** (Cloudflare creates the proxied CNAME).
3. **Zero Trust** → **Access** → **Applications** → **Add an application** →
   **Self-hosted**:
   - Application name: `Twisted Roots HQ`
   - Domain: `hq.twistedrootsmerc.com`, **Path: leave empty**
   - Empty path protects the hostname *and every path under it*. There is no
     `/hq` vs `/hq.html` ambiguity to get wrong, and no forgotten asset path.
   - Session duration: 24 hours (they will log in once a day, not once a click)
4. Policy: Action **Allow**, Include → **Emails** → Carrie's address, Eric's
   address, and the developer's. Nothing else.
5. Login method: **One-time PIN** is the zero-setup option — Cloudflare emails a
   six-digit code. If they use Google or Microsoft accounts for the business,
   configure that identity provider instead; it is one fewer step per login.
6. Test in a **private/incognito window**. You must be stopped by a Cloudflare
   login screen. If you see the dashboard, something is wrong — check the DNS
   record is **proxied (orange cloud)**.

Cost: $0 up to 50 users on the Zero Trust free plan (verify current limit).
No password lives in the repo. Revoking someone is deleting a line in a form.

### Option 2 — keep it in this repo, protect the path with Access

Less clean, but no repo split. Same Zero Trust → Access → Applications →
Self-hosted flow, except the domain field. **Add all of these as domains on the
one application:**

```
twistedrootsmerc.com/hq
twistedrootsmerc.com/hq.html
www.twistedrootsmerc.com/hq
www.twistedrootsmerc.com/hq.html
```

A path in Access protects that path *and its subpaths* — but `/hq.html` is not
a subpath of `/hq`, so one entry does not cover the other. The wildcard form
`twistedrootsmerc.com/hq*` looks like it should cover both; **I have not
verified that it does on the current build, so list them explicitly instead.**

Then **test every single one in a private window**, plus these two, which are
the ones people forget:

```
https://twistedrootsmerc.com/hq
https://twistedrootsmerc.com/hq.html
https://twisted-roots-merc.pages.dev/hq        # the .pages.dev URL bypasses
https://twistedrootsmerc.com/_parts/hq.html    # the fragment copy
```

The third is real: **the `*.pages.dev` URL still works and is not covered by an
Access app scoped to your custom domain.** Add `twisted-roots-merc.pages.dev/hq*`
to the application too, or disable the `.pages.dev` domain in the project
settings.

The fourth is why `.gitignore` excludes `_parts/`.

### Option 3 — Basic auth in a Pages Function

If Access is unavailable for some reason, a `functions/hq/_middleware.js` can
check the `Authorization` header against a Cloudflare environment variable and
return `401` with `WWW-Authenticate: Basic` otherwise.

It works and it is free, but it is worse: the browser's grey basic-auth box is
ugly and confusing to non-technical users, there is one shared password rather
than per-person access, revoking someone means changing the password for
everybody, and it is code you now own and must not break. Use it only as a
fallback.

**Never** put the password in `_headers` or anywhere else in the repo.

### Option 4 (last resort, not protection) — noindex plus an obscure path

Rename `hq.html` to something unguessable — `hq-7f3a91c4e8.html` — and keep the
`noindex` and `robots.txt` entries. This is security by obscurity: it stops
casual discovery and nothing else. The URL leaks the first time it appears in a
browser history, a shared screen, a link preview, or an email.

**Only acceptable as a temporary state before launch day.** If it is still the
answer a week after launch, take `hq.html` off the public site entirely and run
it as a local file.

---

## 5. The config files

All in `deploy/`. **They do nothing until they are moved** — see
`deploy/README.md` for the destination of each.

### a. `.gitignore` (already at the repo root)

Excludes logs, `contact*.png` contact sheets, `slots*.json` scratch data, the
unreferenced `tr-*.png` / `w-*.png` masters (~80 MB of image-generation source
that no page references), OS junk, and the internal documents.

Two decisions worth knowing about:

- **`contact*.png` is root-anchored, not `*.png`.** A blanket `*.png` would
  also delete `assets/img/favicon-32.png`, `apple-touch-icon.png` and
  `logo-carved.png` from the deploy — the site would lose its icons and nobody
  would notice for a while.
- **`_parts/` and `build.py` are excluded.** They are the shared header/footer
  tooling and they are *not* merely unnecessary — `_parts/hq.html` is a copy of
  the private dashboard markup, and publishing it puts that content at a URL
  outside whatever protection you configure for `/hq`. Excluding them costs
  you: the repo is no longer the backup for the page assembler. **Archive
  `_parts/` and `build.py` to the shared drive before you commit.** If they are
  ever needed again, restore them locally, run `python build.py`, and commit
  only the regenerated HTML.

### b. `_headers` — caching and security

**Caching, and the versionless-asset tradeoff.** Nothing in `assets/` has a
content hash in its filename (`site.css`, not `site.a1b2c3.css`), because there
is no build step to generate one. So the policy splits by how each kind of file
actually changes:

- `/assets/img/*` and `/assets/video/*` → **one year, `immutable`.** Safe
  *only* under one rule: **never overwrite an image in place.** Replacing a
  photo means adding `hero-store-2.jpg` and pointing the page at it. Overwrite
  `hero-store.jpg` and returning visitors keep the old photo for up to a year
  with no way to force a refresh.
- `/assets/css/*` and `/assets/js/*` → **`max-age=300, must-revalidate`.**
  These *are* edited in place; that is the whole workflow. After five minutes
  the browser asks "changed?" and gets a tiny `304` if not. A CSS fix is live
  for everyone within five minutes, every time, with no discipline required.
- HTML → **`max-age=0, must-revalidate`.** A copy fix — a price, a phone
  number, storm hours — is live immediately. Correct for a store whose whole
  promise is "does Twisted Roots have it *right now*".

**If you later want year-long CSS/JS caching**, the only cache-busting approach
that works without a build step is a query string in the HTML —
`href="assets/css/site.css?v=7"` — bumped on every edit. **The tradeoff is
severe enough to be worth stating: it only works if a human remembers.** Forget
once and you ship a change you can see (your browser revalidated) that
customers cannot, for a year, with no error anywhere to tell you. Not worth it
here. Adopt it only if a real build step arrives that bumps the number for you.

**Security headers.** `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, a `Permissions-Policy` that denies camera,
microphone, geolocation, payment and the rest while allowing `autoplay=(self)`
for the background video, `X-Frame-Options: DENY`, and a CSP.

**About the CSP, honestly:** it uses **`script-src 'self' 'unsafe-inline'`, and
that materially weakens it.** Two things in this codebase require it:

1. `index.html` has a `<script type="application/ld+json">` block — the
   `LocalBusiness` schema Google reads. CSP treats `ld+json` as an inline
   script and blocks it without `'unsafe-inline'`; blocked, the rich result in
   Google silently disappears.
2. `hq.html` has a ~110-line inline `<script>` (line 188) that builds the
   reorder table.

With `'unsafe-inline'`, **CSP is not protecting you from script injection.** The
mitigating fact, verified in this codebase: every value interpolated into
`.innerHTML` in `assets/js/site.js` passes through the `esc()` helper
(`site.js:34`), including the search query read from `?q=`. There is no known
injection point today. But CSP is no longer the safety net, so that must stay
true.

**To move to a nonce** you would need to (a) move `hq.html`'s inline block into
`assets/js/hq.js`, and (b) generate a fresh nonce *per request* for the
`ld+json` island — which a static file cannot do, so it needs a Pages Function
rewriting the HTML on every page load. For a ten-page store that is a lot of
moving parts for a small win. **The pragmatic ask: do (a).** It removes the
larger inline block and shrinks the exposure to one schema tag. Revisit the
rest only if the site ever accepts and re-displays untrusted input.

`style-src` also needs `'unsafe-inline'` — the pages carry roughly 150 inline
`style=""` attributes (12–21 per page). Removing that means moving all of them
into `site.css`. Low value; style injection is a far smaller risk than script
injection.

`connect-src 'self'` is correct today because **the site makes zero network
requests** — no `fetch`, no `XMLHttpRequest` anywhere in `assets/js/`. When the
Square sync arrives, put the endpoint on the **same origin** (a Pages Function
at `/api/catalog`) and this line keeps working untouched. Call a separate
`*.workers.dev` host instead and the browser blocks it with an error that does
not look like a CSP problem.

### c. `_redirects`

Bounces the working paths (`/_parts/*`, `/build.py`, `/TECH-PLAN.md`,
`/README.md`, …) to the home page as a second lock behind `.gitignore`, and
adds short URLs worth putting on a business card or a chalkboard:
`/hours`, `/menu`, `/directions`, `/lumber`, `/order`, `/about`.

It **cannot** force HTTPS or redirect `www` — both are Cloudflare zone settings
(section 3). The file says so at the top, so nobody wastes an afternoon.

### d. The 404 page — **does not exist yet**

There is no `404.html` in this repo. Right now an unmatched URL gets whatever
generic page Cloudflare serves — no header, no navigation, no way back into the
site, and no sign it is even the right business.

**Create `404.html` at the repo root** (Cloudflare Pages picks it up
automatically; no `_redirects` rule needed). Page content is owned by another
agent, so it is described, not written, here. It should carry:

- The same header, nav and footer as every other page, so the visitor is
  visibly still at Twisted Roots and one click from anywhere.
- A short line in the store's voice — dry, plain, Oregon-coast practical, the
  register of *"Good food. Good goods. Deep roots."* and the merc page's honest
  "what we don't carry" section. Something in the spirit of *"That aisle
  doesn't exist. Happens."* Not a joke, not an apology, not corporate.
- Four or five real links out, in order of what a lost visitor most likely
  wanted: **What's on the shelf** (`merc`), **Bakery + Kitchen** (`bakery`),
  **Hours & directions** (`visit`), **Home**.
- The stock search box, if it can be dropped in — a person who mistyped a URL
  is very often looking for a product, and the search is the best thing on
  this site.
- The address and phone, once the real phone number replaces
  `(503) 706-2801`.
- **No** storm banner logic that could fire misleadingly, and no dead-end
  "contact us" form.

Keep it under a screenful. `_headers` already gives `/404` and `/404.html` a
no-cache rule.

---

## 6. Pre-launch checklist

**Content and correctness — these are launch blockers**

- [ ] **Replace the placeholder phone number `(503) 706-2801`.** It appears in
      the page HTML and in `assets/js/site.js` (`phoneHref: "tel:+15037062801"`).
      A live storefront publishing a fake phone number is the worst single bug
      on this list.
- [ ] **Decide what the forms do.** The pickup/hold, order and contact forms
      are **demos** — `assets/js/site.js` calls `e.preventDefault()` and renders
      a receipt-style modal. Nothing is sent anywhere. Nobody at the store is
      notified. A customer will fill one in on day one and believe their order
      was placed. Either wire them to a real endpoint (Formspree, a Pages
      Function that emails, or Square's own ordering) **or** visibly disable
      them with copy that says to phone the store. Shipping them as-is is not
      an option.
- [ ] Confirm hours in **both** `assets/js/site.js` (`STORE.hours`) **and**
      `visit.html` — they are stored twice and can disagree.
- [ ] Confirm every price in `catalog.js` — currently plausible placeholders.
- [ ] Replace the generated storefront/interior art with real photography of
      the finished building, and real photos of Carrie and Eric on `roots.html`.
- [ ] `og-image.jpg` reflects the real store.

**Deploy hygiene**

- [ ] `git rev-parse --show-toplevel` points at `twisted-roots-merc`, not
      `C:/Users/willw`.
- [ ] `_headers` and `_redirects` are at the **repo root**, not in `deploy/`.
- [ ] `_parts/`, `build.py`, `TECH-PLAN.md`, `contact*.png`, `slots*.json`,
      `*.log`, `seo/`, `print/` are **not** in `git status`.
- [ ] `_parts/` and `build.py` archived to the shared drive before exclusion.
- [ ] Preview-deployment Access policy is on (Pages → Settings → General).
- [ ] Decide the `.html` question (section "The one big gotcha") — either the
      links go extensionless, or you have consciously accepted the redirect hop
      and configured Access for both spellings.

**Security**

- [ ] `hq.html` is behind Cloudflare Access, verified in a **private window**,
      at `/hq`, `/hq.html`, the `.pages.dev` URL, and `/_parts/hq.html`.
- [ ] Both DNS rows are **proxied (orange cloud)**.
- [ ] No API keys, tokens or passwords anywhere in the repo:
      `git grep -InE "sq0|shpat_|Bearer |api[_-]?key" -- . ` returns nothing.
- [ ] Browser console shows **zero CSP violations** on all ten pages.
- [ ] SSL/TLS mode is **Full (strict)**; "Always Use HTTPS" is ON.

**Behaviour**

- [ ] Storm Mode toggles from the footer, the storm page and the HQ dashboard;
      the banner appears sitewide; the roots turn teal; the rain starts;
      stock bars re-scale to `stormMin`; and the setting **persists across a
      reload** (it is stored in `localStorage`).
- [ ] Storm Mode is **OFF** at launch unless there is an actual storm.
- [ ] Stock search: `leaky toilet`, `power out`, `fence post`, `going camping`,
      `car won't start` all return sensible results with a counter note.
- [ ] Out-of-stock items rank down and offer "Tell us", not "Hold it".
- [ ] `merc?q=tarp` works — the search deep-link survives the redirect and the
      query string.

**Performance and devices**

- [ ] Test on a **real phone on cellular data, not office wifi** — Siletz has
      patchy coverage and this is the connection most customers will use. The
      home page pulls background video; confirm it degrades gracefully rather
      than blocking the page.
- [ ] Roughly 97 MB ships. Consider dropping the unreferenced image variants
      (`tr-*-600.jpg`, `tr-*-sm.webp`, `w-*-md.jpg` and friends — several are
      referenced by nothing) before launch.
- [ ] Lighthouse on mobile: check LCP and total transfer on the home page.
- [ ] `prefers-reduced-motion` respected — the roots animation and parallax are
      significant motion.
- [ ] Keyboard-only navigation works through the nav and the search.

**SEO**

- [ ] **`board.html` is missing from `sitemap.xml`.** It is a public page —
      it has a canonical tag, no `noindex`, and real content ("The Board —
      Siletz storms, roads & river") — but `sitemap.xml` still lists only
      eight URLs and does not include it. Add it, with a `changefreq` of
      `daily` given what it contains. Also check the nav on the other pages
      links to it; a page nothing links to and no sitemap lists is invisible.
- [ ] `sitemap.xml` `<loc>` values match the URLs the site actually serves
      (see the `.html` gotcha) and `<lastmod>` is current.
- [ ] `robots.txt` `Disallow` still matches the real `hq` URL.
- [ ] Every page has a unique `<title>` and meta description.
- [ ] `hq.html` is absent from `sitemap.xml`. **(It is — verified.)**

---

## 7. Post-launch checklist

**First hour**

- [ ] `https://twistedrootsmerc.com` loads on a phone that has never visited.
- [ ] `http://` → `https://` and `www` → apex both redirect, query strings
      intact.
- [ ] All ten pages load; no console errors.
- [ ] `hq.html` prompts for login from a device that is not yours.
- [ ] Phone the number on the site. It should ring the store.

**First day**

- [ ] **Google Search Console** — add `twistedrootsmerc.com` as a **Domain**
      property (verified by a `TXT` record, which you add in Cloudflare DNS in
      about a minute; a Domain property covers both hostnames and both
      protocols, which a URL-prefix property does not). Then **Sitemaps** →
      submit `sitemap.xml`. Use **URL Inspection** → **Request indexing** on
      the home page and the bakery page to get moving faster.
- [ ] **Bing Webmaster Tools** — import the Search Console property; it is two
      clicks and picks up Bing plus DuckDuckGo.
- [ ] **Google Business Profile** — claim/verify the listing for
      *101 & 151 N Gaither St, Siletz, Oregon 97380*. For a store whose whole
      pitch is "don't drive to Newport", **the GBP listing will out-earn the
      website for local search.** Match the name, address, phone and hours to
      the site **exactly** — inconsistency between the two actively hurts local
      ranking. Set the website field to `https://twistedrootsmerc.com`. Add
      real photos. `seo/GBP-SETUP.md` has the detail.
- [ ] **Test the OG image in a share debugger** — paste the URL into
      Facebook's Sharing Debugger and LinkedIn's Post Inspector, and send
      yourself the link in iMessage and in a text. Confirm the card shows the
      right image, title and description. If it is wrong, fix it and hit
      **Scrape Again** — these platforms cache aggressively and a bad first
      scrape can persist for days.
- [ ] Verify the Search Console `TXT` record did not disturb the `MX` records.

**First week**

- [ ] Search Console **Coverage/Pages**: watch for **"Page with redirect"** on
      the sitemap URLs. If it appears, that is the `.html` gotcha, and the fix
      is to make the links extensionless.
- [ ] Confirm `hq` and `_parts` are **not** indexed:
      `site:twistedrootsmerc.com` in Google.
- [ ] Turn on **HSTS** now that HTTPS is proven on both hostnames.
- [ ] Do a real Storm Mode drill: Carrie flips it on, checks the site from her
      phone, flips it off. She should never need help to do this.
- [ ] Ask two customers to find one specific product on their own phones and
      watch without helping. It is the only usability test that matters.
- [ ] Check Cloudflare Web Analytics (free, privacy-friendly, no cookie banner
      required) to see what people search for in the stock box. Those searches
      are a shopping list.

---

## 8. How Carrie and Eric update the site

The realistic answer for two non-technical owners running a store.

### What they should be able to do themselves, from a phone

**Storm Mode.** The footer toggle, the storm page, or the HQ dashboard. It
changes the banner, the board, the stock thresholds and the look of the whole
site. It is designed to be flipped from behind the counter with wet hands, and
it needs no login and no developer. **This is the one control they own
completely.**

**The HQ dashboard.** After Cloudflare Access is set up, `hq.twistedrootsmerc.com`
(or `/hq`) asks for their email, mails them a six-digit code, and remembers
them for 24 hours. Low stock, reorder quantities and supplier POs — read-only,
nothing they can break.

That is the list. On purpose.

### What changes weekly, and who does it

Daily bakery counts, prices, stock quantities and new items all live in
`assets/js/catalog.js`. **Today that file is hand-edited demo data**, which
means every change is a developer change. That is not sustainable and it is not
meant to be — `TECH-PLAN.md` and `deploy/wrangler.toml` describe the endgame:

> **A scheduled Cloudflare Worker reads the Square catalog and inventory every
> 30 minutes and writes `catalog.js`'s data automatically. Carrie and Eric
> update the website by ringing up a sale and receiving a delivery, in Square,
> which they are doing anyway.**

**Getting to that is the highest-value thing left to build**, higher than any
design work. Until then the honest arrangement is: batch changes, send them to
the developer in one message a week, and accept that the live-stock numbers are
approximate.

### What they should never have to touch

- Git, GitHub, the command line, or a pull request.
- The Cloudflare dashboard, DNS records, or anything called a CNAME.
- `_headers`, `_redirects`, `.gitignore`, or any file starting with a dot.
- HTML, CSS or JavaScript.
- Certificates. They renew themselves. If anyone is ever told to "renew the
  SSL", something has gone wrong with the setup, not with the certificate.

### For text changes, if a developer is not always on hand

Two options worth knowing about, in order:

1. **GitHub's web editor.** Open the repo on github.com, click a `.html` file,
   click the pencil, change the words, click *Commit changes*. Cloudflare
   redeploys in under a minute. It is genuinely usable for fixing a typo or a
   price, and every change is undoable. It is not usable for anything
   structural, and it is easy to break a page by editing the wrong angle
   bracket. **Set them up with this only for a specific, agreed short list of
   text they may change.**
2. **A CMS layer** (Decap/Netlify CMS, Cloudflare Pages + a headless CMS). It
   would give them a real edit form. **Do not build it yet.** For a ten-page
   site whose volatile data is meant to come from Square anyway, the Square
   sync is the far better investment. Revisit only if they end up needing to
   rewrite page copy regularly, which is unlikely.

### The one operational rule

**Whoever holds the Cloudflare and GitHub logins must not be one person, and
must not be only the developer.** Carrie and Eric should each have their own
Cloudflare account invited to the project and their own GitHub access, even if
they never use them. Domains and hosting accounts outliving the relationship
with whoever set them up is the single most common way a small business loses
its website. Write the recovery details down — registrar, Cloudflare account
email, GitHub account — and put them wherever the business keeps its insurance
paperwork.

---

## Where the working files live

`.gitignore` deliberately keeps these out of the repo, and therefore off the
public web. **They still matter — archive them before the first commit:**

| What | Why it is excluded | Where it should live |
|---|---|---|
| `_parts/`, `build.py`, `build_blog.py`, `_build_board.py` | `_parts/hq.html` is a public copy of the private dashboard markup; the rest are builders, not pages | Shared drive, plus the owners' machine |
| `email/` | Transactional email templates for Gmail/Outlook — not web pages, and would otherwise be browsable at `/email/` | With the sending platform's config |
| `blog/data/` | Source data the blog builder reads. **`blog/` itself is NOT ignored** — if `build_blog.py` starts emitting `blog/*.html`, those are real pages and must ship (and must go in `sitemap.xml`) | Private docs repo |
| `TECH-PLAN.md`, `QA-REPORT.md` | Internal planning, would be world-readable | Private `twisted-roots-docs` repo |
| `seo/`, `print/` | Working material, not pages | Same private repo |
| `assets/img/tr-*.png`, `w-*.png` | ~80 MB of unreferenced generation masters | Shared drive |
| `contact*.png`, `slots*.json`, `*.log` | Scratch output | Delete |

To rebuild pages later: restore `_parts/` and `build.py` locally, edit
`merc.html` (the template), run `python build.py`, and commit **only the
regenerated HTML**. Remember `index.html` is hand-maintained and is *not*
regenerated by the builder.
