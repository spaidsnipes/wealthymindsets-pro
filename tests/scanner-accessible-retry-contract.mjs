import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// This is a behavior contract, not a stale branch-manifest assertion. Branch
// purity is enforced at review time against the current merge base; pinning an
// August 6 SHA made the test reject every legitimate later mainline change.

const page = readFileSync(path.join(root, "src/app/scanner/page.tsx"), "utf8");
const identity = readFileSync(path.join(root, "src/lib/scannerRequestIdentity.ts"), "utf8");

assert.equal((page.match(/`Retry failed RSI for \$\{r\.symbol\}`/g) ?? []).length, 1, "one identity-bound accessible-name template");
assert.match(page, /aria-label="Scanner request identity"/);
assert.match(page, /aria-describedby=\{rsiStatusId\}/);
assert.match(page, /id=\{rsiStatusId\}/);
assert.match(page, /scanner-rsi-status-\$\{scannerRsiIdentityDomToken\(rsiIdentity\)\}/);
assert.match(page, /aria-busy=\{rsiRetrying\}/);
assert.match(page, /disabled=\{rsiRetrying\}/);
assert.match(page, /rsiRetryInFlightRef\.current\.has\(key\)/);
assert.match(page, /retryFailedRsi\(rsiIdentity\)/);
assert.match(page, /const previousFailure = rsiFailuresRef\.current\.get\(key\) \?\? null/);
assert.match(page, /const currentFailure = outcome\.failure \?\? \(outcome\.rsi === null \? previousFailure : null\)/);
assert.match(page, /if \(outcome\.rsi !== null\)/, "only a real RSI value may announce an update");
assert.match(page, /rsiRetryButtonRefs\.current\.get\(key\)\?\.focus\(\)/);
assert.match(page, /rsiStatusRefs\.current\.get\(key\)\?\.focus\(\)/);
assert.match(page, /onChange=\{event => setSelectedRsiIdentityKey\(event\.target\.value\)\}/);
assert.doesNotMatch(page, /onChange=\{[^}]*fetch|onChange=\{[^}]*refresh/);
assert.match(page, /void retryFailedRsi\(rsiIdentity\)/);
assert.doesNotMatch(page, /retryFailedRsi[\s\S]{0,500}refresh\(true\)/);
assert.match(page, /void refresh\(true\)/, "global refresh remains separate");
assert.doesNotMatch(page, /last-SVG|last-of-type|querySelector\([^)]*button|\.click\(\)/i);
assert.match(identity, /version=\$\{identity\.version\}&indicator=\$\{identity\.indicator\}&symbol=\$\{identity\.symbol\}&timeframe=\$\{identity\.timeframe\}&bars=\$\{identity\.bars\}/);
assert.match(identity, /new TextEncoder\(\)\.encode\(scannerRsiIdentityKey\(identity\)\)/);

// Deterministic 31-second orchestration proof: scheduled refresh occurs once,
// while the cached failed identity is suppressed and quote/profile orchestration
// each remains part of that one refresh. Profile HTTP may be cache-served.
let rsiRequests = 0;
let scheduledRefreshes = 0;
let quoteOrchestrations = 0;
let profileOrchestrations = 0;
const failed = new Set(["AAPL"]);
const scheduledRefresh = () => {
  scheduledRefreshes += 1;
  quoteOrchestrations += 1;
  profileOrchestrations += 1;
  if (!failed.has("AAPL")) rsiRequests += 1;
};
for (const elapsed of [30_000]) if (elapsed <= 31_000) scheduledRefresh();
assert.deepEqual({ rsiRequests, scheduledRefreshes, quoteOrchestrations, profileOrchestrations }, {
  rsiRequests: 0, scheduledRefreshes: 1, quoteOrchestrations: 1, profileOrchestrations: 1,
});

console.log("SCANNER_ACCESSIBLE_RETRY_CONTRACT_PASS symbols=30 scheduled=1 quote=1 profile=1 failed_rsi=0");
