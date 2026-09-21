import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const sizes = [[844, 390, "phone-landscape"], [740, 360, "small-landscape"], [1112, 834, "tablet-landscape"]];
for (const [w, h, tag] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3000/founder-room-sample.html", { waitUntil: "networkidle" });
  const m = await p.evaluate((vh) => {
    const r = (e) => e ? (({ x, y, width, height }) => ({ y: Math.round(y), h: Math.round(height) }))(e.getBoundingClientRect()) : null;
    const hdr = document.querySelector("header");
    const nav = document.querySelector(".wm-os-phone-nav");
    const prov = document.querySelector(".wm-os-provenance");
    const navBox = nav ? nav.getBoundingClientRect() : null;
    return {
      header: r(hdr),
      nav: r(nav),
      navVisible: nav ? getComputedStyle(nav).display !== "none" : null,
      prov: r(prov),
      // how much vertical room is left for the room itself
      roomLeft: vh - (hdr ? hdr.getBoundingClientRect().height : 0) - (navBox && getComputedStyle(nav).display !== "none" ? navBox.height : 0),
      docScroll: document.documentElement.scrollHeight,
    };
  }, h);
  console.log(tag, w + "x" + h, JSON.stringify(m));
  await p.screenshot({ path: `/tmp/ls-${tag}.png` });
  await p.close();
}
await b.close();
