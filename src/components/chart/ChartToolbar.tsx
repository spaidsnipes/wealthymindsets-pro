"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, ChevronDown,
  LayoutGrid, Clock, DollarSign, BarChart2, Plug2,
  X, ChevronRight, Star, Check, Bell, Settings,
  Play, GitMerge, HelpCircle,
} from "lucide-react";
import { WMSmartMoneyIcon } from "@/components/ui/WMLogo";
import { clsx } from "clsx";
import { type ChartLayout } from "./ChartLayoutManager";
import { isConfigurable } from "./indicatorConfig";
import { getIndicatorInfo } from "./indicatorDescriptions";

/* ══════════════════════════════════════════════════════════════
   SYMBOL CATALOGUE  (100+ symbols across 5 categories)
══════════════════════════════════════════════════════════════ */
type SymbolEntry = { sym: string; name: string; cat: string };

const ALL_SYMBOLS: SymbolEntry[] = [
  // ── Futures ──────────────────────────────────────────────
  { sym:"NQ1!",    name:"Nasdaq-100 Futures",       cat:"Futures" },
  { sym:"ES1!",    name:"S&P 500 Futures",          cat:"Futures" },
  { sym:"RTY1!",   name:"Russell 2000 Futures",     cat:"Futures" },
  { sym:"YM1!",    name:"Dow Jones Futures",        cat:"Futures" },
  { sym:"GC1!",    name:"Gold Futures",             cat:"Futures" },
  { sym:"SI1!",    name:"Silver Futures",           cat:"Futures" },
  { sym:"CL1!",    name:"Crude Oil Futures",        cat:"Futures" },
  { sym:"NG1!",    name:"Natural Gas Futures",      cat:"Futures" },
  { sym:"ZB1!",    name:"30-Year Bond Futures",     cat:"Futures" },
  { sym:"ZN1!",    name:"10-Year Note Futures",     cat:"Futures" },
  { sym:"ZF1!",    name:"5-Year Note Futures",      cat:"Futures" },
  { sym:"ZT1!",    name:"2-Year Note Futures",      cat:"Futures" },
  { sym:"HG1!",    name:"Copper Futures",           cat:"Futures" },
  { sym:"PL1!",    name:"Platinum Futures",         cat:"Futures" },
  { sym:"PA1!",    name:"Palladium Futures",        cat:"Futures" },
  { sym:"ZC1!",    name:"Corn Futures",             cat:"Futures" },
  { sym:"ZW1!",    name:"Wheat Futures",            cat:"Futures" },
  { sym:"ZS1!",    name:"Soybean Futures",          cat:"Futures" },
  { sym:"LE1!",    name:"Live Cattle Futures",      cat:"Futures" },
  { sym:"MNQ1!",   name:"Micro Nasdaq Futures",     cat:"Futures" },
  { sym:"MES1!",   name:"Micro S&P 500 Futures",   cat:"Futures" },
  { sym:"M2K1!",   name:"Micro Russell Futures",   cat:"Futures" },
  { sym:"MYM1!",   name:"Micro Dow Futures",        cat:"Futures" },
  { sym:"MGC1!",   name:"Micro Gold Futures",       cat:"Futures" },
  { sym:"MCL1!",   name:"Micro Crude Oil Futures",  cat:"Futures" },
  { sym:"VX1!",    name:"VIX Futures",              cat:"Futures" },
  { sym:"SR3M4",   name:"SOFR 3-Month Futures",    cat:"Futures" },
  // ── Mega-cap Stocks ──────────────────────────────────────
  { sym:"AAPL",    name:"Apple Inc",               cat:"Stocks" },
  { sym:"MSFT",    name:"Microsoft Corp",          cat:"Stocks" },
  { sym:"NVDA",    name:"NVIDIA Corp",             cat:"Stocks" },
  { sym:"AMZN",    name:"Amazon.com Inc",          cat:"Stocks" },
  { sym:"META",    name:"Meta Platforms Inc",      cat:"Stocks" },
  { sym:"GOOG",    name:"Alphabet Inc Class C",    cat:"Stocks" },
  { sym:"GOOGL",   name:"Alphabet Inc Class A",    cat:"Stocks" },
  { sym:"TSLA",    name:"Tesla Inc",               cat:"Stocks" },
  { sym:"AVGO",    name:"Broadcom Inc",            cat:"Stocks" },
  { sym:"AMD",     name:"Advanced Micro Devices",  cat:"Stocks" },
  { sym:"INTC",    name:"Intel Corp",              cat:"Stocks" },
  { sym:"CRM",     name:"Salesforce Inc",          cat:"Stocks" },
  { sym:"ORCL",    name:"Oracle Corp",             cat:"Stocks" },
  { sym:"NFLX",    name:"Netflix Inc",             cat:"Stocks" },
  { sym:"ADBE",    name:"Adobe Inc",               cat:"Stocks" },
  { sym:"QCOM",    name:"Qualcomm Inc",            cat:"Stocks" },
  { sym:"TXN",     name:"Texas Instruments",       cat:"Stocks" },
  { sym:"MU",      name:"Micron Technology",       cat:"Stocks" },
  { sym:"AMAT",    name:"Applied Materials",       cat:"Stocks" },
  { sym:"LRCX",    name:"Lam Research Corp",       cat:"Stocks" },
  { sym:"KLAC",    name:"KLA Corp",                cat:"Stocks" },
  { sym:"MRVL",    name:"Marvell Technology",      cat:"Stocks" },
  { sym:"ARM",     name:"Arm Holdings",            cat:"Stocks" },
  { sym:"SMCI",    name:"Super Micro Computer",    cat:"Stocks" },
  { sym:"PLTR",    name:"Palantir Technologies",   cat:"Stocks" },
  { sym:"JPM",     name:"JPMorgan Chase",          cat:"Stocks" },
  { sym:"GS",      name:"Goldman Sachs Group",     cat:"Stocks" },
  { sym:"MS",      name:"Morgan Stanley",          cat:"Stocks" },
  { sym:"BAC",     name:"Bank of America",         cat:"Stocks" },
  { sym:"WFC",     name:"Wells Fargo & Co",        cat:"Stocks" },
  { sym:"C",       name:"Citigroup Inc",           cat:"Stocks" },
  { sym:"BLK",     name:"BlackRock Inc",           cat:"Stocks" },
  { sym:"V",       name:"Visa Inc",                cat:"Stocks" },
  { sym:"MA",      name:"Mastercard Inc",          cat:"Stocks" },
  { sym:"AXP",     name:"American Express",        cat:"Stocks" },
  { sym:"UNH",     name:"UnitedHealth Group",      cat:"Stocks" },
  { sym:"LLY",     name:"Eli Lilly & Co",          cat:"Stocks" },
  { sym:"JNJ",     name:"Johnson & Johnson",       cat:"Stocks" },
  { sym:"ABBV",    name:"AbbVie Inc",              cat:"Stocks" },
  { sym:"MRK",     name:"Merck & Co",              cat:"Stocks" },
  { sym:"PFE",     name:"Pfizer Inc",              cat:"Stocks" },
  { sym:"TMO",     name:"Thermo Fisher Scientific",cat:"Stocks" },
  { sym:"ABT",     name:"Abbott Laboratories",     cat:"Stocks" },
  { sym:"DHR",     name:"Danaher Corp",            cat:"Stocks" },
  { sym:"XOM",     name:"ExxonMobil Corp",         cat:"Stocks" },
  { sym:"CVX",     name:"Chevron Corp",            cat:"Stocks" },
  { sym:"COP",     name:"ConocoPhillips",          cat:"Stocks" },
  { sym:"SLB",     name:"SLB (Schlumberger)",      cat:"Stocks" },
  { sym:"PG",      name:"Procter & Gamble",        cat:"Stocks" },
  { sym:"KO",      name:"Coca-Cola Co",            cat:"Stocks" },
  { sym:"PEP",     name:"PepsiCo Inc",             cat:"Stocks" },
  { sym:"WMT",     name:"Walmart Inc",             cat:"Stocks" },
  { sym:"COST",    name:"Costco Wholesale",        cat:"Stocks" },
  { sym:"HD",      name:"Home Depot Inc",          cat:"Stocks" },
  { sym:"TGT",     name:"Target Corp",             cat:"Stocks" },
  { sym:"AMGN",    name:"Amgen Inc",               cat:"Stocks" },
  { sym:"GILD",    name:"Gilead Sciences",         cat:"Stocks" },
  { sym:"ISRG",    name:"Intuitive Surgical",      cat:"Stocks" },
  { sym:"BA",      name:"Boeing Co",               cat:"Stocks" },
  { sym:"RTX",     name:"RTX Corp",                cat:"Stocks" },
  { sym:"LMT",     name:"Lockheed Martin",         cat:"Stocks" },
  { sym:"CAT",     name:"Caterpillar Inc",         cat:"Stocks" },
  { sym:"DE",      name:"Deere & Company",         cat:"Stocks" },
  { sym:"GE",      name:"GE Aerospace",            cat:"Stocks" },
  { sym:"MMM",     name:"3M Company",              cat:"Stocks" },
  { sym:"HON",     name:"Honeywell International", cat:"Stocks" },
  { sym:"UPS",     name:"United Parcel Service",   cat:"Stocks" },
  { sym:"FDX",     name:"FedEx Corp",              cat:"Stocks" },
  { sym:"COIN",    name:"Coinbase Global",         cat:"Stocks" },
  { sym:"HOOD",    name:"Robinhood Markets",       cat:"Stocks" },
  { sym:"MSTR",    name:"MicroStrategy Inc",       cat:"Stocks" },
  { sym:"MARA",    name:"MARA Holdings",           cat:"Stocks" },
  { sym:"RIOT",    name:"Riot Platforms",          cat:"Stocks" },
  { sym:"GME",     name:"GameStop Corp",           cat:"Stocks" },
  { sym:"AMC",     name:"AMC Entertainment",       cat:"Stocks" },
  { sym:"BBBY",    name:"Bed Bath & Beyond",       cat:"Stocks" },
  { sym:"SPY",     name:"SPDR S&P 500 ETF",        cat:"ETFs" },
  // ── ETFs ──────────────────────────────────────────────
  { sym:"QQQ",     name:"Invesco QQQ Trust",       cat:"ETFs" },
  { sym:"IWM",     name:"iShares Russell 2000",    cat:"ETFs" },
  { sym:"DIA",     name:"SPDR Dow Jones ETF",      cat:"ETFs" },
  { sym:"VTI",     name:"Vanguard Total Market",   cat:"ETFs" },
  { sym:"VOO",     name:"Vanguard S&P 500",        cat:"ETFs" },
  { sym:"GLD",     name:"SPDR Gold Shares",        cat:"ETFs" },
  { sym:"SLV",     name:"iShares Silver Trust",    cat:"ETFs" },
  { sym:"USO",     name:"US Oil Fund",             cat:"ETFs" },
  { sym:"TLT",     name:"iShares 20yr Bond",       cat:"ETFs" },
  { sym:"IEF",     name:"iShares 7-10yr Bond",     cat:"ETFs" },
  { sym:"HYG",     name:"iShares High Yield Bond", cat:"ETFs" },
  { sym:"LQD",     name:"iShares Corp Bond",       cat:"ETFs" },
  { sym:"XLK",     name:"Technology Select SPDR",  cat:"ETFs" },
  { sym:"XLF",     name:"Financial Select SPDR",   cat:"ETFs" },
  { sym:"XLE",     name:"Energy Select SPDR",      cat:"ETFs" },
  { sym:"XLV",     name:"Health Care Select SPDR", cat:"ETFs" },
  { sym:"XLI",     name:"Industrial Select SPDR",  cat:"ETFs" },
  { sym:"XLC",     name:"Comm Services SPDR",      cat:"ETFs" },
  { sym:"XLY",     name:"Consumer Disc SPDR",      cat:"ETFs" },
  { sym:"XLP",     name:"Consumer Stap SPDR",      cat:"ETFs" },
  { sym:"XLU",     name:"Utilities Select SPDR",   cat:"ETFs" },
  { sym:"XLRE",    name:"Real Estate SPDR",        cat:"ETFs" },
  { sym:"ARKK",    name:"ARK Innovation ETF",      cat:"ETFs" },
  { sym:"ARKG",    name:"ARK Genomic Revolution",  cat:"ETFs" },
  { sym:"SOXL",    name:"Direxion Semis Bull 3×",  cat:"ETFs" },
  { sym:"SOXS",    name:"Direxion Semis Bear 3×",  cat:"ETFs" },
  { sym:"TQQQ",    name:"ProShares UltraPro QQQ",  cat:"ETFs" },
  { sym:"SQQQ",    name:"ProShares UltraPro Short QQQ", cat:"ETFs" },
  { sym:"SPXL",    name:"Direxion S&P 500 Bull 3×",cat:"ETFs" },
  { sym:"SPXS",    name:"Direxion S&P 500 Bear 3×",cat:"ETFs" },
  { sym:"VIX",     name:"CBOE Volatility Index",   cat:"ETFs" },
  { sym:"UVXY",    name:"ProShares Ultra VIX",     cat:"ETFs" },
  { sym:"SVXY",    name:"ProShares Short VIX",     cat:"ETFs" },
  // ── Crypto ────────────────────────────────────────────
  { sym:"BTC",     name:"Bitcoin",                 cat:"Crypto" },
  { sym:"ETH",     name:"Ethereum",               cat:"Crypto" },
  { sym:"SOL",     name:"Solana",                 cat:"Crypto" },
  { sym:"BNB",     name:"BNB",                    cat:"Crypto" },
  { sym:"XRP",     name:"XRP",                    cat:"Crypto" },
  { sym:"DOGE",    name:"Dogecoin",               cat:"Crypto" },
  { sym:"ADA",     name:"Cardano",                cat:"Crypto" },
  { sym:"AVAX",    name:"Avalanche",              cat:"Crypto" },
  { sym:"LINK",    name:"Chainlink",              cat:"Crypto" },
  { sym:"DOT",     name:"Polkadot",               cat:"Crypto" },
  { sym:"MATIC",   name:"Polygon",                cat:"Crypto" },
  { sym:"LTC",     name:"Litecoin",               cat:"Crypto" },
  { sym:"ATOM",    name:"Cosmos",                 cat:"Crypto" },
  { sym:"UNI",     name:"Uniswap",                cat:"Crypto" },
  { sym:"AAVE",    name:"Aave",                   cat:"Crypto" },
  // ── Per-exchange BTC (labeled so you always know which exchange) ──
  { sym:"BTC.COINBASE",  name:"Bitcoin · Coinbase",   cat:"Crypto" },
  { sym:"BTC.KRAKEN",    name:"Bitcoin · Kraken",     cat:"Crypto" },
  { sym:"BTC.BITSTAMP",  name:"Bitcoin · Bitstamp",   cat:"Crypto" },
  { sym:"BTC.BINANCEUS", name:"Bitcoin · Binance.US", cat:"Crypto" },
  { sym:"BTC.GEMINI",    name:"Bitcoin · Gemini",     cat:"Crypto" },
  // ── Per-exchange ETH ──
  { sym:"ETH.COINBASE",  name:"Ethereum · Coinbase",   cat:"Crypto" },
  { sym:"ETH.KRAKEN",    name:"Ethereum · Kraken",     cat:"Crypto" },
  { sym:"ETH.BITSTAMP",  name:"Ethereum · Bitstamp",   cat:"Crypto" },
  { sym:"ETH.BINANCEUS", name:"Ethereum · Binance.US", cat:"Crypto" },
  { sym:"ETH.GEMINI",    name:"Ethereum · Gemini",     cat:"Crypto" },
  { sym:"FIL",     name:"Filecoin",               cat:"Crypto" },
  { sym:"ICP",     name:"Internet Computer",      cat:"Crypto" },
  { sym:"ARB",     name:"Arbitrum",               cat:"Crypto" },
  { sym:"OP",      name:"Optimism",               cat:"Crypto" },
  { sym:"SUI",     name:"Sui",                    cat:"Crypto" },
  { sym:"APT",     name:"Aptos",                  cat:"Crypto" },
  { sym:"INJ",     name:"Injective",              cat:"Crypto" },
  { sym:"PEPE",    name:"Pepe",                   cat:"Crypto" },
  { sym:"WIF",     name:"dogwifhat",              cat:"Crypto" },
  { sym:"BONK",    name:"Bonk",                  cat:"Crypto" },
  { sym:"FLOKI",   name:"Floki",                 cat:"Crypto" },
  { sym:"SHIB",    name:"Shiba Inu",             cat:"Crypto" },
  { sym:"MEME",    name:"Memecoin",              cat:"Crypto" },
  { sym:"TURBO",   name:"Turbo",                 cat:"Crypto" },
  { sym:"BRETT",   name:"Brett",                 cat:"Crypto" },
  { sym:"MOG",     name:"Mog Coin",              cat:"Crypto" },
  { sym:"POPCAT",  name:"Popcat",                cat:"Crypto" },
  { sym:"BOME",    name:"Book of Meme",          cat:"Crypto" },
  { sym:"WEN",     name:"Wen",                   cat:"Crypto" },
  { sym:"MYRO",    name:"Myro",                  cat:"Crypto" },
  { sym:"NEIRO",   name:"Neiro",                 cat:"Crypto" },
  { sym:"GOAT",    name:"Goat",                  cat:"Crypto" },
  { sym:"PNUT",    name:"Peanut the Squirrel",   cat:"Crypto" },
  { sym:"ACT",     name:"Act I: The AI Prophecy",cat:"Crypto" },
  { sym:"FARTCOIN",name:"Fartcoin",              cat:"Crypto" },
  { sym:"TRUMP",   name:"OFFICIAL TRUMP",        cat:"Crypto" },
  { sym:"MELANIA", name:"MELANIA meme",          cat:"Crypto" },
  { sym:"TON",     name:"Toncoin",               cat:"Crypto" },
  { sym:"TRX",     name:"TRON",                  cat:"Crypto" },
  { sym:"NEAR",    name:"NEAR Protocol",         cat:"Crypto" },
  { sym:"FTM",     name:"Fantom",                cat:"Crypto" },
  { sym:"ALGO",    name:"Algorand",              cat:"Crypto" },
  { sym:"VET",     name:"VeChain",               cat:"Crypto" },
  { sym:"HBAR",    name:"Hedera",                cat:"Crypto" },
  { sym:"XLM",     name:"Stellar",               cat:"Crypto" },
  { sym:"RENDER",  name:"Render Network",        cat:"Crypto" },
  { sym:"JUP",     name:"Jupiter",               cat:"Crypto" },
  { sym:"PYTH",    name:"Pyth Network",          cat:"Crypto" },
  { sym:"W",       name:"Wormhole",              cat:"Crypto" },
  { sym:"ENA",     name:"Ethena",                cat:"Crypto" },
  { sym:"ETHFI",   name:"Ether.fi",              cat:"Crypto" },
  { sym:"AEVO",    name:"Aevo",                  cat:"Crypto" },
  { sym:"PENDLE",  name:"Pendle",                cat:"Crypto" },
  { sym:"STRK",    name:"Starknet",              cat:"Crypto" },
  { sym:"ALT",     name:"AltLayer",              cat:"Crypto" },
  { sym:"MANTA",   name:"Manta Network",         cat:"Crypto" },
  { sym:"ZETA",    name:"ZetaChain",             cat:"Crypto" },
  // ── Forex ─────────────────────────────────────────────
  { sym:"EUR/USD", name:"Euro / US Dollar",        cat:"Forex" },
  { sym:"GBP/USD", name:"British Pound / Dollar",  cat:"Forex" },
  { sym:"USD/JPY", name:"Dollar / Japanese Yen",   cat:"Forex" },
  { sym:"AUD/USD", name:"Australian Dollar",       cat:"Forex" },
  { sym:"USD/CAD", name:"Dollar / Canadian Dollar",cat:"Forex" },
  { sym:"USD/CHF", name:"Dollar / Swiss Franc",    cat:"Forex" },
  { sym:"NZD/USD", name:"New Zealand Dollar",      cat:"Forex" },
  { sym:"EUR/GBP", name:"Euro / British Pound",    cat:"Forex" },
  { sym:"EUR/JPY", name:"Euro / Japanese Yen",     cat:"Forex" },
  { sym:"GBP/JPY", name:"British Pound / Yen",     cat:"Forex" },
  { sym:"USD/MXN", name:"Dollar / Mexican Peso",   cat:"Forex" },
  { sym:"USD/CNH", name:"Dollar / Offshore Yuan",  cat:"Forex" },
  { sym:"DXY",     name:"US Dollar Index",         cat:"Forex" },
  { sym:"EUR/CHF", name:"Euro / Swiss Franc",      cat:"Forex" },
  { sym:"AUD/JPY", name:"Aussie / Japanese Yen",   cat:"Forex" },
  { sym:"GBP/CHF", name:"British Pound / Swiss Franc", cat:"Forex" },
  { sym:"GBP/AUD", name:"British Pound / Aussie",  cat:"Forex" },
  { sym:"EUR/AUD", name:"Euro / Aussie",            cat:"Forex" },
  { sym:"EUR/CAD", name:"Euro / Canadian Dollar",   cat:"Forex" },
  { sym:"EUR/NZD", name:"Euro / New Zealand Dollar",cat:"Forex" },
  { sym:"USD/SGD", name:"Dollar / Singapore Dollar",cat:"Forex" },
  { sym:"USD/HKD", name:"Dollar / Hong Kong Dollar",cat:"Forex" },
  { sym:"USD/ZAR", name:"Dollar / South African Rand",cat:"Forex" },
  { sym:"USD/TRY", name:"Dollar / Turkish Lira",   cat:"Forex" },
  { sym:"USD/BRL", name:"Dollar / Brazilian Real",  cat:"Forex" },
  { sym:"USD/INR", name:"Dollar / Indian Rupee",    cat:"Forex" },
  { sym:"USD/KRW", name:"Dollar / South Korean Won",cat:"Forex" },
];

/* ══════════════════════════════════════════════════════════════
   INDICATORS CATALOGUE  (300+)
══════════════════════════════════════════════════════════════ */
const INDICATORS = [
  // ─── Trend ────────────────────────────────────────────────
  { cat:"Trend", name:"VWAP",                        desc:"Volume Weighted Average Price" },
  { cat:"Trend", name:"VWAP Bands",                  desc:"VWAP ±1σ / ±2σ standard deviation bands" },
  { cat:"Trend", name:"Anchored VWAP",               desc:"VWAP from user-selected anchor bar" },
  { cat:"Trend", name:"EMA 8",                       desc:"8-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 13",                      desc:"13-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 21",                      desc:"21-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 34",                      desc:"34-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 50",                      desc:"50-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 89",                      desc:"89-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 144",                     desc:"144-period Exponential Moving Average" },
  { cat:"Trend", name:"EMA 200",                     desc:"200-period Exponential Moving Average" },
  { cat:"Trend", name:"SMA 9",                       desc:"9-period Simple Moving Average" },
  { cat:"Trend", name:"SMA 20",                      desc:"20-period Simple Moving Average" },
  { cat:"Trend", name:"SMA 50",                      desc:"50-period Simple Moving Average" },
  { cat:"Trend", name:"SMA 100",                     desc:"100-period Simple Moving Average" },
  { cat:"Trend", name:"SMA 200",                     desc:"200-period Simple Moving Average" },
  { cat:"Trend", name:"WMA",                         desc:"Weighted Moving Average" },
  { cat:"Trend", name:"HMA",                         desc:"Hull Moving Average — lag-reduced" },
  { cat:"Trend", name:"DEMA",                        desc:"Double Exponential Moving Average" },
  { cat:"Trend", name:"TEMA",                        desc:"Triple Exponential Moving Average" },
  { cat:"Trend", name:"ALMA",                        desc:"Arnaud Legoux Moving Average" },
  { cat:"Trend", name:"T3 Moving Average",            desc:"Tillson T3 — smooth, low-lag MA" },
  { cat:"Trend", name:"ZLEMA",                       desc:"Zero-Lag Exponential Moving Average" },
  { cat:"Trend", name:"KAMA",                        desc:"Kaufman Adaptive Moving Average" },
  { cat:"Trend", name:"McGinley Dynamic",             desc:"Auto-adjusting moving average filter" },
  { cat:"Trend", name:"Moving Average Ribbon",        desc:"Multi-MA stacked ribbon display" },
  { cat:"Trend", name:"Bollinger Bands",              desc:"20-period SMA ±2σ standard deviation" },
  { cat:"Trend", name:"Bollinger Band Width",         desc:"BB band width — squeeze detection" },
  { cat:"Trend", name:"Ichimoku Cloud",               desc:"Ichimoku Kinko Hyo full suite" },
  { cat:"Trend", name:"Supertrend",                   desc:"ATR-based trend following signal" },
  { cat:"Trend", name:"Keltner Channel",              desc:"EMA ±ATR multiplier channel" },
  { cat:"Trend", name:"Donchian Channel",             desc:"N-period high/low price channel" },
  { cat:"Trend", name:"Price Channel",                desc:"Upper/lower N-period price channel" },
  { cat:"Trend", name:"Envelope",                    desc:"MA ± percentage envelope bands" },
  { cat:"Trend", name:"Parabolic SAR",                desc:"Stop and reverse trailing signal" },
  { cat:"Trend", name:"Linear Regression",            desc:"Least-squares regression line overlay" },
  { cat:"Trend", name:"Linear Regression Channel",    desc:"Regression ±σ channel bands" },
  { cat:"Trend", name:"Alligator",                   desc:"Williams Alligator jaw / teeth / lips" },
  // ─── Pivot Levels ──────────────────────────────────────
  { cat:"Pivots", name:"Pivot Points Standard",       desc:"Daily H/L/C pivot R1-R3 / S1-S3" },
  { cat:"Pivots", name:"Pivot Points Fibonacci",      desc:"Fibonacci-based daily pivot levels" },
  { cat:"Pivots", name:"Pivot Points Camarilla",      desc:"Camarilla intraday pivot levels" },
  { cat:"Pivots", name:"Pivot Points Woodie",         desc:"Woodie pivot calculation method" },
  { cat:"Pivots", name:"Pivot Points Demark",         desc:"Tom DeMark conditional pivot method" },
  { cat:"Pivots", name:"Pivot Points CPR",            desc:"Central Pivot Range (CPR) levels" },
  { cat:"Pivots", name:"Weekly Pivots",               desc:"Weekly high/low/close pivot levels" },
  { cat:"Pivots", name:"Monthly Pivots",              desc:"Monthly timeframe pivot levels" },
  // ─── Momentum ─────────────────────────────────────────
  { cat:"Momentum", name:"RSI",                      desc:"Relative Strength Index (14)" },
  { cat:"Momentum", name:"ConnorsRSI",               desc:"3-component Connors RSI" },
  { cat:"Momentum", name:"Stoch RSI",                desc:"Stochastic applied to RSI values" },
  { cat:"Momentum", name:"MACD",                     desc:"12/26/9 convergence-divergence" },
  { cat:"Momentum", name:"MACD Histogram",            desc:"MACD histogram bars only" },
  { cat:"Momentum", name:"MACD Signal",              desc:"MACD signal line cross alerts" },
  { cat:"Momentum", name:"Stochastic",               desc:"Stochastic oscillator (14, 3, 3)" },
  { cat:"Momentum", name:"Stochastic Momentum Index",desc:"SMI — refined stochastic oscillator" },
  { cat:"Momentum", name:"CCI",                      desc:"Commodity Channel Index (20)" },
  { cat:"Momentum", name:"Williams %R",              desc:"Williams Percent Range (14)" },
  { cat:"Momentum", name:"Awesome Oscillator",        desc:"SMA5 − SMA34 of midpoints" },
  { cat:"Momentum", name:"Accelerator Oscillator",    desc:"AO − 5-period SMA of AO" },
  { cat:"Momentum", name:"Rate of Change",            desc:"Price rate of change (ROC) %" },
  { cat:"Momentum", name:"Momentum",                 desc:"Current close minus N bars ago" },
  { cat:"Momentum", name:"Ultimate Oscillator",       desc:"3-period composite oscillator" },
  { cat:"Momentum", name:"TSI",                      desc:"True Strength Index" },
  { cat:"Momentum", name:"Relative Vigor Index",     desc:"RVI close vs open momentum" },
  { cat:"Momentum", name:"KDJ",                      desc:"K/D/J stochastic variation" },
  { cat:"Momentum", name:"Coppock Curve",            desc:"Long-term buy momentum oscillator" },
  { cat:"Momentum", name:"Elder Ray Index",           desc:"Bull/Bear power histogram" },
  { cat:"Momentum", name:"TRIX",                     desc:"Triple-smoothed ROC oscillator" },
  { cat:"Momentum", name:"PPO",                      desc:"Percentage Price Oscillator" },
  { cat:"Momentum", name:"DPO",                      desc:"Detrended Price Oscillator" },
  { cat:"Momentum", name:"Chande Momentum Oscillator",desc:"CMO momentum oscillator" },
  { cat:"Momentum", name:"Balance of Power",         desc:"BOP open-to-close strength ratio" },
  { cat:"Momentum", name:"Waddah Attar Explosion",   desc:"Trend + momentum hybrid indicator" },
  { cat:"Momentum", name:"TTM Squeeze",              desc:"Momentum squeeze breakout signal" },
  { cat:"Momentum", name:"Squeeze Momentum",         desc:"LazyBear squeeze momentum oscillator" },
  { cat:"Momentum", name:"Schaff Trend Cycle",       desc:"STC fast-cycle trend indicator" },
  // ─── Volume ───────────────────────────────────────────
  { cat:"Volume", name:"Volume",                     desc:"Bar volume histogram" },
  { cat:"Volume", name:"Volume MA",                  desc:"20-period moving average of volume" },
  { cat:"Volume", name:"RVOL",                       desc:"Relative Volume vs 20-day average" },
  { cat:"Volume", name:"OBV",                        desc:"On Balance Volume cumulative line" },
  { cat:"Volume", name:"CVD",                        desc:"Cumulative Volume Delta" },
  { cat:"Volume", name:"CVD Oscillator",             desc:"CVD normalized oscillator" },
  { cat:"Volume", name:"Money Flow Index",           desc:"MFI — volume-weighted RSI" },
  { cat:"Volume", name:"Chaikin Money Flow",         desc:"CMF accumulation/distribution" },
  { cat:"Volume", name:"Chaikin Oscillator",         desc:"MACD of Accumulation/Distribution line" },
  { cat:"Volume", name:"Accumulation/Distribution",  desc:"A/D line trend confirmation" },
  { cat:"Volume", name:"Ease of Movement",           desc:"Volume-price efficiency ratio" },
  { cat:"Volume", name:"Force Index",                desc:"Volume × price change force" },
  { cat:"Volume", name:"Klinger Oscillator",         desc:"Klinger volume oscillator" },
  { cat:"Volume", name:"Price Volume Trend",         desc:"PVT cumulative line" },
  { cat:"Volume", name:"Negative Volume Index",      desc:"NVI low-volume trend signal" },
  { cat:"Volume", name:"Positive Volume Index",      desc:"PVI high-volume trend signal" },
  { cat:"Volume", name:"VWMA",                       desc:"Volume Weighted Moving Average" },
  { cat:"Volume", name:"Volume Oscillator",          desc:"Fast/slow volume MA difference" },
  { cat:"Volume", name:"Volume Weighted RSI",        desc:"RSI weighted by volume intensity" },
  // ─── Volatility ───────────────────────────────────────
  { cat:"Volatility", name:"ATR",                    desc:"Average True Range (14)" },
  { cat:"Volatility", name:"Normalized ATR",         desc:"ATR expressed as % of price" },
  { cat:"Volatility", name:"Chaikin Volatility",     desc:"High-Low EMA spread rate of change" },
  { cat:"Volatility", name:"Historical Volatility",  desc:"20-period HV annualized %" },
  { cat:"Volatility", name:"Realized Volatility",    desc:"5-day realized vol close-to-close" },
  { cat:"Volatility", name:"BB Width",               desc:"Bollinger Band width — squeeze signal" },
  { cat:"Volatility", name:"KC Width",               desc:"Keltner Channel width" },
  { cat:"Volatility", name:"Volatility Stop",        desc:"ATR-based trailing stop loss" },
  { cat:"Volatility", name:"Standard Deviation",     desc:"N-period price standard deviation" },
  { cat:"Volatility", name:"Donchian Width",         desc:"Donchian channel spread" },
  { cat:"Volatility", name:"Mass Index",             desc:"High-low range reversal detector" },
  { cat:"Volatility", name:"Ulcer Index",            desc:"Downside volatility depth measure" },
  { cat:"Volatility", name:"Parkinson Volatility",   desc:"High-low Parkinson estimator" },
  // ─── Order Flow ────────────────────────────────────────
  { cat:"Order Flow", name:"Imbalance Tracker",       desc:"Horizontal zone boxes at price levels with ≥2.5× bid/ask imbalance — Deep Charts style" },
  { cat:"Order Flow", name:"Supply/Demand Zones",     desc:"Teal demand boxes + red supply boxes at swing highs/lows — Deep-M Effort style" },
  { cat:"Order Flow", name:"Speed of Tape",           desc:"HFT aggression velocity — how fast orders are hitting the tape" },
  { cat:"Order Flow", name:"Absorption Detector",     desc:"High volume + small range = large passive orders absorbing aggression" },
  { cat:"Order Flow", name:"Delta Bars",              desc:"Net ask−bid per bar as a directional histogram" },
  { cat:"Order Flow", name:"Stop Run Alert",          desc:"Failed breakout momentum reversal" },
  { cat:"Order Flow", name:"Stacked Imbalances",      desc:"Multiple consecutive imbalance rows" },
  { cat:"Order Flow", name:"Volume Delta",            desc:"Per-bar volume delta oscillator" },
  { cat:"Order Flow", name:"Trade Flow",              desc:"Trade direction flow imbalance" },
  { cat:"Order Flow", name:"Tape Speed",              desc:"Trades per second tape speed meter" },
  { cat:"Order Flow", name:"Large Trade Filter",      desc:"Shows only trades above size threshold" },
  { cat:"Order Flow", name:"Buy/Sell Volume Columns", desc:"Per-bar buy and sell volume side by side" },
  { cat:"Order Flow", name:"Exhaustion Detector",     desc:"Detects buying/selling exhaustion" },
  // ─── Smart Money ──────────────────────────────────────
  { cat:"Smart Money", name:"Order Block Finder",    desc:"Institutional demand/supply zones" },
  { cat:"Smart Money", name:"Fair Value Gaps",       desc:"Imbalanced price inefficiency zones" },
  { cat:"Smart Money", name:"Break of Structure",    desc:"Market structure BOS highlights" },
  { cat:"Smart Money", name:"Change of Character",   desc:"CHoCH — trend shift detection" },
  { cat:"Smart Money", name:"Liquidity Pools",       desc:"Buy/sell side liquidity sweep levels" },
  { cat:"Smart Money", name:"Strong Highs/Lows",     desc:"Protected structural swing points" },
  { cat:"Smart Money", name:"Equal Highs/Lows",      desc:"Double top/bottom liquidity pools" },
  { cat:"Smart Money", name:"Swing High/Low",        desc:"Structural swing point markers" },
  { cat:"Smart Money", name:"VWAP Deviation Bands",  desc:"Key VWAP σ extension levels" },
  { cat:"Smart Money", name:"Daily Candle Levels",   desc:"Prior day open / high / low / close" },
  // ─── Oscillators ──────────────────────────────────────
  { cat:"Oscillators", name:"Fisher Transform",      desc:"Price mapped to Gaussian distribution" },
  { cat:"Oscillators", name:"Aroon Oscillator",      desc:"Aroon up/down crossover oscillator" },
  { cat:"Oscillators", name:"Aroon Up/Down",         desc:"Aroon up and down lines" },
  { cat:"Oscillators", name:"ADX",                   desc:"Average Directional Index (14)" },
  { cat:"Oscillators", name:"DMI",                   desc:"+DI / -DI directional movement index" },
  { cat:"Oscillators", name:"Vortex Indicator",      desc:"V+ V- trend identification" },
  { cat:"Oscillators", name:"Ehlers Fisher",         desc:"Ehlers Fisher Transform variant" },
  { cat:"Oscillators", name:"RVI (Relative Vigor)",  desc:"Close/open range vs true range" },
  { cat:"Oscillators", name:"Stochastic Pop",        desc:"BB + Stoch breakout signal" },
  { cat:"Oscillators", name:"Awesome / AC Combo",    desc:"AO + Accelerator simultaneous" },
  { cat:"Oscillators", name:"Dual Stochastic",       desc:"Fast & slow stochastic crossover" },
  { cat:"Oscillators", name:"Color RSI",             desc:"RSI with bull/bear/div color fill" },
  { cat:"Oscillators", name:"Smoothed RSI",          desc:"EMA-smoothed RSI oscillator" },
  { cat:"Oscillators", name:"RVGI",                  desc:"Relative Volatility & Gain Index" },
  { cat:"Oscillators", name:"Choppiness Index",      desc:"Measures trend vs chop (0-100)" },
  // ─── Patterns ─────────────────────────────────────────
  { cat:"Patterns", name:"Doji Detector",            desc:"Doji candlestick pattern alert" },
  { cat:"Patterns", name:"Engulfing Pattern",        desc:"Bullish/bearish engulfing candles" },
  { cat:"Patterns", name:"Hammer / Shooting Star",   desc:"Reversal wick candle patterns" },
  { cat:"Patterns", name:"Morning / Evening Star",   desc:"3-candle reversal patterns" },
  { cat:"Patterns", name:"Three White Soldiers",     desc:"3 consecutive bullish candles" },
  { cat:"Patterns", name:"Three Black Crows",        desc:"3 consecutive bearish candles" },
  { cat:"Patterns", name:"Pin Bar",                  desc:"High-momentum rejection wick bar" },
  { cat:"Patterns", name:"Inside Bar",               desc:"Inside candle consolidation pattern" },
  // ─── Statistics ───────────────────────────────────────
  { cat:"Statistics", name:"Z-Score",                desc:"Price Z-score from rolling mean" },
  { cat:"Statistics", name:"Percentile Rank",        desc:"Percentile vs N-bar lookback range" },
  { cat:"Statistics", name:"Linear Regression Slope",desc:"Slope steepness of LR line" },
  // ─── Session Tools ────────────────────────────────────
  { cat:"Sessions", name:"Pre-Market High/Low",      desc:"Pre-market high and low levels" },
  { cat:"Sessions", name:"Opening Range Breakout",   desc:"First 5/15/30-min range breakout" },
  { cat:"Sessions", name:"Prior Day High/Low",       desc:"Yesterday's high and low levels" },
  { cat:"Sessions", name:"Prior Week High/Low",      desc:"Last week's high and low levels" },
];

/* ══════════════════════════════════════════════════════════════
   TIMEFRAMES
══════════════════════════════════════════════════════════════ */
const TIMEFRAMES = ["1m","2m","3m","5m","10m","15m","30m","1h","2h","4h","D","W","M","3M","6M","1Y","3Y","5Y"];


/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
interface ChartToolbarProps {
  symbol:              string;
  setSymbol:           (s: string) => void;
  timeframe:           string;
  setTimeframe:        (t: string) => void;
  onSmartMoney:        () => void;
  onPnL:               () => void;
  onDOM:               () => void;
  onPineScript:        () => void;
  onCommunity?:        () => void;
  smartMoneyActive:    boolean;
  pineActive?:         boolean;
  initialActiveInds?:  Set<string>;
  onActiveIndsChange?: (inds: Set<string>) => void;
  onIndicatorSettings?: (name: string) => void;
  onExtHoursChange?:   (v: boolean) => void;
  // New props
  onAlerts?:           () => void;
  alertsActive?:       boolean;
  onSettings?:         () => void;
  onReplay?:           () => void;
  replayActive?:       boolean;
  onCompare?:          () => void;
  compareActive?:      boolean;
  chartLayout?:        ChartLayout;
  onLayoutChange?:     (l: ChartLayout) => void;
}

// Pin high-priority categories first so they're always visible without scrolling
const ALL_IND_CATS = Array.from(new Set(INDICATORS.map(i => i.cat)));
const PINNED = ["Order Flow", "Volume", "Trend", "Momentum"];
const IND_CATS = ["All", ...PINNED, ...ALL_IND_CATS.filter(c => !PINNED.includes(c))];
const SYM_CATS = ["All", "Futures", "Stocks", "ETFs", "Crypto", "Forex"];

const CAT_COLORS: Record<string, string> = {
  Futures:"#F0B429", Stocks:"#8B95A5", ETFs:"#00D4AA",
  Crypto:"#8B5CF6",  Forex:"#4FA3E0",
};

function SymbolRow({ s, symbol, onSelect }: { s: SymbolEntry; symbol: string; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2 hover:bg-wm-surface/70 transition-colors group text-left",
        s.sym === symbol ? "bg-wm-surface/50" : ""
      )}
    >
      <div className="flex-1 min-w-0">
        <div className={clsx("text-[12px] font-black truncate", s.sym === symbol ? "text-wm-green" : "text-wm-text")}>
          {s.sym}
        </div>
        <div className="text-[12px] text-wm-text-dim truncate">{s.name}</div>
      </div>
      <span className="text-[11px] px-1.5 py-0.5 rounded font-bold shrink-0"
        style={{ background:`${CAT_COLORS[s.cat] ?? "#8B95A5"}18`, color: CAT_COLORS[s.cat] ?? "#8B95A5" }}>
        {s.cat}
      </span>
      {s.sym === symbol && <Check size={11} className="text-wm-green shrink-0" />}
    </button>
  );
}

export function ChartToolbar({
  symbol, setSymbol, timeframe, setTimeframe,
  onSmartMoney, onPnL, onDOM, onPineScript, onCommunity,
  smartMoneyActive, pineActive,
  initialActiveInds, onActiveIndsChange, onIndicatorSettings, onExtHoursChange,
  onAlerts, alertsActive, onSettings,
  onReplay, replayActive, onCompare, compareActive,
  chartLayout = "1", onLayoutChange,
}: ChartToolbarProps) {
  const [symbolSearch,   setSymbolSearch]  = useState("");
  const [symbolOpen,     setSymbolOpen]    = useState(false);
  const [symCat,         setSymCat]        = useState("All");
  const [indicatorOpen,  setIndicatorOpen] = useState(false);
  const [extendedHours,  setExtendedHours] = useState(false);
  const [activeInds,     setActiveInds]    = useState<Set<string>>(() => initialActiveInds ? new Set(initialActiveInds) : new Set<string>());
  const [indSearch,      setIndSearch]     = useState("");
  const [indCat,         setIndCat]        = useState("All");
  const [favorites,      setFavorites]     = useState<Set<string>>(
    new Set(["VWAP","RSI","MACD","Bollinger Bands","Volume"])
  );
  const [showFavsOnly,   setShowFavsOnly]  = useState(false);
  const [descOpen,       setDescOpen]      = useState<Set<string>>(new Set());
  const [liveSymbols,    setLiveSymbols]   = useState<SymbolEntry[]>([]);
  const [liveSearching,  setLiveSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const symRef  = useRef<HTMLDivElement>(null);
  const indRef  = useRef<HTMLDivElement>(null);
  const symInputRef = useRef<HTMLInputElement>(null);

  /* ── Finnhub live search (via server proxy to avoid CORS) ── */
  const searchFinnhub = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setLiveSymbols([]); setLiveSearching(false); return; }
    setLiveSearching(true);
    try {
      const res = await fetch(`/api/finnhub?q=${encodeURIComponent(q)}&type=search`, { cache: "no-store" });
      const json = await res.json();
      // Normalize: proxy returns {results:[{sym,name,type,exchange}]}, direct returns {result:[...]}
      const raw = json.results ?? json.result ?? [];
      const results: SymbolEntry[] = raw.slice(0, 50).map((r: any) => ({
        sym:  r.sym ?? r.symbol,
        name: r.name ?? r.description,
        cat:  r.type === "Crypto" ? "Crypto" : r.type === "Forex" ? "Forex" : r.type === "ETF" ? "ETFs" : "Stocks",
      })).filter((r: SymbolEntry) => r.sym && r.name);
      // Deduplicate against local results (local takes priority) AND within the
      // Finnhub set itself — Finnhub returns the same symbol on multiple exchanges,
      // which otherwise produces duplicate React keys + duplicate visible rows.
      const seen = new Set(ALL_SYMBOLS.map(s => s.sym));
      const freshOnly = results.filter(r => {
        if (seen.has(r.sym)) return false;
        seen.add(r.sym);
        return true;
      });
      setLiveSymbols(freshOnly);
    } catch { /* network error — silently fail */ }
    finally { setLiveSearching(false); }
  }, []);

  /* expose active indicators and ext hours to parent */
  useEffect(() => { onActiveIndsChange?.(activeInds); }, [activeInds]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onExtHoursChange?.(extendedHours); }, [extendedHours]); // eslint-disable-line react-hooks/exhaustive-deps

  /* close on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (symRef.current  && !symRef.current.contains(e.target as Node))  setSymbolOpen(false);
      if (indRef.current  && !indRef.current.contains(e.target as Node))  setIndicatorOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Debounced Finnhub live search ─────────────────── */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!symbolSearch) { setLiveSymbols([]); setLiveSearching(false); return; }
    searchTimerRef.current = setTimeout(() => searchFinnhub(symbolSearch), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [symbolSearch, searchFinnhub]);

  /* ── Symbol filtering ───────────────────────────────── */
  const filteredSymbols = ALL_SYMBOLS.filter(s => {
    const q = symbolSearch.toLowerCase();
    const matchesQuery = !q ||
      s.sym.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.cat.toLowerCase().includes(q);
    const matchesCat = symCat === "All" || s.cat === symCat;
    return matchesQuery && matchesCat;
  });

  /* ── Indicator filtering ────────────────────────────── */
  const filteredInds = INDICATORS.filter(ind => {
    const q = indSearch.toLowerCase();
    const matchesQuery = !q ||
      ind.name.toLowerCase().includes(q) ||
      ind.desc.toLowerCase().includes(q) ||
      ind.cat.toLowerCase().includes(q);
    const matchesCat  = indCat === "All" || ind.cat === indCat;
    const matchesFav  = !showFavsOnly || favorites.has(ind.name);
    return matchesQuery && matchesCat && matchesFav;
  });

  const toggleIndicator = (name: string) => {
    setActiveInds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleFavorite = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div
      className="flex items-center border-b border-wm-border px-2 gap-1 shrink-0 overflow-x-auto"
      style={{ scrollbarWidth:"none", height: 36, background: "#0D0E14", borderColor: "#1E2030" }}
    >

      {/* ══ Symbol Search — inline autocomplete ════════════ */}
      <div className="relative shrink-0" ref={symRef}>
        {/* Always-visible input box that IS the search */}
        <div
          className="flex items-center gap-1.5 px-2 h-7 rounded bg-wm-surface border border-wm-border focus-within:border-wm-blue/50 transition-colors min-w-[130px] cursor-text"
          onClick={() => { setSymbolOpen(true); symInputRef.current?.focus(); }}
        >
          <Search size={10} className="text-wm-text-muted shrink-0" />
          <input
            ref={symInputRef}
            value={symbolSearch}
            onChange={e => { setSymbolSearch(e.target.value); setSymbolOpen(true); }}
            onFocus={() => setSymbolOpen(true)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                // Priority: 1) local filtered list, 2) live Finnhub results, 3) raw typed symbol
                const firstLocal = filteredSymbols[0];
                const firstLive  = liveSymbols[0];
                const typed      = symbolSearch.trim().toUpperCase();
                const target     = firstLocal?.sym ?? firstLive?.sym ?? (typed || null);
                if (target) {
                  setSymbol(target);
                  setSymbolOpen(false);
                  setSymbolSearch("");
                }
              }
              if (e.key === "Tab" && filteredSymbols.length > 0) {
                e.preventDefault();
                setSymbolSearch(filteredSymbols[0].sym);
              }
              if (e.key === "Escape") { setSymbolOpen(false); setSymbolSearch(""); }
            }}
            placeholder={symbol}
            className="flex-1 bg-transparent text-[12px] font-black text-wm-text outline-none placeholder-wm-text-muted w-[80px]"
            style={{ caretColor: "#4FA3E0" }}
          />
          {symbolSearch ? (
            <button onClick={e => { e.stopPropagation(); setSymbolSearch(""); setSymbolOpen(false); }}>
              <X size={10} className="text-wm-text-muted hover:text-wm-red transition-colors" />
            </button>
          ) : (
            <ChevronDown size={10} className="text-wm-text-muted" />
          )}
        </div>

        {symbolOpen && (() => {
          const r = symRef.current?.getBoundingClientRect();
          return (
          <div style={{
            position:"fixed", top:(r?.bottom ?? 36)+4, left:r?.left ?? 0,
            zIndex:9999, width:360,
            background:"var(--wm-card,#131520)", border:"1px solid var(--wm-border,#1E2030)",
            borderRadius:12, boxShadow:"0 12px 40px rgba(0,0,0,0.8)",
            overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:460,
          }}>

            {/* Top-match autofill hint */}
            {symbolSearch && filteredSymbols.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-wm-blue/10 border-b border-wm-blue/20 shrink-0">
                <span className="text-[12px] text-wm-blue font-bold">{filteredSymbols[0].sym}</span>
                <span className="text-[12px] text-wm-text-dim truncate flex-1">{filteredSymbols[0].name}</span>
                <span className="text-[11px] text-wm-blue/60">Tab to fill · ↵ to select</span>
              </div>
            )}

            {/* category tabs */}
            <div className="flex gap-1 px-2 py-1.5 border-b border-wm-border overflow-x-auto shrink-0" style={{ scrollbarWidth:"none" }}>
              {SYM_CATS.map(c => (
                <button key={c} onClick={() => setSymCat(c)}
                  className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border",
                    symCat === c
                      ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40"
                      : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
                  )}>
                  {c}
                </button>
              ))}
            </div>

            {/* results */}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth:"thin" }}>
              {liveSearching && (
                <div className="px-3 py-1 flex items-center gap-2 border-b border-wm-border/50">
                  <div className="w-2 h-2 rounded-full bg-wm-green animate-pulse" />
                  <span className="text-[11px] text-wm-text-dim">Searching all global markets…</span>
                </div>
              )}
              {filteredSymbols.length === 0 && liveSymbols.length === 0 && !liveSearching ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-wm-text-muted text-xs">No results for &ldquo;{symbolSearch}&rdquo;</div>
                  <div className="text-wm-text-dim text-[12px] mt-1">Searching Finnhub global database…</div>
                </div>
              ) : (
                <>
                  {filteredSymbols.map(s => (
                    <SymbolRow key={s.sym} s={s} symbol={symbol} onSelect={() => { setSymbol(s.sym); setSymbolOpen(false); setSymbolSearch(""); setSymCat("All"); }} />
                  ))}
                  {liveSymbols.length > 0 && (
                    <>
                      {filteredSymbols.length > 0 && (
                        <div className="px-3 py-1 text-[11px] text-wm-text-dim border-t border-wm-border/40 bg-wm-dark/50">
                          Global results (Finnhub)
                        </div>
                      )}
                      {liveSymbols.map((s, i) => (
                        <SymbolRow key={`live-${s.sym}-${i}`} s={s} symbol={symbol} onSelect={() => { setSymbol(s.sym); setSymbolOpen(false); setSymbolSearch(""); setSymCat("All"); }} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* footer */}
            <div className="px-3 py-1.5 border-t border-wm-border bg-wm-dark shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-wm-text-dim">
                {filteredSymbols.length + liveSymbols.length} results · search any symbol worldwide
              </span>
              <span className="text-[11px] text-wm-text-dim">↵ to select first result</span>
            </div>
          </div>
          );
        })()}
      </div>

      <div className="w-px h-5 bg-wm-border mx-0.5 shrink-0" />

      {/* ══ Timeframes ══════════════════════════════════════ */}
      <div className="flex items-center gap-0.5 shrink-0">
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)}
            className={clsx(
              "px-1.5 h-6 rounded text-[11px] font-mono transition-colors",
              tf === timeframe
                ? "bg-wm-blue/20 text-wm-blue border border-wm-blue/40"
                : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface"
            )}>
            {tf}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-wm-border mx-0.5 shrink-0" />

      {/* ══ Extended Hours dropdown ═════════════════════════ */}
      <select
        value={extendedHours ? "eth" : "rth"}
        onChange={e => setExtendedHours(e.target.value === "eth")}
        title="Regular vs Extended Trading Hours"
        className="h-6 px-1.5 rounded text-[11px] font-semibold shrink-0 cursor-pointer outline-none"
        style={{
          background: extendedHours ? "rgba(240,180,41,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${extendedHours ? "rgba(240,180,41,0.35)" : "#1E2030"}`,
          color: extendedHours ? "#F0B429" : "#8B8FA8",
        }}
      >
        <option value="rth">RTH — Regular Hours</option>
        <option value="eth">ETH — Extended Hours</option>
      </select>

      <div className="w-px h-5 bg-wm-border mx-0.5 shrink-0" />

      {/* ══ Indicators ══════════════════════════════════════ */}
      <div className="relative shrink-0" ref={indRef}>
        <button
          onClick={() => setIndicatorOpen(o => !o)}
          className={clsx(
            "flex items-center gap-1.5 px-2 h-6 rounded text-[11px] transition-colors border",
            indicatorOpen
              ? "bg-wm-surface text-wm-text border-wm-border"
              : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
          )}
          title="Indicators">
          <BarChart2 size={12} />
          <span>Indicators</span>
          {activeInds.size > 0 && (
            <span className="px-1.5 rounded-full bg-wm-green/25 text-wm-green text-[11px] font-black">
              {activeInds.size}
            </span>
          )}
        </button>

        {indicatorOpen && (() => {
          const r = indRef.current?.getBoundingClientRect();
          return (
          <div style={{
            position:"fixed", top:(r?.bottom ?? 36)+4, left:r?.left ?? 0,
            zIndex:9999, width:420,
            background:"var(--wm-card,#131520)", border:"1px solid var(--wm-border,#1E2030)",
            borderRadius:12, boxShadow:"0 12px 40px rgba(0,0,0,0.8)",
            overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:520,
          }}>

            {/* header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-wm-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-black text-wm-text">Indicators</span>
                <span className="text-[12px] text-wm-text-dim">({INDICATORS.length} total)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFavsOnly(v => !v)}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-semibold transition-all border",
                    showFavsOnly ? "bg-wm-gold/20 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-transparent hover:text-wm-text"
                  )}>
                  <Star size={10} /> Favorites
                </button>
                <button onClick={() => setIndicatorOpen(false)}>
                  <X size={13} className="text-wm-text-muted hover:text-wm-text" />
                </button>
              </div>
            </div>

            {/* search */}
            <div className="px-2 py-1.5 border-b border-wm-border shrink-0">
              <div className="flex items-center gap-2 bg-wm-surface rounded-lg px-2.5 py-1.5 border border-wm-border focus-within:border-wm-blue/50 transition-colors">
                <Search size={11} className="text-wm-text-muted shrink-0" />
                <input
                  autoFocus
                  value={indSearch}
                  onChange={e => setIndSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape") { setIndSearch(""); setIndicatorOpen(false); }
                    if (e.key === "Enter" && filteredInds.length > 0) { toggleIndicator(filteredInds[0].name); }
                    if (e.key === "Tab" && filteredInds.length > 0) { e.preventDefault(); setIndSearch(filteredInds[0].name); }
                  }}
                  placeholder={`Search ${INDICATORS.length} indicators…  ↵ toggle top match`}
                  className="flex-1 bg-transparent text-[11px] text-wm-text outline-none placeholder-wm-text-dim"
                  style={{ caretColor: "#00D4AA" }}
                />
                {indSearch && (
                  <button onClick={() => setIndSearch("")}>
                    <X size={10} className="text-wm-text-muted hover:text-wm-text" />
                  </button>
                )}
              </div>
              {/* Autofill hint */}
              {indSearch && filteredInds.length > 0 && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[11px] text-wm-green font-semibold truncate">{filteredInds[0].name}</span>
                  <span className="text-[11px] text-wm-text-dim">— {filteredInds[0].cat}</span>
                  <span className="ml-auto text-[10px] text-wm-text-dim">Tab=fill · ↵=toggle</span>
                </div>
              )}
            </div>

            {/* category tabs */}
            <div className="flex gap-1 px-2 py-1 border-b border-wm-border overflow-x-auto shrink-0" style={{ scrollbarWidth:"none" }}>
              {IND_CATS.map(c => {
                const isOF = c === "Order Flow";
                const active = indCat === c;
                return (
                  <button key={c} onClick={() => setIndCat(c)}
                    className={clsx(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                      active
                        ? isOF
                          ? "bg-wm-green/25 text-wm-green border-wm-green/50"
                          : "bg-wm-green/20 text-wm-green border-wm-green/40"
                        : isOF
                          ? "text-wm-green/70 hover:text-wm-green hover:bg-wm-surface border-transparent"
                          : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
                    )}>
                    {isOF ? "⚡ Order Flow" : c}
                  </button>
                );
              })}
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
              {filteredInds.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-wm-text-muted text-xs">No indicators match "{indSearch}"</div>
                  <div className="text-wm-text-dim text-[12px] mt-1">Try "VWAP", "RSI", "volume", etc.</div>
                </div>
              ) : filteredInds.map(ind => {
                const on  = activeInds.has(ind.name);
                const fav = favorites.has(ind.name);
                const showDesc = descOpen.has(ind.name);
                return (
                  <React.Fragment key={ind.name}>
                  <div
                    onClick={() => toggleIndicator(ind.name)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-wm-surface/60 cursor-pointer transition-colors group border-b border-wm-border/20"
                  >
                    {/* toggle switch */}
                    <div className={clsx(
                      "w-8 h-4 rounded-full transition-all shrink-0 relative border",
                      on ? "bg-wm-green/30 border-wm-green/60" : "bg-wm-surface border-wm-border"
                    )}>
                      <div className={clsx(
                        "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                        on ? "left-[18px] bg-wm-green" : "left-0.5 bg-wm-text-dim"
                      )} />
                    </div>

                    {/* text */}
                    <div className="flex-1 min-w-0">
                      <div className={clsx("text-[11px] font-semibold truncate", on ? "text-wm-text" : "text-wm-text-muted")}>
                        {ind.name}
                      </div>
                      <div className="text-[11px] text-wm-text-dim truncate">{ind.desc}</div>
                    </div>

                    {/* category badge */}
                    <span className="text-[11px] text-wm-text-dim shrink-0 hidden group-hover:block">{ind.cat}</span>

                    {/* description "?" — opens an info panel below the row */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDescOpen(prev => {
                          const next = new Set(prev);
                          next.has(ind.name) ? next.delete(ind.name) : next.add(ind.name);
                          return next;
                        });
                      }}
                      title="Show description"
                      className={clsx("shrink-0 transition-colors", showDesc ? "text-wm-blue" : "text-wm-text-dim hover:text-wm-blue")}
                    >
                      <HelpCircle size={11} />
                    </button>

                    {/* settings gear — only for configurable indicators */}
                    {isConfigurable(ind.name) && onIndicatorSettings && (
                      <button
                        onClick={e => { e.stopPropagation(); onIndicatorSettings(ind.name); }}
                        title="Indicator settings"
                        className={clsx("shrink-0 transition-colors", on ? "text-wm-blue hover:text-wm-text" : "text-wm-text-dim hover:text-wm-text")}
                      >
                        <Settings size={11} />
                      </button>
                    )}

                    {/* favorite star */}
                    <button
                      onClick={e => toggleFavorite(e, ind.name)}
                      className={clsx("shrink-0 transition-colors", fav ? "text-wm-gold" : "text-wm-text-dim hover:text-wm-gold")}
                    >
                      <Star size={11} fill={fav ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Expanded description panel — opened by the "?" button.
                      Rich TradingView-style sections (Definition / Calculation /
                      How to use / What to look for / Summary). */}
                  {showDesc && (() => {
                    const info = getIndicatorInfo(ind.name, ind.cat, ind.desc);
                    const Section = ({ label, body }: { label: string; body: string }) => (
                      <div className="mb-2.5 last:mb-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-wm-blue mb-0.5">{label}</div>
                        <p className="text-[11px] text-wm-text-muted leading-relaxed">{body}</p>
                      </div>
                    );
                    return (
                      <div className="px-4 py-3 bg-wm-surface/40 border-b border-wm-blue/30 max-h-[320px] overflow-y-auto"
                        style={{ borderLeft: "2px solid #4FA3E0" }}>
                        <div className="flex items-center gap-2 mb-2 sticky top-0">
                          <HelpCircle size={12} className="text-wm-blue shrink-0" />
                          <span className="text-[12px] font-bold text-wm-text">{ind.name}</span>
                          <span className="text-[9px] text-wm-text-dim px-1.5 py-0.5 rounded bg-wm-surface">{ind.cat}</span>
                        </div>
                        <Section label="Definition"        body={info.definition} />
                        <Section label="Calculation"       body={info.calculation} />
                        <Section label="How to use"        body={info.howToUse} />
                        <Section label="What to look for"  body={info.whatToLookFor} />
                        <Section label="Summary"           body={info.summary} />
                      </div>
                    );
                  })()}
                  </React.Fragment>
                );
              })}
            </div>

            {/* footer */}
            <div className="px-3 py-2 border-t border-wm-border bg-wm-dark shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-wm-text-dim">
                {filteredInds.length} shown · {activeInds.size} active
              </span>
              <div className="flex items-center gap-3">
                {onCommunity && (
                  <button onClick={() => { setIndicatorOpen(false); onCommunity(); }}
                    className="text-[12px] text-wm-blue hover:text-wm-text font-semibold transition-colors">
                    📚 Community
                  </button>
                )}
                <button onClick={() => { setIndicatorOpen(false); onPineScript(); }}
                  className="text-[12px] text-wm-purple hover:text-wm-text font-semibold transition-colors">
                  ƒ Pine Script →
                </button>
              </div>
            </div>
          </div>
          );
        })()}
      </div>

      <div className="w-px h-5 bg-wm-border mx-0.5 shrink-0" />

      {/* ══ Panel Toggles ═══════════════════════════════════ */}
      <button onClick={onDOM}
        className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-wm-text-muted hover:text-wm-text hover:bg-wm-surface transition-colors shrink-0"
        title="DOM Ladder">
        <LayoutGrid size={12} /> DOM
      </button>

      <button onClick={onPnL}
        className="flex items-center gap-1 px-2 h-6 rounded text-[12px] font-semibold border transition-colors shrink-0"
        style={{ background:"rgba(0,192,118,0.10)", borderColor:"rgba(0,192,118,0.35)", color:"#00C076" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,192,118,0.22)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,192,118,0.10)"; }}
        title="Connect a Broker to Trade">
        <Plug2 size={11} /> Connect Broker / Trade
      </button>

      <button onClick={onPineScript}
        className={clsx(
          "flex items-center gap-1 px-2 h-6 rounded text-[11px] font-semibold transition-colors shrink-0 border",
          pineActive
            ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
            : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
        )}
        title="Pine Script Editor">
        <span className="text-sm leading-none">ƒ</span> Pine
      </button>

      <div className="w-px h-5 bg-wm-border mx-0.5 shrink-0" />

      {/* ══ Replay ══════════════════════════════════════════ */}
      {onReplay && (
        <button onClick={onReplay}
          className={clsx(
            "flex items-center gap-1 px-2 h-6 rounded text-[11px] transition-colors shrink-0 border",
            replayActive
              ? "bg-wm-red/20 text-wm-red border-wm-red/40"
              : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
          )}
          title="Bar Replay">
          <Play size={10} /> Replay
        </button>
      )}

      {/* ══ Compare ══════════════════════════════════════════ */}
      {onCompare && (
        <button onClick={onCompare}
          className={clsx(
            "flex items-center gap-1 px-2 h-6 rounded text-[11px] transition-colors shrink-0 border",
            compareActive
              ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40"
              : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
          )}
          title="Compare symbol">
          <GitMerge size={10} /> Compare
        </button>
      )}

      <div className="ml-auto" />

      {/* ══ Pinned right cluster — always visible, never clipped ══════
          (sticky so it stays put even when the middle toolbar overflows) */}
      <div
        className="flex items-center gap-1 shrink-0 pl-1.5 h-full"
        style={{ position: "sticky", right: 0, background: "#0D0E14", borderLeft: "1px solid #1E2030", zIndex: 5 }}
      >
        {/* Alerts */}
        {onAlerts && (
          <button onClick={onAlerts}
            className={clsx(
              "flex items-center gap-1 px-2 h-6 rounded text-[11px] transition-colors shrink-0 border",
              alertsActive
                ? "bg-wm-gold/20 text-wm-gold border-wm-gold/40"
                : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border-transparent"
            )}
            title="Price Alerts">
            <Bell size={10} /> Alerts
          </button>
        )}

        {/* Layout Manager moved to the left tool strip (LeftSidebar) */}

        {/* Settings */}
        {onSettings && (
          <button onClick={onSettings}
            className="p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors shrink-0 border border-transparent hover:border-wm-border"
            title="Chart Settings">
            <Settings size={13} />
          </button>
        )}

        {/* Smart Money Signals — the WealthyMindsets "W" button */}
        <button onClick={onSmartMoney}
          className="flex items-center gap-1 px-1.5 h-6 rounded shrink-0 border transition-colors"
          style={{
            borderColor: smartMoneyActive ? "rgba(0,212,170,0.5)" : "rgba(34,34,34,0.8)",
            background: smartMoneyActive ? "rgba(0,212,170,0.12)" : "transparent",
          }}
          title="Smart Money Signals">
          <WMSmartMoneyIcon size={20} active={smartMoneyActive} />
          <span className="text-[11px] font-bold" style={{ color: smartMoneyActive ? "#00D4AA" : "#8B95A5" }}>Signals</span>
        </button>
      </div>

    </div>
  );
}
