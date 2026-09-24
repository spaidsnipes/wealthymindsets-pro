// FIXTURE Webull SSE (harness-injected, NOT Webull): drop → reconnect → gap; and a revoked credential → REAUTHORIZE.
import { chromium } from "playwright-core";
const sse = (evs) => evs.map(([k, d]) => `event: ${k}\ndata: ${JSON.stringify(d)}\n\n`).join("");
const hs = (ok, rej = false) => ["handshake", { kind: "handshake", accepted: ok, credentialRejected: rej, connAck: null, note: ok ? "FIXTURE accepted" : "FIXTURE credential rejected" }];
const sub = ["subscribe", { kind: "subscribe", subscribed: true, status: 200, providerCode: null, note: "FIXTURE subscribed" }];
const q = (t) => ["quote", { kind: "quote", topic: "QUOTE", receivedAt: t, payload: { fixture: true } }];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const mode of ["drop", "revoked"]) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
  let n = 0;
  await ctx.route("**/api/market-data/webull/stream**", r => {
    n++;
    const now = Date.now();
    const body = mode === "revoked" ? sse([hs(false, true), ["closed", { kind: "closed", reason: "FIXTURE: broker refused the credential" }]])
      : n === 1 ? sse([hs(true), sub, q(new Date(now - 3000).toISOString()), q(new Date(now - 2000).toISOString())])
      : sse([hs(true), sub, q(new Date(now).toISOString())]);
    r.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body });
  });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m&connect=brokers", { waitUntil: "domcontentloaded", timeout: 180000 });
  await p.waitForTimeout(14000);
  const strip = p.locator("[data-webull-realtime-strip]").first();
  await strip.scrollIntoViewIfNeeded();
  await strip.getByRole("button", { name: /Start the .* real-time stream/ }).click();
  await p.waitForTimeout(mode === "drop" ? 5000 : 4000);
  console.log(mode, "| stream requests:", n, "|", (await strip.innerText()).replace(/\s+/g, " ").slice(0, 420));
  await strip.screenshot({ path: `scratchpad/shift0924/webull_continuity_${mode}.png` });
  await ctx.close();
}
await b.close();
