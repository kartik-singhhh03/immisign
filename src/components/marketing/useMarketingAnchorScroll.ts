"use client"

import * as React from "react"

const NAVBAR_OFFSET = 96

export function useMarketingAnchorScroll() {
  React.useEffect(() => {
    const scrollToHash = (hash: string) => {
      if (!hash || hash === "#") return
      const el = document.querySelector(hash)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET
      window.scrollTo({ top, behavior: "smooth" })
    }

    if (window.location.hash) {
      requestAnimationFrame(() => scrollToHash(window.location.hash))
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a[href*="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href?.includes("#")) return
      const [path, hash] = href.split("#")
      if (path && path !== window.location.pathname) return
      if (!hash) return
      e.preventDefault()
      history.pushState(null, "", `#${hash}`)
      scrollToHash(`#${hash}`)
    }

    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])
}
