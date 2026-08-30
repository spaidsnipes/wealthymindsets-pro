import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(__dirname, "../app/proof-lane/page.tsx"), "utf8");

describe("Proof Lane surface truth", () => {
  it("does not present a manual scenario balance as an actual account balance", () => {
    expect(page).toContain("Manual scenario balance ($)");
    expect(page).toContain("not connected to a brokerage account, Paper balance, Journal balance, or live execution");
    expect(page).not.toContain("Actual balance ($)");
  });

  it("does not promote browser-local Journal records into live execution", () => {
    expect(page).toContain("MEASURED JOURNAL");
    expect(page).toContain("Journal entries are not brokerage-certified live-execution receipts");
    expect(page).not.toContain("MEASURED LIVE");
  });

  it("shows an explicit unavailable state instead of fabricating an empty Journal", () => {
    expect(page).toContain('journalEdge.status === "UNAVAILABLE"');
    expect(page).toContain("Journal summary unavailable");
    expect(page).toMatch(/No measured\s+result is shown/);
    expect(page).not.toContain("setEdge(selectSessionEdge([]))");
  });
});
