// H-701B proof on a FIXTURE tape: click a delta bubble and a big-trade bubble → Inspect on the same camera.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const bars = fixtureExhaustNow(); const last = bars[bars.length - 1];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
for (const pat of ["**/api/yahoo?*type=candles*", "**/api/alpaca?*type=candles*", "**/api/finnhub?*type=candles*"])
  await ctx.route(pat, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: bars, barFidelity: "INDICATIVE", sessionKnown: false }) }));
let seq = 1000, trade = 5000;
await ctx.routeWebSocket("wss://ws-feed.exchange.coinbase.com/", ws => { ws.onMessage(() => {
  const timer = setInterval(() => { for (let k = 0; k < 4; k++) { const big = Math.random() < 0.06;
    ws.send(JSON.stringify({ type: "ticker", sequence: ++seq, product_id: "BTC-USD", price: String(+(last.close + (Math.random() - 0.5) * (last.high - last.low)).toFixed(2)),
      side: Math.random() < 0.55 ? "sell" : "buy", time: new Date().toISOString(), trade_id: ++trade,
      last_size: String(big ? (20 + Math.random() * 40).toFixed(3) : (0.1 + Math.random() * 2).toFixed(3)) })); } }, 100);
  ws.onClose(() => clearInterval(timer)); }); });
await ctx.addInitScript(() => { localStorage.setItem("wm_fp_enabled", "false"); localStorage.setItem("wm_prefRepair", "1"); localStorage.setItem("wm_absorptionAnatomy", "false"); });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=BTC&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(22000);
const canvasBox = async () => p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.bigTradeBubbleStatus !== undefined || c.dataset.deltaBubbleTop !== undefined || c.dataset.absorption !== undefined); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, d: c.dataset.deltaBubbleTop ?? null, bt: c.dataset.bigTradeBubbleTop ?? null }; });
for (const [tool, key, tag] of [["Delta Bubbles", "d", "delta"], ["Big Trades", "bt", "big"]].filter(t => !process.env.ONLY || t[2] === process.env.ONLY)) {
  await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(900);
  await p.getByText("Order flow", { exact: true }).first().click(); await p.waitForTimeout(1500);
  await p.locator('[data-testid="order-flow-tools"]').getByRole("button", { name: new RegExp("^" + tool) }).first().click();
  await p.waitForTimeout(1000); await p.keyboard.press("Escape"); await p.waitForTimeout(9000);
  const box = await canvasBox(); console.log(tag, "probe", JSON.stringify(box));
  const at = box[key]; if (!at) { console.log(tag, "no bubble"); continue; }
  const [x, y] = at.split(",").map(Number);
  await p.mouse.click(box.x + x, box.y + y); await p.waitForTimeout(1200);
  const t = p.locator('[data-testid="chart-inspect-ticket"]');
  console.log(tag, "ticket:", (await t.innerText().catch(() => "none")).replace(/\s+/g, " ").slice(0, 400));
  await p.screenshot({ path: `scratchpad/shift0924/runtime_bubble_inspect_${tag}.png` });
  await p.keyboard.press("Escape");
  // turn the tool back off before the next
  await p.getByRole("button", { name: /^Tools/ }).first().click(); await p.waitForTimeout(900);
  await p.getByText("Order flow", { exact: true }).first().click(); await p.waitForTimeout(1200);
  await p.locator('[data-testid="order-flow-tools"]').getByRole("button", { name: new RegExp("^" + tool) }).first().click();
  await p.waitForTimeout(600); await p.keyboard.press("Escape"); await p.waitForTimeout(800);
}
await b.close();
