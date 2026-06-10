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
  mega?: boolean
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
  { name: "Workflow", href: "/workflow", chevron: false },
  { name: "For Agents", href: "/for-agents", chevron: false },
  {
    name: "Resources",
    href: "/resources",
    chevron: true,
    mega: true,
    dropdown: [
      { label: "Blog", href: "/resources/blog", description: "Articles and product updates" },
      { label: "Guides", href: "/resources/guides", description: "Migration practice playbooks" },
      { label: "Documentation", href: "/resources/docs", description: "Product help centre" },
      { label: "Resource Library", href: "/resources", description: "Templates and references" },
      { label: "Security", href: "/security", description: "Data protection" },
      { label: "About", href: "/about", description: "Our mission" },
    ],
  },
  { name: "Pricing", href: "/pricing", chevron: false },
]

export const FOOTER_LINKS = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Workflow", href: "/workflow" },
    { label: "Pricing", href: "/pricing" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "/careers" },
  ],
  resources: [
    { label: "Blog", href: "/resources/blog" },
    { label: "Guides", href: "/resources/guides" },
    { label: "Documentation", href: "/resources/docs" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
  ],
} as const
