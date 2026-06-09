'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Send,
  Sparkles,
  UserPlus,
  LogOut,
  ClipboardList,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// Primary spine — the product's core loop, AI Assistant featured
const primaryNav = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Assistant', href: '/dashboard/assistant', icon: Sparkles, featured: true },
  { label: 'Candidates', href: '/dashboard/candidates', icon: Users },
  { label: 'Requisitions', href: '/dashboard/requisitions', icon: FileText },
  { label: 'Outreach', href: '/dashboard/outreach', icon: Send },
]

// Secondary — supporting tools, visually de-emphasized
const secondaryNav = [
  { label: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] min-h-screen border-r border-border/70 bg-card/60 shrink-0">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">TalentOS</span>
        </div>

        {/* Primary CTA */}
        <div className="px-4 pt-2 pb-1">
          <Link
            href="/dashboard/candidates/add"
            className="flex items-center justify-center gap-2 w-full rounded-full bg-primary text-primary-foreground h-10 text-sm font-medium shadow-soft-sm hover:bg-primary/90 hover:shadow-soft transition-all active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Add Candidate
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-card text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                  item.featured && !active && 'text-primary'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    item.featured && (active ? 'text-primary' : 'text-primary')
                  )}
                />
                {item.label}
                {item.featured && (
                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary">
                    AI
                  </span>
                )}
                {active && !item.featured && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
              </Link>
            )
          })}

          {/* Divider */}
          <div className="px-3 pt-5 pb-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Tools
            </p>
          </div>

          {secondaryNav.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                  active
                    ? 'bg-card text-foreground shadow-soft-sm font-medium'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border/70 px-3 py-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-all"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex glass border-t border-border/70 pb-[env(safe-area-inset-bottom)]">
        {primaryNav.map((item) => {
          const Icon = item.icon
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2.5 text-2xs gap-1 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label === 'AI Assistant' ? 'AI' : item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
