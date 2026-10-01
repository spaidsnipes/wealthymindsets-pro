import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { WEBULL_2FA_SWITCH_PATH, WEBULL_CODE_ENTRY_PATH, webullSessionGuidance, type WebullKeeperView } from "./webullSessionGuidance";

const base: WebullKeeperView = { outcome: "REAUTH_REQUIRED", note: "n", atMs: 0, authMode: "TOKEN_REQUIRED" };
const texts = (k: WebullKeeperView | null) => webullSessionGuidance(k).map(l => `${l.key}:${l.text}`);

describe("the Founder reads the keeper's record, not improvised advice", () => {
  it("2FA ON and no session: names BOTH ways out, the switch path first", () => {
    const lines = webullSessionGuidance(base);
    const next = lines.find(l => l.key === "NEXT");
    expect(next?.tone).toBe("ACTION");
    expect(next?.text).toContain(WEBULL_2FA_SWITCH_PATH);
    expect(next?.text).toContain(WEBULL_CODE_ENTRY_PATH);
    expect(next!.text.indexOf(WEBULL_2FA_SWITCH_PATH)).toBeLessThan(next!.text.indexOf(WEBULL_CODE_ENTRY_PATH));
    expect(lines.find(l => l.key === "MODE")?.text).toMatch(/^ON on the App Key/);
  });

  it("2FA OFF: calm, no phone step, no NEXT", () => {
    const lines = webullSessionGuidance({ ...base, outcome: "TOKEN_NOT_REQUIRED", authMode: "TOKENLESS" });
    expect(lines.find(l => l.key === "MODE")?.text).toBe("OFF on the App Key — no phone step, ever.");
    expect(lines.find(l => l.key === "SESSION")?.tone).toBe("OK");
    expect(lines.some(l => l.key === "NEXT")).toBe(false);
  });

  it("a live session with 2FA on needs nothing from anyone", () => {
    expect(texts({ ...base, outcome: "STILL_FRESH" }).some(t => t.startsWith("NEXT:"))).toBe(false);
  });

  it("stocks refused by package with crypto open: the documented split, as a fact and a choice — never an order", () => {
    const lines = webullSessionGuidance({
      ...base, outcome: "TOKEN_NOT_REQUIRED", authMode: "TOKENLESS",
      capabilities: {
        verdict: "APP_KEY_ENTITLEMENT_ISOLATED",
        stocks: "SNAPSHOT/legacy-sha1:DENIED_ENTITLEMENT(MARKET_DATA_NOT_SUBSCRIBED) TICKS/sdk-sha256:DENIED_ENTITLEMENT(MARKET_DATA_NOT_SUBSCRIBED)",
        crypto: "CRYPTO_SNAPSHOT/legacy-sha1:OK CRYPTO_SNAPSHOT/sdk-sha256:OK",
        atMs: 0,
      },
    });
    const data = lines.find(l => l.key === "DATA")!;
    expect(data.text).toContain("Non-Display subscription");
    expect(data.text).toContain("crypto, which needs none, is open");
    expect(data.text).toContain("your call");
    expect(data.text).not.toMatch(/\b(must|need to|should|please)\s+(buy|purchase|subscribe)\b/i);
  });

  it("reconciliation: counts, external orders named as a fact, unresolved as the action", () => {
    const lines = webullSessionGuidance({
      ...base, outcome: "STILL_FRESH",
      reconciliation: { state: "OK", accounts: 3, openOrders: 2, external: 2, unresolved: 1, ledger: "KV", atMs: 0 },
    });
    const orders = lines.find(l => l.key === "ORDERS")!;
    expect(orders.text).toBe("2 open across 3 accounts · 2 placed outside WM Pro · 1 WM submission awaiting the exact lookup.");
    expect(orders.tone).toBe("ACTION");
  });

  it("no record claims nothing", () => {
    expect(texts(null)).toEqual(["SESSION:No keeper run is recorded yet — nothing about the session is claimed."]);
  });

  it("the panel prints these lines and the corrected SMS-code flow; the status route passes the fields", () => {
    const panel = readFileSync(join(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");
    expect(panel).toContain("webullSessionGuidance(receipt.sessionKeeper)");
    expect(panel).toContain("Waiting on an SMS code in the Webull app");
    expect(panel).not.toContain("approve the OpenAPI request");
    const route = readFileSync(join(process.cwd(), "src/app/api/broker/webull/status/route.ts"), "utf8");
    for (const f of ["authMode: keeper.authMode", "broker: keeper.broker", "capabilities: keeper.capabilities", "reconciliation: keeper.reconciliation"]) {
      expect(route).toContain(f);
    }
  });
});

import { webullCapabilityCertificate } from "./webullSessionGuidance";

describe("Garden 16 §34 — each Webull capability is proved separately", () => {
  const keeper: WebullKeeperView = {
    outcome: "TOKEN_NOT_REQUIRED", note: "n", atMs: 1_000_000, authMode: "TOKENLESS",
    broker: { state: "CONNECTED", accountCount: 3, atMs: 1_000_000 },
    capabilities: {
      verdict: "APP_KEY_ENTITLEMENT_ISOLATED",
      stocks: "SNAPSHOT/legacy-sha1:DENIED_ENTITLEMENT(MARKET_DATA_NOT_SUBSCRIBED)",
      crypto: "CRYPTO_SNAPSHOT/legacy-sha1:OK",
      atMs: 1_000_000,
    },
    reconciliation: { state: "PARTIAL", accounts: 3, openOrders: 0, external: 0, unresolved: 0, ledger: "NONE_PERSISTED", atMs: 1_000_000 },
  };
  const status = (rows: ReturnType<typeof webullCapabilityCertificate>) => Object.fromEntries(rows.map(r => [r.capability, r.status]));

  it("the measured production record: no blanket green", () => {
    const s = status(webullCapabilityCertificate(keeper, 1_000_000 + 60_000, { ownerNamed: false, livePathWired: false }));
    expect(s).toMatchObject({
      AUTH: "PROVED", OWNER: "NOT CONFIGURED", ACCOUNT: "PROVED", "MARKET DATA": "PARTIAL", ENTITLEMENT: "NOT ENTITLED",
      STOCKS: "NOT ENTITLED", OPTIONS: "NOT ENTITLED", FUTURES: "NOT PROVED", DEPTH: "NOT ENTITLED",
      TRADING: "NOT AUTHORIZED", "ORDER EVENTS": "PARTIAL", "POSITION STATE": "NOT PROVED", "TOKEN/SESSION RECOVERY": "PROVED",
    });
    expect(Object.keys(s)).toHaveLength(20);
  });

  it("a stale record demotes what it proved", () => {
    const s = status(webullCapabilityCertificate(keeper, 1_000_000 + 3_600_000, { ownerNamed: true, livePathWired: false }));
    expect(s).toMatchObject({ AUTH: "PARTIAL", ACCOUNT: "PARTIAL", FRESHNESS: "PARTIAL", RECONNECT: "NOT PROVED", OWNER: "PROVED" });
  });

  it("no record proves nothing", () => {
    expect(webullCapabilityCertificate(null, 0, { ownerNamed: true, livePathWired: false }).every(r => r.status === "NOT PROVED")).toBe(true);
  });
});

describe("FUTURES on the certificate is Webull's measured answer on ES", () => {
  const base: WebullKeeperView = { outcome: "TOKEN_NOT_REQUIRED", note: "n", atMs: 0, authMode: "TOKENLESS" };
  const row = (futures?: string) => webullCapabilityCertificate(
    { ...base, capabilities: { verdict: "V", stocks: "x", crypto: "y", ...(futures ? { futures } : {}), atMs: 0 } },
    60_000, { ownerNamed: true, livePathWired: false },
  ).find(r => r.capability === "FUTURES")!;
  it("not asked yet → NOT PROVED", () => expect(row().status).toBe("NOT PROVED"));
  it("refused by package → NOT ENTITLED", () => expect(row("FUTURES_SNAPSHOT/legacy-sha1:DENIED_ENTITLEMENT(MARKET_DATA_NOT_SUBSCRIBED)").status).toBe("NOT ENTITLED"));
  it("answered → PROVED", () => expect(row("FUTURES_SNAPSHOT/legacy-sha1:OK").status).toBe("PROVED"));
});
