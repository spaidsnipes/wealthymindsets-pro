# Garden 18 super finish-line order — shift receipt (2026-10-05)

Outcomes use the order's vocabulary only: CLOSED (evidenced) · OPEN · BLOCKED · UNSUPPORTED · NOT ENTITLED · PARTIAL · DEFERRED WITH FOUNDER SCOPE DECISION. No percentages.

## P0-A — Release identity (receipt, 11:51–12:05 CDT)

| Item | Evidence |
|---|---|
| Release candidate | `origin/main` of `spaidsnipes/wealthymindsets-pro` |
| Serving build at shift start | `1307778` (`/api/build-identity`, STAMPED, built 2026-10-05T08:45:04Z) |
| Serving build after first P0 batch | `47d4edc` (same probe, read from the Founder's signed-in tab) |
| Host | Cloudflare Workers (`wealthymindsets-pro`), domain `wealthymindsetspro.com` |
| **The order's "critical contradiction"** | **Resolved by measurement — a STALE CHECKOUT, not lost fixes.** `~/wealthymindsets-pro` (main checkout) was at `ece2ea68`, **0 ahead / 330 behind** `origin/main`. Every "missing" commit (`1f37e81`, `88bc807`, `b5b6464`, `0c3da1d`, `3d4b0c7`, `8dfd670`, `1307778`, `9bf5760`) is an ancestor of `origin/main` and was serving. Nothing was reset; nothing needed restoring. The main checkout's dirty files were left untouched. |
| LiveKit on the candidate (not the stale checkout) | Identity = `wm:<account id>` from the session; `role=host` requires `isLiveHost` (owner or `LIVEKIT_HOST_USER_IDS`); `/api/livekit/approve` is host-only. The order's description matched the stale checkout. |
| Radio on the candidate | Signed upload URLs (no multipart-in-memory), server-chosen path, uploader = account handle only (email-prefix fallback removed `1f37e81`). |

### P0-A fixes shipped this shift
- **Deploy-version recovery** `47d4edc`: a room crash caused by version skew (chunk-load error, or serving SHA ≠ the page's inlined `WM_BUILD_SHA`) reloads ONCE onto the current build; loop-guarded per tab (60 s). Room `error.tsx` + `global-error.tsx`. Tests: `src/lib/deployVersionRecovery.test.ts`. Status: **PARTIAL** — tested in source; the next deploy is the live proof opportunity (an old open tab must land on the new build instead of the error page).

## P0-B — Identity, isolation, live rooms

- **Registered rooms** `47d4edc`: tokens and approvals only for rooms WM publishes (5 Lounge + 3 WM TV), sentinel keeps the list in sync with both pages; approve requires a WM-minted identity (`wm:<id>`); approve errors sanitized. **Proved live** from the owner account: arbitrary room token → 404, arbitrary room approve → 404.
- Account-ID identity for LiveKit / handle-only community authorship: CLOSED in source + tests (`1f37e81`), owner path measured.
- Viewer data messages (raise hand): unchanged (`canPublishData` retained for viewers); schema validation of the data payload is client-side today — **OPEN**.
- **Guest test account: BLOCKED (Founder).** Builders may not create accounts on the production service. Founder creates a disposable guest account (no broker, no paid identity) and shares the session in a separate browser profile; until then guest paths are proved by tests + code only.

## P0-C — Supabase, uploads, auth, email, text

- **Radio content verification** `47d4edc`: a track is recorded only if the stored object's served `Content-Type` is audio and size ≤ 50 MB (HTML / SVG / oversize refused, never listed). Tests: `src/app/api/radio/route.test.ts`.
- **Bucket-level MIME allowlist + size limit: BLOCKED (Founder / Supabase dashboard).** Direct-to-storage enforcement must be set on the `radio` bucket (allowed MIME `audio/*`, limit 50 MB); the app-level check cannot stop a file being stored, only being listed.
- Auth journey (signup → real inbox → confirm → … → revocation): **OPEN** — needs the controlled mailbox / guest account above.
- Text/SMS: no text integration exists in WM Pro. The only "SMS" in the product is the live-room Share menu's `sms:` link, which opens the viewer's own phone app (no WM delivery, no consent burden on WM), and the Webull 2FA wording. No WM text promise found in copy. Status **UNSUPPORTED** (truthfully absent).

## P0-D — Stripe, Passport, tiers

- **Billing owner located:** `~/wow-world-os/worker/billing.js` (WOW World OS, Cloudflare Worker + D1). One product, `WOW_CONNECT`; signature-verified webhook (`verifyStripeSignature`, 300 s tolerance); `entitlements` keyed by `passport_id_ref`; test/live mode separated (`livemode`); billing portal.
- **WM Pro reads no entitlement.** No `$10 / $20 / $30` WM tiers exist in either codebase.
- Status: **DEFERRED WITH FOUNDER SCOPE DECISION** — the tier table in §8 is a proposal; Price IDs, products and the Passport→WM entitlement seam (WM reading WOW's `entitlements` by Passport ID through the existing `/api/passport/*` door) need Founder approval before any billing change. No billing was changed.

## P0-E — Broker boundaries and capital

- Live-order code remains under the classifier block recorded 2026-10-01/04; no builder capital action. Status **BLOCKED (Founder permission rule + scoped live-test authorization)**.

## P0-F — Legal and data rights

- Drafts exist (`docs/legal/TERMS-OF-SERVICE.DRAFT.md`, `PRIVACY-POLICY.DRAFT.md`); `/terms` and `/privacy` still 404. Publishing requires the actual business identity, contact and counsel. **BLOCKED (Founder / counsel).**
- Cboe / OPRA / broker third-party-use rights: **BLOCKED (licensing)** for any external sale or publicity.
