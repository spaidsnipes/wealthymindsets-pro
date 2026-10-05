/**
 * OWNER CREDENTIALS STAY THE OWNER'S (Garden 18 super order P0-E, 2026-10-05).
 *
 * "Server checks must prevent a customer from invoking Founder broker
 * credentials." Every route that reaches the tastytrade or Webull accounts the
 * deployment holds — broker AND market-data lanes — must consult an owner gate
 * before it acts, and the routes that verify a key a trader TYPES IN must use
 * that key, never one from the server's environment. A new broker route that
 * forgets either rule fails here, before it can serve a guest.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API = path.resolve(__dirname, "../../app/api");

function routesUnder(rel: string): string[] {
  const root = path.join(API, rel);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "route.ts") out.push(p);
    }
  };
  try { walk(root); } catch { /* lane absent */ }
  return out;
}

const OWNER_GATE = /tastytradeOwnerGate|webullOwnerGate|brokerOwnerRefusal|operatorOnly|alpacaGate/;

describe("owner-held broker credentials are reachable only through an owner gate", () => {
  const owned = [
    ...routesUnder("broker/tastytrade"),
    ...routesUnder("broker/webull"),
    ...routesUnder("market-data/webull"),
    ...routesUnder("broker/journal-feed"),
  ];

  it("finds the owner-held lanes (guards against a stale walker)", () => {
    expect(owned.length).toBeGreaterThan(20);
  });

  it("every tastytrade / Webull broker and data route consults an owner gate", () => {
    const ungated = owned.filter(f => !OWNER_GATE.test(readFileSync(f, "utf8"))).map(f => path.relative(API, f));
    expect(ungated, "these routes can reach the owner's broker accounts without an owner gate").toEqual([]);
  });

  it("Alpaca trading routes are owner-gated", () => {
    for (const rel of ["alpaca-trading/route.ts", "alpaca/trade/route.ts"]) {
      expect(readFileSync(path.join(API, rel), "utf8"), rel).toMatch(/alpacaGate/);
    }
  });
});

describe("a key a trader types in is verified with THAT key, never the server's", () => {
  for (const lane of ["binance", "coinbase", "kraken", "oanda", "alpaca"]) {
    it(`/api/broker/${lane} reads no broker secret from the environment`, () => {
      const src = readFileSync(path.join(API, `broker/${lane}/route.ts`), "utf8");
      expect(src).toMatch(/requireAuth/);
      expect(src).not.toMatch(/process\.env\.[A-Z_]*(KEY|SECRET|TOKEN|PASSPHRASE)/);
      expect(src).not.toMatch(/resolveProviderEnv\(/);
    });
  }
});
