/**
 * POST-EDIT VISUAL RECEIPT — the grain layer, before and after the lift.
 *
 * The CSS is not retyped here. It is extracted from the <style> template
 * literal inside WMExperienceShell.tsx, so what gets photographed is the string
 * the browser actually receives. A receipt built from a hand-copied stylesheet
 * proves the copy, not the product.
 *
 * BEFORE pane re-pins the grain to z-index 0 (one appended override, printed in
 * the page) to reproduce the layer order as it shipped until this commit.
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("src/components/experience/WMExperienceShell.tsx", "utf8");

// The sanctuary stylesheet: the contents of the <style>{` ... `}</style> block.
const m = src.match(/<style>\{`([\s\S]*?)`\}<\/style>/);
if (!m) throw new Error("could not find the sanctuary <style> block");

/**
 * Two substitutions, and they are the only two. Both are named on the page.
 *
 *   1. The breakpoint interpolation, which is a number in the module.
 *   2. The grain URL. The shell asks the SERVER for `/wm/grain-256.webp`; this
 *      receipt is a file:// page, where that resolves to `file:///wm/...` and
 *      silently loads nothing. Inlining the SHIPPED BYTES keeps the photograph
 *      about the real tile instead of about a broken request.
 */
const TILE_B64 = readFileSync("public/wm/grain-256.webp").toString("base64");
const TILE_URL = `data:image/webp;base64,${TILE_B64}`;

const CSS = m[1]
  .replace(/\$\{OS_RAIL_BREAKPOINT_PX\}/g, "900")
  .replace('url("/wm/grain-256.webp")', `url("${TILE_URL}")`);

if (CSS.includes("/wm/grain-256.webp")) throw new Error("grain URL substitution missed");

// The field + key/fill lights are set inline on the element in the shell, so
// they live in the style OBJECT rather than the stylesheet. Taken from the same
// file rather than invented.
const FIELD = `
  .wm-sanctuary {
    position: relative;
    isolation: isolate;
    min-height: 620px;
    background-color: #07080a;
    background-image:
      radial-gradient(1200px 700px at 28% 16%, rgba(212,175,106,0.07), transparent 58%),
      radial-gradient(900px 620px at 78% 8%, rgba(255,248,235,0.035), transparent 52%);
    color: #ede6d3;
    padding: 22px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }`;

// Representative room content: the real surface + text tokens from wmTokens.ts.
const panel = (surface, label) => `
  <div class="wm-probe-${label}" style="background:${surface};border:1px solid rgba(139,106,41,0.35);border-radius:6px;padding:14px 16px;margin-bottom:10px">
    <div style="font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:#8a8271;margin-bottom:6px">${label} — ${surface}</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#ede6d3;letter-spacing:.3px">428.61</div>
    <div style="font-size:12px;color:#c0b8a0;line-height:1.6;margin-top:4px">
      Right-of-way withheld — evidence debt unpaid. Five of eight nodes paid.
    </div>
    <div style="font-size:10px;color:#8a8271;margin-top:6px">as of 09:31:04 · INDICATIVE · muted on ${surface}</div>
  </div>`;

const ROOM = `
  <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#c9a55c;margin-bottom:12px">Market — TSLA</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div>
      ${panel("#0b0b0d", "deep")}
      ${panel("#131317", "mid")}
    </div>
    <div>
      ${panel("#1c1c22", "raised")}
      ${panel("#26262d", "highest")}
    </div>
  </div>
  <div style="height:120px;margin-top:6px;border:1px solid rgba(139,106,41,0.15);border-radius:6px;
              background:linear-gradient(90deg,#0b0b0d,#131317 40%,#0b0b0d);display:flex;
              align-items:center;justify-content:center;color:#55503f;font-size:11px;letter-spacing:.4px">
    MARKET CANVAS — the only place price may move
  </div>`;

const pane = (title, note, override) => `
  <section style="flex:1 1 0;min-width:0">
    <div style="font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:#c9a55c;padding:0 0 4px 2px">${title}</div>
    <div style="font-size:11px;color:#8a8271;padding:0 0 8px 2px;height:30px">${note}</div>
    <style>${CSS}${FIELD}${override}</style>
    <div class="wm-sanctuary">
      <div class="wm-water-breath" aria-hidden="true"></div>
      <div>${ROOM}</div>
    </div>
  </section>`;

// One line, and it is the whole difference this commit makes.
const BEFORE_OVERRIDE = `
  #before .wm-sanctuary::after { z-index: 0; }`;

const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Grain lift</title></head>
<body style="margin:0;padding:24px;background:#000;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:16px;color:#c9a55c;margin:0 0 4px">
    Sanctuary grain — z-index 0 (behind the room) vs z-index 40 (on the room)
  </h1>
  <p style="font-size:11px;color:#8a8271;margin:0 0 18px;max-width:900px;line-height:1.6">
    FIXTURE ROOM — NOT LIVE MARKET DATA. Both panes use the stylesheet extracted
    verbatim from WMExperienceShell.tsx. The only difference is the single
    declaration printed below each pane. Two substitutions were made to the
    extracted CSS and no others: the breakpoint interpolation, and the grain
    URL, swapped from the server path <code>/wm/grain-256.webp</code> to the
    same file's bytes inlined, because this page is served from file://.
  </p>
  <div style="display:flex;gap:22px;align-items:flex-start">
    <div id="before" style="flex:1 1 0;min-width:0">${pane(
      "BEFORE — grain z-index 0",
      "Tile sits under the content plane. Visible only in the gaps between panels.",
      BEFORE_OVERRIDE,
    )}</div>
    <div id="after" style="flex:1 1 0;min-width:0">${pane(
      "AFTER — grain z-index 40",
      "Tile sits over the room. One film stock across the whole frame.",
      "",
    )}</div>
  </div>
</body></html>`;

writeFileSync("/tmp/grain-lift.html", HTML, "utf8");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto("file:///tmp/grain-lift.html");
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/grain-lift.png", fullPage: true });

/**
 * The measurement the screenshot cannot make by eye: is the grain actually
 * landing ON a panel, or only on the field? Sampled by reading the composited
 * pixels straight off a canvas snapshot of each pane's brightest panel.
 */
const probe = await page.evaluate(() => {
  // The flat patch: top-right corner INSIDE the brightest panel, clear of the
  // label text, so the only thing that can put variance there is the grain.
  const read = (sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return {
      x: Math.round(r.right - 62),
      y: Math.round(r.top + 6),
      width: 48,
      height: 18,
    };
  };
  return {
    before: read("#before .wm-probe-highest"),
    after: read("#after .wm-probe-highest"),
  };
});

// Variance of a flat panel region tells us whether grain reached it. A flat
// #26262d panel under no grain has ~zero variance; under grain it has the
// tile's texture.
async function variance(box) {
  const shot = await page.screenshot({ clip: box });
  const sharp = (await import("sharp")).default;
  const { data } = await sharp(shot).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const v = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
  return { mean: mean.toFixed(2), stdev: Math.sqrt(v).toFixed(3) };
}

console.log("BEFORE panel patch:", await variance(probe.before));
console.log("AFTER  panel patch:", await variance(probe.after));

/**
 * A 0.06 overlay tile is, by design, invisible at 1:1 in a downscaled review
 * image — that is the whole point of the Canon's window. So the receipt also
 * emits a magnified crop of the SAME panel in both panes, nearest-neighbour so
 * no resampler invents or smooths the texture being judged.
 */
const sharp = (await import("sharp")).default;
const ZOOM = 6;
const CROP = { width: 150, height: 92 };

async function zoom(box, label) {
  const shot = await page.screenshot({
    clip: { x: box.x - 90, y: box.y - 2, ...CROP },
  });
  return sharp(shot)
    .resize(CROP.width * ZOOM, CROP.height * ZOOM, { kernel: "nearest" })
    .extend({ top: 26, bottom: 8, left: 8, right: 8, background: "#000" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${CROP.width * ZOOM + 16}" height="26">
             <text x="10" y="18" font-family="monospace" font-size="15" fill="#c9a55c">${label}</text>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

const [zBefore, zAfter] = [
  await zoom(probe.before, "BEFORE — grain z-index 0 — panel is bare"),
  await zoom(probe.after, "AFTER — grain z-index 40 — panel carries the tile"),
];
const zw = CROP.width * ZOOM + 16;
const zh = CROP.height * ZOOM + 34;
await sharp({
  create: { width: zw, height: zh * 2 + 10, channels: 3, background: "#000" },
})
  .composite([
    { input: zBefore, top: 0, left: 0 },
    { input: zAfter, top: zh + 10, left: 0 },
  ])
  .png()
  .toFile("/tmp/grain-zoom.png");

console.log("\nwrote /tmp/grain-lift.png and /tmp/grain-zoom.png");
await browser.close();
