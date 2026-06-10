import { LegalPage } from "@/components/saas/marketing-pages"

export default function Page() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="6 June 2025"
      intro="ImmiMate uses cookies and similar technologies to operate the platform, maintain secure sessions, and understand how the service is used."
      sections={[
        {
          heading: "Essential cookies",
          body: (
            <p>
              These cookies are required for authentication, session management, and security. They
              cannot be disabled without affecting your ability to use ImmiMate.
            </p>
          ),
        },
        {
          heading: "Analytics cookies",
          body: (
            <p>
              We use analytics to understand feature usage and improve the platform. Analytics data
              is aggregated and does not identify individual clients.
            </p>
          ),
        },
        {
          heading: "Managing cookies",
          body: (
            <p>
              You can control non-essential cookies through your browser settings. Disabling essential
              cookies may prevent you from logging in or using workspace features.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: <p>privacy@immimate.app</p>,
        },
      ]}
    />
  )
}
