import { describe, it, expect } from "vitest";
import { GET, type BrokerCertificationResponse } from "./route";

async function readBrokerCertification(): Promise<BrokerCertificationResponse> {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return await response.json() as BrokerCertificationResponse;
}

describe("/api/broker/certification GET aggregate", () => {
  it("returns one entry per registered adapter", async () => {
    const body = await readBrokerCertification();
    // Registry currently: webull, alpaca, tastytrade (per adapters/index.ts).
    expect(body.brokers.length).toBeGreaterThan(0);
    const ids = body.brokers.map((b) => b.brokerId).sort();
    expect(ids).toContain("webull");
    expect(ids).toContain("alpaca");
    expect(ids).toContain("tastytrade");
  });

  it("every broker report includes canon-shaped fields", async () => {
    const body = await readBrokerCertification();
    for (const b of body.brokers) {
      expect(typeof b.certLevel).toBe("string");
      expect(typeof b.summary).toBe("string");
      expect(Array.isArray(b.passedStages)).toBe(true);
      expect(Array.isArray(b.pendingStages)).toBe(true);
      expect(typeof b.fullyCertified).toBe("boolean");
      expect(typeof b.note).toBe("string");
    }
  });

  it("summary is 'LEVEL · X/12 stages passed' shape", async () => {
    const body = await readBrokerCertification();
    for (const b of body.brokers) {
      expect(b.summary).toMatch(/^(NONE|READ_ONLY|WRITE_PAPER|WRITE_LIVE) · \d+\/12 stages passed$/);
    }
  });

  it("fullyCertifiedCount = number of brokers with WRITE_LIVE level", async () => {
    const body = await readBrokerCertification();
    const writeLive = body.brokers.filter((b) => b.certLevel === "WRITE_LIVE").length;
    expect(body.fullyCertifiedCount).toBe(writeLive);
  });

  it("generatedAt is a valid ISO timestamp", async () => {
    const body = await readBrokerCertification();
    expect(() => new Date(body.generatedAt).toISOString()).not.toThrow();
    expect(body.generatedAt).toBe(new Date(body.generatedAt).toISOString());
  });

  it("never leaks broker tokens / api keys into the response", async () => {
    const body = await readBrokerCertification();
    const raw = JSON.stringify(body);
    // Generic secret smells — none should appear.
    expect(raw.toLowerCase()).not.toContain("bearer ");
    expect(raw.toLowerCase()).not.toContain("api_key=");
    expect(raw.toLowerCase()).not.toContain("refresh_token=");
    expect(raw).not.toMatch(/sk[_-][a-zA-Z0-9]{16,}/); // Alpaca / Stripe-style secret keys
  });
});
