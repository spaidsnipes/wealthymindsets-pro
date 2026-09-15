/**
 * SENTINEL — a gap counter that cannot count is not evidence of no gaps.
 *
 * H1, shape 1 (fabricated absence), in its most durable hiding place: a
 * DEFAULT BRANCH. Nobody reads a fallback looking for a claim.
 *
 * `/command-deck` → Data Fidelity → `GAPS  0`, in the OK tone.
 * `/nectar/[symbol]` → channel receipts → `Gaps  None`, in the OK tone.
 *
 * Neither could ever have printed anything else. The chain:
 *
 *   1. Every shipped adapter declares `sequenceState: "UNAVAILABLE"`.
 *   2. `MarketEventGuard` derives `numericSequence` only when
 *      `sequenceState !== "UNAVAILABLE"`, so it is always null.
 *   3. `numericSequence == null` ⇒ the guard emits `SEQUENCE_UNAVAILABLE`,
 *      and the `SEQUENCE_GAP` branch is unreachable.
 *   4. `sessionNectar` forwarded only `SEQUENCE_GAP` to `observeChannel` and
 *      DROPPED `SEQUENCE_UNAVAILABLE` on the floor.
 *   5. So `gapCount` is pinned at 0 by construction, and both screens read
 *      that structural 0 as a measured 0.
 *
 * The guard already knew the difference. The distinction was destroyed at one
 * boundary, four layers below the pixels that then asserted it.
 *
 * Worse than a wrong pixel: `canClaimRetainedCoverage` used `gapCount === 0`
 * as an affirmative condition for claiming RETAINED coverage — the weakest
 * possible condition, unreachable-by-construction and therefore always
 * satisfied. A rights predicate was resting on it.
 *
 * Over-corrections guarded below. Deleting `gapCount`, or making every gap
 * claim permanently unreadable, would each pass the defect assertions alone
 * and would both be wrong: a genuinely sequenced provider must still be able
 * to say "0, measured".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createChannelCoverage,
  observeChannel,
  describeGapCoverage,
  describeGapCoverageTotal,
  gapDetectability,
  canClaimRetainedCoverage,
  type MarketChannelCoverage,
} from "@/lib/marketData/coverageMap";
import type { MarketDataCapability } from "@/lib/marketData/capabilityRegistry";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const DECK = "src/app/command-deck/page.tsx";
const NECTAR_DETAIL = "src/app/nectar/[symbol]/page.tsx";
const NECTAR_SESSION = "src/lib/marketData/sessionNectar.ts";
const COVERAGE = "src/lib/marketData/coverageMap.ts";

const capability = {
  eventType: "trade",
  providerPath: "test/provider",
  availability: "AVAILABLE",
  rawPersistenceRight: "ALLOWED",
  rightsPolicyId: "test-policy",
  fidelityClass: "EXCHANGE_REPORTED",
  collectionScope: "SESSION",
} as unknown as MarketDataCapability;

/** A channel fed only unsequenced events — the production case. */
function unsequencedChannel(events = 5): MarketChannelCoverage {
  let c = createChannelCoverage("TEST:1", capability);
  for (let i = 0; i < events; i += 1) {
    c = observeChannel(c, {
      eventAt: 1_000 + i,
      receivedAt: 1_000 + i,
      sequenceUnavailable: true,
    });
  }
  return c;
}

/** A channel fed properly sequenced events — the case that MAY still claim 0. */
function sequencedChannel(events = 5): MarketChannelCoverage {
  let c = createChannelCoverage("TEST:2", capability);
  for (let i = 0; i < events; i += 1) {
    c = observeChannel(c, { eventAt: 1_000 + i, receivedAt: 1_000 + i });
  }
  return c;
}

describe("zero gaps is not zero gaps", () => {
  it("THE DEFECT: a channel that cannot detect gaps does not report zero of them", () => {
    const c = unsequencedChannel();
    expect(c.gapCount).toBe(0); // structurally, and that is exactly the trap
    expect(gapDetectability(c)).toBe("UNDETECTABLE");

    const claim = describeGapCoverage(c);
    expect(claim.measured, "An undetectable gap count is not a measurement.").toBe(false);
    expect(claim.value).not.toBe("0");
    expect(claim.value).not.toMatch(/none/i);
    // The narration must name the INPUT (no sequence) rather than the world.
    expect(claim.detail).toMatch(/sequence/i);
  });

  it("THE DEFECT: sessionNectar forwards SEQUENCE_UNAVAILABLE, not only SEQUENCE_GAP", () => {
    const src = codeOnly(read(NECTAR_SESSION));
    expect(src).toContain('sequenceGap: inspected.warnings.includes("SEQUENCE_GAP")');
    expect(
      src,
      "Dropping this warning is what made 'looked and found none' identical to 'had nothing to look at'.",
    ).toContain('sequenceUnavailable: inspected.warnings.includes("SEQUENCE_UNAVAILABLE")');
  });

  it("THE DEFECT: /command-deck routes GAPS through the claim compiler, not a raw sum", () => {
    const deck = codeOnly(read(DECK));
    expect(deck).toContain("describeGapCoverageTotal");
    expect(
      deck,
      "The raw reduce printed a structural zero in the OK tone.",
    ).not.toMatch(/reduce\(\(s, c\) => s \+ \(c\.gapCount \?\? 0\), 0\)/);
    expect(deck).not.toMatch(/value=\{String\(gapTotal\)\}/);
  });

  it("THE DEFECT: /nectar/[symbol] no longer prints the word None for an unmeasured gap count", () => {
    const detail = codeOnly(read(NECTAR_DETAIL));
    expect(detail).toContain("describeGapCoverage");
    expect(
      detail,
      '"None" was an assertion about the world, printed unconditionally.',
    ).not.toMatch(/ch\.gapCount > 0 \? String\(ch\.gapCount\) : "None"/);
  });

  it("a rights claim cannot rest on an unreachable condition", () => {
    // canClaimRetainedCoverage used `gapCount === 0` — always true in
    // production — as a positive requirement. A condition that cannot fail
    // is not a requirement.
    const undetectable: MarketChannelCoverage = {
      ...unsequencedChannel(),
      memoryState: "RETAINED",
      persistenceRight: "ALLOWED",
      observedFrom: 1,
      observedThrough: 2,
    };
    expect(canClaimRetainedCoverage(undetectable)).toBe(false);

    const sequenced: MarketChannelCoverage = {
      ...sequencedChannel(),
      memoryState: "RETAINED",
      persistenceRight: "ALLOWED",
      observedFrom: 1,
      observedThrough: 2,
    };
    expect(
      canClaimRetainedCoverage(sequenced),
      "A genuinely sequenced, gap-free channel MUST still be able to claim.",
    ).toBe(true);
  });

  it("undefined means UNKNOWN, never zero — restored summaries do not inherit a claim", () => {
    // A coverage summary persisted before this field existed genuinely does
    // not know what it looked at. Defaulting it to 0 would re-assert exactly
    // the claim the field exists to stop making.
    const legacy = { ...sequencedChannel() };
    delete (legacy as { unsequencedEventCount?: number }).unsequencedEventCount;

    expect(gapDetectability(legacy)).toBe("UNKNOWN");
    expect(describeGapCoverage(legacy).measured).toBe(false);
    expect(describeGapCoverage(legacy).value).not.toBe("0");
  });

  it("one unmeasurable channel makes the TOTAL unmeasured", () => {
    // You cannot add a real zero to an unknown and get a real zero.
    const total = describeGapCoverageTotal([sequencedChannel(), unsequencedChannel()]);
    expect(total.measured).toBe(false);
    expect(total.value).not.toBe("0");
  });

  it("the cure ships in ONE function — both surfaces read the same writer", () => {
    const deck = codeOnly(read(DECK));
    const detail = codeOnly(read(NECTAR_DETAIL));
    expect(deck).toMatch(/from "@\/lib\/marketData\/coverageMap"/);
    expect(detail).toMatch(/from "@\/lib\/marketData\/coverageMap"/);
    // Neither surface may re-derive the claim locally.
    expect(deck).not.toMatch(/gapCount > 0 \?/);
    expect(detail).not.toMatch(/gapCount > 0 \? String/);
  });

  it("OVER-CORRECTION: a real, measured gap is still reported as a number", () => {
    let c = createChannelCoverage("TEST:3", capability);
    c = observeChannel(c, { eventAt: 1, receivedAt: 1 });
    c = observeChannel(c, { eventAt: 2, receivedAt: 2, sequenceGap: true });
    const claim = describeGapCoverage(c);
    expect(claim.value).toBe("1");
    expect(claim.measured).toBe(true);
    expect(claim.warn, "An observed gap must still draw the eye.").toBe(true);
  });

  it("OVER-CORRECTION: a sequenced channel may still say zero, and say it plainly", () => {
    // Curing this by making every gap claim permanently unreadable would be
    // the opposite error — it would discard a real measurement the moment a
    // provider starts supplying sequences.
    const claim = describeGapCoverage(sequencedChannel());
    expect(claim.value).toBe("0");
    expect(claim.measured).toBe(true);
    expect(claim.warn).toBe(false);
  });

  it("OVER-CORRECTION: gapCount is NOT deleted from the coverage schema", () => {
    const src = codeOnly(read(COVERAGE));
    expect(src).toMatch(/gapCount: number/);
    expect(src).toMatch(/lastGapAt\?: number/);
    // And the guard keeps BOTH warnings — removing SEQUENCE_GAP detection
    // because it is currently unreachable would destroy the capability
    // rather than disclose its absence.
    const guard = codeOnly(read("src/lib/marketData/marketEvent.ts"));
    expect(guard).toContain("SEQUENCE_GAP");
    expect(guard).toContain("SEQUENCE_UNAVAILABLE");
  });

  it("OVER-CORRECTION: unsequencedEventCount stays OPTIONAL on the schema", () => {
    // Making it required would force every restored/legacy summary to invent
    // a value — which is the fabrication, not the cure.
    const src = codeOnly(read(COVERAGE));
    expect(src).toMatch(/unsequencedEventCount\?: number/);
    expect(src).not.toMatch(/unsequencedEventCount: number;/);
  });

  it("OVER-CORRECTION: surfaces that only ESCALATE on gaps keep their silence", () => {
    // /nectar list cards, the header Vault pill and the chart chip render a
    // gap badge only when gapCount > 0. They make no claim when it is zero,
    // so they were never lying and are out of scope for this fix. Rewriting
    // them to shout "undetectable" everywhere would be design theater.
    const vault = codeOnly(read("src/components/layout/HeaderVaultPill.tsx"));
    expect(vault).toMatch(/gapCount > 0/);
    const list = codeOnly(read("src/app/nectar/page.tsx"));
    expect(list).toMatch(/gapCount > 0/);
  });
});
