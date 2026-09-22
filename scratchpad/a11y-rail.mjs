import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "p@p.l", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto("http://localhost:3000/charts", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const summary = page.locator('[data-testid="spine-detail-summary"]');
console.log("summary name:", await summary.getAttribute("aria-label"));
const det = page.locator('[data-testid="spine-detail-drawer"]');
console.log("open before:", await det.evaluate(e => e.open));
await summary.click();
await page.waitForTimeout(400);
console.log("open after click:", await det.evaluate(e => e.open));

const inside = await page.evaluate(() => {
  const d = document.querySelector('[data-testid="spine-detail-drawer"]');
  const vis = (s) => { const e = d.querySelector(s); if (!e) return "MISSING";
    const r = e.getBoundingClientRect(); return r.height > 0 ? "VISIBLE" : "zero"; };
  return {
    market: [...d.querySelectorAll("span")].some(s => s.textContent.trim() === "Market"),
    marketText: (d.innerText||"").replace(/\s+/g," ").slice(0,220),
    ladderBar: vis('[data-testid="evidence-ladder"]'),
    roster: vis('[data-testid="evidence-ladder-roster"]'),
    more: vis('[data-testid="evidence-ladder-more"]'),
    risk: vis('[data-testid="spine-available-r-detail"]'),
    honesty: vis('[data-testid="honesty-plaque-fidelity"]'),
    fullEvidenceBtn: [...d.querySelectorAll("button")].map(b=>b.textContent.trim()),
    railScrolls: (()=>{const r=document.querySelector(".wm-decision-spine--rail");return r.scrollHeight>r.clientHeight+1;})(),
  };
});
console.log(JSON.stringify(inside, null, 2));

// focus order through the rail
await page.evaluate(() => document.querySelector(".wm-decision-spine--rail").scrollIntoView());
const order = await page.evaluate(() => {
  const rail = document.querySelector(".wm-decision-spine--rail");
  return [...rail.querySelectorAll('button, summary, a[href], [tabindex]:not([tabindex="-1"])')]
    .map(e => `${e.tagName}:${(e.getAttribute("aria-label") || e.textContent).trim().slice(0,50)}`);
});
console.log("focusables in DOM order:", JSON.stringify(order, null, 2));
await page.screenshot({ path: "scratchpad/rail-after-open.png" });
await browser.close();
