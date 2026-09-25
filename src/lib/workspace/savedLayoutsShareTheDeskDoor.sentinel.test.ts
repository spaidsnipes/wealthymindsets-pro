/**
 * SENTINEL — A SAVED LAYOUT WALKS THROUGH THE SAME DOOR AS THE FOUR DESKS.
 *
 * ── WHAT THIS PROTECTS ─────────────────────────────────────────────────────
 *
 * F24 "Layout" (Garden 11): "WORKSPACE = arrangements of the same Market room:
 * Clean. Order Flow. Regime. Review. Approved saved layouts." and "Workspace
 * became a real second door driven from the canonical arrangement compiler
 * rather than local memory."
 *
 * The easy implementation of saved layouts is a second brain: a list component
 * that keeps its own idea of the switches and calls setters directly. It would
 * work on the first day and drift on the second — a lock that holds against a
 * desk but not against a layout, a layout that arms a drawing cursor a desk
 * never could, a light that says "in force" from memory after the trader
 * flipped a switch by hand. Each of those is a single-writer violation this
 * product has already paid for once.
 *
 * So this file pins, in comment-stripped source:
 *
 *   1. APPLY — the room's ONLY saved-layout handler hands the request to
 *      `arrangementDeskRef`, the door Clean / Order Flow / Regime / Review use,
 *      and that door leaves through ONE `applyRespectingLocks(` whose argument
 *      is the compiler's `arrangementSwitches` (desks) or
 *      `savedArrangementSwitches` (layouts). No other call site.
 *   2. CAPTURE — what a layout saves is the compiler's `captureArrangement`,
 *      published by the room and retracted when the room goes.
 *   3. THE DOOR — the list component never reaches a switch; it asks
 *      (`requestSavedLayout`), is told (`subscribeArrangementCapture`), and
 *      lights from the compiler's `savedArrangementInForce`.
 *   4. PLACEMENT — it is drawn in the WORKSPACE hand, right after the desks,
 *      and the old "My stack" slot left the Tools door for good.
 *   5. KEYBOARD — Enter saves / renames; Escape closes the one step it is in
 *      and stops, so the sheet stays up until a second Escape.
 *
 * Every regex is anchored by a NOT-VACUOUS length check on its source.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const read = (rel: string): string => stripComments(readFileSync(join(process.cwd(), rel), "utf8"));

const DASHBOARD = read("src/components/chart/ChartsDashboard.tsx");
const DOOR = read("src/components/os/SavedLayoutsDoor.tsx");
const OS = read("src/components/os/WMOperatingSystem.tsx");

describe("NOT VACUOUS", () => {
  it("the scanned sources are real", () => {
    expect(DASHBOARD.length).toBeGreaterThan(10000);
    expect(DOOR.length).toBeGreaterThan(2000);
    expect(OS.length).toBeGreaterThan(10000);
  });
});

describe("1 · APPLY — one desk door, five kinds of desk", () => {
  it("the room's saved-layout handler hands the request to arrangementDeskRef and nothing else", () => {
    const subs = DASHBOARD.match(/subscribeSavedLayoutRequests\(/g) ?? [];
    expect(subs, "exactly one room-side saved-layout subscription").toHaveLength(1);
    expect(DASHBOARD).toMatch(
      /subscribeSavedLayoutRequests\(\(req\) => arrangementDeskRef\.current\(req\)\)/,
    );
  });

  it("arrangementDeskRef leaves through ONE applyRespectingLocks over the compiler's two switch sets", () => {
    expect(DASHBOARD).toMatch(
      /arrangementDeskRef\.current = \(desk: ArrangementId \| SavedLayoutRequest\) =>\s*applyRespectingLocks\(\s*typeof desk === "string"\s*\?\s*arrangementSwitches\(desk, arrangementMenu\)\s*:\s*savedArrangementSwitches\(desk\.switches, arrangementMenu\),?\s*\);/,
    );
  });

  it("the compiler's saved-layout function has exactly that one call site in the room", () => {
    expect(DASHBOARD.match(/savedArrangementSwitches\(/g) ?? []).toHaveLength(1);
  });

  it("the lock is never bypassed: the raw setter bundle is reached only through applyRespectingLocks", () => {
    // `applyArrangementSwitches(` appears once — inside applyRespectingLocks.
    // A layout path that called it directly would override a locked lane.
    expect(DASHBOARD.match(/applyArrangementSwitches\(/g) ?? []).toHaveLength(1);
    expect(DASHBOARD).toMatch(
      /const applyRespectingLocks = \([^)]*\) =>\s*applyArrangementSwitches\(withoutLocked\(s, profileStackPrefs\)\);/,
    );
  });

  it("the four named desks still walk the same door (Clean + the three compositions)", () => {
    expect(DASHBOARD).toMatch(/arrangementDeskRef\.current\("CLEAN"\)/);
    expect(DASHBOARD).toMatch(/arrangementDeskRef\.current\(\s*req\.equipmentId === "arrange-order-flow"/);
  });
});

describe("2 · CAPTURE — the room tells the door what it is arranged as", () => {
  it("publishes the compiler's capture of the SAME menu the desks compile against", () => {
    expect(DASHBOARD).toMatch(/JSON\.stringify\(captureArrangement\(arrangementMenu\)\)/);
    expect(DASHBOARD).toMatch(/announceArrangementCapture\(JSON\.parse\(arrangementCaptureKey\)\)/);
  });

  it("retracts the capture when the room goes — an empty capture is NOT MEASURED, never all-off", () => {
    expect(DASHBOARD).toMatch(
      /announceEquipmentArrangement\(null\);\s*announceEquipmentShortfalls\(\[\]\);\s*announceArrangementCapture\(null\);/,
    );
  });
});

describe("3 · THE DOOR asks and is told; it never reaches a switch", () => {
  it("asks the room to arrange, with the layout's switch set", () => {
    expect(DOOR).toMatch(/requestSavedLayout\(\{ layoutId: layout\.id, switches: layout\.switches \}\)/);
  });

  it("is told the capture (first reading from the channel's memory, then subscribed)", () => {
    expect(DOOR).toMatch(/announcedArrangementCapture\(\)/);
    expect(DOOR).toMatch(/subscribeArrangementCapture\(setCapture\)/);
  });

  it("lights from the compiler's savedArrangementInForce — no private comparison", () => {
    expect(DOOR).toMatch(/savedArrangementInForce\(layout\.switches, capture\)/);
  });

  it("touches no chart state and no route", () => {
    expect(DOOR).not.toMatch(/applyArrangementSwitches|applyRespectingLocks|arrangementDeskRef|set[A-Z]\w*On\(/);
    expect(DOOR).not.toMatch(/href=|next\/link|router\.push|<a\s/);
  });

  it("saves through the list owner, never a hand-rolled localStorage key", () => {
    expect(DOOR).toMatch(/saveLayout\(layouts, draft, capture, newLayoutId\)/);
    expect(DOOR).toMatch(/storeSavedLayouts\(store, next\)/);
    expect(DOOR).not.toMatch(/localStorage\.setItem/);
  });
});

describe("4 · PLACEMENT — the Workspace hand, right after the desks; My stack left Tools", () => {
  it("the frame hands SavedLayoutsDoor to the WORKSPACE rail as its arrangement tail", () => {
    expect(OS).toMatch(
      /<RoomWorkspaceRail\s+activeHref=\{activeHref\}\s+kind="workspace"\s+presentation="tile"\s+arrangementTail=\{\s*<SavedLayoutsDoor/,
    );
    // …and ONLY there — never in the Tools hand.
    expect(OS.match(/<SavedLayoutsDoor\b/g) ?? []).toHaveLength(1);
    expect(OS).not.toMatch(/kind="lens"[^>]*arrangementTail/);
  });

  it("the tail is drawn after the LAST arrangement desk, and only in a room that has one", () => {
    expect(OS).toMatch(/const tailAfter = arrangementTail === undefined \? -1 : lastArrangementIndex\(equipment\);/);
    expect(OS).toMatch(/\{index === tailAfter \? arrangementTail : null\}/);
    expect(OS).toMatch(/new Set\(Object\.values\(ARRANGEMENT_EQUIPMENT_ID\)\)/);
  });

  it("the Tools door no longer carries a My stack slot", () => {
    expect(DASHBOARD).not.toMatch(/MyStackBar/);
    expect(existsSync(join(process.cwd(), "src/components/chart/MyStackBar.tsx"))).toBe(false);
  });

  it("nothing in src writes the legacy slot any more — it stays readable, never rewritten", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
          const src = stripComments(readFileSync(p, "utf8"));
          if (/setItem\(\s*(MY_STACK_STORAGE_KEY|LEGACY_MY_STACK_STORAGE_KEY|"wm_ofMyStack")/.test(src)) offenders.push(p);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});

describe("5 · KEYBOARD — Enter commits, Escape closes one step and stops", () => {
  it("Enter in the name input saves; Enter in a rename input renames", () => {
    expect(DOOR).toMatch(/if \(e\.key === "Enter"\) \{\s*e\.preventDefault\(\);\s*submitSave\(\);/);
    expect(DOOR).toMatch(/if \(e\.key === "Enter"\) \{\s*e\.preventDefault\(\);\s*submitRename\(layout\.id\);/);
  });

  it("Escape is swallowed by the step it closes — the frame's put-down listener never hears it", () => {
    expect(DOOR).toMatch(
      /const swallowEscape = \(e: React\.KeyboardEvent, close: \(\) => void\) => \{\s*if \(e\.key !== "Escape"\) return false;\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*close\(\);/,
    );
    expect(DOOR).toMatch(/swallowEscape\(e, closeNaming\)/);
    expect(DOOR).toMatch(/swallowEscape\(e, \(\) => closeRename\(layout\.id\)\)/);
    expect(DOOR).toMatch(/if \(armed\) swallowEscape\(e, \(\) => setArmedDeleteId\(null\)\)/);
  });

  it("focus returns to the control that opened the step", () => {
    expect(DOOR).toMatch(/pendingFocus\.current = \{ kind: "save-trigger" \}/);
    expect(DOOR).toMatch(/pendingFocus\.current = \{ kind: "rename", id \}/);
    expect(DOOR).toMatch(/neighbour \? \{ kind: "apply", id: neighbour\.id \} : \{ kind: "save-trigger" \}/);
  });
});
