export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "omara-service-agreements",
    title: "How to structure compliant OMARA service agreements",
    excerpt: "Service agreements are the foundation of every migration matter under OMARA disclosure rules.",
    category: "Compliance",
    date: "2026-05-12",
    readTime: "8 min",
  },
  {
    slug: "partner-visa-retainer-checklist",
    title: "Subclass 820 Partner Visa retainer checklist",
    excerpt: "Fee disclosure variables and payment milestones for partner visa retainers.",
    category: "Templates",
    date: "2026-04-28",
    readTime: "Template",
  },
  {
    slug: "file-notes-workflow",
    title: "Building an audit-ready File Notes workflow",
    excerpt: "Append-only notes with server timestamps and export for OMARA review.",
    category: "Compliance",
    date: "2026-04-03",
    readTime: "10 min",
  },
  {
    slug: "application-approval-chain",
    title: "Application Approval compliance chain",
    excerpt: "Formal review, client sign-off, and certificate generation before lodgement.",
    category: "Operations",
    date: "2026-03-18",
    readTime: "6 min",
  },
  {
    slug: "client-onboarding-email-pack",
    title: "Standard client onboarding email pack",
    excerpt: "Intake emails and document request sequences aligned to ImmiMate workflows.",
    category: "Templates",
    date: "2026-02-22",
    readTime: "Template",
  },
  {
    slug: "statement-of-service",
    title: "Statement of Service best practices",
    excerpt: "Document work performed, fees charged, and client acknowledgements.",
    category: "Operations",
    date: "2026-01-30",
    readTime: "5 min",
  },
]

export type Guide = {
  slug: string
  title: string
  description: string
  level: "Beginner" | "Intermediate" | "Advanced"
  duration: string
}

export const GUIDES: Guide[] = [
  {
    slug: "onboarding-new-clients",
    title: "Onboarding New Clients",
    description: "Lead intake, matter setup, and first agreement in under 30 minutes.",
    level: "Beginner",
    duration: "12 min read",
  },
  {
    slug: "agreement-lifecycle",
    title: "Service Agreement Lifecycle",
    description: "Draft, generate, send, and track signatures end to end.",
    level: "Beginner",
    duration: "15 min read",
  },
  {
    slug: "file-notes-standards",
    title: "File Notes Standards",
    description: "Note types, mandatory fields, and export for OMARA review.",
    level: "Intermediate",
    duration: "10 min read",
  },
  {
    slug: "approval-certificates",
    title: "Application Approval Certificates",
    description: "Internal review, client approval, and compliance records.",
    level: "Intermediate",
    duration: "11 min read",
  },
  {
    slug: "team-rbac-setup",
    title: "Team Roles & Permissions",
    description: "Configure owners, agents, and read-only staff safely.",
    level: "Advanced",
    duration: "14 min read",
  },
  {
    slug: "audit-preparation",
    title: "Audit Preparation Playbook",
    description: "Export trails, verify agreements, and demonstrate compliance.",
    level: "Advanced",
    duration: "18 min read",
  },
]

export type DocCategory = {
  id: string
  title: string
  articles: { slug: string; title: string }[]
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    articles: [
      { slug: "workspace-setup", title: "Workspace setup" },
      { slug: "invite-team", title: "Invite your team" },
      { slug: "branding", title: "Agency branding" },
    ],
  },
  {
    id: "clients",
    title: "Clients & Matters",
    articles: [
      { slug: "create-client", title: "Create a client" },
      { slug: "matter-types", title: "Matter types" },
      { slug: "client-timeline", title: "Client timeline" },
    ],
  },
  {
    id: "agreements",
    title: "Service Agreements",
    articles: [
      { slug: "wizard-overview", title: "Agreement wizard" },
      { slug: "send-for-signature", title: "Send for signature" },
      { slug: "audit-trail", title: "Agreement audit trail" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    articles: [
      { slug: "file-notes", title: "File notes" },
      { slug: "approvals", title: "Application approvals" },
      { slug: "statements-of-service", title: "Statements of service" },
    ],
  },
]

export const TRUSTED_AGENCIES = [
  "AVC Migration",
  "Pacific Pathways",
  "Southern Cross Visas",
  "Harbour City Migration",
  "Ritik Labs",
  "North Shore RMA",
]

export const FEATURE_CARDS = [
  { title: "Client Management", desc: "Unified client profiles, matters, and activity timelines." },
  { title: "Application Approvals", desc: "Structured review, client sign-off, and certificates." },
  { title: "Compliance Tracking", desc: "Dashboard visibility across agreements and obligations." },
  { title: "Service Agreements", desc: "OMARA-ready retainers with e-signature dispatch." },
  { title: "Document Library", desc: "Secure storage, send workflows, and audit history." },
  { title: "Analytics", desc: "Practice metrics across agreements, documents, and matters." },
  { title: "Role-Based Access", desc: "Owner, agent, and read-only permissions built in." },
  { title: "Audit Logs", desc: "Immutable activity records for every critical action." },
]

export const TESTIMONIALS = [
  {
    quote: "ImmiMate replaced four disconnected tools. Our file notes and agreements finally live in one audit-ready system.",
    name: "Rajwant Singh",
    role: "Principal Migration Agent",
    agency: "AVC Migration",
  },
  {
    quote: "The workflow from lead to lodgement is visible on every client. Compliance reviews take hours, not days.",
    name: "Sarah Chen",
    role: "Registered Migration Agent",
    agency: "Pacific Pathways",
  },
  {
    quote: "Application approvals with certificates gave us defensible records. Clients sign off faster with clear trails.",
    name: "Michael Torres",
    role: "Practice Manager",
    agency: "Southern Cross Visas",
  },
]
