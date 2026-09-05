import { describe, it, expect } from "vitest";
import { selectReadinessWireboard, type ReadinessPayload } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";

const ready: ProviderReadiness = {
  provider: "alpaca-live",
  label: "Alpaca (live)",
  lane: "broker",
  status: "READY",
  missing: [],
  missingRecommended: [],
  note: "Live-account key/secret pair.",
};

const blocked: ProviderReadiness = {
  provider: "webull-data",
  label: "Webull market data",
  lane: "market-data",
  status: "BLOCKED",
  missing: ["WEBULL_API_HOST"],
  missingRecommended: ["WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
  note: "Signed tick reads.",
};

const payload = (providers: ProviderReadiness[]): ReadinessPayload => ({
  surface: "broker-readiness",
  providers,
  envPresence: [
    { name: "ALPACA_KEY", present: true },
    { name: "ALPACA_SECRET", present: true },
    { name: "WEBULL_API_HOST", present: false },
  ],
});

describe("selectReadinessWireboard", () => {
  it("projects Supabase account-service presence without claiming authentication", () => {
    const configured = selectReadinessWireboard({
      providers: [ready],
      accountService: { configured: true, missing: [] },
    });
    expect(configured.accountService.blockerClass).toBe("SETUP PRESENT");
    expect(configured.accountService.detail).toContain("still requires a successful auth receipt");

    const blocked = selectReadinessWireboard({
      providers: [ready],
      accountService: { configured: false, missing: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] },
    });
    expect(blocked.accountService.blockerClass).toBe("NOT CONFIGURED");
    expect(blocked.accountService.detail).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("maps providers to rows preserving identity, lane, and status", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.rows).toHaveLength(2);
    expect(wb.rows[0]).toMatchObject({ provider: "alpaca-live", lane: "broker", status: "READY" });
    expect(wb.rows[1]).toMatchObject({ provider: "webull-data", lane: "market-data", status: "BLOCKED" });
  });

  it("labels a BLOCKED provider as NOT CONFIGURED and names the exact missing var — never entitlement", () => {
    const wb = selectReadinessWireboard(payload([blocked]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("NOT CONFIGURED");
    expect(row.blockerDetail).toContain("WEBULL_API_HOST");
    expect(row.blockerDetail).toContain("NOT CONFIGURED");
    // Monday Test 2 law: presence-only readiness must NEVER fabricate an
    // entitlement/delay blocker.
    expect(row.blockerDetail.toUpperCase()).not.toContain("ENTITLEMENT");
    expect(row.blockerDetail.toUpperCase()).not.toContain("DELAYED");
  });

  it("labels a READY provider honestly as not-yet-connected, never certified", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("SETUP PRESENT");
    expect(row.blockerDetail.toLowerCase()).toContain("not yet connected");
    expect(row.blockerDetail.toLowerCase()).not.toContain("certified — ");
  });

  it("surfaces a fidelity gap for a READY provider missing recommended vars, without blocking it", () => {
    const readyWithGap: ProviderReadiness = { ...ready, missingRecommended: ["ALPACA_FEED"] };
    const wb = selectReadinessWireboard(payload([readyWithGap]));
    expect(wb.rows[0].status).toBe("READY");
    expect(wb.rows[0].blockerDetail).toContain("ALPACA_FEED");
    expect(wb.rows[0].blockerDetail.toLowerCase()).toContain("fidelity gap");
  });

  it("pluralizes the missing-variables sentence correctly", () => {
    const twoMissing: ProviderReadiness = { ...blocked, missing: ["A", "B"] };
    const oneMissing: ProviderReadiness = { ...blocked, missing: ["A"] };
    expect(selectReadinessWireboard(payload([twoMissing])).rows[0].blockerDetail).toContain("variables: A, B");
    expect(selectReadinessWireboard(payload([oneMissing])).rows[0].blockerDetail).toContain("variable: A");
  });

  it("computes a value-free headline summary and ready count", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.summary).toBe("1/2 providers configured");
    expect(wb.summary).not.toContain("READY");
    expect(wb.readyCount).toBe(1);
    expect(wb.totalCount).toBe(2);
  });

  it("counts env presence without leaking any value", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    expect(wb.envPresentCount).toBe(2);
    expect(wb.envTotalCount).toBe(3);
  });

  it("treats a null / empty payload as empty, never throwing", () => {
    expect(selectReadinessWireboard(null).empty).toBe(true);
    expect(selectReadinessWireboard(undefined).rows).toEqual([]);
    expect(selectReadinessWireboard({}).summary).toBe("0/0 providers configured");
  });
});

describe("selectReadinessWireboard near-miss section", () => {
  it("is empty when the payload carries no near misses (the normal case)", () => {
    expect(selectReadinessWireboard({ providers: [] }).nearMisses).toEqual([]);
    expect(selectReadinessWireboard(null).nearMisses).toEqual([]);
    expect(selectReadinessWireboard({ providers: [], nearMisses: [] }).nearMisses).toEqual([]);
  });

  it("renders the 2026-09-05 typo as NEAR-CERTAIN and names both sides", () => {
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" },
      ],
    });
    expect(wb.nearMisses).toHaveLength(1);
    const [miss] = wb.nearMisses;
    expect(miss.strength).toBe("NEAR-CERTAIN");
    expect(miss.expected).toBe("FINNHUB_KEY");
    expect(miss.found).toBe("FINNHUB_KEY_");
    expect(miss.detail).toContain("FINNHUB_KEY_");
    expect(miss.detail).toContain("FINNHUB_KEY");
  });

  it("demotes a token overlap to LEAD and refuses to call it a diagnosis", () => {
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "LIVEKIT_API_KEY", found: "ATH_LIVEKIT_KEY_", confidence: "SHARED_DISTINCTIVE_TOKENS" },
      ],
    });
    expect(wb.nearMisses[0].strength).toBe("LEAD");
    expect(wb.nearMisses[0].detail).toContain("not a diagnosis");
  });

  it("never claims renaming will make the provider work (values are unproven)", () => {
    // The detector compares NAMES. It cannot know the value behind the
    // lookalike is valid, so the copy must not promise a working connection.
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" },
      ],
    });
    const copy = wb.nearMisses.map((m) => m.detail).join(" ").toLowerCase();
    for (const forbidden of ["will work", "will fix", "connected", "live", "certified"]) {
      expect(copy).not.toContain(forbidden);
    }
  });
});
