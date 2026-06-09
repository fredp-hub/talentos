'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  User,
  FileText,
  Sparkles,
  UserPlus,
  Send,
  CornerDownLeft,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'candidate' | 'requisition' | 'action'
  id: string
  title: string
  subtitle?: string
  href: string
  icon: React.ElementType
}

const QUICK_ACTIONS: SearchResult[] = [
  { type: 'action', id: 'a-assistant', title: 'Ask the AI Assistant', subtitle: 'Recommendations, interview questions, and more', href: '/dashboard/assistant', icon: Sparkles },
  { type: 'action', id: 'a-add', title: 'Add a candidate', href: '/dashboard/candidates/add', icon: UserPlus },
  { type: 'action', id: 'a-outreach', title: 'Open outreach campaign', href: '/dashboard/outreach', icon: Send },
]

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search candidates + requisitions
  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      const term = `%${q}%`
      const [candRes, reqRes] = await Promise.all([
        (supabase as any)
          .from('candidates')
          .select('id, full_name, email, source_job_title, primary_stack')
          .or(`full_name.ilike.${term},email.ilike.${term},source_job_title.ilike.${term}`)
          .limit(6),
        (supabase as any)
          .from('requisitions')
          .select('id, title, customer, req_id')
          .or(`title.ilike.${term},customer.ilike.${term}`)
          .limit(4),
      ])

      const candidateResults: SearchResult[] = (candRes.data ?? []).map((c: any) => ({
        type: 'candidate',
        id: c.id,
        title: c.full_name,
        subtitle: c.source_job_title ?? c.email ?? (c.primary_stack?.slice(0, 3).join(', ')),
        href: `/dashboard/candidates/${c.id}`,
        icon: User,
      }))
      const reqResults: SearchResult[] = (reqRes.data ?? []).map((r: any) => ({
        type: 'requisition',
        id: r.id,
        title: r.title,
        subtitle: [r.customer, r.req_id && `#${r.req_id}`].filter(Boolean).join(' · '),
        href: `/dashboard/requisitions/${r.id}`,
        icon: FileText,
      }))

      setResults([...candidateResults, ...reqResults])
      setActive(0)
      setLoading(false)
    },
    [supabase]
  )

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 180)
    return () => clearTimeout(debounceRef.current)
  }, [query, runSearch])

  const shown = query.trim() ? results : QUICK_ACTIONS

  const go = useCallback(
    (r: SearchResult) => {
      onOpenChange(false)
      router.push(r.href)
    },
    [router, onOpenChange]
  )

  // Keyboard nav
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, shown.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (shown[active]) go(shown[active])
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => onOpenChange(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-card shadow-soft-xl overflow-hidden animate-in-up">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border/70">
          {loading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search candidates, requisitions, or jump to…"
            className="flex-1 h-14 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded-md border border-border bg-secondary px-1.5 text-2xs font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim() && results.length === 0 && !loading && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              <button
                onClick={() => go({ type: 'action', id: 'ai', title: '', href: `/dashboard/assistant?q=${encodeURIComponent(query)}`, icon: Sparkles })}
                className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                <Sparkles className="h-4 w-4" /> Ask the AI Assistant instead
              </button>
            </div>
          )}

          {!query.trim() && (
            <p className="px-3 pt-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Quick actions
            </p>
          )}

          {shown.map((r, i) => {
            const Icon = r.icon
            return (
              <button
                key={r.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  active === i ? 'bg-secondary' : 'hover:bg-secondary/60'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                    r.type === 'candidate' && 'bg-primary/10 text-primary',
                    r.type === 'requisition' && 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
                    r.type === 'action' && 'bg-secondary text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                </div>
                {active === i && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
