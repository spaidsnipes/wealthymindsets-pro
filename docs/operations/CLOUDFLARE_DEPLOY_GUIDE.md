# WM PRO → CLOUDFLARE DEPLOY GUIDE — Founder-facing click-by-click

**Purpose:** get WM Pro onto Cloudflare after the Vercel billing pause. This guide + the new `.env.example` in the repo root are the two artifacts you need. Every step below is safe. Where a step requires typing a secret VALUE, you type it yourself — never paste any secret into a chat window / Drive doc / commit.

**Status at time of writing (2026-08-23):**
- WM Pro `main` HEAD: latest baton is `CLAUDE_SESSION_2026-08-23_SHIFTJ_BATON.md`
- 960 tests PASS, tsc clean, six preserved dirty files intact
- Vercel prod: HTTP 402 `DEPLOYMENT_DISABLED` (billing paused, Founder to resolve)
- Cloudflare Dreamboard has already deployed successfully (per Hosting Runbook §8) — proving the path works

---

## Why the build keeps failing right now

Three real reasons — knock them out in order and the build boots:

1. **The repo has no Cloudflare adapter yet.** `next dev` / `next build` alone don't produce a Workers-runnable artifact. Cloudflare Workers wants either OpenNext output or Pages Functions. This shift shipped `.env.example` but did NOT install the adapter package — that's your call to make once you decide Workers-vs-Pages.
2. **Env var NAMES don't match between your Registry doc and the code.** Cloudflare will happily install `ALPACA_PAPER_TRADE_API_KEY` from your Drive doc; the code reads `ALPACA_PAPER_KEY`. That's a silent build-time success followed by runtime "no key" errors. `.env.example` at the repo root now lists the exact NAMES the code reads.
3. **Secrets in Drive doc are a P0 leak.** Your Env Registry has raw values pasted in — canon §11 of the Hosting Runbook says never. Rotate every one after cutover, paste only NAMES back.

---

## Path A — Cloudflare Pages (easier, works for many Next apps)

Best if you want to click through a dashboard and let Cloudflare autodetect Next.js.

### Step 1 — Open Cloudflare Pages
1. Go to `https://dash.cloudflare.com/`
2. Left rail → **Compute** → **Workers & Pages** → **Create** → **Pages** → **Import an existing Git repository**.
3. Authorize your GitHub if you haven't already. Pick `spaidsnipes/wealthymindsets-pro`. Branch: `main`.

### Step 2 — Build settings
- Framework preset: **Next.js**
- Build command: `npm run build`
- Build output directory: `.next` (or `.vercel/output/static` if the adapter prompt appears)
- Root directory: (leave blank — repo root)
- Node.js version: `24` (matches Vercel per your registry)

### Step 3 — Environment variables (BEFORE first deploy)
1. Click **Environment variables** section (before "Save and Deploy").
2. Open `.env.example` in the repo — it has every NAME the code reads.
3. For each NAME, click **Add variable**, type the NAME exactly, and paste the VALUE from your password manager. **Do not skip any variable.** Do not type values from the Drive doc unless you first rotate them (see Rotation section below).
4. Mark server-only secrets as **Encrypted at rest** (the eye-icon toggle) — that's every non-`NEXT_PUBLIC_*` variable.
5. Apply to both Production and Preview scopes (per canon §Runbook A.4).

### Step 4 — Save and Deploy
- Click **Save and Deploy**. Cloudflare will run `npm ci` + `npm run build`.
- If the build fails, click the failed deployment → **View build log**. **Do not screenshot the log to me if it contains any secret values.** Copy just the RED error lines back into chat and I'll diagnose.

---

## Path B — Cloudflare Workers via OpenNext (the pattern your Dreamboard uses)

Use this if Pages autodetect misses SSR / Server Actions / middleware behavior.

### Step 1 — Locally, install the adapter
```bash
cd ~/wealthymindsets-pro
npm install --save-dev @opennextjs/cloudflare wrangler
```

### Step 2 — Create `wrangler.jsonc` at repo root
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "wealthymindsets-pro",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-05-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### Step 3 — Create `open-next.config.ts` at repo root
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

### Step 4 — Update `package.json` scripts
Add (do not replace `build`):
```
"preview:cf": "opennextjs-cloudflare build && wrangler dev",
"deploy:cf":  "opennextjs-cloudflare build && wrangler deploy"
```

### Step 5 — Local preview against the Workers runtime
```bash
npm run preview:cf
```
This is the "Cloudflare production-like preview" the Hosting Runbook §4 mandates before calling migration complete. Real Workers/workerd runtime, not `next dev` under Node.

### Step 6 — First deploy
```bash
npm run deploy:cf
```
Cloudflare deploys as a Worker. Fine URL: `wealthymindsets-pro.<subdomain>.workers.dev`.

### Step 7 — Secrets install via wrangler (safer than dashboard paste)
For each server-only secret in `.env.example`:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
Wrangler prompts you for the value in the terminal — never appears on screen, never in a URL. Repeat for each secret. Non-secret `NEXT_PUBLIC_*` variables go in `wrangler.jsonc` under a `vars` block.

---

## SPECIFICALLY — the Supabase env vars you asked about

Whichever path you pick, these four names go into Cloudflare (from `.env.example`):

| Name | Where in Supabase dashboard | Server / Client |
|------|------------------------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon `public` key** | Client + Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API → **Publishable API key** (new API keys system) | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role `secret` key** | **Server only — mark encrypted** |

**Do not** paste the service-role key into any browser-side variable name (no `NEXT_PUBLIC_` prefix on it, ever).

After Cloudflare install, in Supabase → **Authentication → URL Configuration**:
- Add your new Cloudflare URL to **Site URL** and **Redirect URLs** (both the `.workers.dev` preview URL and your production domain).
- Keep the old Vercel URLs in the Redirect URLs list until the Vercel prod is retired — that's the canon rollback path.

---

## Rotation — do this AFTER Cloudflare boots successfully

Because your Registry doc has raw secret values in it, you should assume they may already be exposed. After Cloudflare is live:

1. Supabase → Project Settings → API → rotate the `anon`, `publishable`, and `service_role` keys.
2. Update Cloudflare env vars with the new values (via wrangler `secret put` or dashboard).
3. Alpaca / Tastytrade / Webull / Gemini / Finnhub / Twelve Data / BigData / LiveKit / Resend — rotate each at the provider dashboard, update Cloudflare secrets.
4. Delete the raw values from the Drive doc. Keep only NAMES. Values live in your password manager only.

---

## Rollback plan (never skip)

Per Hosting Runbook §Emergency Exit:
- Keep the Vercel project — even paused — until Cloudflare passes a 24-hour observation window.
- Don't cancel Vercel billing until: (a) Cloudflare deploy is stable, (b) domain cutover DNS has propagated globally, (c) auth callbacks in Supabase have been updated to include the new host.
- If Cloudflare fails post-cutover: resume Vercel billing → DNS back to Vercel → you're back on the last-known-good build.

---

## What I did this shift to unblock this work

- Shipped `.env.example` at repo root (this file) — every NAME the code reads, no values.
- Shipped this guide (`docs/operations/CLOUDFLARE_DEPLOY_GUIDE.md`).
- Verified `.gitignore` protects `.env`, `.env.local`, `.env.*.local`, `.env.production`.
- Documented CODE ↔ REGISTRY name mismatches inside `.env.example` so nothing silently 500s at runtime.

## What YOU still own (per Founder-Question Gate §22)

- Rotating exposed keys (only you have the provider accounts).
- Approving Path A vs Path B (Pages vs Workers OpenNext).
- Typing each secret value into Cloudflare (safety rules forbid me from doing this).
- Domain DNS cutover approval.

## Next exact actions if you want me back on this

1. Tell me the exact RED error lines from the failing Cloudflare build log (redact any secret values first). I'll diagnose.
2. Tell me whether you're going Pages (Path A) or Workers/OpenNext (Path B). If B, I can add the config files as one commit — no packages installed until you approve.
