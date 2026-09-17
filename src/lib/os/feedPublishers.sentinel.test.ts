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
  "src/app/paper/page.tsx",
  "src/app/scanner/page.tsx",
  "src/components/chart/ChartsDashboard.tsx",
] as const;

/**
 * A FEED IS NOT A SOCKET.
 *
 * This predicate used to be `src.includes("useWebSocket(") && feedBlock(src)`,
 * and the conjunct was a THIRD spelling-pin hiding inside a meaning-pin. It
 * asked "does this room hold a websocket", when the rule has only ever been
 * "does this room publish what it observed".
 *
 * /paper is the proof. It polls `/api/yahoo` on a 20s interval, compiles a
 * readiness per symbol, gates its Order Ticket on it and prints the price —
 * and it holds no socket at all. Measured live 2026-09-17 it wore FEED UNKNOWN
 * and SOURCE UNKNOWN over `$29,738.00`, which is the very defect at the top of
 * this file, in a room the old predicate could not have failed: adding /paper
 * to `PUBLISHERS` under the old rule would have turned THE COMPLETE RULE red
 * for publishing an honest REST observation.
 *
 * So the transport question moves to where it belongs — the suites below that
 * are genuinely about socket vocabulary — and the rule here is pinned to the
 * publication.
 *
 * TWO ACCEPTED FORMS, and the second is the better one. A room may hand up an
 * inline `feed: { … }` literal, or DELEGATE to a named selector —
 * `feed: selectPaperFeedObservation({ … })`. Delegation is preferred precisely
 * because every field of an observation is a judgement with a flattering wrong
 * answer available, and a literal buried mid-component is where such judgements
 * stop being reviewed. The six-field rule below still reaches the literals; a
 * delegate gets all six from its `FeedObservation` return type, which `tsc`
 * enforces and which this file cannot weaken.
 *
 * `FEEDLESS_SURFACE` deliberately does not match: it is a bare identifier with
 * no call parentheses, so the two states below stay exclusive.
 */
function observesFeed(src: string): boolean {
  return /\bfeed:\s*(\{|[A-Za-z_$][\w$]*\s*\()/.test(src);
}

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

/**
 * THE DECLARATION MUST BE PUBLISHED, NOT MERELY IMPORTED.
 *
 * The first draft of this predicate was `src.includes("FEEDLESS_SURFACE")`, and
 * the anti-vacuity check caught it: deleting `feed: FEEDLESS_SURFACE` from
 * /journal left the suite GREEN, because the import line still carried the
 * word. A Sentinel that a bare import satisfies guards nothing — it is the
 * source-scanning version of the very default this file exists to outlaw.
 */
function publishesFeedless(src: string): boolean {
  return /\bfeed:\s*FEEDLESS_SURFACE\b/.test(src);
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

  /**
   * THE COMPLETE RULE, not half of it.
   *
   * There are exactly two honest states and no third. A room either OBSERVED a
   * feed and reports the evidence, or it carries no feed and SAYS SO. The
   * failure mode this Sentinel exists for is the third state — a room that
   * publishes neither, whose silence the frame then renders as FEED UNKNOWN.
   *
   * That is why `FEEDLESS_SURFACE` is a positive declaration rather than the
   * absence of one: silence and "I have nothing to report" look identical in
   * the source and mean opposite things on the screen.
   */
  it("THE COMPLETE RULE — every room either observes a feed or declares it has none", () => {
    for (const [rel, src] of SOURCES) {
      const declaresFeedless = publishesFeedless(src);
      expect(
        observesFeed(src) || declaresFeedless,
        `${rel} publishes a standing but neither observes a feed nor declares FEEDLESS_SURFACE — the frame will print FEED UNKNOWN over it`,
      ).toBe(true);
    }
  });

  it("and the two states are exclusive — no room claims both", () => {
    // A room cannot simultaneously report an observation and assert it has no
    // feed to report. If one ever does, the later key silently wins and the
    // masthead's reading depends on object-literal ordering.
    for (const [rel, src] of SOURCES) {
      expect(observesFeed(src) && publishesFeedless(src), rel).toBe(false);
    }
  });
});

/**
 * THE SENTINEL ABOVE COULD ONLY SEE ROOMS THAT ALREADY SPOKE.
 *
 * `PUBLISHERS` is a list of rooms that call `usePublishOsStanding`. Every rule
 * above iterates it — so the one failure it could never catch is a room that
 * publishes NOTHING, because such a room is not in the list and never was. The
 * frame renders that silence as FEED UNKNOWN, which is the same wrong pixel the
 * file was written about, arrived at through the one door it left open.
 *
 * Measured live on wealthymindsetspro.com/lounge, 2026-09-17: masthead FEED
 * UNKNOWN, footer SOURCE UNKNOWN, on a community room that has no market
 * pipeline of any kind. `osStandingContext` names this case exactly — "FEED
 * UNKNOWN is right for a room that has not spoken. It is wrong for a room with
 * no feed to speak about."
 *
 * PINNED FROM BOTH DIRECTIONS, because each side alone rots:
 *
 *   · presence only — passes forever once a room grows a real feed, and the
 *     room then LIES about carrying none.
 *   · absence only — passes if the declaration is simply deleted and the room
 *     goes back to wearing the open question.
 *
 * So: each of these rooms must declare `FEEDLESS_SURFACE`, AND must still have
 * no market transport to declare anything about. A room that acquires a feed
 * fails here until someone publishes a real observation for it, which is the
 * correct place for that decision to surface.
 */
describe("SENTINEL — a room with NO feed declares so, instead of staying silent", () => {
  /** Rooms measured to carry no market transport of any kind. */
  const FEEDLESS_ROOMS = [
    "src/app/lounge/page.tsx",
    "src/app/copy-trading/page.tsx",
    "src/app/education/page.tsx",
    "src/app/shop/page.tsx",
    "src/app/partnerships/page.tsx",
    "src/app/creator/page.tsx",
    "src/app/tv/page.tsx",
    "src/app/radio/page.tsx",
    "src/app/proof-lane/page.tsx",
  ] as const;

  it("the list is non-empty and every room in it still exists", () => {
    // Guards the same vacuity the suite above guards: a renamed file must turn
    // this red rather than quietly shrink what is being certified.
    expect(FEEDLESS_ROOMS.length).toBeGreaterThan(0);
    for (const rel of FEEDLESS_ROOMS) {
      expect(fs.existsSync(path.join(process.cwd(), rel)), rel).toBe(true);
    }
  });

  it("THE LOAD-BEARING ASSERTION — each publishes FEEDLESS_SURFACE", () => {
    // Without the declaration the frame prints an open question about a
    // pipeline the room does not have, and sends a reader to diagnose nothing.
    for (const rel of FEEDLESS_ROOMS) {
      expect(
        publishesFeedless(strip(rel)),
        `${rel} carries no feed but does not say so — the masthead will wear FEED UNKNOWN over it`,
      ).toBe(true);
    }
  });

  it("and none of them has quietly acquired a feed to be silent about", () => {
    // The other half of the pin. `FEEDLESS_SURFACE` is a positive claim, and a
    // room that grows a transport must stop making it.
    for (const rel of FEEDLESS_ROOMS) {
      const src = strip(rel);
      expect(
        src.includes("useWebSocket("),
        `${rel} now carries a transport but still declares it has no feed`,
      ).toBe(false);
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

  /**
   * WIDENED PAST THE TRANSPORT LIST, on the same reasoning as `observesFeed`.
   *
   * These two rules were scoped to `withTransport`, which meant a room that
   * published an inline observation without holding a socket got its literal
   * checked by nobody. The six-field rule and the no-self-grading rule are
   * about the SHAPE OF A PUBLICATION; neither has anything to do with how the
   * bytes arrived. So they iterate every inline literal in `PUBLISHERS`.
   *
   * A DELEGATING room has no literal to inspect and is legitimately absent
   * here — its six fields come from the `FeedObservation` return type, which
   * `tsc` enforces on every field and this file could not enforce better.
   */
  const withInlineFeed: ReadonlyArray<readonly [string, string]> = [...SOURCES].flatMap(
    ([rel, src]) => {
      const block = feedBlock(src);
      return block === null ? [] : [[rel, block] as const];
    },
  );

  it("inline literals are still the majority form, so the two rules below bite", () => {
    // Vacuity guard. If every room migrates to a delegate this drops to zero
    // and the field rules would certify nothing while staying green.
    expect(withInlineFeed.length).toBeGreaterThanOrEqual(2);
  });

  it("each inline feed carries all six required fields — silence here renders as a claim", () => {
    for (const [rel, block] of withInlineFeed) {
      for (const field of REQUIRED_FIELDS) {
        expect(declares(block, field), `${rel} → ${field}`).toBe(true);
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

  it("no room re-grades fidelity itself — it publishes evidence only", () => {
    // priceSourceBadge is the single writer. A room that compiles its own
    // label is the exact second opinion this ladder was built to prevent.
    for (const [rel, block] of withInlineFeed) {
      expect(block, rel).not.toContain("FEED UNKNOWN");
      expect(block, rel).not.toContain("fidelity");
    }
  });
});
