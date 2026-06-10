"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { BLOG_POSTS } from "@/lib/marketing/content"

const PER_PAGE = 6

export function ResourcesBlogContent() {
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)

  const filtered = BLOG_POSTS.filter(
    (p) =>
      !query.trim() ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const items = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  React.useEffect(() => setPage(1), [query])

  return (
    <div className="flex flex-col">
      <section className="border-b border-mate-border bg-white pt-32 pb-16 md:pt-36">
        <div className="container mx-auto max-w-[1400px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mate-accent">Blog</p>
          <h1 className="mt-6 font-display text-[2.75rem] font-normal text-mate-primary md:text-5xl">
            Insights for migration practices
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-mate-muted">
            Compliance, agreements, workflows, and product updates.
          </p>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mate-muted" />
            <input
              type="search"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-mate-border bg-mate-offwhite pl-10 pr-4 text-sm outline-none ring-mate-accent/20 focus:ring-2"
              aria-label="Search blog articles"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-16 md:py-24">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-mate-border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-mate-accent">
                  {post.category}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-mate-primary group-hover:text-mate-accent">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-mate-muted">{post.excerpt}</p>
                <p className="mt-4 text-xs text-mate-muted">
                  {post.date} · {post.readTime}
                </p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold ${
                    n === page
                      ? "bg-mate-primary text-white"
                      : "border border-mate-border bg-white text-mate-muted hover:text-mate-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
