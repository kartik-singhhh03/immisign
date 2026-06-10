import type { MetadataRoute } from "next"
import { MARKETING_SITE_URL } from "@/lib/marketing/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/workspace/", "/dashboard", "/api/", "/onboarding"],
    },
    sitemap: `${MARKETING_SITE_URL}/sitemap.xml`,
  }
}
