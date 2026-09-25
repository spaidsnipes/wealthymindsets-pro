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
import ProviderWireStrip, { selectProviderWires } from "./ProviderWireStrip";
import { WIRE_PROOF_SYMBOL } from "@/lib/marketData/wireProofScope";

afterEach(() => { vi.unstubAllGlobals(); hooks.values = []; hooks.index = 0; hooks.effect = null; });

/**
 * The `useState` stub is POSITIONAL, so these tests are coupled to the order of
 * the hooks in the component. Naming the slots does not remove that coupling —
 * nothing can, short of a real renderer — but it makes the coupling visible and
 * turns a shift into one edit instead of a hunt through magic numbers.
 *
 * This mattered immediately: adding the webull tick receipt inserted a state
 * between the receipts and `failures`, and every bare index below silently
 * pointed one slot to the left. The failures read `expected Set{} to be true`,
 * which names the symptom and nothing else.
 */
// Slots 0…4: matrix, readiness, moomoo ticks, longbridge ticks, webull ticks.
const RECEIPT_COUNT = 5;
const FAILURES_INDEX = 5;
const SUSPENDED_INDEX = 6;
/**
 * Slot 7: the Webull BROKER-lane receipt (/api/broker/webull/status).
 *
 * UPDATED 2026-09-25 to the new truth, not loosened. The webull cell now says
 * both lanes ("BROKER CONNECTED · DATA NOT ENTITLED") because a single red
 * "Entitlement blocked" chip was hiding a connected account lane. That needs the
 * account-lane receipt, so the batch grew one request. The new slot was declared
 * AFTER `suspended` so every index above is unchanged, and it is held to the
 * same lifecycle as the other receipts below: invalidated with them, failed
 * under its own key, re-accepted on recovery.
 */
const WEBULL_BROKER_INDEX = 7;
/**
 * One request per receipt: capabilities, readiness, three tick routes — and,
 * since 2026-09-25, the Webull account-lane status. Was 5.
 */
const PROBES_PER_BATCH = 6;

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
    expect(fetchMock).toHaveBeenCalledTimes(PROBES_PER_BATCH);
    const body = { label: "RECEIVING", receiving: true, eventCount: 4 };
    const response = { ok: true, status: 200, json: async () => body };
    pending.splice(0).forEach(resolve => resolve(response));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(null));
    expect(hooks.values[WEBULL_BROKER_INDEX]).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(PROBES_PER_BATCH * 2);
    pending.splice(0).forEach(resolve => resolve(response));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(body));
    expect(hooks.values[WEBULL_BROKER_INDEX]).toEqual(body);
    documentStub.visibilityState = "hidden";
    visibilityChanged();
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(null));
    // A backgrounded tab must not keep a current-looking account-lane verdict.
    expect(hooks.values[WEBULL_BROKER_INDEX]).toBeNull();
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
    expect(fetchMock).toHaveBeenCalledTimes(PROBES_PER_BATCH);
    // The strip ASKS the account lane — it does not merely accept one.
    expect((fetchMock.mock.calls as unknown[][]).map((call) => String(call[0]))).toContain("/api/broker/webull/status");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(body));
    fail = true;
    await refresh();
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(null));
    expect(hooks.values[WEBULL_BROKER_INDEX]).toBeNull();
    // "webull-broker" is its OWN key (2026-09-25): an unanswered account probe
    // may never be read as a market-data verdict, nor the other way round.
    expect(hooks.values[FAILURES_INDEX]).toEqual(new Set(["market", "readiness", "moomoo", "longbridge", "webull", "webull-broker"]));
    fail = false;
    await refresh();
    expect(hooks.values.slice(0, RECEIPT_COUNT)).toEqual(Array(RECEIPT_COUNT).fill(body));
    expect(hooks.values[WEBULL_BROKER_INDEX]).toEqual(body);
    expect(hooks.values[FAILURES_INDEX]).toEqual(new Set());
    cleanup();
    await refresh();
    expect(fetchMock).toHaveBeenCalledTimes(PROBES_PER_BATCH * 3);
  });

  // OBSERVED at 375px on /command-deck: all five wires read "Checking —
  // Canonical capability receipt in progress." indefinitely, while a direct
  // fetch of the same capability endpoint from that page returned HTTP 200 in
  // 347ms. Nothing was in progress. The strip had declined to probe because
  // the document was hidden, and reported that refusal as work.
  it("says it PAUSED rather than claiming a probe that was never issued", async () => {
    let visibilityChanged = () => {};
    const documentStub = { visibilityState: "hidden", addEventListener: (_: string, fn: () => void) => { visibilityChanged = fn; }, removeEventListener: vi.fn() };
    vi.stubGlobal("document", documentStub);
    vi.stubGlobal("window", { setInterval: vi.fn(), clearInterval: vi.fn() });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ label: "RECEIVING", receiving: true, eventCount: 4 }) }));
    vi.stubGlobal("fetch", fetchMock);

    ProviderWireStrip({});
    const cleanup = hooks.effect!();
    // Mounting hidden must issue NO request and must RECORD that it did not.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hooks.values[SUSPENDED_INDEX]).toBe(true);

    // Returning to the foreground must resume real probing and drop the pause.
    documentStub.visibilityState = "visible";
    visibilityChanged();
    expect(fetchMock).toHaveBeenCalledTimes(PROBES_PER_BATCH);
    expect(hooks.values[SUSPENDED_INDEX]).toBe(false);
    cleanup();
  });
});

const NO_RECEIPTS = {
  matrix: null,
  readiness: null,
  moomooTicks: null,
  longbridgeTicks: null,
  webullTicks: null,
  failures: new Set<string>(),
} as const;

describe("provider wire claim precedence", () => {
  it("says it PAUSED rather than claiming a probe that was never issued", () => {
    const wires = selectProviderWires({ ...NO_RECEIPTS, suspended: true });
    expect(wires).toHaveLength(5);
    for (const wire of wires) {
      expect(wire.tone).toBe("SUSPENDED");
      expect(wire.label).toBe("Paused");
      // The pause must carry its own recovery, not just its own excuse.
      expect(wire.detail).toContain("Reopen it to re-probe the wire.");
      expect(wire.detail).not.toContain("in progress");
    }
  });

  it("still says CHECKING while a probe really is in flight", () => {
    // Same empty receipts — the ONLY difference is that work is happening.
    const wires = selectProviderWires({ ...NO_RECEIPTS, suspended: false });
    expect(wires.every((wire) => wire.tone === "CHECKING")).toBe(true);
    expect(wires[0].detail).toBe("Canonical capability receipt in progress.");
  });

  // A pause is the ABSENCE of a verdict. It must never overwrite one that was
  // actually earned, or backgrounding the tab would erase a real blocker.
  it("never lets a pause overwrite an observed failure verdict", () => {
    const wires = selectProviderWires({
      ...NO_RECEIPTS,
      failures: new Set(["market", "readiness", "moomoo", "longbridge", "webull"]),
      suspended: true,
    });
    expect(wires.some((wire) => wire.tone === "SUSPENDED")).toBe(false);
    expect(wires.every((wire) => wire.label === "Status unavailable")).toBe(true);
  });

  it("never lets a pause overwrite a receipt that was actually returned", () => {
    const wires = selectProviderWires({
      ...NO_RECEIPTS,
      moomooTicks: { label: "RECEIVING", detail: "", receiving: true, eventCount: 4 },
      suspended: true,
    });
    expect(wires.some((wire) => wire.tone === "SUSPENDED")).toBe(false);
    expect(wires.find((wire) => wire.source === "moomoo")?.label).toBe(`Ticks receiving (${WIRE_PROOF_SYMBOL})`);
  });
});
