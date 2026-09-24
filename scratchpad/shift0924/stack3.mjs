import { chromium } from "playwright";
import fs from "fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 800, height: 1230 } });
const img = d => `data:image/png;base64,${fs.readFileSync(`scratchpad/shift0924/runtime_scaffold_${d}.png`).toString("base64")}`;
await p.setContent(`<body style="margin:0;background:#000">${["FOUNDATION","INTERMEDIATE","PRO"].map(d=>`<div style="width:800px;height:410px;overflow:hidden"><img src="${img(d)}" style="margin-top:-230px"></div>`).join("")}</body>`);
await p.screenshot({ path: "scratchpad/shift0924/runtime_scaffold_three.png" });
await b.close();
