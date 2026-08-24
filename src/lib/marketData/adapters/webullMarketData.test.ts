import { describe, it, expect, vi } from "vitest";
import { probeWebullMarketData } from "./webullMarketData";

const noopFetch = vi.fn() as unknown as typeof fetch;

describe("probeWebullMarketData — honest runtime certification (no dev-session upgrade)", () => {
  it("no runtime feed → every capability NOT_IMPLEMENTED, CVD UNAVAILABLE, nothing certified", async () => {
    const cert = await probeWebullMarketData(noopFetch, {});
    expect(cert.source).toBe("webull");
    expect(cert.rows.every((r) => r.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(cert.certifiedCount).toBe(0);
    expect(cert.fullyCertified).toBe(false);
    expect(cert.cvd).toBe("UNAVAILABLE");
    // Never touches the network in the un-configured path.
    expect(noopFetch).not.toHaveBeenCalled();
  });

  it("PRICE note explains the in-session MCP evidence vs. missing runtime feed", async () => {
    const cert = await probeWebullMarketData(noopFetch, {});
    const price = cert.rows.find((r) => r.capability === "PRICE")!;
    expect(price.note).toMatch(/verified in-session via OpenAPI MCP/i);
    expect(price.note).toMatch(/NO runtime feed is deployed/i);
  });

  it("a configured-but-unverified bridge URL still refuses to claim capabilities", async () => {
    const cert = await probeWebullMarketData(noopFetch, { dataUrl: "https://webull-bridge.example/" });
    expect(cert.certifiedCount).toBe(0);
    const price = cert.rows.find((r) => r.capability === "PRICE")!;
    expect(price.status).toBe("NOT_IMPLEMENTED");
    expect(price.note).toMatch(/not yet\s+verified/i);
    // Trailing slash normalized in the note.
    expect(price.note).toContain("https://webull-bridge.example");
    expect(price.note).not.toContain("example/)");
  });
});
