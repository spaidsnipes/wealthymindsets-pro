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
measured. ~~One unproven-but-testable hypothesis worth putting to Webull
directly: his portal reads "Using OpenAPI service in **Paper trading**," and a
paper OpenAPI context may not carry real-time US equity data.~~ **RETRACTED
2026-09-21 — see the Corrections section below.**

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

## Corrections (2026-09-21)

Two claims in the sections above have been re-opened at the Founder's
instruction — *"lets not just bypass this webull issue."* Both are recorded
here rather than quietly deleted, because a document about not guessing may not
launder its own guesses.

### 1. RETRACTED — the "paper trading" hypothesis

Founder correction, verbatim: *"webull has a paper trading api i have you the
real api."* Webull ships paper trading as a **separate API**, and the
credentials on this host are the real-trading ones. The portal label that
prompted the hypothesis was not evidence that our requests run in a paper
context, and the hypothesis was never measured.

It also failed the standard this very document sets. A denial describes the
provider's view of OUR request; a *portal label* is even weaker — it is not
about our request at all. Offering it as a lead pointed the Founder back at his
own account setup for the second time. That is the three-month failure shape,
committed inside the file written to prevent it.

### 2. INVESTIGATED AND DISPROVED — the wrong-host theory (mine)

`webull/core/data/endpoints.json` declares **two** hosts for region `us`:

```json
"us": {"api": "api.webull.com", "quotes-api": "data-api.webull.com", ...}
```

Our three Webull modules (`webullMarketData.ts`, `webullEntitlementProbe.ts`,
`webullBrokerConnection.ts`) all hard-code `api.webull.com`. That looked like it
explained the ladder perfectly: trading rungs 200, market-data rungs 403.

It does not. Traced through the SDK rather than asserted:

- `core/client.py:380` builds `ResolveEndpointRequest(self._region_id)` and
  passes **no** `api_type`.
- `resolver_endpoint_request.py` defaults `api_type` to `HTTP_API_TYPE`, which
  `core/common/api_type.py` defines as `DEFAULT = "api"`.
- The only caller that asks for `api_type.QUOTES` is
  `data/internal/quotes_client.py:177`, inside `_quotes_connect(self, host,
  port)` — a persistent socket, not a REST call.

**So REST market data belongs on `api.webull.com`, and our host is correct.**
The wrong-host explanation is dead for the REST lane, and the "host proven good
by measurement" claim in the table above survives.

### 3. NEWLY SURFACED — an unexplored lane, not a wall

What (2) exposes is that Webull's real-time quote path is a **persistent socket
to `data-api.webull.com`**, and **WM Pro does not implement it at all**. That is
not an entitlement wall and not a defect; it is a lane nobody has measured. It
is the first Webull thing to measure next, and until it is measured nothing may
be said about what it would return.

## Still open

Webull's **broker** lane is CONNECTED (3 accounts) and **nothing on the glass
consumes it**. By the Drive canon ladder that is not VISIBLE/OPERATIONAL. The
order-flow surface this data is meant to feed cannot be certified until the
market-data lane opens AND a surface renders it.
