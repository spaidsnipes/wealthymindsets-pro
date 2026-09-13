/**
 * Sanctuary owns the brand. Family pages do not print a second one.
 *
 * ── Why this suite exists ────────────────────────────────────────────────────
 *
 * The sanctuary shell (WMExperienceShell) renders the compact WM wordmark
 * as the FIRST paint of any Founder-family route. Before this fence,
 * morning-prep, journal, and nectar each rendered THEIR OWN <WmWordmark>
 * inside the page body — the trader saw:
 *
 *   [ WM · PRO ]  PREP  OBSERVE  WAIT  ...      ← sanctuary shell
 *   [ WM · PRO ]  OPENING BELL PROTOCOL         ← duplicate on morning-prep
 *
 * Two brands stacked in the first viewport is exactly the "new information
 * inside old composition" silhouette the Founder audit 2026-09-13 called
 * out. The sanctuary now owns brand identity for the whole family; no
 * family-page renders WmWordmark itself.
 *
 * This suite fences the discipline for EVERY route in FOUNDER_ROOM_ROUTES.
 * A future family addition (say, /prep-v2) that ships a page which imports
 * WmWordmark fails this test before it can ship.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FOUNDER_ROOM_ROUTES } from "./founderRoomRoutes";

const FAMILY_PAGE = (route: string): string => {
  // Map the route path to the app/… page file. Every family route has a
  // single top-level page.tsx today.
  const rel = `${route === "/command-deck" ? "command-deck" : route.slice(1)}/page.tsx`;
  return readFileSync(resolve(__dirname, "../../app", rel), "utf8");
};

describe("Founder-family pages do not duplicate the sanctuary's brand", () => {
  it.each(FOUNDER_ROOM_ROUTES)(
    "%s does not render WmWordmark inside its page body",
    (route) => {
      const src = FAMILY_PAGE(route);
      // No import — the compiler proves the JSX isn't used if the import
      // is absent. Cheaper and more definitive than string-matching the
      // component name in a giant file.
      expect(src, `${route} still imports WmWordmark`).not.toMatch(
        /import[^;]*WmWordmark[^;]*from\s*["']@\/components\/brand\/WmWordmark["']/,
      );
    },
  );

  it.each(FOUNDER_ROOM_ROUTES)(
    "%s does not render a second seven-mode bar",
    (route) => {
      // The shell owns the seven-mode bar. A family page rendering its
      // own ExperienceModeBar was the failure that killed the deck's
      // first F8 (fd24a80). Enforcing it for every family member now.
      const src = FAMILY_PAGE(route);
      expect(src, `${route} imports ExperienceModeBar`).not.toContain(
        'from "@/components/experience/ExperienceModeBar"',
      );
      expect(src, `${route} renders a local <ExperienceModeBar />`).not.toContain(
        "<ExperienceModeBar",
      );
    },
  );
});
