#!/usr/bin/env node
/**
 * Market Object Passport PIXEL proof — measure the picture, not the markup.
 *
 * ── What this closes ─────────────────────────────────────────────────────────
 *
 * The Passport now draws three ordered facts that it used to print as words:
 * fidelity as filled rungs, confidence as a bar, and resolution as a band with
 * one segment per object. `MarketObjectPassportPanel.test.tsx` holds all three,
 * and every one of those assertions reads ATTRIBUTES — `data-rank="5"`,
 * `data-confidence="40"`, a count of `data-lifecycle` segments.
 *
 * An attribute is a promise about a picture. `data-rank="5"` and three lit
 * rungs is a green test over a lying diagram, and that failure is exactly the
 * one this feature was built to remove: a claim whose form does not carry the
 * order it asserts. Proving the fix with markup alone would repeat the defect
 * one level up.
 *
 * So this paints the shipped panel in a real browser and reads back computed
 * geometry: how many rungs are actually lit, how wide the confidence fill
 * actually is, how many segments the band actually has and whether they span
 * its full width.
 *
 * ── SCOPE, stated so a green run is not over-read ────────────────────────────
 *
 * This renders `MarketObjectPassportPanel` standalone against a fixture VM. It
 * proves THE PANEL's encodings are honest. It does NOT prove the composed
 * /charts or /command-deck scene is honest — the panel there sits inside a
 * Workspace drawer over live data, and that remains HUMAN_PROOF_REQUIRED.
 *
 * The fixture is a FIXTURE and is labelled as one in the written artifact. It
 * is not market data and no number in it is a claim about any instrument.
 *
 * Exit 0 clean, 1 on any offence, 2 if no browser could be launched — because
 * "could not measure" and "measured clean" must never share an exit code.
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* INSIDE the repo, not in /tmp. esbuild resolves bare imports by walking up
   from the entry file, so an entry in the system temp directory cannot see
   this project's `react` at all — it fails with "Could not resolve react"
   before measuring anything. Under node_modules/.cache it is ignored by git
   and by the bundler's own scan, and it is removed on the way out. */
const work = join(ROOT, "node_modules", ".cache", "wm-passport-proof");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

/* The panel is TSX and the browser cannot import it. esbuild is already a
   dependency (the OpenNext adapter pulled it in), and bundling THE SHIPPED
   FILE is the whole point: a reimplementation here would measure a copy. */
const entry = join(work, "entry.jsx");
writeFileSync(
  entry,
  `
import React from "react";
import { createRoot } from "react-dom/client";
import { MarketObjectPassportPanel } from ${JSON.stringify(join(ROOT, "src/components/experience/MarketObjectPassportPanel.tsx"))};

const ev = (f, basis) => ({ eventId: "ev-" + f, source: "fixture", fidelity: f, basis, observedAt: 1.8e12, availableAt: 1.8e12 });
const O = (id, label, lifecycle, value, confidence, fidelity, evidence = [], contradictions = [], unknowns = []) =>
  ({ id, label, lifecycle, value, confidence, fidelity, sources: ["fixture"], evidence, contradictions, unknowns, summary: "fixture row" });

/* One object per fidelity class so the rung ladder is measured across its whole
   range, plus the three lifecycles so the band is measured on a mixed set. */
const objects = [
  O("direction","Direction","RESOLVED","Fixture value",0.86,"OBSERVED",[ev("OBSERVED","fixture basis")]),
  O("location","Location","RESOLVED","Fixture value",0.40,"DERIVED",[ev("DERIVED","fixture basis")]),
  O("structure","Structure","FORMING","Fixture value",0.33,"PROXY",[ev("PROXY","fixture basis")],["fixture contradiction"]),
  O("aggression","Aggression","FORMING","Fixture value",0.12,"INFERRED",[ev("INFERRED","fixture basis")]),
  O("orderFlow","Order Flow","RESOLVED","Fixture value",1.00,"SIMULATED",[ev("SIMULATED","fixture basis")]),
  O("regime","Regime","UNRESOLVED",null,null,"UNAVAILABLE",[],[],["fixture unknown"]),
  O("profile","Profile","UNRESOLVED",null,null,null,[],[],["fixture unknown"]),
  O("volatility","Volatility","UNRESOLVED",null,null,null,[],[],["fixture unknown"]),
];

const vm = {
  version: "wm.market-object-passport.v1",
  snapshotId: "FIXTURE — not market data",
  capturedAt: 1.8e12,
  qualityState: "OBSERVED",
  objects,
  resolvedCount: objects.filter(o => o.lifecycle === "RESOLVED").length,
  totalCount: objects.length,
};

createRoot(document.getElementById("root")).render(
  React.createElement(MarketObjectPassportPanel, { vm, unabridged: true }),
);
`,
);

const bundle = join(work, "bundle.js");
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  entry,
  "--bundle",
  "--format=iife",
  "--loader:.tsx=tsx",
  "--loader:.ts=ts",
  "--jsx=automatic",
  `--alias:@=${join(ROOT, "src")}`,
  `--outfile=${bundle}`,
], { stdio: "inherit" });

let engine = "installed-chrome";
const browser = await chromium.launch({ channel: "chrome" }).catch(async () => {
  engine = "bundled-chromium";
  return chromium.launch().catch((second) => {
    console.error(
      `MEASUREMENT IMPOSSIBLE: neither Chrome nor bundled Chromium launched ` +
        `(${second.message.split("\n")[0]}). This is NOT a clean run.`,
    );
    process.exit(2);
  });
});

const page = await browser.newPage({
  viewport: { width: 900, height: 760 },
  deviceScaleFactor: 2,
});
await page.setContent(
  `<html><body style="margin:0;padding:24px;background:#0b0b0d;font-family:-apple-system,Inter,system-ui,sans-serif">
     <div id="root"></div>
   </body></html>`,
);
await page.addScriptTag({ path: bundle });
await page.waitForSelector("[data-testid='passport-resolution-band']");

const measured = await page.evaluate(() => {
  /* ALPHA, PARSED — not a substring match on the colour.
     The first draft tested `bg.includes("rgb(139, 106, 41)")`, which can never
     match: the browser serialises the unlit rung as `rgba(139, 106, 41, 0.18)`
     and the closing paren in the needle defeats it. Every rung therefore read
     as lit and the proof reported five offences against a correct panel.
     Worth recording rather than quietly fixing — an instrument that fails
     toward "the subject is broken" is the more dangerous direction, and this
     one only looked credible because it was measuring something real. */
  const lit = (el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const parts = m[1].split(",").map((s) => Number(s.trim()));
    const alpha = parts.length > 3 ? parts[3] : 1;
    return alpha > 0.5;
  };
  const rungs = [...document.querySelectorAll("[data-testid='passport-fidelity-rungs']")].map((r) => ({
    claimedRank: Number(r.getAttribute("data-rank")),
    litRungs: [...r.children].filter(lit).length,
    totalRungs: r.children.length,
  }));
  const bandEl = document.querySelector("[data-testid='passport-resolution-band']");
  const segs = [...bandEl.children];
  const band = {
    segments: segs.length,
    lifecycles: segs.map((s) => s.getAttribute("data-lifecycle")),
    spanRatio:
      segs.reduce((a, s) => a + s.getBoundingClientRect().width, 0) /
      bandEl.getBoundingClientRect().width,
  };
  const bars = [...document.querySelectorAll("[data-testid='passport-confidence-bar']")].map((b) => ({
    claimedPct: Number(b.getAttribute("data-confidence")),
    trackPx: b.getBoundingClientRect().width,
    fillPx: b.firstElementChild.getBoundingClientRect().width,
  }));
  return { rungs, band, bars };
});

const offences = [];

/* 1. THE LADDER AGREES WITH THE WORD ABOVE IT. */
for (const r of measured.rungs) {
  if (r.litRungs !== r.claimedRank) {
    offences.push(
      `rung ladder claims rank ${r.claimedRank} and lit ${r.litRungs} of ${r.totalRungs} — ` +
        `the diagram contradicts the fidelity word printed beside it`,
    );
  }
}
if (measured.rungs.length < 5) {
  offences.push(`only ${measured.rungs.length} ladders painted; the scale was not exercised`);
}

/* 2. THE BAND KEEPS THE DENOMINATOR AND FILLS ITS WIDTH. A short band is a
      redrawn fraction: 5/8 painted across a five-segment strip reads as 5/5. */
if (measured.band.segments !== 8) {
  offences.push(`band painted ${measured.band.segments} segments for 8 objects — denominator redrawn`);
}
if (!measured.band.lifecycles.includes("UNRESOLVED")) {
  offences.push("band dropped every UNRESOLVED segment — the unresolved half is invisible");
}
if (measured.band.spanRatio < 0.9) {
  offences.push(`band segments span only ${(measured.band.spanRatio * 100).toFixed(0)}% of the strip`);
}

/* 3. THE BAR LENGTH IS THE CONFIDENCE, NOT A GESTURE TOWARD IT. */
for (const b of measured.bars) {
  const expected = (b.claimedPct / 100) * b.trackPx;
  if (Math.abs(b.fillPx - expected) > 1.5) {
    offences.push(
      `confidence bar claims ${b.claimedPct}% but painted ${b.fillPx.toFixed(1)}px of a ` +
        `${b.trackPx.toFixed(1)}px track (expected ${expected.toFixed(1)}px)`,
    );
  }
}
/* Three objects carry `confidence: null`. A track drawn for them would be the
   fabricated zero the panel refuses by name. */
if (measured.bars.length !== 5) {
  offences.push(
    `${measured.bars.length} confidence bars painted for 5 measured confidences — ` +
      `an unmeasured confidence drew a track, which reads as zero confidence`,
  );
}

const shot = join(ROOT, "public", "passport-pixel-proof.png");
await page.screenshot({ path: shot, fullPage: true });
await browser.close();

console.log(JSON.stringify({ engine, measured, offences }, null, 1));
console.log(`\nPainted artifact: ${shot}`);

if (offences.length > 0) {
  console.error(`\nPASSPORT PIXEL PROOF FAILED — ${offences.length} offence(s):`);
  for (const o of offences) console.error(`  • ${o}`);
  process.exit(1);
}
rmSync(work, { recursive: true, force: true });
console.log(`\nPASSPORT PIXEL PROOF CLEAN (engine: ${engine})`);
