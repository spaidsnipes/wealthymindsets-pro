/**
 * Garden 16 §55 — DESKTOP 901–1023 KEEPS THE CHART DOMINANT (2026-09-27).
 * Measured at 901×900: the decision band wrapped into ~490px of rows under a
 * ~150px chart. A narrowed desktop window (landscape, 768–1023) now gets the
 * one-row horizontally scrolling strip with bounded cards (chart 472px, band
 * 202px). Portrait tablets are not touched — that device phase is not open.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync("src/components/experience/DecisionSpineBand.tsx", "utf8");

describe("the decision band at desktop 768–1023 (landscape)", () => {
  it("is one row that scrolls sideways, with bounded cards", () => {
    const at = SRC.indexOf("@media (min-width: 768px) and (max-width: 1023px) and (orientation: landscape)");
    expect(at).toBeGreaterThan(0);
    const block = SRC.slice(at, at + 600);
    expect(block).toContain("flex-wrap: nowrap !important;");
    expect(block).toContain("overflow-x: auto;");
    expect(block).toContain("max-height: 200px;");
  });
  it("the phone rule is unchanged", () => {
    expect(SRC).toContain("@media (max-width: 767px) {");
  });
  it("portrait tablets get the same one-row strip (iPad, 2026-10-02)", () => {
    const at = SRC.indexOf("@media (min-width: 768px) and (max-width: 1023px) and (orientation: portrait)");
    expect(at).toBeGreaterThan(0);
    const block = SRC.slice(at, at + 600);
    expect(block).toContain("flex-wrap: nowrap !important;");
    expect(block).toContain("max-height: 220px;");
  });
});
