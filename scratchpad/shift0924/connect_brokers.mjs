// Connect Brokers door proof: Settings (gear) → broker panel, on /charts and from /news.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
const p = await ctx.newPage();
for (const start of ["/charts?symbol=AAPL&tf=5m", "/news"]) {
  await p.goto("http://localhost:3100" + start, { waitUntil: "domcontentloaded", timeout: 180000 });
  await p.waitForTimeout(14000);
  await p.getByRole("button", { name: "Open settings" }).first().click(); await p.waitForTimeout(1200);
  await p.locator('[data-testid="settings-connect-brokers"]').click(); await p.waitForTimeout(start === "/news" ? 16000 : 2500);
  const panel = await p.locator("#wm-broker-connect").first().isVisible().catch(() => false);
  console.log(start, "→", new URL(p.url()).pathname + new URL(p.url()).search, "| broker panel visible:", panel);
  await p.screenshot({ path: `scratchpad/shift0924/connect_brokers_${start === "/news" ? "from_news" : "on_charts"}.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
}
await b.close();
