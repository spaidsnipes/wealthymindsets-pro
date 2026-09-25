import { chromium } from "playwright-core"; import fs from "fs";
const [,, out, ...files] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const cols = 2, W = 960;
const p = await b.newPage({ viewport: { width: cols * W + 10, height: 400 } });
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${W}px);gap:10px">${files.map(f => `<img src="${img(f)}" style="width:${W}px">`).join("")}</body>`);
await p.screenshot({ path: out, fullPage: true }); await b.close();
