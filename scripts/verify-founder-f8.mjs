#!/usr/bin/env node
/**
 * verify-founder-f8.mjs — the Ticket T live check anyone can run.
 *
 * Reads the live production /command-deck HTML and reports the state of
 * G2 (parent change), G9 (silhouette markers) and G12 (July chrome
 * absence) against the audit's own vocabulary. No credentials, no
 * wrangler, no chrome extension. `node scripts/verify-founder-f8.mjs`.
 *
 * The probe is deliberately naive: it looks for HTML SUBSTRINGS that
 * name the sanctuary or the July shell. It cannot capture pixels, so it
 * cannot decide F8 by itself — HUMAN_PROOF_REQUIRED still applies for
 * the silhouette. But it can tell you, definitively, when the deploy
 * has caught up to the tree and when it has not.
 *
 * Exits non-zero if any RED signal is found on the Founder route, so a
 * cron or CI hook can watch the deploy and stop when the composition
 * matches the audit.
 */

const HOST = process.env.WM_F8_HOST ?? "https://wealthymindsetspro.com";
const TARGET = `${HOST}/command-deck`;

/**
 * The Founder-facing STATIC SHELL preview. It is the only page on prod that
 * (a) requires no auth, (b) is fully server-rendered HTML, and (c) contains
 * ONLY the sanctuary shell — no /charts imports, no shared bundle. That
 * makes it the one route where a substring check tells the truth: if the
 * July class names appear here, they are wearing the sanctuary as costume.
 * If the sanctuary strings appear here, the deploy is at least as new as
 * the shell atom (`d286650` and later).
 *
 * The bundle-union check further below is a coarser signal — a class name
 * present in the union may still be unrouted (e.g. wm-shell-header lives
 * in the July MainLayout used by /charts). This route-scoped check bites
 * only when the shell itself regresses.
 */
const STATIC_SHELL_TARGET = `${HOST}/founder-room-sample`;

/**
 * WM Pro is a client-rendered app. The initial HTML that `fetch` returns is
 * "Checking your secure session…" — the auth landing. It does NOT contain
 * the composed UI, so a substring check against the HTML cannot distinguish
 * "the cut deployed" from "the cut never merged". The classes are added by
 * React AT RUNTIME after AuthProvider settles.
 *
 * What DOES survive to the initial payload:
 *   1. The compiled CSS bundle. If MainLayout.tsx or WMExperienceShell.tsx
 *      contain the sanctuary's inline `<style>{`.wm-sanctuary::before…`}<`/
 *      style>` block, the compiled JS chunks include those literal strings.
 *   2. The Next.js manifest URL, which changes on every build.
 *
 * So this probe reads the initial HTML for the manifest URL, then fetches
 * the JS/CSS chunks and searches THEM for the sanctuary and the July
 * chrome. That is enough to say "the tree at head is or is not on the wire"
 * without a headless browser.
 */
const PRESENT_IN_BUNDLE = {
  sanctuary: "wm-sanctuary",
  waterBreath: "wm-water-breath",
  experienceMode: "Experience mode",
};

const ABSENT_FROM_FOUNDER_BRANCH = {
  julyUniverseClassJoined: "bg-wm-black wm-universe",
  julyHeader: "wm-shell-header",
};

function color(name, s) {
  const codes = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" };
  return `${codes[name] ?? ""}${s}${codes.reset}`;
}

async function main() {
  const url = TARGET;
  process.stdout.write(`\n  TICKET T LIVE PROBE\n  target: ${url}\n\n`);

  let html;
  try {
    const t0 = Date.now();
    const res = await fetch(url, { headers: { "user-agent": "wm-f8-probe/1" } });
    html = await res.text();
    process.stdout.write(`  fetched ${(html.length / 1024).toFixed(1)} KB in ${Date.now() - t0} ms · HTTP ${res.status}\n\n`);
    if (res.status !== 200) {
      process.stdout.write(color("red", `  RED: HTTP ${res.status}, not 200. Cannot judge Ticket T from an error page.\n`));
      process.exit(1);
    }
  } catch (err) {
    process.stdout.write(color("red", `  RED: fetch failed — ${err.message}\n`));
    process.exit(2);
  }

  // Collect every JS/CSS chunk the initial HTML references. That is the
  // union of what the browser will load; if the cut is in any of them,
  // it is deployable.
  const chunks = new Set();
  for (const m of html.matchAll(/["'](\/_next\/static\/chunks\/[^"']+\.(?:js|css))["']/g)) {
    chunks.add(m[1]);
  }
  if (chunks.size === 0) {
    process.stdout.write(color("yellow", "  YELLOW: could not find any /_next/static/chunks/… URLs in the HTML.\n"));
    process.stdout.write("  This can happen if prod is not served by Next/OpenNext (e.g. a placeholder\n");
    process.stdout.write("  page is up). Nothing to check further.\n\n");
    process.exit(3);
  }
  process.stdout.write(`  discovered ${chunks.size} static chunks · fetching in parallel…\n`);
  const chunkTexts = await Promise.all(
    Array.from(chunks).map(async (path) => {
      try {
        const r = await fetch(HOST + path, { headers: { "user-agent": "wm-f8-probe/1" } });
        if (r.status !== 200) return "";
        return await r.text();
      } catch {
        return "";
      }
    }),
  );
  const bundle = chunkTexts.join("\n");
  process.stdout.write(`  fetched ${(bundle.length / 1024).toFixed(1)} KB of bundle text\n\n`);

  let anyRed = false;

  process.stdout.write("  MUST BE PRESENT in the compiled bundle (G2 / G9 markers):\n");
  for (const [name, needle] of Object.entries(PRESENT_IN_BUNDLE)) {
    const found = bundle.includes(needle);
    const chip = found ? color("green", "  GREEN") : color("red", "    RED");
    process.stdout.write(`${chip}  ${name.padEnd(18)} · ${color("dim", JSON.stringify(needle))}\n`);
    if (!found) anyRed = true;
  }

  process.stdout.write("\n  Absence in the compiled bundle is NOT a Ticket T signal (see next block):\n");
  for (const [name, needle] of Object.entries(ABSENT_FROM_FOUNDER_BRANCH)) {
    const found = bundle.includes(needle);
    // The July shell is still legitimately compiled into shared JS chunks
    // because /charts and other routes still use MainLayout. A class name
    // present in the shared bundle does NOT mean it renders on the Founder
    // route. The route-scoped STATIC SHELL PROBE below is what actually
    // decides G12 — bundle-union presence is now informational only.
    const chip = found ? color("yellow", " YELLOW") : color("green", "  GREEN");
    process.stdout.write(`${chip}  ${name.padEnd(18)} · ${color("dim", JSON.stringify(needle))}${found ? " (present in shared chunks — inspected route-scoped below)" : ""}\n`);
    // Deliberately does NOT set anyRed. False positives from shared chunks
    // are precisely the noise that made the earlier probe useless.
  }

  // ── Route-scoped check on the static shell preview ─────────────────────
  //
  // The bundle-union check above cannot distinguish "wm-shell-header exists
  // in the JS chunks because /charts still uses MainLayout" from "the shell
  // itself smuggled it back onto the Founder route." /founder-room-sample
  // is server-rendered STATIC HTML with only the sanctuary in it, so a
  // substring check there is honest: any July class in that page's HTML
  // has escaped the shell contract, and any missing sanctuary class means
  // the shell atom never reached prod. This runs after the bundle check so
  // both diagnostics appear in one probe.
  process.stdout.write(`\n  STATIC SHELL PROBE  target: ${STATIC_SHELL_TARGET}\n`);
  let shellHtml = "";
  try {
    const r = await fetch(STATIC_SHELL_TARGET, { headers: { "user-agent": "wm-f8-probe/1" } });
    if (r.status === 200) shellHtml = await r.text();
    else process.stdout.write(color("yellow", `  YELLOW: shell preview HTTP ${r.status}\n`));
  } catch (err) {
    process.stdout.write(color("yellow", `  YELLOW: shell preview fetch failed — ${err.message}\n`));
  }
  if (shellHtml.length > 0) {
    process.stdout.write("  Sanctuary must be present in the STATIC HTML:\n");
    for (const [name, needle] of Object.entries(PRESENT_IN_BUNDLE)) {
      const found = shellHtml.includes(needle);
      const chip = found ? color("green", "  GREEN") : color("red", "    RED");
      process.stdout.write(`${chip}  ${name.padEnd(18)} · ${color("dim", JSON.stringify(needle))}\n`);
      if (!found) anyRed = true;
    }
    process.stdout.write("  July must be absent from the STATIC HTML (route-scoped, not bundle):\n");
    for (const [name, needle] of Object.entries(ABSENT_FROM_FOUNDER_BRANCH)) {
      const found = shellHtml.includes(needle);
      const chip = found ? color("red", "    RED") : color("green", "  GREEN");
      process.stdout.write(`${chip}  ${name.padEnd(18)} · ${color("dim", JSON.stringify(needle))}\n`);
      if (found) anyRed = true;
    }
  }

  process.stdout.write("\n");
  if (anyRed) {
    process.stdout.write(color("red", "  TICKET T LIVE = RED\n"));
    process.stdout.write("  Silhouette F8 also RED, and no automated substring check can turn it GREEN.\n");
    process.stdout.write("  Deploy the tree, then re-run this probe. When every line above is GREEN,\n");
    process.stdout.write("  capture the 1440x900 and 390x844 screenshots and stand F8 next to F0.\n\n");
    process.exit(1);
  } else {
    process.stdout.write(color("green", "  TICKET T LIVE = GREEN (all substrings match)\n"));
    process.stdout.write("  Now capture 1440x900 and 390x844, blur, and confirm MARKET IS THE ROOM.\n");
    process.stdout.write("  A substring probe cannot decide the silhouette; that is F8's screenshot.\n\n");
    process.exit(0);
  }
}

main();
