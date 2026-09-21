const H = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", Accept: "application/json" };
const WANT = [
  ["ACT","Act I: The AI Prophecy"],
  ["APT","Aptos"],
  ["MELANIA","MELANIA meme"],
  ["MEME","Memecoin"],
  ["PEPE","Pepe Coin"],
  ["STRK","Starknet"],
  ["SUI","Sui"],
  ["TON","Toncoin"],
  ["TRUMP","OFFICIAL TRUMP"],
  ["UNI","Uniswap"],
  ["ALT","AltLayer"],
];
for (const [base, want] of WANT) {
  const u = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(want)}&quotesCount=12&newsCount=0`;
  try {
    const r = await fetch(u, { headers: H });
    const j = await r.json();
    const q = (j.quotes ?? []).filter((x) => x.quoteType === "CRYPTOCURRENCY");
    console.log(`\n${base}  (picker: "${want}")`);
    if (!q.length) { console.log("   no CRYPTOCURRENCY results"); }
    for (const x of q.slice(0, 6)) console.log(`   ${String(x.symbol).padEnd(16)} ${x.longname ?? x.shortname}`);
  } catch (e) { console.log(base, "ERR", String(e)); }
  await new Promise((r) => setTimeout(r, 200));
}
