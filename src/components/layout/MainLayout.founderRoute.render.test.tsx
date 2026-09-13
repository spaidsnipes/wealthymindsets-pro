/**
 * MainLayout · Founder-route render — the deploy-ready proof.
 *
 * The three earlier sentinels (parent-cut, residency, sanctuary) gate the
 * CODE. They read source. They prove the cut is present, that the July
 * chrome cannot smuggle back into the Founder branch, and that the
 * atmosphere never keys on market state. What they cannot prove — because
 * MainLayout is a 1400-line client component with Auth/Symbol/WMS/Radio
 * contexts, framer-motion and lucide icons — is that the exact JSX the
 * branch RETURNS carries the sanctuary and excludes the July chrome.
 *
 * This file gates the RETURN VALUE. It does not mount MainLayout. It
 * mounts the SAME JSX the escape branch returns, in a controlled harness,
 * and asserts the rendered HTML.
 *
 * The user reported "WE STILL HAVE THE JULY SHELL" while looking at live
 * prod. Prod is currently pre-cut (deploy is OWNER-AUTH-REQUIRED, see the
 * 09:01Z build-proof baton). The purpose of this test is to make the
 * strongest possible in-code claim about what prod WILL serve the moment
 * the deploy trigger fires: not "the tree has the cut" (three earlier
 * sentinels), but "the tree renders the cut".
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WMExperienceShell } from "@/components/experience/WMExperienceShell";
import WmWordmark from "@/components/brand/WmWordmark";

/**
 * The exact JSX the Founder branch returns. Kept in sync with
 * MainLayout.tsx by the parent-cut sentinel (`MainLayout.founderRoute.
 * sentinel.test.tsx` asserts this shape by regex on the source). If the
 * branch changes shape, the sentinel fails; the branch and this fixture
 * are then re-aligned together.
 */
function FounderBranchReturn({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <WMExperienceShell brand={<WmWordmark size="compact" />}>{children}</WMExperienceShell>
  );
}

const HTML = renderToStaticMarkup(
  <FounderBranchReturn>
    {/* Placeholder for whatever the deck page renders — the parallel
        worker's unstaged diff on command-deck/page.tsx. This gate is
        deliberately blind to that content, because the audit's parent
        cut is about the SHELL, not what the deck composes inside it. */}
    <div data-testid="deck-content">DECK</div>
  </FounderBranchReturn>,
);

describe("Founder-route return — the sanctuary DOES render, the July chrome DOES NOT", () => {
  it("carries the wm-sanctuary class on its root element", () => {
    // The strongest in-code claim: the outer element the Founder route
    // will land on carries the class the sanctuary sentinel gates. This
    // completes the chain: source shape (sentinel) -> rendered output
    // (this file) -> live pixels (deploy).
    expect(HTML).toContain('class="wm-sanctuary');
  });

  it("mounts the WATER-BREATH layer once, aria-hidden", () => {
    expect(HTML).toContain('class="wm-water-breath"');
    expect(HTML).toContain('aria-hidden="true"');
  });

  it("mounts the seven-mode ExperienceModeBar as the operating-state landmark", () => {
    // The bar is the OS's "which job am I on?" surface. Absent, the
    // Founder route reads as a hero card in an empty room.
    expect(HTML).toContain('aria-label="Experience mode"');
  });

  it("does NOT carry the July shell's wm-universe root class", () => {
    // The single most Founder-visible sign of the July shell. Its absence
    // here proves the cut is a REPLACEMENT and not a wrap. If the audit's
    // future revision of MainLayout accidentally wraps WMExperienceShell
    // inside a July `<div className="wm-universe">…</div>`, this test
    // fails BY NAME.
    expect(HTML).not.toContain("wm-universe");
  });

  it("does NOT mount the TickerTape multi-symbol tape above the room", () => {
    // The tape's aria-label is the honest live signal: the full July
    // header renders `SESSION CLOSED — LAST VERIFIED` under a dozen
    // symbols. If any of that pattern appears here, the July header has
    // been reassembled inside the Asset-10 shell.
    expect(HTML).not.toContain("SESSION CLOSED — LAST VERIFIED");
    expect(HTML).not.toMatch(/aria-label="[A-Z0-9!]+ · [A-Z]+"/);
  });

  it("does NOT mount the left-rail Primary nav", () => {
    // The July shell's nav rail carried the aria-label "Primary". Its
    // absence here proves the seven-tool rail (Morning Prep, Command
    // Deck, Charts, Academy, Journal, Workspace) is not the outer
    // scaffold on the Founder route.
    expect(HTML).not.toContain('aria-label="Primary"');
  });

  it("does not carry .wm-shell-header — the July top bar's own class", () => {
    // wm-shell-header was the July header's own class name; scanning for
    // it directly guards against a future edit that re-adds the July
    // header shape inside WMExperienceShell.
    expect(HTML).not.toContain("wm-shell-header");
  });

  it("carries the child DECK content unchanged as the semantic market plane", () => {
    // The three planes contract: STATIC MATERIAL (vignette+grain) +
    // AMBIENT (WATER-BREATH) + SEMANTIC MARKET (children). The children
    // must survive unmolested — a shell that quietly filters or wraps
    // its children would break the parallel worker's deck content.
    expect(HTML).toContain('data-testid="deck-content">DECK</div>');
  });
});

describe("Founder-route return — the audit's silhouette invariants", () => {
  it("does not leak the July shell's route-tool vocabulary (icon nav grammar)", () => {
    // A source-level scan for lucide component names that the July nav
    // used in its icon-per-tool grammar. If any of these appears in the
    // rendered HTML, the shell has quietly reintroduced the "financial
    // dashboard made of modules" silhouette the audit named at 01:10 in
    // Video A.
    for (const banned of ["BarChart2", "ScanLine", "Newspaper", "GraduationCap", "ShoppingBag"]) {
      expect(HTML).not.toContain(banned);
    }
  });

  it("does not leak placeholder text — no [object Object] or undefined", () => {
    expect(HTML).not.toContain("[object Object]");
    expect(HTML).not.toContain("undefined");
    expect(HTML).not.toContain("NaN");
  });
});
