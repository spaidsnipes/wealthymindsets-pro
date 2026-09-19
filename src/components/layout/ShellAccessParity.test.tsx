/**
 * ONE OS — the four capabilities must be reachable from an OS room.
 *
 * ── THE MEASURED DEFECT THIS GATE CLOSES ──────────────────────────────
 * `MainLayout` returns two different shells after auth. The OS-framed rooms
 * get `WMExperienceShell`; everything else gets the July `wm-universe` markup.
 * Search, notifications, settings and sign-out were drawn ONLY in the July
 * branch, as file-private functions. Read plainly, that meant:
 *
 *   A trader standing in /command-deck — the room the product OPENS ON —
 *   could not search for a symbol, could not open their settings, and could
 *   NOT SIGN OUT, without first walking to a room that still wore July.
 *
 * ── WHY THIS GATE RENDERS INSTEAD OF SCANNING ─────────────────────────
 * A source scan for `ShellAccessChrome` in `WMExperienceShell.tsx` would pass
 * on an IMPORT that nothing mounts, and it would pass on the word appearing in
 * a comment. Both are exactly how this capability went missing the first time:
 * the code existed, and no branch reached it. So this asserts the RENDERED
 * masthead, which a comment cannot satisfy and an unused import cannot fake.
 *
 * There is no DOM environment in this repo — no jsdom, no happy-dom,
 * `@testing-library/react` is not installed. `renderToStaticMarkup` is the
 * available instrument, and it is sufficient: every control below is present
 * on first paint, not behind an effect.
 */
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * THE ROUTE IS AN INPUT TO THE SHELL, SO THE TEST HAS TO BE ABLE TO SET IT.
 *
 * Until 2026-09-18 this file rendered the shell exactly once, with no route at
 * all — `usePathname()` returns null outside a router, so every assertion here
 * described the shell's NON-instrument shape and nothing in this suite had an
 * opinion about /charts. That is how the live-market room kept a five-door
 * phone strip while the desk version of the same room had already cleared its
 * navigation: the two widths disagreed, and no gate could see it, because the
 * only render the gate had was the one where they agree.
 *
 * `importOriginal` is spread rather than replacing the module, because
 * `useRouter` is reached through the access chrome's settings panel and a bare
 * factory would have silently removed it.
 */
let MOCK_PATHNAME: string | null = null;
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => MOCK_PATHNAME,
}));

import { WMExperienceShell } from "@/components/experience/WMExperienceShell";
import { WMOperatingSystem } from "@/components/os/WMOperatingSystem";
import { phoneNavDestinations, WM_DESTINATIONS } from "@/lib/routing/wmDestinations";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

function renderShellAt(pathname: string | null): string {
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

/** Every room that is not the market. The shape this file has always asserted. */
const HTML = renderShellAt(null);

/** The one room where the market itself is the job. */
const INSTRUMENT_HTML = renderShellAt(INSTRUMENT_VIEW_ROUTE);

/**
 * The frame in a `"door"` room with the rail OPEN — what the phone sheet holds
 * once the trader taps the toggle.
 *
 * Rendered from the frame directly rather than through the shell because the
 * shell's job is to decide `railDefaultOpen={false}`, and this is the other
 * side of that decision: what the trader gets when they overrule it. A test
 * that could only see the closed state could not tell "the doors moved behind
 * one toggle" apart from "the doors are gone".
 */
const OPEN_SHEET_HTML = renderToStaticMarkup(
  <WMOperatingSystem
    activeHref={INSTRUMENT_VIEW_ROUTE}
    surface="Market"
    openEvidenceItems={null}
    rightOfWay="UNKNOWN"
    rightOfWayResolved={false}
    feed={null}
    phoneDestinations="door"
    railDefaultOpen
  >
    <div data-testid="room">ROOM</div>
  </WMOperatingSystem>,
);

describe("one OS · the access chrome is reachable from an OS room", () => {
  /**
   * VACUITY GUARD. Every assertion below is a substring check against one
   * string. If the shell ever throws or returns null, that string is empty or
   * tiny and `not.toContain` assertions would all pass for the most boring
   * reason imaginable. This fails first instead.
   */
  it("actually rendered a shell", () => {
    expect(HTML.length).toBeGreaterThan(400);
    expect(HTML).toContain('data-testid="room"');
    expect(HTML).toContain("wm-os-masthead");
  });

  it("puts all four capabilities in the masthead of an OS room", () => {
    expect(HTML).toContain('aria-label="Search symbols"');
    expect(HTML).toContain("notifications");
    expect(HTML).toContain('aria-label="Open settings"');
    expect(HTML).toContain('aria-label="Open profile menu"');
  });

  it("declares each trigger's dialog relationship, not just its icon", () => {
    // A masthead icon that announces nothing is a picture. These are the
    // attributes that make it a control a screen-reader can use.
    expect(HTML).toContain('aria-controls="wm-symbol-search-dialog"');
    expect(HTML).toContain('aria-controls="wm-notifications-drawer"');
    expect(HTML).toContain('aria-controls="wm-settings-drawer"');
    expect(HTML).toContain('aria-haspopup="menu"');
  });

  it("opens no panel before the trader asks", () => {
    // Exclusive-open starts CLOSED. A drawer in the first paint would be a
    // modal the trader never summoned, holding the focus trap on arrival.
    expect(HTML).toContain('aria-expanded="false"');
    expect(HTML).not.toContain('id="wm-symbol-search-dialog"');
    expect(HTML).not.toContain('role="dialog"');
  });
});

describe("one OS · every room has a door in the rail", () => {
  /**
   * ── THE MEASURED DEFECT ─────────────────────────────────────────────
   * The rail drew the seven ROOM destinations and stopped. The fourteen in
   * TOOL and COMMUNITY — scanner, news, academy, lounge, shop, the trader's
   * own profile — had NO door in an OS room. Not a broken link: no link.
   *
   * And nothing in this suite went red while that was true, which is the
   * whole reason this gate exists. It asserts against the OWNER's list, so
   * a destination added to `wmDestinations` tomorrow and forgotten in the
   * rail fails HERE rather than being discovered by a trader.
   */
  it("renders an href for every destination the owner declares", () => {
    expect(WM_DESTINATIONS.length).toBeGreaterThanOrEqual(21); // vacuity guard
    const missing = WM_DESTINATIONS.filter((d) => !HTML.includes(`href="${d.href}"`));
    expect(missing.map((d) => `${d.label} → ${d.href}`)).toEqual([]);
  });

  it("names each door with the owner's label, not a second copy of it", () => {
    // The drift this ends was real and measured: the same room was called
    // "Chart" on one rail and "Charts" on the other.
    const missing = WM_DESTINATIONS.filter((d) => !HTML.includes(`>${d.label}</a>`));
    expect(missing.map((d) => d.label)).toEqual([]);
  });
});

describe("one OS · a phone can leave the room", () => {
  /**
   * ── THE MEASURED DEFECT ─────────────────────────────────────────────
   * `.wm-os-rail { display: none }` below 900px, and NOTHING replaced it.
   * Not a degraded map — no map. A trader who opened /command-deck on a
   * phone could not navigate anywhere. The standing bar that does render
   * there reports CONDITIONS; it is not a way out.
   *
   * No test failed while that was true. This is that test.
   */
  it("renders the phone bar with all five doors", () => {
    expect(HTML).toContain('data-testid="os-phone-nav"');
    const doors = phoneNavDestinations();
    expect(doors).toHaveLength(5); // vacuity guard
    const missing = doors.filter((d) => !HTML.includes(`href="${d.href}"`));
    expect(missing.map((d) => d.href)).toEqual([]);
  });

  it("does not show the phone bar and the rail as two answers at once", () => {
    // Both are in the markup; CSS decides. The complementary breakpoint is the
    // claim — an overlap renders two navigations, a gap renders none.
    expect(HTML).toContain(".wm-os-phone-nav { display: none !important; }");
    expect(HTML).toContain(".wm-os-rail { display: none !important; }");
  });
});

describe("one OS · 390 is not a different application", () => {
  /**
   * ── THE DEFECT THIS GATE CLOSES (M1) ────────────────────────────────
   *
   * The two tests directly above are correct AND they were protecting the
   * wrong thing on one route. They assert a five-door strip pinned across the
   * bottom of the viewport, which is right for every room where choosing where
   * to go next IS the job — and wrong for the one room where the market is the
   * job, because at 1920 that same room had already cleared its navigation
   * behind a single labelled toggle.
   *
   * So the instrument view was a workspace on the desk and a consumer app with
   * a tab bar on the phone. Same route. Same product. Two architectures.
   *
   * ── AND THE GATE HAS TO ASSERT THE DOORS ARE STILL THERE ────────────
   *
   * "No strip" is half a claim, and on its own it describes an amputation: a
   * trader at 390 on /charts with the strip gone and nothing in its place is
   * stranded in the room. The other half — the toggle, the doors it reaches,
   * and the way back out — is what makes the removal a repair. Both halves are
   * asserted below, deliberately, in the same block.
   */
  it("actually rendered the instrument view", () => {
    // VACUITY GUARD. Every `not.toContain` below passes on an empty string,
    // and a route mock that silently stopped working would produce exactly
    // that — this suite's own "renders an href for every destination" gate was
    // once green for a shell that drew fourteen fewer doors than it claimed.
    expect(INSTRUMENT_HTML.length).toBeGreaterThan(400);
    expect(INSTRUMENT_HTML).toContain('data-testid="room"');
    expect(INSTRUMENT_HTML).toContain("wm-os-masthead");
    // And it is genuinely a DIFFERENT render from the one above, not the same
    // string handed back twice by a mock that never took effect.
    expect(INSTRUMENT_HTML).not.toEqual(HTML);
    // THE FIRST DRAFT OF THIS GUARD ASSERTED `href="/charts"` WAS PRESENT, and
    // it failed — correctly. With the strip gone and the rail closed there is
    // no destination anchor anywhere in the instrument view's first paint,
    // which is the whole point of the change. A vacuity guard that assumes the
    // old architecture is a vacuity guard that argues for it.
    expect(INSTRUMENT_HTML).not.toContain(`href="${INSTRUMENT_VIEW_ROUTE}"`);
  });

  it("draws NO pinned destination strip over the market", () => {
    expect(INSTRUMENT_HTML).not.toContain('data-testid="os-phone-nav"');
    // Nor the reservation that belonged to it. A band of dead black under the
    // provenance line is the strip's footprint outliving the strip.
    expect(INSTRUMENT_HTML).not.toContain(".wm-os-provenance {");
  });

  it("keeps the one labelled door", () => {
    expect(INSTRUMENT_HTML).toContain('data-testid="os-rail-toggle"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Rooms"');
  });

  it("reaches MORE doors through it than the strip ever did, not fewer", () => {
    // ── WHY THIS ASSERTS THE FRAME AND NOT THE SHELL ──────────────────
    // The doors are not in the instrument view's first paint, by design — the
    // rail renders nothing until the trader opens it, at BOTH widths. So the
    // anti-amputation claim cannot be read off `INSTRUMENT_HTML`; asking it to
    // be there would be asking for the mall back. What has to be true is the
    // frame's contract: a room that gave up the strip gets the WHOLE rail when
    // the door is opened, not a phone-sized subset of it.
    expect(WM_DESTINATIONS.length).toBeGreaterThan(phoneNavDestinations().length);
    const missing = WM_DESTINATIONS.filter((d) => !OPEN_SHEET_HTML.includes(`href="${d.href}"`));
    expect(missing.map((d) => `${d.label} → ${d.href}`)).toEqual([]);
  });

  it("gives the opened sheet a way back out", () => {
    // Pinned over the viewport, the sheet covers the masthead toggle that
    // opened it. Without this control the trader who opened the navigation
    // cannot get back to the chart — a door that only opens is a trap.
    expect(OPEN_SHEET_HTML).toContain('data-testid="os-rail-close"');
    expect(OPEN_SHEET_HTML).toContain('aria-label="Close rooms"');
    expect(OPEN_SHEET_HTML).toContain(".wm-os-rail-close { display: flex !important; }");
    // And the strip's room does NOT get that control, because on a "bar" room
    // the rail never covers the toggle. Two close affordances on one screen is
    // two answers to "how do I get out of here".
    expect(HTML).not.toContain('data-testid="os-rail-close"');
  });

  it("opens no navigation the trader did not ask for", () => {
    // `phoneDestinations="door"` makes the rail an overlay below the
    // breakpoint. If the same room also left the rail open by default, the
    // first phone paint would be a full-screen navigation covering the market.
    // The frame cannot measure the viewport at render — that is the React #418
    // class this codebase paid for five times — so the invariant is asserted
    // against the real shell here instead of guessed at runtime.
    expect(INSTRUMENT_HTML).toContain('aria-expanded="false"');
    expect(INSTRUMENT_HTML).not.toContain('data-testid="os-rail"');
  });
});

describe("one OS · both shells mount the SAME panels", () => {
  /**
   * The point of the extraction was that there is ONE settings dialog, not an
   * OS-palette copy with its own drift schedule. Asserting both importers name
   * the same module is the cheapest way to notice a second copy appearing.
   */
  /**
   * Read a file with its COMMENTS REMOVED.
   *
   * ── This is not tidying. Without it, a test below could not fail. ─────────
   *
   * The mount assertion is `toMatch(/<HeaderPnL\s*\/>/)`. ShellAccessChrome's
   * own file header explains the change in prose, and that prose names the
   * element it is explaining — "see the block above `<HeaderPnL/>` below".
   * So the matcher matched THE SENTENCE ABOUT THE MOUNT.
   *
   * Proven by positive control, not by inspection: the real `<HeaderPnL />`
   * was deleted from the returned JSX and the whole file stayed green, 14/14,
   * because the paragraph justifying it was still there. Had that shipped,
   * the comment would have outlived the code it described and gone on
   * asserting a fact that had stopped being true — a masthead missing the
   * trader's P&L, guarded by a test that could not notice.
   *
   * This is the SECOND time in this shift that a comment satisfied an
   * assertion about behaviour, in a second file, written by the same hand
   * that had just fixed the first one. That is not a coincidence worth
   * shrugging at: heavily-commented code discusses itself in its own
   * vocabulary, so any source-scanning matcher is aimed at prose as much as
   * at code unless it is explicitly told not to be.
   *
   * A comment must not be able to satisfy an assertion about behaviour.
   */
  const source = (p: string) => {
    const raw = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, p),
      "utf8",
    ) as string;
    return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  };

  const july = source("./MainLayout.tsx");
  const access = source("./ShellAccessChrome.tsx");

  it("neither shell declares its own panel", () => {
    expect(july).toContain('from "@/components/layout/shellPanels"');
    expect(access).toContain('from "@/components/layout/shellPanels"');
    expect(july).not.toMatch(/function\s+SettingsPanel\s*\(/);
    expect(access).not.toMatch(/function\s+SettingsPanel\s*\(/);
    expect(july).not.toMatch(/function\s+SearchPanel\s*\(/);
    expect(access).not.toMatch(/function\s+SearchPanel\s*\(/);
  });

  it("neither shell counts the unread seed itself", () => {
    // Two headers filtering their own copy of the seed array is two owners of
    // one number, and the second would go on reading zero forever.
    expect(july).toContain("initialUnreadNotificationCount()");
    expect(access).toContain("initialUnreadNotificationCount()");
    expect(july).not.toContain("INITIAL_NOTIFS");
    expect(access).not.toContain("INITIAL_NOTIFS");
  });

  /**
   * ── THE TRADER'S OWN NUMBERS ARE ALSO CAPABILITIES ────────────────────────
   *
   * Realized paper P&L and the WM points balance were July-only, and the
   * mechanism was subtler than the panels above. The panels were July-only
   * because they were DRAWN in July's JSX. The P&L badge was July-only
   * because it was DECLARED in July's file — `function HeaderPnL()`, local,
   * unexported, sitting above MainLayout. Nothing prevented an OS room from
   * showing it; nothing could.
   *
   * That is the harder of the two to see in review. A missing `<Search/>` is
   * a missing element. A component you cannot import is a missing element
   * that also has no name to search for.
   *
   * These assert the SOURCE and not the render, and the reason is worth
   * stating rather than glossing: neither chip is present on first paint.
   * HeaderPnL reads localStorage in an effect and returns null until it has,
   * and the points chip is gated on a provider the static gates do not mount.
   * `renderToStaticMarkup` therefore cannot see either one, and a render
   * assertion here would be a test that passes for the wrong reason. Source
   * matching is the weaker instrument; it is the one that can actually
   * observe this fact.
   */
  it("the P&L badge is a module, not a function inside the July shell", () => {
    // The specific regression: if it moves back inside MainLayout, or a
    // second copy is declared in the access chrome, one of these fails.
    expect(july).not.toMatch(/function\s+HeaderPnL\s*\(/);
    expect(access).not.toMatch(/function\s+HeaderPnL\s*\(/);
    expect(july).toContain('from "@/components/layout/HeaderPnL"');
    expect(access).toContain('from "@/components/layout/HeaderPnL"');
  });

  it("both shells mount the same P&L badge and the same points balance", () => {
    // Mounted, not merely imported. An import nothing renders is exactly how
    // ShellAccessChrome's own header describes the capability going missing
    // the first time.
    for (const shell of [july, access]) {
      expect(shell).toMatch(/<HeaderPnL\s*\/>/);
      expect(shell).toMatch(/<WMSBar\s*\/>/);
    }
  });

  it("the chrome asks whether the points provider exists instead of assuming", () => {
    /**
     * PROVEN, NOT PREDICTED. Mounting <WMSBar/> here without this guard
     * turned SIX gate files red at once — every one with
     * "useWMS must be inside WMSProvider" — because `useWMS` throws and a
     * throwing chrome component does not lose its own chip, it takes the
     * whole shell down with it. The OS shell renders in trees the July
     * header never did, including renderToStaticMarkup with no providers.
     *
     * The guard stays because a points balance is not worth a blank screen.
     * `useWMS` keeps its throw because every PAGE that reads points and
     * finds no provider genuinely is misassembled.
     */
    expect(access).toContain("useWMSAvailable");
    expect(access).toMatch(/wmsAvailable\s*&&/);
    // And the throw it is avoiding must still be there for everyone else.
    const ctx = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../../contexts/WMSContext.tsx"),
      "utf8",
    ) as string;
    expect(ctx).toContain('throw new Error("useWMS must be inside WMSProvider")');
  });

  it("an OS room still renders when no points provider is mounted", () => {
    // The regression above, restated against behaviour rather than source.
    // HTML is built at module load with no providers at all; if the chrome
    // ever throws again, this file cannot even import.
    expect(HTML).toContain("wm-os-masthead");
    expect(HTML).not.toContain("WM pts");
  });
});
