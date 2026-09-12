/**
 * A CONFIG READ MAY NOT OUTRANK A TICK RECEIPT.
 *
 * ── The measured failure (2026-09-11) ───────────────────────────────────────
 *
 * `tastytradeWireView` returned tone LIVE with the label "Real-time verified"
 * whenever `status.connected && status.quotes && status.realTime === true`.
 * All three are fields of a `BrokerStatus` — an account probe and an
 * entitlement flag. Not one of them is a market event.
 *
 * In the same visually uniform row, moomoo, longbridge and webull cap at
 * LIMITED while holding ACTUAL EXECUTED PRINTS, because a print proves one
 * instrument and not a wire (see `wireProofScope.ts`). So the provider with
 * the shallowest evidence held the only green chip. The PROVIDER HEALTH LAW
 * forbids collapsing "connected" into "healthy"; this inverted it — it ranked
 * "connected" ABOVE "observed".
 *
 * Worse, the fact's single writer had already refused the claim.
 * `getTastytradeCapabilities` pins `realTime: null` and says so in a comment:
 * "we do not claim real-time without proof". The owner refused; the view
 * accepted from anyone. A canonical owner that consumers may overrule is not
 * an owner.
 *
 * ── Why no existing gate caught it ──────────────────────────────────────────
 *
 * `providerWireProofDepth.test.ts` derives provider membership from the
 * `/ticks` route directory and correctly records tastytrade as matrix-only.
 * That is precisely the blind spot: a provider with NO tick route is outside
 * that Sentinel's frame entirely, so nothing was watching the one view that
 * could mint LIVE without a receipt.
 *
 * Compounding it, `tastytradeWireView` has ZERO production callers —
 * `selectProviderWires` routes tastytrade through `matrixProviderWireView`
 * plus the readiness override. The inversion was therefore invisible on
 * screen while five green tests certified it as correct behaviour, waiting
 * for the day someone wires tastytrade up in good faith and inherits it.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { tastytradeWireView } from "./ProviderWireStrip";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const STRIP = path.join(REPO_ROOT, "src/components/marketData/ProviderWireStrip.tsx");
const readStrip = () => stripComments(fs.readFileSync(STRIP, "utf8"));

/** The strongest BrokerStatus that can exist: every config flag is true. */
const FULLY_ENTITLED = {
  configured: true,
  connected: true,
  quotes: true,
  realTime: true,
} as const;

describe("no wire may claim LIVE from a configuration read", () => {
  it("THE DEFECT: a fully entitled tastytrade config did not earn the green chip", () => {
    const view = tastytradeWireView(FULLY_ENTITLED);
    expect(
      view.tone,
      "Entitlement is PERMISSION to receive real-time data, not evidence any " +
        "arrived. Tastytrade ships no /ticks route, so this view has never seen " +
        "a print — it must not outrank providers that have.",
    ).not.toBe("LIVE");
    expect(view.tone).toBe("LIMITED");
  });

  it("and it names what it actually proved, instead of the word 'verified'", () => {
    const view = tastytradeWireView(FULLY_ENTITLED);
    expect(view.label, "'Real-time verified' claimed an observation nobody made").not.toBe("Real-time verified");
    expect(view.label).toBe("Real-time entitled");
  });

  it("the detail discloses the evidence that is MISSING, not just the flag that is set", () => {
    const view = tastytradeWireView(FULLY_ENTITLED);
    expect(view.detail).toMatch(/no market event has been received/i);
    expect(view.detail, "the reason there is no print must be named, not left mysterious")
      .toMatch(/ships no tick route/i);
  });

  it("a provider note may colour the detail but never re-open the LIVE arm", () => {
    // The note is provider-authored text. If it could change the tone, an
    // upstream string would become a control-flow input.
    const view = tastytradeWireView({ ...FULLY_ENTITLED, note: "Real-time verified by tastytrade" });
    expect(view.tone).toBe("LIMITED");
    expect(view.label).toBe("Real-time entitled");
  });

  it("weaker configs still degrade in the right order — the cap did not flatten the ladder", () => {
    // Regression guard: capping the top must not collapse the states beneath
    // it into one indistinguishable LIMITED blob.
    expect(tastytradeWireView({ configured: true, connected: true, quotes: true, realTime: null }).label)
      .toBe("Quote token ready");
    expect(tastytradeWireView({ configured: true, connected: true, quotes: false, realTime: null }).label)
      .toBe("Account connected");
    expect(tastytradeWireView({ configured: true, connected: false }).tone).toBe("BLOCKED");
    expect(tastytradeWireView({ configured: false, connected: false }).tone).toBe("OFFLINE");
  });
});

describe("the law holds in the source, not just in this one function", () => {
  it("tastytradeWireView contains no LIVE tone at all", () => {
    // Source-level, so a NEW arm added to this function is caught even if it
    // is reached by a config shape no test above constructs.
    const src = readStrip();
    const start = src.indexOf("export function tastytradeWireView");
    expect(start, "tastytradeWireView vanished — this Sentinel has rotted").toBeGreaterThan(-1);
    const nextExport = src.indexOf("\nexport function", start + 1);
    const body = src.slice(start, nextExport === -1 ? undefined : nextExport);
    expect(body, "a BrokerStatus is a config read; it may not mint tone LIVE")
      .not.toMatch(/tone:\s*"LIVE"/);
  });

  it("the scan is not vacuous — it can see a LIVE tone when one exists", () => {
    const src = readStrip();
    expect(/tone:\s*"LIVE"/.test(src), "no LIVE tone anywhere means the regex is wrong").toBe(true);
  });

  it("`realTime` is read in exactly one place, and only to cap", () => {
    const src = readStrip();
    const reads = src.match(/status\.realTime/g) ?? [];
    expect(
      reads.length,
      "a second reader of the entitlement flag is a second chance to promote it",
    ).toBe(1);
  });
});

describe("the dead export is recorded, so wiring it forces a review", () => {
  it("tastytradeWireView still has no production caller", () => {
    // NOT a demand that it stay dead — a tripwire. `selectProviderWires` uses
    // matrixProviderWireView + the readiness override for tastytrade. The day
    // someone wires this view up, this test fails and makes them re-read the
    // law above instead of inheriting a five-green-test function on trust.
    const src = readStrip();
    // Subtract the declaration itself — `export function tastytradeWireView(`
    // matches the same regex a call site does, and counting it as a caller
    // would make this tripwire fire permanently and teach the next reader to
    // ignore it.
    const callers = (src.match(/(?<!function\s)\btastytradeWireView\(/g) ?? []);
    expect(
      callers.length,
      "tastytradeWireView now has a caller. Re-read this file's header before " +
        "proceeding: this view sees only a config read and must never render " +
        "beside receipt-proven chips as though it saw a print.",
    ).toBe(0);
  });
});
