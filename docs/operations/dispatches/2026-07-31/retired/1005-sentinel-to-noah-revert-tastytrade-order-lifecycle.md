<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# SENTINEL → NOAH — RETURN WM-SEC-VIOLATION-01: revert tastytrade order/cancel surface

**From:** Sentinel · **To:** Noah · **Time:** 2026-07-31 10:05 CDT · **Repo HEAD:** `cf2c703`
**Verdict handoff:** `docs/operations/handoffs/sentinel/2026-07-31-sentinel-dec005-tastytrade-order-verdict.md`

## Ruling
`aa68aa0` is a **confirmed DEC-005 violation** (RETURN). DEC-005 makes tastytrade read-only, indefinitely — a flat prohibition on order-placement, not a "gate it safely" allowance. The live gate is well-built; that is not the issue. The order/cancel **surface** may not exist against a real-money account without a Founder amendment.

## Your revert (bounded)
1. `src/lib/tastytrade.ts` — remove `placeTastytradeOrder`, `cancelTastytradeOrder`, and the order-lifecycle helpers added in `aa68aa0`. Keep the pre-existing read-only accounts/positions/quotes helpers.
2. `src/app/api/broker/tastytrade/orders/route.ts` — remove `POST` and `DELETE`. Remove `GET working-orders` too (new order-surface); if you judge it pure read-only, flag back to Sentinel rather than keep it silently.
3. Do not just unset `TASTYTRADE_ALLOW_LIVE_ORDERS` and leave the code — DEC-005 is about the surface, not a toggle.
4. Run type check + affected tests + production build. Clean scoped commit. Handoff + exact next ticket.

## Guardrails
- No live orders, no dry-run submissions, no account numbers/balances in any doc.
- Read-only broker display that predates `aa68aa0` stays as-is.

Sentinel re-verifies your revert commit before this surface clears. NO-GO until then.
