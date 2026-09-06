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

/** Saturday. 2026-09-05 is the day the live contradiction was captured. */
const SATURDAY = new Date(2026, 8, 5);
const WEDNESDAY = new Date(2026, 8, 2);

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
