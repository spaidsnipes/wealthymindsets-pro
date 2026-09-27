/**
 * THE S&P BOARD'S UNIVERSE — one list for every surface that scans it: the
 * Scanner Deck's Opportunity Map and the chart room's Heat · Discovery lens
 * (F14). Moved out of the map page (Garden 16 §29) so two surfaces cannot
 * scan two different universes under one name.
 */

export interface Stock {
  sym:   string;
  name:  string;
  mcap:  number; // billions — determines tile size
}

export interface Industry {
  name:    string;
  stocks:  Stock[];
}

export interface Sector {
  label:      string;
  industries: Industry[];
  weight:     number; // % of total map area
}

export const SECTORS: Sector[] = [
  {
    label: "TECHNOLOGY", weight: 29,
    industries: [
      { name: "SOFTWARE - INFRASTRUCTURE", stocks: [
        { sym:"MSFT",  name:"Microsoft",      mcap:2950 },
        { sym:"ORCL",  name:"Oracle",         mcap:380 },
        { sym:"SNOW",  name:"Snowflake",      mcap:55 },
        { sym:"MDB",   name:"MongoDB",        mcap:22 },
      ]},
      { name: "SEMICONDUCTORS", stocks: [
        { sym:"NVDA",  name:"NVIDIA",         mcap:3100 },
        { sym:"AVGO",  name:"Broadcom",       mcap:860 },
        { sym:"AMD",   name:"AMD",            mcap:240 },
        { sym:"INTC",  name:"Intel",          mcap:95  },
        { sym:"QCOM",  name:"Qualcomm",       mcap:175 },
        { sym:"TXN",   name:"Texas Instr.",   mcap:165 },
        { sym:"AMAT",  name:"Applied Mat.",   mcap:145 },
        { sym:"LRCX",  name:"Lam Research",  mcap:90  },
      ]},
      { name: "SOFTWARE - APPLICATION", stocks: [
        { sym:"CRM",   name:"Salesforce",     mcap:280 },
        { sym:"ADBE",  name:"Adobe",          mcap:210 },
        { sym:"NOW",   name:"ServiceNow",     mcap:195 },
        { sym:"INTU",  name:"Intuit",         mcap:175 },
        { sym:"TEAM",  name:"Atlassian",      mcap:48 },
        { sym:"WDAY",  name:"Workday",        mcap:62 },
        { sym:"DDOG",  name:"Datadog",        mcap:38 },
      ]},
      { name: "INTERNET CONTENT & INFO", stocks: [
        { sym:"GOOG",  name:"Alphabet",       mcap:2100 },
        { sym:"META",  name:"Meta",           mcap:1400 },
      ]},
      { name: "CONSUMER ELECTRONICS", stocks: [
        { sym:"AAPL",  name:"Apple",          mcap:3000 },
      ]},
    ],
  },
  {
    label: "COMMUNICATION SERVICES", weight: 8.5,
    industries: [
      { name: "INTERNET CONTENT", stocks: [
        { sym:"NFLX",  name:"Netflix",        mcap:295 },
        { sym:"SNAP",  name:"Snap",           mcap:18  },
        { sym:"PINS",  name:"Pinterest",      mcap:19  },
      ]},
      { name: "TELECOM SERVICES", stocks: [
        { sym:"T",     name:"AT&T",           mcap:175  },
        { sym:"VZ",    name:"Verizon",        mcap:165  },
        { sym:"TMUS",  name:"T-Mobile",       mcap:210 },
        { sym:"CMCSA", name:"Comcast",        mcap:145  },
        { sym:"CHTR",  name:"Charter",        mcap:52 },
      ]},
    ],
  },
  {
    label: "CONSUMER CYCLICAL", weight: 10.8,
    industries: [
      { name: "INTERNET RETAIL", stocks: [
        { sym:"AMZN",  name:"Amazon",         mcap:2000 },
        { sym:"BKNG",  name:"Booking",        mcap:145},
        { sym:"EBAY",  name:"eBay",           mcap:28  },
      ]},
      { name: "AUTO MANUFACTURERS", stocks: [
        { sym:"TSLA",  name:"Tesla",          mcap:650 },
        { sym:"GM",    name:"General Motors", mcap:55  },
        { sym:"F",     name:"Ford",           mcap:45  },
        { sym:"RIVN",  name:"Rivian",         mcap:12  },
      ]},
      { name: "HOME IMPROVEMENT", stocks: [
        { sym:"HD",    name:"Home Depot",     mcap:330 },
        { sym:"LOW",   name:"Lowe's",         mcap:140 },
      ]},
      { name: "RESTAURANTS", stocks: [
        { sym:"MCD",   name:"McDonald's",     mcap:205 },
        { sym:"SBUX",  name:"Starbucks",      mcap:100  },
        { sym:"CMG",   name:"Chipotle",       mcap:82  },
      ]},
    ],
  },
  {
    label: "CONSUMER DEFENSIVE", weight: 6.2,
    industries: [
      { name: "DISCOUNT STORES", stocks: [
        { sym:"WMT",   name:"Walmart",        mcap:645  },
        { sym:"COST",  name:"Costco",         mcap:355 },
        { sym:"TGT",   name:"Target",         mcap:65 },
      ]},
      { name: "BEVERAGES - NON-ALC", stocks: [
        { sym:"KO",    name:"Coca-Cola",      mcap:265  },
        { sym:"PEP",   name:"PepsiCo",        mcap:215 },
        { sym:"KDP",   name:"Keurig Dr Pep.", mcap:48  },
      ]},
      { name: "PACKAGED FOODS", stocks: [
        { sym:"GIS",   name:"General Mills",  mcap:38  },
        { sym:"CPB",   name:"Campbell Soup",  mcap:12  },
      ]},
    ],
  },
  {
    label: "FINANCIALS", weight: 12.8,
    industries: [
      { name: "CREDIT SERVICES", stocks: [
        { sym:"V",     name:"Visa",           mcap:540 },
        { sym:"MA",    name:"Mastercard",     mcap:450 },
        { sym:"AXP",   name:"Amex",           mcap:195 },
        { sym:"PYPL",  name:"PayPal",         mcap:68  },
      ]},
      { name: "BANKS - DIVERSIFIED", stocks: [
        { sym:"JPM",   name:"JPMorgan",       mcap:595 },
        { sym:"BAC",   name:"Bank of America",mcap:310  },
        { sym:"WFC",   name:"Wells Fargo",    mcap:215  },
        { sym:"C",     name:"Citigroup",      mcap:118  },
        { sym:"GS",    name:"Goldman Sachs",  mcap:155 },
      ]},
      { name: "CAPITAL MARKETS", stocks: [
        { sym:"BRK-B", name:"Berkshire",      mcap:950 },
        { sym:"SCHW",  name:"Schwab",         mcap:130  },
        { sym:"MS",    name:"Morgan Stanley", mcap:155 },
        { sym:"BLK",   name:"BlackRock",      mcap:115 },
      ]},
    ],
  },
  {
    label: "HEALTHCARE", weight: 12.5,
    industries: [
      { name: "DRUG MANUFACTURERS - GENERAL", stocks: [
        { sym:"LLY",   name:"Eli Lilly",      mcap:755 },
        { sym:"JNJ",   name:"J&J",            mcap:380 },
        { sym:"ABBV",  name:"AbbVie",         mcap:315 },
        { sym:"MRK",   name:"Merck",          mcap:255 },
        { sym:"PFE",   name:"Pfizer",         mcap:148  },
        { sym:"BMY",   name:"Bristol-Myers",  mcap:118  },
        { sym:"AZN",   name:"AstraZeneca",    mcap:245  },
      ]},
      { name: "HEALTHCARE PLANS", stocks: [
        { sym:"UNH",   name:"UnitedHealth",   mcap:455 },
        { sym:"CVS",   name:"CVS Health",     mcap:68  },
        { sym:"CI",    name:"Cigna",          mcap:82 },
        { sym:"HUM",   name:"Humana",         mcap:38 },
      ]},
      { name: "BIOTECHNOLOGY", stocks: [
        { sym:"AMGN",  name:"Amgen",          mcap:155 },
        { sym:"GILD",  name:"Gilead",         mcap:112  },
        { sym:"REGN",  name:"Regeneron",      mcap:95 },
        { sym:"BIIB",  name:"Biogen",         mcap:28 },
      ]},
    ],
  },
  {
    label: "INDUSTRIALS", weight: 8.5,
    industries: [
      { name: "AEROSPACE & DEFENSE", stocks: [
        { sym:"RTX",   name:"RTX Corp",       mcap:145 },
        { sym:"LMT",   name:"Lockheed",       mcap:118 },
        { sym:"BA",    name:"Boeing",         mcap:95 },
        { sym:"NOC",   name:"Northrop",       mcap:72 },
        { sym:"GD",    name:"General Dyn.",   mcap:78 },
      ]},
      { name: "SPECIALTY INDUSTRIAL", stocks: [
        { sym:"HON",   name:"Honeywell",      mcap:130 },
        { sym:"MMM",   name:"3M",             mcap:68 },
        { sym:"EMR",   name:"Emerson",        mcap:55  },
        { sym:"ITW",   name:"Ill. Tool",      mcap:68 },
      ]},
      { name: "STAFFING & EMPLOYMENT", stocks: [
        { sym:"ADP",   name:"ADP",            mcap:102 },
        { sym:"PAYX",  name:"Paychex",        mcap:48 },
      ]},
    ],
  },
  {
    label: "ENERGY", weight: 3.8,
    industries: [
      { name: "OIL & GAS INTEGRATED", stocks: [
        { sym:"XOM",   name:"ExxonMobil",     mcap:465 },
        { sym:"CVX",   name:"Chevron",        mcap:272 },
        { sym:"COP",   name:"ConocoPhillips", mcap:128 },
        { sym:"EOG",   name:"EOG Resources",  mcap:65 },
        { sym:"OXY",   name:"Occidental",     mcap:42  },
      ]},
    ],
  },
  {
    label: "REAL ESTATE", weight: 2.4,
    industries: [
      { name: "REIT - SPECIALTY", stocks: [
        { sym:"AMT",   name:"American Tower", mcap:88 },
        { sym:"EQIX",  name:"Equinix",        mcap:72 },
        { sym:"PLD",   name:"Prologis",       mcap:92 },
      ]},
      { name: "REIT - RESIDENTIAL", stocks: [
        { sym:"EQR",   name:"Equity Resi.",   mcap:28  },
        { sym:"AVB",   name:"AvalonBay",      mcap:30 },
      ]},
    ],
  },
  {
    label: "UTILITIES", weight: 2.3,
    industries: [
      { name: "UTILITIES - REGULATED ELECTRIC", stocks: [
        { sym:"NEE",   name:"NextEra Energy", mcap:145  },
        { sym:"SO",    name:"Southern Co.",   mcap:82  },
        { sym:"DUK",   name:"Duke Energy",    mcap:78 },
        { sym:"SRE",   name:"Sempra",         mcap:48  },
      ]},
    ],
  },
  {
    label: "BASIC MATERIALS", weight: 2.2,
    industries: [
      { name: "SPECIALTY CHEMICALS", stocks: [
        { sym:"LIN",   name:"Linde",          mcap:198 },
        { sym:"APD",   name:"Air Products",   mcap:52 },
        { sym:"SHW",   name:"Sherwin-Will.",  mcap:82 },
        { sym:"ECL",   name:"Ecolab",         mcap:62 },
      ]},
    ],
  },
];

/** Every stock on the board, once, in board order. */
export const BOARD_STOCK_SYMBOLS: readonly string[] = (() => {
  const syms: string[] = [];
  SECTORS.forEach(s => s.industries.forEach(ind => ind.stocks.forEach(st => { if (!syms.includes(st.sym)) syms.push(st.sym); })));
  return syms;
})();
