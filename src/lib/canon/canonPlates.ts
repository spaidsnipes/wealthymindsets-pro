/**
 * CANON PLATES — the Founder's on-glass plates by Drive id, for the Canon|Glass
 * station (Garden 18 §VII: "PANE A canon · PANE B serving /charts", kept open
 * the whole shift). Ids are the Drive files in the WM_NewMockup folder; the
 * station reads them through Drive's thumbnail endpoint with the viewer's own
 * Google sign-in. No image is copied into the repo.
 */
export interface CanonPlate {
  readonly key: string;
  readonly title: string;
  readonly driveId: string;
  /** The serving /charts query that shows the plate's invention. */
  readonly glass: string;
}

export const CANON_PLATES: readonly CanonPlate[] = [
  { key: "46", title: "46 · Order Flow Footprint Absorption", driveId: "13aMgHPmKmnOSy-VclO3LlhOaxG1-dykt", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=absorptionAnatomy" },
  { key: "64b", title: "64b · F01A Truth Owns Candle", driveId: "1iUlMIAvhyAqcBhwrg989HAAW6lrzxT9O", glass: "symbol=TSLA&tf=15m&scene=clean" },
  { key: "68", title: "68 · F03A Memory Ghost", driveId: "1F54-n1dRtjpf-S7tp1LFaSqOPV_t8AQ0", glass: "symbol=TSLA&tf=15m&scene=clean&on=MemoryGhost" },
  { key: "70", title: "70 · F04A Causal Marks", driveId: "1YvcQFYgtTpKKtPDnbHKGu26ON00MGToh", glass: "symbol=MNQ1!&tf=1m&scene=clean&on=fp:big-trades" },
  { key: "72", title: "72 · F05A Clarity Candle", driveId: "1t9AaC9QMN17VC2HrLwlLKJU53K5ASybM", glass: "symbol=TSLA&tf=15m&scene=clean&on=ClarityCandle" },
  { key: "73", title: "73 · F05B Candle Anatomy Inspect", driveId: "1Ln3XeK5yh3TmzIZBf9Tjpe-i9CDSN8mm", glass: "symbol=BTC-USD&tf=5m&scene=clean&select=bar" },
  { key: "74", title: "74 · F06A Order Flow On Price", driveId: "13a7zibBeVjjpQ1XVLNmEiArG9d2vMGXT", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=fp:bid-ask" },
  { key: "75", title: "75 · F06B Raw Tape Inspect", driveId: "1gBgckmx_6kV4oEsaFyrdc0OMMXoQh7an", glass: "symbol=BTC-USD&tf=1m&scene=clean&on=fp:big-trades&select=bigtrade" },
  { key: "76", title: "76 · F07A Big Trades On Market", driveId: "1D8JE_fjJLEGy0wytmVbTxvycg7f9StgB", glass: "symbol=BTC-USD&tf=1m&scene=clean&on=fp:big-trades" },
  { key: "77", title: "77 · F07B Cluster Response Inspect", driveId: "1HwbCw26UIwhxNl_NFC-pM6ZUcPWxCz6g", glass: "symbol=BTC-USD&tf=1m&scene=clean&on=fp:big-trades&select=bigtrade" },
  { key: "78", title: "78 · F08A Liquidity Lifecycle", driveId: "1I1ooq_KzYusbR_75BE8j097FB8lHs3yk", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=LiquidityLifecycle" },
  { key: "79", title: "79 · F08B Weather Lens", driveId: "1WHNTWLANBj5EG-emYiec7bl5RnbmwEQN", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=LiquidityWeather" },
  { key: "84", title: "84 · F11A Object On Chart", driveId: "1K3EBRxkbU3ZcDu3mHx7XqPN0iCaTBj9F", glass: "symbol=TSLA&tf=15m&scene=clean&select=zone" },
  { key: "92", title: "92 · F15A Regime State Lighting", driveId: "10EfBa2lsE-B7jmwXbDeL2ppnHuN7kM_j", glass: "symbol=TSLA&tf=15m&scene=clean&on=RegimeLighting" },
  { key: "94", title: "94 · F16A WAIT Finished State", driveId: "1aaW8wG4JNT-2vQ6kCKb45soMZFkkWeBg", glass: "symbol=TSLA&tf=15m&scene=clean" },
  { key: "96", title: "96 · F17A Risk On Price", driveId: "1TUDqO3s4jUNJmg1_iCYGx0Lolq5YDinj", glass: "symbol=TSLA&tf=15m&scene=clean&on=RiskOnPrice" },
  { key: "118", title: "118 · F12 Evidence Lineage", driveId: "1VgqZcnRJukVNfpzksCxW0amUTmMCSrdj", glass: "symbol=TSLA&tf=15m&scene=clean" },
  { key: "120", title: "120 · F03 Expected Envelope", driveId: "1q-Zq8s-BWVLZsrafUHsITVsZr2uKDDDE", glass: "symbol=TSLA&tf=15m&scene=clean&on=ExpectedEnvelope" },
  { key: "121", title: "121 · F09 Living Profile Passport", driveId: "16wY57O0xxnvRZvGUDJo4fmCEQCSb3d6F", glass: "symbol=TSLA&tf=15m&scene=clean&on=LivingProfile" },
  { key: "122", title: "122 · F17 Attention Governor", driveId: "1MFFyuyOW34aRzcbM11u0lwCLtgkDJPZ5", glass: "symbol=TSLA&tf=15m&scene=clean" },
  { key: "124", title: "124 · F14 Contradiction Not Averaged", driveId: "1SSFkfhOmdpY0Zkrw1FzRX1P25V00Ous2", glass: "symbol=TSLA&tf=15m&scene=clean&on=Contradiction" },
  { key: "126", title: "126 · F14 Heat Lands Same Camera", driveId: "1HwDB-fO6m80foC0g4Wu_ZEzOzfp-NXEg", glass: "symbol=TSLA&tf=15m&scene=clean" },
  { key: "128", title: "128 · F13 Semantic Zoom Micro", driveId: "1FLMxPP7u0ovebevyM9VSYL05dI-UpJ0l", glass: "symbol=BTC-USD&tf=1m&scene=clean&bars=30" },
  { key: "26", title: "26 · Living Profile", driveId: "1YOm1PzjBhAwZRtFbSwne5ZT1Zb6b5DqQ", glass: "symbol=TSLA&tf=15m&scene=clean&on=LivingProfile" },
  { key: "47", title: "47 · TSLA Volume Profile Full", driveId: "1qgIGDeaE6Dj7IROndD9zeFqIZiMRdx3G", glass: "symbol=TSLA&tf=15m&scene=clean&on=sessionVP" },
  { key: "UI06", title: "UI_06 · Absorption Anatomy", driveId: "1GzBr-HmbpdKC3aQVl1nBbUEt2yFMYK5R", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=absorptionAnatomy" },
  { key: "G06", title: "G06 · Absorption vs Exhaustion bodies", driveId: "1MBgj6g0rbtahLTdNS-5PtkGGaTWIZjeF", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=absorptionAnatomy" },
  { key: "G03", title: "G03 · Weather Is A Lens", driveId: "1sCdtzEDmNUOn7sy9srbOb_D1A92Ag2zg", glass: "symbol=BTC-USD&tf=5m&scene=clean&on=LiquidityWeather" },
  { key: "G04", title: "G04 · Big Trade On Price", driveId: "1tl_-mGGeMvukYPy8Fs9n8-0QUAMHewV6", glass: "symbol=BTC-USD&tf=1m&scene=clean&on=fp:big-trades" },
];

export function canonPlate(key: string | null | undefined): CanonPlate {
  return CANON_PLATES.find(p => p.key === key) ?? CANON_PLATES.find(p => p.key === "72")!;
}

export function plateImageUrl(p: CanonPlate): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(p.driveId)}&sz=w1600`;
}

/** The serving glass for the right pane: always /charts, never another origin. */
export function glassHref(query: string): string {
  const q = query.replace(/^[?/]+/, "").replace(/^charts\??/, "");
  return `/charts?${q}`;
}
