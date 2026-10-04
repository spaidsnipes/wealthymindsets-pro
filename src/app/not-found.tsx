import Link from "next/link";
import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";

/**
 * An address that is not a room. Next's default page was a dead end ("This
 * page could not be found" and nothing to press) — measured 2026-10-03 on
 * /rooms and /community, which are rail sections, not pages. This one says
 * so and hands the trader back to real rooms.
 */
const DOORS: ReadonlyArray<{ href: string; label: string }> = [
  { href: FOUNDER_LANDING_ROUTE, label: "Charts" },
  { href: "/journal", label: "Journal" },
  { href: "/morning-prep", label: "Morning Prep" },
  { href: "/lounge", label: "Lounge" },
];

export default function NotFound() {
  return (
    <main
      data-testid="wm-not-found"
      style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", background: "transparent", color: "#ede6d3" }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>Not a room</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 24, margin: "10px 0 8px" }}>
          This address doesn&rsquo;t open anything in WealthyMindsets.
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8271", margin: 0 }}>
          Rooms and Community are sections of the rail, not pages. Pick up where the work is:
        </p>
        <nav aria-label="Rooms" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 }}>
          {DOORS.map(d => (
            <Link key={d.href} href={d.href}
              style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 10, border: "1px solid rgba(201,165,92,0.45)", color: "#ede6d3", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              {d.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
