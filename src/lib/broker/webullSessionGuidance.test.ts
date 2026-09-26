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
