import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch({ channel: "chrome" });
for (const [w,h,tag] of [[1440,900,"desktop"],[390,844,"phone"]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
  await p.goto(`${base}/founder-room-sample.html`, { waitUntil:"networkidle" });
  await p.screenshot({ path:`/tmp/f8-${tag}.png` });
  const m = await p.evaluate(() => {
    const s = document.querySelector(".wm-sanctuary");
    const cs = s ? getComputedStyle(s) : null;
    const after = s ? getComputedStyle(s,"::after") : null;
    const before = s ? getComputedStyle(s,"::before") : null;
    return {
      sanctuary: !!s,
      bg: cs?.backgroundColor, bgImg: (cs?.backgroundImage||"").slice(0,90),
      grainOpacity: after?.opacity, grainBlend: after?.mixBlendMode,
      vignette: (before?.background||"").slice(0,60),
      julyUniverse: !!document.querySelector(".wm-universe"),
      julyHeader: !!document.querySelector(".wm-shell-header"),
    };
  });
  console.log(tag, JSON.stringify(m,null,1));
  await p.close();
}
await b.close();
