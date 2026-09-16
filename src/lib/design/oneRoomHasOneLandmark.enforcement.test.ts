/**
 * A ROOM IS NOT A PAGE — the landmark belongs to the frame.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * After 75f05e3 collapsed the sanctuary into the one frame, production at
 * https://wealthymindsetspro.com/command-deck answered this DOM probe:
 *
 *   mains: [
 *     { testid: "os-room", parentChain: [".wm-os-body", "#wm-operating-system", ".wm-sanctuary", "BODY"] },
 *     { testid: null,      parentChain: ["#deck-route-plane", "MAIN#os-room", ...] },
 *   ]
 *
 * A <main> inside a <main>. HTML forbids it, and an assistive technology
 * asking "take me to the main content" is handed two answers to a question
 * that is defined by having one.
 *
 * ── Why nothing could see it ─────────────────────────────────────────────────
 *
 * It rendered perfectly. A nested <main> has no default styling, so the
 * screenshot was pixel-identical to the correct tree — the entire defect
 * was addressed to the accessibility layer, and the only reviewer of that
 * layer was a browser nobody had asked. tsc cannot type a landmark, the
 * suite had no DOM, and the eye had nothing to catch on. It survived the
 * shell collapse precisely BECAUSE it was invisible to every instrument
 * pointed at the page.
 *
 * This is the same shape as the defect that produced the collapse itself:
 * two owners of one fact, where the second owner costs nothing visible.
 *
 * ── What this enforces ───────────────────────────────────────────────────────
 *
 * Every route in FOUNDER_ROOM_ROUTES is, by construction, rendered INSIDE
 * WMOperatingSystem — which already draws <header data-testid="os-masthead">,
 * <nav data-testid="os-rail"> and <main data-testid="os-room">. So a founder
 * room that draws <main>, <header>, <aside> or <footer> is not adding
 * structure; it is duplicating a landmark that already has an owner one
 * layer up.
 *
 * <nav> is deliberately NOT forbidden. A room may legitimately have its own
 * in-room navigation (tabs within the room's content), and <nav> is the
 * one landmark HTML explicitly expects more than one of. The four listed
 * here are the ones whose duplication is either invalid (<main>) or is
 * exactly how the second shell grew last time (<header>, <aside>, <footer>).
 *
 * ── What this honestly does not do ───────────────────────────────────────────
 *
 * It reads each room's OWN page file. A room that imports a component which
 * draws a <header> will pass this scan — source-reading cannot follow the
 * import graph, and claiming otherwise would be the overclaim this codebase
 * keeps naming. The live DOM probe above remains the only instrument that
 * sees the assembled tree. This Sentinel covers the authoring mistake that
 * actually happened, at the layer where it happened.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FOUNDER_ROOM_ROUTES } from "../routing/founderRoomRoutes";
import { PUBLIC_AUTH_PATHS } from "../authRoutes";

const APP = resolve(__dirname, "..", "..", "app");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * The landmarks WMOperatingSystem already owns. Duplicating one of these in
 * a room is how the second shell grew the first time.
 */
const FRAME_OWNED = ["main", "header", "aside", "footer"] as const;

/** `<main>` and `<main …>` but never `<mainThing>`. */
const opener = (tag: string) => new RegExp(`<${tag}[\\s>]`);

const ROOMS = FOUNDER_ROOM_ROUTES.map((route) => ({
  route,
  file: resolve(APP, route.replace(/^\//, ""), "page.tsx"),
}));

describe("ONE ROOM, ONE LANDMARK — the frame owns the silhouette", () => {
  it("names a real, non-empty family of rooms", () => {
    // Without this, every it.each below would vacuously pass on an empty list.
    expect(ROOMS.length).toBeGreaterThan(0);
    for (const { route, file } of ROOMS) {
      expect(existsSync(file), `${route} has no page.tsx at ${file}`).toBe(true);
    }
  });

  it.each(ROOMS)("$route draws no landmark the frame already owns", ({ route, file }) => {
    const code = codeOnly(readFileSync(file, "utf8"));

    for (const tag of FRAME_OWNED) {
      expect(
        opener(tag).test(code),
        `${route} draws its own <${tag}>. WMOperatingSystem already draws one ` +
          `around this room, so this is a SECOND ${tag} landmark — invalid for ` +
          `<main>, and a re-grown shell for the rest. Use a <div>; the pixels ` +
          `are identical and the landmark keeps its one owner.`,
      ).toBe(false);
    }
  });

  it("POSITIVE CONTROL: the scan detects a landmark when one is really there", () => {
    // The law above asserts an ABSENCE across every room. If `opener` were
    // broken — a typo'd tag, a regex that never matches — all of those
    // assertions would pass while enforcing nothing. This proves the
    // instrument can still see what it is looking for.
    const regrown = `
      export default function Room() {
        return <main style={{ padding: 12 }}><Deck /></main>;
      }
    `;
    expect(opener("main").test(codeOnly(regrown))).toBe(true);

    // And that comments alone can never trip it — this file's own prose
    // discusses <main> at length, and a room's honest note about why it
    // stopped drawing one must not be read as drawing one.
    const proseOnly = `
      /* This was a <main>. The frame owns <main data-testid="os-room">. */
      {/* second <main> nested inside the first */}
      export default function Room() { return <div><Deck /></div>; }
    `;
    expect(opener("main").test(codeOnly(proseOnly))).toBe(false);
  });

  it("the frame this law defers to really does draw those landmarks", () => {
    // The whole law rests on the premise that WMOperatingSystem already owns
    // the silhouette. If a future refactor moved <main> out of the frame,
    // every room would be correctly forbidden from drawing a landmark that
    // no longer exists anywhere — the page would have NO main content, and
    // this suite would stay green. That is the failure this guards.
    const frame = codeOnly(
      readFileSync(
        resolve(__dirname, "..", "..", "components", "os", "WMOperatingSystem.tsx"),
        "utf8",
      ),
    );

    expect(frame, "the frame stopped drawing <main> — no room may draw one either")
      .toMatch(/<main[\s>]/);
    expect(frame, "the frame stopped drawing <header>").toMatch(/<header[\s>]/);
  });
});

/**
 * THE SAME LAW, AT ITS REAL SCOPE.
 *
 * The describe above enumerates seven founder rooms by hand. But `<main>`
 * inside `<main>` is invalid on EVERY page, and MainLayout draws a <main>
 * too — `<main className="wm-app-surface">` for every route that is not a
 * founder room, `WMExperienceShell` → WMOperatingSystem's
 * `<main data-testid="os-room">` for the ones that are. Only
 * `isPublicAuthPath(pathname)` returns `<>{children}</>` bare.
 *
 * So the seven-route list was not the law's boundary; it was the boundary of
 * what had been measured. Five pages sat outside it and each drew a second
 * <main>: /ai-bot, /lounge, /nectar/[symbol], /proof-lane, /readiness. They
 * were found by a live DOM probe on /nectar/SPY, not by this suite.
 *
 * WHY ONLY <main> WIDENS. The <header>/<aside>/<footer> half of the law
 * stays scoped to founder rooms deliberately. Its justification is that
 * WMOperatingSystem draws those landmarks and a duplicate is how the second
 * shell grew — a thing measured in the founder frame. A non-founder page has
 * no proven second-shell risk, and a card's own <header> inside <main> maps
 * to no landmark role at all. Claiming the wider law for surfaces nobody has
 * measured would be exactly the overclaim this codebase keeps naming.
 * <main> needs no such measurement: BOTH frames draw one, unconditionally.
 */

/** Every `page.tsx` under src/app, with the route it answers to. */
function allPages(dir: string, segments: string[] = []): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route GROUPS `(name)` and parallel SLOTS `@name` organise files
      // without contributing a URL segment.
      const contributes = !entry.name.startsWith("(") && !entry.name.startsWith("@");
      out.push(
        ...allPages(
          resolve(dir, entry.name),
          contributes ? [...segments, entry.name] : segments,
        ),
      );
    } else if (entry.name === "page.tsx") {
      out.push({ route: `/${segments.join("/")}`, file: resolve(dir, entry.name) });
    }
  }
  return out;
}

const FRAMED_PAGES = allPages(APP).filter(({ route }) => !PUBLIC_AUTH_PATHS.includes(route as never));

describe("ONE PAGE, ONE <main> — every route already lives inside one", () => {
  it("names a real family of pages, and it is wider than the founder rooms", () => {
    // Both halves matter. An empty list would make the scan below vacuous;
    // a list no larger than FOUNDER_ROOM_ROUTES would mean this describe is
    // re-asserting the one above and covering nothing new.
    expect(FRAMED_PAGES.length).toBeGreaterThan(FOUNDER_ROOM_ROUTES.length);
    for (const { file } of FRAMED_PAGES) expect(existsSync(file)).toBe(true);

    // The five rooms whose nested <main> this scan was written to catch must
    // actually be inside it. Without this, a bug in `allPages` — a missed
    // recursion, a dropped dynamic segment — would silently shrink the law
    // back to the scope that already failed to see them.
    for (const route of ["/ai-bot", "/lounge", "/nectar/[symbol]", "/proof-lane", "/readiness"]) {
      expect(
        FRAMED_PAGES.some((p) => p.route === route),
        `${route} escaped the page scan`,
      ).toBe(true);
    }
  });

  it("the public auth paths are EXCLUDED because nothing frames them", () => {
    // /reset-password legitimately draws a <main>: MainLayout returns its
    // children bare on these routes, so that page IS the only main content.
    // If MainLayout ever stopped exempting them, this exclusion would start
    // hiding a real nested <main> — so the exemption is pinned to its cause.
    const layout = readFileSync(
      resolve(__dirname, "..", "..", "components", "layout", "MainLayout.tsx"),
      "utf8",
    );
    expect(layout, "MainLayout no longer returns public auth routes unframed")
      .toMatch(/isPublicAuthPath\(pathname\)/);
    expect(PUBLIC_AUTH_PATHS.length).toBeGreaterThan(0);
  });

  it.each(FRAMED_PAGES)("$route draws no second <main>", ({ route, file }) => {
    const code = codeOnly(readFileSync(file, "utf8"));
    expect(
      opener("main").test(code),
      `${route} draws its own <main>, but this route is already rendered ` +
        `inside one — MainLayout's <main className="wm-app-surface">, or ` +
        `WMOperatingSystem's <main data-testid="os-room"> if it is a founder ` +
        `room. <main> inside <main> is invalid HTML, and "take me to the ` +
        `main content" gets two answers to a question defined by having one. ` +
        `Use a <div>; the pixels are identical.`,
    ).toBe(false);
  });

  it("POSITIVE CONTROL: the page scan reads real files, not an empty set", () => {
    // `allPages` walking the wrong directory would return [] and every
    // assertion above would pass while reading nothing. This proves the walk
    // reaches a file whose contents are known, and that a <main> planted in
    // that same shape would still be caught.
    const known = FRAMED_PAGES.find((p) => p.route === "/nectar/[symbol]");
    expect(known).toBeTruthy();
    const src = readFileSync(known!.file, "utf8");
    expect(src.length).toBeGreaterThan(200);
    expect(src).toContain("SymbolHeader");
    expect(opener("main").test(`${codeOnly(src)}\n<main className="x">`)).toBe(true);
  });

  it("the frame this law defers to really does draw a <main>", () => {
    // Same premise check as the founder-room law, for the OTHER frame. If
    // MainLayout stopped drawing <main>, forbidding every page from drawing
    // one would leave the app with no main content at all — and green tests.
    const layout = codeOnly(
      readFileSync(
        resolve(__dirname, "..", "..", "components", "layout", "MainLayout.tsx"),
        "utf8",
      ),
    );
    expect(layout, "MainLayout stopped drawing <main> — no page may draw one either")
      .toMatch(/<main[\s>]/);
  });
});
