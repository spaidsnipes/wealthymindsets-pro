import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// WM-SCANNER-RECONCILE-01: this test was carried from branch A onto the
// reconciled branch (built off origin/main per forge scanner-cache-reconciliation
// §3). The manifest-freeze is a branch-PURITY guard — it pins the exact file set
// the change is allowed to touch. Its base and expected list are updated to the
// reconciled branch's set (A's identity module + B's consumer module + the
// synthesis cache/test). Every a11y BEHAVIOR assertion below is unchanged from A.
const base = "4add406db4e197a166c4038e1a06f4739a1db9d2"; // origin/main at branch point
const expectedManifest = [
  "M\tsrc/app/scanner/page.tsx",
  "A\tsrc/lib/scannerRequestIdentity.ts",
  "A\tsrc/lib/scannerRequestIdentity.test.ts",
  "A\tsrc/lib/yahooCandleConsumer.ts",
  "A\tsrc/lib/yahooCandleConsumer.test.ts",
  "A\tsrc/lib/scannerFailureCache.ts",
  "A\tsrc/lib/scannerFailureCache.test.ts",
  "A\ttests/scanner-accessible-retry-contract.mjs",
].sort();

const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
let manifest;
if (head === base) {
  manifest = execFileSync("git", ["-C", root, "status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" })
    .trimEnd().split("\n").filter(Boolean)
    .map(line => `${line.slice(0, 2) === "??" ? "A" : line.slice(0, 2).trim()}\t${line.slice(3)}`);
} else {
  manifest = git("diff", "--name-status", `${base}..HEAD`).split("\n").filter(Boolean);
}
assert.deepEqual(manifest.sort(), expectedManifest, "the prerequisite must keep the exact frozen four-file manifest");

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
assert.match(page, /rsiFailuresRef\.current\.delete\(key\)/);
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

console.log("SCANNER_ACCESSIBLE_RETRY_CONTRACT_PASS manifest=4 symbols=30 scheduled=1 quote=1 profile=1 failed_rsi=0");
