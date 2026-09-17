/**
 * A ROOM THAT CARRIES A FEED MUST PUBLISH ITS OBSERVATION.
 *
 * THE DEFECT. `compileFeedStanding` takes the `source === null` arm — FEED
 * UNKNOWN in the masthead, SOURCE UNKNOWN in the provenance footer — whenever a
 * room publishes a standing WITHOUT a `feed`. That is correct for a room with
 * no feed to report. It is a false statement of ignorance for a room that is at
 * that moment rendering a provider name, a price, and a drawn chart.
 *
 * It has now happened twice, in two rooms, from the same omission:
 *
 *   · /charts wore FEED UNKNOWN over 400 rendered candles beside a chip that
 *     already read HISTORICAL BARS VERIFIED.
 *   · /command-deck wore FEED UNKNOWN and SOURCE UNKNOWN — measured live on
 *     production 2026-09-17 at fb7826c — while the same screen printed
 *     `source alpaca`, `coverage 1 channel`, `358.08 LAST 15M BAR CLOSE`, and
 *     drew 120 candles.
 *
 * Twice is a pattern, and a pattern gets a Sentinel rather than a third fix.
 *
 * WHAT THIS PINS, AND WHY IT IS NOT SPELLING. The rule is a MEANING: if a room
 * subscribes to the market transport (`useWebSocket`) and publishes upward
 * (`usePublishOsStanding`), it must hand up a `feed` observation carrying every
 * field `FeedObservation` requires. A room with no transport is untouched — the
 * Vault and the Journal legitimately carry no feed, and `FEEDLESS_SURFACE`
 * exists so they can say so positively.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had. Deleting it re-arms the third room.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** Every room that publishes an OS standing today. */
const PUBLISHERS = [
  "src/app/journal/page.tsx",
  "src/app/nectar/page.tsx",
  "src/app/nectar/[symbol]/page.tsx",
  "src/app/command-deck/page.tsx",
  "src/components/chart/ChartsDashboard.tsx",
] as const;

/**
 * COMMENT-STRIPPED. A rule quoted in a docblock is not a publication — and
 * every one of these files discusses FEED UNKNOWN at length in prose, which is
 * exactly how a source-scanning test passes while the pixels stay wrong.
 */
function strip(rel: string): string {
  return fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SOURCES = new Map(PUBLISHERS.map((p) => [p, strip(p)] as const));

/** The six fields `FeedObservation` requires. Optionality is not offered. */
const REQUIRED_FIELDS = [
  "source",
  "quotePresent",
  "barsPresent",
  "lastObservedAtMs",
  "connected",
  "sessionOpen",
] as const;

/**
 * A field counts whether it is written `name: expr` or as ES shorthand `name,`.
 * The first draft of this Sentinel demanded a colon and failed on both rooms —
 * which is the failure mode a Sentinel is supposed to avoid: it was pinned to
 * PUNCTUATION, and punctuation is not the rule. The rule is that the frame
 * receives the field.
 */
function declares(block: string, field: string): boolean {
  return new RegExp(`\\b${field}\\s*[:,]`).test(block);
}

/**
 * The `feed: { … }` object literal, bounded by its own braces.
 *
 * A fixed-length slice would silently spill into the rest of the component and
 * start "finding" identifiers that have nothing to do with the published
 * observation — a Sentinel that passes on unrelated code is worse than none.
 */
function feedBlock(src: string): string | null {
  const at = src.search(/\bfeed:\s*\{/);
  if (at < 0) return null;
  const open = src.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

describe("SENTINEL — the room list itself stays honest", () => {
  it("every named publisher still exists and still publishes a standing", () => {
    // If a file is renamed away, this suite would otherwise go quietly vacuous
    // and stop guarding anything at all.
    for (const [rel, src] of SOURCES) {
      expect(fs.existsSync(path.join(process.cwd(), rel)), rel).toBe(true);
      expect(src, rel).toContain("usePublishOsStanding");
    }
  });
});

describe("SENTINEL — a room with a transport publishes what it observed", () => {
  const withTransport = [...SOURCES].filter(([, src]) => src.includes("useWebSocket("));

  it("at least two rooms carry a transport, so this suite cannot pass vacuously", () => {
    // Both known rooms must be found. If this drops to zero the assertions
    // below iterate an empty list and certify nothing.
    expect(withTransport.map(([rel]) => rel).sort()).toEqual([
      "src/app/command-deck/page.tsx",
      "src/components/chart/ChartsDashboard.tsx",
    ]);
  });

  it("THE LOAD-BEARING ASSERTION — each publishes a feed observation", () => {
    // Without this, the frame says "no observation yet" over a drawn chart and
    // sends a trader to diagnose a pipeline that is fine.
    for (const [rel, src] of withTransport) {
      expect(src, rel).toMatch(/feed:\s*\{/);
    }
  });

  it("each feed carries all six required fields — silence here renders as a claim", () => {
    for (const [rel, src] of withTransport) {
      const block = feedBlock(src);
      expect(block, `${rel} → feed block not found`).not.toBeNull();
      for (const field of REQUIRED_FIELDS) {
        expect(declares(block!, field), `${rel} → ${field}`).toBe(true);
      }
    }
  });

  it("neither room rounds an absent provider up to a named one", () => {
    // "unavailable" is the hook's word for "nobody answered". Passing it
    // through asks the badge to grade a vendor that does not exist.
    for (const [rel, src] of withTransport) {
      expect(src, rel).toMatch(/===\s*"unavailable"\s*\?\s*null/);
    }
  });

  it("neither room re-grades fidelity itself — it publishes evidence only", () => {
    // priceSourceBadge is the single writer. A room that compiles its own
    // label is the exact second opinion this ladder was built to prevent.
    for (const [rel, src] of withTransport) {
      const block = feedBlock(src)!;
      expect(block, rel).not.toContain("FEED UNKNOWN");
      expect(block, rel).not.toContain("fidelity");
    }
  });
});
