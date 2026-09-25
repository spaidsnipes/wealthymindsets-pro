// BEFORE | AFTER receipt: two crops side by side with a stamp. node ba.mjs before after out "stamp" x y w h
import { chromium } from "playwright-core"; import fs from "fs";
const [,, before, after, out, stamp, x = 0, y = 0, w = 1600, h = 1000] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const W = +w, H = +h;
const p = await b.newPage({ viewport: { width: W * 2 + 12, height: H + 44 } });
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
const pane = (f, t) => `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden"><img src="${img(f)}" style="position:absolute;left:${-x}px;top:${-y}px"><div style="position:absolute;left:6px;top:6px;background:#000c;color:#f0be46;font:700 13px system-ui;padding:3px 8px">${t}</div></div>`;
await p.setContent(`<body style="margin:0;background:#000"><div style="color:#ede6d3;font:600 12px system-ui;padding:6px 8px;height:32px;box-sizing:border-box">${stamp}</div><div style="display:flex;gap:12px">${pane(before, "BEFORE")}${pane(after, "AFTER")}</div></body>`);
await p.screenshot({ path: out }); await b.close();
