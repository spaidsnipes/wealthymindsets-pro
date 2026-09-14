import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "../app/manifest";

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

  it("keeps one canonical watchlist in the shared drawer at every width", () => {
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

    // Exactly one instance at every width. Contextual evidence opens over the
    // room instead of permanently shrinking MARKET into a dashboard column.
    expect(dashboard).toContain("{watchlistOpen && (");
    expect(dashboard).not.toContain("{!narrowViewport && (");
    expect(dashboard).not.toContain("watchlistSheetOpen");
    expect(dashboard.match(/<WatchlistPanel\b/g) ?? []).toHaveLength(1);

    // A reachable door, wired to the drawer it opens.
    expect(dashboard).toContain('id="chart-watchlist-sheet"');
    expect(dashboard).toContain('aria-controls="chart-watchlist-sheet"');
    expect(dashboard).toContain("onWatchlist={() => openWatchlist(toolsTriggerRef.current)}");
    expect(dashboard).not.toContain('id="chart-watchlist-rail"');

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

  it("replaces the permanent drawing rail with one contextual drawer", () => {
    // The 20 drawing tools remain the same component and props at every width,
    // but no longer form permanent July-style chrome around MARKET.
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    const sidebar = source("../components/chart/LeftDrawingSidebar.tsx");

    expect(dashboard).not.toContain("{!narrowViewport && <LeftDrawingSidebar");
    expect(dashboard).toContain("{drawSheetOpen &&");
    expect(dashboard).toContain('id="chart-draw-sheet"');
    expect(toolbar).toContain('aria-controls="chart-draw-sheet"');
    expect(dashboard).toContain("openDrawingTools(toolsTriggerRef.current)");
    expect(dashboard).toContain('<LeftDrawingSidebar {...drawingSidebarProps} variant="sheet" />');

    // One props object, spread into the one canonical drawer call site.
    const declarations = dashboard.match(/const drawingSidebarProps\b/g) ?? [];
    expect(declarations.length, "drawingSidebarProps must be declared exactly once").toBe(1);
    const spreads = dashboard.match(/\{\.\.\.drawingSidebarProps\}/g) ?? [];
    expect(spreads.length, "the drawer must spread the canonical props once").toBe(1);

    // This asserted the whole ternary as one literal, INCLUDING its closing
    // quote, so no class could ever be added to the rail branch in any order.
    // That is stricter than the stated intent: what must hold is that the
    // SHEET does not wear `wm-draw-rail` (the class the media query hides),
    // while the rail does. The rail legitimately also carries the shared
    // `wm-room-chrome` material (see chartsRoomChrome.test.ts), so the
    // assertion now expresses the invariant instead of one frozen string.
    const branches = sidebar.match(/isSheet \? "([^"]*)" : "([^"]*)"/);
    expect(branches, "the sheet/rail class ternary is missing").not.toBeNull();
    const [, sheetClasses, railClasses] = branches!;
    expect(sheetClasses.split(/\s+/), "the sheet must not wear the class globals.css hides")
      .not.toContain("wm-draw-rail");
    expect(sheetClasses.split(/\s+/)).toContain("wm-draw-sheet");
    expect(railClasses.split(/\s+/), "the rail must keep the class the breakpoint hides")
      .toContain("wm-draw-rail");
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

  it("replaces the permanent capture rail with one contextual drawer", () => {
    // Publish, video, voice, screenshot, recording, and layout remain in the
    // same component without permanently framing MARKET at desktop width.
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const sidebar = source("../components/chart/LeftSidebar.tsx");

    expect(dashboard).not.toContain("{!narrowViewport && <LeftSidebar");
    expect(dashboard).toContain("{toolsSheetOpen &&");
    expect(dashboard).toContain('id="chart-tools-sheet"');
    expect(dashboard).toContain("onCapture={() => openCaptureShare(toolsTriggerRef.current)}");
    expect(dashboard).toContain("fallbackTriggerRef={captureFallbackTriggerRef}");
    expect(dashboard).toContain('activeTab !== "Chart" && activeTab !== "Options"');
    expect(source("../components/chart/ChartToolbar.tsx")).toContain("Capture &amp; share");
    expect(dashboard).toContain('<LeftSidebar {...primarySidebarProps} variant="sheet" />');

    // The one drawer must capture the canonical node and publish its symbol.
    const declared = dashboard.match(/const primarySidebarProps\b/g) ?? [];
    expect(declared.length, "primarySidebarProps must be declared exactly once").toBe(1);
    const spreads = dashboard.match(/\{\.\.\.primarySidebarProps\}/g) ?? [];
    expect(spreads.length, "the drawer must spread the canonical props once").toBe(1);

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

  it("keeps contextual WHY in the market room and deeper proof collapsed", () => {
    const deck = source("../app/command-deck/page.tsx");
    const room = deck.indexOf('data-testid="deck-market-scene"');
    const why = deck.indexOf('data-testid="scene-why"', room);
    const inspector = deck.indexOf('data-testid="scene-why-inspector"', why);
    const roomEnd = deck.indexOf('className="wm-cd-secondary-workspace"', room);
    expect(deck).toContain('data-testid="scene-why"');
    expect(deck).toContain("Why · decision evidence");
    expect(deck).toContain('className="wm-cd-evidence-drawer"');
    expect(deck).toContain("Evidence &amp; reasoning");
    expect(deck).toContain("Open the proof chain");
    expect(deck.indexOf('data-testid="scene-why"')).toBeLessThan(deck.indexOf("<DecisionWhyPanel"));
    expect(deck.indexOf("<DecisionWhyPanel")).toBeLessThan(deck.indexOf("wm-cd-evidence-drawer"));
    expect(deck.indexOf("wm-cd-evidence-drawer")).toBeLessThan(deck.indexOf("<SceneAdmissionPanel"));
    expect(deck.indexOf("<SceneAdmissionPanel")).toBeLessThan(deck.indexOf("<MarketCanvasPanel"));
    expect(deck.indexOf("<DeckExpressionShortlist")).toBeLessThan(deck.indexOf("wm-cd-evidence-drawer"));
    expect(deck.slice(0, deck.indexOf("wm-cd-evidence-drawer"))).not.toContain(">Layout</span>");
    expect(deck).toContain("setProofChainOpen(deckEmphasis.emphasizeWhy)");
    expect(deck).not.toContain("deckEmphasis.emphasizeWhy || deckEmphasis.passportOpen");
    expect(deck).not.toContain("CinematicAtmosphere");
    expect(deck).not.toContain("DoctrineTagline");
    expect(inspector).toBeGreaterThan(why);
    expect(inspector).toBeLessThan(roomEnd);
    expect(deck).toContain("open={showEvidence || undefined}");
    expect(deck).not.toContain('className="wm-cd-why-column"');
    expect(deck).not.toContain('showEvidence && whyTarget ? "minmax(0, 1fr) 380px"');
  });

  it("keeps secondary preparation and diagnostics behind one workspace disclosure", () => {
    const deck = source("../app/command-deck/page.tsx");
    const room = deck.indexOf('data-testid="deck-market-scene"');
    const workspace = deck.indexOf('className="wm-cd-secondary-workspace"', room);
    const content = deck.indexOf('data-testid="secondary-workspace-content"', workspace);
    const connections = deck.indexOf('className="wm-cd-connection-diagnostics"', content);
    const system = deck.indexOf("System state · session · data · evidence · right-of-way", content);
    const deepRead = deck.indexOf("Deep read · story · auction lens · decision chain · steward · fidelity", content);
    const doctrine = deck.indexOf('data-testid="secondary-workspace-doctrine"', deepRead);
    const gateway = deck.indexOf('<RealmGateway currentKey="wm-pro" />', doctrine);
    expect(workspace).toBeGreaterThan(room);
    expect(content).toBeGreaterThan(workspace);
    expect(connections).toBeGreaterThan(content);
    expect(system).toBeGreaterThan(connections);
    expect(deepRead).toBeGreaterThan(system);
    expect(doctrine).toBeGreaterThan(deepRead);
    expect(gateway).toBeGreaterThan(doctrine);
    expect(deck.slice(workspace, content)).not.toContain("open=");
    expect(deck.match(/className="wm-cd-secondary-workspace"/g)).toHaveLength(1);
    expect(deck.match(/<RealmGateway currentKey="wm-pro" \/>/g)).toHaveLength(1);
    const summary = deck.slice(deck.indexOf("<summary", workspace), content);
    expect(summary).toContain('display: "inline-flex"');
    expect(summary).toContain('width: "fit-content"');
    expect(summary).toContain('marginLeft: "auto"');
    expect(summary).not.toContain('justifyContent: "space-between"');
  });

  it("compresses an unresolved room hero without hiding its market-state truth", () => {
    const hero = source("../components/command-deck/HeroTruth.tsx");
    expect(hero).toContain('isRoomDensity && marketStateResolution === "UNKNOWN"');
    expect(hero).toContain("Market state {marketState}");
    expect(hero).toContain('!(isRoomDensity && marketStateResolution === "UNKNOWN")');
  });

  it("keeps multi-broker setup reachable without permanent provider chrome", () => {
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(toolbar).toContain('style={{ position: "sticky", right: 0');
    expect(toolbar).toContain("Connect brokers");
    expect(toolbar).toContain('aria-controls="wm-broker-connect"');
    expect(toolbar).not.toContain('aria-label="Connect one or more brokers"');
    expect(dashboard).toContain("openBrokerConnect(toolsTriggerRef.current)");
    expect(dashboard).not.toContain('aria-label="Connect one or more brokers"');
    expect(dashboard).not.toContain("> Brokers");
  });

  it("gives every chart/options width the full canvas and moves instrument detail to a drawer", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const options = source("../components/chart/OptionsChain.tsx");
    expect(options).toContain("data-options-workspace");
    expect(options).toContain("w-full max-w-[700px] min-w-0 md:w-[55%] xl:w-[45%]");
    expect(dashboard).toContain('id="chart-instrument-profile"');
    expect(dashboard).toContain("fallbackTriggerRef={toolsTriggerRef}");
    expect(dashboard).not.toContain("{!narrowViewport || !optionsOpen ? <div");
  });

  it("opens charts around price action without restoring an old rail preference into a modal", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(dashboard).toContain("const [watchlistOpen, setWatchlistOpen] = useState(false)");
    expect(dashboard).not.toContain('lsGet("wm_chart_watchlist_open"');
    expect(dashboard).not.toContain('localStorage.setItem("wm_chart_watchlist_open"');
    expect(dashboard).toContain("onToggleWatchlist: () => setWatchlistOpen(v => !v)");
  });

  it("keeps chart appearance available without two competing theme buttons", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    expect(dashboard).toContain("onAppearanceToggle={() => setTheme");
    expect(dashboard).toContain('appearanceLabel={theme === "neon" ? "WM Neon" : "Original"}');
    expect(toolbar).toContain("Appearance · {appearanceLabel");
    expect(dashboard).not.toContain("wm-theme-toggle");
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
    /*
     * Was: "This provider still needs setup in the current runtime."
     *
     * Replaced 2026-09-12 from a LIVE observation, not from reading code.
     * Production /readiness showed Moomoo and Tastytrade as NOT CONFIGURED
     * with that sentence beneath, while production /api/broker/status on the
     * same host reported implemented=true, envConfigured=false for both. The
     * integrations exist. What the deployed host lacks is the credential
     * NAMES — and "still needs setup" reads as "this product does not
     * support your broker yet."
     *
     * Those imply different next actions: build an integration, versus bind
     * a secret to THIS environment. That is the canon's 3-RUNTIME TEST — a
     * key existing in runtime A is not evidence for runtime B — and Weakness
     * 5's rule that credential-present-plus-bridge-absent is a locality
     * block, never a missing key.
     *
     * The NOT CONFIGURED badge itself is deliberately untouched: it is
     * canonized Monday Test 2 vocabulary and is not this thread's to rename.
     * Only the sentence, which was the part making the stronger claim.
     */
    expect(readiness).toContain("does not carry the credential name(s) this provider reads");
    expect(readiness).toContain("not proof the integration is absent");
    expect(readiness).not.toContain("This provider still needs setup in the current runtime.");
    expect(brokers).toContain("Signed OpenAPI check · read-only account proof");
    expect(brokers).toContain("Webull Connect OAuth—authorize, callback, token refresh");
    expect(brokers).toContain("Signing into Webull&apos;s website is separate and does not connect this app.");
  });

  it("keeps long-form Founder-family surfaces vertically reachable via the registry", () => {
    // Founder audit 2026-09-13: the document-scroll decision must derive
    // from the same Asset-10 registry that decides the shell. Two separate
    // pathname lists would drift; one owner cannot.
    const layout = source("../components/layout/MainLayout.tsx");
    expect(layout).toContain('const documentScroll = isFounderOperatingRoom');
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
    // Reads the manifest the app actually SERVES. This used to JSON.parse
    // public/manifest.json; that file is gone, because a static manifest could
    // not derive the landing route and so kept its own copy of it. Calling the
    // generator is the only way this assertion stays attached to the truth
    // rather than to a file that no longer ships.
    expect(manifest().orientation).toBe("any");
  });

  it("keeps chart truth and navigation visible without stacking desktop chrome in phone landscape", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const toolbar = source("../components/chart/ChartToolbar.tsx");
    expect(dashboard).toContain("wm-chart-tabs");
    expect(dashboard).toContain("wm-chart-category-select");
    expect(dashboard).toContain("wm-chart-tools");
    expect(toolbar).toContain("wm-chart-toolbar");
    expect(dashboard).toContain('aria-label="Symbol view category"');
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
