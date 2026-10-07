# MEMBER-OWNED BROKER CONNECTIONS — design + threat model

Status: BUILT for tastytrade (market data, read scope only). Webull: designed, NOT built for members (see §6).
Date: 2026-10-06/07. Source directives: Founder (Oct 6 evening) "we can just have people use their own
tastytrade and use my referral links for webull and tastytrade"; Garden 19 §25.

## 1. The rule this implements (Garden 19 §25, verbatim intent)

- Members use their OWN supported broker accounts and their OWN entitlements.
- The Founder's credentials stay private. `tastytradeOwnerGate` still 403s every non-owner on every
  owner route; nothing in this lane reads `TASTYTRADE_*` env for a member.
- Connecting a broker does not mean every entitlement exists. Capabilities are MEASURED from the
  broker (accounts list, quote-token `level`) at connect time and on each status read — never assumed.
- Referral doors may help a member open an account. A referral relationship creates NO data
  entitlement, and the copy on the door says so.

## 2. What tastytrade actually allows (researched 2026-10-06, developer.tastytrade.com/docs/authentication/oauth2)

- **Personal OAuth application**: "restricted to your account only". Created at my.tastytrade.com →
  Manage → My Profile → API → OAuth Applications. "Create Grant" displays a refresh token. Refresh tokens
  "do not expire"; the user revokes by deleting the grant. Scopes: `read`, `trade`, `openid`; sensitive
  scopes require the customer to have 2FA on.
- **Third-party application** (one WM app that other tastytrade customers authorize through a redirect):
  requires tastytrade's "trusted third party verification" — contact api.support@tastytrade.com.

So there are two lawful shapes:

| Path | What the member does | What WM holds | Approval needed |
|---|---|---|---|
| A. Member brings their personal app (BUILT) | creates their own personal OAuth app + grant, pastes client secret + refresh token into WM | that member's secret pair, encrypted | none from tastytrade, BUT the member is handing a personal-app credential to a third party — see §7 Founder decision |
| B. WM partner app (NOT BUILT) | clicks "Connect tastytrade", approves on tastytrade's page | an OAuth refresh token per member | tastytrade third-party verification |

Path B is the durable, scalable one and the one tastytrade designed for multi-user apps. Path A is what
ships tonight because it needs nothing from tastytrade and matches the Founder's instruction; the grant
store, the resolver and the UI were built so Path B only swaps the "how did we get the refresh token"
step (an OAuth callback writing the same encrypted grant).

## 3. Path A flow

1. Member opens Connections (the broker panel on /charts and /readiness) → tastytrade card → "Connect
   your own tastytrade". The card shows a 5-step how-to (create personal OAuth app with **read** scope
   only, Create Grant, copy client secret + refresh token).
2. `POST /api/broker/member/tastytrade` with `{ clientSecret, refreshToken }` (JSON body only — never a
   URL, never a query string).
3. Server: `requireAuth` → user id from the verified WM session (`auth.user.sub`), NEVER from the body.
   Owner is refused (409: the owner's wire is the deployment env). Same-origin check. Rate limit
   (5/10 min per user, connect + disconnect share a bucket). Shape check (length, no whitespace).
4. VALIDATE BEFORE STORE: refresh grant with `scope: "read"` (WM never asks a member grant for `trade`)
   → `GET /customers/me/accounts` → `GET /api-quote-tokens`. Any failure → nothing stored, the answer is
   the broker's HTTP status only (no body echo, no secret echo).
5. Store: AES-256-GCM, key derived (HKDF-SHA256) from `WM_BROKER_GRANT_KEY`, random 96-bit IV, AAD =
   `tastytrade|<userId>` so a ciphertext copied under another member's key does not decrypt. KV key =
   `broker-grant:v1:tastytrade:<sha256(userId)>` in the existing `WEBULL_SESSION` namespace (separate
   prefix; no new namespace to provision). Stored plaintext metadata: provider, account COUNT,
   quote-token level, timestamps. No account numbers, no secrets.
6. Use: `quote-token`, `chain`, `market-data`, `market-metrics` resolve credentials:
   owner → Founder env (unchanged) · member with a grant → member's own client · otherwise → the same
   403 as before (the browser already falls back to the public feeds on 403).
   Candles and prints ride the DXLink socket opened with the quote token, so they follow automatically.
7. Disconnect: `DELETE /api/broker/member/tastytrade` deletes the KV record and the isolate's cached
   access token / quote token for that user. The member should also delete the grant at tastytrade (the
   UI says so) — only that revokes the refresh token itself.

## 4. Threat model

| Threat | Control |
|---|---|
| Member A reads/uses member B's grant | Every read/write keyed by `auth.user.sub` (server-verified JWT). No route takes a user id from the client. AAD binds ciphertext to the user id (test: B's key holding A's ciphertext fails to decrypt). |
| A member reaches the Founder's account | Owner routes unchanged (`tastytradeOwnerGate`). Member path never reads `TASTYTRADE_*` env; resolver test pins it. |
| Plaintext secrets at rest | Only AES-GCM ciphertext stored; test scans the raw KV value for the secret strings. No key set → feature reports `MEMBER_CONNECTIONS_NOT_ENABLED` and stores nothing. No KV binding → same. |
| Secrets returned to browser / logged / in URLs | Status responses carry booleans + counts only (test asserts secrets absent). No `console.*` in the lane. Inputs accepted from JSON body only. Errors are `HTTP <status>` only. |
| Member grant used to trade | Refresh grant requests `scope: "read"`. No order route consults member grants (order-submit/cancel/dry-run remain owner-only and were NOT modified). How-to tells the member to tick `read` only. |
| Credential stuffing / brute force / tastytrade abuse via WM | Connect/disconnect rate limit 5 per 10 min per user; data routes keep `TASTY_READ_LIMIT` per user. |
| CSRF on connect/disconnect | Session cookie is SameSite=Lax; routes also require `Origin` to match the request host when present. |
| Key compromise | Rotating `WM_BROKER_GRANT_KEY` makes every stored grant undecryptable → members read "reconnect needed" (status `GRANT_UNREADABLE`) — fail closed, never a crash. |
| KV leak alone | Ciphertext only; key lives in Worker secrets, never in KV. |
| Isolate memory | Member access tokens (15 min) and quote tokens (20 min) cached per user id in-isolate; dropped on disconnect/reconnect. |
| Stale "connected" claim | Status re-measures only on connect; the readout shows "validated at <time>" and a live read failure on any data route says PROVIDER_REFUSED — never LIVE. |

## 5. Capability readout (honest, measured)

`GET /api/broker/member/tastytrade` → `{ enabled, connected, validatedAt, accounts, quotes, level }`.
`quotes` = `/api-quote-tokens` answered; `level` = what tastytrade said (e.g. `api`/`delayed` — shown
verbatim). Real-time vs delayed is NOT claimed beyond that value. The feed chip shows LIVE for a member
only when THEIR DXLink socket is actually delivering events (same rule as the owner).

## 6. Webull for members — designed, not built

The Webull adapter is single-tenant: one `WEBULL_APP_KEY/SECRET`, one deployment session in KV
(`webull:session:v1`), 2FA/keeper flow, MQTT market-data stream with a separate paid OpenAPI market-data
subscription. Per-member Webull needs: per-user session keys in the session store, per-user signing
(the signer reads env today), per-user 2FA handling, and Webull's own terms on third parties. Market
data via Webull OpenAPI is a separate subscription the member would have to buy. Tonight the Webull card
for members is a referral/sign-up door + an honest "member connections for Webull aren't available yet".

## 7. What the Founder must set / decide

- `WM_BROKER_GRANT_KEY` (Worker secret, server-only): 32+ random bytes, base64. e.g.
  `openssl rand -base64 32` → `wrangler secret put WM_BROKER_GRANT_KEY`. Unset = feature reports
  "member connections not enabled".
- `NEXT_PUBLIC_TASTYTRADE_REFERRAL_URL`, `NEXT_PUBLIC_WEBULL_REFERRAL_URL` (build-time, public): his
  referral links. Unset = plain public sign-up links, nothing labelled referral.
- DECISION: Path A has members paste a personal-app credential into WM. tastytrade documents personal apps
  as "restricted to your account only" and requires verification for apps serving other users. Before
  marketing this broadly, the Founder should email api.support@tastytrade.com to (a) confirm Path A is
  acceptable and/or (b) start third-party verification for Path B. Until then keep the copy "beta, your
  own account, read-only".
