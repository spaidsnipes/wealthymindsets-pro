// FIXTURE TAPE — harness-injected Coinbase-shaped ticker prints. NOT market data.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "../shift0924/fixture.mjs";
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
    // MULTI-BAR FIXTURE: first, a burst of prints stamped across the last 12
    // bars (each inside that bar's range), with a deliberate one-sided run on
    // three adjacent levels in bar -8 — so tape-born geometry can be judged
    // across bars, not only on the live one. Harness-injected, NOT market data.
    const back = bars.slice(-13, -1);
    back.forEach((bar, bi) => {
      for (let k = 0; k < 60; k++) {
        const price = +(bar.low + Math.random() * (bar.high - bar.low)).toFixed(2);
        const t = new Date((bar.time + 5 + Math.random() * 280) * 1000).toISOString();
        const big = Math.random() < 0.04;
        ws.send(JSON.stringify({ type: "ticker", sequence: ++seq, product_id: "BTC-USD", price: String(price),
          side: Math.random() < 0.5 ? "sell" : "buy", time: t, trade_id: ++trade,
          last_size: String(big ? (20 + Math.random() * 40).toFixed(3) : (0.1 + Math.random() * 2).toFixed(3)) }));
      }
      if (bi === 4) {
        const mid = (bar.low + bar.high) / 2;
        for (const off of [0, 0.25, 0.5]) for (let k = 0; k < 12; k++)
          ws.send(JSON.stringify({ type: "ticker", sequence: ++seq, product_id: "BTC-USD", price: String((mid + off).toFixed(2)),
            side: "buy", time: new Date((bar.time + 60 + k) * 1000).toISOString(), trade_id: ++trade, last_size: "6.000" }));
      }
    });
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
  await p.mouse.move(1590, 990); await p.waitForTimeout(800); await p.screenshot({ path: `scratchpad/garden12/mtape_${tool.replace(/\s+/g, "_")}${process.env.TAG || ""}.png` });
}
for (const which of ["bigTradeBubbleOldest", "bigTradeBubbleTop"]) {
  const pos = await p.evaluate(k => [...document.querySelectorAll("canvas")].map(c => c.dataset[k]).find(Boolean), which);
  if (!pos) { console.log("no", which); continue; }
  const [bx, by] = pos.split(",").map(Number);
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top }; });
  await p.mouse.click(box.x + bx, box.y + by); await p.waitForTimeout(1500); await p.mouse.move(1590, 990); await p.waitForTimeout(800);
  console.log("SELECT", which, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => [c.dataset.printResponse, c.dataset.printEnvelope]).find(a => a[0]) ?? "none")));
  await p.screenshot({ path: `scratchpad/garden12/force_${which}.png` });
  const cl = p.getByRole("button", { name: "Close the inspect ticket" }).first();
  if (await cl.isVisible().catch(() => false)) await cl.click();
  await p.waitForTimeout(1200);
  console.log("AFTER CLOSE", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("canvas")].map(c => c.dataset.printResponse).find(Boolean) ?? "none")));
}
const all = await p.evaluate(() => { const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.absorption !== undefined); return c ? { ...c.dataset } : {}; });
console.log("LAYERS", JSON.stringify(Object.fromEntries(Object.entries(all).filter(([k]) => /stack|heat|weather|deltaLevel|divergence|imbalance/i.test(k)))));
console.log("pageerrors", JSON.stringify(errs.slice(0, 3)));
await b.close();
