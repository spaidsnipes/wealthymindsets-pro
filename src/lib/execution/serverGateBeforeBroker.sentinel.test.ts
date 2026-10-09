/**
 * THE SERVER GATE STANDS BEFORE THE BROKER — in BOTH live submit doors.
 *
 * Audit finding 2026-10-09 (06:54 CDT): /api/broker/webull/order-submit consulted
 * no server-held limit — the kill switch, the server arm and the caps stood only
 * in front of tastytrade, while the certificate and Settings said Webull was
 * "gated". Closed the same morning: both doors now load the server-held limits
 * and run `preflightLiveOrder`, and return on a refusal, BEFORE their first
 * outbound call to the broker. This sentinel pins that ORDER in source, so a
 * later edit cannot move a broker call above the gate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
/** Source from the POST handler down (imports and the doc comment do not count). */
const handler = (src: string) => src.slice(src.indexOf("export async function POST("));

const DOORS: readonly { file: string; brokerCalls: readonly string[] }[] = [
  {
    file: "app/api/broker/tastytrade/order-submit/route.ts",
    brokerCalls: ["getTastytradeAccounts(", "getTastytradeLiveOrders(", "dryRunTastytradeOrder(", "submitTastytradeOrder(", "placeTastytradeOrder("],
  },
  {
    file: "app/api/broker/webull/order-submit/route.ts",
    brokerCalls: ["resolveWebullSessionToken(", "listWebullAccounts(", "previewWebullOrder(", "submitWebullOrderOnce("],
  },
];

describe("live submit doors — server limits + preflight before the first broker call", () => {
  it.each(DOORS.map(d => [d.file, d] as const))("%s", (_file, door) => {
    const h = handler(read(door.file));
    expect(h.length).toBeGreaterThan(500);
    const limitsAt = h.indexOf("loadServerOrderLimits(");
    const preflightAt = h.indexOf("preflightLiveOrder(");
    const refusedAt = h.indexOf("if (!preflight.ok) {");
    expect(limitsAt).toBeGreaterThan(0);
    expect(preflightAt).toBeGreaterThan(limitsAt);
    expect(refusedAt).toBeGreaterThan(preflightAt);
    // The refusal RETURNS (it does not fall through to the broker).
    expect(h.slice(refusedAt, refusedAt + 1600)).toMatch(/return NextResponse\.json\(\{ state, reason: preflight\.refusals/);
    const present = door.brokerCalls.filter(c => h.includes(c));
    expect(present.length).toBeGreaterThan(0);
    for (const call of present) expect(h.indexOf(call), `${call} must come after the gate`).toBeGreaterThan(refusedAt);
    // A failed limits read is a refusal, never a pass.
    expect(h).toMatch(/let limits: ServerOrderLimits \| null = null;\s*try \{\s*limits = await loadServerOrderLimits\([^\n]+\n\s*\} catch \{\s*limits = null;/);
    // The human's own confirmation and the owner gate stand above it, unchanged.
    expect(h.indexOf("OwnerGate(auth.user.sub, process.env)")).toBeGreaterThan(0);
    expect(h.indexOf("OwnerGate(auth.user.sub, process.env)")).toBeLessThan(limitsAt);
    expect(h.indexOf("input.confirmLive === true")).toBeLessThan(limitsAt);
  });

  it("the Webull door judges with Webull's own rail (no stop rail wired) and never Webull-specific softer rules", () => {
    const h = handler(read("app/api/broker/webull/order-submit/route.ts"));
    expect(h).toContain('protectionRail: "UNAVAILABLE", brokerName: "Webull"');
    expect(h).toContain('serverEnvironment: "production"');
    // A stock order that does not say open / close is judged as opening.
    expect(h).toContain(': side === "buy" ? "Buy to Open" : "Sell to Open";');
    // A refusal is written to its own ledger key, best effort.
    expect(h).toContain("await putOrderRefusal(kv, {");
  });

  it("the rail override can only tighten: it replaces the default rail, and nothing in the gate reads it to skip a refusal", () => {
    const src = read("lib/execution/liveOrderPreflight.ts");
    expect(src).toContain("let protection: ProtectionMode = ctx.protectionRail ?? protectionFor(o.instrumentType);");
    expect(src.match(/ctx\.protectionRail/g)?.length).toBe(1);
  });
});
