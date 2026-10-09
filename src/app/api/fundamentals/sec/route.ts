import { publicProxyLimit } from "@/lib/publicProxyLimit";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import {
  cikPad, latestShares, pickConcept, SEC_DIVIDEND_CONCEPT, SEC_EPS_CONCEPT, SEC_FLOW_CONCEPTS, SEC_USER_AGENT,
  secDividends, secQuarters, type SecFactRow,
} from "@/lib/fundamentals/secEdgar";

export const dynamic = "force-dynamic";

/**
 * /api/fundamentals/sec?symbol=TSLA — company fundamentals from SEC EDGAR.
 *
 * Free and keyless: the company's own 10-Q / 10-K figures, its filing profile,
 * cover-page shares outstanding, dividends declared and recent filings. The
 * whole answer is kept 12 h in KV (filings change a few times a year); the
 * ticker → CIK lookup 30 days. A symbol the SEC does not list (a coin, a
 * future, a foreign-only listing) answers NOT_LISTED — never a guess.
 */
const SEC = "https://data.sec.gov";
const HEADERS = { "User-Agent": SEC_USER_AGENT, Accept: "application/json" };
const MEM = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 12 * 3600_000;

let lastStatus: string | null = null;
async function getJson(url: string): Promise<unknown | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8_000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctl.signal, redirect: "manual" });
    if (!res.ok) { lastStatus = `HTTP ${res.status}`; return null; }
    return await res.json();
  } catch (e) { lastStatus = e instanceof Error ? e.name : "fetch failed"; return null; } finally { clearTimeout(t); }
}

type Concept = { units?: Record<string, SecFactRow[]> };
const rowsOf = (c: unknown): SecFactRow[] | null => {
  const u = (c as Concept | null)?.units;
  return u ? Object.values(u)[0] ?? null : null;
};

export async function GET(request: Request): Promise<Response> {
  // Garden-house pass 2026-10-04 (BROKEN_LOCK): this route was public and
  // spent the operator's provider quota for anyone on the internet.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // API audit P2-9 (2026-10-09): a per-member ceiling before the operator's provider key is spent.
  { const limited = await publicProxyLimit(request, "data"); if (limited) return limited; }
  const symbol = (new URL(request.url).searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) return NextResponse.json({ state: "INVALID_SYMBOL" }, { status: 400 });

  const mem = MEM.get(symbol);
  if (mem && Date.now() - mem.at < TTL_MS) return NextResponse.json(mem.body);
  const kv = orderDecisionKv(await webullWorkerEnv());
  const key = `sec:v1:${symbol}`;
  try { const hit = kv ? await kv.get(key) : null; if (hit) { const body = JSON.parse(hit); MEM.set(symbol, { at: Date.now(), body }); return NextResponse.json(body); } } catch { /* read through */ }

  // Ticker → CIK (SEC lists class shares with a dash: BRK.B → BRK-B).
  const secTicker = symbol.replace(".", "-");
  let cik: string | null = null;
  try { cik = kv ? await kv.get(`sec:cik:${secTicker}`) : null; } catch { cik = null; }
  if (!cik) {
    const map = await getJson("https://www.sec.gov/files/company_tickers.json") as Record<string, { cik_str: number; ticker: string }> | null;
    if (!map) return NextResponse.json({ state: "SEC_UNAVAILABLE", source: "SEC EDGAR", upstream: lastStatus }, { status: 502 });
    const hit = Object.values(map).find(v => v.ticker === secTicker);
    if (!hit) return NextResponse.json({ state: "NOT_LISTED", symbol, source: "SEC EDGAR" });
    cik = cikPad(hit.cik_str);
    if (kv) await kv.put(`sec:cik:${secTicker}`, cik, { expirationTtl: 30 * 86400 }).catch(() => {});
  }

  const concept = (taxonomy: string, name: string) => getJson(`${SEC}/api/xbrl/companyconcept/CIK${cik}/${taxonomy}/${name}.json`).then(rowsOf);
  const sub = await getJson(`${SEC}/submissions/CIK${cik}.json`) as Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  // SEC asks for no more than 10 requests a second: two small waves.
  const revenueNames = SEC_FLOW_CONCEPTS.revenue;
  const wave1 = await Promise.all([...revenueNames.map(n => concept("us-gaap", n)), concept("us-gaap", "GrossProfit")]);
  const wave2 = await Promise.all([
    concept("us-gaap", "OperatingIncomeLoss"), concept("us-gaap", "NetIncomeLoss"), concept("us-gaap", SEC_EPS_CONCEPT),
    concept("us-gaap", SEC_DIVIDEND_CONCEPT), concept("dei", "EntityCommonStockSharesOutstanding"),
  ]);
  const revenue = pickConcept(Object.fromEntries(revenueNames.map((n, i) => [n, wave1[i]])));
  const [opInc, netInc, eps, div, shares] = wave2;

  const recent = sub?.filings?.recent;
  const filings: { form: string; filed: string; url: string }[] = [];
  if (recent?.form) {
    for (let i = 0; i < recent.form.length && filings.length < 10; i++) {
      const form = String(recent.form[i]);
      if (!/^(10-K|10-Q|8-K|DEF 14A|S-1|20-F|6-K)$/.test(form)) continue;
      const acc = String(recent.accessionNumber[i]);
      filings.push({ form, filed: String(recent.filingDate[i]), url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc.replace(/-/g, "")}/${recent.primaryDocument[i]}` });
    }
  }
  const addr = sub?.addresses?.business;
  const body = {
    state: "OK",
    source: "SEC EDGAR",
    symbol,
    cik,
    profile: sub ? {
      name: sub.name ?? null,
      industry: sub.sicDescription ?? null,
      sic: sub.sic ?? null,
      exchanges: Array.isArray(sub.exchanges) ? sub.exchanges : [],
      fiscalYearEnd: sub.fiscalYearEnd ?? null,
      stateOfIncorporation: sub.stateOfIncorporation ?? null,
      filerCategory: sub.category ?? null,
      headquarters: addr ? [addr.city, addr.stateOrCountryDescription].filter(Boolean).join(", ") : null,
      website: sub.website || null,
    } : null,
    shares: latestShares(shares ?? []),
    quarters: secQuarters({ revenue, grossProfit: wave1[revenueNames.length] ?? [], operatingIncome: opInc ?? [], netIncome: netInc ?? [], epsDiluted: eps ?? [] }),
    dividends: secDividends(div ?? []),
    filings,
    readAt: new Date().toISOString(),
  };
  MEM.set(symbol, { at: Date.now(), body });
  if (kv) await kv.put(key, JSON.stringify(body), { expirationTtl: 12 * 3600 }).catch(() => {});
  return NextResponse.json(body);
}
