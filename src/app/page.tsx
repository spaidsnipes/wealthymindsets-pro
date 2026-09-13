import { redirect } from "next/navigation";

import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";

/**
 * The bare domain is one of three no-destination arrivals. It does not get to
 * hold its own opinion about where that goes — founderLanding.ts records why
 * three independent opinions was the defect.
 */
export default function Home() {
  redirect(FOUNDER_LANDING_ROUTE);
}
