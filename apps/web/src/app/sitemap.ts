import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/community"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
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
  try {
    const service = createServiceRoleClient();
    const [{ data: profiles }, { data: posts }] = await Promise.all([
      service.from("user_public_profiles").select("user_id,handle,updated_at").eq("public_enabled", true).eq("status", "active").not("handle", "is", null).order("updated_at", { ascending: false }).limit(500),
      service.from("community_posts").select("id,author_id,updated_at").eq("status", "published").eq("visibility", "public").order("updated_at", { ascending: false }).limit(1000),
    ]);
    const publicAuthors = new Set((profiles ?? []).map((profile) => profile.user_id));
    return [
      ...staticRoutes,
      ...(profiles ?? []).map((profile) => ({ changeFrequency: "weekly" as const, lastModified: new Date(profile.updated_at), priority: 0.65, url: absoluteUrl(`/community/u/${profile.handle}`) })),
      ...(posts ?? []).filter((post) => post.author_id && publicAuthors.has(post.author_id)).map((post) => ({ changeFrequency: "weekly" as const, lastModified: new Date(post.updated_at), priority: 0.7, url: absoluteUrl(`/community/post/${post.id}`) })),
    ];
  } catch {
    return staticRoutes;
  }
}
