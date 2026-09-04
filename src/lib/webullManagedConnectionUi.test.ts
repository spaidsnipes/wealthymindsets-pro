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

  it("does not ask the browser to transmit Webull credentials", () => {
    const managedSection = panel.slice(panel.indexOf("function ManagedConnectionStatus"), panel.indexOf("/* ── Broker Card"));
    expect(managedSection).toContain('fetch(managed.endpoint, { cache: "no-store", signal: controller.signal })');
    expect(managedSection).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
    expect(managedSection).not.toContain("body: JSON.stringify");
    expect(managedSection).not.toContain('type="password"');
  });
});
