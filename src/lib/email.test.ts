/**
 * Truth-lock — src/lib/email.ts transactional template builders.
 *
 * These are the pure, side-effect-free halves of the Resend service:
 * `buildWelcomeEmail`, `buildPasswordResetEmail`, `buildVerificationEmail`,
 * `buildLoginAlertEmail`, and the `emailConfigStatus` diagnostic. They are
 * customer-facing and security-adjacent, so silent drift is dangerous:
 *   - a changed reset-link expiry line misleads users about a live token,
 *   - a login-alert row that renders "undefined" leaks nothing but looks
 *     broken and erodes the "truth before theater" contract,
 *   - `emailConfigStatus` must remain safe to log — it must NEVER echo the
 *     actual RESEND_API_KEY value.
 *
 * The send functions (`sendWelcomeEmail`, etc.) are intentionally NOT
 * exercised here — they perform network I/O through Resend. This file
 * locks only the deterministic template + config surface.
 */

import { describe, it, expect } from "vitest";
import {
  buildWelcomeEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  buildLoginAlertEmail,
  emailConfigStatus,
} from "@/lib/email";

describe("email.ts — template builders (truth-lock)", () => {
  describe("buildWelcomeEmail", () => {
    it("returns non-empty html and text", () => {
      const { html, text } = buildWelcomeEmail("Dave", "dave@example.com");
      expect(typeof html).toBe("string");
      expect(typeof text).toBe("string");
      expect(html.length).toBeGreaterThan(0);
      expect(text.length).toBeGreaterThan(0);
    });

    it("greets the supplied first name in both html and text", () => {
      const { html, text } = buildWelcomeEmail("Dave", "dave@example.com");
      expect(html).toContain("Dave");
      expect(text).toContain("Dave");
    });

    it("falls back to 'Trader' when first name is empty", () => {
      const { html, text } = buildWelcomeEmail("", "dave@example.com");
      expect(html).toContain("Trader");
      expect(text).toContain("Trader");
    });

    it("includes the account email and the command-deck destination", () => {
      const { html, text } = buildWelcomeEmail("Dave", "dave@example.com");
      expect(html).toContain("dave@example.com");
      expect(text).toContain("dave@example.com");
      expect(html).toContain("/command-deck");
      expect(text).toContain("/command-deck");
    });

    it("carries the honesty covenant (never a beautiful lie)", () => {
      const { html, text } = buildWelcomeEmail("Dave", "dave@example.com");
      expect(html).toContain("Never a beautiful lie");
      expect(text.toLowerCase()).toContain("beautiful lie");
    });

    it("is deterministic — identical inputs yield identical output", () => {
      const a = buildWelcomeEmail("Dave", "dave@example.com");
      const b = buildWelcomeEmail("Dave", "dave@example.com");
      expect(a).toEqual(b);
    });
  });

  describe("buildPasswordResetEmail", () => {
    const RESET = "https://wealthymindsetspro.com/reset?token=abc123";

    it("embeds the reset URL (button + copyable fallback) in html", () => {
      const { html } = buildPasswordResetEmail("dave@example.com", RESET);
      // URL appears at least twice: the CTA button and the copy/paste block.
      const occurrences = html.split(RESET).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    it("embeds the reset URL and account in text", () => {
      const { text } = buildPasswordResetEmail("dave@example.com", RESET);
      expect(text).toContain(RESET);
      expect(text).toContain("dave@example.com");
    });

    it("locks the 60-minute expiry disclosure (security-critical)", () => {
      const { html, text } = buildPasswordResetEmail("dave@example.com", RESET);
      expect(html).toContain("60 minutes");
      expect(text).toContain("60 minutes");
    });
  });

  describe("buildVerificationEmail", () => {
    const VERIFY = "https://wealthymindsetspro.com/verify?token=xyz789";

    it("embeds the verify URL in html and text", () => {
      const { html, text } = buildVerificationEmail("dave@example.com", VERIFY);
      expect(html).toContain(VERIFY);
      expect(text).toContain(VERIFY);
    });

    it("locks the 24-hour expiry disclosure", () => {
      const { html, text } = buildVerificationEmail("dave@example.com", VERIFY);
      expect(html).toContain("24 hours");
      expect(text).toContain("24 hours");
    });
  });

  describe("buildLoginAlertEmail", () => {
    it("always includes account and time", () => {
      const { html, text } = buildLoginAlertEmail("dave@example.com", {
        time: "2026-08-30 14:00 CDT",
      });
      expect(html).toContain("dave@example.com");
      expect(html).toContain("2026-08-30 14:00 CDT");
      expect(text).toContain("dave@example.com");
      expect(text).toContain("2026-08-30 14:00 CDT");
    });

    it("renders optional rows only when provided", () => {
      const { html } = buildLoginAlertEmail("dave@example.com", {
        time: "T",
        ip: "203.0.113.7",
        location: "Austin, TX",
        device: "Chrome / macOS",
      });
      expect(html).toContain("203.0.113.7");
      expect(html).toContain("Austin, TX");
      expect(html).toContain("Chrome / macOS");
    });

    it("never emits literal 'undefined' for absent optional fields", () => {
      const { html, text } = buildLoginAlertEmail("dave@example.com", {
        time: "T",
      });
      expect(html).not.toContain("undefined");
      expect(text).not.toContain("undefined");
    });

    it("points recovery at the /profile security surface", () => {
      const { html, text } = buildLoginAlertEmail("dave@example.com", {
        time: "T",
      });
      expect(html).toContain("/profile");
      expect(text).toContain("/profile");
    });
  });

  describe("emailConfigStatus — safe-to-log diagnostic", () => {
    it("reports config shape without leaking the API key value", () => {
      const prior = process.env.RESEND_API_KEY;
      const SENTINEL = "re_SECRET_SENTINEL_DO_NOT_LEAK_9999";
      process.env.RESEND_API_KEY = SENTINEL;
      try {
        const status = emailConfigStatus();
        expect(status.hasApiKey).toBe(true);
        expect(typeof status.from).toBe("string");
        expect(typeof status.usingTestSender).toBe("boolean");
        expect(typeof status.appUrl).toBe("string");
        // The raw secret must never appear anywhere in the snapshot.
        expect(JSON.stringify(status)).not.toContain(SENTINEL);
      } finally {
        if (prior === undefined) delete process.env.RESEND_API_KEY;
        else process.env.RESEND_API_KEY = prior;
      }
    });

    it("reports hasApiKey=false when the key is absent", () => {
      const prior = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      try {
        expect(emailConfigStatus().hasApiKey).toBe(false);
      } finally {
        if (prior !== undefined) process.env.RESEND_API_KEY = prior;
      }
    });
  });
});
