import { chromium } from "playwright-core"; import fs from "fs";
const [,, src, out, x, y, w, h, scale] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const k = +(scale ?? 2);
const p = await b.newPage({ viewport: { width: +w * k, height: +h * k } });
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${fs.readFileSync(src).toString("base64")}" style="transform-origin:0 0;transform:scale(${k}) translate(${-x}px,${-y}px)"></body>`);
await p.screenshot({ path: out }); await b.close();
