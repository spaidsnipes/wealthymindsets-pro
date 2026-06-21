"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ── Deployed contract info ─────────────────────────────────── */
export const WMS_CONTRACT = {
  // Paste your deployed contract address here once you have it from Remix
  address:     "0xFdC6FAcabEeca691aB20Fd751E1a6bFF428f95d3",
  network:     "Base Mainnet",
  chainId:     8453,
  symbol:      "WM$",
  name:        "Wealthy Mindsets",
  decimals:    18,
  totalSupply: "1,000,000,000",
  maxSupply:   "2,000,000,000",
  blockscout:  "https://base.blockscout.com/token/0xFdC6FAcabEeca691aB20Fd751E1a6bFF428f95d3",
  basescan:    "https://basescan.org/token/0xFdC6FAcabEeca691aB20Fd751E1a6bFF428f95d3",
};

interface CreatorCoin {
  name: string;
  symbol: string;
  supply: number;
  feeRate: number; // bps
  category: string;
  deployedAt: string;
  logoColor: string;
}

interface WMSContextValue {
  wmsBalance: number;
  creatorCoin: CreatorCoin | null;
  earnWMS: (amount: number, reason: string) => void;
  spendWMS: (amount: number) => boolean;
  launchCreatorCoin: (coin: Omit<CreatorCoin, "deployedAt" | "logoColor">) => void;
  recentEarnings: { amount: number; reason: string; ts: number }[];
  totalEarned: number;
  isDeployed: boolean;
  contractAddress: string;
}

const WMSContext = createContext<WMSContextValue | null>(null);

const LS_KEY = "wm_token_state";
const LOGO_COLORS = ["#00D4AA","#F0B429","#7C3AED","#EF4444","#3B82F6","#EC4899","#10B981"];

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function WMSProvider({ children }: { children: React.ReactNode }) {
  const [wmsBalance, setWmsBalance]     = useState(0);
  const [totalEarned, setTotalEarned]   = useState(0);
  const [creatorCoin, setCreatorCoin]   = useState<CreatorCoin | null>(null);
  const [recentEarnings, setRecentEarnings] = useState<{ amount: number; reason: string; ts: number }[]>([]);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setWmsBalance(s.balance  ?? 0);
      setTotalEarned(s.totalEarned ?? 0);
      setCreatorCoin(s.creatorCoin ?? null);
      setRecentEarnings(s.recentEarnings ?? []);
    } else {
      // Give 1000 WM$ welcome bonus on first load
      setWmsBalance(1000);
      setTotalEarned(1000);
      setRecentEarnings([{ amount: 1000, reason: "🎉 Welcome bonus", ts: Date.now() }]);
    }
  }, []);

  const persist = useCallback((bal: number, earned: number, coin: CreatorCoin | null, earnings: typeof recentEarnings) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ balance: bal, totalEarned: earned, creatorCoin: coin, recentEarnings: earnings }));
    } catch {}
  }, []);

  const earnWMS = useCallback((amount: number, reason: string) => {
    setWmsBalance(b => {
      const next = b + amount;
      setTotalEarned(e => {
        const nextE = e + amount;
        setRecentEarnings(prev => {
          const nextR = [{ amount, reason, ts: Date.now() }, ...prev].slice(0, 20);
          setCreatorCoin(c => { persist(next, nextE, c, nextR); return c; });
          return nextR;
        });
        return nextE;
      });
      return next;
    });
  }, [persist]);

  const spendWMS = useCallback((amount: number): boolean => {
    let success = false;
    setWmsBalance(b => {
      if (b >= amount) { success = true; return b - amount; }
      return b;
    });
    return success;
  }, []);

  const launchCreatorCoin = useCallback((coin: Omit<CreatorCoin, "deployedAt" | "logoColor">) => {
    const full: CreatorCoin = {
      ...coin,
      deployedAt: new Date().toISOString(),
      logoColor: LOGO_COLORS[Math.floor(Math.random() * LOGO_COLORS.length)],
    };
    setCreatorCoin(full);
    persist(wmsBalance, totalEarned, full, recentEarnings);
  }, [wmsBalance, totalEarned, recentEarnings, persist]);

  return (
    <WMSContext.Provider value={{
      wmsBalance, creatorCoin, earnWMS, spendWMS,
      launchCreatorCoin, recentEarnings, totalEarned,
      isDeployed: WMS_CONTRACT.address !== "PENDING",
      contractAddress: WMS_CONTRACT.address,
    }}>
      {children}
    </WMSContext.Provider>
  );
}

export function useWMS() {
  const ctx = useContext(WMSContext);
  if (!ctx) throw new Error("useWMS must be inside WMSProvider");
  return ctx;
}
