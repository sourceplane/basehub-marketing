import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/constants";

// Upstream shipped a static public/robots.txt naming its own demo's domain;
// this one names the environment's own origin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
