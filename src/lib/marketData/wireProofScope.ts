/**
 * WHICH INSTRUMENT DID THE WIRE PROOF ACTUALLY PROVE?
 *
 * ── The gap ─────────────────────────────────────────────────────────────────
 *
 * `ProviderWireStrip` probes every broker tick route with ONE hardcoded
 * symbol — `TSLA`, a US common stock — and then renders a PROVIDER-level chip
 * reading "Ticks receiving". Those two facts are not the same size.
 *
 * The details it emits are careful about everything except this. They say
 * "real-time entitlement not certified", "streaming continuity not certified",
 * "provider-signed side" — every axis of doubt is named except the one the
 * probe actually has: it asked about a single US equity and answered for the
 * whole wire. A trader whose watchlist is `ES1!`, `NQ1!`, `RTY1!` and
 * `EURUSD=X` reads "Ticks receiving" on the moomoo row and concludes the
 * futures feed is live. Futures were never asked.
 *
 * This is the PROVIDER HEALTH LAW one layer further in. That law forbids
 * collapsing "connected" into "healthy"; `providerWireProofDepth.test.ts`
 * already enforces it for the config-vs-wire distinction. The same collapse
 * happens again between "this one instrument ticked" and "this wire ticks".
 *
 * ── Why the fix is a SENTENCE and not more probes ───────────────────────────
 *
 * The obvious repair — probe one instrument per asset class — multiplies every
 * refresh by six per provider. This repo has already been burned by exactly
 * that shape: a Finnhub 429 self-storm starved the stock tape. `RATE LIMITED`
 * is a state these very receipts can return, so a fix that manufactures rate
 * limiting would be trading a true-but-narrow claim for a false one.
 *
 * The defect is not that the probe is narrow. A narrow probe is a fine, cheap,
 * honest thing. The defect is that the narrow probe was reported as a wide
 * one. So the scope is DISCLOSED rather than widened, and the reach the proof
 * does not have is named in the same breath as the reach it does.
 */

/**
 * The single instrument every provider tick probe asks about.
 *
 * Owned here because it was previously retyped as a bare `"TSLA"` string in
 * the probe URL, in `BrokerConnectPanel`, and in that panel's user-facing
 * copy — three places that had to agree and nothing making them.
 */
export const WIRE_PROOF_SYMBOL = "TSLA";

/** What `WIRE_PROOF_SYMBOL` is, so the disclosure can say why it is narrow. */
export const WIRE_PROOF_ASSET_CLASS = "US equity";

/**
 * The sentence that must accompany any affirmative wire claim.
 *
 * Present tense and specific: it names the instrument proved and refuses the
 * generalisation, rather than hedging with "may" — an unproven feed is not
 * "maybe working", it is UNPROVEN, which is one of this repo's honest states.
 */
export const WIRE_PROOF_SCOPE_NOTE =
  `proved on ${WIRE_PROOF_SYMBOL} (${WIRE_PROOF_ASSET_CLASS}) only — ` +
  `futures, forex, crypto and index coverage on this wire is UNPROVEN`;

/**
 * Append the scope disclosure to an affirmative wire detail.
 *
 * Only affirmative claims need it. "Not configured" and "Auth blocked" already
 * describe a wire that proved nothing, and bolting a coverage caveat onto them
 * would dilute a clear negative with an irrelevant one.
 */
export function withWireProofScope(detail: string): string {
  const trimmed = detail.trim().replace(/\s*\.$/, "");
  return `${trimmed} · ${WIRE_PROOF_SCOPE_NOTE}.`;
}
