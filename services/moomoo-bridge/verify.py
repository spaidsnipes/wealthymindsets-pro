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

It NEVER prints a fake price. If any hop fails it says exactly which one and how
to fix it, then exits non-zero. This is the ATH/WOW "no fabrication" rule applied
to connectivity: an unproven wire must report UNPROVEN, never a hopeful stub.
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
            "1/3 SDK import",
            f"cannot import moomoo: {e}",
            "run `pip install moomoo-api` in this Python environment",
        )
    print(f"✅ 1/3 SDK import      — moomoo-api {getattr(ft, '__version__', '?')}")

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
            "2/3 OpenD reachable",
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
                "2/3 OpenD reachable",
                f"could not open a quote context to {HOST}:{PORT} ({e})",
                "start OpenD and log in — see services/moomoo-bridge/README.md §Run OpenD",
            )
        print(f"✅ 2/3 OpenD reachable — quote context opened on {HOST}:{PORT}")

        ret, data = ctx.get_market_snapshot(symbols)
        if ret != ft.RET_OK:
            # RET_ERROR here is almost always: OpenD not logged in, or no quote
            # permission for the requested market. Surface the gateway's own words.
            _fail(
                "3/3 live snapshot",
                f"OpenD returned an error for {symbols}: {data}",
                "confirm OpenD is LOGGED IN and your account has quote permission "
                "for those markets (US real-time may need a subscription; try US.AAPL)",
            )

        print(f"✅ 3/3 live snapshot   — {len(data)} row(s) of REAL exchange data:\n")
        cols = [c for c in ("code", "last_price", "prev_close_price",
                            "update_time", "sec_status") if c in data.columns]
        # Print as a compact honest table — these are live values, not stubs.
        print(data[cols].to_string(index=False))
        print("\n🟢 WIRE PROVEN — moomoo is connected end-to-end.")
    finally:
        if ctx is not None:
            ctx.close()


if __name__ == "__main__":
    main()
