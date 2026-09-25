import { chromium } from "playwright-core"; import fs from "fs";
const [,, out, ...files] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:800px 800px">${files.map(f => `<div style="position:relative;width:800px;height:500px;overflow:hidden"><img src="${img(f)}" style="width:800px"><div style="position:absolute;left:4px;top:4px;background:#000c;color:#f0be46;font:700 12px system-ui;padding:2px 6px">${f.split("solo_")[1]}</div></div>`).join("")}</body>`);
await p.screenshot({ path: out }); await b.close();
