/**
 * No jsdom in this repo, and adding a dependency to test three functions would
 * be a poor trade. `document` here needs to be an event bus and `window` needs
 * to be a URL that remembers — Node has both shapes natively (EventTarget,
 * URL), so the stubs below are real implementations of the two capabilities
 * the module actually uses, not mocks that agree with whatever it does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  announceEquipmentStage,
  readJourneyFromUrl,
  reflectJourneyInUrl,
  requestEquipment,
  subscribeEquipment,
  subscribeEquipmentStage,
} from "./equipmentChannel";

const g = globalThis as unknown as { document?: unknown; window?: unknown };
const originalDocument = g.document;
const originalWindow = g.window;

const pushState = vi.fn();
let replaceState: ReturnType<typeof vi.fn>;

function standAt(href: string) {
  const url = new URL(href, "https://wealthymindsetspro.com");
  replaceState = vi.fn((_state: unknown, _title: string, next: string) => {
    const updated = new URL(next, "https://wealthymindsetspro.com");
    url.pathname = updated.pathname;
    url.search = updated.search;
    url.hash = updated.hash;
  });
  g.window = {
    location: {
      get href() { return url.toString(); },
      get pathname() { return url.pathname; },
      get search() { return url.search; },
      get hash() { return url.hash; },
    },
    history: { state: null, pushState, replaceState },
  };
  return () => url.pathname + url.search;
}

beforeEach(() => {
  g.document = new EventTarget();
  pushState.mockClear();
});
afterEach(() => {
  g.document = originalDocument;
  g.window = originalWindow;
});

describe("equipmentChannel — the rail announces, the Room answers", () => {
  it("delivers the request to a subscriber", () => {
    const seen: string[] = [];
    const off = subscribeEquipment((r) => seen.push(r.equipmentId));
    requestEquipment("market-reality");
    off();
    expect(seen).toEqual(["market-reality"]);
  });

  it("unsubscribes — a listener per remount is a leak", () => {
    const handler = vi.fn();
    subscribeEquipment(handler)();
    requestEquipment("market-reality");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores a malformed event rather than opening undefined equipment", () => {
    const handler = vi.fn();
    const off = subscribeEquipment(handler);
    (g.document as EventTarget).dispatchEvent(
      new CustomEvent("wm:equipment", { detail: { equipmentId: 7 } }),
    );
    (g.document as EventTarget).dispatchEvent(new CustomEvent("wm:equipment"));
    off();
    expect(handler).not.toHaveBeenCalled();
  });

  it("is inert without a document — the frame renders on the server too", () => {
    g.document = undefined;
    expect(() => requestEquipment("market-reality")).not.toThrow();
    expect(() => subscribeEquipment(() => {})()).not.toThrow();
  });

  // ── A HAND CAN PUT THINGS DOWN ────────────────────────────────────────────
  // MEASURED 2026-09-19 on live /charts, one deploy after the rail started
  // reporting `aria-pressed` honestly for direct instruments. Press Replay →
  // `pressed="true"`. Press it again → still `"true"`, panel still up. The
  // channel had one verb, so the rail could not offer a reversal — and
  // `aria-pressed` is a contract that promises exactly that reversal. The
  // accurate badge had made the button a liar.

  it("carries a put-down, so a pressed control can be un-pressed", () => {
    const seen: string[] = [];
    const off = subscribeEquipment((r) => seen.push(`${r.equipmentId}:${r.intent}`));
    requestEquipment("market-reality", "put-down");
    off();
    expect(seen).toEqual(["market-reality:put-down"]);
  });

  it("defaults to pick-up, so every existing call site keeps its present meaning", () => {
    // The fix must not silently re-interpret the dozens of one-argument calls
    // that already exist. Omission means what it has always meant.
    const seen: string[] = [];
    const off = subscribeEquipment((r) => seen.push(r.intent));
    requestEquipment("market-reality");
    off();
    expect(seen).toEqual(["pick-up"]);
  });

  it("normalises a foreign or stale event to pick-up at the door", () => {
    // This is a DOM CustomEvent: anything on the page can dispatch one, and an
    // older bundle mid-deploy will dispatch one with no intent at all. If the
    // subscriber passed that through, a consumer reading `intent !== "pick-up"`
    // would treat a PICK-UP as a PUT-DOWN and close the thing being opened.
    const seen: string[] = [];
    const off = subscribeEquipment((r) => seen.push(r.intent));
    (g.document as EventTarget).dispatchEvent(
      new CustomEvent("wm:equipment", { detail: { equipmentId: "market-reality" } }),
    );
    (g.document as EventTarget).dispatchEvent(
      new CustomEvent("wm:equipment", { detail: { equipmentId: "market-reality", intent: "nonsense" } }),
    );
    off();
    expect(seen, "an absent or unrecognised intent must fall back to pick-up, never put-down")
      .toEqual(["pick-up", "pick-up"]);
  });
});

describe("announceEquipmentStage — the Room answers BACK, so the rail can show what is held", () => {
  it("delivers the stage to a subscriber", () => {
    const seen: Array<[string | null, string]> = [];
    const off = subscribeEquipmentStage((a) => seen.push([a.equipmentId, a.stage]));
    announceEquipmentStage("market-reality", "drawer");
    off();
    expect(seen).toEqual([["market-reality", "drawer"]]);
  });

  it("announces the CLOSE — an open mark with no way to turn off is permanent", () => {
    // The failure this rules out: the rail lights the Workspace entry when the
    // drawer opens and nothing ever tells it the trader closed it, so the room
    // claims equipment is open over an empty chart. `null` + `closed` has to be
    // a real message, not the absence of one.
    const seen: Array<[string | null, string]> = [];
    const off = subscribeEquipmentStage((a) => seen.push([a.equipmentId, a.stage]));
    announceEquipmentStage("market-reality", "preview");
    announceEquipmentStage(null, "closed");
    off();
    expect(seen).toEqual([
      ["market-reality", "preview"],
      [null, "closed"],
    ]);
  });

  it("stops delivering after unsubscribe — a listener per remount is a leak", () => {
    const seen: string[] = [];
    const off = subscribeEquipmentStage((a) => seen.push(a.stage));
    off();
    announceEquipmentStage("market-reality", "full");
    expect(seen).toEqual([]);
  });

  it("does NOT cross the request channel — the two directions are separate", () => {
    // If one event carried both, a rail announcing a pickup would also mark
    // itself open before the room had agreed to open anything, and a room
    // reporting `closed` would read as a request to pick equipment up.
    const requests: string[] = [];
    const stages: string[] = [];
    const offReq = subscribeEquipment((r) => requests.push(r.equipmentId));
    const offStage = subscribeEquipmentStage((a) => stages.push(a.stage));
    requestEquipment("market-reality");
    announceEquipmentStage("market-reality", "drawer");
    offReq();
    offStage();
    expect(requests).toEqual(["market-reality"]);
    expect(stages).toEqual(["drawer"]);
  });

  it("is SSR-safe — no document, no throw", () => {
    g.document = undefined;
    expect(() => announceEquipmentStage("market-reality", "drawer")).not.toThrow();
    expect(subscribeEquipmentStage(() => {})).toBeTypeOf("function");
    expect(() => subscribeEquipmentStage(() => {})()).not.toThrow();
  });
});

describe("reflectJourneyInUrl — honest address bar, no navigation", () => {
  it("writes the stage and equipment onto the SAME route", () => {
    const now = standAt("/command-deck");
    reflectJourneyInUrl("market-reality", "drawer");
    // The pathname is untouched: the trader is still in the market room. A
    // journey that changed the route would be one-route-per-invention again.
    expect(now()).toBe("/command-deck?equip=market-reality&stage=drawer");
  });

  it("clears both keys when the equipment is put away", () => {
    const now = standAt("/command-deck?equip=market-reality&stage=full");
    reflectJourneyInUrl(null, "closed");
    expect(now()).toBe("/command-deck");
  });

  it("clears on stage `closed` even if an id is still in hand", () => {
    const now = standAt("/command-deck?equip=market-reality&stage=preview");
    reflectJourneyInUrl("market-reality", "closed");
    expect(now()).toBe("/command-deck");
  });

  it("preserves unrelated query the room was opened with", () => {
    const now = standAt("/command-deck?symbol=NQ");
    reflectJourneyInUrl("market-reality", "preview");
    expect(now()).toContain("symbol=NQ");
    reflectJourneyInUrl(null, "closed");
    expect(now()).toBe("/command-deck?symbol=NQ");
  });

  it("does not push history — Back means the previous ROOM, not the previous stage", () => {
    standAt("/command-deck");
    reflectJourneyInUrl("market-reality", "preview");
    reflectJourneyInUrl("market-reality", "drawer");
    reflectJourneyInUrl("market-reality", "full");
    expect(pushState, "a stage-per-entry stack makes Back mean four presses").not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledTimes(3);
  });

  it("writes nothing when the URL already says it", () => {
    standAt("/command-deck?equip=market-reality&stage=preview");
    reflectJourneyInUrl("market-reality", "preview");
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe("readJourneyFromUrl — a shared link opens where it says", () => {
  it("reads equipment and stage", () => {
    expect(readJourneyFromUrl("?equip=market-reality&stage=drawer")).toEqual({
      equipmentId: "market-reality",
      stage: "drawer",
    });
  });

  it("defaults to preview for an unknown or absent stage", () => {
    expect(readJourneyFromUrl("?equip=market-reality").stage).toBe("preview");
    expect(readJourneyFromUrl("?equip=market-reality&stage=nonsense").stage).toBe("preview");
  });

  it("will NOT cold-open the full experience", () => {
    // RETURN promises "the room you left". A tab that opened straight into
    // full depth has no such room, so the promise would be unkeepable — the
    // link lands on the widget beside the chart instead.
    expect(readJourneyFromUrl("?equip=market-reality&stage=full").stage).toBe("preview");
  });

  it("no equip means closed, whatever the stage says", () => {
    expect(readJourneyFromUrl("?stage=drawer")).toEqual({ equipmentId: null, stage: "closed" });
    expect(readJourneyFromUrl("")).toEqual({ equipmentId: null, stage: "closed" });
  });
});
