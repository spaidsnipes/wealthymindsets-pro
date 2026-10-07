/**
 * TRADE FROM CHART stays honest — Garden 19 §23 / §24, P0.3. Reads source
 * (a breadcrumb, not a runtime proof; the behaviour is proven by the pure
 * tests beside it and the route tests).
 *
 * Fails if:
 *   A. the chart ticket can POST to order-submit from anywhere but its one
 *      `send()`, or `send()` stops requiring the CONFIRMING phase + the
 *      trader's explicit confirmation;
 *   B. a send that throws / times out is called anything but UNKNOWN, or the
 *      reconcile path ever posts an order (UNKNOWN is never blindly retried);
 *   C. SpaidBot's proposal code, the order-line store or the broker readback
 *      gains any path to an order route or a broker submit — SpaidBot stops at
 *      PROPOSE, and lines are drawn from read routes only;
 *   D. order-submit stops running the server-held gate before tastytrade is
 *      asked for anything.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const bodyOf = (src: string, signature: string) => {
  const at = src.indexOf(signature);
  expect(at, `${signature} not found`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = src.indexOf("{", at); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(at, i + 1);
  }
  return src.slice(at);
};

const TICKET = strip(read("components/chart/TastytradeLiveOrder.tsx"));

describe("A. one send, behind confirmation", () => {
  it("order-submit is posted from send() and nowhere else in the ticket", () => {
    expect(TICKET.match(/\/api\/broker\/tastytrade\/order-submit/g)).toHaveLength(1);
    expect(bodyOf(TICKET, "async function send()")).toContain("/api/broker/tastytrade/order-submit");
  });
  it("send() refuses unless the trader confirmed on the confirm sheet", () => {
    const send = bodyOf(TICKET, "async function send()");
    expect(send).toMatch(/!confirmed \|\| !canSend\(phaseRef\.current\)/);
    expect(send).toContain('step({ type: "SEND" })');
  });
});

describe("B. a timeout is UNKNOWN, and UNKNOWN is reconciled, never resent", () => {
  it("the send's catch steps TIMEOUT (→ UNKNOWN) and reconciles", () => {
    const send = bodyOf(TICKET, "async function send()");
    const catchAt = send.indexOf("} catch {");
    expect(catchAt).toBeGreaterThan(-1);
    expect(send.slice(catchAt)).toMatch(/step\(\{ type: "TIMEOUT" \}\)[\s\S]*reconcile\(\)/);
    expect(send).not.toMatch(/REJECTED/);
  });
  it("reconcile() only reads orders", () => {
    const rec = bodyOf(TICKET, "function reconcile()");
    expect(rec).toContain("/api/broker/tastytrade/orders");
    expect(rec).not.toMatch(/order-submit|method:\s*"POST"/);
  });
});

describe("C. SpaidBot proposes; lines are read, never sent", () => {
  for (const f of ["spaidbotProposal.ts", "spaidbotProposalInbox.ts", "chartOrderLines.ts", "brokerOrderLines.ts", "useBrokerChartLines.ts"]) {
    it(`${f} has no path to an order route or a broker submit`, () => {
      const src = strip(read(`lib/execution/${f}`));
      expect(src).not.toMatch(/order-submit|order-dry-run|submitTastytradeOrder|submitWebullOrderOnce|cancelTastytradeOrder|method:\s*"(POST|DELETE|PUT)"/);
      expect(src).not.toMatch(/from "@\/lib\/tastytrade"/);
    });
  }
  it("a proposal's permission is the single literal PROPOSE_ONLY", () => {
    expect(read("lib/execution/spaidbotProposal.ts")).toContain('export const SPAIDBOT_PERMISSION = "PROPOSE_ONLY" as const;');
  });
});

describe("D. order-submit runs the server-held gate before tastytrade is asked", () => {
  it("preflight is read and checked before the accounts are read", () => {
    const route = strip(read("app/api/broker/tastytrade/order-submit/route.ts"));
    const gate = route.indexOf("const preflight = preflightLiveOrder(");
    const refuse = route.indexOf("if (!preflight.ok)");
    const accounts = route.indexOf("await getTastytradeAccounts()");
    const authority = route.indexOf("if (!authority.authorized) return");
    expect(authority).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(authority);
    expect(refuse).toBeGreaterThan(gate);
    expect(accounts).toBeGreaterThan(refuse);
    expect(route).toContain("loadServerOrderLimits(orderDecisionKv(await webullWorkerEnv()), auth.user.sub)");
  });
});
