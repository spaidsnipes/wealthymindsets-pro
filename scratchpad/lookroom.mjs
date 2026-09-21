import { chromium } from "playwright";
const file = process.argv[2];
const tag = process.argv[3] ?? "room";
const b = await chromium.launch({ channel: "chrome" });
for (const [w, h, v] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("file://" + file, { waitUntil: "load" });
  const m = await p.evaluate(() => {
    const hdr = document.querySelector("header");
    const room = document.querySelector('[data-testid="os-room"]') || document.querySelector("main");
    const px = (e) => e ? Math.round(e.getBoundingClientRect().height) : null;
    // A room plane offence: an opaque near-black full-extent element inside the room
    const offenders = [...document.querySelectorAll("*")].filter((e) => {
      const cs = getComputedStyle(e);
      const m2 = cs.backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
      if (!m2) return false;
      const [r, g, bl] = [+m2[1], +m2[2], +m2[3]];
      const a = m2[4] === undefined ? 1 : +m2[4];
      if (a < 1 || r > 0x22 || g > 0x22 || bl > 0x22) return false;
      const rect = e.getBoundingClientRect();
      return rect.height > window.innerHeight * 0.6 && rect.width > window.innerWidth * 0.6;
    }).map((e) => e.tagName + "." + String(e.className).slice(0, 50));
    return {
      sanctuary: !!document.querySelector(".wm-sanctuary"),
      masthead: px(hdr),
      firstViewportText: document.body.innerText.slice(0, 220).replace(/\s+/g, " "),
      roomPlaneOffenders: offenders.slice(0, 4),
    };
  });
  console.log(v, w + "x" + h, JSON.stringify(m, null, 1));
  await p.screenshot({ path: `/tmp/${tag}-${v}.png` });
  await p.close();
}
await b.close();
