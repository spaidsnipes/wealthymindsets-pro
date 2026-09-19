/**
 * SENTINEL — `aria-controls` may only be claimed while the thing it names exists.
 *
 * ── The measured defect this pins ───────────────────────────────────────────
 *
 * MEASURED 2026-09-19 on live https://wealthymindsetspro.com/charts at 1920
 * wide, by reading each masthead disclosure and resolving its own
 * `aria-controls` with `getElementById`:
 *
 *   Workspace  closed → {"controls":"wm-os-rail","targetPresent":false}
 *   Workspace  open   → {"controls":"wm-os-rail","targetPresent":true}
 *   Tools      closed → {"controls":"wm-os-rail","targetPresent":false}
 *   Tools      open   → {"controls":"wm-os-rail","targetPresent":true}
 *
 * Both of the two equipment buttons the Shot-1 silhouette is allowed to carry
 * pointed at a region that had been deliberately unmounted. The rail's own
 * comment states the design outright — "A CLOSED RAIL RENDERS NOTHING" — and
 * then the attribute above it promised that nothing to everyone who cannot see
 * the screen.
 *
 * ── Why this is a defect and not a preference ───────────────────────────────
 *
 * A dangling `aria-controls` is not ignored. It is FOLLOWED. Screen readers
 * offer the jump; the user takes it; nothing is there and nothing is said. That
 * reads as a broken page, not as a closed panel — so the attribute intended to
 * describe the disclosure is the thing that makes the disclosure look broken.
 * No `aria-controls` at all is strictly better, because `aria-expanded` alone
 * is complete and honest: "there is more, it is currently shut."
 *
 * This is the same law the `SmartMoneyPanel` explainer repair recorded on the
 * same day, in the other direction — that button was deliberately NOT given an
 * `aria-controls`, for exactly this reason. Three controls had the attribute
 * and should not have; one did not and should not gain it. One law.
 *
 * ── Why the gate is per-button and not per-panel ────────────────────────────
 *
 * Workspace and Tools share ONE rail element. Gating on the shared `panelOpen`
 * would make every reference resolve and still leave Workspace claiming to
 * control the panel that Tools opened. A reference that resolves to the wrong
 * region is a quieter lie than one that resolves to nothing, and the quiet kind
 * is the expensive kind. Each button is therefore gated on its own state.
 *
 * ── Why a source Sentinel and not a render ──────────────────────────────────
 *
 * There is no DOM environment in this repo — no jsdom, no happy-dom,
 * `@testing-library/react` is not installed. `getElementById` against a live
 * tree is exactly what cannot be run here; it was run on the deployed build
 * instead. This file is the regression lock, not the proof.
 *
 * COMMENT-STRIPPED, and that is load-bearing. A sentinel in this repo has
 * already once guarded its own prose. The comments this file protects quote
 * `aria-controls`, `wm-os-rail` and `panelOpen` while explaining them, so every
 * assertion below runs against source with comments removed.
 */

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** COMMENT-STRIPPED: every claim below is also discussed in prose in-file. */
const read = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const OS = "src/components/os/WMOperatingSystem.tsx";
const BAR = "src/components/experience/ExperienceModeBar.tsx";
/**
 * The two masthead shells. `MainLayout` is the July header, `ShellAccessChrome`
 * is the OS-room header, and they draw the SAME three capabilities — search,
 * notifications, settings — against the SAME three panels in `shellPanels`.
 *
 * MEASURED 2026-09-19 on live /charts at 1920, after the OS-frame repair above
 * had silenced the loud carriers, the same probe returned:
 *
 *   Search symbols     → wm-symbol-search-dialog   targetPresent false
 *   Open notifications → wm-notifications-drawer   targetPresent false
 *   Open settings      → wm-settings-drawer        targetPresent false
 *
 * Two files are why this is a Sentinel and not two assertions: a shell can be
 * repaired and its twin left behind, and nothing in the product would say so.
 */
const JULY = "src/components/layout/MainLayout.tsx";
const SHELL = "src/components/layout/ShellAccessChrome.tsx";

/** Each masthead trigger, and the state that governs whether its target exists. */
const TRIGGERS = [
  ["searchOpen", "wm-symbol-search-dialog"],
  ["notifsOpen", "wm-notifications-drawer"],
  ["settingsOpen", "wm-settings-drawer"],
] as const;

describe("SENTINEL — every aria-controls on the market masthead resolves when it is claimed", () => {
  const os = read(OS);
  const bar = read(BAR);

  it("no aria-controls anywhere in the OS frame is an unconditional string literal", () => {
    // The whole defect was an attribute that could not tell open from closed.
    // A string literal is precisely the shape that cannot.
    const literals = [...os.matchAll(/aria-controls=("[^"]*"|\{"[^"]*"\})/g)].map((m) => m[1]);
    expect(
      literals,
      `${OS} → an aria-controls is pinned to a constant, so it points at the rail even while ` +
        `the rail is unmounted. A dangling reference is followed, not ignored`,
    ).toEqual([]);
  });

  it("the equipment pair claims the rail only while that button's own panel is open", () => {
    expect(
      os,
      `${OS} → the Workspace/Tools pair does not gate aria-controls on its own \`open\`. Gated ` +
        `on the shared panel state instead, Workspace would claim to control the panel Tools ` +
        `opened — a reference that resolves and still lies`,
    ).toMatch(/aria-controls=\{open \? "wm-os-rail" : undefined\}/);
  });

  it("the rooms toggle claims the rail only while the rail is open", () => {
    expect(
      os,
      `${OS} → the Rooms toggle still names the rail while the rail is unmounted`,
    ).toMatch(/aria-controls=\{railOpen \? "wm-os-rail" : undefined\}/);
  });

  it("the collapsed mode chip claims its group only while the group is rendered", () => {
    expect(
      bar,
      `${BAR} → the chip names the seven-button group for the whole time the group is shut, ` +
        `which is the whole time before anyone presses the chip`,
    ).toMatch(/aria-controls=\{open \? EXPERIENCE_MODE_GROUP_ID : undefined\}/);
  });

  for (const file of [JULY, SHELL]) {
    describe(file, () => {
      const src = read(file);

      it("claims no aria-controls as an unconditional string literal", () => {
        const literals = [...src.matchAll(/aria-controls=("[^"]*"|\{"[^"]*"\})/g)].map((m) => m[1]);
        expect(
          literals,
          `${file} → an aria-controls is pinned to a constant, so it names a panel that is ` +
            `unmounted for the whole time the trigger is shut. A dangling reference is followed, ` +
            `not ignored: the reader offers the jump and lands the human nowhere`,
        ).toEqual([]);
      });

      for (const [state, id] of TRIGGERS) {
        it(`the ${id} trigger claims its panel only while ${state}`, () => {
          expect(
            src,
            `${file} → the ${id} trigger does not gate aria-controls on its own \`${state}\`. ` +
              `Gated on a shared "something is open" flag instead, one trigger would claim the ` +
              `panel another opened — a reference that resolves and still lies`,
          ).toContain(`aria-controls={${state} ? "${id}" : undefined}`);
        });
      }

      it("keeps aria-expanded on all three, the half that must never be gated", () => {
        for (const [state] of TRIGGERS) {
          expect(
            src,
            `${file} → a masthead trigger lost \`aria-expanded={${state}}\`. Gating the reference ` +
              `is only honest while the state is still announced; without it the control goes quiet`,
          ).toContain(`aria-expanded={${state}}`);
        }
      });
    });
  }

  it("the July rail's workspace drawer is claimed only while that drawer is open", () => {
    /**
     * The fourth carrier, and the one the live probe did NOT report — it sits
     * in the left rail below the desktop fold the probe read, so the measured
     * list of three was three of four. The class-wide net above found it.
     *
     * That is the argument for keeping a net alongside the named gates: a probe
     * reports what it could see, and a defect class does not stop at the fold.
     */
    expect(
      read(JULY),
      `${JULY} → the workspace rail button names wm-workspace-menu while the drawer is unmounted`,
    ).toContain('aria-controls={workspaceOpen ? "wm-workspace-menu" : undefined}');
    expect(read(JULY), `${JULY} → the workspace button lost aria-expanded`)
      .toContain("aria-expanded={workspaceOpen}");
  });

  it("aria-expanded is still present on all four, because it is the half that must never be gated", () => {
    // Removing the dangling reference is only safe because `aria-expanded`
    // carries the entire disclosure claim on its own. A repair that dropped
    // both would silence the control instead of correcting it.
    expect(
      os.match(/aria-expanded=/g)?.length ?? 0,
      `${OS} → the disclosures lost aria-expanded. Gating the reference is only honest while ` +
        `the state is still announced; without it the control simply goes quiet`,
    ).toBeGreaterThanOrEqual(2);
    expect(
      bar,
      `${BAR} → the chip lost aria-expanded`,
    ).toMatch(/aria-expanded=\{open\}/);
  });
});
