import type { Metadata } from "next"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"

export const MARKETING_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://immimate.app"

export function marketingMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string
  description: string
  path: string
  noIndex?: boolean
}): Metadata {
  const canonical = `${MARKETING_SITE_URL}${path}`
  const fullTitle = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: APP_NAME,
      type: "website",
      locale: "en_AU",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  }
}

export const DEFAULT_MARKETING_DESCRIPTION = `${APP_TAGLINE}. ${APP_NAME} connects service agreements, file notes, application approvals, and statements of service for Australian migration practices.`

export const MARKETING_ROUTES = [
  "/",
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
] as const
