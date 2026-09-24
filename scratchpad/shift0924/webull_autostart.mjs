// FIXTURE (harness-injected, NOT Webull): status says CONNECTED → the stream goes live with NO press.
import { chromium } from "playwright-core";
const sse = (evs) => evs.map(([k, d]) => `event: ${k}\ndata: ${JSON.stringify(d)}\n\n`).join("");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const connected of [true, false]) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
  await ctx.route("**/api/broker/webull/status", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    provider: "webull", authMode: "SIGNED_OPENAPI", implemented: true, configured: connected, connected, state: connected ? "CONNECTED" : "UNCONFIGURED",
    accountCount: connected ? 1 : 0, accountTypes: connected ? ["CASH"] : [], note: "FIXTURE status", checkedAt: new Date().toISOString(),
    missing: connected ? [] : ["WEBULL_APP_KEY (or WEBULL_API_KEY)"], credentialPresence: { appKey: connected, appSecret: connected, accessToken: false },
    connectOAuth: { state: "NOT_CONFIGURED", missing: [], note: "" } }) }));
  let n = 0;
  await ctx.route("**/api/market-data/webull/stream**", r => {
    n++;
    const t = new Date().toISOString();
    r.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse([
      ["handshake", { kind: "handshake", accepted: true, credentialRejected: false, connAck: null, note: "FIXTURE accepted" }],
      ["subscribe", { kind: "subscribe", subscribed: true, status: 200, providerCode: null, note: "FIXTURE subscribed" }],
      ["quote", { kind: "quote", topic: "QUOTE", receivedAt: t, payload: { fixture: true } }]]) });
  });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m&connect=brokers", { waitUntil: "domcontentloaded", timeout: 180000 });
  await p.waitForTimeout(16000);
  const strip = p.locator("[data-webull-realtime-strip]").first();
  await strip.scrollIntoViewIfNeeded().catch(() => {});
  console.log(connected ? "CONNECTED" : "UNCONFIGURED", "| stream requests with no press:", n, "|", (await strip.innerText().catch(() => "no strip")).replace(/\s+/g, " ").slice(0, 260));
  if (connected) await strip.screenshot({ path: "scratchpad/shift0924/webull_autostart.png" });
  await ctx.close();
}
await b.close();
