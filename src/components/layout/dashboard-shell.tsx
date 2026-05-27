"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "./page-transition"
import { useAuthStore, User } from "@/store/authStore"
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
  FileText,
  Send,
  FolderOpen,
  BarChart,
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
  Sliders
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
    title: "Agreements",
    href: "/agreements",
    icon: FileSignature,
  },
  {
    title: "Send Document",
    href: "/documents/send",
    icon: Send,
  },
  {
    title: "Document Library",
    href: "/documents/library",
    icon: FolderOpen,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileText,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart,
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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // Auth Store bindings
  const { 
    user, 
    activeWorkspace, 
    simulatedRole, 
    workspaces, 
    switchWorkspace, 
    switchRole,
    logout 
  } = useAuthStore()

  // Use dynamic fallback if not logged in (to prevent workspace crashes during hot reload)
  const currentWorkspace = activeWorkspace || workspaces[0]
  const currentRole = simulatedRole || user?.role || "Owner"
  const currentSlug = currentWorkspace?.slug || "avc-migration"

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  // Role Permissions Checks
  const hasBillingAccess = currentRole === "Owner" || currentRole === "Admin"
  const hasSettingsAccess = currentRole !== "Assistant" && currentRole !== "Read-only staff"

  const handleWorkspaceChange = (slug: string) => {
    switchWorkspace(slug)
    // Extract remaining route path if possible
    let remainingPath = "/dashboard"
    if (pathname) {
      const parts = pathname.split("/")
      if (parts.length > 3) {
        remainingPath = "/" + parts.slice(3).join("/")
      }
    }
    router.push(`/workspace/${slug}${remainingPath}`)
  }

  const handleLogoutClick = () => {
    logout()
    router.push("/login")
  }

  // Prefix routes with dynamic tenant base
  const sidebarNavItems = rawSidebarNavItems.map(item => ({
    ...item,
    href: `/workspace/${currentSlug}${item.href}`
  }))

  const sidebarBottomItems = rawSidebarBottomItems.map(item => ({
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
          className="group relative flex items-center rounded-xl px-3 py-2.5 text-[13px] font-semibold text-emerald-100/20 cursor-not-allowed select-none border border-transparent"
          title={`Restricted: ${currentRole} cannot access this page`}
        >
          <Icon className="shrink-0 mr-3 h-[18px] w-[18px] text-emerald-100/10" />
          {!isCollapsed && (
            <span className="flex items-center justify-between w-full">
              <span>{item.title}</span>
              <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-black">
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
          "group relative flex items-center rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-300 ease-out border border-transparent",
          isActive
            ? "border-white/[0.08] bg-gradient-to-r from-white/[0.09] to-white/[0.02] text-white shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_1px_rgba(255,255,255,0.06)]"
            : "text-emerald-100/60 hover:bg-white/[0.045] hover:text-white"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#33C48D] to-[#0D9F8C] shadow-[0_0_12px_rgba(51,196,141,0.85)]" />
        )}
        <Icon 
          className={cn(
            "shrink-0 transition-all duration-300 ease-out", 
            isCollapsed ? "mr-0 h-[18px] w-[18px]" : "mr-3 h-[18px] w-[18px]", 
            isActive ? "text-[#33C48D] scale-[1.05]" : "text-emerald-100/40 group-hover:text-emerald-100/75 group-hover:scale-105"
          )} 
        />
        {!isCollapsed && <span className="transition-all duration-300">{item.title}</span>}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F4F8F6] font-sans text-[#081B2E] app-grain">
      
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-white/5 bg-[radial-gradient(circle_at_15%_0%,rgba(51,196,141,0.12),transparent_35%),linear-gradient(180deg,#021815_0%,#011210_60%,#000a08_100%)] transition-all duration-300 lg:flex shadow-[20px_0_60px_rgba(2,18,16,0.35),inset_-1px_0_0_rgba(255,255,255,0.02)]",
          isCollapsed ? "w-[84px]" : "w-[272px]"
        )}
      >
        {/* Dynamic Workspace Switcher Dropdown */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.05] px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-left text-white transition-all hover:bg-white/[0.07] focus:outline-none w-full",
                  isCollapsed && "mx-auto p-1 text-center justify-center border-none bg-transparent"
                )}
              >
                <div 
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-white text-xs shadow-md transition-all"
                  style={{ backgroundColor: currentWorkspace?.color || "#0D9F8C" }}
                >
                  {currentWorkspace?.initials || "AM"}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate leading-tight">
                        {currentWorkspace?.name || "Singh & Associates"}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-100/40 mt-0.5 truncate uppercase tracking-widest">
                        Tenant Workspace
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-emerald-100/50 shrink-0 ml-1" />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl border-white/5 bg-[#011210]/95 text-emerald-100 p-2 shadow-elevated backdrop-blur-xl" align="start">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-emerald-100/40 uppercase tracking-widest">
                Active Tenant Spaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {workspaces.map((w) => {
                const isSelected = w.slug === currentSlug
                return (
                  <DropdownMenuItem
                    key={w.slug}
                    onClick={() => handleWorkspaceChange(w.slug)}
                    className={cn(
                      "rounded-xl p-2.5 cursor-pointer font-bold text-xs flex items-center gap-3 transition-colors text-emerald-100 focus:bg-white/[0.06]",
                      isSelected && "bg-white/[0.04] text-white border border-white/5"
                    )}
                  >
                    <div 
                      className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg font-black text-white text-xxs"
                      style={{ backgroundColor: w.color }}
                    >
                      {w.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-white">{w.name}</div>
                      <div className="text-[9px] font-bold text-emerald-150/40 mt-0.5 font-mono truncate">
                        /{w.slug}
                      </div>
                    </div>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Navigation Sidebar Area */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden px-4 py-5">
          <nav className={cn("flex flex-col gap-1", isCollapsed && "items-center")}>
            {sidebarNavItems.map(renderNavLink)}
          </nav>
          
          <div className={cn("mt-8 flex flex-col gap-1 border-t border-white/[0.05] pt-5", isCollapsed && "items-center")}>
            {sidebarBottomItems.map(renderNavLink)}
          </div>
        </div>

        {/* DEVELOPER SIMULATOR SWITCHER PANEL */}
        {!isCollapsed && (
          <div className="mx-4 my-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-white">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#33C48D] mb-2">
              <Sliders className="h-3.5 w-3.5" />
              Permission Simulator
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg bg-black/30 px-2 py-1.5 text-left text-xs font-bold text-emerald-50 hover:bg-black/50 border border-white/5">
                  <span className="truncate">{currentRole}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-emerald-100/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 rounded-xl border-white/5 bg-[#011210] text-emerald-100 p-1.5 shadow-elevated" align="start">
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-black uppercase text-emerald-100/40">
                  Simulate Practitioner Role
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {(["Owner", "Admin", "Migration Agent", "Case Manager", "Assistant", "Read-only staff"] as User["role"][]).map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => switchRole(r)}
                    className={cn(
                      "rounded-lg p-2 cursor-pointer text-xs font-bold transition-colors focus:bg-white/[0.06] text-emerald-100",
                      currentRole === r && "bg-white/[0.04] text-white"
                    )}
                  >
                    {r}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <p className="mt-2 text-[9px] text-emerald-100/30 leading-normal font-medium">
              Swapping roles instantly adjusts active navigation visibility and security lockout policies.
            </p>
          </div>
        )}

        {/* Practitioner Profiles & Collapse toggle */}
        <div className="flex items-center justify-between border-t border-white/[0.05] bg-black/20 p-4">
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div 
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black text-white shadow-md"
                style={{ backgroundColor: currentWorkspace?.color || "#0D9F8C" }}
              >
                {user?.avatar || "JD"}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-white leading-tight">
                  {user?.name || "Jane Doe"}
                </span>
                <span className="text-[10px] font-bold text-emerald-100/40 mt-0.5 font-mono">
                  {user?.marn ? `MARN ${user.marn}` : "Assistant Access"}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-xl text-emerald-100/40 hover:bg-white/10 hover:text-white"
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className={cn("flex flex-1 flex-col transition-all duration-300", isCollapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
        
        {/* Dynamic Simulated Role Banner Alert */}
        {simulatedRole && simulatedRole !== user?.role && (
          <div className="bg-amber-600 px-6 py-2 text-center text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              <strong>Developer Simulator Active:</strong> You are viewing the platform as an <strong className="underline">{currentRole}</strong> user. Original session account: {user?.email}.
            </span>
          </div>
        )}

        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-4 border-b border-slate-200/40 bg-white/70 px-6 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_12px_32px_rgba(8,27,46,0.02)] backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-xl text-gray-500 hover:bg-gray-100"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="relative hidden w-full max-w-xl md:flex">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="Search agreements, clients, documents..."
                className="h-11 w-full rounded-2xl border-slate-200/50 bg-white/80 pl-11 pr-4 font-semibold shadow-[0_8px_20px_rgba(8,27,46,0.02)] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-subtle transition-all duration-200">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 rounded-2xl border-slate-200/60 bg-white/95 p-2 shadow-elevated backdrop-blur-xl" align="end">
                <DropdownMenuLabel className="p-3">
                  <div className="text-sm font-black text-[#081B2E]">Notifications</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Practice activity alerts</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                {[
                  "Harpreet Kaur signed an agreement",
                  "Payment received for INV-1048",
                  "Partner Visa template updated",
                ].map((item) => (
                  <DropdownMenuItem key={item} className="rounded-lg p-3">
                    <span className="mr-3 h-2 w-2 rounded-full bg-[#0D9F8C]" />
                    <span className="text-sm font-semibold text-slate-700">{item}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <span className="mx-1 hidden h-6 w-px bg-slate-200/80 sm:block"></span>
            
            {/* Dynamic Workspace Initials / Role Widget */}
            <div className="hidden flex-col items-end sm:flex text-right">
              <span className="text-xs font-black text-[#081B2E]">{user?.name || "Jane Doe"}</span>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">{currentRole} Badge</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full px-0 hover:bg-transparent">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-black text-white shadow-[0_12px_28px_rgba(13,159,140,0.22)] ring-1 ring-emerald-900/5 transition-transform hover:scale-105 duration-300"
                    style={{ backgroundColor: currentWorkspace?.color || "#0D9F8C" }}
                  >
                    {user?.avatar || "JD"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl border-white/70 bg-white/95 p-2 shadow-elevated backdrop-blur-xl" align="end" forceMount>
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
              style={{ backgroundColor: currentWorkspace?.color || "#0D9F8C" }}
            >
              {currentWorkspace?.initials || "AM"}
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              {currentWorkspace?.name || "ImmiSign"}
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
                    ? "bg-emerald-50 text-[#0D9F8C]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-[#0D9F8C]" : "text-gray-400")} />
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
                    ? "bg-emerald-50 text-[#0D9F8C]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-[#0D9F8C]" : "text-gray-400")} />
                {item.title}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
