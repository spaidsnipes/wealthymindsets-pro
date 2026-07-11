/**
 * WealthyMindsets Pro — Resend Email Service
 * All transactional emails live here. Templates use inline styles for
 * maximum email-client compatibility (Gmail, Outlook, Apple Mail, etc.)
 */

import { Resend } from "resend";

// Lazy singleton — Resend constructor throws if key is missing, so we defer
// instantiation to first use (runtime, not build time).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  return _resend;
}

// Sender identity. Resend requires a VERIFIED domain to deliver to arbitrary
// recipients. Until RESEND_FROM_EMAIL is set to a verified-domain address
// (e.g. "WealthyMindsets Pro <no-reply@wealthymindsets.info>"), we fall back to
// onboarding@resend.dev — which Resend TEST MODE only delivers to the Resend
// account owner's own inbox. That is the root cause of "sign-up emails never
// reach new users": the code is fine, the sender is unconfigured.
const FROM = process.env.RESEND_FROM_EMAIL ?? "WealthyMindsets Pro <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wealthymindsets-pro.vercel.app";

// True while still on the Resend test sender — surfaced loudly in logs so a
// missing RESEND_FROM_EMAIL can never fail silently again.
const USING_TEST_SENDER = /onboarding@resend\.dev/i.test(FROM);

/** Diagnostic snapshot of email config — safe to log (contains no secrets). */
export function emailConfigStatus() {
  return {
    hasApiKey:       !!process.env.RESEND_API_KEY,
    from:            FROM,
    usingTestSender: USING_TEST_SENDER,
    appUrl:          APP_URL,
  };
}

/* ─────────────────────────────────────────────────────────────
   Shared design tokens (inlined for email client compat)
───────────────────────────────────────────────────────────── */
const C = {
  bg:        "#0B0E1A",
  surface:   "#0F1422",
  border:    "#1E2A45",
  gold:      "#F0B429",
  teal:      "#00D4AA",
  text:      "#E2E8F0",
  textMuted: "#8896BE",
  red:       "#FF4D6A",
  purple:    "#7B6CF7",
} as const;

// WM W logo as inline SVG (works in most clients via img fallback below)
const wmLogoSvg = `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 32px 0 24px;">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: ${C.surface};
          border: 1px solid ${C.gold}44;
          border-radius: 12px;
          padding: 12px 24px;
        ">
          <svg width="32" height="32" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="21" fill="#0D1117" stroke="${C.gold}" stroke-width="2"/>
            <path d="M8 13 L13.5 31 L19 20 L22 25 L25 20 L30.5 31 L36 13"
              stroke="${C.gold}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 800; color: ${C.gold}; letter-spacing: 0.5px;">
            WealthyMindsets Pro
          </span>
        </div>
      </td>
    </tr>
  </table>
`;

function emailShell(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>WealthyMindsets Pro</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin: 0; padding: 0; background: #060810; -webkit-text-size-adjust: 100%; }
    a { color: ${C.teal}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 16px !important; }
      .email-card { border-radius: 12px !important; }
    }
  </style>
</head>
<body style="background: #060810; margin: 0; padding: 0;">
  <!-- Preview text (hidden in body, shown in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background: #060810;">
    <tr>
      <td align="center" class="email-body" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Logo header -->
          <tr><td>${wmLogoSvg}</td></tr>

          <!-- Card -->
          <tr>
            <td>
              <div class="email-card" style="
                background: ${C.bg};
                border: 1px solid ${C.border};
                border-radius: 16px;
                overflow: hidden;
              ">
                <!-- Gold top accent bar -->
                <div style="height: 3px; background: linear-gradient(90deg, ${C.gold}, ${C.teal}, ${C.purple});"></div>

                <div style="padding: 36px 40px;">
                  ${content}
                </div>

                <!-- Footer inside card -->
                <div style="
                  padding: 20px 40px;
                  border-top: 1px solid ${C.border};
                  background: ${C.surface};
                ">
                  <p style="
                    margin: 0;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    color: ${C.textMuted};
                    line-height: 1.6;
                  ">
                    You're receiving this email because you have a WealthyMindsets Pro account.
                    If you didn't request this, you can safely ignore it.
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- External footer -->
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="
                margin: 0;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 11px;
                color: #4A5580;
              ">
                © ${new Date().getFullYear()} WealthyMindsets Pro · Elite Institutional Trading Platform<br/>
                <a href="${APP_URL}" style="color: #4A5580;">wealthymindsets.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string, color: string = C.gold): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 24px 0 8px;">
          <a href="${href}"
            style="
              display: inline-block;
              background: ${color};
              color: #000;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 15px;
              font-weight: 800;
              text-decoration: none;
              padding: 14px 36px;
              border-radius: 8px;
              letter-spacing: 0.3px;
            "
          >${text}</a>
        </td>
      </tr>
    </table>
  `;
}

function h1(text: string): string {
  return `<h1 style="
    margin: 0 0 8px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: ${C.text};
    letter-spacing: -0.3px;
    line-height: 1.2;
  ">${text}</h1>`;
}

function h2(text: string): string {
  return `<h2 style="
    margin: 0 0 16px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: ${C.gold};
    text-transform: uppercase;
    letter-spacing: 1.5px;
  ">${text}</h2>`;
}

function p(text: string, small = false): string {
  return `<p style="
    margin: 0 0 16px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: ${small ? "13" : "15"}px;
    color: ${small ? C.textMuted : C.text};
    line-height: 1.65;
  ">${text}</p>`;
}

function divider(): string {
  return `<div style="height: 1px; background: ${C.border}; margin: 24px 0;"></div>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="
        padding: 10px 0;
        border-bottom: 1px solid ${C.border};
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        color: ${C.textMuted};
        width: 40%;
      ">${label}</td>
      <td style="
        padding: 10px 0;
        border-bottom: 1px solid ${C.border};
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        color: ${C.text};
        font-weight: 600;
      ">${value}</td>
    </tr>
  `;
}

function featureList(items: { icon: string; title: string; desc: string }[]): string {
  return items.map(item => `
    <tr>
      <td style="padding: 10px 0; vertical-align: top; width: 32px;">
        <span style="font-size: 18px;">${item.icon}</span>
      </td>
      <td style="padding: 10px 0 10px 12px; vertical-align: top;">
        <div style="
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: ${C.text};
          margin-bottom: 2px;
        ">${item.title}</div>
        <div style="
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 13px;
          color: ${C.textMuted};
          line-height: 1.5;
        ">${item.desc}</div>
      </td>
    </tr>
  `).join("");
}

/* ─────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────── */

export function buildWelcomeEmail(firstName: string, email: string): { html: string; text: string } {
  const dashboardUrl = `${APP_URL}/charts`;

  const html = emailShell(`
    ${h2("Welcome to the Elite")}
    ${h1(`You're in, ${firstName || "Trader"}.`)}
    ${p("Your WealthyMindsets Pro account is live. You now have access to the same institutional-grade tools that professional traders use — right in your browser.")}

    ${btn("Open My Dashboard →", dashboardUrl, C.gold)}

    ${divider()}
    ${h2("What's waiting for you")}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${featureList([
        { icon: "📊", title: "Advanced Charting", desc: "Volume Profile, Footprint, Order Flow, 100+ indicators — all real-time." },
        { icon: "🔵", title: "Orderflow & Footprint", desc: "Bid × Ask, Delta, Imbalance, Big Trades — see exactly where institutions are buying and selling." },
        { icon: "🌡️", title: "Market Heatmaps", desc: "S&P 500 sector heatmap with real-time price movement and volume color-coding." },
        { icon: "🤖", title: "SpaidBot AI", desc: "Integrated AI trading assistant for market analysis, ideas, and education." },
        { icon: "🎵", title: "Focus Radio", desc: "Curated calm-frequency music to keep you in the zone during trading sessions." },
        { icon: "🏫", title: "WM Education", desc: "Courses, playbooks, and live rooms with professional traders." },
      ])}
    </table>

    ${divider()}
    <table cellpadding="0" cellspacing="0">
      ${infoRow("Account", email)}
      ${infoRow("Plan", "WealthyMindsets Pro")}
      ${infoRow("Status", "Active")}
    </table>

    ${p(`
      Need help? Reply to this email or visit the
      <a href="${APP_URL}/education" style="color:${C.teal};">Education Hub</a>
      for step-by-step guides.
    `, true)}
  `, `Welcome to WealthyMindsets Pro — your elite trading dashboard is ready.`);

  const text = `
Welcome to WealthyMindsets Pro, ${firstName || "Trader"}!

Your account is live. Open your dashboard here:
${dashboardUrl}

What's included:
• Advanced charting with Volume Profile & Footprint
• Real-time Order Flow indicators
• Market Heatmaps
• SpaidBot AI assistant
• Focus Radio
• WM Education Hub

Account: ${email}
Plan: WealthyMindsets Pro

Questions? Reply to this email.

— The WealthyMindsets Team
${APP_URL}
  `.trim();

  return { html, text };
}

export function buildPasswordResetEmail(email: string, resetUrl: string): { html: string; text: string } {
  const html = emailShell(`
    ${h2("Security")}
    ${h1("Reset your password")}
    ${p("We received a request to reset the password for your WealthyMindsets Pro account. Click the button below to choose a new password.")}

    ${btn("Reset My Password →", resetUrl, C.teal)}

    ${divider()}
    ${p("This link expires in <strong style='color:${C.gold};'>60 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.", false)}

    <div style="
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 8px;
    ">
      ${p(`Or copy and paste this URL into your browser:<br/>
        <a href="${resetUrl}" style="color:${C.textMuted}; font-size: 12px; word-break: break-all;">${resetUrl}</a>
      `, true)}
    </div>

    ${divider()}
    ${p("For your security, this link can only be used once. After resetting, you'll be asked to sign in with your new password.", true)}
  `, `Reset your WealthyMindsets Pro password — link expires in 60 minutes.`);

  const text = `
Reset your WealthyMindsets Pro password

We received a request to reset the password for: ${email}

Reset your password here:
${resetUrl}

This link expires in 60 minutes. If you didn't request this, ignore this email.

— WealthyMindsets Pro
${APP_URL}
  `.trim();

  return { html, text };
}

export function buildVerificationEmail(email: string, verifyUrl: string): { html: string; text: string } {
  const html = emailShell(`
    ${h2("Account Setup")}
    ${h1("Confirm your email")}
    ${p("One quick step — verify your email address to activate your WealthyMindsets Pro account and unlock all features.")}

    ${btn("Verify Email Address →", verifyUrl, C.teal)}

    ${divider()}
    ${p("If the button doesn't work, copy and paste this link into your browser:", true)}
    <div style="
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 16px;
    ">
      <a href="${verifyUrl}" style="color:${C.textMuted}; font-size: 12px; word-break: break-all;">${verifyUrl}</a>
    </div>
    ${p("This verification link expires in 24 hours.", true)}
  `, `Verify your email to activate WealthyMindsets Pro.`);

  const text = `
Confirm your WealthyMindsets Pro email

Verify your email address (${email}) here:
${verifyUrl}

This link expires in 24 hours.

— WealthyMindsets Pro
${APP_URL}
  `.trim();

  return { html, text };
}

export function buildLoginAlertEmail(email: string, details: { ip?: string; location?: string; device?: string; time: string }): { html: string; text: string } {
  const securityUrl = `${APP_URL}/profile`;

  const html = emailShell(`
    ${h2("Security Alert")}
    ${h1("New sign-in detected")}
    ${p("We noticed a new sign-in to your WealthyMindsets Pro account. If this was you, no action is needed.")}

    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${infoRow("Account", email)}
      ${infoRow("Time", details.time)}
      ${details.ip ? infoRow("IP Address", details.ip) : ""}
      ${details.location ? infoRow("Location", details.location) : ""}
      ${details.device ? infoRow("Device", details.device) : ""}
    </table>
    ${divider()}

    ${p("<strong style='color:#FF4D6A;'>Not you?</strong> Secure your account immediately:")}
    ${btn("Secure My Account →", securityUrl, C.red)}
  `, `New sign-in to your WealthyMindsets Pro account on ${details.time}.`);

  const text = `
Security Alert — New sign-in to WealthyMindsets Pro

Account: ${email}
Time: ${details.time}
${details.ip ? `IP: ${details.ip}` : ""}
${details.location ? `Location: ${details.location}` : ""}

Not you? Secure your account: ${securityUrl}

— WealthyMindsets Pro
  `.trim();

  return { html, text };
}

/* ─────────────────────────────────────────────────────────────
   SEND FUNCTIONS
───────────────────────────────────────────────────────────── */

export type EmailSendResult = { ok: boolean; id: string | null; error: string | null };

/**
 * Single choke-point for every outbound email.
 *
 * Resend's SDK RESOLVES (it does NOT throw) with `{ data: null, error }` on
 * failure — so callers that only wrapped the call in try/catch silently
 * swallowed real delivery errors: wrong sender, unverified domain, or the
 * test-mode "you can only send to your own address" restriction. This surfaces
 * every outcome in the server logs and returns a normalized result so callers
 * can react (e.g. show the user "check your spam / email not configured").
 */
async function deliver(
  kind: string,
  payload: { from: string; to: string[]; subject: string; html: string; text: string },
): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error(`[email:${kind}] NOT SENT — RESEND_API_KEY is not set in this environment`);
    return { ok: false, id: null, error: "RESEND_API_KEY missing" };
  }
  if (USING_TEST_SENDER) {
    console.warn(
      `[email:${kind}] Using Resend TEST sender (${FROM}). In test mode Resend only ` +
      `delivers to the Resend account owner — set RESEND_FROM_EMAIL to a verified-` +
      `domain address (e.g. no-reply@wealthymindsets.info) so real users get mail.`,
    );
  }
  try {
    const { data, error } = await getResend().emails.send(payload);
    if (error) {
      console.error(`[email:${kind}] send FAILED`, { to: payload.to, from: payload.from, error });
      return { ok: false, id: null, error: (error as { message?: string }).message ?? String(error) };
    }
    console.log(`[email:${kind}] sent`, { to: payload.to, id: data?.id ?? null });
    return { ok: true, id: data?.id ?? null, error: null };
  } catch (e) {
    console.error(`[email:${kind}] threw`, e);
    return { ok: false, id: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  const { html, text } = buildWelcomeEmail(firstName ?? "", to);
  return deliver("welcome", {
    from:    FROM,
    to:      [to],
    subject: "Welcome to WealthyMindsets Pro — You're In 🚀",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { html, text } = buildPasswordResetEmail(to, resetUrl);
  return deliver("password-reset", {
    from:    FROM,
    to:      [to],
    subject: "Reset your WealthyMindsets Pro password",
    html,
    text,
  });
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const { html, text } = buildVerificationEmail(to, verifyUrl);
  return deliver("verification", {
    from:    FROM,
    to:      [to],
    subject: "Verify your WealthyMindsets Pro email",
    html,
    text,
  });
}

export async function sendLoginAlertEmail(
  to: string,
  details: { ip?: string; location?: string; device?: string; time: string },
) {
  const { html, text } = buildLoginAlertEmail(to, details);
  return deliver("login-alert", {
    from:    FROM,
    to:      [to],
    subject: "New sign-in to your WealthyMindsets Pro account",
    html,
    text,
  });
}

/**
 * Extract sign-in metadata from an incoming request for the login-alert email.
 * Uses Vercel's edge geo/ip headers when present (they only exist in prod),
 * and falls back gracefully so local dev still produces a sane payload.
 */
export function loginAlertDetailsFromRequest(
  req: Request,
): { ip?: string; location?: string; device?: string; time: string } {
  const h = req.headers;
  const ip =
    (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() ||
    h.get("x-real-ip") ||
    undefined;

  const city    = h.get("x-vercel-ip-city");
  const region  = h.get("x-vercel-ip-country-region");
  const country = h.get("x-vercel-ip-country");
  const location = [city && decodeURIComponent(city), region, country]
    .filter(Boolean)
    .join(", ") || undefined;

  const device = summarizeUserAgent(h.get("user-agent") ?? undefined);

  const time = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }) + " ET";

  return { ip: ip ?? undefined, location, device, time };
}

/** Turn a raw User-Agent into a short "Browser on OS" label; falls back to the raw string. */
function summarizeUserAgent(ua?: string): string | undefined {
  if (!ua) return undefined;
  const os =
    /Windows/i.test(ua) ? "Windows" :
    /iPhone|iPad|iOS/i.test(ua) ? "iOS" :
    /Android/i.test(ua) ? "Android" :
    /Mac OS X|Macintosh/i.test(ua) ? "macOS" :
    /Linux/i.test(ua) ? "Linux" : "";
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\/|Opera/i.test(ua) ? "Opera" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" : "";
  const label = [browser, os].filter(Boolean).join(" on ");
  return label || ua.slice(0, 80);
}
