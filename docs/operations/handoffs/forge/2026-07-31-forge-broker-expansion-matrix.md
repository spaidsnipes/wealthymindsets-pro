# WM-BROKER-P0-01 · Part B — Real-broker expansion matrix (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-07-31 · **Repo HEAD:** `50dc7cb`
**Type:** Decision aid. **Not a plan, not a commitment.** No broker is added without explicit Founder scope approval (per dispatch).
**Founder intent:** *"add some more real brokers people will be able to actually connect with and use."*

> **Truth discipline.** Every cell below is either **[V]** (verified against the repo — e.g. Alpaca already integrated) or **[NV] needs-verification** (my current understanding, to be confirmed against each broker's live API docs + T&C before any build). I will not present unverified integration details as fact. Fee/entitlement/OAuth specifics change and are marked accordingly.

## Candidate matrix

| Broker | US retail | Programmatic connect (retail) | Paper + Live | Cost to the trader | Legal / T&C blockers | Integration effort | Forge lean |
|---|---|---|---|---|---|---|---|
| **Alpaca** | Yes | **OAuth + API keys [V]** — already integrated | Paper **[V]** + Live | Commission-free equities/crypto | Already accepted | **Done** (baseline) | Keep as reference impl |
| **IBKR** (Interactive Brokers) | Yes | Client Portal Web API / OAuth **[NV]** | Paper + Live **[NV]** | Low, tiered | Robust API T&C; approval flow **[NV]** | **High** — OAuth1a + gateway session model is heavy | **Tier-1 candidate** (breadth: futures/options/global) |
| **Tradier** | Yes | **OAuth 2 brokerage API [NV]** — retail-friendly | Sandbox + Live **[NV]** | Per-trade or flat plan | Cleanest retail OAuth of the set **[NV]** | **Low–Med** — closest to Alpaca's shape | **Tier-1 candidate** (fastest honest win) |
| **Schwab** (ex-TDA) | Yes | Trader API / OAuth 2 **[NV]** — post-TDA migration | Live; paper? **[NV]** | Commission-free equities | App approval + review queue **[NV]**; migration churn | **Med–High** | **Tier-2** — large user base, but onboarding friction |
| **Webull** | Yes | **No official public retail trading API [NV]** | — | Commission-free | **Unofficial APIs only → do NOT integrate** | N/A | **Reject** unless official API confirmed |
| **Robinhood** | Yes | **No official public API [NV]** — unofficial reverse-engineered only | — | Commission-free | **Legal/ToS risk — unofficial API violates ToS [NV]** | N/A | **Reject / flag legal** — do not ship an unofficial-API integration |

## Recommendation (for Founder decision — not executed)

1. **Tradier first** — most likely the fastest *honest, official, retail-OAuth* addition; architecture mirrors the existing Alpaca adapter.
2. **IBKR second** — highest breadth (futures, options, global) but a genuinely heavier session/OAuth model; scope as its own P0 with a verification spike before committing.
3. **Schwab third** — large audience, but budget for app-approval latency.
4. **Reject Webull + Robinhood** for now: no official public retail trading API. An unofficial/reverse-engineered API would violate ToS and the truth/trust posture — **do not integrate without an official, T&C-clean API path.**

## Required next step before ANY build (evidence gate)

For each greenlit broker, a **read-only verification spike** must confirm and record: official retail API exists · OAuth/connect flow · sandbox/paper availability · market-data entitlement · **T&C permits third-party app connection** · effort estimate. Same evidence-first discipline as `WM-CHART-P0-01A`. **No adapter code before that spike + Founder scope approval.**

**Out of scope of this document:** committing to any broker, writing adapter code, or executing trades. This is a shortlist to unblock a Founder decision.
