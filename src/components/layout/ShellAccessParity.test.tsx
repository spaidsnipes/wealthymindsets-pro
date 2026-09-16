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
import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WMExperienceShell } from "@/components/experience/WMExperienceShell";

const HTML = renderToStaticMarkup(
  <WMExperienceShell brand={<span>WM</span>}>
    <div data-testid="room">ROOM</div>
  </WMExperienceShell>,
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

describe("one OS · both shells mount the SAME panels", () => {
  /**
   * The point of the extraction was that there is ONE settings dialog, not an
   * OS-palette copy with its own drift schedule. Asserting both importers name
   * the same module is the cheapest way to notice a second copy appearing.
   */
  const source = (p: string) =>
    require("node:fs").readFileSync(require("node:path").resolve(__dirname, p), "utf8") as string;

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
});
