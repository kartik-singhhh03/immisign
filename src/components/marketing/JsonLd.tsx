import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { MARKETING_SITE_URL } from "@/lib/marketing/seo"

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    description: APP_TAGLINE,
    url: MARKETING_SITE_URL,
    areaServed: "AU",
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
