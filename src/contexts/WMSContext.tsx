"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

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
  recentEarnings: { amount: number; reason: string; ts: number }[];
  totalEarned: number;
  isDeployed: boolean;
  contractAddress: string;
}

const WMSContext = createContext<WMSContextValue | null>(null);

const LS_KEY = "wm_token_state";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // v1 awarded fabricated token balances and allowed local-only "coin
    // launches". Do not migrate those values into the honest local-points model.
    return parsed?.version === 2 ? parsed : null;
  } catch { return null; }
}

/**
 * clearWMSState — hard reset of the browser-local WM points / creator-coin
 * store. Called on sign-out to prevent cross-owner points balance leak
 * on shared browsers. Never throws; safe to call from auth flow.
 */
export function clearWMSState(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

export function WMSProvider({ children }: { children: React.ReactNode }) {
  const [wmsBalance, setWmsBalance]     = useState(0);
  const [totalEarned, setTotalEarned]   = useState(0);
  const [creatorCoin, setCreatorCoin]   = useState<CreatorCoin | null>(null);
  const [recentEarnings, setRecentEarnings] = useState<{ amount: number; reason: string; ts: number }[]>([]);

  // Live mirrors of the ledger. earnWMS/spendWMS must read and write the
  // balance WITHOUT doing so from inside a setState updater — React requires
  // updaters to be pure and may replay them, which on a currency ledger means
  // crediting or debiting twice.
  const balanceRef = useRef(0);
  const totalEarnedRef = useRef(0);
  const creatorCoinRef = useRef<CreatorCoin | null>(null);
  const recentEarningsRef = useRef<{ amount: number; reason: string; ts: number }[]>([]);
  useEffect(() => { balanceRef.current = wmsBalance; }, [wmsBalance]);
  useEffect(() => { totalEarnedRef.current = totalEarned; }, [totalEarned]);
  useEffect(() => { creatorCoinRef.current = creatorCoin; }, [creatorCoin]);
  useEffect(() => { recentEarningsRef.current = recentEarnings; }, [recentEarnings]);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setWmsBalance(s.balance  ?? 0);
      setTotalEarned(s.totalEarned ?? 0);
      setCreatorCoin(s.creatorCoin ?? null);
      setRecentEarnings(s.recentEarnings ?? []);
      // Seed the refs synchronously — an earn/spend firing before the mirroring
      // effects run must not compute from a zero balance and wipe the ledger.
      balanceRef.current = s.balance ?? 0;
      totalEarnedRef.current = s.totalEarned ?? 0;
      creatorCoinRef.current = s.creatorCoin ?? null;
      recentEarningsRef.current = s.recentEarnings ?? [];
    }
  }, []);

  const persist = useCallback((bal: number, earned: number, coin: CreatorCoin | null, earnings: typeof recentEarnings) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ version: 2, balance: bal, totalEarned: earned, creatorCoin: coin, recentEarnings: earnings }));
    } catch {}
  }, []);

  const earnWMS = useCallback((amount: number, reason: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    // Previously four setState updaters were nested inside one another, with a
    // localStorage write in the innermost. React requires updaters to be pure
    // and may invoke them more than once (StrictMode does so deliberately;
    // concurrent rendering can discard and replay a render). On a currency
    // ledger a replay credits the balance and totalEarned twice and duplicates
    // the earnings entry — the user is paid for the same action repeatedly.
    //
    // Compute from refs, then apply flat pure updates and persist once.
    const nextBalance = balanceRef.current + amount;
    const nextEarned = totalEarnedRef.current + amount;
    const nextRecent = [{ amount, reason, ts: Date.now() }, ...recentEarningsRef.current].slice(0, 20);

    balanceRef.current = nextBalance;
    totalEarnedRef.current = nextEarned;
    recentEarningsRef.current = nextRecent;

    setWmsBalance(nextBalance);
    setTotalEarned(nextEarned);
    setRecentEarnings(nextRecent);
    persist(nextBalance, nextEarned, creatorCoinRef.current, nextRecent);
  }, [persist]);

  const spendWMS = useCallback((amount: number): boolean => {
    // The old shape set `success` from inside the setState updater and then
    // returned it synchronously. React does not run updaters at call time, so
    // the flag was read BEFORE it was ever assigned — spendWMS reported failure
    // even when it debited the balance. It has no callers yet, so this was a
    // latent trap rather than an observed loss, but the first caller would have
    // seen points deducted and the purchase reported as failed.
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (balanceRef.current < amount) return false;

    const nextBalance = balanceRef.current - amount;
    balanceRef.current = nextBalance;
    setWmsBalance(nextBalance);
    persist(nextBalance, totalEarnedRef.current, creatorCoinRef.current, recentEarningsRef.current);
    return true;
  }, [persist]);

  /*
   * launchCreatorCoin was REMOVED on 2026-09-03.
   *
   * It took a name and a symbol and wrote a CreatorCoin carrying
   * `deployedAt: new Date().toISOString()` straight into local storage. No
   * wallet, no signed transaction, no chain receipt — a deployment record
   * manufactured from a form. `loadState` above already calls this out: v1
   * "allowed local-only coin launches" and refuses to migrate them. That
   * migration gate cleaned up the records the function produced while leaving
   * the function itself in place to produce more.
   *
   * Its only caller was an unreachable form on /profile, removed in the same
   * commit. There is no honest version of this function without a wallet
   * connection and a confirmed on-chain receipt, so it is deleted rather than
   * disabled — a disabled fabricator is one edit away from being a fabricator.
   *
   * The surface it fed already tells the truth and still does: "Creator Coin
   * Deployment Not Connected … This app does not deploy one yet."
   *
   * Sentinel: src/lib/creatorCoinFabricationLock.test.ts
   */

  return (
    <WMSContext.Provider value={{
      wmsBalance, creatorCoin, earnWMS, spendWMS,
      recentEarnings, totalEarned,
      // A configured address alone does not prove contract identity, ownership,
      // token metadata, or wallet balance integration.
      isDeployed: false,
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
