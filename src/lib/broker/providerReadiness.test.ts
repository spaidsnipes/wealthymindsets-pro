import { describe, it, expect } from "vitest";
import {
  PROVIDER_REQUIREMENTS,
  computeProviderReadiness,
  computeAllProviderReadiness,
  allProviderEnvNames,
  computeEnvParity,
  isEnvPresent,
  readinessSummary,
  type EnvPresence,
  type ProviderId,
} from "./providerReadiness";

describe("isEnvPresent", () => {
  it("treats undefined, empty, and whitespace-only as absent", () => {
    const env: EnvPresence = { A: undefined, B: "", C: "   ", D: "x" };
    expect(isEnvPresent(env, "A")).toBe(false);
    expect(isEnvPresent(env, "B")).toBe(false);
    expect(isEnvPresent(env, "C")).toBe(false);
    expect(isEnvPresent(env, "MISSING")).toBe(false);
    expect(isEnvPresent(env, "D")).toBe(true);
  });
});

describe("computeProviderReadiness", () => {
  it("READY only when every required var is present & non-empty", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "https://api.example",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("READY");
    expect(r.missing).toEqual([]);
  });

  it("BLOCKED lists the EXACT missing required vars", () => {
    const env: EnvPresence = { WEBULL_API_KEY: "k" };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["WEBULL_APP_SECRET"]);
  });

  it("recommended vars never gate READY but are reported as fidelity gaps", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "h",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("READY");
    expect(r.missingRecommended).not.toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).toContain("WEBULL_ACCESS_TOKEN");
    expect(r.missingRecommended).toContain("WEBULL_DATA_URL");
    expect(r.missingRecommended).toContain("WEBULL_CANARY_SYMBOL");
  });

  it("uses the adapter's default Webull host without falsely blocking readiness", () => {
    const r = computeProviderReadiness("webull-data", {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
    });
    expect(r.status).toBe("READY");
    expect(r.missing).toEqual([]);
    expect(r.missingRecommended).toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).toContain("WEBULL_ACCESS_TOKEN");
  });

  it("tastytrade needs the client pair AND a refresh token", () => {
    const partial: EnvPresence = {
      TASTYTRADE_CLIENT_ID: "id",
      TASTYTRADE_CLIENT_SECRET: "sec",
    };
    const r = computeProviderReadiness("tastytrade", partial);
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["TASTYTRADE_REFRESH_TOKEN"]);
  });

  it("moomoo needs both bridge url and token", () => {
    const r = computeProviderReadiness("moomoo", { MOOMOO_BRIDGE_URL: "u" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["MOOMOO_BRIDGE_TOKEN"]);
  });

  it("Longbridge needs both portable bridge names", () => {
    const r = computeProviderReadiness("longbridge-data", { LONGBRIDGE_BRIDGE_URL: "u" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["LONGBRIDGE_BRIDGE_TOKEN"]);
  });

  it("empty env → every provider BLOCKED", () => {
    const all = computeAllProviderReadiness({});
    expect(all.every((r) => r.status === "BLOCKED")).toBe(true);
    expect(all.length).toBe(PROVIDER_REQUIREMENTS.length);
  });

  it("throws on an unknown provider id", () => {
    expect(() => computeProviderReadiness("not-a-provider" as ProviderId, {})).toThrow();
  });
});

describe("requirement table integrity", () => {
  it("has no duplicate provider ids", () => {
    const ids = PROVIDER_REQUIREMENTS.map((r) => r.provider);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no var is both required and recommended for the same provider", () => {
    for (const r of PROVIDER_REQUIREMENTS) {
      const overlap = r.required.filter((n) => r.recommended.includes(n));
      expect(overlap).toEqual([]);
    }
  });

  it("allProviderEnvNames is sorted, de-duplicated, and covers every referenced var", () => {
    const names = allProviderEnvNames();
    expect([...names]).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    for (const r of PROVIDER_REQUIREMENTS) {
      for (const n of [...r.required, ...r.recommended]) {
        expect(names).toContain(n);
      }
    }
  });
});

describe("computeEnvParity (local ↔ host)", () => {
  const names = ["A", "B", "C", "D"];

  it("in parity when present on both sides (or absent on both)", () => {
    const local: EnvPresence = { A: "1", B: "2" };
    const host: EnvPresence = { A: "1", B: "2" };
    const report = computeEnvParity(names, local, host);
    expect(report.inParity).toBe(true);
    expect(report.drift).toEqual([]);
    expect(report.rows.find((r) => r.name === "C")?.status).toBe("ABSENT_BOTH");
  });

  it("flags LOCAL_ONLY and HOST_ONLY drift by name, never by value", () => {
    const local: EnvPresence = { A: "1", B: "2" };
    const host: EnvPresence = { A: "1", D: "4" };
    const report = computeEnvParity(names, local, host);
    expect(report.inParity).toBe(false);
    const byName = Object.fromEntries(report.rows.map((r) => [r.name, r.status]));
    expect(byName.A).toBe("OK");
    expect(byName.B).toBe("LOCAL_ONLY");
    expect(byName.C).toBe("ABSENT_BOTH");
    expect(byName.D).toBe("HOST_ONLY");
    expect(report.drift.map((r) => r.name).sort()).toEqual(["B", "D"]);
  });
});

describe("readinessSummary", () => {
  it("counts READY providers", () => {
    const env: EnvPresence = {
      ALPACA_KEY: "k",
      ALPACA_SECRET: "s",
    };
    const all = computeAllProviderReadiness(env);
    expect(readinessSummary(all)).toBe(`1/${all.length} providers READY`);
  });
});

describe("Alpaca legacy Cloudflare readiness", () => {
  it("recognizes the complete legacy pair without requiring duplicate canonical bindings", () => {
    const readiness = computeProviderReadiness("alpaca-live", {
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    });
    expect(readiness.status).toBe("READY");
    expect(readiness.missing).toEqual([]);
    expect(allProviderEnvNames()).toEqual(expect.arrayContaining([
      "ALPACA_BROKERAGE_KEY",
      "ALPACA_BROKERAGE_KEY_SECRET_",
    ]));
  });

  it("does not combine an incomplete canonical pair with an incomplete legacy pair", () => {
    expect(computeProviderReadiness("alpaca-live", {
      ALPACA_KEY: "canonical-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    }).status).toBe("BLOCKED");
  });
});
