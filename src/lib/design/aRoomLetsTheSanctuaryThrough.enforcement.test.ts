import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * THE LAW, STATED POSITIVELY
 *
 *   A room lets the sanctuary through.
 *
 * WMExperienceShell paints the sanctuary: #050506, a radial warm-gold
 * gradient, a grain layer at 0.04-0.07 with mix-blend-mode: overlay, and a
 * vignette. That atmosphere is the single thing that makes twenty-two rooms
 * read as ONE operating system rather than twenty-two small apps.
 *
 * A room whose own outermost element carries an OPAQUE full-extent
 * background paints all of that out. The room still "works" — it just stops
 * being in the same building. That is SCENE_FRAGMENTATION, and it is the
 * measured mechanism behind the Founder's question "why don't I see the new
 * OS": promoting a room's `frame` to "os" does nothing at all if the room
 * then covers the sanctuary with its own black.
 *
 * MEASURED 2026-09-16 by SSR-rendering each room inside WMExperienceShell
 * with the real compiled stylesheet attached and probing computed styles in
 * Chrome: `DIV.bg-wm-black` appeared as an opaque element occupying >60% of
 * both viewport axes INSIDE the room, in /education, /backtesting, /scanner
 * and /lounge.
 *
 * /journal, /paper and /proof-lane had already been cured when they were
 * promoted; each carries a comment recording why. This test is what stops
 * the fourth, fifth and sixth rediscovery of the same defect.
 *
 * WHY THIS TEST NAMES FILES AND STILL KEEPS THE LAW: it does not assert
 * "these files are clean". It walks whatever room pages exist and asserts
 * the property of each. A new room added tomorrow is covered without
 * editing this file.
 */

const APP_DIR = join(process.cwd(), "src", "app");

/** Rooms are pages the Founder navigates to. /login paints its own world by design. */
const NOT_A_ROOM = new Set(["login", "signup", "reset-password", "api"]);

function roomPages(): Array<{ route: string; source: string }> {
  const out: Array<{ route: string; source: string }> = [];
  for (const entry of readdirSync(APP_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (NOT_A_ROOM.has(entry.name)) continue;
    const page = join(APP_DIR, entry.name, "page.tsx");
    if (!existsSync(page)) continue;
    out.push({ route: `/${entry.name}`, source: readFileSync(page, "utf8") });
  }
  return out;
}

/**
 * Every element in the file that claims the WHOLE viewport.
 *
 * An earlier draft of this test judged only the LAST `return (<div …>` in the
 * file, on the assumption that the page component is defined last. A
 * revive-attempt (re-adding `bg-wm-black` to /education's root and expecting
 * a failure) proved that assumption FALSE — the test passed while the defect
 * was live. Position in the file is not the property the law is about.
 *
 * So key on the property itself: an element is a "plane" when it declares
 * full extent (100% of both axes, or min-h-screen). That catches the root of
 * a page, a wrapper inside it, and any future shape, without caring where in
 * the file it sits or which component owns it.
 */
function fullExtentElements(source: string): string[] {
  const out: string[] = [];
  const tag = /<div\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(source)) !== null) {
    const el = m[0];
    const bothAxes =
      /width:\s*"100%"/.test(el) && /height:\s*"100%"/.test(el);
    const screenTall = /\bmin-h-screen\b/.test(el);
    if (bothAxes || screenTall) out.push(el);
  }
  return out;
}

/** Opaque background utilities. `/40`, `/60` etc. are translucent and fine. */
const OPAQUE_PLANE = /\bbg-wm-(black|dark|panel)\b(?!\/)/;

describe("a room lets the sanctuary through", () => {
  const rooms = roomPages();

  it("finds room pages to check at all (guards the walker itself)", () => {
    expect(rooms.length).toBeGreaterThan(10);
  });

  for (const { route, source } of rooms) {
    it(`${route} paints no opaque full-extent plane over the sanctuary`, () => {
      const offenders = fullExtentElements(source).filter((el) =>
        OPAQUE_PLANE.test(el),
      );
      expect(
        offenders,
        `${route} declares ${offenders.length} full-extent element(s) with an ` +
          `opaque background:\n  ${offenders.join("\n  ")}\n` +
          `The sanctuary is painted by WMExperienceShell. A full-extent element ` +
          `inside a room must be transparent so the gradient, grain and vignette ` +
          `reach the Founder's eye. If this room genuinely needs a darker field, ` +
          `use a translucent token (bg-wm-black/40) so the atmosphere still shows ` +
          `through.`,
      ).toEqual([]);
    });
  }

  it("the three already-cured rooms record WHY they are transparent", () => {
    for (const name of ["journal", "paper", "proof-lane"]) {
      const src = readFileSync(join(APP_DIR, name, "page.tsx"), "utf8");
      expect(src).toMatch(/sanctuary/i);
    }
  });
});
