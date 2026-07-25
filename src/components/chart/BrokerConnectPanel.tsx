"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, ExternalLink, Plug2, Unplug, RefreshCw, TrendingUp, TrendingDown, ShoppingCart, AlertTriangle, CheckCircle } from "lucide-react";

interface Broker {
  id: string; name: string; logo: string; color: string;
  desc: string; url: string; tags: string[]; commissions: string;
}

const BROKERS: Broker[] = [
  { id:"alpaca",           name:"Alpaca",                    logo:"🦙", color:"#FFB347", desc:"Commission-free stocks & crypto API trading. Paper trading live in WM Pro.",           url:"https://app.alpaca.markets",                                          tags:["Stocks","Crypto","Paper"],                        commissions:"Commission-free" },
  { id:"tdameritrade",     name:"TD Ameritrade / thinkorswim",logo:"📊", color:"#00A651", desc:"Professional-grade platform with advanced charting and options tools.",               url:"https://www.tdameritrade.com/account-types/brokerage-account.html",   tags:["Stocks","Options","Futures","Forex"],              commissions:"$0 stocks, $0.65/contract options" },
  { id:"interactivebrokers",name:"Interactive Brokers",      logo:"🏦", color:"#CC0000", desc:"World-class platform for stocks, options, futures, forex, bonds and funds globally.", url:"https://www.interactivebrokers.com/en/trading/ibkr-pro.php",          tags:["Stocks","Options","Futures","Forex","Global"],     commissions:"$0–$0.005/share stocks" },
  { id:"tradestation",     name:"TradeStation",              logo:"⚡", color:"#E84040", desc:"Active trader focused broker with powerful analytics and strategy automation.",        url:"https://www.tradestation.com/accounts/open-an-account/",             tags:["Stocks","Options","Futures","Crypto"],             commissions:"$0 stocks, $1.50/contract futures" },
  { id:"tastytrade",       name:"tastytrade",                logo:"🌶️", color:"#FF6B35", desc:"Options and futures focused broker. Low fees, fast execution.",                       url:"https://open.tastytrade.com",                                         tags:["Options","Futures","Stocks","Crypto"],             commissions:"$0 stocks, $0.50/contract options, $1.25 futures" },
  { id:"schwab",           name:"Charles Schwab",            logo:"🏛️", color:"#0057B8", desc:"Full-service brokerage. Acquired TD Ameritrade — thinkorswim platform available.",   url:"https://www.schwab.com/open-an-account",                              tags:["Stocks","Options","ETFs","Mutual Funds"],          commissions:"Commission-free stocks & ETFs" },
  { id:"webull",           name:"Webull",                    logo:"📱", color:"#1A73E8", desc:"Commission-free trading with advanced charting for active traders.",                  url:"https://www.webull.com/activity",                                     tags:["Stocks","Options","Crypto","Paper"],               commissions:"Commission-free" },
  { id:"ninja",            name:"NinjaTrader",               logo:"🥷", color:"#8B5CF6", desc:"Industry-leading futures & forex trading platform with advanced order flow tools.",   url:"https://ninjatrader.com/futures-trading-account/",                    tags:["Futures","Forex","Options"],                      commissions:"$0.09/micro contract futures" },
  { id:"amp",              name:"AMP Futures",               logo:"⚡", color:"#F59E0B", desc:"Ultra-low commission futures broker. Supports all major futures platforms.",          url:"https://www.ampfutures.com/open-account/",                            tags:["Futures","Forex"],                                commissions:"$0.49/side micro, $1.29/side mini" },
  { id:"tradovate",        name:"Tradovate",                 logo:"🔄", color:"#06B6D4", desc:"Cloud-based futures trading with flat-rate monthly plans.",                          url:"https://trader.tradovate.com/welcome",                                tags:["Futures"],                                        commissions:"Flat rate $99/mo unlimited" },
];

const ASSET_FILTERS = ["All","Stocks","Options","Futures","Crypto","Forex","Paper"];

interface AlpacaAccount {
  buying_power: string; portfolio_value: string; cash: string;
  equity: string; day_trade_count: number; account_blocked: boolean;
  trading_blocked: boolean; pattern_day_trader: boolean;
}
interface AlpacaPosition {
  symbol: string; qty: string; avg_entry_price: string;
  market_value: string; unrealized_pl: string; unrealized_plpc: string; side: string;
}
interface AlpacaOrder {
  id: string; symbol: string; qty: string; side: string;
  order_type: string; status: string; filled_avg_price: string | null;
  created_at: string; limit_price: string | null;
}

interface Props { onClose: () => void; }

export function BrokerConnectPanel({ onClose }: Props) {
  const [filter,    setFilter]    = useState("All");
  const [connected, setConnected] = useState<string | null>(null);

  // Alpaca paper trading state
  const [alpacaLoading,   setAlpacaLoading]   = useState(false);
  const [alpacaAccount,   setAlpacaAccount]   = useState<AlpacaAccount | null>(null);
  const [alpacaPositions, setAlpacaPositions] = useState<AlpacaPosition[]>([]);
  const [alpacaOrders,    setAlpacaOrders]    = useState<AlpacaOrder[]>([]);
  const [alpacaError,     setAlpacaError]     = useState<string | null>(null);
  const [alpacaTab,       setAlpacaTab]       = useState<"account"|"positions"|"orders"|"trade">("account");

  // Trade form
  const [tradeSymbol, setTradeSymbol] = useState("AAPL");
  const [tradeSide,   setTradeSide]   = useState<"buy"|"sell">("buy");
  const [tradeQty,    setTradeQty]    = useState("1");
  const [tradeType,   setTradeType]   = useState<"market"|"limit">("market");
  const [tradeLimit,  setTradeLimit]  = useState("");
  const [tradeStatus, setTradeStatus] = useState<{ok: boolean; msg: string} | null>(null);
  const [tradeBusy,   setTradeBusy]   = useState(false);

  const fetchAlpacaData = useCallback(async () => {
    setAlpacaLoading(true);
    setAlpacaError(null);
    try {
      const [acct, pos, ord] = await Promise.all([
        fetch("/api/alpaca-trading?action=account").then(r => r.json()),
        fetch("/api/alpaca-trading?action=positions").then(r => r.json()),
        fetch("/api/alpaca-trading?action=orders&status=all").then(r => r.json()),
      ]);
      if (acct.error) throw new Error(acct.error);
      setAlpacaAccount(acct);
      setAlpacaPositions(Array.isArray(pos) ? pos : []);
      setAlpacaOrders(Array.isArray(ord) ? ord : []);
    } catch (e) {
      setAlpacaError(String(e));
    } finally {
      setAlpacaLoading(false);
    }
  }, []);

  const handleConnect = async (brokerId: string) => {
    if (connected === brokerId) {
      setConnected(null);
      setAlpacaAccount(null);
      return;
    }
    setConnected(brokerId);
    if (brokerId === "alpaca") await fetchAlpacaData();
  };

  const placeTrade = async () => {
    setTradeBusy(true);
    setTradeStatus(null);
    try {
      const body: Record<string, unknown> = {
        action:    "order",
        symbol:    tradeSymbol.toUpperCase(),
        qty:       tradeQty,
        side:      tradeSide,
        type:      tradeType,
        time_in_force: "gtc",
      };
      if (tradeType === "limit" && tradeLimit) body.limit_price = tradeLimit;
      const res  = await fetch("/api/alpaca-trading", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTradeStatus({ ok:true, msg:`Order placed: ${data.side?.toUpperCase()} ${data.qty} ${data.symbol} @ ${data.type}` });
      // Refresh orders
      const ord = await fetch("/api/alpaca-trading?action=orders&status=all").then(r => r.json());
      if (Array.isArray(ord)) setAlpacaOrders(ord);
    } catch (e) {
      setTradeStatus({ ok:false, msg:String(e) });
    } finally {
      setTradeBusy(false);
    }
  };

  const visible = BROKERS.filter(b => filter === "All" || b.tags.includes(filter));

  const fmt = (n: string | number) =>
    typeof n === "string" ? (+n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})
    : n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

  const plColor = (v: string) => +v >= 0 ? "#00D4AA" : "#FF4D6A";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#0D0E14",border:"1px solid #1E2030",borderRadius:12,width:820,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #1E2030",flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              {connected ? <Plug2 size={16} color="#00C076" /> : <Unplug size={16} color="#8B8FA8" />}
              <span style={{ fontSize:16,fontWeight:700,color:"#E2E8F0" }}>Connect a Broker</span>
              {connected === "alpaca" && alpacaAccount && (
                <span style={{ fontSize:10,color:"#00D4AA",background:"rgba(0,212,170,0.1)",padding:"2px 8px",borderRadius:4,border:"1px solid rgba(0,212,170,0.3)" }}>
                  PAPER TRADING LIVE
                </span>
              )}
            </div>
            <p style={{ fontSize:11,color:"#8B8FA8",marginTop:4 }}>
              {connected ? `Connected to ${BROKERS.find(b => b.id === connected)?.name}. Click disconnect to remove.`
                         : "Select a broker to open an account and connect live trading to your platform." }
            </p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#8B8FA8",padding:4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Alpaca paper trading dashboard — shown when connected */}
        {connected === "alpaca" && (
          <div style={{ borderBottom:"1px solid #1E2030",padding:"12px 20px",flexShrink:0 }}>
            {/* Tabs */}
            <div style={{ display:"flex",gap:6,marginBottom:12 }}>
              {(["account","positions","orders","trade"] as const).map(t => (
                <button key={t} onClick={() => setAlpacaTab(t)}
                  style={{ padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",border:"1px solid",
                    borderColor: alpacaTab===t ? "#FFB347" : "#1E2030",
                    background:  alpacaTab===t ? "rgba(255,179,71,0.12)" : "#131520",
                    color:       alpacaTab===t ? "#FFB347" : "#8B8FA8",
                    textTransform:"capitalize" }}>
                  {t}
                </button>
              ))}
              <button onClick={fetchAlpacaData} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#8B8FA8",padding:4 }}>
                <RefreshCw size={13} style={{ animation: alpacaLoading ? "spin 1s linear infinite" : "none" }} />
              </button>
            </div>

            {alpacaError && (
              <div style={{ padding:"8px 12px",background:"rgba(255,77,103,0.1)",border:"1px solid rgba(255,77,103,0.3)",borderRadius:6,fontSize:11,color:"#FF4D6A",marginBottom:8 }}>
                {alpacaError}
              </div>
            )}

            {alpacaLoading && !alpacaAccount && (
              <div style={{ textAlign:"center",color:"#8B8FA8",fontSize:11,padding:16 }}>Connecting to Alpaca paper account...</div>
            )}

            {/* Account tab */}
            {alpacaTab === "account" && alpacaAccount && (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
                {[
                  { l:"Portfolio Value",  v:"$"+fmt(alpacaAccount.portfolio_value), c:"#E2E8F0" },
                  { l:"Buying Power",     v:"$"+fmt(alpacaAccount.buying_power),    c:"#00D4AA" },
                  { l:"Cash",             v:"$"+fmt(alpacaAccount.cash),            c:"#E2E8F0" },
                  { l:"Day Trades",       v:String(alpacaAccount.day_trade_count),  c:"#F0B429" },
                ].map(item => (
                  <div key={item.l} style={{ background:"#131520",border:"1px solid #1E2030",borderRadius:8,padding:"10px 12px" }}>
                    <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>{item.l}</div>
                    <div style={{ fontSize:14,fontWeight:700,color:item.c,fontFamily:"monospace" }}>{item.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Positions tab */}
            {alpacaTab === "positions" && (
              <div style={{ maxHeight:200,overflowY:"auto" }}>
                {alpacaPositions.length === 0 ? (
                  <div style={{ textAlign:"center",color:"#8B8FA8",fontSize:11,padding:20 }}>No open positions in paper account</div>
                ) : (
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:10 }}>
                    <thead><tr style={{ borderBottom:"1px solid #1E2030" }}>
                      {["Symbol","Qty","Avg Entry","Mkt Value","P&L","P&L%"].map(h => (
                        <th key={h} style={{ padding:"4px 8px",textAlign:"left",color:"#8B8FA8",fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {alpacaPositions.map(p => (
                        <tr key={p.symbol} style={{ borderBottom:"1px solid #1E2030" }}>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontWeight:700 }}>{p.symbol}</td>
                          <td style={{ padding:"5px 8px",color:p.side==="long"?"#00D4AA":"#FF4D6A",fontFamily:"monospace" }}>{p.side==="long"?"+":"-"}{p.qty}</td>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontFamily:"monospace" }}>${fmt(p.avg_entry_price)}</td>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontFamily:"monospace" }}>${fmt(p.market_value)}</td>
                          <td style={{ padding:"5px 8px",color:plColor(p.unrealized_pl),fontFamily:"monospace" }}>${fmt(p.unrealized_pl)}</td>
                          <td style={{ padding:"5px 8px",color:plColor(p.unrealized_plpc),fontFamily:"monospace" }}>{(+p.unrealized_plpc*100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Orders tab */}
            {alpacaTab === "orders" && (
              <div style={{ maxHeight:200,overflowY:"auto" }}>
                {alpacaOrders.length === 0 ? (
                  <div style={{ textAlign:"center",color:"#8B8FA8",fontSize:11,padding:20 }}>No orders found</div>
                ) : (
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:10 }}>
                    <thead><tr style={{ borderBottom:"1px solid #1E2030" }}>
                      {["Symbol","Side","Qty","Type","Status","Fill Price","Time"].map(h => (
                        <th key={h} style={{ padding:"4px 8px",textAlign:"left",color:"#8B8FA8",fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {alpacaOrders.slice(0,20).map(o => (
                        <tr key={o.id} style={{ borderBottom:"1px solid #1E2030" }}>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontWeight:700 }}>{o.symbol}</td>
                          <td style={{ padding:"5px 8px",color:o.side==="buy"?"#00D4AA":"#FF4D6A",fontWeight:600,textTransform:"uppercase" }}>{o.side}</td>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontFamily:"monospace" }}>{o.qty}</td>
                          <td style={{ padding:"5px 8px",color:"#8B8FA8",textTransform:"capitalize" }}>{o.order_type}</td>
                          <td style={{ padding:"5px 8px",color:o.status==="filled"?"#00D4AA":o.status==="canceled"?"#FF4D6A":"#F0B429",textTransform:"capitalize" }}>{o.status}</td>
                          <td style={{ padding:"5px 8px",color:"#E2E8F0",fontFamily:"monospace" }}>{o.filled_avg_price ? "$"+fmt(o.filled_avg_price) : o.limit_price ? "$"+fmt(o.limit_price) : "—"}</td>
                          <td style={{ padding:"5px 8px",color:"#8B8FA8" }}>{new Date(o.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Trade tab */}
            {alpacaTab === "trade" && (
              <div style={{ display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>SYMBOL</div>
                  <input value={tradeSymbol} onChange={e => setTradeSymbol(e.target.value.toUpperCase())}
                    style={{ background:"#131520",border:"1px solid #1E2030",borderRadius:6,padding:"6px 10px",color:"#E2E8F0",fontSize:13,fontFamily:"monospace",width:90,outline:"none" }} />
                </div>
                <div>
                  <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>SIDE</div>
                  <div style={{ display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid #1E2030" }}>
                    <button onClick={() => setTradeSide("buy")} style={{ padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:tradeSide==="buy"?"rgba(0,212,170,0.2)":"#131520",color:tradeSide==="buy"?"#00D4AA":"#8B8FA8" }}>BUY</button>
                    <button onClick={() => setTradeSide("sell")} style={{ padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:tradeSide==="sell"?"rgba(255,77,103,0.2)":"#131520",color:tradeSide==="sell"?"#FF4D6A":"#8B8FA8" }}>SELL</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>QUANTITY</div>
                  <input type="number" min="1" value={tradeQty} onChange={e => setTradeQty(e.target.value)}
                    style={{ background:"#131520",border:"1px solid #1E2030",borderRadius:6,padding:"6px 10px",color:"#E2E8F0",fontSize:13,fontFamily:"monospace",width:80,outline:"none" }} />
                </div>
                <div>
                  <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>ORDER TYPE</div>
                  <select value={tradeType} onChange={e => setTradeType(e.target.value as "market"|"limit")}
                    style={{ background:"#131520",border:"1px solid #1E2030",borderRadius:6,padding:"6px 10px",color:"#E2E8F0",fontSize:11,outline:"none",cursor:"pointer" }}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
                {tradeType === "limit" && (
                  <div>
                    <div style={{ fontSize:9,color:"#8B8FA8",marginBottom:4 }}>LIMIT PRICE</div>
                    <input type="number" step="0.01" value={tradeLimit} onChange={e => setTradeLimit(e.target.value)}
                      placeholder="0.00"
                      style={{ background:"#131520",border:"1px solid #1E2030",borderRadius:6,padding:"6px 10px",color:"#E2E8F0",fontSize:13,fontFamily:"monospace",width:90,outline:"none" }} />
                  </div>
                )}
                <button onClick={placeTrade} disabled={tradeBusy}
                  style={{ padding:"8px 20px",borderRadius:6,fontSize:12,fontWeight:700,cursor:tradeBusy?"not-allowed":"pointer",border:"none",
                    background: tradeSide==="buy" ? "rgba(0,212,170,0.25)" : "rgba(255,77,103,0.25)",
                    color: tradeSide==="buy" ? "#00D4AA" : "#FF4D6A",
                    opacity: tradeBusy ? 0.6 : 1 }}>
                  {tradeBusy ? "Placing..." : `Place ${tradeSide.toUpperCase()} Order`}
                </button>
                {tradeStatus && (
                  <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:6,fontSize:11,
                    background: tradeStatus.ok ? "rgba(0,212,170,0.1)" : "rgba(255,77,103,0.1)",
                    color: tradeStatus.ok ? "#00D4AA" : "#FF4D6A",
                    border: `1px solid ${tradeStatus.ok ? "rgba(0,212,170,0.3)" : "rgba(255,77,103,0.3)"}` }}>
                    {tradeStatus.ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                    {tradeStatus.msg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display:"flex",gap:6,padding:"12px 20px 0",flexWrap:"wrap",flexShrink:0 }}>
          {ASSET_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",border:"1px solid",
                borderColor: filter===f ? "#FF8C00" : "#1E2030",
                background:  filter===f ? "rgba(255,140,0,0.12)" : "#131520",
                color:       filter===f ? "#FF8C00" : "#8B8FA8",
                transition:"all 0.15s" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Broker grid */}
        <div style={{ flex:1,overflowY:"auto",padding:"12px 20px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,scrollbarWidth:"thin" }}>
          {visible.map(broker => {
            const isConnected = connected === broker.id;
            const isAlpaca    = broker.id === "alpaca";
            return (
              <div key={broker.id} style={{
                background: isConnected ? "rgba(0,192,118,0.06)" : "#131520",
                border: `1px solid ${isConnected ? "#00C076" : "#1E2030"}`,
                borderRadius:8,padding:"14px 14px 12px",display:"flex",flexDirection:"column",gap:8,transition:"border-color 0.2s" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:32,height:32,borderRadius:8,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",background:`${broker.color}22`,flexShrink:0 }}>
                    {broker.logo}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#E2E8F0" }}>{broker.name}</div>
                    <div style={{ fontSize:9,color:"#00C076",fontFamily:"monospace" }}>{broker.commissions}</div>
                  </div>
                  {isConnected && <div style={{ width:8,height:8,borderRadius:"50%",background:"#00C076",flexShrink:0,boxShadow:"0 0 6px #00C076" }} />}
                </div>
                <p style={{ fontSize:10,color:"#8B8FA8",lineHeight:1.5,flex:1 }}>{broker.desc}</p>
                <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                  {broker.tags.map(t => (
                    <span key={t} style={{ fontSize:9,padding:"1px 6px",borderRadius:3,background:"#1E2030",color:"#8B8FA8" }}>{t}</span>
                  ))}
                  {isAlpaca && <span style={{ fontSize:9,padding:"1px 6px",borderRadius:3,background:"rgba(0,212,170,0.15)",color:"#00D4AA" }}>CONNECTED API</span>}
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <a href={broker.url} target="_blank" rel="noopener noreferrer"
                    style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px 0",borderRadius:5,fontSize:10,fontWeight:600,background:`${broker.color}22`,color:broker.color,border:`1px solid ${broker.color}44`,textDecoration:"none",cursor:"pointer",transition:"background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background=`${broker.color}44`)}
                    onMouseLeave={e => (e.currentTarget.style.background=`${broker.color}22`)}>
                    <ExternalLink size={9} /> Open Account
                  </a>
                  <button onClick={() => handleConnect(broker.id)}
                    style={{ flex:1,padding:"5px 0",borderRadius:5,fontSize:10,fontWeight:600,cursor:"pointer",border:"1px solid",transition:"all 0.15s",
                      borderColor: isConnected ? "#FF4D67" : "#00C076",
                      background:  isConnected ? "rgba(255,77,103,0.1)" : "rgba(0,192,118,0.1)",
                      color:       isConnected ? "#FF4D67" : "#00C076" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isConnected ? "rgba(255,77,103,0.2)" : "rgba(0,192,118,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isConnected ? "rgba(255,77,103,0.1)" : "rgba(0,192,118,0.1)"; }}>
                    {isConnected ? "Disconnect" : (isAlpaca ? "Connect (Paper)" : "Connect")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 20px",borderTop:"1px solid #1E2030",fontSize:10,color:"#4A5070",flexShrink:0 }}>
          Alpaca: paper trading fully live via API keys in .env.local — real prices, zero real money. Other brokers: click "Open Account" to sign up, then configure API keys to enable direct order routing.
        </div>
      </div>
    </div>
  );
}
