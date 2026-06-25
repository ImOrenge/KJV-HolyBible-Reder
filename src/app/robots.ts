import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/callback"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
