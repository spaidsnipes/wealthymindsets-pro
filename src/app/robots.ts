import type { MetadataRoute } from "next";

/**
 * /robots.txt answered 404 (2026-10-04). Crawlers stay out of the API; what
 * else the public site lets search engines index is the Founder's call.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: ["/api/"] } };
}
