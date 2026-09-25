/**
 * RENDER — the Workspace door's Saved layouts list, as the trader first sees it.
 *
 * `renderToStaticMarkup` runs no effects and has no DOM, so this answers what
 * the FIRST frame of the list contains for a given store and a given chart
 * reading: the empty state, the migrated My stack, the in-force light, the
 * accessible names, and the honest disabled state when no chart is answering.
 * The interactive half (Enter / Escape / focus) is pinned in source by
 * `savedLayoutsShareTheDeskDoor.sentinel.test.ts` and proven by the
 * orchestrator's click script on the live site.
 */
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { SavedLayoutsDoor } from "./SavedLayoutsDoor";
import { announceArrangementCapture } from "@/lib/workspace/equipmentChannel";
import { captureArrangement } from "@/lib/marketData/viewModels/selectChartArrangement";
import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { MY_STACK_STORAGE_KEY, captureMyStack } from "@/lib/marketData/viewModels/myProfileStack";
import { SAVED_LAYOUTS_STORAGE_KEY, serializeSavedLayouts } from "@/lib/workspace/savedLayouts";

const INK = { gold: "#c4a574", rule: "rgba(196,165,116,0.20)", pearl: "#ede6d3", muted: "#8a8271", hint: "#6f6857", warn: "#c05a4a" };

const capture = (active: Readonly<Partial<Record<ProfileId, boolean>>>) =>
  captureArrangement(selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active }));

function storage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const render = (seed: Record<string, string> = {}) =>
  renderToStaticMarkup(<SavedLayoutsDoor ink={INK} storage={storage(seed)} />);

afterEach(() => announceArrangementCapture(null));

describe("Saved layouts — first frame", () => {
  it("names itself, and says what to do when nothing is saved", () => {
    announceArrangementCapture(capture({ SESSION: true }));
    const html = render();
    expect(html).toContain('data-testid="saved-layouts"');
    expect(html).toContain(">Saved layouts<");
    expect(html).toContain('data-testid="saved-layouts-empty"');
    expect(html).toContain("None saved yet. Arrange the chart, then save it here by name.");
    // The one way in: a labelled button, enabled because a chart is answering.
    expect(html).toMatch(/<button[^>]*data-testid="saved-layouts-new"[^>]*aria-label="Save the chart&#x27;s current arrangement as a named layout"/);
    expect(html).not.toMatch(/data-testid="saved-layouts-new"[^>]*disabled/);
  });

  it("the legacy My stack slot appears as the first saved layout", () => {
    announceArrangementCapture(capture({}));
    const html = render({
      [MY_STACK_STORAGE_KEY]: JSON.stringify(captureMyStack({ LIVING_PROFILE: true, TPO_PROFILE: true })),
    });
    expect(html).not.toContain('data-testid="saved-layouts-empty"');
    expect(html).toContain('data-saved-layout="my-stack"');
    expect(html).toContain('aria-label="Apply layout My stack"');
    expect(html).toContain("2 readings on");
  });

  it("lists saved layouts with a labelled apply, rename and delete per row", () => {
    announceArrangementCapture(capture({}));
    const html = render({
      [SAVED_LAYOUTS_STORAGE_KEY]: serializeSavedLayouts([
        { id: "open", name: "Open drive", switches: { SESSION: true } },
        { id: "close", name: "Close", switches: { FIXED_RANGE: true, SESSION: true } },
      ]),
    });
    expect(html).toContain('<ul aria-label="Saved layouts"');
    for (const name of ["Open drive", "Close"]) {
      expect(html).toContain(`aria-label="Apply layout ${name}"`);
      expect(html).toContain(`aria-label="Rename layout ${name}"`);
      expect(html).toContain(`aria-label="Delete layout ${name}"`);
    }
    expect(html.indexOf("Open drive")).toBeLessThan(html.indexOf(">Close<"));
    expect(html).toContain("1 reading on");
    expect(html).toContain("2 readings on");
  });

  it("the layout the chart is arranged as LIGHTS — aria-current, told by the room's capture", () => {
    announceArrangementCapture(capture({ SESSION: true, FIXED_RANGE: true }));
    const html = render({
      [SAVED_LAYOUTS_STORAGE_KEY]: serializeSavedLayouts([
        { id: "open", name: "Open drive", switches: { SESSION: true } },
        { id: "both", name: "Both profiles", switches: capture({ SESSION: true, FIXED_RANGE: true }) },
      ]),
    });
    const both = html.slice(html.indexOf('data-saved-layout="both"'));
    expect(both).toContain('data-saved-layout-in-force="true"');
    // Same <button> carries the name and aria-current (and, since 2026-09-25,
    // aria-describedby pointing at its hint line) — attribute order not pinned.
    expect(both).toMatch(/<button[^>]*aria-label="Apply layout Both profiles"[^>]*aria-current="true"/);
    expect(both).toMatch(/<button[^>]*aria-label="Apply layout Both profiles"[^>]*aria-describedby="[^"]*-hint-/);
    expect(both).toContain("The chart is arranged this way now");
    // "Open drive" names SESSION only, which matches, so it is honestly in force too.
    const open = html.slice(html.indexOf('data-saved-layout="open"'), html.indexOf('data-saved-layout="both"'));
    expect(open).toContain('data-saved-layout-in-force="true"');
  });

  it("a layout that differs from the chart does NOT light", () => {
    announceArrangementCapture(capture({ SESSION: false }));
    const html = render({
      [SAVED_LAYOUTS_STORAGE_KEY]: serializeSavedLayouts([{ id: "open", name: "Open drive", switches: { SESSION: true } }]),
    });
    expect(html).not.toContain("data-saved-layout-in-force");
    expect(html).not.toContain('aria-current="true"');
  });

  it("with NO chart answering, Save and Apply are disabled rather than saving an empty desk", () => {
    announceArrangementCapture(null);
    const html = render({
      [SAVED_LAYOUTS_STORAGE_KEY]: serializeSavedLayouts([{ id: "open", name: "Open drive", switches: { SESSION: true } }]),
    });
    expect(html).toMatch(/data-testid="saved-layouts-new"[^>]*disabled=""/);
    expect(html).toMatch(/data-testid="saved-layout-apply"[^>]*disabled=""/);
    expect(html).toContain("The chart is not answering yet");
  });

  it("is equipment, not a destination: no link anywhere in it", () => {
    announceArrangementCapture(capture({}));
    const html = render({
      [SAVED_LAYOUTS_STORAGE_KEY]: serializeSavedLayouts([{ id: "open", name: "Open drive", switches: { SESSION: true } }]),
    });
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });
});
