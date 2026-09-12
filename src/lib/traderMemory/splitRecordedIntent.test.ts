import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { splitRecordedIntent } from "./splitRecordedIntent";

/** A record in the exact shape `OptionExpressionIntent` writes today. */
const REAL = "Review NVDA expression: NVDA260918C00180000; call; strike 180; expiry 2026-09-18."
  + " Purpose: gap fill into the 180 shelf. Reference source alpaca; reviewed provider"
  + " marketData/alpaca/options; rights policy alpaca-indicative-v1; fidelity INDICATIVE;"
  + " quote timestamp 2026-09-12T18:30:00Z; quote timing RECENT; trade timestamp not observed;"
  + " trade timing UNVERIFIED; source OSI identity matches the selected underlying, side,"
  + " expiry, and strike; executable quote and broker instrument mapping/support remain"
  + " unverified. No order requested.";

describe("splitRecordedIntent — the trader's words", () => {
  it("recovers the thesis from a record written by the live template", () => {
    const parts = splitRecordedIntent(REAL);
    expect(parts.parsed).toBe(true);
    expect(parts.thesis).toBe("gap fill into the 180 shelf");
    expect(parts.contract).toBe("Review NVDA expression: NVDA260918C00180000; call; strike 180; expiry 2026-09-18.");
    expect(parts.provenance?.startsWith("Reference source alpaca;")).toBe(true);
    expect(parts.provenance?.endsWith("No order requested.")).toBe(true);
  });

  /** No part may be invented or dropped. Reassembly is the cheapest proof that
   * the projection is lossless — a split that quietly ate a clause would let a
   * trader read a record that no longer says what was recorded. */
  it("loses nothing: the three parts reassemble into the original record", () => {
    const p = splitRecordedIntent(REAL);
    expect(`${p.contract} Purpose: ${p.thesis}. ${p.provenance}`).toBe(REAL);
    expect(p.raw).toBe(REAL);
  });

  /**
   * The load-bearing case. A thesis is free text, and a trader may well quote
   * the very phrase that ends it. Splitting on the FIRST occurrence would
   * truncate their own reasoning and file the remainder under the machine's
   * heading — silently, with no error anywhere.
   */
  it("keeps the whole thesis when the trader's own words contain the closing phrase", () => {
    const quoted = REAL.replace(
      "gap fill into the 180 shelf",
      "ignore what the card says. Reference source is stale in my experience",
    );
    const parts = splitRecordedIntent(quoted);
    expect(parts.thesis).toBe("ignore what the card says. Reference source is stale in my experience");
    expect(parts.provenance?.startsWith("Reference source alpaca;")).toBe(true);
  });
});

describe("splitRecordedIntent — what it refuses to guess", () => {
  /**
   * FAIL CLOSED. Showing a machine's provenance dump under the heading "your
   * reasoning" is worse than showing an unsplit blob, because the trader would
   * believe it. Every unrecognised shape returns the record whole.
   */
  it.each([
    ["an older or foreign template", "Reviewed a contract. No order requested."],
    ["a record with no provenance tail", "Review NVDA expression: X. Purpose: buy the dip."],
    ["a record with no thesis marker", "Review NVDA expression: X. Reference source alpaca; fidelity INDICATIVE."],
    ["a blank thesis", "Review NVDA expression: X. Purpose:  . Reference source alpaca; fidelity INDICATIVE."],
    ["the seams in the wrong order", "Reference source alpaca. Purpose: after the fact."],
    ["an empty record", ""],
  ])("hands back the whole record for %s", (_case, record) => {
    const parts = splitRecordedIntent(record);
    expect(parts.parsed).toBe(false);
    expect(parts.thesis).toBeNull();
    expect(parts.contract).toBeNull();
    expect(parts.provenance).toBeNull();
    expect(parts.raw).toBe(record);
  });
});

describe("splitRecordedIntent — the seam it depends on", () => {
  /**
   * G2. This module derives its split from a template it does not own. If
   * `OptionExpressionIntent` rewords the sentence, the split does not throw —
   * it silently starts returning `parsed: false` for every new record, and the
   * feature quietly dies while every gate stays green. This is the tripwire
   * that makes that impossible: the producer must still write both seams.
   */
  it("still matches the template OptionExpressionIntent actually writes", () => {
    const producer = fs.readFileSync(
      path.join(process.cwd(), "src/components/chart/OptionExpressionIntent.tsx"), "utf8");
    expect(producer).toContain("expiry ${contract.expirationDate}. Purpose: ${purpose.trim()}. Reference source ${source}");
  });
});
