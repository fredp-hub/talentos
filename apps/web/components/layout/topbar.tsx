'use client'

import { Search, ChevronDown } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './command-palette'
import type { UserRole } from '@talentos/types'

function deriveTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Home'
  if (pathname.startsWith('/dashboard/assistant')) return 'AI Assistant'
  if (pathname.startsWith('/dashboard/candidates/add')) return 'Add Candidate'
  if (pathname.startsWith('/dashboard/candidates/import')) return 'Import Candidates'
  if (pathname.startsWith('/dashboard/candidates')) return 'Candidates'
  if (pathname.startsWith('/dashboard/requisitions')) return 'Requisitions'
  if (pathname.startsWith('/dashboard/outreach')) return 'Outreach'
  if (pathname.startsWith('/dashboard/assessments')) return 'Assessments'
  if (pathname.startsWith('/dashboard/analytics')) return 'Analytics'
  if (pathname.startsWith('/dashboard/certifications')) return 'Certifications'
  if (pathname.startsWith('/dashboard/placements')) return 'Placements'
  if (pathname.startsWith('/dashboard/clients')) return 'Clients'
  return 'TalentOS'
}

const roleBadgeColor: Record<UserRole, string> = {
  admin: 'bg-primary/10 text-primary',
  recruiter: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  client: 'bg-secondary text-secondary-foreground',
}

interface TopbarProps {
  title?: string
  userEmail?: string
  userName?: string
  userRole?: UserRole
}

export function Topbar({ userEmail, userName, userRole }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const title = deriveTitle(pathname)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K to open command palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/70 glass px-6">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card px-3.5 h-9 text-sm text-muted-foreground w-64 shadow-xs hover:border-input transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 text-2xs font-medium">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="md:hidden rounded-full p-2 hover:bg-secondary transition-colors"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-secondary transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-soft-sm">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{userName ?? userEmail}</p>
              {userRole && (
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-2xs font-medium', roleBadgeColor[userRole])}>
                  {userRole}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border/70 bg-card shadow-soft-lg py-1.5 animate-in-up">
                <div className="px-3 py-2 border-b border-border/70">
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors rounded-lg mx-1"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
