# deploy/ — what these files are and where each one has to go

**Nothing in this folder does anything while it is in this folder.** Hosts look
for these files at specific paths. Move the ones you need, then commit.

This whole folder is excluded from the published site by `.gitignore`? — **no,
it is not.** `deploy/` is small and harmless and is deliberately left tracked so
the next person can find it. It will be publicly readable at
`https://twistedrootsmerc.com/deploy/`. If that bothers you, add `/deploy/` to
`.gitignore` **after** you have moved the files you need to the root.

| File | Move it to | Needed for | Notes |
|---|---|---|---|
| `_headers` | repo root → `./_headers` | **Cloudflare Pages** (recommended), Netlify | Security headers + cache policy. GitHub Pages ignores it completely. |
| `_redirects` | repo root → `./_redirects` | **Cloudflare Pages** (recommended), Netlify | Path redirects and short URLs. Cannot do www→apex or http→https — those are dashboard settings. |
| `netlify.toml` | repo root → `./netlify.toml` | Netlify **only** | Only if you reject the Cloudflare recommendation. Contains the `pretty_urls = false` switch that Cloudflare has no equivalent for. |
| `github-pages.yml` | `.github/workflows/github-pages.yml` | GitHub Pages **only** | Directory name and location are mandatory. |
| `wrangler.toml` | a **separate** repo, later | The future Square sync | Do not put this in the website repo root — it would be served publicly. |

## If you follow the recommendation (Cloudflare Pages)

You need exactly two of these files:

```bash
cd /path/to/twisted-roots-merc
git mv deploy/_headers   _headers
git mv deploy/_redirects _redirects
git commit -m "deploy: security headers, cache policy and path redirects"
git push
```

Everything else in this folder is reference material for the roads not taken.

Full instructions, DNS records, and the `hq.html` lockdown are in
**`../DEPLOY.md`**. Read that first.
