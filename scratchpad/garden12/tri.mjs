import { chromium } from "playwright-core"; import fs from "fs";
const [,, out, stamp, ...pairs] = process.argv; // file:title ...
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const W = 640, H = 420;
const p = await b.newPage({ viewport: { width: W * pairs.length + 8 * (pairs.length - 1), height: H + 34 } });
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
await p.setContent(`<body style="margin:0;background:#000"><div style="color:#ede6d3;font:600 12px system-ui;padding:8px">${stamp}</div><div style="display:flex;gap:8px">${pairs.map(x => { const [f, t] = x.split("::"); return `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden"><img src="${img(f)}" style="width:${W * 2}px;margin-left:-${W * 0.9}px;margin-top:-${H * 0.3}px"><div style="position:absolute;left:6px;top:6px;background:#000c;color:#f0be46;font:700 13px system-ui;padding:3px 8px">${t}</div></div>`; }).join("")}</div></body>`);
await p.screenshot({ path: out }); await b.close();
