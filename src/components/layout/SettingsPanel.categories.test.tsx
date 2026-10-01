import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock("@/components/layout/ShellModalDrawer", () => ({ ShellModalDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
vi.mock("@/components/settings/ChartStyleSettingsTab", () => ({ ChartStyleSettingsTab: () => null }));
vi.mock("@/components/settings/ExecutionGuardrailsTab", () => ({ ExecutionGuardrailsTab: () => null }));
vi.mock("@/components/os/SavedLayoutsDoor", () => ({ SavedLayoutsDoor: () => null }));
import { SettingsPanel } from "./shellPanels";
describe("Settings category navigation", () => {
  it("makes every Garden18 settings family reachable with one selected accessible tab", () => {
    const html = renderToStaticMarkup(<SettingsPanel onClose={() => {}} fallbackTriggerRef={{ current: null }} />);
    for (const name of ["Appearance", "Chart", "My Views", "Market Intelligence", "Execution", "Watchlist", "Connections", "Accessibility", "Account / Privacy"]) expect(html).toContain(name);
    expect((html.match(/role="tab"/g) ?? []).length).toBe(9);
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-controls="wm-settings-panel-accessibility"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("Save Settings");
    expect(html).toContain("Sign Out");
  });
});
