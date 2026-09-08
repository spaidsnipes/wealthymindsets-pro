import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("responsive P0 command surfaces", () => {
  const css = source("../app/globals.css");

  it("replaces desktop rails with a focused mobile command bar", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    expect(layout).toContain('className="wm-primary-sidebar"');
    expect(layout).toContain('className="wm-mobile-nav"');
    expect(layout).toContain('aria-label="Primary navigation"');
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain(".wm-primary-sidebar,");
    expect(css).toContain(".wm-chart-watchlist,");
    expect(css).toContain(".wm-chart-dom,");
    expect(css).toContain(".wm-music-player,");
    expect(css).toContain(".wm-draw-rail");
    expect(css).toContain("(orientation: landscape)");
    expect(css).toContain("margin-left: calc(56px + env(safe-area-inset-left))");
    expect(css).toContain("border-right: 1px solid rgba(232,185,35,.18)");
  });

  it("hides the watchlist rail only where something else offers the watchlist", () => {
    // MEASURED on the running app at 375px before this Sentinel existed:
    // `.wm-chart-watchlist` display:none (still mounted), `.wm-chart-primary-rail`
    // display:none (the toggle that would reveal it), and all four watchlist
    // controls present with zero client rects. The capability had no surface AND
    // no door. Master Index parity law: a limitation must be explicit and owned,
    // not accidental drift. The CSS hide rule above is correct — a 200px rail
    // does not belong on a phone — so the fix RELOCATES the capability.
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const panel = source("../components/chart/WatchlistPanel.tsx");

    // One owner of "this screen is too narrow", shared with the CSS below.
    expect(dashboard).toContain("useNarrowViewport");

    // Exactly one instance at any width: rail OR sheet, never both. Two live
    // copies would mean two poll loops against the same quote endpoint.
    expect(dashboard, "the rail must not render where CSS is hiding it")
      .toContain("{!narrowViewport && (");
    expect(dashboard, "the narrow-viewport surface is the drawer, not a second rail")
      .toContain("{narrowViewport && watchlistSheetOpen && (");

    // A reachable door, wired to the drawer it opens.
    expect(dashboard).toContain('id="chart-watchlist-sheet"');
    expect(dashboard).toContain('aria-controls="chart-watchlist-sheet"');

    // Reuse, not a phone-specific fork of the watchlist.
    expect(dashboard).toContain('variant="sheet"');
    expect(panel, "the sheet must not wear the class globals.css hides")
      .toContain('isSheet ? "wm-chart-watchlist-sheet" : "wm-chart-watchlist"');
  });

  it("gives the watchlist sheet the phone tap standard the rail does not need", () => {
    // MEASURED in the sheet at 375px when it first shipped: header controls
    // came out 12, 12, 16, 17, 18, 20 and 21px — the rail's mouse geometry,
    // relocated onto a phone. This repo's phone standard is 44px, already
    // enforced above for .wm-shell-action.
    //
    // Deliberately NOT fixed by stretching invisible hit areas over small
    // controls: at their 4-8px spacing those areas would overlap and a tap
    // would land on whichever won the z-order rather than what was under the
    // finger. The sheet gets real size AND real spacing, so each control's
    // hit area IS its visible box.
    const panel = source("../components/chart/WatchlistPanel.tsx");

    // The 44px box is conditional on the sheet — the rail keeps its density.
    const tap = panel.match(/const tap = isSheet[\s\S]{0,220}?;/);
    expect(tap, "the sheet tap box must be declared and gated on isSheet").not.toBeNull();
    expect(tap![0]).toMatch(/width:\s*44/);
    expect(tap![0]).toMatch(/height:\s*44/);
    expect(tap![0], "the rail must not inherit the phone box").toMatch(/:\s*null/);

    // Every icon-only header control must actually wear it. Icon buttons are
    // the ones that were 12px; a new one added without ...tap is the drift.
    const spreads = panel.match(/\.\.\.tap/g) ?? [];
    expect(spreads.length, "each icon-only header control must spread ...tap")
      .toBeGreaterThanOrEqual(5);

    // Text controls hit 44 via minHeight rather than a square box.
    expect(panel).toMatch(/minHeight:\s*isSheet\s*\?\s*44/);

    // Icons scale with the box, otherwise a 44px button holds a 12px glyph.
    expect(panel).toMatch(/const iconPx = isSheet \? \d+ : 12/);

    // Icon-only controls must still say what they are.
    expect(panel).toContain('aria-label="Grid view"');
    expect(panel).toContain('aria-label="List view"');
    expect(panel).toContain('aria-label="Create new watchlist"');
    expect(panel).toContain('aria-label="Change row sort order"');
  });

  it("keeps the JS relocation breakpoint and the CSS hide breakpoint the same number", () => {
    // If these drift, both failure modes are silent:
    //   CSS hides at 1023, JS relocates at 768  -> 768–1023px has no watchlist.
    //   CSS hides at 1023, JS relocates at 1280 -> 1023–1280px has two.
    const responsive = source("./responsive/narrowViewport.ts");
    const declared = responsive.match(/NARROW_VIEWPORT_MAX_PX\s*=\s*(\d+)/);
    expect(declared, "narrowViewport.ts must export a literal breakpoint").not.toBeNull();

    const px = declared![1];
    const at = css.indexOf(`@media (max-width: ${px}px)`);
    expect(at, `globals.css has no @media (max-width: ${px}px) block to match`).toBeGreaterThan(-1);

    const block = css.slice(at, css.indexOf("}", css.indexOf("{", at)));
    expect(block, "the watchlist must be hidden by the same breakpoint JS relocates at")
      .toContain(".wm-chart-watchlist,");
  });

  it("hides the drawing rail only where something else offers the drawing tools", () => {
    // globals.css hides .wm-draw-rail at the same breakpoint it hides the
    // watchlist. Twenty tools — trend line, ray, fib retracement — were mounted
    // at zero size with no visible control reaching any of them: a trader on a
    // phone could not draw a trendline. Hiding is not relocating.
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const sidebar = source("../components/chart/LeftDrawingSidebar.tsx");

    expect(dashboard, "the rail must not render where CSS is hiding it")
      .toContain("{!narrowViewport && <LeftDrawingSidebar");
    expect(dashboard, "the narrow-viewport surface is the drawer, not a second rail")
      .toContain("{narrowViewport && drawSheetOpen &&");
    expect(dashboard).toContain('id="chart-draw-sheet"');
    expect(dashboard).toContain('aria-controls="chart-draw-sheet"');
    expect(dashboard).toContain('<LeftDrawingSidebar {...drawingSidebarProps} variant="sheet" />');

    // One props object, spread into both call sites. Written out twice, the
    // rail and the sheet quietly become two different drawing surfaces.
    const declarations = dashboard.match(/const drawingSidebarProps\b/g) ?? [];
    expect(declarations.length, "drawingSidebarProps must be declared exactly once").toBe(1);
    const spreads = dashboard.match(/\{\.\.\.drawingSidebarProps\}/g) ?? [];
    expect(spreads.length, "both the rail and the sheet must spread the same props").toBe(2);

    expect(sidebar, "the sheet must not wear the class globals.css hides")
      .toContain('isSheet ? "wm-draw-sheet" : "wm-draw-rail"');
    expect(sidebar, "the sheet's tool buttons must meet the phone tap standard")
      .toMatch(/\.wm-draw-sheet \.wm-draw-btn[\s\S]{0,80}?44px/);
  });

  it("keeps the drawing rail hidden by the same breakpoint that opens its drawer", () => {
    const responsive = source("./responsive/narrowViewport.ts");
    const px = responsive.match(/NARROW_VIEWPORT_MAX_PX\s*=\s*(\d+)/)![1];
    const at = css.indexOf(`@media (max-width: ${px}px)`);
    const block = css.slice(at, css.indexOf("}", css.indexOf("{", at)));
    expect(block, "the draw rail must be hidden by the same breakpoint JS relocates at")
      .toContain(".wm-draw-rail");
  });

  it("clamps the drawing style popover to the viewport instead of off its right edge", () => {
    // The popover anchors at rail.right + 6. In a 320px drawer on a 375px
    // phone that puts a 220px panel past the screen edge, so the style
    // controls exist but cannot be reached.
    const sidebar = source("../components/chart/LeftDrawingSidebar.tsx");
    const panel = source("../components/chart/DrawingToolsPanel.tsx");

    expect(panel, "the popover's width must be exported, not copied")
      .toMatch(/export const DRAWING_STYLE_POPOVER_WIDTH_PX\s*=\s*\d+/);
    expect(panel, "the popover must consume its own exported width")
      .toContain("width: DRAWING_STYLE_POPOVER_WIDTH_PX");
    expect(sidebar, "the caller must clamp using that same exported number")
      .toContain("DRAWING_STYLE_POPOVER_WIDTH_PX");
    expect(sidebar).toMatch(/Math\.max\(8,\s*Math\.min\(left,\s*maxLeft\)\)/);
  });

  it("hides the primary tool rail only where something else offers capture and share", () => {
    // Measured at 375px: .wm-chart-primary-rail was display:none at 0x0 with
    // seven controls mounted — Publish idea, Record video idea, Speak your
    // mind, Screenshot chart (PNG), Record screen, Chart layout — none of
    // which any visible control on a phone could reach.
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const sidebar = source("../components/chart/LeftSidebar.tsx");

    expect(dashboard, "the rail must not render where CSS is hiding it")
      .toContain("{!narrowViewport && <LeftSidebar");
    expect(dashboard).toContain("{narrowViewport && toolsSheetOpen &&");
    expect(dashboard).toContain('id="chart-tools-sheet"');
    expect(dashboard).toContain('aria-controls="chart-tools-sheet"');
    expect(dashboard).toContain('<LeftSidebar {...primarySidebarProps} variant="sheet" />');

    // The rail and the sheet must capture the SAME node and publish the SAME
    // symbol. Two prop literals is how a phone screenshots something else.
    const declared = dashboard.match(/const primarySidebarProps\b/g) ?? [];
    expect(declared.length, "primarySidebarProps must be declared exactly once").toBe(1);
    const spreads = dashboard.match(/\{\.\.\.primarySidebarProps\}/g) ?? [];
    expect(spreads.length, "both the rail and the sheet must spread the same props").toBe(2);

    expect(sidebar, "the sheet must not wear the class globals.css hides")
      .toContain('isSheet ? "wm-chart-primary-sheet" : "wm-chart-primary-rail"');
    expect(sidebar, "sheet controls must meet the phone tap standard")
      .toMatch(/isSheet[\s\S]{0,120}?minHeight:\s*44/);
  });

  it("does not give the watchlist a second door it cannot open", () => {
    // The narrow-viewport watchlist already has a door: the Watchlist trigger
    // onto #chart-watchlist-sheet. The rail's own toggle flips `watchlistOpen`,
    // which governs a rail that is display:none there — repeating it in the
    // sheet would ship a control that looks live and changes nothing.
    const sidebar = source("../components/chart/LeftSidebar.tsx");
    expect(sidebar, "the watchlist toggle must be rail-only")
      .toMatch(/\{!isSheet && \([\s\S]{0,400}?onClick=\{onToggleWatchlist\}/);
  });

  it("states why a relocated control is unavailable instead of shipping it dead", () => {
    // LeftSidebar's own header: "Every action is REAL — no placeholder
    // buttons." getDisplayMedia does not exist on iOS Safari at any width, so
    // an unconditional Record screen button in a phone drawer would be exactly
    // that placeholder. Detected at runtime — the desktop browser emulating a
    // 375px viewport is not the browser a phone runs.
    const sidebar = source("../components/chart/LeftSidebar.tsx");
    expect(sidebar).toMatch(/typeof navigator\.mediaDevices\?\.getDisplayMedia !== "function"/);
    expect(sidebar, "the reason must be shown, not just the disabled state")
      .toContain("disabledReason={screenCaptureUnavailable}");
    expect(sidebar).toMatch(/disabled=\{!!disabledReason\}/);
    expect(sidebar, "an unavailable control must announce why to a screen reader")
      .toContain("unavailable: ${disabledReason}");
    expect(sidebar, "an unavailable control must not still fire its action")
      .toContain("onClick={disabledReason ? undefined : onClick}");
  });

  it("keeps relocation subscribed to the viewport, not read once at mount", () => {
    // A tablet rotating portrait->landscape crosses 1023px WITHOUT a reload.
    // If useNarrowViewport ever degrades to a one-shot read, the CSS still
    // flips (it is a live media query) but the JS does not: the rails become
    // display:none while their drawers stay unrendered and their triggers
    // stay hidden — every capability this file exists to protect strands
    // again, in a state no reload reproduces.
    //
    // This is a SOURCE guard, and deliberately so. The suite has no DOM
    // environment, and the live instrument cannot reach this: preview_resize
    // changes viewport metrics via CDP without dispatching resize or
    // matchMedia change to the page — measured, crossing 375->1280 fired 0
    // resize and 0 change events. So the rotation path is correct by
    // inspection and UNVERIFIED BY EXECUTION; this asserts the subscription
    // that makes it correct cannot be removed silently.
    const responsive = source("./responsive/narrowViewport.ts");
    expect(responsive, "the hook must subscribe to breakpoint changes")
      .toContain('mq.addEventListener("change", sync)');
    expect(responsive, "the subscription must be torn down")
      .toContain('mq.removeEventListener("change", sync)');
    expect(responsive, "Safari <14 has no addEventListener on MediaQueryList")
      .toMatch(/mq\.addListener\(sync\)/);
    expect(responsive).toMatch(/mq\.removeListener\(sync\)/);
    expect(responsive, "the initial value must still be synced on mount")
      .toMatch(/const sync = \(\) => setNarrow\(mq\.matches\);\s*\n\s*sync\(\);/);
  });

  it("compresses the desktop product map into five human jobs plus one workspace menu", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    const coreBlock = layout.slice(layout.indexOf("const NAV_CORE"), layout.indexOf("const NAV_WORKBENCH"));
    expect(coreBlock.match(/href:/g)).toHaveLength(5);
    expect(layout).toContain('aria-label="Open workspace menu"');
    expect(layout).toContain('id="wm-workspace-menu"');
    expect(layout).toContain("Everything, without the clutter.");
    expect(layout).toContain("<ShellModalDrawer");
    expect(layout).toContain("fallbackTriggerRef={workspaceTriggerRef}");
    expect(layout).toContain("{ title: \"Market tools\", items: NAV_WORKBENCH }");
    expect(layout).toContain("{ title: \"Community & business\", items: NAV_BOTTOM }");
  });

  it("keeps the challenge lab visibly inside Academy instead of exposing a sixth product", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    const challenge = source("../app/proof-lane/page.tsx");
    expect(layout).toContain('return href === "/education" && pathname.startsWith("/proof-lane")');
    expect(layout).toContain("isPrimaryDestinationActive(pathname, href)");
    expect(challenge).toContain('href="/education"');
    expect(challenge).toContain(">Challenge Lab</h1>");
    expect(challenge).toContain("This private Academy lesson models");
    expect(challenge).toContain('className="h-full overflow-y-auto bg-[#050506]');
    expect(challenge).not.toContain('className="min-h-screen');
  });

  it("keeps the Command Deck proof chain available without stacking it into the primary read", () => {
    const deck = source("../app/command-deck/page.tsx");
    expect(deck).toContain('className="wm-cd-evidence-drawer"');
    expect(deck).toContain("Evidence &amp; reasoning");
    expect(deck).toContain("Open the proof chain");
    expect(deck.indexOf("wm-cd-evidence-drawer")).toBeLessThan(deck.indexOf("<DecisionWhyPanel"));
    expect(deck.indexOf("wm-cd-evidence-drawer")).toBeLessThan(deck.indexOf("<MarketCanvasPanel"));
    expect(deck).toContain("setProofChainOpen(deckEmphasis.emphasizeWhy)");
    expect(deck).not.toContain("deckEmphasis.emphasizeWhy || deckEmphasis.passportOpen");
    expect(deck).not.toContain("CinematicAtmosphere");
    expect(deck).not.toContain("DoctrineTagline");
  });

  it("keeps the multi-broker entry point visible at the right edge of the chart toolbar", () => {
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(toolbar).toContain('aria-label="Connect one or more brokers"');
    expect(toolbar).toContain('style={{ position: "sticky", right: 0');
    expect(toolbar).toContain("Connect brokers");
    expect(dashboard).not.toContain('aria-label="Connect one or more brokers"');
    expect(dashboard).not.toContain("> Brokers");
  });

  it("opens charts around price action while preserving the trader's watchlist choice", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(dashboard).toContain('lsGet("wm_chart_watchlist_open", false)');
    expect(dashboard).toContain('localStorage.setItem("wm_chart_watchlist_open"');
    // The rail's toggle moved from a JSX literal into primarySidebarProps when
    // the rail gained a narrow-viewport sheet. Same wiring, same persisted
    // state — assert the invariant rather than the punctuation it was in.
    expect(dashboard).toContain("onToggleWatchlist: () => setWatchlistOpen(v => !v)");
  });

  it("keeps chart appearance available without two competing theme buttons", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(dashboard).toContain("Chart appearance:");
    expect(dashboard).toContain("Switch appearance.");
    expect(dashboard.match(/className={`wm-theme-toggle/g)).toHaveLength(1);
  });

  it("removes the retired Harlem Nights identity from active product surfaces", () => {
    const lounge = source("../app/lounge/page.tsx");
    const profile = source("../app/profile/page.tsx");
    expect(lounge).not.toMatch(/Harlem Nights/i);
    expect(profile).not.toMatch(/Harlem Nights/i);
    expect(profile).toContain("Wealthy Mindsets");
  });

  it("fails Lounge into one calm runtime-truth canvas instead of crashing or rendering empty rails", () => {
    const lounge = source("../app/lounge/page.tsx");
    expect(lounge).toContain('data-lounge-runtime="not-configured"');
    expect(lounge).toContain("Lounge is not configured on this runtime");
    expect(lounge).toContain("No community records were requested");
    expect(lounge).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(lounge).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)");
    expect(lounge.indexOf('if (!loungeClient) {')).toBeLessThan(lounge.indexOf('aria-label="Open community tools"'));
  });

  it("makes configured Lounge filters and rooms progressive disclosure instead of a fixed rail", () => {
    const lounge = source("../app/lounge/page.tsx");
    expect(lounge).toContain('aria-label="Open community tools"');
    expect(lounge).toContain('aria-expanded={showCommunityTools}');
    expect(lounge).toContain('aria-label="Community tools"');
    expect(lounge).not.toContain('style={{width:200,flexShrink:0}}');
  });

  it("makes multi-provider selection an honest reviewable setup queue", () => {
    const brokers = source("../components/broker/BrokerConnectPanel.tsx");
    const readiness = source("../app/readiness/page.tsx");
    expect(brokers).toContain("broker setup queue");
    expect(brokers).toContain("Review setup queue");
    expect(brokers).toContain("verification still happens independently");
    expect(brokers).toContain("selectedOnly ? selected.has(b.id) : b.category === tab");
    expect(brokers).not.toContain("providers selected · verify each connection");
    expect(readiness).toContain("Connect or review brokers");
    expect(readiness).toContain("Connect one broker or several.");
    expect(readiness).toContain("<BrokerConnectPanel");
    expect(readiness).toContain("How connection status works");
    expect(readiness).toContain("Technical receipt");
    expect(readiness).toContain("This provider still needs setup in the current runtime.");
    expect(brokers).toContain("Signed OpenAPI check · read-only account proof");
    expect(brokers).toContain("Webull Connect OAuth—authorize, callback, token refresh");
    expect(brokers).toContain("Signing into Webull&apos;s website is separate and does not connect this app.");
  });

  it("keeps long-form Nectar and Command Deck surfaces vertically reachable", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    expect(layout).toContain('pathname === "/nectar"');
    expect(layout).toContain('pathname.startsWith("/nectar/")');
    expect(layout).toContain('data-scroll-owner={documentScroll ? "shell" : "workspace"}');
    expect(layout).toContain('overflowY: documentScroll ? "auto" : "hidden"');
    expect(layout).toContain('{ position: "relative", minHeight: "100%" }');
  });

  it("contains the phone shell while preserving 44px primary controls", () => {
    const layout = source("../components/layout/MainLayout.tsx");
    const drawer = source("../components/layout/ShellModalDrawer.tsx");
    const vault = source("../components/layout/HeaderVaultPill.tsx");
    expect(layout).toContain('className="wm-shell-actions');
    expect(layout.match(/wm-shell-action/g)?.length).toBeGreaterThanOrEqual(4);
    expect(layout).toContain('className="wm-shell-avatar');
    expect(layout).toContain('className="wm-mobile-hide flex items-center gap-1 px-2');
    expect(css).toContain(".wm-shell-action,");
    expect(css).toContain("width: 44px !important");
    expect(css).toContain("min-height: 44px !important");
    expect(vault).toContain("minHeight: 44");
    expect(drawer).toContain("max-w-[100vw]");
    expect(drawer).toContain("width: `min(${width}px, 100vw)`");
    expect(drawer).toContain("h-11 w-11");
  });

  it("does not force an installed phone into one orientation", () => {
    const manifest = JSON.parse(source("../../public/manifest.json"));
    expect(manifest.orientation).toBe("any");
  });

  it("keeps chart truth and navigation visible without stacking desktop chrome in phone landscape", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    expect(dashboard).toContain("wm-chart-tabs");
    expect(dashboard).toContain("wm-chart-tools");
    expect(toolbar).toContain("wm-chart-toolbar");
    expect(css).toContain(".wm-chart-page-tab,");
    expect(css).toContain('.wm-chart-dashboard [role="status"][aria-live="polite"]');
  });

  it("keeps scanner filters contextual and reduces the mobile result grid", () => {
    const scanner = source("../app/scanner/page.tsx");
    expect(scanner).toContain('className="wm-scanner-filters');
    expect(scanner).toContain('className="wm-scanner-header');
    expect(scanner).toContain("wm-scanner-mobile-secondary");
    expect(scanner).toContain('"wm-scanner-row grid');
    expect(scanner).toContain('matchMedia("(max-width: 639px)")');
    expect(css).toContain(".wm-scanner-row > :nth-child(n+6)");
  });

  it("makes journal list and detail mutually navigable on mobile", () => {
    const journal = source("../app/journal/page.tsx");
    expect(journal).toContain("wm-journal-list");
    expect(journal).toContain("wm-journal-detail");
    expect(journal).toContain("New journal entry");
    expect(journal).toContain("Back to journal");
    expect(css).toContain(".wm-mobile-hidden");
    expect(css).toContain(".wm-mobile-only");
  });
});
