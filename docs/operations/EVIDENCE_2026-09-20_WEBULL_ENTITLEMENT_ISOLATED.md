<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **measurement receipt for one minute**, not a standing statement of
> Webull's wire. Its rung table was true at the `checkedAt` stamp below and goes
> `STALE` the moment Webull, the account, or the key changes — none of which
> announce themselves to this file. Do not cite the verdict as today's state.
>
> **Re-measure instead of reading:** `GET /api/market-data/webull/entitlement?symbol=TSLA`
> re-runs the identical ladder live. That endpoint, not this page, is the
> current authority on entitlement.
>
> What this document *does* keep standing is the **lesson**, which is dateless:
> a provider error code describes the provider's view of *our* request, and is
> not evidence about the operator's account until our request is known-correct.
<!-- END:ath-historical-lineage -->

---

# Webull market data — the three-month "subscription" that was our own bad request, and what is actually left

**Date:** 2026-09-20 · **Commits:** `b4520d0b`, `08e0d1e6`, `cc5e3690` · **Cloudflare Version ID:** `6345aa3b-b0fc-4883-91f9-98586a5a2800`

## The correction that has to come first

For roughly three months WM Pro sent its Webull tick read to
`/openapi/market-data/stock/tick` at `x-version: v2`. That path does not exist.
Webull answered **403 MARKET_DATA_NOT_SUBSCRIBED**, a code that names a
subscription, so the conclusion drawn every time was that the Founder needed to
buy a market-data package. He had already bought one, and his API key carries
Market Data and Trading both.

**A provider error code describes the provider's view of *our* request. It is
not evidence about the operator's account until our request is known-correct.**

The official Webull Python SDK declares the tick read as
`/market-data/stocks/ticks/list` at `v3` (`webull/data/request/get_tick_request.py`),
and `core/http/response.py` composes `https://{host}{path}` verbatim — no
prefix of its own. Fixed in `b4520d0b`.

Be precise about the prefix. "Webull has no `/openapi`" is the WRONG lesson and
would cause the next bug: `/openapi/instrument/option/contracts` and
`/openapi/fundamentals/fund/dividends` genuinely carry it. The prefix is
**per-endpoint**. Read the SDK for each one.

## Why it survived three months

Not because it was hard to find. A code comment at the declaration site
asserted, flatly and without citation, that the broken path was "Webull's
current official SDK request contract" and that the correct path "returns an
access-looking failure". Both false. It told every subsequent reader not to look
where the answer was. **An uncited provider claim in a comment is a landmine
with a friendly label.**

## The measurement (production, Founder's authenticated browser)

`GET /api/market-data/webull/entitlement?symbol=TSLA` → HTTP 200:

| Rung | Gate | HTTP | Provider code | Outcome |
|---|---|---|---|---|
| ACCOUNTS `/trading/accounts/list` | non-market-data | 200 | — | OK |
| PROFILES `/trading/instruments/stocks/profiles/list` | non-market-data | 200 | — | OK |
| SNAPSHOT `/market-data/stocks/snapshots/list` | market-data | 403 | `MARKET_DATA_NOT_SUBSCRIBED` | DENIED_ENTITLEMENT |
| TICKS `/market-data/stocks/ticks/list` | market-data | 403 | `MARKET_DATA_NOT_SUBSCRIBED` | DENIED_ENTITLEMENT |

**Verdict: `ENTITLEMENT_ISOLATED`** · `checkedAt` 2026-09-21T03:04:17Z

All four rungs share one host, one credential pair, one signing contract and one
signing profile. Two opened and two were denied. Signing, host, path, version,
access token and credentials are therefore **proven good by measurement, not by
argument** — which is exactly the proof that was missing in June, when a single
denied endpoint could not tell a malformed request from a missing package.

## What this licenses saying, and what it does not

**Licensed:** every part of the request WM Pro controls is correct, and the
remaining gap is on the market-data entitlement axis.

**NOT licensed:** naming which entitlement, or telling the Founder what to buy.
The checkbox on his API key is a *permission scope on the key*; whether that is
the same object as a *data package on the account* is not something this probe
measured. One unproven-but-testable hypothesis worth putting to Webull directly:
his portal reads "Using OpenAPI service in **Paper trading**," and a paper
OpenAPI context may not carry real-time US equity data. **Unproven. Ask, do not
assume — assuming is what cost three months.**

## What stops the recurrence

- `src/lib/marketData/webullSdkContract.ts` — the only place a Webull path or
  version may be decided. Every row cites the SDK file it was transcribed from.
- `webullSdkContract.sentinel.test.ts` — fails the build if any Webull
  production module hard-codes a request path, and pins the specific values that
  were wrong so a "restore" shows up as a deliberate act in a diff.
- `webullEntitlementProbe.ts` + `/api/market-data/webull/entitlement` — a bare
  403 classifies as `DENIED_OTHER`, never entitlement; an all-denied ladder
  reads as `CREDENTIAL_OR_CONTRACT_SUSPECT` with the note "This is NOT evidence
  that a market-data subscription is missing." The probe cannot be talked into
  blaming the operator's wallet.
- Registered `OPERATOR_DIAGNOSTIC` in `apiEndpointsHaveConsumers.test.ts` at
  birth, not retro-fitted.

Suite 873 files / 11,181 tests green; `tsc --noEmit` clean.

## Still open

Webull's **broker** lane is CONNECTED (3 accounts) and **nothing on the glass
consumes it**. By the Drive canon ladder that is not VISIBLE/OPERATIONAL. The
order-flow surface this data is meant to feed cannot be certified until the
market-data lane opens AND a surface renders it.
