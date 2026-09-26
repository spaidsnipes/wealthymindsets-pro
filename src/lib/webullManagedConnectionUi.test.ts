import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");

describe("Webull managed connection UI", () => {
  it("uses WM Pro's authenticated server receipt instead of a website login as the connection", () => {
    expect(panel).toContain('endpoint:"/api/broker/webull/status"');
    // Pinned as an exact self-closing tag, which froze the component's ENTIRE
    // prop list into an unrelated test. What this line is for is that the
    // managed receipt — not a website login — is what the card renders, so
    // assert the broker is handed to it and let its props evolve.
    expect(panel).toMatch(/<ManagedConnectionStatus\s+broker=\{broker\}/);
    expect(panel).toContain("Signing into Webull&apos;s website is separate and does not connect this app.");
  });

  it("only renders connected from the provider-backed receipt", () => {
    expect(panel).toContain("const connected = receipt?.connected === true");
    expect(panel).toContain("Webull account wire connected");
    expect(panel).toContain("receipt.accountCount");
    expect(panel).toContain("receipt.accountTypes");
  });

  it("keeps Connect OAuth configuration distinct from a signed account wire", () => {
    expect(panel).toContain("Connect OAuth ·");
    expect(panel).toContain("callback not implemented");
    expect(panel).toContain("receipt.connectOAuth.missing.map");
  });

  /**
   * This test previously PINNED the defect. It required the panel to contain
   * "create the reusable token, approve it in the Webull app, store it
   * server-side" — the exact instruction that ran the Founder in a circle for
   * three months, because the value it asks for expires on its own. A test
   * that requires the wrong advice makes the wrong advice un-removable, so the
   * guard is inverted: the panel must distinguish the two states, and must
   * never send anyone to fetch a credential.
   */
  it("separates 'tap approve' from 'identity rejected' — they have opposite next actions", () => {
    expect(panel).toContain('receipt.state === "AWAITING_2FA"');
    // Webull's docs (Token): a code TYPED into the app — not a tap.
    expect(panel).toContain("Waiting on an SMS code in the Webull app");
    expect(panel).toContain("there is no value for you to copy anywhere");

    expect(panel).toContain('receipt.state === "BLOCKED_AUTH"');
    // A 401 on the ACCOUNT lane must never be narrated as an entitlement fact.
    expect(panel).toContain("says nothing about your data package or subscription");
  });

  it("never sends the Founder to obtain, paste, or store a Webull session by hand", () => {
    // Targets the INSTRUCTION, not the vocabulary: the panel is still allowed
    // to NAME a variable (the missing-secret chips do, legitimately, for the
    // App Key pair). What it may not do is tell a human to carry a session.
    expect(panel).not.toMatch(/store it server-side/i);
    expect(panel).not.toMatch(/create the reusable token/i);
    expect(panel).not.toMatch(/(paste|copy|enter|supply)[^.<>{}]{0,40}\baccess token\b/i);
    expect(panel).not.toContain("WEBULL_ACCESS_TOKEN");
  });

  it("names the exact runtime so local and hosted receipts cannot impersonate each other", () => {
    expect(panel).toContain("setReceiptOrigin(window.location.origin)");
    expect(panel).toContain("data-provider-receipt-origin={receiptOrigin}");
    expect(panel).toContain("Local and hosted receipts must each pass; one never proves the other.");
  });

  it("does not ask the browser to transmit Webull credentials", () => {
    const managedSection = panel.slice(panel.indexOf("function ManagedConnectionStatus"), panel.indexOf("/* ── Broker Card"));
    expect(managedSection).toContain('fetch(managed.endpoint, { cache: "no-store", signal: controller.signal })');
    expect(managedSection).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
    expect(managedSection).not.toContain("body: JSON.stringify");
    expect(managedSection).not.toContain('type="password"');
  });

  it("runs both market-data signing contracts explicitly without hidden fallback or order access", () => {
    expect(panel).toContain("WEBULL_SIGNING_PROFILES.map(readProfile)");
    // The ticker is now read from WIRE_PROOF_SYMBOL so the probe and the copy
    // that describes it cannot disagree. Intent unchanged: both profiles are
    // probed explicitly, read-only, with no hidden fallback.
    expect(panel).toContain("/api/market-data/webull/ticks?symbol=${WIRE_PROOF_SYMBOL}&profile=${profile}");
    expect(panel).toContain("Two independent read-only {WIRE_PROOF_SYMBOL} snapshots");
    expect(panel).toContain("No automatic fallback, account access, or order action.");
    expect(panel).not.toContain("profile=auto");

    const canarySection = panel.slice(panel.indexOf("function WebullSigningCanary"), panel.indexOf("function ManagedConnectionStatus"));
    expect(canarySection).not.toMatch(/\/api\/(?:broker|orders?)\/[^`\"']*(?:submit|place|cancel)/i);
    expect(canarySection).not.toContain("WEBULL_APP_SECRET");
    expect(canarySection).not.toContain("WEBULL_ACCESS_TOKEN");
  });
});
