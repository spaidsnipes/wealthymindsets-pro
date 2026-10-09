/**
 * The prop evaluation desk is OWNER-ONLY (Founder order §7): nothing is rendered or named for a
 * member or a guest; the desk opens empty; it writes on this device only and never in a proof scene.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ audience: "GUEST" as "OWNER" | "GUEST" | null, user: { id: "u-1" } as { id: string } | null }));
vi.mock("@/lib/broker/useBrokerAudience", () => ({ useBrokerAudience: () => state.audience }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock("next/dynamic", () => ({ default: () => function Lazy(props: { storageKey: string | null; sample?: boolean }) { return <div data-testid="lazy-desk" data-key={props.storageKey ?? "none"} data-sample={props.sample ? "yes" : "no"} />; } }));

import { PropEvaluationDesk, PROP_SAMPLE_BANNER } from "./PropEvaluationDesk";
import { PROP_EVALUATION_BASE_KEY, PropEvaluationGate } from "./PropEvaluationGate";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
beforeEach(() => { state.audience = "GUEST"; state.user = { id: "u-1" }; });

describe("the gate — owner only, silent otherwise", () => {
  it.each([["GUEST", { id: "u-1" }], [null, { id: "u-1" }], ["OWNER", null], ["GUEST", null]] as const)("audience %s / user %j → renders NOTHING (no heading, no name, no placeholder)", (audience, user) => {
    state.audience = audience; state.user = user;
    expect(renderToStaticMarkup(<PropEvaluationGate />)).toBe("");
    expect(renderToStaticMarkup(<PropEvaluationGate sample />)).toBe("");
  });
  it("OWNER → the desk, under a key scoped to that owner's id", () => {
    state.audience = "OWNER";
    const html = renderToStaticMarkup(<PropEvaluationGate />);
    expect(html).toContain('data-testid="lazy-desk"');
    expect(html).toContain(`data-key="${PROP_EVALUATION_BASE_KEY}:u-1"`);
    expect(renderToStaticMarkup(<PropEvaluationGate sample />)).toContain('data-key="none"');
  });
  it("source: the audience is the server's answer, the desk is a lazy chunk, and the Journal mounts ONLY the gate", () => {
    const gate = read("components/journal/PropEvaluationGate.tsx");
    expect(gate).toContain('if (audience !== "OWNER" || !user?.id) return null;');
    expect(gate).toContain('dynamic(() => import("@/components/journal/PropEvaluationDesk")');
    expect(gate).toContain("useBrokerAudience()");
    const page = read("app/journal/page.tsx");
    expect(page).toContain('{mainTab === "ledger" && <PropEvaluationGate />}');
    expect(page).not.toContain("PropEvaluationDesk");
    // No visible word about the desk on the page itself — a member's Journal never names it.
    expect(page.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/g, "")).not.toMatch(/prop evaluation|Prop Evaluation|PROP EVALUATION/);
  });
});

describe("the desk — opens empty, says where it is kept, keeps truth and scenarios apart", () => {
  it("with nothing stored it shows no figure at all, wears UNVERIFIED, and says it is kept on this device only", () => {
    const html = renderToStaticMarkup(<PropEvaluationDesk storageKey="k" />);
    expect(html).toContain("Kept on this device only. It is cleared when you sign out.");
    expect(html).toContain('data-testid="prop-unverified"');
    expect(html).toContain("UNVERIFIED");
    expect(html).not.toMatch(/\$\d/);                               // not one dollar figure on an empty desk
    expect(html).toContain("Read back from the firm&#x27;s dashboard");
    expect(html).toContain('data-testid="prop-account"');
    expect(html).toContain('data-testid="prop-scenario"');
    expect(html).toContain("ILLUSTRATIVE ARITHMETIC — NOT A TARGET");
    expect(html).toContain("Cannot say — the rules are UNVERIFIED.");
  });
  it("sample mode: synthetic numbers under a banner, no stamp button, the rule arithmetic on glass", () => {
    const html = renderToStaticMarkup(<PropEvaluationDesk storageKey={null} sample />);
    expect(PROP_SAMPLE_BANNER).toMatch(/^SAMPLE ACCOUNT — synthetic numbers/);
    expect(html).toContain("SAMPLE ACCOUNT — synthetic numbers");
    expect(html).not.toContain('data-testid="prop-stamp"');
    expect(html).toContain("$3,333.34");                            // required: largest $1,000 ÷ 0.30, rounded up
    expect(html).toMatch(/data-testid="prop-verdict"[^>]*>Cannot say — the rules are UNVERIFIED\./);
  });
  it("source: no figure, no account number, no promise; storage only on this device, never in a proof scene", () => {
    const desk = read("components/journal/PropEvaluationDesk.tsx");
    const code = desk.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).toContain("if (sample || !loaded || !storageKey || proofSceneHoldsWrites()) return;");
    expect(code).not.toMatch(/fetch\(|sendBeacon|XMLHttpRequest|sessionStorage/);
    expect(code.match(/localStorage\.setItem\(/g)).toHaveLength(1);
    // The only mention of an account number is the label telling the trader NOT to type one.
    expect(code.replace("not an account number", "")).not.toMatch(/account number|account id|password|credential/i);
    expect(desk).not.toMatch(/you will pass|guarantee|you need to make|make \$?[\d,]+ today|should make|must make|daily goal|daily target/i);
    // The only money literals are the labelled sample rows.
    expect(code.match(/\b\d{1,3}(_\d{3})+\b/g) ?? []).toEqual(["100_000", "30_000", "100_000", "63_334"]);
  });
});
