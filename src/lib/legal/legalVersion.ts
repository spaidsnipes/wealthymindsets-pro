/**
 * WHICH LEGAL TEXT A BUYER WAS SHOWN (Supermax §11, coordinator order 2026-10-09).
 *
 * ONE owner for the dates the policy pages print and for whether the Terms of
 * Service and Privacy Policy are in effect. The pages read these constants, so
 * the page and the record of a purchase cannot disagree; the checkout writes
 * `legalShownAtPurchase()` onto the Stripe session and the member's billing
 * record.
 *
 * TODAY the Terms and the Privacy Policy are NOT IN EFFECT, and the policy
 * index says so on the glass. Publishing them means changing
 * `TERMS_PRIVACY_STATE` and their date HERE — the page and every later
 * purchase record follow.
 *
 * PURE.
 */
export const LEGAL_INDEX_VERSION = "2026-10-05" as const;
export const RISK_DISCLOSURE_VERSION = "2026-10-05" as const;
export const MARKET_DATA_DISCLOSURE_VERSION = "2026-10-05" as const;

export type TermsPrivacyState = "NOT_IN_EFFECT" | "IN_EFFECT";
export const TERMS_PRIVACY_STATE: TermsPrivacyState = "NOT_IN_EFFECT";
/** The date of the Terms + Privacy text once in effect; null while they are not. */
export const TERMS_PRIVACY_VERSION: string | null = null;

export const TERMS_PRIVACY_WORDS: Readonly<Record<TermsPrivacyState, string>> = {
  NOT_IN_EFFECT: "NOT IN EFFECT",
  IN_EFFECT: "IN EFFECT",
};

/** True only when the state says so AND a version date exists. */
export function termsPrivacyInEffect(): boolean {
  return TERMS_PRIVACY_STATE === "IN_EFFECT" && typeof TERMS_PRIVACY_VERSION === "string" && /^\d{4}-\d{2}-\d{2}$/.test(TERMS_PRIVACY_VERSION);
}

/**
 * The line recorded with a purchase: what the buyer could read at that moment.
 * Short and plain (it is stored as Stripe metadata and on the billing record).
 */
export function legalShownAtPurchase(): string {
  const terms = termsPrivacyInEffect() ? `terms+privacy ${TERMS_PRIVACY_VERSION} ${TERMS_PRIVACY_WORDS.IN_EFFECT}` : `terms+privacy ${TERMS_PRIVACY_WORDS.NOT_IN_EFFECT}`;
  return `policies ${LEGAL_INDEX_VERSION} · risk ${RISK_DISCLOSURE_VERSION} · ${terms}`;
}
