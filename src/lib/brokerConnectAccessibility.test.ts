import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
const panel = source("../components/broker/BrokerConnectPanel.tsx");
const toolbar = source("../components/chart/ChartToolbar.tsx");
const dashboard = source("../components/chart/ChartsDashboard.tsx");
const readiness = source("../app/readiness/page.tsx");
const layout = source("../components/layout/MainLayout.tsx");

describe("broker connection operating-system drawer", () => {
  it("uses the shared dialog owner for focus containment, Escape, and phone-width safety", () => {
    expect(panel).toContain('import { ShellModalDrawer }');
    expect(panel).toContain('id="wm-broker-connect"');
    expect(panel).toContain('titleId="wm-broker-connect-title"');
    expect(panel).toContain('descriptionId="wm-broker-connect-description"');
    expect(panel).toContain('closeLabel="Close connect brokers"');
    expect(panel).toContain("fallbackTriggerRef={fallbackTriggerRef}");
    expect(panel).not.toContain('className="fixed inset-0 z-[200] flex items-start justify-end"');
  });

  it("returns focus to the chart or readiness trigger that opened it", () => {
    expect(toolbar).toContain("ref={connectBrokersTriggerRef}");
    expect(toolbar).toContain('aria-haspopup="dialog"');
    expect(toolbar).toContain('aria-controls="wm-broker-connect"');
    expect(dashboard).toContain("const brokerTriggerRef = useRef<HTMLButtonElement>(null)");
    expect(dashboard).toContain("fallbackTriggerRef={brokerTriggerRef}");
    expect(readiness).toContain("const connectTriggerRef = useRef<HTMLButtonElement>(null)");
    expect(readiness).toContain("fallbackTriggerRef={connectTriggerRef}");
    expect(layout).not.toContain("<BrokerConnectPanel");
  });

  it("keeps the primary connection controls touch-safe and explicitly named", () => {
    expect(toolbar).toContain('className="flex min-h-11 items-center gap-1 px-3');
    expect(panel).toContain('aria-label="Search brokers"');
    expect(panel).toContain("min-h-11 rounded-lg px-1 py-2");
    expect(panel).toContain("aria-pressed={tab === t.id}");
    expect(panel).toContain("flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2");
    expect(panel.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(10);
  });
});
