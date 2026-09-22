/**
 * ONE OS — the four capabilities must be reachable from an OS room.
 *
 * ── THE MEASURED DEFECT THIS GATE CLOSES ──────────────────────────────
 * `MainLayout` returns two different shells after auth. The OS-framed rooms
 * get `WMExperienceShell`; everything else gets the July `wm-universe` markup.
 * Search, notifications, settings and sign-out were drawn ONLY in the July
 * branch, as file-private functions. Read plainly, that meant:
 *
 *   A trader standing in /command-deck — at the time, the room the product
 *   opened on; the landing moved to /charts on 2026-09-17 — could not search
 *   for a symbol, could not open their settings, and could NOT SIGN OUT,
 *   without first walking to a room that still wore July.
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
    /**
     * REMAPPED 2026-09-19 — this test asserted the defect.
     *
     * It required the literal `aria-controls="wm-symbol-search-dialog"` (and
     * the two drawers) in THIS string — which is the CLOSED first paint, the
     * very frame the test three cases below proves contains no dialog at all
     * (`expect(HTML).not.toContain('id="wm-symbol-search-dialog"')`). So one
     * test in this file demanded a reference and another proved its target was
     * absent, and the suite was green with both.
     *
     * MEASURED 2026-09-19 on live /charts at 1920: all three masthead triggers
     * reported their `aria-controls` while `getElementById` returned null.
     *
     * A dangling `aria-controls` is not ignored — it is FOLLOWED. The reader
     * offers the jump, the human takes it, nothing is there and nothing is
     * said, which reads as a broken page rather than a shut drawer.
     *
     * The law this test MEANT is intact and is checked below: a masthead icon
     * that announces nothing is a picture. `aria-haspopup` says a dialog is
     * coming and `aria-expanded` says it is currently shut — together that is
     * the complete, honest disclosure, with no promise the frame cannot keep.
     */
    expect(HTML).toContain('aria-haspopup="dialog"');
    expect(HTML).toContain('aria-haspopup="menu"');
    expect(HTML).toContain('aria-expanded="false"');
  });

  it("every aria-controls in the frame names an id the same frame actually drew", () => {
    /**
     * This is the assertion the remapped test above could not make, and it is
     * strictly stronger than either the literal it replaced or a source scan.
     * `HTML` is a whole rendered frame, so the reference can be RESOLVED here
     * rather than merely spelled — the one thing the live browser does and a
     * source Sentinel cannot.
     *
     * Note the rail toggle legitimately claims `wm-os-rail` in this frame: it
     * is rendered with `railDefaultOpen`, so the rail exists and the claim is
     * true. That is the point. The law is not "never claim" — it is "claim
     * only what is there", and this check can tell those two apart.
     */
    const claimed = [...HTML.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
    const dangling = [...new Set(claimed)].filter((id) => !HTML.includes(`id="${id}"`));
    expect(
      dangling,
      "a control in this frame points aria-controls at an id the frame never rendered. " +
        "A dangling reference is FOLLOWED, not ignored: the reader offers the jump, the human " +
        "takes it, and nothing is there and nothing is said",
    ).toEqual([]);
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
    //
    // The matcher closes on `<` and not on `</a>` DELIBERATELY. A door may
    // carry a chip after its label — /command-deck carries LEGACY since the
    // M3 quarantine — and `>Command Deck</a>` went red for a rail that was
    // drawing the label perfectly well. That failure was this gate reporting
    // a MARKUP SHAPE, not the naming drift it exists to catch. `>Label<`
    // still pins the label as the anchor's first text and still fails on
    // "Chart" vs "Charts"; it simply stops caring what follows it.
    const missing = WM_DESTINATIONS.filter((d) => !HTML.includes(`>${d.label}<`));
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
  it("renders the phone bar with every door the owner declares", () => {
    expect(HTML).toContain('data-testid="os-phone-nav"');
    const doors = phoneNavDestinations();
    // FOUR, exactly. Five until 2026-09-19: /command-deck lost its slot when
    // M3 killed the deck's last standing claim to be a peer home — the landing
    // had already moved to /charts on 2026-09-17, and a permanent door on the
    // smallest screen was the one surface still presenting two homes. This is
    // an exact count, not a >= floor, because REGROWING a slot is the same
    // decision class as removing one and must show up in a diff.
    expect(doors).toHaveLength(4);
    expect(doors.map((d) => d.href)).not.toContain("/command-deck");
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

  /**
   * ── REMAPPED 2026-09-19 · "KEEPS THE ONE LABELLED DOOR" ────────────────
   *
   * This test used to require `data-testid="os-rail-toggle"` and
   * `aria-label="Rooms"` to be PRESENT on the instrument view. It was written
   * as the anti-amputation half of the phone-strip cut, and it was honest
   * then. It is also, read today, the sentinel that would have made this
   * shift's cut impossible: it pins a control labelled "Rooms" above a live
   * market and calls that the repair.
   *
   * The fresh 2026-09-21/22 Drive authority keeps the market scene as HOME and
   * restores exactly one compact Rooms doorway for destinations that genuinely
   * change the human job. Workspace and Tools remain the two scene-equipment
   * plates; the old destination mall and Command Deck throne do not return.
   */
  it("offers two pieces of scene equipment plus one compact changed-job doorway", () => {
    expect(INSTRUMENT_HTML).toContain('data-testid="os-equipment-workspace"');
    expect(INSTRUMENT_HTML).toContain('data-testid="os-equipment-tools"');
    expect(INSTRUMENT_HTML).toContain('data-testid="os-market-rooms"');
    // ── THE SECOND DOORWAY, ADDED 2026-09-22 ────────────────────────────────
    // Measured on prod before this: in equipment mode the Community block
    // rendered `null`, so /lounge, /tv, /radio, /creator, /partnerships, /shop
    // and the trader's own /profile had NO door from HOME. This line is the
    // one that fails if that absence ever comes back.
    expect(INSTRUMENT_HTML).toContain('data-testid="os-market-community"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Community"');
    expect(INSTRUMENT_HTML).toContain('data-presentation="direct-doorway"');
    expect(INSTRUMENT_HTML).toContain("wm-os-provenance--masthead-owned");
    expect(INSTRUMENT_HTML).toContain('aria-label="Workspace"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Tools"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Rooms"');
    // The old rail toggle does not return: this is a separate compact doorway
    // with a curated changed-job list, not the twenty-one-destination mall.
    expect(INSTRUMENT_HTML).not.toContain('data-testid="os-rail-toggle"');
    // Exactly two EQUIPMENT plates remain. Rooms is intentionally compact and
    // therefore must never masquerade as a third piece of equipment.
    expect(INSTRUMENT_HTML.match(/data-testid="os-equipment-/g)).toHaveLength(2);
  });

  it("fuses market utilities into one attention chunk without hiding a capability", () => {
    expect(INSTRUMENT_HTML).toContain('data-presentation="compact-strip"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Search symbols"');
    expect(INSTRUMENT_HTML).toContain("notifications");
    expect(INSTRUMENT_HTML).toContain('aria-label="Open settings"');
    expect(INSTRUMENT_HTML).toContain('aria-label="Open profile menu"');
  });

  it("does not advertise the other house above price", () => {
    // The second throne had two carriers on this route: the rail's door and a
    // gold "COMMAND DECK →" chip in the chart's own action row. The chip is
    // ChartsDashboard's and is pinned dead by chartPhoneControlReachability;
    // this is the frame's half.
    expect(INSTRUMENT_HTML).not.toContain('href="/command-deck"');
    expect(INSTRUMENT_HTML).not.toContain("Command Deck");
  });

  it("a rail room's opened sheet still reaches every door the owner declares", () => {
    // ── WHY THIS ASSERTS THE FRAME AND NOT THE SHELL ──────────────────
    // OPEN_SHEET_HTML is a `destinations="rail"` room with the rail open —
    // /journal, /lounge, /shop, every room where choosing where to go next IS
    // the job. Those rooms did not change this shift and must not: the strip
    // they gave up is still replaced by a sheet carrying MORE doors than it
    // ever did, not fewer.
    //
    // It is no longer a claim about the instrument view. /charts has no room
    // list at any width now, by design, and the test directly above is the
    // gate that says so.
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

  /**
   * ── THIS GUARD WENT VACUOUS, AND IS RE-AIMED RATHER THAN RELAXED ──────────
   *
   * The assertion above reads SOURCE. On 2026-09-21 the points balance was
   * route-scoped off the instrument view per canon F24 — whose top band carries
   * the two brass plates and one fidelity chip, and no gamification counter.
   * `<WMSBar />` still appears in the access chrome's source, so the line above
   * stayed green while quietly ceasing to mean "the points balance reaches the
   * masthead". A guard that is still passing and no longer says what it claims
   * is worse than a red one, because nobody looks at it.
   *
   * So it is made TWO-SIDED here rather than loosened. Parity above is kept
   * untouched — one component, both shells, no second copy. This adds the other
   * half: the suppression must be a ROUTE-SCOPED PROP with a permissive
   * default, and it must be WIRED at the call site. Deleting the balance
   * outright, or defaulting the prop to false, or adding the prop and never
   * passing it — all three fail here, and the third is exactly the state this
   * atom was in an hour before it shipped.
   *
   * SOURCE AND NOT RENDER, for the reason the block above already states: the
   * chip is gated on `useWMSAvailable`, and these static gates mount no
   * provider, so BOTH renders omit it and a render assertion could not tell the
   * two routes apart. `HTML`/`INSTRUMENT_HTML` still carry the one render-level
   * fact available — see "an OS room still renders when no points provider is
   * mounted" below, which asserts no "WM pts" reaches any masthead at all.
   */
  it("× THE COUNTER OVER A LIVE MARKET: points are route-scoped, not deleted", () => {
    const shell = source("../experience/WMExperienceShell.tsx");

    // 1. The capability is gated on a named prop, not on a router read. The
    //    chrome renders in provider-less trees — this very file builds its HTML
    //    that way — so a `usePathname()` here would take the whole shell down.
    expect(access).toMatch(/showPoints\s*&&\s*wmsAvailable/);
    expect(access).not.toMatch(/usePathname/);

    // 2. The default is PERMISSIVE. Every call site that says nothing keeps the
    //    balance; it can only go missing where someone WROTE that it should.
    expect(access).toMatch(/showPoints\s*=\s*true/);

    // 3. And it is actually WIRED. A prop nobody passes changes no pixel.
    expect(shell).toMatch(
      /<ShellAccessChrome\s+showPoints=\{!onInstrumentView\}\s+compact=\{onInstrumentView\}\s*\/>/,
    );

    // 4. POSITIVE CONTROL on the predicate itself: `onInstrumentView` must be
    //    the route test, not a free variable that could drift to anything.
    expect(shell).toMatch(
      /const\s+onInstrumentView\s*=[\s\S]{0,120}INSTRUMENT_VIEW_ROUTE/,
    );
  });

  /**
   * × THE NAMEPLATE OVER A LIVE MARKET — the same atom's other half.
   *
   * F24's band carries the two plates and the fidelity chip. The build's band
   * also carried "Instrument View", a room name sitting between the equipment
   * and the only market reading in the band. On every other room that name
   * earns its place; here the candles answer "which room is this" before any
   * text can.
   *
   * SOURCE, for a reason worth naming rather than assuming: these gates render
   * the shell with no PAGE mounted, so nothing has called `usePublishOsStanding`
   * and `surface` is absent in BOTH renders. A render assertion would pass
   * today and would go on passing if the suppression were reverted — the
   * vacuous-guard failure this whole block exists to correct.
   *
   * `null` IS PART OF THE ASSERTION, NOT INCIDENTAL SYNTAX. The frame drops the
   * slot AND the 1px divider before it only on `null`; `undefined` leaves a
   * separator floating beside nothing. So the matcher pins the literal.
   */
  it("× THE NAMEPLATE: the room name is route-scoped off the instrument view", () => {
    const shell = source("../experience/WMExperienceShell.tsx");
    expect(shell).toMatch(
      /surface=\{\s*onInstrumentView\s*\?\s*null\s*:\s*standing\.surface\s*\}/,
    );
    // Route-scoped, NOT deleted: the publisher is untouched, so the standing
    // context, the phone masthead and the provenance footer keep a real name.
    expect(shell).toContain("standing.surface");
  });

  /**
   * × THE MATTING — C-101 "charts 70% FLOOR AREA".
   *
   * The canon draws exactly two pieces of axis furniture around the candles:
   * the price axis on the RIGHT and the time axis along the BOTTOM. The build
   * drew a third thing outside both — `os-room`'s own `padding: "14px 18px"`,
   * MEASURED on production 2026-09-21 at 1440×900 as 28px of height and 36px
   * of width. The chart already rules its own edges; that mat framed a machine
   * as if it were a picture.
   *
   * TWO ASSERTIONS, NOT ONE, and the pairing is the point. A prop that is
   * accepted at the call site and never spent inside the frame is the exact
   * silent revert this guard exists to catch: the shell's line below would go
   * on reading perfectly while the padding came back.
   */
  it("× THE MATTING: the market's room bleeds, every other room keeps its mat", () => {
    const shell = source("../experience/WMExperienceShell.tsx");
    const frame = source("../os/WMOperatingSystem.tsx");
    // Anti-vacuity: `source()` strips comments, and "" satisfies every
    // `toMatch` below exactly as badly as it satisfies a `not.toMatch`.
    expect(frame.length, "the frame read as nothing").toBeGreaterThan(2000);

    // ASKED — route-scoped, not global. A global bleed would put text against
    // the frame edge in every card room in the product.
    expect(
      shell,
      "the instrument view is matted again; C-101 spends that glass on the market",
    ).toMatch(/room=\{\s*onInstrumentView\s*\?\s*"bleed"\s*:\s*"matted"\s*\}/);

    // SPENT — the frame actually branches on it, in both places it costs.
    expect(frame, "the frame takes `room` but never spends it on padding").toMatch(
      /padding:\s*room === "bleed" \? 0 : "14px 18px"/,
    );
    expect(frame, "the frame takes `room` but never spends it on the gap").toMatch(
      /gap:\s*room === "bleed" \? 0 : 12/,
    );

    // DEFAULT — a room that says nothing keeps today's pixels.
    expect(frame, "`room` no longer defaults to matted — silent blast radius").toMatch(
      /room = "matted"/,
    );
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
