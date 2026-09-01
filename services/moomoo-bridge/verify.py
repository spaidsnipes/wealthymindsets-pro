#!/usr/bin/env python3
"""
moomoo wire verifier — proves the full connection chain end-to-end.

Chain:  this script  ──socket──▶  OpenD (127.0.0.1:11111)  ──▶  moomoo servers

Run:    python3 verify.py            # snapshot for the default symbols
        python3 verify.py US.AAPL HK.00700

What it proves, in order, with an honest verdict at each hop:
  1. moomoo-api Python SDK importable            (installed by `pip install moomoo-api`)
  2. OpenD reachable on the gateway host/port    (OpenD must be RUNNING + logged in)
  3. A real, non-fabricated market snapshot pull (live truth from the exchange)
  4. A real TICKER subscription + get_rt_ticker   (the executed-print stream — the
     Monday Test 2 P0 capability; QUOTE SNAPSHOT != TICKS)

It NEVER prints a fake price. If any hop fails it says exactly which one and how
to fix it, then exits non-zero. This is the ATH/WOW "no fabrication" rule applied
to connectivity: an unproven wire must report UNPROVEN, never a hopeful stub.

Hop 4 is deliberately distinct from hop 3: a passing snapshot does NOT prove the
tick stream. Executed prints require a TICKER subscription and get_rt_ticker, and
outside market hours the subscription can succeed while zero prints exist — that
is reported honestly as NO EXECUTED PRINTS YET (a truthful edge, not a failure of
the wire and not a fabricated tick).
"""
from __future__ import annotations

import os
import sys

HOST = os.environ.get("MOOMOO_OPEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("MOOMOO_OPEND_PORT", "11111"))
DEFAULT_SYMBOLS = ["US.AAPL", "US.SPY"]


def _fail(hop: str, detail: str, fix: str) -> "None":
    print(f"\n❌ UNPROVEN at hop: {hop}")
    print(f"   why : {detail}")
    print(f"   fix : {fix}\n")
    sys.exit(1)


def main() -> None:
    symbols = sys.argv[1:] or DEFAULT_SYMBOLS
    print(f"moomoo wire verifier → OpenD {HOST}:{PORT} → symbols {symbols}")

    # ── Hop 1: SDK importable ────────────────────────────────────────────────
    try:
        import moomoo as ft
    except Exception as e:  # noqa: BLE001 - surface the real import error
        _fail(
            "1/4 SDK import",
            f"cannot import moomoo: {e}",
            "run `pip install moomoo-api` in this Python environment",
        )
    print(f"✅ 1/4 SDK import      — moomoo-api {getattr(ft, '__version__', '?')}")

    # ── Pre-flight: is anything LISTENING on the gateway port? ───────────────
    # The SDK's OpenQuoteContext spawns a background reconnect loop that blocks
    # for minutes when OpenD is down. A 3s socket probe fails fast and honestly
    # instead of hanging, so the operator gets an actionable verdict immediately.
    import socket

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.settimeout(3)
    reachable = probe.connect_ex((HOST, PORT)) == 0
    probe.close()
    if not reachable:
        _fail(
            "2/4 OpenD reachable",
            f"nothing is listening on {HOST}:{PORT} (connection refused)",
            "OpenD is not running. Install + start it, then log in:\n"
            "         see services/moomoo-bridge/README.md §Run OpenD",
        )

    # ── Hop 2+3: OpenD reachable and serving real data ───────────────────────
    ctx = None
    try:
        try:
            ctx = ft.OpenQuoteContext(host=HOST, port=PORT)
        except Exception as e:  # noqa: BLE001
            _fail(
                "2/4 OpenD reachable",
                f"could not open a quote context to {HOST}:{PORT} ({e})",
                "start OpenD and log in — see services/moomoo-bridge/README.md §Run OpenD",
            )
        print(f"✅ 2/4 OpenD reachable — quote context opened on {HOST}:{PORT}")

        ret, data = ctx.get_market_snapshot(symbols)
        if ret != ft.RET_OK:
            # RET_ERROR here is almost always: OpenD not logged in, or no quote
            # permission for the requested market. Surface the gateway's own words.
            _fail(
                "3/4 live snapshot",
                f"OpenD returned an error for {symbols}: {data}",
                "confirm OpenD is LOGGED IN and your account has quote permission "
                "for those markets (US real-time may need a subscription; try US.AAPL)",
            )

        print(f"✅ 3/4 live snapshot   — {len(data)} row(s) of REAL exchange data:\n")
        cols = [c for c in ("code", "last_price", "prev_close_price",
                            "update_time", "sec_status") if c in data.columns]
        # Print as a compact honest table — these are live values, not stubs.
        print(data[cols].to_string(index=False))

        # ── Hop 4: TICKER subscription + get_rt_ticker (executed prints) ─────
        # This is the Monday Test 2 P0 capability the snapshot does NOT prove.
        # A snapshot is one last-price row; a tick is an executed print with
        # provider time/price/size/sequence/direction. We verify the FIRST
        # symbol only to keep the subscription quota small.
        tick_symbol = symbols[0]
        print(f"\n… 4/4 executed prints — subscribing TICKER for {tick_symbol} …")
        sub_ret, sub_data = ctx.subscribe([tick_symbol], [ft.SubType.TICKER])
        if sub_ret != ft.RET_OK:
            _fail(
                "4/4 TICKER subscribe",
                f"TICKER subscribe failed for {tick_symbol}: {sub_data}",
                "confirm the account has tick/level data permission for that market; "
                "US executed prints may require a real-time subscription (try US.AAPL)",
            )

        ret, ticks = ctx.get_rt_ticker(tick_symbol, 10)
        if ret != ft.RET_OK:
            _fail(
                "4/4 get_rt_ticker",
                f"get_rt_ticker({tick_symbol}) returned an error: {ticks}",
                "the TICKER subscription exists but the print pull failed — surface "
                "OpenD's message above; verify market-data entitlement for that market",
            )

        if len(ticks) == 0:
            # Truthful edge, NOT a wire failure and NOT a fabricated tick: the
            # subscription is live but no executed print has arrived yet (common
            # outside RTH). Report it honestly and exit 0 — the tick PATH is
            # proven reachable; prints will flow when the market trades.
            print(
                "🟡 4/4 executed prints — TICKER subscribed, but 0 executed prints "
                f"available for {tick_symbol} right now (NO EXECUTED PRINTS YET — "
                "likely outside market hours). The tick path is reachable; this is a "
                "truthful edge, not a fabricated tick."
            )
            print("\n🟢 SNAPSHOT WIRE PROVEN. Tick path reachable — re-run during RTH for a live print.")
        else:
            tcols = [c for c in ("code", "time", "price", "volume", "turnover",
                                 "ticker_direction", "sequence", "type") if c in ticks.columns]
            print(f"✅ 4/4 executed prints — {len(ticks)} REAL provider print(s):\n")
            print(ticks[tcols].to_string(index=False))
            print("\n🟢 WIRE PROVEN — moomoo snapshot AND executed-print tick stream are live end-to-end.")
    finally:
        if ctx is not None:
            ctx.close()


if __name__ == "__main__":
    main()
