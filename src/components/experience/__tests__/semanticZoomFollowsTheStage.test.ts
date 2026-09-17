import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stageChangeLevel, type SemanticZoomLevel } from "../SemanticZoom";

/**
 * ENTER MUST MOVE THE DEPTH, NOT JUST THE GEOMETRY.
 *
 * This file exists because of a defect found in the LIVE product and not in a
 * test. The WORKSPACE grammar's sixth tenant opens the learning genome docked at
 * L1 and asks for L3 when the trader presses ENTER. The panel is not remounted
 * between those two stages, so the prop changed and nothing happened: ENTER went
 * full-screen still showing L1 — precisely the "ENTER is only a resize" failure
 * the grammar exists to prevent.
 *
 * The existing inspector test file was green the whole time and could not have
 * been anything else. It renders with `renderToStaticMarkup`, which MOUNTS FRESH
 * on every call, so the second render it would need to observe never exists. A
 * test that cannot represent the passage of time cannot catch a bug about it.
 *
 * So the decision is tested as a SEQUENCE. Each `step()` below is one render;
 * the fixture threads the previous request forward exactly the way the
 * component's ref does, which is what makes "the prop is the same as last time"
 * a thing this file can even say.
 */

const L = (...ls: number[]) => ls as readonly SemanticZoomLevel[];

/**
 * Replays a run of renders against the same live decision the component uses,
 * carrying the previous request forward the way the component's ref does.
 * Returns the level each render moved to, or `null` where it left the trader
 * where they were.
 */
function renderRun(
  available: readonly SemanticZoomLevel[],
  requests: readonly (SemanticZoomLevel | undefined)[],
): readonly (SemanticZoomLevel | null)[] {
  let lastRequested: SemanticZoomLevel | undefined = requests[0];
  const moves: (SemanticZoomLevel | null)[] = [];
  requests.forEach((requested, i) => {
    if (i === 0) {
      // Mount: the level is the `useState` initial, not an effect move.
      moves.push(null);
      return;
    }
    moves.push(stageChangeLevel({ requested, lastRequested, available }));
    if (requested !== undefined) lastRequested = requested;
  });
  return moves;
}

describe("SemanticZoom follows the stage", () => {
  it("moves when the caller asks for a new starting depth after mount", () => {
    // Docked at L1, then ENTER asks for L3 without remounting.
    expect(
      renderRun(L(1, 2, 3), [1, 1, 3]),
      "the caller changed `defaultLevel` on a mounted panel and the view did " +
        "not follow. This is the live ENTER-is-only-a-resize defect: full " +
        "screen, same L1 content.",
    ).toEqual([null, null, 3]);
  });

  it("returns to the docked depth when the stage goes back", () => {
    expect(
      renderRun(L(1, 2, 3), [1, 3, 1]),
      "RETURN put the drawer back but left the trader at the full-screen depth.",
    ).toEqual([null, 3, 1]);
  });

  it("does NOT spring back over the trader's own tab press", () => {
    // Four ordinary parent re-renders with a constant request. If any of these
    // returned a level, the trader could not hold a manually chosen tab.
    expect(
      renderRun(L(1, 2, 3), [1, 1, 1, 1, 1]),
      "an unchanged `defaultLevel` moved the view. The zoom control would " +
        "snap back on every parent re-render and the manual choice would be " +
        "unusable — a cure worse than the disease.",
    ).toEqual([null, null, null, null, null]);
  });

  it("leaves callers that never steer alone entirely", () => {
    expect(
      renderRun(L(1, 2, 3), [undefined, undefined, undefined]),
      "a caller passing no `defaultLevel` at all had its view moved.",
    ).toEqual([null, null, null]);
  });

  it("refuses a depth the content does not carry, and refuses it once", () => {
    // L4 is not supplied. Asking for it must not move the view — and must not
    // keep re-firing on every subsequent render either.
    expect(
      renderRun(L(1, 2), [1, 4, 4, 2]),
      "either an unsupplied level was selected, or the refused request was " +
        "never recorded and stayed a live edge on every later render.",
    ).toEqual([null, null, null, 2]);
  });

  it("is the same function the component actually runs", () => {
    // The pure decision above is only worth testing if the rendering path is
    // wired to it. A component that kept its own inline copy would pass every
    // assertion in this file while shipping the defect.
    const src = readFileSync(
      join(__dirname, "..", "SemanticZoom.tsx"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    expect(
      src,
      "SemanticZoom no longer calls `stageChangeLevel`, so this whole file " +
        "tests a function the product does not use.",
    ).toContain("stageChangeLevel({");
    const at = src.indexOf("stageChangeLevel({");
    const effectStart = src.lastIndexOf("React.useEffect", at);
    expect(
      effectStart,
      "`stageChangeLevel` is called with no effect above it at all.",
    ).toBeGreaterThan(-1);
    expect(
      src.slice(effectStart, at),
      "`stageChangeLevel` is no longer called from inside an effect — the " +
        "nearest effect above it has already closed. Deciding this during " +
        "render is how it stops being an EDGE and starts fighting the trader.",
    ).not.toContain("});");
    expect(
      src.slice(at, src.indexOf("]", src.indexOf("}, [", at)) + 1),
      "the effect that follows the stage is no longer keyed on `defaultLevel`.",
    ).toContain("[defaultLevel]");
  });
});
