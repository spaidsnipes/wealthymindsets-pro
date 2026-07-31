# WM-BROKER-P0-01 · Part A — Tastytrade shows no futures · ROOT-CAUSE (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-07-31 · **Repo HEAD:** `50dc7cb`
**Type:** Architecture root-cause + contract for Noah. Forge does not ship (DEC-008/DEC-012).
**File audited (grep-verified live, not dead):** `src/lib/tastytrade.ts` — imported by the broker/capabilities routes; not orphaned.

---

## 1. Root cause — futures are *claimed* but never *wired*

Two distinct defects:

- **D-1 · Capability is hardcoded, not verified.** `getTastytradeCapabilities()` sets `base.supportedAssetClasses = ["equity", "option", "future"]` **unconditionally** the moment the accounts fetch succeeds (`tastytrade.ts:172`). Meanwhile `isFuturesApproved` **is** computed per account (`:130`, from `futures-account-purpose`) but is **never read** by the capability function. So the app asserts futures support even for an account with no futures entitlement — a direct violation of this file's own doctrine (`:149` *"Verify real capability rather than assume it"*) and Founder truth rule §5.

- **D-2 · No futures instrument or streamer-symbol path exists anywhere.** The file has `/customers/me/accounts` and `/api-quote-tokens` only. There is **no** call to a futures instrument endpoint (`/instruments/futures`, `/instruments/future-products`) and **no** futures → dxFeed streamer-symbol mapping. Tastytrade futures quote via dxFeed use a distinct symbology (e.g. streamer symbol `/ESU5:XCME`), not the equity ticker. Without that resolution, subscribing to a futures symbol returns nothing → **"shows no futures."** The Connect-Broker / Trade UI has no futures product list to render because nothing ever fetches one.

## 2. Contract for Noah — `WM-BROKER-P0-01-A`

**Files:** `src/lib/tastytrade.ts` (+ the API route that surfaces broker capabilities/instruments to the UI).

1. **Derive, don't assert (fixes D-1).** `supportedAssetClasses` must be built from evidence: `"future"` is included **only if** at least one account has `isFuturesApproved === true` **and** a futures-instrument probe returns products. Otherwise futures is reported `unavailable` with an honest reason (`"account not approved for futures"` vs `"futures instruments unavailable"`).
2. **Wire the futures product path (fixes D-2).** Add `getTastytradeFutureProducts()` / `getActiveFutures()` hitting the futures instrument endpoint; map each to its dxFeed **streamer symbol** for quote subscription. Surface the active-contract list to the UI.
3. **Entitlement honesty.** Real-time vs delayed stays `realTime: null` until a verified quote timestamp proves it (existing doctrine at `:181` — keep it).

**Tests:** account **with** futures approval → `future` in `supportedAssetClasses` and a non-empty product list; account **without** → `future` **absent** + honest reason; futures symbol resolves to a valid streamer symbol; no path hardcodes `"future"`.

**Acceptance:** Founder sees real active futures (e.g. `/ES`, `/NQ`, `/CL`) in Connect Broker / Trade **iff** the connected account is entitled; otherwise an honest unavailable reason. **Blocked on:** confirming the connected tastytrade account's futures entitlement (probe first — do not build UI on an unverified assumption). Sentinel confirms both the entitled and non-entitled states render honestly.

> **Scope discipline:** read-only capability + instrument wiring only. No order placement, no futures *trade* execution in this ticket. Live brokerage order actions remain out of scope and Founder-gated.
