export type NavDropdownItem = {
  label: string
  href: string
  description?: string
}

export type NavLink = {
  name: string
  href: string
  chevron?: boolean
  dropdown?: NavDropdownItem[]
}

export const MARKETING_NAV_LINKS: NavLink[] = [
  {
    name: "Features",
    href: "/features",
    chevron: true,
    dropdown: [
      { label: "All Features", href: "/features", description: "Platform overview" },
      { label: "Service Agreements", href: "/features#service-agreements", description: "OMARA-ready retainers" },
      { label: "File Notes", href: "/features#file-notes", description: "Append-only audit trail" },
      { label: "Application Approval", href: "/features#application-approval", description: "Review and sign-off" },
      { label: "Statement of Service", href: "/features#statement-of-service", description: "Work performed records" },
      { label: "Compliance Dashboard", href: "/features#compliance-dashboard", description: "Practice visibility" },
    ],
  },
  { name: "Workflow", href: "/#workflow", chevron: false },
  { name: "For Agents", href: "/for-migration-agents", chevron: false },
  {
    name: "Resources",
    href: "/resources",
    chevron: true,
    dropdown: [
      { label: "Resource Library", href: "/resources", description: "Guides and templates" },
      { label: "Blog", href: "/blog", description: "Articles and updates" },
      { label: "Security", href: "/security", description: "Data protection" },
      { label: "About", href: "/about", description: "Our mission" },
    ],
  },
  { name: "Pricing", href: "/pricing", chevron: false },
]
