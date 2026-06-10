"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

const scrollMap = new Map<string, number>()

export function MarketingScrollRestoration() {
  const pathname = usePathname()
  const previousPath = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (previousPath.current && previousPath.current !== pathname) {
      scrollMap.set(previousPath.current, window.scrollY)
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior })
    }
    previousPath.current = pathname
  }, [pathname])

  React.useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname
      const y = scrollMap.get(path) ?? 0
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior }))
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return null
}
