import { LegalPage } from "@/components/saas/marketing-pages"

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="6 June 2025"
      intro="ImmiMate is committed to protecting the privacy of migration agents and their clients. This policy explains how we collect, use, and safeguard personal information in accordance with the Privacy Act 1988 (Cth)."
      sections={[
        {
          heading: "Information we collect",
          body: (
            <>
              <p>
                We collect information you provide when registering your agency, onboarding clients,
                and using ImmiMate workflows — including names, contact details, MARN numbers, and
                documents uploaded to client matters.
              </p>
              <p>
                We also collect technical data such as IP addresses, device information, and usage
                logs to maintain platform security and performance.
              </p>
            </>
          ),
        },
        {
          heading: "How we use your information",
          body: (
            <p>
              Information is used to deliver ImmiMate services, maintain compliance records, provide
              customer support, and improve platform functionality. We do not sell personal
              information to third parties.
            </p>
          ),
        },
        {
          heading: "Data storage and security",
          body: (
            <p>
              All operational data is hosted in Sydney, Australia on enterprise-grade infrastructure.
              Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is controlled
              through role-based permissions within your agency workspace.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You may request access to, correction of, or deletion of personal information held
              about you, subject to legal and compliance retention obligations. Contact
              privacy@immimate.app for privacy enquiries.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              ImmiMate Pty Ltd · Level 14, 175 Pitt Street, Sydney NSW 2000 · privacy@immimate.app
            </p>
          ),
        },
      ]}
    />
  )
}
