/**
 * LIVE EXECUTION STAYS CLOSED — Garden 16 §14 ("Never fake execution") and
 * §75 ("remove old executable authority"), 2026-09-26.
 *
 * Found by the Lane S audit at 3ff5cd7 and confirmed by a skeptic:
 *   - `/api/tradovate` forwarded ANY signed-in user's method, payload and
 *     bearer token to `https://live.tradovateapi.com/v1/<caller-chosen
 *     endpoint>`, and took the token as a URL query param on GET. No owner
 *     gate, no execution authority, no ledger, no receipt, and no in-app
 *     caller. The route is RETIRED in the same commit as this file.
 *   - Live execution is not authorized in this environment. The two other
 *     doors that could open it are held shut by code, not by habit: Alpaca's
 *     trading base is the paper host (`ALPACA_PAPER_BASE`, src/lib/alpacaSafety.ts),
 *     and Webull's place path (`submitWebullOrderOnce`) refuses unless a caller
 *     passes `liveOrdersEnabled: true` — and no caller exists.
 *
 * This Sentinel reads source (a breadcrumb, not a runtime proof). It fails if:
 *   A. any server file (src/app/api or src/lib) names a `tradovateapi.com`
 *      host other than `demo.tradovateapi.com` (the live host, an assembled
 *      `".tradovateapi.com"`, or any other subdomain), or any API route under
 *      the retired `/api/tradovate` prefix comes back (a catch-all included);
 *   B. any server file names an `*.alpaca.markets` host other than the paper
 *      trading host and the market-data hosts — i.e. a live trading base;
 *   C. `submitWebullOrderOnce` gains a caller other than THE ONE DOOR
 *      (/api/broker/webull/order-submit, opened 2026-10-01 on the Founder's
 *      instruction, behind the owner gate and executionAuthority);
 *   D. any non-test source other than the one door sets `liveOrdersEnabled`
 *      to anything but `false` (dot, quoted or bracketed key; `false || x` is
 *      not `false`), or the door opens it before authority and preview;
 *   E. the Webull place/cancel endpoints are named anywhere but their contract
 *      entry and the one place path: `ORDER_PLACE` / `ORDER_CANCEL` and the
 *      `/trading/orders/place|cancel` paths. C watches one function name; E
 *      watches the endpoint itself, so a second sender written from scratch
 *      is caught too.
 *
 * Scope for A and B is src/app/api AND src/lib, one step wider than the audit
 * asked: a live base written in lib and imported by a route is the same hole.
 * Measured 2026-09-26: 654 server files, 66 of them under src/app/api; the
 * only Alpaca hosts in them are paper-api, data and stream.data.
 *
 * Comments are stripped first (src/lib/ops/sourceGraph → sourceScan), so the
 * prose above and the dated notes at each fix site are not read as code. The
 * stripper spares `://`, so a URL inside a string literal is still seen.
 */
import { describe, expect, it } from "vitest";
import { apiRoutePaths, sourceFiles } from "@/lib/ops/sourceGraph";
import { ALPACA_PAPER_BASE } from "@/lib/alpacaSafety";

/** Every non-test .ts/.tsx under src, comments stripped. */
const SOURCES = sourceFiles();
const SERVER = SOURCES.filter((f) => f.file.startsWith("app/api/") || f.file.startsWith("lib/"));
const API = SERVER.filter((f) => f.file.startsWith("app/api/"));

// ── A. Tradovate live host ───────────────────────────────────────────────────
/** Greedy on the left, like B: an assembled `"https://" + "live" + ".tradovateapi.com"`
 *  yields `.tradovateapi.com`, which is not the demo host. */
const TRADOVATE_HOST = /[a-z0-9.-]*tradovateapi\.com/gi;
const TRADOVATE_DEMO_HOST = "demo.tradovateapi.com";
const RETIRED_ROUTE = "/api/tradovate";

function nonDemoTradovateHostsIn(text: string): string[] {
  return [...text.matchAll(TRADOVATE_HOST)].map((m) => m[0].toLowerCase()).filter((h) => h !== TRADOVATE_DEMO_HOST);
}

/** Any route under the retired prefix — `/api/tradovate`, `/api/tradovate/[...path]`,
 *  `/api/tradovate-live` — is the same door reopened. */
function retiredRoutes(paths: readonly string[]): string[] {
  return paths.filter((p) => p.toLowerCase().startsWith(RETIRED_ROUTE));
}

// ── B. Alpaca hosts ──────────────────────────────────────────────────────────
/** Written out literally, NOT derived from ALPACA_PAPER_BASE: deriving it would
 *  let a flip of that constant to the live host allow-list itself. */
const ALPACA_PAPER_HOST = "paper-api.alpaca.markets";
/** Market data only; neither host accepts an order. */
const ALPACA_DATA_HOSTS = ["data.alpaca.markets", "stream.data.alpaca.markets"];
const ALPACA_ALLOWED = new Set([ALPACA_PAPER_HOST, ...ALPACA_DATA_HOSTS]);
/** Greedy on the left so `"https://" + "api" + ".alpaca.markets"` yields
 *  `.alpaca.markets` — not allowed — rather than slipping past. */
const ALPACA_HOST = /[a-z0-9.-]*alpaca\.markets/gi;

function alpacaHostsIn(text: string): string[] {
  return [...text.matchAll(ALPACA_HOST)].map((m) => m[0].toLowerCase());
}

// ── C. Webull place path ─────────────────────────────────────────────────────
const SUBMIT = /\bsubmitWebullOrderOnce\b/g;
const SUBMIT_OWNER = "lib/broker/adapters/webullOrders.ts";
const SUBMIT_DECLARATION = /export async function submitWebullOrderOnce\(/;
/**
 * 2026-10-01 — THE ONE DOOR. The Founder instructed live execution be built
 * ("I should be able to trade my TSLA options on Webull … from the WM Pro OS").
 * The law narrows rather than ends: exactly ONE route may reach the place path
 * and open the gate, and only behind executionAuthority with the human's
 * explicit, per-request live approval. A second caller is still a second door.
 */
const THE_ONE_DOOR = "app/api/broker/webull/order-submit/route.ts";

// ── D. liveOrdersEnabled ─────────────────────────────────────────────────────
/**
 * A write of the flag to anything other than the literal `false`:
 *   `liveOrdersEnabled: x`, `liveOrdersEnabled = x` (not `==`), and the
 *   shorthand `{ liveOrdersEnabled }`. The type field `liveOrdersEnabled:
 *   boolean` (optionally `?:`) and reads like `config.liveOrdersEnabled` pass.
 * Deliberately wider than "set true": `liveOrdersEnabled: env.X === "1"` is a
 * way to set it true, and so is `!0`. A destructuring read `{ liveOrdersEnabled }`
 * also trips the shorthand rule; none exists, and erring toward red is the
 * right side for a gate on the live place path.
 *
 * The whitespace sits INSIDE the lookahead on purpose: `\s*(?!false)` lets the
 * engine give back a space and see " false", which is not "false", and fire.
 */
const LIVE_FLAG_WRITE =
  /\bliveOrdersEnabled['"`]?\s*\]?\s*\??\s*(?::|=(?!=))(?!\s*(?:false|boolean)\s*(?:[,;})\]]|$))/m;
const LIVE_FLAG_SHORTHAND = /[{,]\s*liveOrdersEnabled\s*[,}]/;
/** The key handed over as a string argument: `Reflect.set(cfg, "liveOrdersEnabled", …)`,
 *  `Object.defineProperty(cfg, "liveOrdersEnabled", …)`. */
const LIVE_FLAG_BY_NAME = /['"`]liveOrdersEnabled['"`]\s*,/;

function setsLiveFlag(text: string): boolean {
  return LIVE_FLAG_WRITE.test(text) || LIVE_FLAG_SHORTHAND.test(text) || LIVE_FLAG_BY_NAME.test(text);
}

// ── E. Webull place/cancel endpoints ─────────────────────────────────────────
const ORDER_ENDPOINT = /\bORDER_(?:PLACE|CANCEL)\b|\/trading\/orders\/(?:place|cancel)\b/g;
const CONTRACT_OWNER = "lib/marketData/webullSdkContract.ts";
/** Where each mention is allowed, and how many: the contract declares both keys
 *  and both paths once; the order module reads ORDER_PLACE once (the place
 *  path) and, since 2026-10-01, ORDER_CANCEL once (cancelWebullOrder — exit
 *  easier than entry). No other file names either endpoint. */
const ORDER_ENDPOINT_ALLOWED: Readonly<Record<string, readonly string[]>> = {
  [CONTRACT_OWNER]: ["/trading/orders/cancel", "/trading/orders/place", "ORDER_CANCEL", "ORDER_PLACE"],
  [SUBMIT_OWNER]: ["ORDER_CANCEL", "ORDER_PLACE"],
};

function orderEndpointMentions(text: string): string[] {
  return [...text.matchAll(ORDER_ENDPOINT)].map((m) => m[0]).sort();
}

describe("the scan sees the code it polices", () => {
  it("found the server tree, not air", () => {
    // Measured 2026-09-26: 869 sources, 654 server, 66 under src/app/api.
    expect(SOURCES.length).toBeGreaterThan(500);
    expect(SERVER.length).toBeGreaterThan(400);
    expect(API.length).toBeGreaterThan(40);
    expect(API.map((f) => f.file)).toContain("app/api/alpaca-trading/route.ts");
  });

  it("sees a real URL through the comment stripper: the paper base is found where it lives", () => {
    const safety = SERVER.find((f) => f.file === "lib/alpacaSafety.ts");
    expect(safety, "lib/alpacaSafety.ts was not scanned").toBeDefined();
    expect(alpacaHostsIn(safety!.text)).toContain(ALPACA_PAPER_HOST);
    expect(ALPACA_PAPER_BASE).toBe(`https://${ALPACA_PAPER_HOST}`);
  });

  it("sees the Webull place/cancel contract where it lives", () => {
    const contract = SOURCES.find((f) => f.file === CONTRACT_OWNER);
    expect(contract, `${CONTRACT_OWNER} was not scanned`).toBeDefined();
    expect(orderEndpointMentions(contract!.text)).toEqual(ORDER_ENDPOINT_ALLOWED[CONTRACT_OWNER]);
  });

  it("sees the Webull place path and its gate read", () => {
    const owner = SOURCES.find((f) => f.file === SUBMIT_OWNER);
    expect(owner, `${SUBMIT_OWNER} was not scanned`).toBeDefined();
    expect(owner!.text).toMatch(SUBMIT_DECLARATION);
    expect(owner!.text).toMatch(/if \(!config\.liveOrdersEnabled\) \{/);
  });
});

describe("each detector bites (positive controls on specimens)", () => {
  it("A: a live, assembled or other Tradovate host is caught; demo passes; any retired-prefix route is caught", () => {
    expect(nonDemoTradovateHostsIn('const u = "https://live.tradovateapi.com/v1/order/placeorder";')).toEqual(["live.tradovateapi.com"]);
    expect(nonDemoTradovateHostsIn('const u = "https://" + "live" + ".tradovateapi.com";')).toEqual([".tradovateapi.com"]);
    expect(nonDemoTradovateHostsIn('const u = `https://${env}.tradovateapi.com`;')).toEqual([".tradovateapi.com"]);
    expect(nonDemoTradovateHostsIn('new WebSocket("wss://md.tradovateapi.com/v1/websocket")')).toEqual(["md.tradovateapi.com"]);
    expect(nonDemoTradovateHostsIn('const u = "https://demo.tradovateapi.com/v1";')).toEqual([]);
    expect(retiredRoutes(["/api/tradovate", "/api/tradovate/[...path]", "/api/tradovate-live", "/api/alpaca-trading"])).toEqual([
      "/api/tradovate",
      "/api/tradovate/[...path]",
      "/api/tradovate-live",
    ]);
  });

  it("B: a live or assembled Alpaca trading host is caught; paper and data pass", () => {
    const bad = (s: string) => alpacaHostsIn(s).filter((h) => !ALPACA_ALLOWED.has(h));
    expect(bad('fetch("https://api.alpaca.markets/v2/orders")')).toEqual(["api.alpaca.markets"]);
    expect(bad('fetch("https://broker-api.alpaca.markets/v1")')).toEqual(["broker-api.alpaca.markets"]);
    expect(bad('const b = "https://" + "api" + ".alpaca.markets";')).toEqual([".alpaca.markets"]);
    expect(bad('const b = `https://${env}api.alpaca.markets`;')).toEqual(["api.alpaca.markets"]);
    expect(bad('fetch("https://paper-api.alpaca.markets/v2/orders")')).toEqual([]);
    expect(bad('fetch("https://data.alpaca.markets/v2/stocks")')).toEqual([]);
    expect(bad('new WebSocket("wss://stream.data.alpaca.markets/v2/iex")')).toEqual([]);
  });

  it("C: an import-and-call of the place path is caught", () => {
    const text = 'import { submitWebullOrderOnce } from "@/lib/broker/adapters/webullOrders";\nawait submitWebullOrderOnce(fetch, cfg, ledger, intent);';
    expect([...text.matchAll(SUBMIT)]).toHaveLength(2);
  });

  it("D: every way of opening the flag is caught; false, the type, and reads pass", () => {
    for (const s of [
      "const cfg = { ...base, liveOrdersEnabled: true };",
      "cfg.liveOrdersEnabled = true;",
      'const cfg = { liveOrdersEnabled: process.env.WEBULL_LIVE === "1" };',
      "const cfg = { liveOrdersEnabled: !0 };",
      "const cfg = { appKey, liveOrdersEnabled };",
      'const cfg = { "liveOrdersEnabled": true };',
      "const cfg = { 'liveOrdersEnabled': x };",
      'cfg["liveOrdersEnabled"] = true;',
      "cfg[`liveOrdersEnabled`] = 1;",
      "const cfg = { liveOrdersEnabled: false || process.env.LIVE };",
      "cfg.liveOrdersEnabled = false ? 0 : 1;",
      'Reflect.set(cfg, "liveOrdersEnabled", true);',
      'Object.defineProperty(cfg, "liveOrdersEnabled", { value: true });',
    ]) expect(setsLiveFlag(s), s).toBe(true);
    for (const s of [
      "const cfg = { ...base, liveOrdersEnabled: false };",
      "cfg.liveOrdersEnabled   =   false;",
      "config: WebullOrderConfig & { readonly liveOrdersEnabled: boolean },",
      "readonly liveOrdersEnabled?: boolean;",
      "if (!config.liveOrdersEnabled) {",
      "if (config.liveOrdersEnabled === false) {",
      'const cfg = { "liveOrdersEnabled": false };',
      'cfg["liveOrdersEnabled"] = false;',
      "cfg.liveOrdersEnabled = false\nnext()",
      'if (cfg["liveOrdersEnabled"]) {',
    ]) expect(setsLiveFlag(s), s).toBe(false);
  });

  it("E: a place or cancel endpoint named by key, bracket or path is caught", () => {
    expect(orderEndpointMentions("await signedCall(f, c, WEBULL_SDK_CONTRACT.ORDER_PLACE, body);")).toEqual(["ORDER_PLACE"]);
    expect(orderEndpointMentions('const e = WEBULL_SDK_CONTRACT["ORDER_CANCEL"];')).toEqual(["ORDER_CANCEL"]);
    expect(orderEndpointMentions('fetch(base + "/trading/orders/place", init)')).toEqual(["/trading/orders/place"]);
    expect(orderEndpointMentions('fetch(`${base}/trading/orders/cancel`, init)')).toEqual(["/trading/orders/cancel"]);
    expect(orderEndpointMentions('fetch(base + "/trading/orders/preview")')).toEqual([]);
    expect(orderEndpointMentions("WEBULL_SDK_CONTRACT.ORDER_PREVIEW; ORDER_DETAIL; ORDER_OPEN_LIST")).toEqual([]);
  });
});

describe("live execution stays closed", () => {
  it("A: no server file names a non-demo Tradovate host, and nothing under /api/tradovate returns", () => {
    const hits = SERVER.flatMap((f) => nonDemoTradovateHostsIn(f.text).map((h) => `${f.file}: ${h}`));
    expect(hits, "a non-demo Tradovate host is in server code — that is live execution with no authority").toEqual([]);
    expect(retiredRoutes(apiRoutePaths()), "/api/tradovate was retired on 2026-09-26 (§75) and must not return").toEqual([]);
  });

  it("B: every Alpaca host in server code is the paper trading host or a market-data host", () => {
    const hits = SERVER.flatMap((f) =>
      alpacaHostsIn(f.text).filter((h) => !ALPACA_ALLOWED.has(h)).map((h) => `${f.file}: ${h}`),
    );
    expect(hits, "a non-paper Alpaca trading base is in server code — live brokerage is fail-closed").toEqual([]);
  });

  it("C: submitWebullOrderOnce has exactly ONE non-test caller — the order-submit route — behind the human's live approval", () => {
    const refs = SOURCES.flatMap((f) => [...f.text.matchAll(SUBMIT)].map(() => f.file)).sort();
    // Its own declaration, plus the one door's import and call. Any other
    // mention is a second caller, an alias or a re-export.
    expect(refs, "submitWebullOrderOnce gained a reference outside the one door").toEqual([THE_ONE_DOOR, THE_ONE_DOOR, SUBMIT_OWNER].sort());
    const door = SOURCES.find((f) => f.file === THE_ONE_DOOR)!.text;
    expect(door).toMatch(/const owner = webullOwnerGate\(auth\.user\.sub, process\.env\);/);
    expect(door).toMatch(/humanApproval: input\.confirmLive === true \? \{ approved: true, approvedBy: auth\.user\.sub \} : null/);
    expect(door).toMatch(/if \(!authority\.authorized\) return/);
    expect(door).toMatch(/durableWebullOrderLedger\(env\)/);
  });

  it("D: liveOrdersEnabled is opened in ONE place — the one door — and only after the authority check", () => {
    const hits = SOURCES.filter((f) => setsLiveFlag(f.text)).map((f) => f.file);
    expect(hits, "liveOrdersEnabled is opened outside the one door").toEqual([THE_ONE_DOOR]);
    const door = SOURCES.find((f) => f.file === THE_ONE_DOOR)!.text;
    const authorityAt = door.indexOf("if (!authority.authorized) return");
    const previewAt = door.indexOf("await previewWebullOrder(");
    const openAt = door.search(LIVE_FLAG_WRITE);
    expect(authorityAt).toBeGreaterThan(0);
    expect(previewAt).toBeGreaterThan(authorityAt);
    expect(openAt, "the gate opens before the authority check or Webull's preview").toBeGreaterThan(previewAt);
  });

  it("E: the Webull place and cancel endpoints are named only by their contract and the one place path", () => {
    const found: Record<string, string[]> = {};
    for (const f of SOURCES) {
      const m = orderEndpointMentions(f.text);
      if (m.length) found[f.file] = m;
    }
    expect(found, "a Webull place/cancel endpoint gained a new sender — the live order path has a second door").toEqual(ORDER_ENDPOINT_ALLOWED);
  });
});
