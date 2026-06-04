'use client'

import { Bell, Search, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@talentos/types'

const roleBadgeColor: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  recruiter: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  client: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

interface TopbarProps {
  title: string
  userEmail?: string
  userName?: string
  userRole?: UserRole
}

export function Topbar({ title, userEmail, userName, userRole }: TopbarProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card px-6">
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground w-56">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search…</span>
      </div>

      {/* Notifications */}
      <button className="relative rounded-md p-2 hover:bg-accent transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-none">{userName ?? userEmail}</p>
            {userRole && (
              <span
                className={cn(
                  'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                  roleBadgeColor[userRole]
                )}
              >
                {userRole}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-card shadow-lg py-1">
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
