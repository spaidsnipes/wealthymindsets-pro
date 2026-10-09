/**
 * OPERATOR DETAILS (2026-10-09): env-var names and the ladder's internal codes
 * are the operator's. The first glass of the Connect drawer says the verdict in
 * trader words; the names and codes render ONLY for the broker owner, inside a
 * collapsed "Operator details" disclosure. A MEMBER render never contains them
 * — proved here against a worst-case payload carrying every one.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/readiness", useSearchParams: () => new URLSearchParams() }));

import { CAPABILITY_STAGES, selectFirstBrokenJoint, type StageEvidenceMap } from "@/lib/broker/selectFirstBrokenJoint";
import { OPERATOR_VOCABULARY, STAGE_TRADER_WORDS, capabilityLadderWords } from "@/lib/broker/capabilityLadderWords";
import { CapabilityLadderView, ManagedOperatorDetails, type ManagedConnectionReceipt } from "./BrokerConnectPanel";

/** Worst case: every env-var name and code the server could hand the panel. */
const WORST_RECEIPT = {
  connected: false, state: "UNCONFIGURED", accountCount: 0, accountTypes: [], note: "n/a", authMode: "SIGNED_OPENAPI",
  missing: ["WEBULL_APP_KEY", "WEBULL_APP_SECRET"],
  credentialPresence: { appKey: false, appSecret: false, accessToken: false },
  connectOAuth: { state: "NOT_CONFIGURED", missing: ["WEBULL_CONNECT_CLIENT_ID", "WEBULL_CONNECT_CLIENT_SECRET"], note: "Webull Connect OAuth is not configured." },
} as unknown as ManagedConnectionReceipt;

const broken: StageEvidenceMap = { CONFIGURED: { state: "PASS" }, DEPLOYED_SECRET_PRESENT: { state: "FAIL", note: "MOOMOO_BRIDGE_URL / MOOMOO_BRIDGE_TOKEN are not set (see services/moomoo-bridge/README.md)" } };
const unmeasured: StageEvidenceMap = { CONFIGURED: { state: "PASS" }, DEPLOYED_SECRET_PRESENT: { state: "PASS" }, AUTHENTICATED: { state: "PASS" } };
const allPass = Object.fromEntries(CAPABILITY_STAGES.map(s => [s, { state: "PASS" as const }])) as StageEvidenceMap;

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
/** Everything outside the Operator details element. */
const firstGlass = (markup: string) => markup.replace(/<details data-testid="operator-details"[\s\S]*?<\/details>/g, "");
const STAGE_CODES = new RegExp(`\\b(${CAPABILITY_STAGES.filter(s => s.includes("_")).join("|")})\\b`);

describe("a MEMBER render never contains operator vocabulary", () => {
  it("the ladder: trader words only — no stage code, no env-var name, no repo path, no disclosure", () => {
    for (const ev of [broken, unmeasured, allPass]) {
      const m = html(<CapabilityLadderView verdict={selectFirstBrokenJoint(ev)} operator={false} />);
      expect(m).toContain('data-testid="capability-ladder-words"');
      expect(m).not.toContain("operator-details");
      expect(m).not.toMatch(OPERATOR_VOCABULARY);
      expect(m).not.toMatch(STAGE_CODES);
      expect(m).not.toMatch(/MOOMOO|README|First broken joint|rung/);
    }
  });
  it("the managed card's operator block renders nothing at all for a member, whatever the payload holds", () => {
    expect(html(<ManagedOperatorDetails receipt={WORST_RECEIPT} connected={false} operator={false} />)).toBe("");
  });
});

describe("the OWNER: names and codes only inside the collapsed disclosure; the first glass stays in trader words", () => {
  it("ladder", () => {
    const m = html(<CapabilityLadderView verdict={selectFirstBrokenJoint(broken)} operator />);
    expect(m).toMatch(/<details data-testid="operator-details"[^>]*>\s*<summary[^>]*>Operator details<\/summary>/);
    expect(m).not.toMatch(/<details[^>]*\bopen\b/); // collapsed by default
    expect(m).toContain("DEPLOYED_SECRET_PRESENT"); // the operator still gets the rung …
    expect(m).toContain("MOOMOO_BRIDGE_URL");       // … and what the provider said
    const glass = firstGlass(m);
    expect(glass).not.toMatch(OPERATOR_VOCABULARY);
    expect(glass).not.toMatch(STAGE_CODES);
    expect(glass).toContain("This connection is not working yet");
    expect(glass.replace(/&#x27;/g, "'")).toContain(`being ${STAGE_TRADER_WORDS.DEPLOYED_SECRET_PRESENT}`);
  });
  it("managed card", () => {
    const m = html(<ManagedOperatorDetails receipt={WORST_RECEIPT} connected={false} operator />);
    expect(m.startsWith("<details data-testid=\"operator-details\"")).toBe(true);
    expect(m).not.toMatch(/<details[^>]*\bopen\b/);
    for (const name of ["WEBULL_CONNECT_CLIENT_ID", "WEBULL_CONNECT_CLIENT_SECRET", "WEBULL_APP_KEY", "Missing host secret", "Runtime receipt"]) expect(m).toContain(name);
    expect(firstGlass(m)).toBe("");
  });
});

describe("the words owner says the verdict and nothing more", () => {
  it("three verdicts, three plain sentences; every rung has a phrase; none carries a code", () => {
    expect(capabilityLadderWords(selectFirstBrokenJoint(allPass))).toMatchObject({ tone: "PROVEN", headline: "This connection is proven end to end" });
    const u = capabilityLadderWords(selectFirstBrokenJoint(unmeasured));
    expect(u.tone).toBe("UNMEASURED");
    expect(u.detail).toBe("So far it is signed in to the provider. Not yet checked: whether it is permitted by the account. That is a missing check, not a fault.");
    const b = capabilityLadderWords(selectFirstBrokenJoint(broken));
    expect(b.detail).toBe("So far it is built into WM Pro. The step that did not pass: being set up on WM Pro's server. Nothing after it can be relied on until it does.");
    for (const s of CAPABILITY_STAGES) expect(STAGE_TRADER_WORDS[s]).not.toMatch(OPERATOR_VOCABULARY);
  });
});

describe("wiring in the drawer", () => {
  const panel = readFileSync(path.join(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");
  it("both operator surfaces get the audience from the server-answered owner view, and the first glass no longer prints the engineering headline", () => {
    expect(panel.length).toBeGreaterThan(10_000);
    expect(panel).toContain("<ManagedConnectionStatus broker={broker} onObservation={onObservation} operator={ownerView} />");
    expect(panel).toContain("<CapabilityLadderStatus broker={broker} operator={ownerView} />");
    expect(panel).toContain("<ManagedOperatorDetails receipt={receipt} connected={connected} operator={operator} />");
    // The codes appear in JSX only inside the two disclosure components.
    const outside = panel.replace(/export function CapabilityLadderView[\s\S]*?\n}\n/, "").replace(/export function ManagedOperatorDetails[\s\S]*?\n}\n/, "");
    expect(outside).not.toContain("{verdict.headline}");
    expect(outside).not.toContain("receipt.connectOAuth.missing.map");
    expect(outside).not.toContain("Missing host secret");
  });
  it("the strip's 'View details →' link keeps its 44px touch slop", () => {
    const strip = readFileSync(path.join(process.cwd(), "src/components/marketData/ProviderWireStrip.tsx"), "utf8");
    expect(strip).toMatch(/<Link href="\/readiness" className="wm-tap-slop"[^>]*>\{compact \? "View details →"/);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\(pointer: coarse\) \{\s*\.wm-tap-slop:not\(\.absolute\):not\(\.fixed\) \{ position: relative; \}\s*\.wm-tap-slop::after \{[\s\S]{0,200}width: max\(100%, 44px\);\s*height: max\(100%, 44px\);/);
  });
});
