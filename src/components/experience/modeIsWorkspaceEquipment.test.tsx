/**
 * THE MODE CONTROL MOVED. IT DID NOT LEAVE.
 *
 * ── The measured state this pins ────────────────────────────────────────────
 *
 * MEASURED 2026-09-21 against a local build at 1440x900 by
 * `scratchpad/probe-mode-home.mjs`, reading `.wm-os-masthead` innerText
 * verbatim:
 *
 *   before  "Workspace Tools OBSERVE ▾ ACTIVE DEGRADED · observed · asOf 20:13:42 ET"
 *   after   "Workspace Tools ACTIVE DEGRADED · observed · asOf 20:15:04 ET"
 *
 * and, in the same probe, reading the Workspace panel after one click on its
 * brass plate:
 *
 *   before  "WORKSPACE Draw … Replay …"                      hasModeGroup false
 *   after   "MODE PREP OBSERVE WAIT EXECUTE MANAGE REVIEW LEARN WORKSPACE Draw …"
 *                                                            hasModeGroup true
 *           all seven buttons 44px tall, every one of them inside the 264px
 *           panel box (max overflow past the panel's right edge: -19px)
 *
 * ── Why this file asserts BOTH ENDS and would be worthless with one ─────────
 *
 * "The masthead no longer contains the mode control" is, on its own, exactly
 * the guard that lets a control be DELETED and calls it a pass. The whole
 * reason this change is legitimate is that `OBSERVE` is the trader's committed
 * operating state — one of seven, reorganising every other surface — and a
 * committed state that no surface names is not a simplification, it is a
 * product that stopped telling the truth about itself.
 *
 * So: gone from A, AND present at B. Neither half is allowed to stand alone.
 *
 * ── Why half one renders and half two scans ────────────────────────────────
 *
 * The masthead is on the FIRST FRAME of the instrument view, so it can be
 * rendered and read. The Workspace panel is not: it exists only after
 * `setEquipment("workspace")`, and there is no DOM environment in this repo —
 * no jsdom, no happy-dom, `@testing-library/react` is not installed — so there
 * is no click to give it. `renderToStaticMarkup` of a closed panel would let
 * every assertion about its contents pass vacuously, which is the precise trap
 * this repo already names elsewhere: an assertion that cannot distinguish the
 * two states is worse than no assertion.
 *
 * Half two therefore reads source, COMMENT-STRIPPED (both files argue this
 * change in prose, quoting the very identifiers being checked) and
 * LENGTH-ANCHORED (`""` satisfies every `not.toContain`, and a slice that fails
 * to find its own boundaries is `""`).
 */

import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Same instrument as `ShellAccessParity.test.tsx`, and for the same reason:
 * the route is an INPUT to this shell, so a gate with no route can only ever
 * describe the shell's non-instrument shape — which is the shape this change
 * deliberately leaves alone.
 *
 * `importOriginal` is spread rather than replaced: `useRouter` is reached
 * through the access chrome and a bare factory would silently remove it.
 */
let MOCK_PATHNAME: string | null = null;
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => MOCK_PATHNAME,
}));

import { WMExperienceShell } from "@/components/experience/WMExperienceShell";
import { EXPERIENCE_MODE_GROUP_ID } from "@/components/experience/ExperienceModeBar";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/** A room that is not the market — the control side of every comparison here. */
const ORDINARY_ROOM = "/command-deck";

function renderShellAt(pathname: string): string {
  MOCK_PATHNAME = pathname;
  try {
    return renderToStaticMarkup(
      <WMExperienceShell brand={<span>WM</span>}>
        <div data-testid="room">ROOM</div>
      </WMExperienceShell>,
    );
  } finally {
    MOCK_PATHNAME = null;
  }
}

/**
 * The masthead only — `<header class="wm-os-masthead">…</header>`.
 *
 * Scoped deliberately. Asserting the mode group's absence from the WHOLE
 * document would be a strictly WEAKER claim than the one this file makes, and
 * it would also be the wrong claim: the point is that the control left this
 * band, not that it left the product.
 *
 * Throws rather than returning `""` when the boundaries are not found. A slice
 * that silently misses satisfies every `not.toContain` below and reports green.
 */
function masthead(html: string): string {
  const open = html.indexOf('class="wm-os-masthead');
  if (open < 0) throw new Error("no .wm-os-masthead in the rendered shell");
  const start = html.lastIndexOf("<header", open);
  const end = html.indexOf("</header>", open);
  if (start < 0 || end < 0) throw new Error("the masthead has no <header> boundaries");
  return html.slice(start, end + "</header>".length);
}

/** The two shapes the mode control can take: the seven-tab nav, or the chip. */
const MODE_NAV = 'aria-label="Experience mode"';
const MODE_CHIP = 'data-testid="experience-mode-chip"';

describe("the instrument masthead carries the canon's occupants and no others", () => {
  const band = masthead(renderShellAt(INSTRUMENT_VIEW_ROUTE));

  it("renders a real masthead, so every absence below is an absence FROM something", () => {
    // The length anchor. Without it a slice of "" passes the three tests under
    // this one and pins nothing at all.
    expect(band.length, "the instrument masthead rendered as an empty slice").toBeGreaterThan(400);
    expect(band, "the two brass equipment plates are not in the band").toContain(
      'data-testid="os-equipment-workspace"',
    );
    expect(band).toContain('data-testid="os-equipment-tools"');
  });

  it("keeps the shell-provided house mark on the live-market HOME", () => {
    // This harness deliberately supplies the tiny marker "WM" so the test
    // proves pass-through rather than accidentally matching the production
    // wordmark's own implementation text.
    expect(band).toContain("<span>WM</span>");
  });

  it("does not stand the seven-tab mode nav over live price", () => {
    expect(band, `${INSTRUMENT_VIEW_ROUTE} masthead still carries the seven-tab mode nav`)
      .not.toContain(MODE_NAV);
  });

  it("does not stand the collapsed mode chip over live price either", () => {
    // The chip was the previous repair — one gold chip instead of seven tabs.
    // It is still one occupant F24's band does not draw, so scanning only for
    // the nav would let the thing this change removes come straight back.
    expect(band, `${INSTRUMENT_VIEW_ROUTE} masthead still carries the collapsed mode chip`)
      .not.toContain(MODE_CHIP);
    expect(band, `${INSTRUMENT_VIEW_ROUTE} masthead still carries the mode group`)
      .not.toContain(EXPERIENCE_MODE_GROUP_ID);
  });

  it("EVERY OTHER ROOM IS UNTOUCHED — the bar is still in their masthead", () => {
    /**
     * This is the test that makes the three above mean something. A bug that
     * removed the bar from every route would satisfy all of them; only this one
     * can tell "route-scoped" from "deleted". It is also the live proof that the
     * slice function and the search strings WORK — they find the control here.
     */
    const ordinary = masthead(renderShellAt(ORDINARY_ROOM));
    expect(ordinary.length).toBeGreaterThan(400);
    expect(ordinary, `${ORDINARY_ROOM} lost the seven-mode bar from its masthead`)
      .toContain(MODE_NAV);
    expect(ordinary, `${ORDINARY_ROOM} lost the mode group id`).toContain(EXPERIENCE_MODE_GROUP_ID);
  });
});

/**
 * COMMENT-STRIPPED. Both files below argue this relocation at length and quote
 * `workspaceLead`, `onInstrumentView` and `equipment === "workspace"` while
 * doing it. A gate that its own subject's prose can satisfy is not a gate.
 */
function source(rel: string): string {
  const text = readFileSync(path.resolve(__dirname, "..", "..", "..", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  expect(text.length, `${rel} read as an empty file`).toBeGreaterThan(2000);
  return text;
}

const SHELL = "src/components/experience/WMExperienceShell.tsx";
const OS = "src/components/os/WMOperatingSystem.tsx";

describe("and the mode control is standing on the Workspace wall instead", () => {
  it("the shell hands the seven states to the frame's workspace slot on the instrument view", () => {
    const shell = source(SHELL);
    expect(
      shell,
      `${SHELL} → the mode control is no longer handed to workspaceLead. Gone from the masthead ` +
        `and handed to nothing is a DELETION wearing a relocation's diff`,
    ).toMatch(/workspaceLead=\{onInstrumentView \? modeEquipment : undefined\}/);
    // And the node it names must actually be the mode bar, not an empty div
    // that satisfies the line above.
    const decl = shell.slice(shell.indexOf("const modeEquipment"));
    expect(decl.length, `${SHELL} → modeEquipment is never declared`).toBeGreaterThan(200);
    expect(
      decl.slice(0, 900),
      `${SHELL} → modeEquipment does not mount ExperienceModeBar`,
    ).toContain("<ExperienceModeBar");
  });

  it("it arrives EXPANDED — the reason to collapse was the price underneath it", () => {
    /**
     * `collapsed` bought one thing: the bar not being the widest non-price
     * object above the candles. Inside a panel the trader opened on purpose
     * there is no price underneath, so a chip there would cost a second click
     * and buy nothing. MEASURED: all seven fit the 264px panel at the 44px
     * floor, none clipped.
     */
    const shell = source(SHELL);
    const decl = shell.slice(shell.indexOf("const modeEquipment"), shell.indexOf("const railToggle"));
    expect(decl.length).toBeGreaterThan(200);
    expect(decl, `${SHELL} → the workspace copy of the bar collapsed itself again`)
      .not.toContain("collapsed");
  });

  it("the frame draws that slot inside the WORKSPACE hand, and only there", () => {
    const os = source(OS);
    const at = os.indexOf('scenePanel === "workspace"');
    expect(at, `${OS} → the workspace branch is gone`).toBeGreaterThan(0);
    const branch = os.slice(at, os.indexOf("RoomWorkspaceRail", at) + 200);
    expect(branch.length, `${OS} → the workspace branch sliced empty`).toBeGreaterThan(120);
    /**
     * THE SHAPE IS PINNED, NOT JUST THE WORD, AND THAT DISTINCTION WAS
     * MEASURED. The first draft of this assertion was `toContain("workspaceLead")`
     * and it was mutation-tested by rewriting the live gate from
     * `workspaceLead === undefined ? null :` to `true ? null :` — the slot was
     * then drawn NEVER, the trader's committed operating mode went nowhere, and
     * this file reported 8 passed. The identifier survived in the dead branch,
     * which is the whole trick.
     *
     * So the gate is pinned the way `AriaControlsResolves.sentinel` pins its
     * own: the exact condition, and the mount inside it. `{0,400}` spans the
     * wrapper element without letting the mount drift out of this branch.
     */
    expect(
      branch,
      `${OS} → workspaceLead is accepted as a prop and never actually mounted in the Workspace ` +
        `panel, or is mounted behind a condition other than "did the caller supply one". An ` +
        `unmounted slot is the same as no slot, and the shell above would be handing the ` +
        `trader's committed operating mode into a hole`,
    ).toMatch(/workspaceLead === undefined \? null : \([\s\S]{0,400}\{workspaceLead\}/);
  });

  it("the slot is a real prop on the frame, not a stray identifier", () => {
    const os = source(OS);
    expect(os, `${OS} → workspaceLead is drawn but never declared on the props interface`)
      .toMatch(/readonly workspaceLead\?: React\.ReactNode;/);
    expect(os, `${OS} → workspaceLead is declared but never destructured from props`)
      .toMatch(/^\s*workspaceLead,$/m);
  });
});
