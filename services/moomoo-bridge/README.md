# moomoo-bridge

The one long-running process that connects WM Pro to **moomoo**. It exists because
the WM app runs on **Cloudflare Workers** (serverless) and moomoo's SDK needs a
persistent local socket to the **OpenD** gateway — which a Worker cannot hold, run,
or log into.

```
WM Worker  ──HTTPS(Bearer)──▶  moomoo-bridge  ──socket 11111──▶  OpenD  ──▶  moomoo
 (adapter)                     (this service)                    (gateway) (servers)
```

The app side is `src/lib/broker/adapters/moomooAdapter.ts` (canonical `BrokerAdapter`).
This service is what its `MOOMOO_BRIDGE_URL` points at.

---

## Status of the wire (2026-08-24)

| Hop | State | Proof |
|-----|-------|-------|
| Python SDK (`moomoo-api`) | ✅ installed & imports (Py 3.14) | `verify.py` hop 1 |
| Bridge HTTP service | ✅ builds, serves `/health` + `/quote`, auth-gated, no fabrication | `curl /health` |
| **OpenD gateway** | ⛔ **not installed** — the one remaining step | `verify.py` hop 2 = UNPROVEN |
| Live snapshot | ⏳ blocked on OpenD | `verify.py` hop 3 |

**You (Founder) do the OpenD step** — it requires your moomoo login + trade-unlock
password, which I must never enter.

---

## Run OpenD (the missing piece)

1. From the moomoo OpenAPI download page (the tab already open), open the
   **"Moomoo OpenD"** tab (not "Moomoo API SDK") and download **OpenD for macOS**.
   The `.7z` you already have (`MMAPI4J…`) and `MMAPI4Python…` are *client libraries*,
   not the gateway — OpenD is a separate download.
2. Unpack and launch OpenD. Two options:
   - **GUI OpenD** (`moomooOpenD` app): log in with your moomoo account; it listens on
     `127.0.0.1:11111` by default.
   - **CLI OpenD**: edit `OpenD.xml` with your login, then `./moomooOpenD -login_account=… -login_pwd=…`.
3. In OpenD, **log in** and (for live trading only) complete **trade unlock**.
   Real-time US quotes may need a moomoo market-data subscription; paper (SIMULATE)
   and delayed quotes work without one.

## Prove the wire

```bash
pip install -r requirements.txt          # moomoo-api
python3 verify.py                          # US.AAPL US.SPY by default
python3 verify.py US.AAPL HK.00700         # or pass your own symbols
```

A green run prints **real** snapshot rows and `🟢 WIRE PROVEN`. If OpenD is down it
says exactly that and exits non-zero — it never prints a fake price.

## Run the bridge (for the app to call)

```bash
export MOOMOO_BRIDGE_TOKEN=$(openssl rand -hex 24)   # shared secret
python3 bridge.py                                     # listens 127.0.0.1:8790
```

Then expose it to the Worker through an **authenticated tunnel** (cloudflared or
tailscale) — never a raw public port — and set on the WM app:

```
MOOMOO_BRIDGE_URL   = https://<your-tunnel-host>
MOOMOO_BRIDGE_TOKEN = <same secret as above>
```

`GET /health` → `{ ok, opend_reachable, sdk_version }` (unauthenticated liveness, no data).
`GET /quote?symbols=US.AAPL,US.SPY` (Bearer required) → real snapshot rows, or HTTP 502
with OpenD's own error. **No fabricated quotes, ever.**

## Design notes / guardrails

- **Read-only v1.** No order placement over HTTP by design. `moomooAdapter.submitOrder`
  returns an honest `rejected` until a reviewed trade path is added.
- **Secrets stay on the bridge host.** The Worker only ever holds `MOOMOO_BRIDGE_URL` +
  the shared bearer token; the moomoo password and trade-unlock live only in OpenD.
- **Hosting decision (Founder):** the bridge needs a persistent host. Cheapest is your
  Mac + a tailscale/cloudflared tunnel; more robust is a small always-on VM. Same class
  of constraint as the tape-feed (serverless can't hold a broker socket).
