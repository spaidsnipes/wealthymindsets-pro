/** Save → reload of a sample entry with an FVG reference, in a throwaway Storage, through the Journal's own writer and reader. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { journalFixture } from "./journalProofFixture";
import { journalRoundTrip } from "./journalRoundTrip";
import { resetManagementOwnerForTests, setManagementOwner } from "./managementOwner";

afterEach(() => { vi.unstubAllGlobals(); resetManagementOwnerForTests(); });

describe("journal round trip (proof scene)", () => {
  it("§40: a context read with the reference survives save → reload with it", async () => {
    const { fvgContextAtDecision } = await import("./fvgDecisionContext");
    const { journalFixtureBars } = await import("./journalProofFixture");
    const r = journalFixture().entries[0].fvgRef;
    const c = fvgContextAtDecision(r, journalFixtureBars());
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const p = journalRoundTrip(r, "SAMPLE-ROUNDTRIP-CTX", c.context);
    const row = p.rows.find(x => x.field === "Context at the decision")!;
    expect(row.same).toBe(true);
    expect(row.before).toMatch(/^Context at the decision \(from \d+ closed bars\): structure .+ · profile .+ · wall silence · displacement bar .+ · regime UNTAGGED · volatility at formation .+ \(from bars\) · tape regime at the decision not read \(no tape held here\)\.$/);
    expect(p.verdict).toBe("SAME SNAPSHOT AFTER RELOAD");
  });
  const ref = journalFixture().entries[0].fvgRef;
  it("the same snapshot comes back: every row equal, deep-equal reference, second save byte-stable", () => {
    const p = journalRoundTrip(ref);
    expect(p.readStatus).toBe("RESOLVED_CANONICAL");
    expect(p.rows).toHaveLength(10);
    expect(p.rows[9]).toMatchObject({ field: "Context at the decision", before: "Context at the decision: not recorded with this reference.", same: true });
    expect(p.rows.every(r => r.same)).toBe(true);
    expect(p.referenceDeepEqual).toBe(true);
    expect(p.secondSaveByteStable).toBe(true);
    expect(p.verdict).toBe("SAME SNAPSHOT AFTER RELOAD");
    expect(p.bytes).toBeGreaterThan(500);
  });
  it("in a browser it uses the signed-in member's own key (in memory) and NEVER touches the real localStorage", () => {
    const real = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), key: () => null, length: 0, clear: vi.fn() };
    vi.stubGlobal("window", { localStorage: real, sessionStorage: real, dispatchEvent: () => true });
    vi.stubGlobal("localStorage", real);
    setManagementOwner("member-1", { getItem: () => null, setItem: () => {}, removeItem: () => {} }, null);
    const p = journalRoundTrip(ref);
    expect(p.key).toBe("wm_journal_entries:member-1");
    expect(p.verdict).toBe("SAME SNAPSHOT AFTER RELOAD");
    expect(real.setItem).not.toHaveBeenCalled();
    expect(real.getItem).not.toHaveBeenCalled();
  });
  it("a guest (no member key) saves nothing and says so", () => {
    vi.stubGlobal("window", { dispatchEvent: () => true });
    setManagementOwner(null, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    expect(journalRoundTrip(ref).verdict).toBe("NOT SAVED");
  });
  it("the source never names the browser's storage", () => {
    const src = readFileSync(path.resolve(__dirname, "journalRoundTrip.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src.length).toBeGreaterThan(2_000);
    expect(src).not.toMatch(/localStorage|sessionStorage|window\.|indexedDB|fetch\(/);
  });
});
