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
 * full extent. That catches the root of a page, a wrapper inside it, and any
 * future shape, without caring where in the file it sits or which component
 * owns it.
 *
 * ── WHY `h-full` IS DELIBERATELY *NOT* TREATED AS FULL EXTENT HERE ──────────
 *
 * A live probe (2026-09-16) measured an opaque full-extent plane inside
 * /copy-trading and /ai-bot that this function walked past. The roots declare
 * `h-full`, and the obvious repair was to add `h-full` to the list above.
 *
 * That repair was tried and withdrawn the same minute, because it is WRONG in
 * a way worth recording. `min-h-screen` and an inline `height: "100%"` on a
 * page root are claims about the VIEWPORT. `h-full` is a claim about the
 * PARENT — "fill whatever box I was given". Whether that box is the sanctuary
 * or a 200px video tile is not decidable from the source text, and adding it
 * immediately produced a false accusation against /news:475, a media surface
 * painting #0D1117 inside a player, which covers nothing but its own player.
 *
 * A Sentinel that cries wolf about a video tile teaches the team to ignore it,
 * and the next real offence walks in behind that habit. The source scan keeps
 * only the extents it can actually prove. The geometry-dependent half of the
 * law is measured by the probe in the browser, where geometry exists — which
 * is the same division of labour as "the registry decides membership and the
 * sanctuary decides rhythm".
 *
 * What WAS learned from those two rooms is context-free, so it is fenced
 * separately and absolutely, in the second describe block below.
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

/**
 * THE SECOND LAW, AND THE SUBTLER ONE
 *
 *   There is one sanctuary, and no room may build a second.
 *
 * MEASURED 2026-09-16. A browser probe found an opaque full-extent plane in
 * /copy-trading and /ai-bot. The plane was not a stray black rectangle and not
 * a `bg-wm-*` utility. Both roots carried, inline:
 *
 *   background: `radial-gradient(1200px 700px at 50% -10%,
 *                rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`
 *
 * That is a REIMPLEMENTATION OF THE SANCTUARY. WMExperienceShell already paints
 * #050506 with warm radial gold over it (WMExperienceShell.tsx:224-225), plus a
 * grain layer and a vignette the room does not reproduce. A room that
 * re-declares the first two lays a slightly-off copy of the OS on top of the
 * real one and loses the rest.
 *
 * THIS IS THE HARDEST FORM OF SCENE_FRAGMENTATION TO SEE, and the reason it
 * needs its own fence: the room looks *right*. A reviewer opening it sees warm
 * gold on near-black and moves on. Only a probe that asks which ELEMENT is
 * painting finds it. The first law's scan walked past both rooms for a year.
 *
 * Unlike geometry, this one is fully decidable from source: a gradient in a
 * room's own styles that reproduces the shell's signature is wrong wherever it
 * sits, at any size, nested or not. No viewport measurement required. So it is
 * fenced here, absolutely, across every element of every room.
 *
 * Rooms may still paint. A gold gradient on a hero card, a panel, a chart
 * backdrop is the design language doing its job. What no room may do is lay
 * that gradient over its own copy of the deepest surface — because the deepest
 * surface is the shell's floor, and there is only one floor.
 */
describe("there is one sanctuary, and no room builds a second", () => {
  /**
   * The shell's own floor tokens. A room reaching for these by name is
   * reaching for the thing beneath it, which it already has for free.
   */
  const SHELL_FLOOR = /WM\.surface\.deepest|#050506/;

  for (const { route, source } of roomPages()) {
    it(`${route} does not repaint the shell's floor under its own gradient`, () => {
      const offenders: string[] = [];
      const tag = /<div\b[^>]*>/g;
      let m: RegExpExecArray | null;
      while ((m = tag.exec(source)) !== null) {
        const el = m[0];
        // Only the STYLE matters; a comment explaining the cure mentions both
        // the gradient and the token on purpose and must not be accused.
        const style = el.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
        const declaresBackground = /background(?:Color)?:\s*`?[^,`}]*gradient/.test(style);
        if (declaresBackground && SHELL_FLOOR.test(style)) offenders.push(el);
      }
      expect(
        offenders,
        `${route} paints a gradient over its own copy of the shell's floor:\n` +
          `  ${offenders.join("\n  ")}\n` +
          `The sanctuary is already underneath this room — #050506 with a warm ` +
          `radial gold gradient, a grain layer and a vignette, all painted by ` +
          `WMExperienceShell. Re-declaring the first two here covers the real ` +
          `atmosphere with a partial copy and drops the rest. Remove the floor ` +
          `and let the one sanctuary through (background: "transparent"), or ` +
          `keep the gradient on a CARD rather than on a plane.`,
      ).toEqual([]);
    });
  }
});
