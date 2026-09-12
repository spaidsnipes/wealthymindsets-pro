import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(process.cwd(), "src/components/broker/BrokerConnectPanel.tsx"), "utf8");

describe("Webull managed connection UI", () => {
  it("uses WM Pro's authenticated server receipt instead of a website login as the connection", () => {
    expect(panel).toContain('endpoint:"/api/broker/webull/status"');
    expect(panel).toContain("<ManagedConnectionStatus broker={broker} />");
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

  it("turns a tokenless 401 into an honest OpenAPI 2FA checkpoint", () => {
    expect(panel).toContain('receipt.state === "BLOCKED_AUTH"');
    expect(panel).toContain('!receipt.credentialPresence.accessToken');
    expect(panel).toContain("2FA checkpoint · token not set");
    expect(panel).toContain("Webull requires <code>WEBULL_ACCESS_TOKEN</code> only when OpenAPI 2FA is enabled");
    expect(panel).toContain("This HTTP 401 does not prove 2FA is the rejected edge.");
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
