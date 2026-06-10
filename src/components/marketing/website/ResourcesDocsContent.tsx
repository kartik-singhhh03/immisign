"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { DOC_CATEGORIES } from "@/lib/marketing/content"

export function ResourcesDocsContent() {
  const [query, setQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState(DOC_CATEGORIES[0]?.id ?? "")

  const filteredCategories = DOC_CATEGORIES.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) => !query.trim() || a.title.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((cat) => cat.articles.length > 0)

  const current =
    filteredCategories.find((c) => c.id === activeCategory) ?? filteredCategories[0]

  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-12 md:pt-36">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Documentation</p>
          <h1 className="mt-6 font-display text-[2.75rem] font-normal text-mate-primary md:text-5xl">
            Product documentation
          </h1>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mate-muted" />
            <input
              type="search"
              placeholder="Search docs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-mate-border bg-mate-offwhite pl-10 pr-4 text-sm outline-none ring-mate-accent/20 focus:ring-2"
              aria-label="Search documentation"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-12 md:py-16">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="rounded-2xl border border-mate-border bg-white p-4 lg:sticky lg:top-28 lg:self-start">
              <nav aria-label="Documentation categories">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      current?.id === cat.id
                        ? "bg-mate-primary text-white"
                        : "text-mate-muted hover:bg-mate-offwhite hover:text-mate-primary"
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="rounded-2xl border border-mate-border bg-white p-8">
              {current ? (
                <>
                  <h2 className="text-2xl font-semibold text-mate-primary">{current.title}</h2>
                  <ul className="mt-6 space-y-3">
                    {current.articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/resources/docs#${article.slug}`}
                          className="text-sm font-medium text-mate-secondary hover:text-mate-accent"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-8 text-sm text-mate-muted">
                    Full article content is coming soon. Contact{" "}
                    <a href="mailto:support@immimate.app" className="text-mate-accent hover:underline">
                      support@immimate.app
                    </a>{" "}
                    for early access.
                  </p>
                </>
              ) : (
                <p className="text-mate-muted">No documentation matches your search.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
