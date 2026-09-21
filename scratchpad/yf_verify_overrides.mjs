const H = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", Accept: "application/json" };
const OV = {
  ACT: "ACT33566-USD", ALT: "ALT29073-USD", APT: "APT21794-USD",
  MELANIA: "MELANIA35347-USD", MEME: "MEME28301-USD", PEPE: "PEPE25359-USD",
  STRK: "STRK22691-USD", SUI: "SUI20947-USD", TON: "TON11419-USD",
  TRUMP: "TRUMP35336-USD", UNI: "UNI7083-USD",
};
for (const [base, yf] of Object.entries(OV)) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yf}?interval=1d&range=5d`, { headers: H });
  const j = await r.json();
  const m = j?.chart?.result?.[0]?.meta;
  console.log(`${base.padEnd(9)} ${yf.padEnd(17)} HTTP=${r.status}  px=${String(m?.regularMarketPrice).padEnd(14)} longName="${m?.longName}"`);
  await new Promise((r) => setTimeout(r, 150));
}
