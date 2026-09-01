import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Alpaca stream host portability", () => {
  it("uses the runtime-native WebSocket client instead of the Node ws transport", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from ["']ws["']/);
    expect(source).toContain('new WebSocket("wss://stream.data.alpaca.markets/v2/iex")');
    expect(source).toContain('addEventListener("message"');
  });

  it("closes an explicit provider auth failure without emitting a later guessed timeout", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
    expect(source).toContain("if (authTimer) clearTimeout(authTimer)");
    expect(source).toContain('err: "auth timeout — Alpaca did not return an authentication result"');
    expect(source).not.toContain("likely Alpaca 1-connection limit");
  });
});
