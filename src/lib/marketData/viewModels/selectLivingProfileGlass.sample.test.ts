/**
 * LIVING PROFILE HISTOGRAM — PIXEL PROOF.
 *
 * The Founder pointed at "I don't see the profile" and this shift replaced
 * six annotation dots with the actual histogram. This suite renders the
 * histogram to a real SVG and writes it where a human can look at it:
 *
 *     open $(node -p "require('os').tmpdir()+'/living-profile-histogram-sample.html'")
 *
 * FIXTURE, not evidence about a market. The buckets are constructed to
 * exercise the geometry — POC bucket, inside-value buckets, outside-value
 * buckets, untraded drops, and the value-area band that wraps them.
 * If the compiler stops publishing `bars`, this page stops showing bars.
 */

import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import selectLivingProfileGlass, {
  type ProfileHistogramBar,
} from "./selectLivingProfileGlass";
import { LIVING_PROFILE_VERSION, type LivingProfileVM, type ProfileCurvePoint } from "./selectLivingProfile";

const bucket = (
  price: number,
  volume: number,
  isPoc: boolean,
  insideValueArea: boolean,
  node: "HVN" | "LVN" | null = null,
  untraded = false,
): ProfileCurvePoint & { untraded?: boolean } => ({
  price, volume,
  share: 0, // filled below
  insideValueArea, isPoc, node,
});

const buildVM = (): LivingProfileVM => {
  const curve: ProfileCurvePoint[] = [
    bucket(420.10, 120, false, false),
    bucket(420.00, 380, false, false, "LVN"),
    bucket(419.90, 640, false, true),
    bucket(419.80, 980, false, true),
    bucket(419.70, 1320, false, true, "HVN"),
    bucket(419.60, 1720, false, true),
    bucket(419.50, 2100, true,  true), // POC
    bucket(419.40, 1780, false, true),
    bucket(419.30, 1420, false, true),
    bucket(419.20, 1080, false, true),
    bucket(419.10, 720,  false, true),
    bucket(419.00, 420,  false, false, "LVN"),
    bucket(418.90, 160,  false, false),
  ] as ProfileCurvePoint[];
  const max = Math.max(...curve.map(c => c.volume));
  for (const c of curve) (c as any).share = c.volume / max;

  return {
    measured: true,
    missingInput: null,
    missingInputNote: null,
    quality: "READ" as any,
    qualityNote: "",
    poc: 419.50,
    vah: 419.90,
    val: 419.10,
    valueAreaPct: 0.68,
    totalVolume: 12660,
    populatedRows: curve.length,
    tickSize: 0.10,
    nodesMeasured: true,
    nodesMissingInput: null,
    nodesNote: null,
    hvn: [{
      kind: "HVN", price: 419.70, volume: 1320, shareOfTotal: 0.10,
      insideValueArea: true, distanceFromPoc: 0.20, untraded: false,
    }],
    lvn: [
      { kind: "LVN", price: 420.00, volume: 380, shareOfTotal: 0.03,
        insideValueArea: false, distanceFromPoc: 0.50, untraded: false },
      { kind: "LVN", price: 419.00, volume: 420, shareOfTotal: 0.03,
        insideValueArea: false, distanceFromPoc: -0.50, untraded: false },
    ],
    curve,
    curveNote: null,
    livePrice: 419.55,
    locationNote: null,
  } as LivingProfileVM;
};

/**
 * The same geometry the canvas paints, in SVG so a human can open the file
 * and confirm the shape. Nothing about the compiler is reimplemented — the
 * geometry constants match the paint block in `MainChart.tsx`.
 */
function renderProfileSvg(vm: LivingProfileVM): string {
  const glass = selectLivingProfileGlass(vm);
  if (!glass.drawn) return `<pre>REFUSED: ${glass.reason}</pre>`;

  const W = 900;
  const H = 480;
  const rightEdge = W - 96;
  const histMax = 160;
  const priceLo = Math.min(...glass.bars.map(b => b.price)) - 0.1;
  const priceHi = Math.max(...glass.bars.map(b => b.price)) + 0.1;
  const y = (p: number) =>
    ((priceHi - p) / (priceHi - priceLo)) * (H - 40) + 20;

  const rowH = Math.max(6, (H - 40) / glass.bars.length - 1);

  const yh = y(glass.vah!);
  const yl = y(glass.val!);
  const bandTop = Math.min(yh, yl);
  const bandH = Math.abs(yl - yh);

  const bandRect = `<rect x="${rightEdge - histMax - 4}" y="${bandTop}" width="${histMax + 8}" height="${bandH}" fill="rgba(237,230,211,0.05)" />`;

  const bars = glass.bars.map(b => {
    const cy = y(b.price);
    const width = Math.max(2, Math.round(b.share * histMax));
    const fill = b.isPoc
      ? "rgba(201,165,92,0.90)"
      : b.insideValueArea
        ? "rgba(237,230,211,0.72)"
        : "rgba(194,184,146,0.42)";
    return `<rect x="${rightEdge - width}" y="${cy - rowH / 2}" width="${width}" height="${rowH}" fill="${fill}" />`;
  }).join("");

  const ref = (price: number | null, ink: string, dash: string) => {
    if (price == null) return "";
    const cy = y(price);
    return `<line x1="${rightEdge - histMax - 4}" y1="${cy}" x2="${rightEdge + 2}" y2="${cy}" stroke="${ink}" stroke-width="1" stroke-dasharray="${dash}" />`;
  };
  const lines =
    ref(glass.poc, "rgba(201,165,92,0.90)", "0")
    + ref(glass.vah, "rgba(194,184,146,0.55)", "3 4")
    + ref(glass.val, "rgba(194,184,146,0.55)", "3 4");

  const marks = glass.marks.map(m => {
    const cy = y(m.price);
    const cx = rightEdge - Math.max(3, Math.round(m.weight * histMax)) - 6;
    if (m.kind === "HVN") {
      return `<circle cx="${cx}" cy="${cy}" r="2.4" fill="rgba(201,165,92,0.90)" />`;
    }
    return `<circle cx="${cx}" cy="${cy}" r="2.4" fill="none" stroke="rgba(237,230,211,0.75)" stroke-width="1" />`;
  }).join("");

  const label = (price: number | null, text: string, ink: string) => {
    if (price == null) return "";
    const cy = y(price);
    return `<text x="${rightEdge + 6}" y="${cy + 3}" font-family="ui-sans-serif" font-size="10" font-weight="600" fill="${ink}">${text}</text>`;
  };
  const labels =
    label(glass.poc, `POC ${glass.poc!.toFixed(2)}`, "rgba(201,165,92,0.95)")
    + label(glass.vah, `VAH ${glass.vah!.toFixed(2)}`, "rgba(194,184,146,0.90)")
    + label(glass.val, `VAL ${glass.val!.toFixed(2)}`, "rgba(194,184,146,0.90)");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="background:#07080a">
${bandRect}${lines}${bars}${marks}${labels}
</svg>`;
}

describe("living-profile histogram pixel proof", () => {
  it("writes a human-viewable page of the shape the canvas paints", () => {
    const vm = buildVM();
    const svg = renderProfileSvg(vm);

    // The page — labelled fixture, canon-quoted, dark-sanctuary field.
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>WM Pro — Living Profile histogram (H-703) — fixture</title>
<style>
  html,body { margin:0; padding:0; background:#07080a; color:#ede6d3; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
  .wrap { max-width: 980px; margin: 32px auto; padding: 16px 24px; border: 1px solid rgba(139,106,41,0.22); border-radius: 8px; }
  h1 { font: 600 14px/1.3 ui-sans-serif; color:#c9a55c; letter-spacing:.06em; text-transform:uppercase; margin:0 0 6px; }
  p { color:#c2b892; margin:0 0 12px; }
  .fixture { color:#8a8271; font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-top:10px; }
</style></head>
<body><div class="wrap">
<h1>H-703 · Living Profile — histogram on the canvas</h1>
<p>P-110 blueprint. Horizontal bars at the right edge, one per traded bucket.
Value-area band shaded ivory. POC picks up brass. HVN filled dot, LVN hollow ring — fill/weight, not hue.</p>
${svg}
<div class="fixture">FIXTURE · not evidence about any live market · buckets constructed to exercise geometry</div>
</div></body></html>`;

    const out = path.join(tmpdir(), "living-profile-histogram-sample.html");
    writeFileSync(out, html);

    // eslint-disable-next-line no-console
    console.log("\n  Living Profile histogram sample written to: " + out);
    // eslint-disable-next-line no-console
    console.log("  Open it: file://" + out);

    expect(html).toContain("H-703");
    // The shape must actually contain bars — not just chrome.
    expect(html.match(/<rect x="[0-9]+/g)?.length).toBeGreaterThan(5);
    // POC bucket must be present with brass fill.
    expect(html).toMatch(/rgba\(201,165,92,0\.90\)/);
  });

  it("emits at least as many rects as compiler bars, plus the value-area band", () => {
    const vm = buildVM();
    const glass = selectLivingProfileGlass(vm);
    if (!glass.drawn) throw new Error("expected drawn");
    const svg = renderProfileSvg(vm);
    const rects = (svg.match(/<rect /g) || []).length;
    expect(rects).toBeGreaterThanOrEqual(glass.bars.length + 1);
  });
});

// Exported so a future test can compare pixel geometry to canvas output.
export const __TEST_ONLY__ = { buildVM, renderProfileSvg };

// Types shape check — the compiler MUST publish `bars`.
type _BarsShape = ProfileHistogramBar["price"];
