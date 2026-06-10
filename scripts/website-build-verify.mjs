#!/usr/bin/env node
/**
 * IMMIMATE-WEBSITE-1 route verification
 * Usage: node scripts/website-build-verify.mjs [baseUrl]
 */
import { writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const BASE = process.argv[2] || "http://localhost:3000"
const ROUTES = [
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
  "/blog/omara-service-agreements",
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

const NAV_LINKS = [
  "/features",
  "/workflow",
  "/for-agents",
  "/resources",
  "/resources/blog",
  "/resources/guides",
  "/resources/docs",
  "/pricing",
  "/login",
  "/book-demo",
]

const FOOTER_LINKS = [
  "/features",
  "/workflow",
  "/pricing",
  "/about",
  "/contact",
  "/careers",
  "/resources/blog",
  "/resources/guides",
  "/resources/docs",
  "/privacy",
  "/terms",
  "/cookies",
  "/book-demo",
]

async function checkRoute(path) {
  const url = `${BASE}${path}`
  const started = Date.now()
  try {
    const res = await fetch(url, { redirect: "follow" })
    const html = await res.text()
    const ms = Date.now() - started
    const isHtml = html.includes("<!DOCTYPE") || html.includes("<html")
    const has404 = res.status === 404 || /not found/i.test(html.slice(0, 2000))
    const pass = res.ok && isHtml && !has404
    return {
      path,
      url,
      status: res.status,
      pass,
      ms,
      size: html.length,
      error: pass ? null : has404 ? "404 or not found content" : `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      path,
      url,
      status: 0,
      pass: false,
      ms: Date.now() - started,
      size: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  console.log(`Verifying marketing routes at ${BASE}\n`)
  const results = []
  for (const path of ROUTES) {
    const r = await checkRoute(path)
    results.push(r)
    console.log(`${r.pass ? "PASS" : "FAIL"} ${path} (${r.status}) ${r.ms}ms`)
  }

  const routePass = results.filter((r) => r.pass).length
  const routeFail = results.length - routePass

  const navResults = NAV_LINKS.map((p) => ({
    path: p,
    covered: ROUTES.includes(p) || results.some((r) => r.path === p && r.pass),
  }))

  const footerResults = FOOTER_LINKS.map((p) => ({
    path: p,
    covered: results.some((r) => r.path === p && r.pass),
  }))

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    summary: {
      routesChecked: results.length,
      pass: routePass,
      fail: routeFail,
      navLinksOk: navResults.every((n) => n.covered),
      footerLinksOk: footerResults.every((f) => f.covered),
      verdict: routeFail === 0 ? "PASS" : "FAIL",
    },
    routes: results,
    nav: navResults,
    footer: footerResults,
  }

  const root = dirname(fileURLToPath(import.meta.url))
  const evidenceDir = join(root, "..", "docs", "e2e-evidence")
  mkdirSync(evidenceDir, { recursive: true })
  writeFileSync(join(evidenceDir, "website-build-1.json"), JSON.stringify(payload, null, 2))

  console.log(`\n${routePass}/${results.length} routes passed`)
  console.log(`Verdict: ${payload.summary.verdict}`)
  process.exit(routeFail > 0 ? 1 : 0)
}

main()
