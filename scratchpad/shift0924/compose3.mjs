import sharp from "sharp";
// plate | runtime on top, the runtime's 2× detail crop full-width underneath.
const [,, plate, runtime, detail, out, title] = process.argv;
const H = 1000;
const p = await sharp(plate).resize({ height: H }).toBuffer({ resolveWithObject: true });
const r = await sharp(runtime).resize({ height: H }).toBuffer({ resolveWithObject: true });
const W = p.info.width + r.info.width + 24;
const d = await sharp(detail).resize({ width: W }).toBuffer({ resolveWithObject: true });
const bar = 56, gap = 40;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = `<svg width="${W}" height="${bar}" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#0b0a08"/>
<text x="16" y="24" font-family="sans-serif" font-size="18" font-weight="700" fill="#c9a55c">CANON (left) · ${esc(title)}</text>
<text x="16" y="46" font-family="sans-serif" font-size="14" fill="#ede6d3">RUNTIME (right) = LOCAL DEV BROWSER, desktop 1600×1000 · FIXTURE BARS (harness-injected, NOT market data) · auth stubbed · NOT SERVING PROOF</text>
</svg>`;
const lab = `<svg width="${W}" height="${gap}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0a08"/>
<text x="16" y="27" font-family="sans-serif" font-size="16" font-weight="700" fill="#c9a55c">DETAIL · the same runtime frame, shot at 2× device pixels (no retouching)</text></svg>`;
await sharp({ create: { width: W, height: bar + H + gap + d.info.height, channels: 3, background: "#0b0a08" } })
  .composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: p.data, top: bar, left: 0 },
    { input: r.data, top: bar, left: p.info.width + 24 },
    { input: Buffer.from(lab), top: bar + H, left: 0 },
    { input: d.data, top: bar + H + gap, left: 0 },
  ]).png().toFile(out);
console.log(out, W, bar + H + gap + d.info.height);
