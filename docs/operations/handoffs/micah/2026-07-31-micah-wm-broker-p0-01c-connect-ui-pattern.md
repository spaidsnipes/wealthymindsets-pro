# MICAH DESIGN SPEC — WM-BROKER-P0-01 Part C: Broker connect / status / error-state UI pattern

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-07-31
**Repo HEAD at spec time:** `2e7c60d` · **Lane:** design/spec only — Noah implements. No `src/` here.
**Pairs with:** Forge Part B broker matrix (`docs/operations/handoffs/forge/2026-07-31-forge-broker-expansion-matrix.md`). Forge owns *which* brokers + the adapter/verification; I own how a broker **card** looks and behaves across every state.

---

## 0. Two hard constraints that shape the whole design

1. **Truth discipline (Forge Part B).** Only **Alpaca is [V] verified/integrated.** Tradier/IBKR/Schwab are **[NV]** candidates pending a verification spike + Founder approval; Webull/Robinhood are **reject** (no official API). **The UI must never present an unverified broker as connectable, and never show a "connected"/balance state it cannot verify.** Honest "not yet available" beats a fake Connect button.
2. **Credential safety (non-negotiable).** Connecting must use the broker's **official OAuth in a broker-hosted window** — WM Pro **never renders a field that captures a broker password.** Where a broker uses API keys (Alpaca-style), the field is for the *user* to paste their *own* key generated in the broker's portal, must be masked + never logged, with a link to the broker's key page and explicit copy: "WM Pro never sees your broker password." No auto-fill of secrets.

---

## 1. Card anatomy (one card per broker)

Top-to-bottom:
1. **Broker identity** — logo + name.
2. **Status badge** — the state (see §2), text + icon, never color-alone.
3. **Mode indicator** — **Paper vs Live**, always visible when connected, text + color (safety-critical; live money must never be ambiguous).
4. **Primary action** — Connect / Complete sign-in / Disconnect / Retry (state-dependent, ≥44×44).
5. **Detail line** — masked account label + last-sync time when connected; entitlement/data note otherwise.

---

## 2. States (the core deliverable)

| State | When | Visual | Primary action | A11y |
|---|---|---|---|---|
| **Available — not connected** | verified broker, no session | neutral badge "Not connected" | **Connect** → broker OAuth (external) | button labelled "Connect {broker}" |
| **Connecting / pending** | OAuth in flight / awaiting broker approval | spinner + "Finish sign-in in the broker window" | Cancel | `aria-live=polite` announces transition |
| **Connected — Paper** | session ok, paper acct | green badge "Connected · Paper" + shape/label cue | Disconnect (confirm) | state announced; mode in text |
| **Connected — Live** | session ok, live acct | green badge "Connected · **LIVE**" with a distinct live treatment (not just a different color) | Disconnect (confirm) | "LIVE" spoken, not implied by hue |
| **Auth expired** | token/session expired | amber "Reconnect needed" | **Reconnect** | explains why in text |
| **Error — unreachable** | broker API down/timeout | red "Broker unavailable" + honest reason | Retry | reason in text, not a generic fail |
| **Error — entitlement** | connected but missing market-data/permission | amber "Connected, data not entitled" | link to fix | never fake the data |
| **Error — rate-limited** | throttled | amber "Rate-limited, retrying" + when | auto-retry, show countdown | — |
| **Not permitted (region/T&C)** | broker not allowed for this user | neutral "Not available in your region" | none | honest, no dead button |
| **Not yet available ([NV])** | candidate not greenlit/verified | muted "Coming — pending verification" | **disabled**, no Connect | clearly not actionable |
| **Unsupported (reject)** | Webull/Robinhood etc. | muted "No official API — not supported" OR omit card | none | prevents "why can't I connect?" |

**Rule:** every error state names the *actual* cause and offers the *specific* recovery. No generic "Something went wrong." (Same anti-fabrication discipline as the price-source badge verdict.)

---

## 3. Connect flow (happy path)

1. User taps **Connect** → opens broker OAuth in a broker-hosted window/redirect.
2. Card shows **Connecting** (`aria-live`), with "Finish sign-in in the broker window."
3. On callback success → **Connected**, mode badge (Paper/Live) resolved from the broker, last-sync stamped.
4. On failure/cancel → return to **Available — not connected** (or the specific error), never a stuck spinner.

Disconnect is destructive → confirm ("Disconnect {broker}? Live orders in progress are unaffected."), then revoke the token.

---

## 4. Accessibility & responsive

- Status distinguishable in **grayscale** (icon + text, never color alone) — especially Paper vs Live.
- All actions ≥44×44; keyboard-operable; visible `:focus-visible`.
- Status changes announced via `aria-live="polite"`.
- Card reflows cleanly at 360/390/834 — no truncation of broker name or status; buttons stack, don't clip.
- Long broker names wrap or ellipsize with full name in `title`/`aria-label` (zero silent truncation).

## 5. Acceptance criteria (Noah verifies)
1. Every state in §2 renders; only **[V]** brokers expose a live Connect; **[NV]**/reject brokers are clearly non-actionable.
2. No password-capture field anywhere; connect is broker-hosted OAuth; any API-key field is masked, unlogged, with a "we never see your password" note + link to the broker's key page.
3. Paper vs Live unambiguous and grayscale-legible; Live has a distinct non-color treatment.
4. Every error names its real cause + specific recovery.
5. No fake "connected"/balance/data ever shown; unverifiable → honest unavailable.
6. ≥44px targets, keyboard, `:focus-visible`, `aria-live` on status.
7. **Screenshots at 360×800, 390×844, 834×1194, desktop** of: not-connected, connecting, connected-Paper, connected-Live, an error state, and a not-yet-available card. *(These are design states — mock/prototype screenshots are acceptable here since no live broker beyond Alpaca exists yet; real-connect capture waits on Forge's greenlit adapter. Mobile-width authed capture remains display-clamp/RISK-001 constrained per `2026-07-30-micah-scanner-a11y-ticket.md §3.5`.)*

## 6. Never in scope
Which brokers ship, adapter/OAuth implementation, market-data entitlement logic, executing any trade or transfer (prohibited). This spec governs the card's look + state behavior + credential-safe connect affordance. Presentation + interaction only.
