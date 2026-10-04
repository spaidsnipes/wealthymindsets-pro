# WealthyMindsets Pro — Privacy Policy (DRAFT)

> **DRAFT — NOT PUBLISHED. Not legal advice.** Written 2026-10-04 from the code's
> real data paths (file references below) so it describes what WM Pro actually
> does. `[BRACKETS]` are facts only the Founder can supply. Counsel should review,
> including whether GDPR / CCPA sections are needed for your audience.

Effective date: [DATE] · Operator: [LEGAL ENTITY NAME] · Contact: [CONTACT EMAIL]

## What we collect, and where it lives

| Data | Why | Where |
|---|---|---|
| Email and password sign-in | Your account | Supabase Auth. WM Pro never stores your password; we keep a signed, httpOnly session cookie (30 days) and a device-marker cookie (`src/lib/auth.ts`, `src/app/api/auth/login/route.ts`) |
| Profile (handle, display name, avatar) | Show you in community rooms | Supabase (WM World Passport project) |
| Lounge posts, comments, radio uploads | Community features you choose to use | Supabase tables and storage (`/api/lounge`, `/api/radio`) |
| Market-coverage checkpoints | Remember which market data your session already collected | Supabase `wm_market_coverage_*` plus your browser's localStorage |
| Paper trades, journal, chart settings, watchlists, wishlist | Your workspace | **Your browser's localStorage** on that device (not sent to us unless a screen says it syncs) |
| Brokerage connection | Show your accounts/positions and send orders you confirm | Broker tokens are server-side secrets for the account owner's connection; they are never sent to the browser. [FOR GUEST BROKER LINKING, IF ADDED: describe] |
| AI questions (SpaidBot, Morning Prep) | Answer your question | Sent to Google Gemini for processing [CONFIRM Google's data-use terms for your API tier] |
| Emails we send (confirm, reset) | Account security | Sent via Resend |
| IP address | Rate limiting / abuse prevention | Cloudflare Workers rate limiters (short-lived counters) |
| Live rooms (video/audio) | If you join a live room | LiveKit |

We do not sell your personal information. We do not run advertising trackers
[CONFIRM: no analytics scripts beyond hosting logs].

## Service providers
Cloudflare (hosting), Supabase (accounts, database, storage), Google Gemini (AI
text), Resend (email), LiveKit (live rooms), and market-data providers /
brokers you connect (tastytrade, Webull, Coinbase public data, and others shown
in the app). Each processes data under its own terms.

## Your choices
- Clear your browser's site data to remove locally stored workspace data. Signing
  out clears WM Pro's local keys on that device (`src/lib/logoutIsolation.ts`).
- "Log out all devices" ends every session.
- Ask us at [CONTACT EMAIL] to access, correct, or delete your account data; we
  will answer within [30] days.

## Security
Sessions are httpOnly cookies; owner-only broker routes refuse other users;
write endpoints are rate-limited. No system is perfectly secure.

## Children
WM Pro is not for anyone under 18.

## Changes
We will post updates here with a new effective date.
