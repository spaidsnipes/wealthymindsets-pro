/**
 * Garden 19 §66 — the server gate, READ without sending an order. One gate:
 * the standing reader asks `preflightLiveOrder` and holds no rule of its own.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_SERVER_LIMITS, preflightLiveOrder, type ServerOrderLimits } from "./liveOrderPreflight";
import { GATE_BROKERS, STANDING_REFUSAL_CODES, gateContextFor, gateProbes, orderGateStanding, serverGateNowLine } from "./orderGateStanding";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
const NOW = Date.UTC(2026, 9, 9, 18, 30, 0);
const SET: ServerOrderLimits = { ...DEFAULT_SERVER_LIMITS, armed: true, killSwitch: false, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 5_000, maxLossUsdPerOrder: 500, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: NOW - 60_000 };
const standing = (broker: "tastytrade" | "webull", limits: ServerOrderLimits | null) => orderGateStanding({ broker, limits, serverEnvironment: "production", nowMs: NOW });

describe.each(GATE_BROKERS)("the standing gate for %s", broker => {
  it("no limits record → would refuse, in the gate's own sentence", () => {
    const s = standing(broker, null);
    expect(s).toMatchObject({ broker, limits: "UNSET", killSwitch: null, serverArmed: null, verdict: "WOULD_REFUSE", asOfMs: NOW });
    expect(s.refusals.map(r => r.code)).toEqual(["LIMITS_UNSET"]);
    expect(s.sentence).toBe("would refuse: No server-held order limits are set. Set them in Settings › Execution; until then nothing live can be sent.");
  });

  it("limits set but DISARMED → would refuse: disarmed", () => {
    const s = standing(broker, { ...SET, armed: false });
    expect(s).toMatchObject({ limits: "SET", killSwitch: "RELEASED", serverArmed: false, verdict: "WOULD_REFUSE" });
    expect(s.refusals.map(r => r.code)).toEqual(["DISARMED"]);
    expect(s.sentence).toBe("would refuse: Live trading is DISARMED on the server. Arm it in Settings › Execution.");
  });

  it("kill switch engaged → would refuse: kill switch (said even when armed)", () => {
    const s = standing(broker, { ...SET, killSwitch: true });
    expect(s.killSwitch).toBe("ENGAGED");
    expect(s.refusals.map(r => r.code)).toEqual(["KILL_SWITCH"]);
    expect(s.sentence).toMatch(/^would refuse: The kill switch is engaged\./);
  });

  it("a cap not set → would refuse, naming each missing cap once", () => {
    const s = standing(broker, { ...SET, maxSharesPerOrder: null, maxLossUsdPerOrder: null });
    expect(s.verdict).toBe("WOULD_REFUSE");
    expect(s.refusals.every(r => r.code === "CAP_UNSET")).toBe(true);
    expect(s.refusals.map(r => r.reason)).toEqual([
      "Set a maximum loss per order on the server (Settings › Execution).",
      "Set a maximum shares per order on the server (Settings › Execution).",
    ]);
  });

  it("armed, released, every cap set → no standing refusal — and it does not promise the order will go", () => {
    const s = standing(broker, SET);
    expect(s).toMatchObject({ limits: "SET", killSwitch: "RELEASED", serverArmed: true, verdict: "NO_STANDING_REFUSAL", refusals: [] });
    expect(s.sentence).toBe("would pass the server gate's standing checks; the order's own size, price, quote and protection are judged when it is sent, and broker checks still apply");
    expect(s.sentence).not.toMatch(/will be sent|will fill|approved|guarantee/i);
  });
});

describe("one gate — no second copy of the rule", () => {
  it("every refusal the reader reports is one preflightLiveOrder returned for its probes, word for word", () => {
    for (const broker of GATE_BROKERS) {
      for (const limits of [null, { ...SET, armed: false }, { ...SET, killSwitch: true }, { ...SET, maxContractsPerOrder: null }, SET]) {
        const ctx = gateContextFor(broker, limits, "production", NOW);
        const fromGate = gateProbes(ctx.serverEnvironment, NOW).flatMap(p => { const r = preflightLiveOrder(p, ctx); return r.ok ? [] : r.refusals; });
        const reasons = new Set(fromGate.map(r => `${r.code}|${r.reason}`));
        for (const r of standing(broker, limits).refusals) expect(reasons.has(`${r.code}|${r.reason}`), `${broker} ${r.code}`).toBe(true);
      }
    }
  });

  it("the reader's source holds no refusal sentence and no switch condition of its own", () => {
    const src = read("lib/execution/orderGateStanding.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(src.length).toBeGreaterThan(800);
    expect(src).toContain("preflightLiveOrder(probe, ctx)");
    expect(src).not.toMatch(/kill switch is engaged|DISARMED on the server|No server-held order limits|Set a maximum/);
    expect(src).not.toMatch(/refuse\(|\.push\(\{ code/);
    expect(src).not.toMatch(/fetch\(|\.put\(|setItem\(|putOrder|Date\.now\(/);
    expect(STANDING_REFUSAL_CODES).toEqual(["LIMITS_UNSET", "KILL_SWITCH", "DISARMED", "CAP_UNSET"]);
  });

  it("the three doors read the same limits and ask the same gate; the reader's per-broker context equals each submit door's", () => {
    const tasty = read("app/api/broker/tastytrade/order-submit/route.ts");
    const webull = read("app/api/broker/webull/order-submit/route.ts");
    const gate = read("app/api/broker/order-gate/route.ts");
    const files = [tasty, webull, gate];
    expect(files.length).toBeGreaterThan(2);
    for (const f of [tasty, webull]) {
      expect(f.length).toBeGreaterThan(2000);
      expect(f).toContain('import { loadServerOrderLimits } from "@/lib/execution/serverOrderLimitsStore";');
      expect(f).toMatch(/import \{ preflightLiveOrder[^}]*\} from "@\/lib\/execution\/liveOrderPreflight";/);
      expect(f).toContain("limits = await loadServerOrderLimits(orderDecisionKv(");
    }
    expect(gate).toContain('import { loadServerOrderLimits } from "@/lib/execution/serverOrderLimitsStore";');
    expect(gate).toContain("limits = await loadServerOrderLimits(kv, auth.user.sub);");
    expect(gate).toContain("orderGateStanding({ broker, limits, serverEnvironment, nowMs: Date.now() })");
    // The context literals the submit doors pass…
    expect(webull).toContain('{ limits, serverEnvironment: "production", nowMs: Date.now(), protectionRail: "UNAVAILABLE", brokerName: "Webull" }');
    expect(tasty).toContain('{ limits, serverEnvironment: tastytradeConfigStatus().env === "cert" ? "cert" : "production", nowMs: Date.now() }');
    // …are what the reader builds.
    expect(gateContextFor("webull", SET, "cert", NOW)).toEqual({ limits: SET, serverEnvironment: "production", nowMs: NOW, protectionRail: "UNAVAILABLE", brokerName: "Webull" });
    expect(gateContextFor("tastytrade", SET, "cert", NOW)).toEqual({ limits: SET, serverEnvironment: "cert", nowMs: NOW });
    expect(gate).toContain('tastytradeConfigStatus().env === "cert" ? "cert" : "production"');
  });

  it("the read route sends nothing: no broker module, no ledger write, GET only", () => {
    const gate = read("app/api/broker/order-gate/route.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(gate.length).toBeGreaterThan(800);
    expect(gate).not.toMatch(/submit|dryRun|previewWebull|cancel|putOrderDecision|putOrderRefusal|saveServerOrderLimits|\.put\(|listWebullAccounts|getTastytradeAccounts|resolveWebullSessionToken/);
    expect(gate.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g)).toEqual(["export async function GET"]);
    expect(gate).not.toMatch(/\bfetch\(/);
  });
});

describe("the line on Settings › Connections", () => {
  it("carries the gate's sentence and its own as-of time; unread says so", () => {
    const s = standing("webull", { ...SET, armed: false });
    expect(serverGateNowLine(s)).toBe("server gate now: would refuse: Live trading is DISARMED on the server. Arm it in Settings › Execution. · as of 1:30:00 PM CDT");
    expect(serverGateNowLine(null)).toBe("server gate now: not read");
    const view = read("components/settings/CapabilityLedgerView.tsx");
    expect(view).toContain("fetch(`/api/broker/order-gate?broker=${provider.toLowerCase()}`, { cache: \"no-store\" })");
    expect(view).toContain('{!guest && r.state === "HUMAN_ARMED" && gateNow ? (');
    expect(view).toContain('data-testid="server-gate-now"');
    // Owner only: the read is skipped for anyone the server did not name OWNER.
    const effect = view.slice(view.indexOf("const [gate, setGate]"), view.indexOf("const gateNow"));
    expect(effect).toContain("if (guest) return;");
  });
});
