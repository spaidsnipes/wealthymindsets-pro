import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], effect: null as null | (() => (() => void)), index: 0 }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
    }];
  },
  useEffect: (effect: () => (() => void)) => { hooks.effect = effect; },
}));
import ProviderWireStrip from "./ProviderWireStrip";

afterEach(() => { vi.unstubAllGlobals(); hooks.values = []; hooks.index = 0; hooks.effect = null; });

describe("provider refresh lifecycle", () => {
  it("discards a pre-background batch and rechecks on foreground without overlap", async () => {
    let visibilityChanged = () => {};
    const documentStub = { visibilityState: "visible", addEventListener: (_: string, fn: () => void) => { visibilityChanged = fn; }, removeEventListener: vi.fn() };
    vi.stubGlobal("document", documentStub);
    vi.stubGlobal("window", { setInterval: vi.fn(), clearInterval: vi.fn() });
    const pending: Array<(response: unknown) => void> = [];
    const fetchMock = vi.fn(() => new Promise(resolve => pending.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);
    ProviderWireStrip({});
    const cleanup = hooks.effect!();
    documentStub.visibilityState = "hidden";
    visibilityChanged();
    documentStub.visibilityState = "visible";
    visibilityChanged();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const body = { label: "RECEIVING", receiving: true, eventCount: 4 };
    const response = { ok: true, status: 200, json: async () => body };
    pending.splice(0).forEach(resolve => resolve(response));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, 4)).toEqual([null, null, null, null]);
    expect(fetchMock).toHaveBeenCalledTimes(8);
    pending.splice(0).forEach(resolve => resolve(response));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, 4)).toEqual([body, body, body, body]);
    documentStub.visibilityState = "hidden";
    visibilityChanged();
    expect(hooks.values.slice(0, 4)).toEqual([null, null, null, null]);
    cleanup();
  });

  it("invalidates successful receipts after failure, then accepts recovery without overlapping probes", async () => {
    let refresh: () => Promise<void> = async () => {};
    vi.stubGlobal("window", { setInterval: (fn: typeof refresh) => { refresh = fn; return 1; }, clearInterval: vi.fn() });
    vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() });
    let fail = false;
    const body = { label: "RECEIVING", receiving: true, eventCount: 4 };
    const fetchMock = vi.fn(async () => {
      if (fail) throw new Error("network unavailable");
      return { ok: true, status: 200, json: async () => body };
    });
    vi.stubGlobal("fetch", fetchMock);
    ProviderWireStrip({});
    const cleanup = hooks.effect!();
    await refresh(); // Initial batch is already in flight; no duplicate calls.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, 4)).toEqual([body, body, body, body]);
    fail = true;
    await refresh();
    expect(hooks.values.slice(0, 4)).toEqual([null, null, null, null]);
    expect(hooks.values[4]).toEqual(new Set(["market", "readiness", "moomoo", "longbridge"]));
    fail = false;
    await refresh();
    expect(hooks.values.slice(0, 4)).toEqual([body, body, body, body]);
    expect(hooks.values[4]).toEqual(new Set());
    cleanup();
    await refresh();
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });
});
