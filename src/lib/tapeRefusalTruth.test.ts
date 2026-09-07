/**
 * THE TAPE HAS THREE ANSWERS, NOT TWO.
 *
 *   no feed        a designed boundary — no request is made      (tapeQuoteBlocker)
 *   not certified  a provider answered and WM declined it        (yahooQuoteRefusal)
 *   quote pending  no answer yet                                 (the residual)
 *
 * MEASURED, /command-deck 2026-09-07: NQ1! ES1! RTY1! YM1! GC1! CL1! — six of
 * the thirteen default rows — read "quote pending" permanently while
 * `/api/yahoo?sym=NQ1!&type=quote` returned inside 200ms every ten seconds
 * with `price: 29565.25` and `observation.resolution: "UNKNOWN"`.
 *
 * The gate that refused that price was CORRECT. The defect was that its
 * reason was discarded, leaving the rail one word for two different facts.
 *
 * Source-text is a blunt instrument, so this asserts only the behaviour-
 * bearing facts: the refusal reaches the renderer, the refused number is not
 * printed, and "quote pending" is not the fallback for a refused row.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TAPE = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/TickerTape.tsx"),
  "utf8",
);

describe("ticker tape — a refusal is not a delay", () => {
  it("consults the one owner of the refusal reason", () => {
    expect(TAPE).toContain('from "@/lib/marketData/yahooQuoteObserved"');
    expect(TAPE, "the tape must read the reason, not just the boolean").toContain(
      "yahooQuoteRefusal(",
    );
  });

  it("the renderer has a branch for a refused row, before the pending fallback", () => {
    const refusedAt = TAPE.indexOf("item.refusal ?");
    const pendingAt = TAPE.indexOf("quote pending<");
    expect(refusedAt, "no refused branch in the renderer").toBeGreaterThan(-1);
    expect(pendingAt, "no pending fallback found").toBeGreaterThan(-1);
    // If `quote pending` were reached first, the refusal would never render —
    // which is the exact defect, restored.
    expect(refusedAt).toBeLessThan(pendingAt);
  });

  it("a refused symbol never renders the number WM just refused to certify", () => {
    // Showing the refused price under a "not certified" label is the same lie
    // with extra steps. The refused row carries a reason and no price: the
    // refusal path is built on `unobservedRow`, whose price is 0 and whose
    // `live` is false, so the price span is not reached.
    const rowFor = TAPE.slice(TAPE.indexOf("function rowFor("), TAPE.indexOf("\n}", TAPE.indexOf("function rowFor(")));
    // The refused row is `unobservedRow` PLUS a reason — nothing else. Every
    // price field it has therefore comes from unobservedRow, which is 0/false.
    // A looser match here would be satisfied by the certified branch a few
    // lines below, which does carry `price: q.price`.
    expect(rowFor).toMatch(/return refusal\s*\?\s*\{\s*\.\.\.unobservedRow\(sym\),\s*refusal\s*\}/);
  });

  it("a symbol that becomes refused has its earlier certified quote retracted", () => {
    // Without this, a price certified at 13:00 keeps rendering after WM stops
    // certifying it — a claim that ages into a lie with nothing saying so.
    expect(TAPE).toMatch(/Object\.entries\(prev\)\.filter\(\(\[sym\]\)\s*=>\s*!\(sym in declined\)\)/);
  });

  it("a round of pure refusals is not discarded as an empty round", () => {
    // The early return used to fire on `!Object.keys(answered).length`, so a
    // round where every symbol was refused changed nothing on screen.
    expect(TAPE).toMatch(
      /!Object\.keys\(answered\)\.length\s*&&\s*!Object\.keys\(declined\)\.length/,
    );
  });
});
