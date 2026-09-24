// FIXTURE TAPE — harness-injected Coinbase-shaped ticker prints. NOT market data.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const bars = fixtureExhaustNow();
const last = bars[bars.length - 1];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
for (const pat of ["**/api/yahoo?*type=candles*", "**/api/alpaca?*type=candles*", "**/api/finnhub?*type=candles*"])
  await ctx.route(pat, r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ candles: bars, barFidelity: "INDICATIVE", sessionKnown: false }) }));
let seq = 1000, trade = 5000;
await ctx.routeWebSocket("wss://ws-feed.exchange.coinbase.com/", ws => {
  ws.onMessage(() => {
    const timer = setInterval(() => {
      for (let k = 0; k < 4; k++) {
        const r = Math.random();
        const price = +(last.close + (Math.random() - 0.5) * (last.high - last.low)).toFixed(2);
        const big = r < 0.06;
        ws.send(JSON.stringify({ type: "ticker", sequence: ++seq, product_id: "BTC-USD", price: String(price),
          side: Math.random() < 0.55 ? "sell" : "buy", time: new Date().toISOString(), trade_id: ++trade,
          last_size: String(big ? (20 + Math.random() * 40).toFixed(3) : (0.1 + Math.random() * 2).toFixed(3)) }));
      }
    }, 100);
    ws.onClose(() => clearInterval(timer));
  });
});
const OFF = (process.env.OFF || "").split(",").filter(Boolean);
await ctx.addInitScript(off => { localStorage.setItem("wm_fp_enabled", "false"); for (const k of off) localStorage.setItem(k, "false"); }, OFF);
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
await p.goto("http://localhost:3100/charts?symbol=BTC&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
for (const tool of (process.env.TOOLS ? process.env.TOOLS.split(",") : ["Delta Bubbles", "Big Trades"])) {
  await p.getByRole("button", { name: /^Tools/ }).first().click();
  await p.waitForTimeout(900);
  await p.getByText("Order flow", { exact: true }).first().click();
  await p.waitForTimeout(1500);
  await p.locator('[data-testid="order-flow-tools"]').getByRole("button", { name: new RegExp("^" + tool) }).first().click();
  await p.waitForTimeout(8000);
  const ds = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined); return c ? { ...c.dataset } : {}; });
  console.log(tool, "state:", JSON.stringify(Object.fromEntries(Object.entries(ds).filter(([k]) => /bubble|bigTrade|footprint|tape|flow/i.test(k)))));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  const close = p.getByRole("button", { name: /^close$/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `scratchpad/shift0924/tape_${tool.replace(/\s+/g, "_")}${process.env.TAG || ""}.png` });
}
const all = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined); return c ? { ...c.dataset } : {}; });
console.log("LAYERS", JSON.stringify(Object.fromEntries(Object.entries(all).filter(([k]) => /stack|heat|weather|deltaLevel|divergence|imbalance/i.test(k)))));
console.log("pageerrors", JSON.stringify(errs.slice(0, 3)));
await b.close();
