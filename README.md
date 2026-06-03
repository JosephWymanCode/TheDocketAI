# The Docket

A weekly AI briefing for practicing attorneys. Published every Tuesday at 7am ET.

Live at **[thedocketai.news](https://thedocketai.news)**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — no build step, no dependencies |
| Hosting | Cloudflare Pages (auto-deploys from `main`) |
| Backend | Cloudflare Workers (email subscription proxy) |
| Newsletter | [Beehiiv](https://beehiiv.com) |

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Entire landing page — markup, styles, and scripts in one file |
| `worker.js` | Cloudflare Worker: validates emails and proxies to Beehiiv API |
| `wrangler.jsonc` | Cloudflare Worker deployment config (includes rate limiting) |
| `privacy.html` | Privacy Policy page |
| `robots.txt` | Search engine crawl rules |
| `sitemap.xml` | Sitemap for SEO |
| `.dev.vars.example` | Template for local development secrets |
| `logo.svg` | Brand wordmark |
| `favicon.svg` | Browser tab icon |
| `CNAME` | Custom domain (`thedocketai.news`) for Cloudflare Pages |

---

## Local Development

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/):
   ```
   npm install -g wrangler
   ```

2. Copy the example secrets file and fill in your values:
   ```
   cp .dev.vars.example .dev.vars
   ```

3. Start the local dev server:
   ```
   wrangler dev
   ```

   The site is served at `http://localhost:8787`. The Worker runs locally with your `.dev.vars` secrets.

---

## Deployment

### Worker (one-time setup)

1. Log in: `wrangler login`
2. Deploy: `wrangler deploy`
3. Add secrets in the Cloudflare dashboard under **Workers & Pages → docket-subscribe → Settings → Variables & Secrets**:

| Secret | Where to find it |
|---|---|
| `BEEHIIV_API_KEY` | Beehiiv → Settings → API → Generate Key |
| `BEEHIIV_PUBLICATION_ID` | Beehiiv → Settings → Publication (looks like `pub_xxxxxxxx-…`) |

4. Copy your Worker URL (e.g. `https://docket-subscribe.yourname.workers.dev`) and set it as `WORKER_URL` in `index.html` (search for `WORKER_URL =`).

### Static site

Push to `main` — Cloudflare Pages auto-deploys.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BEEHIIV_API_KEY` | Yes | Beehiiv API key (Worker secret) |
| `BEEHIIV_PUBLICATION_ID` | Yes | Beehiiv publication ID (Worker secret) |
| `DEV_ORIGINS` | Local dev only | Comma-separated origins to allow in development (e.g. `http://localhost:3000,http://127.0.0.1:5500`). Never set in production. |

---

## Rate Limiting

The Worker uses Cloudflare's native rate limiting: 10 requests per 60 seconds per IP. Configure the threshold in `wrangler.jsonc` under `rate_limiting`.

---

## Architecture

```
Browser
  └─ POST {email} ──► Cloudflare Worker (worker.js)
                            │  validates CORS, email, rate limit
                            └─ POST ──► Beehiiv API
                                          stores subscriber
                                          sends welcome email
```

The Worker pattern keeps the Beehiiv API key off the client and adds server-side validation before any email is stored.
