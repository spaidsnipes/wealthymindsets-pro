/**
 * THE SELLING STORY — one owner for what the PUBLIC pages say WM Pro is
 * (Garden 19 Founder order 2026-10-07, "SELLING PASS" / §57 ATH WEBSITE).
 *
 * /welcome, /pricing and the marketing side of /login read these words; none
 * of them types its own pitch. The story is the operating system's LOOP and
 * the LIFE OF A PRICE TERRITORY — not a feature list ("no feature soup"), not
 * an indicator launch, not an outcome promise.
 *
 * HONESTY RULES (pinned by sellingStory.test.ts):
 *   • No guaranteed outcome, no win rate, no invented statistic, no testimonial.
 *   • Nothing beyond what is live: member broker connection is BETA and not
 *     enabled for members yet; live orders go through the trader's OWN broker
 *     and are confirmed by the trader; market data has per-market limits.
 *   • Prices and tiers are NOT here — /pricing owns them and the Founder said
 *     they stay.
 *
 * PURE copy. No React.
 */

export const PRODUCT_NAME = "WEALTHY MINDSETS PRO";
export const PRODUCT_KIND = "TRADING OPERATING SYSTEM";
export const PRODUCT_LINE = `${PRODUCT_NAME} — ${PRODUCT_KIND}`;
/** The same words in title case, for a serif headline. */
export const PRODUCT_NAME_TITLE = "Wealthy Mindsets Pro";
export const PRODUCT_KIND_TITLE = "Trading Operating System";

export const HEADLINE = "Living market intelligence.";
export const PROMISE =
  "WM Pro follows the price territories that matter — as they form, as price returns to them, how the market responds, what they leave in memory — and carries them into your review and your education. One market, one truth, read the same way everywhere.";

/** The life of a price territory — the thing WM Pro follows (§57). */
export const TERRITORY_LIFE: readonly { readonly stage: string; readonly line: string }[] = [
  { stage: "Formation", line: "Where price moved so fast one side barely traded — recorded the moment the bar closes, never before." },
  { stage: "Interaction", line: "When price comes back: the touch, and how deep it trades in." },
  { stage: "Response", line: "What the closes did next — rejected, accepted, or traded through." },
  { stage: "Memory", line: "Old territories age instead of vanishing, so you can see what the market remembers." },
  { stage: "Review", line: "Your decisions at those territories, beside what actually happened." },
  { stage: "Education", line: "The Academy teaches the same definition the chart draws — no second meaning." },
];

/**
 * The operating loop (§57), as the Founder wrote it: one sentence, in order,
 * ending where it began — with you learning. Kept as that one sentence (not a
 * table of single words) on purpose: "Decide" here is a verb in a pitch, not
 * the Command Deck's phase label, and the deck's one phase owner
 * (decisionLifecycle.ts, pinned by lifecyclePhaseOneOwner.sentinel) must stay
 * the only file that holds phase labels.
 */
export const LOOP_SENTENCE =
  "LEARN → SEE → WAIT → UNDERSTAND → INSPECT → PLAN → DECIDE → TRADE → PROTECT → MANAGE → JOURNAL → REVIEW → MEASURE → LEARN YOURSELF";

const LOOP_LINES: readonly string[] = [
  "Lessons on the same definitions the chart uses.",
  "The market with its source and age on every price.",
  "Nothing to do is a valid reading.",
  "What formed, and what it has done since.",
  "Every mark opens to its evidence — or says what is missing.",
  "Invalidation and size written before entry.",
  "Your call, with the evidence laid out.",
  "Through your own broker, confirmed by you.",
  "Stops and open orders stay reachable on every tier.",
  "By the plan — never \"just hold\".",
  "The trade, the plan, and what you were seeing.",
  "Plan against what actually happened.",
  "Counts with their denominators — never a promise.",
  "Your edge is what your own record shows.",
];

export const OPERATING_LOOP: readonly { readonly step: string; readonly line: string }[] =
  LOOP_SENTENCE.split(" → ").map((word, i) => ({
    step: word.charAt(0) + word.slice(1).toLowerCase(),
    line: LOOP_LINES[i] ?? "",
  }));

/** What is live today — said plainly on every public page that sells. */
export const WHAT_IS_LIVE: readonly { readonly label: string; readonly line: string }[] = [
  { label: "Market data", line: "Sources and limits differ by market. Every price shows whether it is live, delayed, stale or unavailable." },
  { label: "Broker connection", line: "Connecting your own broker account is in BETA and not enabled for members yet." },
  { label: "Orders", line: "WM Pro never trades for you. Any order goes through your own broker, and you confirm it." },
  { label: "Not advice", line: "Analysis and education software — not investment advice, and no outcome is promised." },
];
