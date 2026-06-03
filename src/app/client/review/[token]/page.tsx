import { redirect } from "next/navigation"

/** Legacy client review route — redirects to Supabase-backed review portal. */
export default function ClientReviewRedirect({ params }: { params: { token: string } }) {
  redirect(`/review/${params.token}`)
}
