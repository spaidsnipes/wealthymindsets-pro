/**
 * wowReleaseGates — canon §THE WOW RELEASE GATES (ATHOS Master
 * Manual v2.0, 2026-07-28).
 *
 * Canon verbatim:
 *   "A product or client deliverable cannot be called complete until
 *    it passes:
 *      1. Purpose Gate — The real user problem is solved.
 *      2. Product Gate — Scope matches the approved Bible and
 *         acceptance criteria.
 *      3. Engineering Gate — Build, tests, architecture, data
 *         integrity, errors, and performance are verified.
 *      4. Experience Gate — UI, UX, responsiveness, accessibility,
 *         content, and visual consistency are reviewed.
 *      5. Trust Gate — Security, permissions, privacy, claims,
 *         pricing, and critical data flows are checked.
 *      6. Customer Gate — Onboarding, help, support, handoff, and
 *         recovery paths are ready.
 *      7. Evidence Gate — Screenshots, tests, demo steps, build
 *         status, and known limitations are documented.
 *      8. Founder Gate — The Founder approves public release,
 *         client delivery, or portfolio publication."
 *
 *   "A WOW build solves a meaningful problem with exceptional
 *    craftsmanship, thoughtful design, dependable engineering, and
 *    an experience that feels surprisingly easy."
 *
 * This module gives the codebase a canon-shaped checklist any shift
 * ledger, PR description, or release ceremony can invoke. The gates
 * are ORDERED — canon: passing gate N+1 without gate N is theatre.
 */

export type WowGateKey =
  | "PURPOSE"
  | "PRODUCT"
  | "ENGINEERING"
  | "EXPERIENCE"
  | "TRUST"
  | "CUSTOMER"
  | "EVIDENCE"
  | "FOUNDER";

export interface WowGate {
  readonly key: WowGateKey;
  /** Sequence 1..8 per canon. */
  readonly order: number;
  /** Human-facing name (e.g., "Purpose Gate"). */
  readonly title: string;
  /** Canon-quoted acceptance question the gate answers. */
  readonly question: string;
  /**
   * Sub-checks the gate covers (canon-derived). Consumers rendering
   * a checklist iterate these; anything unchecked leaves the gate
   * ungated.
   */
  readonly checks: readonly string[];
}

export const WOW_RELEASE_GATES: readonly WowGate[] = Object.freeze([
  {
    key: "PURPOSE",
    order: 1,
    title: "Purpose Gate",
    question: "Is the real user problem solved?",
    checks: [
      "The problem statement matches a canonical Founder directive or ticket.",
      "The proposed solution demonstrably addresses that problem (not a related one).",
      "At least one specific complete human job is materially improved.",
    ],
  },
  {
    key: "PRODUCT",
    order: 2,
    title: "Product Gate",
    question: "Does scope match the approved Bible and acceptance criteria?",
    checks: [
      "The change stays within the scope of an approved contract / canon.",
      "Acceptance criteria are enumerated (not implicit).",
      "No canonical vocabulary drift (canon vocabularies preserved).",
    ],
  },
  {
    key: "ENGINEERING",
    order: 3,
    title: "Engineering Gate",
    question: "Are build, tests, architecture, data integrity, errors, and performance verified?",
    checks: [
      "Build passes (tsc clean).",
      "Tests pass (vitest 100%).",
      "No new duplicate systems / parallel truth stores introduced.",
      "Error paths + degraded modes tested (canon §Failure Recovery Grammar).",
      "Performance regression negligible or measured.",
    ],
  },
  {
    key: "EXPERIENCE",
    order: 4,
    title: "Experience Gate",
    question: "Are UI, UX, responsiveness, accessibility, content, and visual consistency reviewed?",
    checks: [
      "Verified on desktop + iPad landscape + iPad portrait + iPhone (canon §Live Reality Rule).",
      "Accessibility: focus-visible, 44px tap targets, semantic HTML, aria-labels.",
      "Copy passes canon vocabulary lock (no quarantined phrases).",
      "Visual language consistent with the WM design system.",
    ],
  },
  {
    key: "TRUST",
    order: 5,
    title: "Trust Gate",
    question: "Are security, permissions, privacy, claims, pricing, and critical data flows checked?",
    checks: [
      "No secrets in source; no PII leaks.",
      "Owner-scoped storage (canon §Logout Isolation).",
      "Every visible claim traces to observable evidence (canon §Evidence Reversibility).",
      "No overclaim on live / delayed / entitlement state.",
    ],
  },
  {
    key: "CUSTOMER",
    order: 6,
    title: "Customer Gate",
    question: "Are onboarding, help, support, handoff, and recovery paths ready?",
    checks: [
      "First-run state is honest (silent when nothing to say — canon §Silence Is A Feature).",
      "Recovery path exists for every failure mode surfaced by the change.",
      "Trader can act without reading a changelog (canon: visible without changelog).",
    ],
  },
  {
    key: "EVIDENCE",
    order: 7,
    title: "Evidence Gate",
    question: "Are screenshots, tests, demo steps, build status, and known limitations documented?",
    checks: [
      "Shift ledger records SHAs, test counts, prod verification.",
      "Known limitations named honestly (canon §Master Truth Covenant).",
      "Rollback path documented (canon §Supersession Receipt).",
    ],
  },
  {
    key: "FOUNDER",
    order: 8,
    title: "Founder Gate",
    question: "Does the Founder approve public release / client delivery / portfolio publication?",
    checks: [
      "Change is either autonomously-authorized per standing memory OR explicit Founder approval received in-session.",
      "No destructive operation without explicit approval.",
      "No prohibited-category action (credentials / trades / etc.).",
    ],
  },
]);

/** Ordered lookup by key. */
export const WOW_RELEASE_GATE_BY_KEY: Readonly<Record<WowGateKey, WowGate>> = Object.freeze(
  Object.fromEntries(WOW_RELEASE_GATES.map((g) => [g.key, g])) as Record<WowGateKey, WowGate>,
);

/**
 * A shift-time gate assessment. `passed` and `notes` are recorded
 * per gate; consumers (ledger, PR template) render the checklist and
 * either progress to the next gate or block on a failure.
 */
export interface WowGateResult {
  readonly key: WowGateKey;
  readonly passed: boolean;
  /** Optional narrative — what evidence was checked, or why it failed. */
  readonly notes?: string;
}

/**
 * Canon: the gates are ordered. `allPassed` is true only when EVERY
 * gate is passed. `firstBlockedGate` returns the earliest failing
 * gate so the team knows exactly where to focus recovery.
 */
export function evaluateReleaseGates(
  results: readonly WowGateResult[],
): {
  readonly allPassed: boolean;
  readonly firstBlockedGate: WowGateKey | null;
  readonly passedCount: number;
} {
  // Index by key for O(1) lookup while preserving canonical order.
  const byKey = new Map<WowGateKey, WowGateResult>(
    results.map((r) => [r.key, r]),
  );
  let passedCount = 0;
  let firstBlocked: WowGateKey | null = null;
  for (const gate of WOW_RELEASE_GATES) {
    const result = byKey.get(gate.key);
    // A missing result is BLOCKED — canon: cannot be called complete.
    if (!result || !result.passed) {
      if (firstBlocked === null) firstBlocked = gate.key;
    } else {
      passedCount += 1;
    }
  }
  return {
    allPassed: firstBlocked === null,
    firstBlockedGate: firstBlocked,
    passedCount,
  };
}
