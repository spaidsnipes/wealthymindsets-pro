#!/usr/bin/env python3
"""
moomoo-bridge — the persistent-host shim between the WM Pro Worker and OpenD.

WHY THIS EXISTS
---------------
The WM Pro app runs on Cloudflare Workers (serverless). moomoo's SDK talks to a
local OpenD gateway over a long-lived TCP socket on 127.0.0.1:11111. A Worker
cannot hold that socket, cannot run OpenD, and cannot log in with the trade-unlock
password. So the moomoo wire needs exactly one long-running process on a host that
CAN — this bridge. Same architectural class as the documented tape-feed constraint
(free serverless can't host a persistent broker socket).

    WM Worker  ──HTTPS(+shared secret)──▶  THIS bridge  ──socket──▶  OpenD  ──▶  moomoo

WHAT IT EXPOSES (read-only in this version — no order placement over HTTP)
    GET /health            → { ok, opend_reachable, sdk_version }   (no secrets, ever)
    GET /quote?symbols=US.AAPL,US.SPY
                           → { ok, quotes:[{code,last,prev_close,update_time,status}] }

SECURITY
    · Set MOOMOO_BRIDGE_TOKEN; every request must send `Authorization: Bearer <token>`.
      Health is the only unauthenticated route (liveness probe), and it returns no data.
    · Bind to 127.0.0.1 by default. Expose to the Worker only through an authenticated
      tunnel (cloudflared / tailscale), never a raw public port.
    · The bridge NEVER returns a fabricated quote. Upstream error → HTTP 502 with the
      gateway's own message. Truthful-or-nothing.

RUN
    pip install moomoo-api
    # start + log into OpenD first (see README §Run OpenD), then:
    MOOMOO_BRIDGE_TOKEN=$(openssl rand -hex 24) python3 bridge.py
"""
from __future__ import annotations

import json
import os
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

OPEND_HOST = os.environ.get("MOOMOO_OPEND_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_OPEND_PORT", "11111"))
BIND_HOST = os.environ.get("MOOMOO_BRIDGE_HOST", "127.0.0.1")
BIND_PORT = int(os.environ.get("MOOMOO_BRIDGE_PORT", "8790"))
TOKEN = os.environ.get("MOOMOO_BRIDGE_TOKEN", "")


def opend_reachable() -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        return s.connect_ex((OPEND_HOST, OPEND_PORT)) == 0
    finally:
        s.close()


def sdk_version() -> str:
    try:
        import moomoo as ft
        return getattr(ft, "__version__", "?")
    except Exception:  # noqa: BLE001
        return "not-installed"


def fetch_quotes(symbols: list[str]) -> tuple[bool, object]:
    """Return (ok, payload). Never fabricates — an error propagates verbatim."""
    if not opend_reachable():
        return False, f"OpenD not reachable on {OPEND_HOST}:{OPEND_PORT}"
    import moomoo as ft

    ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
    try:
        ret, data = ctx.get_market_snapshot(symbols)
        if ret != ft.RET_OK:
            return False, str(data)
        rows = []
        for _, r in data.iterrows():
            rows.append({
                "code": r.get("code"),
                "last": r.get("last_price"),
                "prev_close": r.get("prev_close_price"),
                "update_time": r.get("update_time"),
                "status": r.get("sec_status"),
            })
        return True, rows
    finally:
        ctx.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "moomoo-bridge/1.0"

    def _send(self, code: int, obj: object) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authed(self) -> bool:
        if not TOKEN:
            return True  # no token configured → dev mode (README warns against prod)
        return self.headers.get("Authorization", "") == f"Bearer {TOKEN}"

    def do_GET(self) -> None:  # noqa: N802 - stdlib signature
        route = urlparse(self.path)
        if route.path == "/health":
            self._send(200, {
                "ok": True,
                "opend_reachable": opend_reachable(),
                "sdk_version": sdk_version(),
            })
            return
        if not self._authed():
            self._send(401, {"ok": False, "error": "missing or bad bearer token"})
            return
        if route.path == "/quote":
            symbols = [s for s in (parse_qs(route.query).get("symbols", [""])[0]).split(",") if s]
            if not symbols:
                self._send(400, {"ok": False, "error": "pass ?symbols=US.AAPL,US.SPY"})
                return
            ok, payload = fetch_quotes(symbols)
            self._send(200 if ok else 502, {"ok": ok, "quotes" if ok else "error": payload})
            return
        self._send(404, {"ok": False, "error": f"no route {route.path}"})

    def log_message(self, *_args) -> None:  # keep stdout clean; no request logging
        return


def main() -> None:
    if not TOKEN:
        print("⚠  MOOMOO_BRIDGE_TOKEN is empty — running UNAUTHENTICATED (dev only).")
    print(f"moomoo-bridge → OpenD {OPEND_HOST}:{OPEND_PORT} | listening on {BIND_HOST}:{BIND_PORT}")
    print(f"   OpenD reachable now: {opend_reachable()} | SDK: {sdk_version()}")
    ThreadingHTTPServer((BIND_HOST, BIND_PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
