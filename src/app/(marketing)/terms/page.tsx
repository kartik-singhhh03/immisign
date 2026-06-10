import { LegalPage } from "@/components/saas/marketing-pages"

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="6 June 2025"
      intro="These terms govern your use of ImmiMate. By creating an account or using the platform, you agree to these terms on behalf of your migration practice."
      sections={[
        {
          heading: "Service description",
          body: (
            <p>
              ImmiMate provides a compliance operating system for registered migration agents,
              including service agreements, file notes, application approvals, statements of service,
              and practice visibility tools. The platform is provided on a subscription basis.
            </p>
          ),
        },
        {
          heading: "Account responsibilities",
          body: (
            <p>
              You are responsible for maintaining the confidentiality of account credentials, ensuring
              authorised users comply with OMARA obligations, and the accuracy of information entered
              into client matters. You must not use ImmiMate for unlawful purposes.
            </p>
          ),
        },
        {
          heading: "Subscription and billing",
          body: (
            <p>
              The ImmiMate Plan is billed monthly per agency. Included seats and additional seat
              pricing are described on the Pricing page. Subscriptions renew automatically unless
              cancelled before the renewal date.
            </p>
          ),
        },
        {
          heading: "Data ownership",
          body: (
            <p>
              You retain ownership of all client data and documents uploaded to your workspace.
              ImmiMate holds data on your behalf for the purpose of delivering the service and
              meeting compliance retention requirements.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              ImmiMate is a tool to support compliant practice management. You remain responsible for
              professional advice, lodgement decisions, and regulatory compliance. Our liability is
              limited to the extent permitted by Australian law.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: <p>legal@immimate.app · Sydney, Australia</p>,
        },
      ]}
    />
  )
}
