import { describe, expect, it } from "vitest";
import { waitingRowWords } from "./waitingTray";

describe("waitingRowWords", () => {
  it("keeps the tool's name and what it waits for", () => {
    expect(waitingRowWords("ANATOMY CARDS · ON · SELECT AN ABSORPTION SHELF")).toBe("ANATOMY CARDS — Select an absorption shelf");
    expect(waitingRowWords("RISK ON PRICE · no position drawn")).toBe("RISK ON PRICE — No position drawn");
  });
  it("says waiting when the line names no reason", () => {
    expect(waitingRowWords("CVD NOTCH · ON")).toBe("CVD NOTCH — Waiting");
  });
  it("keeps a row short", () => {
    expect(waitingRowWords(`X · ${"word ".repeat(30)}`).length).toBeLessThanOrEqual(4 + 44);
  });
});
