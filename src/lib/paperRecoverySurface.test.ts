import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paperPage = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");

describe("paper recovery surface", () => {
  it("recompiles the scene when integrity alone becomes unsafe", () => {
    const sceneStart = paperPage.indexOf("const sceneInput = useMemo(");
    const sceneEnd = paperPage.indexOf("const sceneCompilation", sceneStart);
    expect(sceneStart).toBeGreaterThan(-1);
    expect(sceneEnd).toBeGreaterThan(sceneStart);
    const scene = paperPage.slice(sceneStart, sceneEnd);
    expect(scene).toContain("hydrated: hydrated && !bookRecoveryRequired");
    expect(scene).toMatch(/\[sessionToken, activeSymbol, hydrated, persistenceState, positions, orders, bookRecoveryRequired\]/);
  });

  it("withholds every subset claim and action while recovery protects stored bytes", () => {
    for (const text of [
      'v:bookRecoveryRequired ? "UNKNOWN" : updatedPositions.length',
      'v:bookRecoveryRequired ? "UNKNOWN" : pendingOrders.length',
      'v:bookRecoveryRequired ? "UNKNOWN" : trades.length',
      '"Orders · UNKNOWN"',
      '"Blotter · UNKNOWN"',
      "Order ledger unknown while paper book recovery is required.",
      "Blotter unknown while paper book recovery is required.",
      "OPTIONS BOOK UNKNOWN",
      'if (bookRecoveryRequired) return;',
      'disabled={bookRecoveryRequired}',
    ]) {
      expect(paperPage).toContain(text);
    }
  });
});
