import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const sha256 = value => createHash("sha256").update(value).digest("hex");

const [scanner, watchlist, sessionVp, backtestEngine, backtestingPage] = await Promise.all([
  read("src/app/scanner/page.tsx"),
  read("src/components/chart/WatchlistGrid.tsx"),
  read("src/components/chart/WMSessionVP.tsx"),
  read("src/lib/backtest/engine.ts"),
  read("src/app/backtesting/page.tsx"),
]);

assert.match(scanner, /failures\.has\(identity\)/, "Scanner must consult the mounted non-retryable RSI cache");
assert.match(scanner, /if \(!outcome\.retryable\) failures\.set\(identity, true\)/, "Scanner must cache non-retryable RSI failures");
assert.match(scanner, /if \(explicitRetry\) rsiFailuresRef\.current\.clear\(\)/, "only explicit retry may clear the mounted RSI failure cache");
assert.match(scanner, /setInterval\(refresh, 30_000\)/, "the existing 30-second quote refresh remains active");

assert.doesNotMatch(watchlist, /setInterval\(/, "Watchlist cards must not poll every failure state");
assert.match(watchlist, /outcome\.status === "ready"[\s\S]*setTimeout/, "only a ready outcome may schedule the next Watchlist poll");
assert.match(watchlist, /data\.retryable && <button/, "Watchlist retry UI must be gated by retryability");

const allowlist = sessionVp.match(/SESSION_VP_YAHOO_TIMEFRAMES = new Set\(\[([^\]]+)\]\)/)?.[1]
  .match(/"[^"]+"/g)?.map(value => value.slice(1, -1));
assert.deepEqual(allowlist, ["1m", "2m", "5m", "15m", "30m", "1h"], "Session VP Yahoo allowlist must be exact");
assert.match(sessionVp, /if \(!SESSION_VP_YAHOO_TIMEFRAMES\.has\(timeframe\)\)/, "Session VP must reject before requesting Yahoo");
assert.doesNotMatch(sessionVp, /\? timeframe : "30m"/, "Session VP must not substitute 30m");

assert.equal(sha256(backtestEngine), "eb4a5961055895df0659ef4b95392a7af23ed1d67054972cee7c122df7f39d6e", "Backtesting engine must remain byte-identical");
assert.equal(sha256(backtestingPage), "f1d51601b242484fb54639c221c2f848316f9a80350b93d96109d9e86f1d410d", "Backtesting page must remain byte-identical");
assert.match(backtestEngine, /if \(!res\.ok\) throw new Error/, "Backtesting must stop before producing results from non-2xx data");

console.log("yahoo-candle-nonmanifest-consumers: 11 deterministic assertions passed");
