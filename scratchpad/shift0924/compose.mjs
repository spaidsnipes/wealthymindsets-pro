import sharp from "sharp";
const [,, plate, runtime, out, title] = process.argv;
const H = 1000;
const p = await sharp(plate).resize({ height: H }).toBuffer({ resolveWithObject: true });
const r = await sharp(runtime).resize({ height: H }).toBuffer({ resolveWithObject: true });
const W = p.info.width + r.info.width + 24;
const bar = 56;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = `<svg width="${W}" height="${bar}" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#0b0a08"/>
<text x="16" y="24" font-family="sans-serif" font-size="18" font-weight="700" fill="#c9a55c">CANON (left) · ${esc(title)}</text>
<text x="16" y="46" font-family="sans-serif" font-size="14" fill="#ede6d3">RUNTIME (right) = LOCAL DEV BROWSER, desktop 1600×1000 · FIXTURE BARS (harness-injected, NOT market data) · auth stubbed · NOT SERVING PROOF</text>
</svg>`;
await sharp({ create: { width: W, height: H + bar, channels: 3, background: "#0b0a08" } })
  .composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: p.data, top: bar, left: 0 },
    { input: r.data, top: bar, left: p.info.width + 24 },
  ]).png().toFile(out);
console.log(out, W, H + bar);
