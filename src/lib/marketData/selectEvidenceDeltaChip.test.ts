import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIRECTION_MIN_IMBALANCE, selectEvidenceDeltaChip } from "./selectEvidenceDeltaChip";

function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The four rows read out of the live Evidence-saved popover on 2026-09-17.
 * `buyVol`/`sellVol` are reconstructed to reproduce each row's measured delta
 * and trade count; the DELTAS and TRADE COUNTS are the live values.
 */
const AAPL = { delta: -0.01, buyVol: 249.995, sellVol: 250.005, tradeCount: 5 };
const META = { delta: 0.01, buyVol: 1000.005, sellVol: 999.995, tradeCount: 37 };
const BTC = { delta: 290.93, buyVol: 1645.465, sellVol: 1354.535, tradeCount: 229_371 };

describe("selectEvidenceDeltaChip — a signed coloured number beside a ticker is a price change", () => {
  it("× THE MISSING NOUN: the Δ travels WITH the reading, never only in the title", () => {
    // The defect: "+0.01" rendered bare, in the slot that means "change today".
    for (const s of [AAPL, META, BTC]) {
      expect(selectEvidenceDeltaChip(s, "X").text).toMatch(/^Δ /);
    }
  });

  it("× THE VERDICT ON NOISE: AAPL's -0.01 across 5 trades gets no direction colour", () => {
    const f = selectEvidenceDeltaChip(AAPL, "AAPL");
    expect(f.kind).toBe("BALANCED");
    expect(f.direction).toBe(0);
    // §35: the number is NEVER withheld. Only the verdict about its direction.
    expect(f.text).toContain("0.01");
    expect(f.text).toContain("−");
  });

  it("× THE SAME NOISE IN GREEN: META's +0.01 across 37 trades is also uncoloured", () => {
    const f = selectEvidenceDeltaChip(META, "META");
    expect(f.kind).toBe("BALANCED");
    expect(f.direction).toBe(0);
    expect(f.text).toContain("+");
  });

  it("a genuine imbalance keeps its colour — BTC +290.93 is a real reading", () => {
    const f = selectEvidenceDeltaChip(BTC, "BTC");
    expect(f.kind).toBe("DIRECTIONAL");
    expect(f.direction).toBe(1);
  });

  it("× THE ABSOLUTE-SIZE TRAP: the grade is a RATIO, so it means the same on every instrument", () => {
    // 0.5 is dust in AAPL shares and an enormous trade in BTC. An absolute
    // threshold would call one of these wrong. The ratio calls both right.
    const tinyInstrument = { delta: 0.5, buyVol: 0.75, sellVol: 0.25, tradeCount: 2 };
    const hugeInstrument = { delta: 0.5, buyVol: 500_000.25, sellVol: 499_999.75, tradeCount: 90_000 };
    expect(selectEvidenceDeltaChip(tinyInstrument).kind).toBe("DIRECTIONAL");
    expect(selectEvidenceDeltaChip(hugeInstrument).kind).toBe("BALANCED");
  });

  it("no sided volume is NOT a small imbalance — it is no observation", () => {
    // A tape that reports trades without sides lands here. Unsided trades
    // cannot establish aggression, and saying "balanced" would claim they did.
    const f = selectEvidenceDeltaChip({ delta: 0, buyVol: 0, sellVol: 0, tradeCount: 12 });
    expect(f.kind).toBe("UNOBSERVED");
    expect(f.direction).toBe(0);
    expect(f.title).toMatch(/no imbalance to grade/i);
  });

  it("the hover names the UNIT and refuses currency, on every verdict", () => {
    for (const s of [AAPL, BTC, { delta: 0, buyVol: 0, sellVol: 0, tradeCount: 0 }]) {
      const t = selectEvidenceDeltaChip(s, "X").title;
      expect(t).toMatch(/NET AGGRESSIVE VOLUME/);
      expect(t).toMatch(/never\s+currency/i);
    }
  });

  it("× THE OVERCLAIM IN THE OTHER COAT: it speaks about the tape THIS BROWSER saw", () => {
    const f = selectEvidenceDeltaChip(BTC, "BTC");
    expect(f.title).toMatch(/not about the whole market/i);
    expect(f.title).toMatch(/observed in this browser/i);
  });

  it("missing or non-finite fields never fabricate a direction", () => {
    for (const bad of [null, undefined, {}, { delta: Number.NaN, buyVol: 5, sellVol: 5 }, { delta: "3" }]) {
      expect(selectEvidenceDeltaChip(bad as never).direction).toBe(0);
    }
  });

  it("the threshold is a declared convention, reachable and named", () => {
    expect(DIRECTION_MIN_IMBALANCE).toBeGreaterThan(0);
    expect(DIRECTION_MIN_IMBALANCE).toBeLessThan(1);
    // Exactly at the convention is directional; a hair under is not.
    const at = { delta: DIRECTION_MIN_IMBALANCE * 100, buyVol: 100, sellVol: 0, tradeCount: 3 };
    expect(selectEvidenceDeltaChip(at).kind).toBe("DIRECTIONAL");
  });

  it("a blank symbol degrades the wording, never the verdict", () => {
    const f = selectEvidenceDeltaChip(AAPL, "  ");
    expect(f.kind).toBe("BALANCED");
    expect(f.title).toContain("This symbol");
  });

  it("the delta is spoken, not hover-only", () => {
    expect(selectEvidenceDeltaChip(AAPL, "AAPL").spoken).toMatch(/net volume/i);
    expect(selectEvidenceDeltaChip(BTC, "BTC").spoken).toMatch(/buy side ahead/i);
  });
});

describe("NectarVaultChip adoption", () => {
  const CODE = codeOf("components/chart/NectarVaultChip.tsx");

  it("× THE UNCONSULTED OWNER: the pill compiles through selectEvidenceDeltaChip", () => {
    expect(CODE).toContain("selectEvidenceDeltaChip(slot.stats, symbol)");
  });

  it("× THE RESURRECTED SIGN COLOUR: colour comes from the verdict, not from Math.sign", () => {
    expect(CODE, "the colour is being picked from the raw delta again")
      .not.toMatch(/d\s*>\s*0\s*\?\s*"#00C076"/);
    expect(CODE).toContain("deltaChip.direction === 1");
    expect(CODE).toContain("deltaChip.direction === -1");
  });

  it("the visible glyph is the owner's text, and declares which verdict produced it", () => {
    expect(CODE).toContain("{deltaChip.text}");
    expect(CODE).toContain("data-evidence-delta-kind={deltaChip.kind}");
  });

  it("the delta reaches a screen reader through the accessible name", () => {
    expect(CODE).toContain("deltaChip.spoken");
  });

  it("the hover is the owner's sentence, not a retyped one", () => {
    expect(CODE).toContain("deltaChip.title");
  });
});
