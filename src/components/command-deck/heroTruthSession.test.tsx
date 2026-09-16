import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HeroTruth from "./HeroTruth";
import {
  canonicalMarketStateIdentity,
  selectCanonicalSessionToken,
} from "@/lib/marketData/canonicalIdentity";
import { produceCanonicalMarketState } from "@/lib/marketData/produceCanonicalMarketState";

/**
 * heroTruthSession — the hero truth strip may not name a trading session the
 * market is not in.
 *
 * ── The live defect this suite exists to keep dead ───────────────────────────
 *
 * On Saturday 2026-09-05, https://wealthymindsetspro.com/command-deck rendered,
 * in ONE DOM read, with symbol GC1!:
 *
 *   Command Deck · hero truth  UNKNOWN  GC1!  15m  —  Unavailable?
 *   session RTH   coverage 0 channels   unknowns 8
 *   ...
 *   Scene  CLOSED   "SESSION CLOSED — LAST VERIFIED. Nothing is streaming."
 *
 * `session RTH` and `SESSION CLOSED` about one instrument at one instant.
 *
 * The producers were not at fault. `CanonicalMarketState.session` is the STORE
 * KEY — `canonicalMarketStateKey` is built from it, and `canonicalSession()`
 * therefore answers "RTH" for every non-crypto instrument on every day of the
 * week ON PURPOSE. If it varied by day the store would fragment at midnight
 * and readers would look up keys nothing ever wrote. The RENDER was the fault:
 * a keyspace label printed to a human under the bare word "session".
 *
 * ── Why these tests use the real owner ───────────────────────────────────────
 *
 * The standing lesson in this repo, now recorded nine times, is a check written
 * against the shape the data has when it is CONVENIENT rather than the shape it
 * has in production. So no test below hand-writes a session string for the path
 * under proof: every session value comes from `selectCanonicalSessionToken`,
 * and every store key comes from `canonicalMarketStateIdentity`, exactly as the
 * page produces them. The one place a literal appears is the positive control,
 * where the literal IS the thing being proven wrong.
 */

/**
 * Saturday. 2026-09-05 is the day the live contradiction was captured.
 * ET-anchored — see marketDayFixtures.ts. These were local-midnight Dates,
 * which made this file pass in US Central and fail in CI's UTC.
 */
import { SATURDAY, WEDNESDAY } from "@/lib/marketData/marketDayFixtures";

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const DECK_PAGE = (): string =>
  readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

/** A sealed snapshot built exactly the way the deck builds one. */
function realState(symbol: string, timeframe = "15m") {
  const identity = canonicalMarketStateIdentity({ symbol, timeframe });
  return produceCanonicalMarketState({
    snapshotId: `test-${symbol}`,
    capturedAt: 1_757_000_000_000,
    instrumentId: identity.instrumentId,
    normalizedSymbol: symbol,
    executableIdentity: null,
    assetClass: "futures",
    exchange: null,
    // THE STORE KEY. Not a session observation. This is the value that leaked.
    session: identity.session,
    timeframeContext: identity.timeframeContext,
    price: { last: null, bid: null, ask: null, eventAt: null },
    coverage: [],
  });
}

/** The real wire: owner → prop → rendered markup. */
function stripFor(symbol: string, at: Date | null, timeframe = "15m"): string {
  const token = selectCanonicalSessionToken({ symbol, at });
  return renderToStaticMarkup(
    <HeroTruth
      symbol={symbol}
      timeframe={timeframe}
      state={realState(symbol, timeframe)}
      sessionPresented={{ value: token.token, detail: token.detail }}
    />,
  );
}

describe("HeroTruth session — the strip reads the owner, not the store key", () => {
  it("room density preserves truth while releasing desktop space to working surfaces", () => {
    const token = selectCanonicalSessionToken({ symbol: "TSLA", at: SATURDAY });
    const html = renderToStaticMarkup(
      <HeroTruth
        symbol="TSLA"
        timeframe="15m"
        state={realState("TSLA")}
        sessionPresented={{ value: token.token, detail: token.detail }}
        density="room"
      />,
    );
    // SCENE_FRAGMENTATION cure (2026-09-13): room density padding
    // gained a state-tint left accent (borderLeft: 3px) so the box
    // stopped reading as a walled dashboard card. Padding is now
    // asymmetric on the left to make room for the accent.
    expect(html).toContain("padding:10px 14px 10px 18px");
    expect(html).toContain("TSLA");
    expect(html).toContain("CLOSED");
  });

  it("THE CORE REGRESSION: a Saturday future reads CLOSED, never RTH", () => {
    const html = stripFor("GC1!", SATURDAY);
    expect(html).toContain("CLOSED");
    expect(html).not.toContain(">RTH<");
  });

  it("PROOF OF THE DEFECT: the store key really does say RTH on that Saturday", () => {
    // Positive control. If this ever stops being "RTH" the test above has
    // gone green for the wrong reason and proves nothing.
    expect(realState("GC1!").session).toBe("RTH");
    expect(canonicalMarketStateIdentity({ symbol: "AAPL", timeframe: "15m" }).session).toBe("RTH");
  });

  it("the store key is not merely hidden — it is absent from the markup", () => {
    const html = stripFor("GC1!", SATURDAY);
    // The snapshot carries session "RTH". If the strip ever falls back to it,
    // the token appears somewhere in the rendered output.
    expect(realState("GC1!").session).toBe("RTH");
    expect(html).not.toMatch(/>\s*RTH\s*</);
  });

  it("crypto reads 24X7 — a continuous market has no session to miss", () => {
    const html = stripFor("BTCUSD", SATURDAY);
    expect(html).toContain("24X7");
  });

  it("a weekday future stays honestly unresolved — there is still no intraday calendar", () => {
    const token = selectCanonicalSessionToken({ symbol: "GC1!", at: WEDNESDAY });
    expect(token.established).toBe(false);
    const html = stripFor("GC1!", WEDNESDAY);
    expect(html).toContain("SESSION ?");
    expect(html).not.toMatch(/>\s*RTH\s*</);
  });

  it("the first paint makes no day claim at all (at: null)", () => {
    const token = selectCanonicalSessionToken({ symbol: "GC1!", at: null });
    expect(token.established).toBe(false);
    expect(stripFor("GC1!", null)).toContain("SESSION ?");
  });

  it("NO PROP means unknown — it must NOT fall back to the snapshot's key", () => {
    // The whole defect in one assertion. `state` is a real sealed snapshot
    // carrying session "RTH"; the caller supplied nothing; the strip must
    // confess ignorance rather than reach for the key sitting right there.
    const html = renderToStaticMarkup(
      <HeroTruth symbol="GC1!" timeframe="15m" state={realState("GC1!")} />,
    );
    expect(html).toContain("unknown");
    expect(html).not.toMatch(/>\s*RTH\s*</);
  });

  it("the detail is carried through as the tooltip, so the claim is inspectable", () => {
    const token = selectCanonicalSessionToken({ symbol: "GC1!", at: SATURDAY });
    expect(token.detail).toContain("closure is established");
    expect(stripFor("GC1!", SATURDAY)).toContain(token.detail);
  });

  it("the wire genuinely varies by day and symbol (positive control — not a constant)", () => {
    const sat = stripFor("GC1!", SATURDAY);
    const wed = stripFor("GC1!", WEDNESDAY);
    const btc = stripFor("BTCUSD", SATURDAY);
    expect(sat).not.toBe(wed);
    expect(sat).not.toBe(btc);
  });
});

describe("/command-deck wires the hero strip from the session owner", () => {
  it("PROOF the comment-stripper leaves this file's real code intact", () => {
    // §22: a `not.toContain` against a neutered stripper passes vacuously.
    // This has already bitten twice in this repo. Prove the stripper works.
    const src = stripComments(DECK_PAGE());
    expect(src.length).toBeGreaterThan(5000);
    expect(src).toContain("<HeroTruth");
    expect(src).toContain("selectCanonicalSessionToken");
    // The banned phrase appears in the page's prose explaining the ban; it
    // must not survive stripping, or the ban below means nothing.
    expect(DECK_PAGE()).toContain("`state.session`");
    expect(src).not.toContain("`state.session`");
  });

  it("passes sessionPresented to HeroTruth from the hoisted owner call", () => {
    const src = stripComments(DECK_PAGE());
    expect(src).toMatch(/sessionPresented=\{\{\s*value:\s*sessionTruth\.token/);
    expect(src).toMatch(/detail:\s*sessionTruth\.detail/);
  });

  it("computes sessionTruth ONCE so the scene and the strip cannot disagree", () => {
    const src = stripComments(DECK_PAGE());
    // Exactly one owner call on this route. Two calls could drift apart if a
    // later edit gave them different `at` values; one cannot.
    const calls = src.match(/selectCanonicalSessionToken\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(src).toMatch(/const sessionTruth = React\.useMemo\(/);
    expect(src).toContain("deckSceneSignals({ session: sessionTruth.token");
  });

  it("uses the mount-safe day clock for the owner, not the 5s cadence clock", () => {
    const src = stripComments(DECK_PAGE());
    expect(src).toMatch(/selectCanonicalSessionToken\(\{\s*symbol,\s*at:\s*sessionClockDate\s*\}\)/);
    expect(src).not.toMatch(/selectCanonicalSessionToken\([^)]*nowMs/);
  });
});

/**
 * Rendered proof of the 2026-09-12 truth-surface law's SOURCE half.
 *
 * The pure helper tests in HeroTruth.test.ts cover the vendor-derivation math.
 * These tests prove the strip actually PAINTS what those helpers return —
 * because a helper that returns "finnhub" is worth nothing if the strip forgets
 * to print it, or prints it behind a colour a trader cannot read.
 */
describe("HeroTruth SOURCE trio pixel — role + asOf + source, no DevTools", () => {
  function withCoverage(providerPaths: readonly string[]) {
    const identity = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m" });
    return produceCanonicalMarketState({
      snapshotId: "test-source",
      capturedAt: 1_757_000_000_000,
      instrumentId: identity.instrumentId,
      normalizedSymbol: "TSLA",
      executableIdentity: null,
      assetClass: "stock",
      exchange: null,
      session: identity.session,
      timeframeContext: identity.timeframeContext,
      price: { last: null, bid: null, ask: null, eventAt: null },
      coverage: providerPaths.map((providerPath) => ({
        // The producer normalises coverage entries; the shape we care about
        // downstream is the {providerPath, channel} pair.
        providerPath,
        channel: "quote",
        instrumentId: identity.instrumentId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
    });
  }

  function renderWith(state: ReturnType<typeof withCoverage>): string {
    return renderToStaticMarkup(
      <HeroTruth
        symbol="TSLA"
        timeframe="15m"
        state={state}
        sessionPresented={{ value: "RTH", detail: "regular hours" }}
      />,
    );
  }

  it("prints the vendor beside the word 'source' when one is answering", () => {
    const html = renderWith(withCoverage(["finnhub-rest"]));
    expect(html).toContain(">source<");
    expect(html).toContain(">finnhub<");
  });

  it("renders 'unknown' when zero channels have stamped a source", () => {
    // This is the CONFLICTED read the Founder's glass-vs-payload law wants
    // the eye to catch — a role like DELAYED beside a source of 'unknown'
    // reads as honest, not broken. Silence in this slot would be the lie.
    const html = renderWith(withCoverage([]));
    expect(html).toMatch(/>source<\/span>[\s\S]*?>unknown</);
  });

  it("puts the raw provider paths in the hover disclosure, not the primary label", () => {
    // Feed/entitlement is one interaction deeper per the Founder's law. The
    // vendor is the primary word; the raw path list rides on `title`.
    const html = renderWith(withCoverage(["finnhub-rest", "webull-openapi-ticks"]));
    expect(html).toContain("finnhub +1");
    expect(html).toContain('title="finnhub-rest, webull-openapi-ticks"');
  });

  /**
   * ── THE OTHER TWO THIRDS ────────────────────────────────────────────────
   *
   * Everything above this point asserts SOURCE. The describe block has been
   * named "role + asOf + source" since it was written, and `HeroTruth.tsx`
   * carries a comment claiming the trio is complete — so both the suite's own
   * title and the component's own prose asserted a coverage that did not
   * exist. A block that NAMES three things and proves one is worse than a
   * block that names one, because it retires the question.
   *
   * MEASURED, not assumed. Two edits were made to HeroTruth and the FULL
   * suite was run:
   *
   *   1. `{style.label}` deleted from the quality badge  → role gone
   *   2. the chronology block gated behind `false &&`    → asOf gone
   *
   *   RESULT: 665 files / 7971 tests, all green. EXIT=0.
   *
   * So the deck could have shipped with no role word and no observation-age
   * line and nothing in the repo would have objected. The tests below are the
   * objection.
   */

  const CAPTURED_AT = 1_757_000_000_000;

  /**
   * A VALID packet at a chosen role.
   *
   * The price is not decoration. `sealCanonicalMarketState` enforces "LIVE
   * Market State requires price evidence", and the first draft of these tests
   * tried to force a LIVE role onto a priceless snapshot — the sealer threw,
   * correctly, and refused to mint the fixture. Recorded because it is this
   * file's own header lesson landing on the file: a check written against the
   * shape the data has when it is CONVENIENT is not a check. Every packet
   * below carries a real trade print 30s before capture, which is the shape a
   * LIVE packet actually has in production.
   */
  function renderAtRole(qualityState: "LIVE" | "DELAYED" | "STALE" | "PROXY"): string {
    const identity = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m" });
    const state = produceCanonicalMarketState(
      {
        snapshotId: `test-role-${qualityState}`,
        capturedAt: CAPTURED_AT,
        instrumentId: identity.instrumentId,
        normalizedSymbol: "TSLA",
        executableIdentity: null,
        assetClass: "stock",
        exchange: null,
        session: identity.session,
        timeframeContext: identity.timeframeContext,
        price: { last: 412.5, bid: null, ask: null, eventAt: CAPTURED_AT - 30_000 },
        coverage: [],
      },
      { qualityState },
    );
    return renderToStaticMarkup(
      <HeroTruth
        symbol="TSLA"
        timeframe="15m"
        state={state}
        sessionPresented={{ value: "RTH", detail: "regular hours" }}
      />,
    );
  }

  /**
   * `>Word<`, not `Word`.
   *
   * THIS EXACT LOOSENESS WAS CAUGHT BY RE-RUNNING THE ATTACK. The first
   * version of the assertion below was `toContain("Live")`, the role label was
   * deleted from the badge, and the test STAYED GREEN — because
   * `aria-label="TSLA 15m — market state Live"` still carried the word.
   *
   * The aria-label is correct and stays; a screen-reader user really does get
   * the role from it. But it cannot be allowed to STAND IN for the visible
   * word, or a sighted trader is left with a glyph and a hex colour while the
   * suite reports the law satisfied. Matching the rendered text node is what
   * separates "the word is in the document" from "the word is on the screen".
   */
  const textNode = (word: string) => new RegExp(`>${word}<`);

  it("ROLE: the quality verdict reaches the SCREEN as a word, not only as a colour", () => {
    expect(renderAtRole("LIVE")).toMatch(textNode("Live"));
    expect(renderAtRole("DELAYED")).toMatch(textNode("Delayed"));
    expect(renderAtRole("STALE")).toMatch(textNode("Stale"));
    expect(renderAtRole("PROXY")).toMatch(textNode("Proxy"));
  });

  it("ROLE: positive control — the word genuinely tracks the state", () => {
    // Without this, the assertion above could be satisfied by a hardcoded
    // string. Four distinct roles must produce four distinct documents.
    const seen = new Set((["LIVE", "DELAYED", "STALE", "PROXY"] as const).map(renderAtRole));
    expect(seen.size).toBe(4);
    // And a DELAYED packet must never print Live as visible text.
    expect(renderAtRole("DELAYED")).not.toMatch(textNode("Live"));
  });

  it("ROLE: the aria-label carries it too — the screen reader is not the fallback", () => {
    // Both paths must exist independently. Asserting this explicitly means a
    // future edit that deletes the aria-label to 'simplify' the badge fails
    // here rather than silently downgrading the non-visual path.
    expect(renderAtRole("DELAYED")).toContain('aria-label="TSLA 15m — market state Delayed"');
  });

  it("asOf: a LIVE packet with valid chronology prints the observation age", () => {
    const html = renderAtRole("LIVE");
    expect(html).toContain("observed 30.0s ago");
    expect(html).toContain('data-chronology-state="OBSERVED_AGE"');
  });

  it("asOf: a non-LIVE packet says the age is UNVERIFIED rather than going silent", () => {
    // The fail-closed half, and the more important one. Silence in the asOf
    // slot reads as "fresh" to a human eye. The strip must say out loud that
    // it cannot prove the age — HEALING IS NOT HIDING THE WOUND.
    //
    // Note these packets carry a price with a perfectly good eventAt. The age
    // is withheld because the ROLE does not entitle the strip to claim it, not
    // because the timestamp is missing. That is the fail-closed rule working.
    for (const role of ["DELAYED", "STALE", "PROXY"] as const) {
      const html = renderAtRole(role);
      expect(html, `${role} went silent on asOf`).toContain("observation age unverified");
      expect(html).toContain('data-chronology-state="UNVERIFIED"');
      expect(html, `${role} leaked an exact age it cannot prove`).not.toContain("observed 30.0s ago");
    }
  });

  it("THE TRIO, in one render, in one document", () => {
    // The law is not three separate requirements; it is that a trader reading
    // ONE strip receives all three at once. Asserting them across three
    // different renders would never prove they co-occur.
    const html = renderAtRole("LIVE");
    expect(html, "role missing from the trio").toMatch(textNode("Live"));
    expect(html, "asOf missing from the trio").toContain("observed 30.0s ago");
    expect(html, "source missing from the trio").toContain(">source<");
  });
});
