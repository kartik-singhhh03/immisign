"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "./page-transition"
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
  User,
  Users,
} from "lucide-react"

type SidebarNavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const sidebarNavItems = [
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

const sidebarBottomItems = [
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
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  const renderNavLink = (item: SidebarNavItem) => {
    const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/dashboard')
    const Icon = item.icon
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
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.05] px-6">
          <Link href="/dashboard" className={cn("flex items-center gap-2", isCollapsed && "mx-auto px-0")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#33C48D] to-[#0D9F8C] shadow-[0_8px_20px_rgba(13,159,140,0.22),inset_0_1px_0_rgba(255,255,255,0.25)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            {!isCollapsed && <span className="text-xl font-black tracking-[-0.04em] text-white">ImmiSign</span>}
          </Link>
        </div>
        
        <div className="flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden px-4 py-5">
          <nav className={cn("flex flex-col gap-1", isCollapsed && "items-center")}>
            {sidebarNavItems.map(renderNavLink)}
          </nav>
          
          <div className={cn("mt-8 flex flex-col gap-1 border-t border-white/[0.05] pt-5", isCollapsed && "items-center")}>
            {sidebarBottomItems.map(renderNavLink)}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.05] bg-black/20 p-4">
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                RS
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-white leading-tight">Rajwant Singh</span>
                <span className="text-[11px] font-semibold text-emerald-100/40 mt-0.5">MARN 1794016</span>
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

      {/* Main Content */}
      <div className={cn("flex flex-1 flex-col transition-all duration-300", isCollapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full px-0 hover:bg-transparent">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#33C48D,#0D9F8C)] text-sm font-black text-white shadow-[0_12px_28px_rgba(13,159,140,0.22)] ring-1 ring-emerald-900/5 transition-transform hover:scale-105">
                    JD
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl border-white/70 bg-white/95 p-2 shadow-elevated backdrop-blur-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-gray-900">Jane Doe</p>
                    <p className="text-xs font-medium text-gray-500 leading-none mt-1">
                      jane@migrationpractice.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem className="rounded-lg cursor-pointer font-semibold text-gray-700 focus:bg-gray-50 p-2.5 transition-colors">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer font-semibold text-gray-700 focus:bg-gray-50 p-2.5 transition-colors">
                  <Settings className="mr-2 h-4 w-4 text-gray-400" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem className="rounded-lg cursor-pointer font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 p-2.5 transition-colors">
                  <LogOut className="mr-2 h-4 w-4 text-red-500" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dashboard Content */}
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0D9F8C] shadow-subtle shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">ImmiSign</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-500 hover:bg-gray-100" onClick={toggleMobileMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-2">
          {sidebarNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/dashboard')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className={cn(
                  "flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#0D9F8C]/10 text-[#0D9F8C]"
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
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/dashboard')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className={cn(
                  "flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#0D9F8C]/10 text-[#0D9F8C]"
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
