import type { MetadataRoute } from "next"
import { BLOG_POSTS } from "@/lib/marketing/content"
import { MARKETING_SITE_URL } from "@/lib/marketing/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/features",
    "/workflow",
    "/for-agents",
    "/for-migration-agents",
    "/pricing",
    "/resources",
    "/resources/blog",
    "/resources/guides",
    "/resources/docs",
    "/blog",
    "/about",
    "/contact",
    "/book-demo",
    "/careers",
    "/privacy",
    "/terms",
    "/cookies",
    "/security",
    "/login",
  ]

  const now = new Date()

  return [
    ...staticRoutes.map((path) => ({
      url: `${MARKETING_SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${MARKETING_SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
