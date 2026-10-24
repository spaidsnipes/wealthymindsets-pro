/**
 * WM PRO BILLING — WHAT A TIER'S BUTTON SAYS ON THE PRICING PAGE.
 *
 * A button that cannot take payment must not look like it can. So a paid
 * tier's button is live ONLY when the server says that tier is on sale:
 *   · not on sale (or not yet known)  → "Not on sale yet", disabled;
 *   · on sale, signed out             → "Sign in to buy" (a link);
 *   · on sale, signed in              → "Subscribe" (starts Stripe Checkout);
 *   · this is the member's plan       → "Your plan" + "Manage billing";
 *   · the member holds another plan   → "Change plan in Manage billing";
 *   · their World Pass covers it      → "Included in your World Pass" (never sold twice),
 *     and a paid copy of a covered plan says to cancel it (the two never stack).
 * In test mode the button says so: no real money moves.
 *
 * PURE. The page fetches; this decides.
 */
import { TIER_SPEC, type BillingTier, type PaidTier } from "./tiers";

export type BuyButtonKind = "NOT_ON_SALE" | "SIGN_IN" | "BUY" | "CURRENT" | "MANAGE" | "COVERED";

export interface BuyButtonState {
  readonly kind: BuyButtonKind;
  readonly label: string;
  /** A short honest line under the button, or null. */
  readonly note: string | null;
}

export const NOT_ON_SALE_LABEL = "Not on sale yet" as const;

export function buyButtonState(input: {
  readonly tier: PaidTier;
  /** From GET /api/billing/tiers (public). Null = not read yet / the read failed. */
  readonly onSale: Readonly<Record<string, boolean>> | null;
  readonly mode: "NOT_CONFIGURED" | "TEST" | "LIVE" | null;
  /** Null = not known yet. */
  readonly signedIn: boolean | null;
  /** The member's own tier from GET /api/billing/standing; null when signed out or unread. */
  readonly memberTier: BillingTier | null;
  /** What the member's World Pass (WOW OS) covers here, from GET /api/billing/standing; null/absent = nothing. */
  readonly worldPassTier?: PaidTier | null;
}): BuyButtonState {
  const selling = input.mode !== null && input.mode !== "NOT_CONFIGURED" && input.onSale?.[input.tier] === true;
  if (!selling) return { kind: "NOT_ON_SALE", label: NOT_ON_SALE_LABEL, note: null };
  const test = input.mode === "TEST" ? "Test mode — no real charge is made." : null;
  if (input.signedIn !== true) return { kind: "SIGN_IN", label: "Sign in to buy", note: test };
  const pass = input.worldPassTier ?? null;
  if (pass && TIER_SPEC[pass].rank >= TIER_SPEC[input.tier].rank) {
    if (input.memberTier === input.tier) return { kind: "CURRENT", label: "Your plan · Manage billing", note: "Your World Pass already includes this plan. Cancel it in Manage billing so you don't pay twice." };
    return { kind: "COVERED", label: "Included in your World Pass", note: null };
  }
  if (input.memberTier === input.tier) return { kind: "CURRENT", label: "Your plan · Manage billing", note: test };
  if (input.memberTier !== null && input.memberTier !== "FREE") return { kind: "MANAGE", label: "Change plan in Manage billing", note: test };
  return { kind: "BUY", label: "Subscribe", note: test };
}
