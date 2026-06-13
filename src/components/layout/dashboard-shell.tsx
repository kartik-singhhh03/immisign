"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkspaceShellSkeleton } from "@/components/ui/skeletons"
import { PageTransition } from "./page-transition"
import { CommandPaletteProvider, GlobalSearchModal, useCommandPalette } from "./command-palette"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { useAuthStore, User } from "@/store/authStore"
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  FileSignature,
  FileCheck2,
  FileText,
  ClipboardList,
  Send,
  FolderOpen,
  Settings,
  CreditCard,
  Search,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User as UserIcon,
  Users,
  ChevronDown,
  ShieldAlert,
  Sliders,
  Check,
  ScrollText,
} from "lucide-react"

type SidebarNavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const rawSidebarNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Service Agreements",
    href: "/agreements",
    icon: FileSignature,
  },
  {
    title: "Application Approvals",
    href: "/approvals",
    icon: FileCheck2,
  },
  {
    title: "Document Sign",
    href: "/documents/send",
    icon: Send,
  },
  {
    title: "File Notes",
    href: "/file-notes",
    icon: ClipboardList,
  },
  {
    title: "SOS",
    href: "/service-statements/new",
    icon: ScrollText,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Document Library",
    href: "/documents/library",
    icon: FolderOpen,
  },
] satisfies SidebarNavItem[]

const rawSidebarBottomItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
] satisfies SidebarNavItem[]

function SearchTrigger() {
  const { openPalette } = useCommandPalette()
  return (
    <>
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden h-10 w-10 rounded-xl text-[#5C5C5C] hover:bg-[#FAFAFA]"
      aria-label="Open search"
      onClick={openPalette}
    >
      <Search className="h-5 w-5" />
    </Button>
    <div className="relative hidden w-full max-w-lg md:flex">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C5C]" aria-hidden />
      <button
        type="button"
        aria-label="Open ImmiMate Command Center"
        onClick={openPalette}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] pl-9 pr-3 text-sm font-medium text-[#5C5C5C] transition-colors duration-200 hover:border-[#111111]/15 hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111]/20"
      >
        <span>Search clients, matters, documents, notes…</span>
        <kbd className="hidden rounded border border-[#E7E7E7] bg-white px-1.5 font-mono text-[10px] font-semibold text-[#5C5C5C] sm:inline-block">
          ⌘K
        </kbd>
      </button>
    </div>
    </>
  )
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // Auth Store bindings
  const supabase = React.useMemo(() => createClient(), [])
  const { 
    user, 
    activeWorkspace, 
    logout 
  } = useAuthStore()
  const isDevEnvironment = process.env.NODE_ENV === 'development'

  const { slug: currentSlug, activeWorkspace: currentWorkspace } = useRequireWorkspace()
  const currentRole = user?.role || "Owner"

  if (!currentSlug) {
    return <WorkspaceShellSkeleton />
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  // Role Permissions Checks
  const hasBillingAccess = currentRole === "Owner" || currentRole === "Admin"
  const hasSettingsAccess = currentRole !== "Assistant" && currentRole !== "Read-only staff"

  const handleLogoutClick = async () => {
    await supabase.auth.signOut()
    logout()
    router.push("/login")
  }

  // Prefix routes with dynamic tenant base
  const sidebarNavItems = rawSidebarNavItems.map(item => ({
    ...item,
    href: `/workspace/${currentSlug}${item.href}`
  }))

  const sidebarBottomItems = [
    ...rawSidebarBottomItems,
    ...(hasBillingAccess
      ? [{ title: "System Health", href: "/admin/system-health", icon: ShieldAlert } satisfies SidebarNavItem]
      : []),
  ].map(item => ({
    ...item,
    href: `/workspace/${currentSlug}${item.href}`
  }))

  const renderNavLink = (item: SidebarNavItem) => {
    // Determine access restrictions
    const isBilling = item.href.endsWith("/billing")
    const isSettings = item.href.endsWith("/settings")
    
    const isLocked = (isBilling && !hasBillingAccess) || (isSettings && !hasSettingsAccess)

    const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && !item.href.endsWith("/dashboard"))
    const Icon = item.icon

    if (isLocked) {
      return (
        <div
          key={item.href}
          className="group relative flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 cursor-not-allowed select-none outline-none"
          title={`Restricted: ${currentRole} cannot access this page`}
        >
          <Icon className="shrink-0 mr-3 h-4 w-4 text-slate-300" />
          {!isCollapsed && (
            <span className="flex items-center justify-between w-full">
              <span>{item.title}</span>
              <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-semibold">
                Locked
              </span>
            </span>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group relative flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
          isActive
            ? "bg-[#111111]/[0.06] text-[#111111] font-semibold"
            : "text-[#5C5C5C] hover:bg-[#111111]/[0.04] hover:text-[#111111]"
        )}
      >
        <Icon 
          className={cn(
            "shrink-0 transition-colors", 
            isCollapsed ? "mr-0 h-5 w-5" : "mr-3 h-4 w-4", 
            isActive ? "text-[#111111]" : "text-[#5C5C5C] group-hover:text-[#111111]"
          )} 
        />
        {!isCollapsed && <span className="transition-all duration-300">{item.title}</span>}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#FAFAFA] font-sans text-slate-900">
      
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-slate-200 bg-[#F5F5F5] transition-all duration-300 lg:flex",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Single agency workspace (one subscription = one agency) */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md p-1.5",
              isCollapsed && "mx-auto justify-center",
            )}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] text-xs font-bold text-white"
              style={{
                backgroundColor: currentWorkspace?.logoUrl
                  ? "transparent"
                  : "#111111",
              }}
            >
              {currentWorkspace?.logoUrl ? (
                <img src={currentWorkspace.logoUrl} alt="" className="h-6 w-6 object-contain" />
              ) : (
                currentWorkspace?.initials || "AM"
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {currentWorkspace?.name || "Agency workspace"}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Sidebar Area */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden px-3 py-4 immimate-scroll">
          <nav className={cn("flex flex-col gap-0.5", isCollapsed && "items-center")}>
            {sidebarNavItems.map(renderNavLink)}
          </nav>
          
          <div className={cn("mt-8 flex flex-col gap-0.5 pt-4", isCollapsed && "items-center")}>
            {sidebarBottomItems.map(renderNavLink)}
          </div>
        </div>


        {/* Practitioner Profiles & Collapse toggle */}
        <div className="flex items-center justify-between border-t border-slate-200 p-3">
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <div 
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#111111" }}
              >
                {user?.avatar || "JD"}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-slate-800 leading-tight">
                  {user?.name || "Jane Doe"}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className={cn("flex flex-1 flex-col transition-all duration-300 overflow-x-hidden", isCollapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
        


        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 md:px-6 backdrop-blur-md">
          <div className="flex flex-1 items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-xl text-gray-500 hover:bg-gray-100"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <SearchTrigger />
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationCenter />
            
            <span className="mx-1 hidden h-6 w-px bg-slate-200/80 sm:block"></span>
            
            {/* Dynamic Workspace Initials / Role Widget */}
            <div className="hidden flex-col items-end sm:flex text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name || "Jane Doe"}</span>
              <span className="text-xs font-medium text-slate-500 mt-0.5">{currentRole} Access</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full px-0 hover:bg-transparent ml-1">
                  <div 
                    className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ring-white"
                    style={{ backgroundColor: "#111111" }}
                  >
                    {user?.avatar || "JD"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl border-slate-200 bg-white p-2 shadow-lg" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-gray-900">{user?.name || "Jane Doe"}</p>
                    <p className="text-xs font-medium text-gray-500 leading-none mt-1">
                      {user?.email || "jane@migrationpractice.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem 
                  onClick={() => router.push(`/workspace/${currentSlug}/settings`)}
                  className="rounded-lg cursor-pointer font-semibold text-gray-700 focus:bg-gray-50 p-2.5 transition-colors"
                >
                  <UserIcon className="mr-2 h-4 w-4 text-gray-400" />
                  Profile Configuration
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push(`/workspace/${currentSlug}/settings/team`)}
                  className="rounded-lg cursor-pointer font-semibold text-gray-700 focus:bg-gray-50 p-2.5 transition-colors"
                >
                  <Users className="mr-2 h-4 w-4 text-gray-400" />
                  Team Setup
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem 
                  onClick={handleLogoutClick}
                  className="rounded-lg cursor-pointer font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 p-2.5 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4 text-red-500" />
                  Terminate Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-7 sm:px-7 lg:px-10 lg:py-9 flex flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-gray-100 bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <Link href={`/workspace/${currentSlug}/dashboard`} className="flex items-center gap-2">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-xl font-black text-white text-xs shadow-subtle shrink-0"
              style={{ backgroundColor: "#111111" }}
            >
              {currentWorkspace?.initials || "AM"}
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              {currentWorkspace?.name || "ImmiMate"}
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-500 hover:bg-gray-100" onClick={toggleMobileMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex flex-col gap-2">
          {sidebarNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && !item.href.endsWith("/dashboard"))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className={cn(
                  "flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-[#111111]" : "text-gray-400")} />
                {item.title}
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-8 border-t border-gray-100 pt-8 flex flex-col gap-2">
          {sidebarBottomItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && !item.href.endsWith("/dashboard"))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className={cn(
                  "flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#FAFAFA] text-[#111111] border border-[#E7E7E7]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-[#111111]" : "text-gray-400")} />
                {item.title}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
      <GlobalSearchModal />
    </CommandPaletteProvider>
  )
}
