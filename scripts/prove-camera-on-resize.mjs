#!/usr/bin/env node
/**
 * CAMERA-ON-RESIZE proof — measured in a real browser, against the real library.
 *
 * ── Why a unit test was not enough here ──────────────────────────────────────
 *
 * `chartCameraKeeper.test.ts` runs the keeper against a MODEL of
 * lightweight-charts. The model was written by reading the shipped bundle, and
 * a model written by reading is exactly as right as the reading was. The two
 * claims the whole atom rests on are claims about the LIBRARY, not about our
 * code:
 *
 *   A. The library's `autoSize` ResizeObserver applies the new width
 *      SYNCHRONOUSLY inside its own callback, so an observer constructed after
 *      it is notified after the re-fit.
 *   B. `setVisibleLogicalRange` does NOT apply immediately — it queues, and the
 *      range only appears on a later animation frame.
 *
 * If either is false the keeper is wrong and every unit test still passes,
 * because the model would be wrong in the same direction as the code. So both
 * are measured here, in Chrome, against the installed `lightweight-charts`,
 * before the preservation itself is measured.
 *
 * ── The instrument proves itself ─────────────────────────────────────────────
 *
 * LAW 0 is a POSITIVE CONTROL: it resizes a chart with NO keeper attached and
 * fails unless the visible range actually moves. A gate that measured a chart
 * which never jumps would report "camera preserved" forever and be
 * indistinguishable from a working fix.
 *
 * ── SCOPE, stated so a green run is not over-read ────────────────────────────
 *
 * This drives a bare chart in a bare page: real lightweight-charts, real
 * ResizeObserver, real animation frames, real container reflow. It proves the
 * keeper holds the camera across a width change.
 *
 * It does NOT prove /charts as shipped — MainChart wires the keeper alongside
 * its own resize observer, overlay canvases and a live feed, and none of that
 * is present here. What this removes is the blind spot underneath: until now
 * nothing had observed the library's actual resize ordering.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/prove-camera-on-resize.mjs
 *
 * Exit 0 clean, 1 on any offence, 2 if no browser could be launched — because
 * "no browser" is not a clean bill of health.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ── Bundle the SHIPPED keeper for the browser ─────────────────────────────
 * The keeper is TypeScript and the browser cannot import it. Re-typing it into
 * this file would give us a gate that measures a copy nobody ships.
 */
const dir = mkdtempSync(join(tmpdir(), "camera-resize-"));
const entry = join(dir, "entry.ts");
const bundle = join(dir, "camera.js");
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(ROOT, "src/lib/chart/chartCameraKeeper"))};\n` +
    `export * from ${JSON.stringify(join(ROOT, "src/lib/chart/chartCameraOnResize"))};\n` +
    `export * as LW from ${JSON.stringify(join(ROOT, "node_modules/lightweight-charts"))};\n`,
);
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  entry, "--bundle", "--platform=browser", "--format=iife",
  "--global-name=CAMERA", `--outfile=${bundle}`,
], { stdio: "inherit" });

let engine = "chrome";
const browser = await chromium.launch({ channel: "chrome" }).catch(async (error) => {
  engine = "bundled-chromium";
  console.log(
    `NOTICE  installed Chrome unavailable (${error.message.split("\n")[0]}) — ` +
      "measuring with Playwright's bundled Chromium instead.",
  );
  return chromium.launch().catch((second) => {
    console.log(
      "REFUSING TO REPORT — no browser to measure in. Neither the installed " +
        `Chrome nor Playwright's bundled Chromium could launch (${second.message.split("\n")[0]}). ` +
        "This is NOT a clean measurement.",
    );
    process.exit(2);
  });
});

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.setContent("<!doctype html><html><body style='margin:0'></body></html>");
await page.addScriptTag({ path: bundle });

const measured = await page.evaluate(async () => {
  const { LW, openChartCameraKeeper } = window.CAMERA;

  const nextFrames = (n) =>
    new Promise((resolve) => {
      const step = (k) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
      step(n);
    });

  const BARS = 500;
  const data = [];
  let px = 100;
  for (let i = 0; i < BARS; i++) {
    px += Math.sin(i / 7) * 0.8;
    data.push({
      time: 1700000000 + i * 60,
      open: px, high: px + 1, low: px - 1, close: px + 0.2,
    });
  }

  const makeHost = (width) => {
    const host = document.createElement("div");
    host.style.cssText = `width:${width}px;height:520px;`;
    document.body.appendChild(host);
    return host;
  };

  const chartOptions = {
    autoSize: true,
    timeScale: {
      barSpacing: 8,
      minBarSpacing: 2,
      rightOffset: 5,
      lockVisibleTimeRangeOnResize: false,
    },
  };

  const mount = (host, withKeeper) => {
    const keeper = withKeeper ? openChartCameraKeeper(host) : null;
    const chart = LW.createChart(host, chartOptions);
    const series = chart.addSeries(LW.CandlestickSeries, {});
    series.setData(data);
    if (keeper) {
      keeper.attach({
        getVisibleLogicalRange: () => chart.timeScale().getVisibleLogicalRange(),
        setVisibleLogicalRange: (r) => chart.timeScale().setVisibleLogicalRange(r),
        barSpacingBounds: () => {
          const o = chart.timeScale().options();
          return { minBarSpacing: o.minBarSpacing ?? 0, maxBarSpacing: o.maxBarSpacing ?? 0 };
        },
        barCount: () => data.length,
      });
    }
    return { chart, keeper, host };
  };

  const out = {};

  /* ── LAW 0 · POSITIVE CONTROL: the library really does move the camera ── */
  {
    const host = makeHost(1200);
    const { chart } = mount(host, false);
    await nextFrames(4);
    chart.timeScale().setVisibleLogicalRange({ from: 300, to: 400 });
    await nextFrames(4);
    const before = chart.timeScale().getVisibleLogicalRange();
    host.style.width = "700px";
    await nextFrames(6);
    const after = chart.timeScale().getVisibleLogicalRange();
    out.control = { before, after };
    chart.remove();
    host.remove();
  }

  /* ── LAW 1 · ResizeObserver notifies in CONSTRUCTION order, and the
   *           library's width is already applied by the time a later-built
   *           observer runs.                                              ── */
  {
    const host = makeHost(1200);
    const order = [];
    const early = new ResizeObserver(() => order.push("early"));
    early.observe(host);
    const { chart } = mount(host, false);
    const widthWhenLateRan = [];
    const late = new ResizeObserver(() => {
      order.push("late");
      // If the library applied the new width synchronously in its own callback,
      // the visible span here already reflects 700px.
      const r = chart.timeScale().getVisibleLogicalRange();
      widthWhenLateRan.push(r ? r.to - r.from : null);
    });
    late.observe(host);
    await nextFrames(4);
    chart.timeScale().setVisibleLogicalRange({ from: 300, to: 400 });
    await nextFrames(4);
    const spanBefore = (() => {
      const r = chart.timeScale().getVisibleLogicalRange();
      return r.to - r.from;
    })();
    order.length = 0;
    widthWhenLateRan.length = 0;
    host.style.width = "700px";
    await nextFrames(6);
    out.ordering = { order: [...order], spanBefore, spanSeenByLate: widthWhenLateRan[0] ?? null };
    early.disconnect();
    late.disconnect();
    chart.remove();
    host.remove();
  }

  /* ── LAW 2 · setVisibleLogicalRange is DEFERRED, not immediate ─────────── */
  {
    const host = makeHost(1200);
    const { chart } = mount(host, false);
    await nextFrames(4);
    chart.timeScale().setVisibleLogicalRange({ from: 100, to: 200 });
    await nextFrames(4);
    const settled = chart.timeScale().getVisibleLogicalRange();
    chart.timeScale().setVisibleLogicalRange({ from: 300, to: 400 });
    const immediate = chart.timeScale().getVisibleLogicalRange();
    await nextFrames(3);
    const later = chart.timeScale().getVisibleLogicalRange();
    out.deferral = { settled, immediate, later };
    chart.remove();
    host.remove();
  }

  /* ── LAW 3 · WITH the keeper, the same bars stay on screen ─────────────── */
  {
    const host = makeHost(1200);
    const { chart, keeper } = mount(host, true);
    await nextFrames(4);
    chart.timeScale().setVisibleLogicalRange({ from: 300, to: 400 });
    await nextFrames(4);
    const before = chart.timeScale().getVisibleLogicalRange();
    const spacingBefore = chart.timeScale().options().barSpacing;
    host.style.width = "700px";
    await nextFrames(10);
    const after = chart.timeScale().getVisibleLogicalRange();
    out.narrow = {
      before, after,
      spacingBefore,
      spacingAfter: chart.timeScale().options().barSpacing,
      outcome: keeper.lastOutcome(),
    };

    // And back out again — closing the panel must not jump either.
    host.style.width = "1300px";
    await nextFrames(10);
    out.widen = { after: chart.timeScale().getVisibleLogicalRange(), outcome: keeper.lastOutcome() };
    keeper.dispose();
    chart.remove();
    host.remove();
  }

  /* ── LAW 4 · An impossible camera is REFUSED, not bent ─────────────────── */
  {
    const host = makeHost(1200);
    const { chart, keeper } = mount(host, true);
    await nextFrames(4);
    chart.timeScale().setVisibleLogicalRange({ from: 300, to: 400 });
    await nextFrames(4);
    // 101 slots into 150px needs ~1.5px/bar against a 2px floor.
    host.style.width = "150px";
    await nextFrames(10);
    out.refusal = { outcome: keeper.lastOutcome() };
    keeper.dispose();
    chart.remove();
    host.remove();
  }

  return out;
});

await browser.close();

/* ── Laws ─────────────────────────────────────────────────────────────────── */
const offences = [];
const near = (a, b, tol = 0.05) => a != null && b != null && Math.abs(a - b) <= tol;
const say = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) offences.push(name);
};

const c = measured.control;
say(
  "LAW 0 · positive control — an unkept chart DOES move its camera on a width change",
  c.before && c.after && !near(c.after.from, c.before.from, 0.5),
  `before from=${c.before?.from?.toFixed(2)} to=${c.before?.to?.toFixed(2)} · ` +
    `after from=${c.after?.from?.toFixed(2)} to=${c.after?.to?.toFixed(2)}`,
);

const o = measured.ordering;
say(
  "LAW 1 · ResizeObserver notifies in construction order (early before late)",
  o.order.length >= 2 && o.order[0] === "early" && o.order[o.order.length - 1] === "late",
  `order = ${JSON.stringify(o.order)}`,
);
say(
  "LAW 1b · the library's new width is ALREADY applied when a later-built observer runs",
  o.spanSeenByLate != null && !near(o.spanSeenByLate, o.spanBefore, 0.5),
  `span before resize = ${o.spanBefore?.toFixed(2)} · span seen by the late observer = ` +
    `${o.spanSeenByLate?.toFixed(2)} (differs ⇒ the re-fit already happened)`,
);

const d = measured.deferral;
say(
  "LAW 2 · setVisibleLogicalRange is DEFERRED — an immediate read still shows the old range",
  near(d.immediate?.from, d.settled?.from, 0.5) && near(d.later?.from, 300, 0.5),
  `settled=${d.settled?.from?.toFixed(2)} · immediately after set=${d.immediate?.from?.toFixed(2)} · ` +
    `after frames=${d.later?.from?.toFixed(2)}`,
);

const n = measured.narrow;
say(
  "LAW 3 · with the keeper, the SAME bars survive the chart narrowing 1200px → 700px",
  near(n.after?.from, n.before?.from) && near(n.after?.to, n.before?.to),
  `before from=${n.before?.from?.toFixed(3)} to=${n.before?.to?.toFixed(3)} · ` +
    `after from=${n.after?.from?.toFixed(3)} to=${n.after?.to?.toFixed(3)}`,
);
say(
  "LAW 3b · and the bars are genuinely drawn NARROWER — the view was held, not faked",
  n.spacingAfter != null && n.spacingBefore != null && n.spacingAfter < n.spacingBefore,
  `barSpacing ${n.spacingBefore?.toFixed(3)} → ${n.spacingAfter?.toFixed(3)}`,
);
say(
  "LAW 3c · the keeper REPORTS preserved, measured by reading the range back",
  n.outcome?.preserved === true,
  `outcome.preserved = ${n.outcome?.preserved} · plan = ${n.outcome?.plan?.action}`,
);
say(
  "LAW 3d · widening back out holds the same bars too",
  near(measured.widen.after?.from, n.before?.from) && near(measured.widen.after?.to, n.before?.to),
  `after widen from=${measured.widen.after?.from?.toFixed(3)} to=${measured.widen.after?.to?.toFixed(3)}`,
);

const r = measured.refusal?.outcome;
say(
  "LAW 4 · a camera the scale cannot hold is REFUSED in words, never silently bent",
  r?.preserved === false && r?.plan?.action === "stand-down" && r?.requested === null,
  `reason = ${r?.plan?.reason} · spoken = ${JSON.stringify(r?.plan?.spoken ?? null)}`,
);

console.log(`\nengine: ${engine}`);
if (offences.length) {
  console.log(`\n${offences.length} OFFENCE(S): ${offences.join(", ")}`);
  process.exit(1);
}
console.log("\nNo offences. The camera survives a width change, and says so only when it does.");
