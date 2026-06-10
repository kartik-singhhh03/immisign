import { BlogPostPage } from "@/components/saas/marketing-pages"

export default function Page({ params }: { params: { slug: string } }) {
  return <BlogPostPage slug={params.slug} />
}
