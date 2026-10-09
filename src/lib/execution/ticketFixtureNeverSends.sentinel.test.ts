/**
 * SENTINEL — scene=ticket-fixture CAN NEVER REACH AN ORDER ROUTE (coordinator order 2026-10-09).
 *
 * The proof scene feeds the REAL trade ticket a sample book so its layout and rows can be read on
 * serving without touching the Founder's ticket. The scene does not ship without this guard:
 *   1. the fixture module is pure — no fetch, no storage, no route string;
 *   2. the scene is OWNER-only (a signed-in owner): a guest or another member gets no scene;
 *   3. in the scene `ensureDecision` returns null, and the (unedited) live-order block refuses its
 *      preview AND its send on a null decision BEFORE either reaches a route — pinned here so a
 *      change to the order block trips this file;
 *   4. the ticket's own dry run and cancel return before their fetch in the scene;
 *   5. every live-order block sits inside a fieldset that is `disabled` in the scene, the KILL
 *      switch is disabled, and the broker is not read;
 *   6. the scene's reason has one owner and is shown at the controls.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const read = (f: string) => readFileSync(path.join(SRC, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const PANEL = code("components/chart/TradePanel.tsx");
const BLOCK = code("components/chart/TastytradeLiveOrder.tsx");
const FIXTURE = code("lib/execution/ticketFixture.ts");

describe("1 · the fixture is pure", () => {
  it("no network, no storage, no route, no React state", () => {
    expect(FIXTURE.length).toBeGreaterThan(1_500);
    expect(FIXTURE).not.toMatch(/fetch\(|\/api\/|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|useState|useEffect|method:/);
  });
  it("the sample goes through the real selector, not a hand-built book", () => {
    expect(FIXTURE).toContain("return selectBrokerOrderLines(ticketFixtureReadback(fx, contract, refPx, nowMs), contract, refPx, pointValue, nowMs);");
  });
});

describe("2 · the scene is for a signed-in OWNER only", () => {
  it("the asked scene becomes the scene only when the broker audience is OWNER", () => {
    expect(PANEL).toContain('const scene = audience === "OWNER" ? sceneAsked : null;');
    expect(PANEL).toContain("const audience = useBrokerAudience();");
    // Nothing else may switch the scene on.
    expect(PANEL.match(/const scene = /g) ?? []).toHaveLength(1);
    expect(PANEL).not.toMatch(/setSide\(sceneAsked/);
    expect(PANEL).toContain("useEffect(() => { if (scene) setSide(scene.side); }, [scene, symbol]);");
  });
  it("the audience owner answers GUEST without a signed-in user, and asks the server otherwise", () => {
    const a = code("lib/broker/useBrokerAudience.ts");
    expect(a).toContain('if (!userId) { setAudience("GUEST"); return; }');
    expect(a).toContain("const { user, loading } = useAuth();");
  });
});

describe("3 · the order block cannot preview or send in the scene", () => {
  it("in the scene ensureDecision returns null before anything else", () => {
    const fn = PANEL.slice(PANEL.indexOf("function ensureDecision(): string | null {"));
    expect(fn.slice(0, 200)).toMatch(/function ensureDecision\(\): string \| null \{\s*if \(scene\) return null;/);
  });
  it("every live-order block on the ticket receives THAT ensureDecision", () => {
    expect(PANEL.match(/<TastytradeLiveOrder\b/g) ?? []).toHaveLength(3);
    expect(PANEL.match(/ensureDecision=\{ensureDecision\}/g) ?? []).toHaveLength(3);
  });
  it("PIN on the order block: the null-decision refusal comes BEFORE the dry-run fetch and BEFORE the submit fetch", () => {
    const preview = BLOCK.slice(BLOCK.indexOf("async function previewOrder()"), BLOCK.indexOf("async function send()"));
    const send = BLOCK.slice(BLOCK.indexOf("async function send()"), BLOCK.indexOf("function reconcile()"));
    for (const [name, body, route] of [["previewOrder", preview, "/api/broker/tastytrade/order-dry-run"], ["send", send, "/api/broker/tastytrade/order-submit"]] as const) {
      const guard = body.indexOf("const decisionId = ensureDecision();");
      const refuse = body.indexOf("if (!decisionId) {");
      const ret = body.indexOf("return; }", refuse);
      const fetchAt = body.indexOf(route);
      expect(guard, `${name}: guard present`).toBeGreaterThan(0);
      expect(refuse, `${name}: refusal present`).toBeGreaterThan(guard);
      expect(ret, `${name}: the refusal returns`).toBeGreaterThan(refuse);
      expect(fetchAt, `${name}: the route is after the refusal`).toBeGreaterThan(ret);
    }
    // …and these are the block's only two POSTs.
    expect(BLOCK.match(/method:\s*"POST"/g) ?? []).toHaveLength(2);
  });
});

describe("4 · the ticket's own dry run and cancel stop before their fetch", () => {
  it("dryRun returns in the scene before the dry-run route", () => {
    const fn = PANEL.slice(PANEL.indexOf("async function dryRun()"));
    const guard = fn.indexOf("|| scene) return;");
    expect(guard).toBeGreaterThan(0);
    expect(fn.indexOf("/api/broker/tastytrade/order-dry-run")).toBeGreaterThan(guard);
  });
  it("cancelWorking returns in the scene before the DELETE", () => {
    const fn = PANEL.slice(PANEL.indexOf("async function cancelWorking("));
    const guard = fn.indexOf("if (scene ||");
    expect(guard).toBeGreaterThan(0);
    expect(fn.indexOf('method: "DELETE"')).toBeGreaterThan(guard);
  });
  it("the ticket itself never names order-submit", () => {
    expect(PANEL).not.toContain("order-submit");
  });
});

describe("5 · natively disabled, and the broker is not read", () => {
  it("both live-order groups sit in a fieldset disabled by the scene; the dry run and KILL are disabled", () => {
    expect(PANEL).toContain('<fieldset data-testid="trade-live-fieldset" disabled={!!scene}');
    expect(PANEL).toContain('<fieldset data-testid="trade-protect-fieldset" disabled={!!scene}');
    const live = PANEL.slice(PANEL.indexOf('data-testid="trade-live-fieldset"'), PANEL.indexOf("</fieldset>", PANEL.indexOf('data-testid="trade-live-fieldset"')));
    expect(live.match(/<TastytradeLiveOrder\b/g) ?? []).toHaveLength(1);
    const protect = PANEL.slice(PANEL.indexOf('data-testid="trade-protect-fieldset"'), PANEL.indexOf("</fieldset>", PANEL.indexOf('data-testid="trade-protect-fieldset"')));
    expect(protect.match(/<TastytradeLiveOrder\b/g) ?? []).toHaveLength(2);
    expect(PANEL).toContain("disabled={!contract || !entryFields || !action || busy || !!scene}");
    expect(PANEL).toContain("disabled={!!server.limits?.killSwitch || !!scene}");
    expect(PANEL).toContain("onClick={() => { if (!scene) void changeServerOrderLimits({ killSwitch: true }); }}");
  });
  it("the broker readback hook is switched off in the scene and pending-fill offers are not mounted", () => {
    expect(PANEL).toContain("const brokerRead = useBrokerChartLines({ enabled: owner && tradable && !scene,");
    expect(PANEL).toContain("{scene ? null : <PendingFillJournalOffers />}");
  });
});

describe("6 · one reason, at the controls, and a banner", () => {
  it("the reason comes from railSendGate and reaches the book gate, the live block, the protect block and the dry run", () => {
    expect(PANEL).toContain('const sceneGate = scene ? railSendGate("PROOF_SCENE", "tastytrade") : null;');
    expect(PANEL).toContain("proofRefusal: sceneGate?.reason ?? null");
    expect(PANEL).toContain('data-testid="trade-proof-refusal"');
    expect(PANEL.match(/sceneGate\.reason/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(PANEL).not.toMatch(/"PROOF SCENE · nothing can be sent"/);      // never a second copy of the words
    expect(PANEL).toContain('data-testid="trade-proof-banner"');
    expect(code("lib/execution/ticketBook.ts").match(/gate\.proofRefusal/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });
});
