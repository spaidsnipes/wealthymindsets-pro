/**
 * THE BIRTH ACT IS WIRED — enforcement.
 *
 * §4: a DECISION_ID is "born at permission or first explicit intent." The only
 * explicit intent a trader can actually reach today is the /paper order
 * ticket's submit. This suite proves the mint happens there, and — the part
 * that actually matters — that it happens in the RIGHT PLACE within it.
 *
 * WHY SOURCE-LEVEL. This repo has no DOM test environment, so the React
 * submit handler cannot be invoked. Reading the source is the honest second
 * choice, and it is stated as such rather than dressed up: this proves the
 * ORDER OF STATEMENTS, not the runtime behaviour. It is TESTED, not OBSERVED.
 *
 * The checks below are deliberately anchored to identifiers (`mintDecisionId`,
 * `validateTicketLevels`, `decisionId`) rather than to comments or formatting,
 * so reformatting the file cannot break them and deleting the wire cannot
 * survive them.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAPER_PAGE = resolve(process.cwd(), "src/app/paper/page.tsx");
const src = readFileSync(PAPER_PAGE, "utf8");

describe("decision birth — the intent surface mints identity", () => {
  it("the paper order ticket mints a DECISION_ID at all", () => {
    expect(src).toContain("mintDecisionId");
    expect(src).toMatch(/cause:\s*"EXPLICIT_INTENT"/);
  });

  it("mints AFTER the ticket's refusals, so a declined order cannot burn an identity", () => {
    // Both guards decline: an unactionable quote, and a blank price level.
    // If the mint moved above them, every abandoned ticket would consume a
    // decision id and the blotter would carry ids belonging to nothing.
    const guard = src.indexOf("if (!levels.ok)");
    const mint = src.indexOf("mintDecisionId({");
    expect(guard, "level guard not found — has the ticket been rewritten?").toBeGreaterThan(-1);
    expect(mint, "mint not found").toBeGreaterThan(-1);
    expect(mint).toBeGreaterThan(guard);
  });

  it("does NOT seed the mint from the order id — the aliasing trap, at the call site", () => {
    // decisionIdentity refuses broker-shaped seeds, but nothing stops a caller
    // passing the order's own id. That would make the identity die with the
    // order it was supposed to outlive.
    const mintCall = src.slice(src.indexOf("mintDecisionId({"), src.indexOf("const order: Order"));
    expect(mintCall).not.toMatch(/nonce:\s*ord\b/);
    expect(mintCall).not.toMatch(/nonce:\s*order\./);
    expect(mintCall).not.toMatch(/nonce:\s*id\b/);
  });

  it("uses the canonical device id owner, not a locally invented one", () => {
    // H21, one owner per rule. Two device-id producers would mean the iPad
    // introduces itself by one name writing intent and another reading back.
    expect(src).toContain("thisDeviceId");
    expect(src).toContain("@/lib/traderMemory/deviceIdentity");
  });

  it("attaches the id to the order the human submitted", () => {
    expect(src).toMatch(/decisionId:\s*born\.identity\.decisionId/);
  });

  it("carries the decision off the device — the write arrow is wired", () => {
    expect(src).toContain("recordDecisionIntent");
    expect(src).toContain("@/lib/traderMemory/recordDecisionIntent");
  });

  it("records intent AFTER the order is submitted, and does not await it", () => {
    // WM's own bookkeeping may never become a gate on the trader's capital.
    // If this were awaited, a slow network would hold the order ticket open.
    const submit = src.indexOf("onSubmit(order);");
    const record = src.indexOf("recordDecisionIntent({");
    expect(submit).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(submit);
    expect(src).toMatch(/void recordDecisionIntent\(/);
    expect(src).not.toMatch(/await recordDecisionIntent\(/);
  });

  it("writes the human's PURPOSE, never the order type (§5 step 5)", () => {
    const call = src.slice(src.indexOf("recordDecisionIntent({"), src.indexOf("setFlash(true)"));
    expect(call).toMatch(/purposeSentence\(purpose\)/);
    // "market" / "limit" / "stop" are broker primitives, not intent.
    expect(call).not.toMatch(/intent:\s*type\b/);
  });

  it("does not record intent for an order that has no identity", () => {
    // An intent write naming no decision is a row nothing can ever read back.
    const record = src.indexOf("recordDecisionIntent({");
    const guard = src.lastIndexOf("if (born.ok) {", record);
    expect(guard, "recordDecisionIntent is not guarded by born.ok").toBeGreaterThan(-1);
  });

  it("lets the order through when identity could not be minted, without inventing one", () => {
    // WM does not refuse a trader's order because its own bookkeeping failed,
    // and it does not paper over the failure with a fabricated id either. The
    // field is spread conditionally — absent, not empty-string, not a fresh
    // mint.
    expect(src).toMatch(/\.\.\.\(born\.ok\s*\?\s*\{\s*decisionId:/);
  });
});

/**
 * THE ANSWER REACHES THE HUMAN.
 *
 * The write arrow could already fail honestly; nobody was told. A trader whose
 * decision never left the tab would walk to his phone expecting to find it.
 * These prove the UNRECORDED result becomes words, and — the harder half —
 * that WM stays silent when it succeeded and never speaks for the wrong
 * decision.
 */
describe("decision reach — the trader is told when a decision stayed on the device", () => {
  it("renders the reach notice at all", () => {
    expect(src).toContain("reachNote");
    expect(src).toMatch(/\{reachNote\s*&&\s*\(/);
    expect(src).toMatch(/On this device only/);
  });

  it("is a status, not an alert — the order WAS sent", () => {
    // The ticket already has a role="alert" refusal block headed "Order not
    // sent". This is a different fact: the order went through and only WM's
    // own record did not. Reusing the alert would tell the trader his trade
    // was rejected.
    const block = src.slice(src.indexOf("{reachNote && ("), src.indexOf("{/* Submit */}"));
    expect(block, "reach notice block not found").not.toBe("");
    expect(block).toMatch(/role="status"/);
    expect(block).not.toMatch(/role="alert"/);
    expect(block).not.toMatch(/Order not sent/);
  });

  it("says nothing when the decision WAS recorded — anti-vacuity", () => {
    // If the notice appeared on success too, every test above would still
    // pass and the surface would be decoration. RECORDED must produce null.
    expect(src).toMatch(/result\.status === "UNRECORDED" \? result\.note : null/);
  });

  it("also speaks when identity could not be minted", () => {
    // Nothing was even attempted, but the consequence for the trader is
    // identical, so he is told the same thing rather than left with silence.
    const elseBranch = src.slice(src.indexOf("} else {", src.indexOf("recordDecisionIntent({")));
    expect(elseBranch.slice(0, 600)).toMatch(/setReachNote\(\s*$|setReachNote\(/m);
    expect(src).toMatch(/held on this device only/);
  });

  it("clears the previous decision's notice when a new decision is made", () => {
    // A stale notice under a fresh ticket describes the wrong decision.
    const clear = src.indexOf("setReachNote(null);");
    const mint = src.indexOf("mintDecisionId({");
    expect(clear, "no clear-on-submit").toBeGreaterThan(-1);
    expect(clear).toBeLessThan(mint);
  });

  it("never lets a late answer speak for a superseded decision", () => {
    // The write is not awaited, so two quick submits race. Without this
    // guard a slow answer about decision A paints a notice sitting under B.
    expect(src).toContain("reachSubjectRef");
    expect(src).toMatch(
      /if \(reachSubjectRef\.current !== born\.identity\.decisionId\) return;/,
    );
  });

  it("names the consequence, not a fault (§8)", () => {
    const block = src.slice(src.indexOf("{reachNote && ("), src.indexOf("{/* Submit */}"));
    expect(block).not.toMatch(/\berror\b|\bfailed\b|\binvalid\b/i);
  });

  it("paints with a real token, not an invented colour class", () => {
    // `wm-amber` does not exist in tailwind.config.ts. It would have compiled
    // clean and rendered nothing — a silent visual failure. The advisory tone
    // has a canonical owner and this uses it.
    const block = src.slice(src.indexOf("{reachNote && ("), src.indexOf("{/* Submit */}"));
    expect(block).not.toMatch(/wm-amber/);
    expect(block).toContain("WM.state.watch");
    expect(src).toContain("@/lib/design/wmTokens");
  });
});
