/**
 * isOptionSymbol — pure predicate for OCC-form option symbols.
 *
 * OCC ("Options Clearing Corporation") option symbol format:
 *
 *   ROOT (1-6 uppercase letters, optional dots) +
 *   YYMMDD (6 digits — expiration) +
 *   C|P (Call or Put) +
 *   STRIKE (8 digits — strike * 1000, zero-padded)
 *
 * Example: `AAPL240119C00185000` = AAPL Call, 2024-01-19 expiry, $185.00 strike.
 *
 * Detecting this shape lets consumer surfaces honestly report the
 * OPTIONS capability without a provider probe. A trader who typed an
 * OCC-form symbol into the ticker is LOOKING at an option; the deck
 * should say either "OPTIONS live" or "OPTIONS not wired" rather than
 * silently omitting the capability.
 *
 * PURE — no I/O, no clock. Used by selectPerCapabilityFidelity
 * indirectly. Detecting an option symbol does not itself prove provider
 * entitlement; consumers must keep the fidelity slot silent until a provider
 * returns either a live subscription receipt or an explicit entitlement wall.
 */

/**
 * OCC form: ROOT[1..6 A-Z or .] + YYMMDD + [CP] + 8-digit strike.
 * Total length = 15..20 characters.
 */
const OCC_PATTERN = /^[A-Z.]{1,6}\d{6}[CP]\d{8}$/;

export function isOptionSymbol(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.length < 15 || trimmed.length > 20) return false;
  return OCC_PATTERN.test(trimmed);
}
