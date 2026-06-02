/**
 * THE DOCKET — Cloudflare Worker
 * Handles email subscription by proxying to Beehiiv's API.
 * Keeps your API key secret (never exposed to the browser).
 *
 * ─── SETUP (takes ~5 minutes) ────────────────────────────────────────────────
 *
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create application
 * 2. Choose "Create Worker" → name it "docket-subscribe" → Deploy
 * 3. Click "Edit code" → paste this entire file → Save & Deploy
 * 4. Go to Settings → Variables & Secrets, add two secrets:
 *
 *    BEEHIIV_API_KEY      → your Beehiiv API key
 *                            (Beehiiv → Settings → API → Generate Key)
 *
 *    BEEHIIV_PUBLICATION_ID → your publication ID
 *                            (Beehiiv → Settings → Publication → ID string
 *                             looks like: pub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 *
 * 5. Copy your Worker URL (e.g. https://docket-subscribe.yourname.workers.dev)
 * 6. Paste it into index.html as the WORKER_URL value
 *
 * Free tier: 100,000 requests/day — more than enough for a newsletter.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ALLOWED_ORIGINS = [
  "https://thedocketai.news",
  "https://josephwymancode.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500", // Live Server for local dev
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // ── CORS preflight ──
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin);
    }

    // ── Only accept POST ──
    if (request.method !== "POST") {
      return corsResponse({ error: "Method not allowed" }, 405, origin);
    }

    // ── Parse body ──
    let email;
    try {
      const body = await request.json();
      email = (body.email || "").trim().toLowerCase();
    } catch {
      return corsResponse({ success: false, message: "Invalid JSON" }, 400, origin);
    }

    // ── Basic email validation ──
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsResponse({ success: false, message: "Invalid email address" }, 400, origin);
    }

    // ── POST to Beehiiv API ──
    let beehiivRes;
    try {
      beehiivRes = await fetch(
        `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.BEEHIIV_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            reactivate_existing: false,
            send_welcome_email: true,
            utm_source: "website",
            utm_medium: "organic",
            utm_campaign: "homepage_subscribe",
          }),
        }
      );
    } catch (err) {
      console.error("Beehiiv fetch error:", err);
      return corsResponse({ success: false, message: "Network error reaching Beehiiv" }, 502, origin);
    }

    const beehiivData = await beehiivRes.json().catch(() => ({}));

    // ── Handle Beehiiv responses ──
    if (beehiivRes.status === 201 || beehiivRes.status === 200) {
      return corsResponse({ success: true, message: "Subscribed successfully" }, 200, origin);
    }

    if (beehiivRes.status === 409 || beehiivData?.errors?.[0]?.includes("already")) {
      return corsResponse({ success: false, code: "already_subscribed", message: "Already subscribed" }, 409, origin);
    }

    // ── Unexpected Beehiiv error — log and return generic message ──
    console.error("Beehiiv error:", beehiivRes.status, JSON.stringify(beehiivData));
    return corsResponse({ success: false, message: "Subscription failed — please try again" }, 500, origin);
  },
};

// ── Helper: JSON response with CORS headers ──
function corsResponse(body, status, origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}
