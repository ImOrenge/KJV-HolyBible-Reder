import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/account/delete"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
