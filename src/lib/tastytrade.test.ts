import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tastytradeConfigStatus, getTastytradeCapabilities } from "./tastytrade";

const ENV_NAMES = ["TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN"];

/**
 * The claim under test is NOT "tastytrade works". It is narrower and more
 * important: when tastytrade is not connected, the sentence WM Pro shows the
 * operator must describe what WM MEASURED, never a cause WM assumed.
 *
 * `configured` is false when EITHER the client secret or the refresh token is
 * absent, but the note used to say "Add TASTYTRADE_REFRESH_TOKEN" in both
 * cases. An operator who had already supplied the refresh token would be sent
 * to re-do work he had done, while the real gap stayed invisible. That is the
 * exact failure shape that cost three months on Webull — see
 * docs/operations/EVIDENCE_2026-09-20_WEBULL_ENTITLEMENT_ISOLATED.md.
 *
 * These tests never assert on a secret VALUE, only on which NAMES appear.
 */
describe("tastytrade config status — measured absence, not assumed cause", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_NAMES) saved[k] = process.env[k];
    for (const k of ENV_NAMES) delete process.env[k];
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("names the refresh token when only it is absent", () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    const cfg = tastytradeConfigStatus();
    expect(cfg.configured).toBe(false);
    expect(cfg.missing).toEqual(["TASTYTRADE_REFRESH_TOKEN"]);
  });

  it("names the client secret when only IT is absent — not the refresh token", () => {
    // The case the old fixed message got wrong. Without this test the module
    // could go back to blaming the refresh token and stay green.
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    const cfg = tastytradeConfigStatus();
    expect(cfg.configured).toBe(false);
    expect(cfg.missing).toEqual(["TASTYTRADE_CLIENT_SECRET"]);
  });

  it("does NOT name CLIENT_ID — this lane's token grant never sends one", () => {
    // Scoping matters as much as naming. The refresh-token body carries
    // client_secret + refresh_token and no client_id, so listing CLIENT_ID
    // would point the operator at something this code path does not read.
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    const cfg = tastytradeConfigStatus();
    expect(cfg.configured).toBe(true);
    expect(cfg.missing).toEqual([]);
  });

  it("names both when both are absent", () => {
    const cfg = tastytradeConfigStatus();
    expect(cfg.missing).toEqual(["TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN"]);
  });

  it("reports presence without ever returning a value", () => {
    process.env.TASTYTRADE_CLIENT_SECRET = "very-secret-value-abc";
    process.env.TASTYTRADE_REFRESH_TOKEN = "very-secret-refresh-xyz";
    const s = JSON.stringify(tastytradeConfigStatus());
    expect(s).not.toContain("very-secret-value-abc");
    expect(s).not.toContain("very-secret-refresh-xyz");
    expect(s).toContain("hasClientSecret");
  });
});

describe("getTastytradeCapabilities — the unconnected sentence", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_NAMES) saved[k] = process.env[k];
    for (const k of ENV_NAMES) delete process.env[k];
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("does not claim connected/quotes when unconfigured, and names the real gap", async () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    const caps = await getTastytradeCapabilities();
    expect(caps.configured).toBe(false);
    expect(caps.connected).toBe(false);
    expect(caps.quotes).toBe(false);
    // realTime stays null: entitlement is never assumed from configuration.
    expect(caps.realTime).toBeNull();
    expect(caps.accounts).toBe(0);
    expect(caps.note).toContain("TASTYTRADE_REFRESH_TOKEN");
    expect(caps.note).not.toContain("TASTYTRADE_CLIENT_SECRET");
  });

  it("blames the client secret when that is the gap", async () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    const caps = await getTastytradeCapabilities();
    expect(caps.note).toContain("TASTYTRADE_CLIENT_SECRET");
    expect(caps.note).not.toContain("TASTYTRADE_REFRESH_TOKEN is absent");
  });
});
