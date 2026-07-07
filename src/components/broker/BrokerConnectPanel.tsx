"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ExternalLink, Search, Key, Check, ChevronDown, ChevronUp, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type BrokerCategory = "broker" | "crypto" | "forex" | "prop";

interface Broker {
  id:        string;
  name:      string;
  category:  BrokerCategory;
  logo:      string;
  color:     string;
  desc:      string;
  features:  string[];
  signInUrl: string;
  signUpUrl: string;
  apiSupport?: {
    label:        string;         // e.g. "Alpaca API"
    keyLabel:     string;         // e.g. "API Key"
    secretLabel?: string;         // e.g. "API Secret"
    docsUrl:      string;
    endpoint:     string;         // our internal proxy: /api/broker/[id]/account
  };
}

const BROKERS: Broker[] = [
  /* ── Stocks / Futures Brokers ───────────────────────────── */
  {
    id:"alpaca", name:"Alpaca", category:"broker",
    logo:"A", color:"#FFCE00",
    desc:"Commission-free stocks & crypto API — paper + live trading",
    features:["Stocks","Crypto","Options","Free API","Paper Trading"],
    signInUrl:"https://app.alpaca.markets/login",
    signUpUrl:"https://alpaca.markets/",
    apiSupport:{
      label:"Alpaca API", keyLabel:"API Key ID", secretLabel:"Secret Key",
      docsUrl:"https://alpaca.markets/docs/trading/getting-started/",
      endpoint:"/api/broker/alpaca",
    },
  },
  {
    id:"tradovate", name:"Tradovate", category:"broker",
    logo:"T", color:"#00A8E8",
    desc:"Commission-free futures trading — cloud-based, NQ/ES/RTY",
    features:["Futures","Commission-free","Cloud Platform"],
    signInUrl:"https://trader.tradovate.com/",
    signUpUrl:"https://www.tradovate.com/",
  },
  {
    id:"schwab", name:"Charles Schwab", category:"broker",
    logo:"S", color:"#0C2E6B",
    desc:"Full-service brokerage with thinkorswim platform",
    features:["Stocks","Options","Futures","thinkorswim"],
    signInUrl:"https://client.schwab.com/Login/SignOn/CustomerCenterLogin.aspx",
    signUpUrl:"https://www.schwab.com/open-an-account",
  },
  {
    id:"webull", name:"Webull", category:"broker",
    logo:"W", color:"#2EBD85",
    desc:"Commission-free trading for stocks, ETFs, and options",
    features:["Stocks","ETFs","Options","Commission-free"],
    signInUrl:"https://app.webull.com/",
    signUpUrl:"https://www.webull.com/signup",
  },
  {
    id:"ib", name:"Interactive Brokers", category:"broker",
    logo:"IB", color:"#F5A623",
    desc:"Professional-grade — 135+ markets, low margin rates",
    features:["135+ Markets","Futures","Forex","API"],
    signInUrl:"https://www.interactivebrokers.com/sso/Login",
    signUpUrl:"https://www.interactivebrokers.com/en/trading/open-account.php",
  },
  {
    id:"tastytrade", name:"tastytrade", category:"broker",
    logo:"🌮", color:"#FF6B00",
    desc:"Options-focused platform with low commissions",
    features:["Options-first","$0 stock commissions","Futures"],
    signInUrl:"https://trade.tastytrade.com/",
    signUpUrl:"https://open.tastytrade.com/",
  },
  {
    id:"ninjatrader", name:"NinjaTrader", category:"broker",
    logo:"N", color:"#C41230",
    desc:"Advanced futures trading with custom strategy development",
    features:["Futures","NinjaScript","Sim trading"],
    signInUrl:"https://ninjatrader.com/sign-in/",
    signUpUrl:"https://ninjatrader.com/lp/free-trading-platform/",
  },
  {
    id:"tradestation", name:"TradeStation", category:"broker",
    logo:"TS", color:"#E8272B",
    desc:"Powerful platform for active traders with deep analytics",
    features:["Stocks","Options","Futures","Backtesting"],
    signInUrl:"https://www.tradestation.com/platforms-and-tools/desktop/",
    signUpUrl:"https://www.tradestation.com/open-an-account/",
  },
  {
    id:"moomoo", name:"moomoo", category:"broker",
    logo:"M", color:"#FFC107",
    desc:"Advanced tools, fractional shares, 24/5 extended hours trading",
    features:["Stocks","ETFs","Options","Level 2 Data"],
    signInUrl:"https://j.moomoo.com/",
    signUpUrl:"https://www.moomoo.com/us/",
  },

  /* ── Crypto Exchanges ──────────────────────────────────── */
  {
    id:"coinbase", name:"Coinbase Advanced", category:"crypto",
    logo:"C", color:"#0052FF",
    desc:"US-regulated crypto exchange — 400+ assets, Advanced Trade API",
    features:["400+ Crypto","Advanced Charts","Staking","API"],
    signInUrl:"https://advanced.coinbase.com/",
    signUpUrl:"https://www.coinbase.com/signup",
    apiSupport:{
      label:"Coinbase Advanced API", keyLabel:"API Key", secretLabel:"API Secret",
      docsUrl:"https://docs.cdp.coinbase.com/advanced-trade/docs/welcome",
      endpoint:"/api/broker/coinbase",
    },
  },
  {
    id:"binance", name:"Binance.US", category:"crypto",
    logo:"B", color:"#F0B90B",
    desc:"Largest crypto exchange by volume — spot, futures, staking",
    features:["500+ Cryptos","Spot + Futures","Low Fees","Staking"],
    signInUrl:"https://www.binance.us/login",
    signUpUrl:"https://www.binance.us/register",
    apiSupport:{
      label:"Binance.US API", keyLabel:"API Key", secretLabel:"Secret Key",
      docsUrl:"https://docs.binance.us/",
      endpoint:"/api/broker/binance",
    },
  },
  {
    id:"kraken", name:"Kraken", category:"crypto",
    logo:"K", color:"#5741D9",
    desc:"Trusted crypto exchange — security-first, futures available",
    features:["200+ Cryptos","Futures","Staking","High Security"],
    signInUrl:"https://www.kraken.com/sign-in",
    signUpUrl:"https://www.kraken.com/sign-up",
    apiSupport:{
      label:"Kraken API", keyLabel:"API Key", secretLabel:"Private Key",
      docsUrl:"https://docs.kraken.com/api/",
      endpoint:"/api/broker/kraken",
    },
  },
  {
    id:"bybit", name:"Bybit", category:"crypto",
    logo:"BY", color:"#F7A600",
    desc:"Crypto derivatives & spot — low fees, deep liquidity",
    features:["Spot","Perps","Options","Copy Trading"],
    signInUrl:"https://www.bybit.com/en/login",
    signUpUrl:"https://www.bybit.com/en/register",
  },
  {
    id:"cryptocom", name:"Crypto.com", category:"crypto",
    logo:"🔷", color:"#002D74",
    desc:"All-in-one crypto app — exchange, card, DeFi, NFTs",
    features:["250+ Cryptos","Visa Card","Earn","DeFi"],
    signInUrl:"https://crypto.com/exchange/login",
    signUpUrl:"https://crypto.com/exchange/sign-up",
  },
  {
    id:"gemini", name:"Gemini", category:"crypto",
    logo:"♊", color:"#00DCFA",
    desc:"US-regulated, SOC 2 Type 2 — ActiveTrader for pros",
    features:["Regulated","ActiveTrader","Earn","Custody"],
    signInUrl:"https://exchange.gemini.com/signin",
    signUpUrl:"https://exchange.gemini.com/register",
  },

  /* ── Forex Brokers ──────────────────────────────────────── */
  {
    id:"oanda", name:"OANDA", category:"forex",
    logo:"O", color:"#E4002B",
    desc:"Industry-leading forex & CFD broker with REST API access",
    features:["70+ Pairs","CFDs","REST API","fxTrade"],
    signInUrl:"https://trade.oanda.com/",
    signUpUrl:"https://www.oanda.com/us-en/trading/open-live-account/",
    apiSupport:{
      label:"OANDA API", keyLabel:"API Access Token",
      docsUrl:"https://developer.oanda.com/rest-live-v20/introduction/",
      endpoint:"/api/broker/oanda",
    },
  },
  {
    id:"forexcom", name:"Forex.com", category:"forex",
    logo:"FX", color:"#00529B",
    desc:"Direct market access — 80+ forex pairs, metals, indices",
    features:["80+ Pairs","DMA","MT4/MT5","CFDs"],
    signInUrl:"https://www.forex.com/en-us/trading-platforms/",
    signUpUrl:"https://www.forex.com/en-us/account-types/",
  },
  {
    id:"ig", name:"IG Markets", category:"forex",
    logo:"IG", color:"#00B9A7",
    desc:"World's No.1 CFD provider — forex, indices, crypto, shares",
    features:["17,000+ Markets","CFDs","Spread Bets","API"],
    signInUrl:"https://www.ig.com/us/login",
    signUpUrl:"https://www.ig.com/us/trading-accounts/open-live-account",
  },
  {
    id:"pepperstone", name:"Pepperstone", category:"forex",
    logo:"P", color:"#006241",
    desc:"ECN forex broker — ultra-tight spreads, MT4/MT5/cTrader",
    features:["100+ Pairs","ECN","MT4/MT5","cTrader"],
    signInUrl:"https://secure.pepperstone.com/en/login",
    signUpUrl:"https://pepperstone.com/en/account-types/",
  },
  {
    id:"fxcm", name:"FXCM", category:"forex",
    logo:"FX", color:"#0047AB",
    desc:"Established forex & CFD broker with algorithmic trading tools",
    features:["Forex","CFDs","Trading Station","API"],
    signInUrl:"https://tradingstation.fxcm.com/",
    signUpUrl:"https://www.fxcm.com/markets/open-account/",
  },

  /* ── Prop Firms ──────────────────────────────────────────── */
  {
    id:"ftmo", name:"FTMO", category:"prop",
    logo:"F", color:"#26A65B",
    desc:"The world's leading funded trader program — up to $200K",
    features:["Forex + Futures","Up to $200K","90% split","Free trial"],
    signInUrl:"https://trader.ftmo.com/",
    signUpUrl:"https://ftmo.com/en/",
  },
  {
    id:"apex", name:"Apex Trader Funding", category:"prop",
    logo:"A", color:"#00D4AA",
    desc:"Funded futures trader — pass eval, keep up to 90%",
    features:["Futures","Up to $300K","90% split","No time limit"],
    signInUrl:"https://apextraderfunding.com/member/login",
    signUpUrl:"https://apextraderfunding.com/",
  },
  {
    id:"fundednext", name:"FundedNext", category:"prop",
    logo:"FN", color:"#8B5CF6",
    desc:"Forex & futures funded account — up to $4M",
    features:["Forex + Futures","Up to $4M","15% salary","No time limit"],
    signInUrl:"https://fundednext.com/dashboard",
    signUpUrl:"https://fundednext.com/",
  },
  {
    id:"topstep", name:"TopStep", category:"prop",
    logo:"⬆", color:"#0066CC",
    desc:"The original funded futures trader program",
    features:["Futures only","Up to $150K","90% split","Coaching"],
    signInUrl:"https://app.topstep.com/sign-in",
    signUpUrl:"https://www.topstep.com/",
  },
  {
    id:"tradeday", name:"TradeDay", category:"prop",
    logo:"TD", color:"#FF6B35",
    desc:"Affordable funded futures trading program",
    features:["Futures","Up to $200K","80% split","Low cost eval"],
    signInUrl:"https://my.tradeday.com/",
    signUpUrl:"https://tradeday.com/",
  },
  {
    id:"mff", name:"My Funded Futures", category:"prop",
    logo:"M", color:"#00B4D8",
    desc:"Same-day payouts, no daily loss limit",
    features:["Futures","Up to $150K","Same-day payouts"],
    signInUrl:"https://app.myfundedfutures.com/signin",
    signUpUrl:"https://www.myfundedfutures.com/",
  },
  {
    id:"e8", name:"E8 Markets", category:"prop",
    logo:"E8", color:"#FF4D6A",
    desc:"Instant funding option, 80% profit split, forex & futures",
    features:["Forex + Futures","Instant Funding","80% split"],
    signInUrl:"https://dashboard.e8markets.com/",
    signUpUrl:"https://e8markets.com/",
  },
  {
    id:"take", name:"Take Profit Trader", category:"prop",
    logo:"TP", color:"#06D6A0",
    desc:"Daily payouts, forgiving rules, up to $150K",
    features:["Futures","Daily payouts","Up to $150K"],
    signInUrl:"https://app.takeprofittrader.com/",
    signUpUrl:"https://takeprofittrader.com/",
  },
  {
    id:"thepit", name:"The Trading Pit", category:"prop",
    logo:"🎯", color:"#9333EA",
    desc:"EU-based prop firm — forex, indices, crypto",
    features:["Forex + Crypto","Indices","Up to $120K"],
    signInUrl:"https://app.thetradingpit.com/",
    signUpUrl:"https://thetradingpit.com/",
  },
];

const CATEGORY_TABS: { id: BrokerCategory; label: string; emoji: string }[] = [
  { id:"broker", label:"Brokerages",   emoji:"🏦" },
  { id:"crypto", label:"Crypto",       emoji:"₿" },
  { id:"forex",  label:"Forex",        emoji:"💱" },
  { id:"prop",   label:"Prop Firms",   emoji:"🚀" },
];

/* ── API Key Connection Modal ───────────────────────────── */
interface AccountInfo {
  balance?: string;
  equity?:  string;
  buying_power?: string;
  currency?: string;
  error?: string;
}

/**
 * A broker counts as connected only when its credentials were VERIFIED against
 * the broker API (we stamp `wm_broker_verified_<id>` on a successful handshake).
 * Requiring the verified marker — not just the presence of a key string — is
 * what clears the false "already connected" state: a typo'd/revoked key, or a
 * key left over from the old write-before-validate flow, no longer reads as
 * connected until it actually validates.
 */
function brokerConnected(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(`wm_broker_key_${id}`)
        && !!localStorage.getItem(`wm_broker_verified_${id}`);
  } catch { return false; }
}

function ApiConnectModal({ broker, onClose }: { broker: Broker; onClose: () => void }) {
  const api = broker.apiSupport!;
  const [key,    setKey]    = useState(() => localStorage.getItem(`wm_broker_key_${broker.id}`) ?? "");
  const [secret, setSecret] = useState(() => localStorage.getItem(`wm_broker_secret_${broker.id}`) ?? "");
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error,   setError]   = useState("");

  const isConnected = brokerConnected(broker.id);

  const connect = async () => {
    if (!key.trim()) { setError(`${api.keyLabel} is required`); return; }
    setLoading(true); setError(""); setAccount(null);
    try {
      // Validate the credentials with the broker FIRST. Nothing is persisted and
      // nothing reads as "connected" until the API confirms a real handshake.
      const res  = await fetch(api.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), secret: secret.trim() }),
      });
      const json = await res.json().catch(() => ({ error: "Bad response from broker" })) as AccountInfo;

      if (!res.ok || json.error) {
        // Failed validation — scrub any stale credentials so nothing lingers as
        // falsely "connected".
        localStorage.removeItem(`wm_broker_key_${broker.id}`);
        localStorage.removeItem(`wm_broker_secret_${broker.id}`);
        localStorage.removeItem(`wm_broker_verified_${broker.id}`);
        try {
          const allKeys = JSON.parse(localStorage.getItem("wm-broker-keys") ?? "{}") as Record<string, unknown>;
          delete allKeys[broker.id];
          localStorage.setItem("wm-broker-keys", JSON.stringify(allKeys));
        } catch {}
        setError(json.error || `Connection failed (HTTP ${res.status})`);
        setLoading(false);
        return;
      }

      // Verified — now (and only now) persist credentials + the verified marker.
      localStorage.setItem(`wm_broker_key_${broker.id}`, key.trim());
      if (secret.trim()) localStorage.setItem(`wm_broker_secret_${broker.id}`, secret.trim());
      localStorage.setItem(`wm_broker_verified_${broker.id}`, String(Date.now()));
      try {
        const allKeys = JSON.parse(localStorage.getItem("wm-broker-keys") ?? "{}") as Record<string, { key: string; secret: string }>;
        allKeys[broker.id] = { key: key.trim(), secret: secret.trim() };
        localStorage.setItem("wm-broker-keys", JSON.stringify(allKeys));
      } catch {}
      setAccount(json);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  const disconnect = () => {
    localStorage.removeItem(`wm_broker_key_${broker.id}`);
    localStorage.removeItem(`wm_broker_secret_${broker.id}`);
    localStorage.removeItem(`wm_broker_verified_${broker.id}`);
    try {
      const allKeys = JSON.parse(localStorage.getItem("wm-broker-keys") ?? "{}") as Record<string, unknown>;
      delete allKeys[broker.id];
      localStorage.setItem("wm-broker-keys", JSON.stringify(allKeys));
    } catch {}
    setKey(""); setSecret(""); setAccount(null);
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale:0.94, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94 }}
        className="w-full max-w-md rounded-2xl border border-wm-border overflow-hidden"
        style={{ background:"#0D1017" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wm-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background:`${broker.color}22`, color:broker.color, border:`1.5px solid ${broker.color}40` }}>
              {broker.logo}
            </div>
            <div>
              <div className="text-sm font-black text-white">Connect {broker.name}</div>
              <div className="text-[10px] text-wm-text-dim">{api.label}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-wm-text-dim hover:text-white p-1"><X size={15}/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Account info if connected */}
          {account && !account.error && (
            <div className="rounded-xl p-3 border border-wm-green/30 bg-wm-green/5">
              <div className="flex items-center gap-2 mb-2">
                <Check size={13} className="text-wm-green" />
                <span className="text-[12px] font-bold text-wm-green">Connected</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {account.balance && <div><span className="text-wm-text-dim">Balance</span><div className="font-bold text-white">{account.balance}</div></div>}
                {account.equity  && <div><span className="text-wm-text-dim">Equity</span><div className="font-bold text-white">{account.equity}</div></div>}
                {account.buying_power && <div><span className="text-wm-text-dim">Buying Power</span><div className="font-bold text-white">{account.buying_power}</div></div>}
                {account.currency && <div><span className="text-wm-text-dim">Currency</span><div className="font-bold text-white">{account.currency}</div></div>}
              </div>
            </div>
          )}

          {/* Key inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1.5">{api.keyLabel}</label>
              <input value={key} onChange={e => setKey(e.target.value)}
                type="password" placeholder={`Paste your ${api.keyLabel.toLowerCase()}…`}
                className="w-full px-3 py-2.5 rounded-xl text-[12px] text-white outline-none font-mono"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }} />
            </div>
            {api.secretLabel && (
              <div>
                <label className="block text-[10px] font-bold text-wm-text-dim uppercase tracking-wider mb-1.5">{api.secretLabel}</label>
                <input value={secret} onChange={e => setSecret(e.target.value)}
                  type="password" placeholder={`Paste your ${api.secretLabel.toLowerCase()}…`}
                  className="w-full px-3 py-2.5 rounded-xl text-[12px] text-white outline-none font-mono"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }} />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px] text-wm-red"
              style={{ background:"rgba(255,77,106,0.08)", border:"1px solid rgba(255,77,106,0.2)" }}>
              <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={connect} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[12px] transition-all disabled:opacity-60"
              style={{ background:`linear-gradient(135deg, ${broker.color}, ${broker.color}bb)`, color:"#000" }}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
              {loading ? "Connecting…" : "Connect Account"}
            </button>
            {isConnected && (
              <button onClick={disconnect}
                className="px-3 py-2.5 rounded-xl font-bold text-[12px] border border-wm-red/40 text-wm-red hover:bg-wm-red/10 transition-all">
                Disconnect
              </button>
            )}
          </div>

          <div className="flex items-start gap-2 text-[10px] text-wm-text-dim">
            <span className="mt-0.5">🔐</span>
            <span>Your API key is stored locally in your browser and sent securely to our proxy. We never store it on our servers. <a href={api.docsUrl} target="_blank" rel="noopener noreferrer" className="text-wm-green underline">Get your API key →</a></span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Broker Card ────────────────────────────────────────── */
function BrokerCard({ broker }: { broker: Broker }) {
  const [showApiModal, setShowApiModal] = useState(false);
  const isConnected = broker.apiSupport ? brokerConnected(broker.id) : false;

  return (
    <>
      <div
        className={clsx(
          "rounded-xl border bg-wm-card transition-all p-4",
          broker.apiSupport ? "cursor-pointer hover:border-opacity-80" : "hover:border-wm-border/80",
          isConnected ? "border-wm-green/40" : "border-wm-border"
        )}
        style={broker.apiSupport && isConnected ? { borderColor: "rgba(0,212,170,0.4)" } : undefined}
        onClick={() => { if (broker.apiSupport) setShowApiModal(true); }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background:`${broker.color}22`, border:`1.5px solid ${broker.color}50` }}>
              <span style={{ color:broker.color }}>{broker.logo}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-wm-text">{broker.name}</span>
                {isConnected && (
                  <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-wm-green/15 text-wm-green border border-wm-green/30">
                    <Check size={8} /> CONNECTED
                  </span>
                )}
              </div>
              <div className="text-[10px] text-wm-text-dim leading-snug max-w-[220px]">{broker.desc}</div>
            </div>
          </div>
          <span className={clsx(
            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
            broker.category === "prop"   ? "bg-wm-purple/15 text-wm-purple" :
            broker.category === "crypto" ? "bg-wm-yellow/15 text-wm-yellow" :
            broker.category === "forex"  ? "bg-wm-blue/15 text-wm-blue" :
            "bg-wm-blue/15 text-wm-blue"
          )}>
            {broker.category === "prop" ? "PROP FIRM" :
             broker.category === "crypto" ? "CRYPTO" :
             broker.category === "forex" ? "FOREX" : "BROKER"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {broker.features.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-wm-surface text-wm-text-muted border border-wm-border/50">{f}</span>
          ))}
        </div>

        {/* API-enabled broker: show prominent "Connect to Trade" CTA */}
        {broker.apiSupport ? (
          <div className="space-y-2">
            <button
              onClick={e => { e.stopPropagation(); setShowApiModal(true); }}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl font-bold text-[12px] transition-all"
              style={isConnected
                ? { background:"rgba(0,212,170,0.15)", color:"#00D4AA", border:"1px solid rgba(0,212,170,0.4)" }
                : { background:`linear-gradient(135deg,${broker.color}33,${broker.color}22)`, color:broker.color, border:`1px solid ${broker.color}50` }}
            >
              <Key size={12} />
              {isConnected ? "✓ Manage Connection" : `Connect ${broker.name} to Trade`}
            </button>
            <div className="flex gap-1.5">
              <a href={broker.signInUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110 text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border">
                <ExternalLink size={9} /> Platform
              </a>
              <a href={broker.apiSupport.docsUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110 text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border">
                <ExternalLink size={9} /> Get API Keys
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <a href={broker.signInUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold transition-all hover:brightness-110"
              style={{ background:`linear-gradient(135deg,${broker.color}33,${broker.color}22)`, color:broker.color, border:`1px solid ${broker.color}50` }}>
              <ExternalLink size={12} /> Connect {broker.name}
            </a>
            <div className="flex gap-1.5">
              <a href={broker.signInUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-semibold text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border transition-all hover:brightness-110">
                <ExternalLink size={9} /> Log In
              </a>
              <a href={broker.signUpUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-semibold text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border transition-all hover:brightness-110">
                <ExternalLink size={9} /> Open Account
              </a>
            </div>
            <div className="text-[9px] text-wm-text-dim leading-snug px-0.5">
              Opens {broker.name}&apos;s login. {broker.name} has no public API-key access — trade on their platform, or connect an API-key broker (Alpaca, Coinbase) to trade inside WealthyMindsets.
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showApiModal && <ApiConnectModal broker={broker} onClose={() => setShowApiModal(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ── Main Panel ─────────────────────────────────────────── */
export function BrokerConnectPanel({ onClose }: { onClose: () => void }) {
  const [tab,    setTab]    = useState<BrokerCategory>("broker");
  const [search, setSearch] = useState("");

  const shown = BROKERS.filter(b =>
    b.category === tab &&
    (b.name.toLowerCase().includes(search.toLowerCase()) ||
     b.desc.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x:500 }} animate={{ x:0 }} exit={{ x:500 }}
        transition={{ type:"spring", stiffness:280, damping:28 }}
        className="relative h-full flex flex-col border-l border-wm-border bg-wm-dark shadow-2xl"
        style={{ width:500 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wm-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-wm-gold" />
              <span className="font-black text-wm-text text-sm">Connect Accounts</span>
            </div>
            <div className="text-[10px] text-wm-text-dim mt-0.5">
              Brokers with API support can show live account data inside the app
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-wm-border shrink-0 space-y-2">
          <div className="grid grid-cols-4 gap-1">
            {CATEGORY_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx(
                  "py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  tab === t.id ? "bg-wm-blue/20 text-wm-blue border border-wm-blue/40" : "text-wm-text-muted border border-wm-border hover:text-wm-text"
                )}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2.5">
            <Search size={11} className="text-wm-text-dim shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search brokers…"
              className="flex-1 bg-transparent py-1.5 text-xs text-wm-text outline-none placeholder-wm-text-dim" />
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth:"thin" }}>
          {shown.length === 0 && (
            <div className="text-center py-12 text-wm-text-dim text-[12px]">No brokers found</div>
          )}
          {shown.map(b => <BrokerCard key={b.id} broker={b} />)}
        </div>

        <div className="px-4 py-3 border-t border-wm-border text-[10px] text-wm-text-dim text-center shrink-0">
          🔐 API keys are stored locally in your browser only — never on our servers.
        </div>
      </motion.div>
    </motion.div>
  );
}
