import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [w,h,tag] of [[1440,900,"desktop"],[834,1112,"tablet"],[390,844,"phone"],[360,800,"small"]]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  await p.goto("http://localhost:3000/founder-room-sample.html", { waitUntil:"networkidle" });
  const m = await p.evaluate(() => {
    const txt = (t) => [...document.querySelectorAll("*")]
      .filter(e => e.children.length===0 && e.textContent.trim()===t)[0];
    const r = (e) => e ? (({x,y,width,height}) => ({x:Math.round(x),y:Math.round(y),w:Math.round(width),h:Math.round(height)}))(e.getBoundingClientRect()) : null;
    const prep = txt("PREP"), learn = txt("LEARN"), exec = txt("EXECUTE");
    const hdr = document.querySelector("header");
    // does anything overlap EXECUTE?
    let overlap = null;
    if (exec) {
      const er = exec.getBoundingClientRect();
      const cx = er.x + er.width/2, cy = er.y + er.height/2;
      const top = document.elementFromPoint(cx, cy);
      overlap = top && !exec.contains(top) && top !== exec ? (top.tagName+"."+String(top.className).slice(0,40)) : null;
    }
    return { header:r(hdr), prep:r(prep), learn:r(learn), execCovered: overlap };
  });
  const bar = m.prep && m.learn ? (m.learn.y + m.learn.h - m.prep.y) : null;
  console.log(`${tag} ${w}x${h}  header.h=${m.header?.h}  modeBarSpan=${bar}px  execCoveredBy=${m.execCovered}`);
  await p.close();
}
await b.close();
