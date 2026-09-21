import { chromium } from "playwright";
const routes = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
for (const route of routes) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  await p.goto("http://localhost:3000" + route, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => ({
    url: location.pathname,
    os: !!document.querySelector('[data-testid="wm-operating-system"]'),
    sanctuary: !!document.querySelector(".wm-sanctuary"),
    july: !!document.querySelector(".wm-universe"),
    masthead: !!document.querySelector(".wm-os-masthead"),
    bodyText: document.body.innerText.slice(0, 160).replace(/\s+/g, " "),
  }));
  console.log(route, JSON.stringify(m), errs.length ? "ERR:" + errs[0] : "");
  await p.screenshot({ path: `/tmp/room${route.replace(/\//g, "_")}.png` });
  await p.close();
}
await b.close();
