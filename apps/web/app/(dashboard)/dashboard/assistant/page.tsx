'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Send,
  Users,
  MessageSquareText,
  Lightbulb,
  Target,
  ArrowUpRight,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface RecommendedCandidate {
  id: string
  name: string
  reason: string
  stack: string[]
  tier: string | null
  score: number | null
  availability: string | null
  rate: number | null
  background: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  candidates?: RecommendedCandidate[]
  followups?: string[]
}

const CAPABILITIES = [
  {
    icon: Target,
    title: 'Recommend candidates',
    prompt: 'Which candidates are the strongest fit for our highest-priority open requisitions right now? Rank them and explain why.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: MessageSquareText,
    title: 'Draft interview questions',
    prompt: 'Generate a tailored interview guide for my top-matched candidate against their best-fit role — mix technical depth and behavioral signal.',
    color: 'text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)]',
  },
  {
    icon: Lightbulb,
    title: 'Surface what I missed',
    prompt: "What am I missing? Flag strong candidates going stale, rate or margin risks, and any non-obvious candidate-to-role matches I haven't acted on.",
    color: 'text-amber-600 bg-amber-500/12',
  },
  {
    icon: Users,
    title: 'Find placements',
    prompt: 'Look across all my available candidates and open requisitions and suggest the placements with the best margin and likelihood of closing.',
    color: 'text-violet-600 bg-violet-500/12',
  },
]

const TIER_STYLE: Record<string, string> = {
  A: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  B: 'bg-primary/10 text-primary',
  C: 'bg-secondary text-muted-foreground',
}

// ── Candidate card (rendered inline in assistant answers) ───────────────────

function CandidateCard({ c }: { c: RecommendedCandidate }) {
  return (
    <Link
      href={`/dashboard/candidates/${c.id}`}
      className="group block rounded-xl border border-border/70 bg-card p-4 hover:shadow-soft hover:border-input transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1.5">
              {c.name}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            {c.background && <p className="text-xs text-muted-foreground truncate">{c.background}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.tier && c.tier !== 'unscored' && (
            <Badge className={cn('text-2xs', TIER_STYLE[c.tier] ?? '')}>{c.tier}</Badge>
          )}
          {c.score != null && (
            <span className="text-sm font-semibold tabular-nums">{Math.round(c.score)}</span>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{c.reason}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {c.stack?.slice(0, 5).map((s) => (
          <span key={s} className="text-2xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{s}</span>
        ))}
        {c.availability && (
          <span className="text-2xs text-muted-foreground ml-auto capitalize">{c.availability.replace('_', ' ')}</span>
        )}
      </div>
    </Link>
  )
}

// ── Message rendering ───────────────────────────────────────────────────────

function AssistantMessage({ msg, onFollowup }: { msg: Message; onFollowup: (q: string) => void }) {
  return (
    <div className="flex gap-3 animate-in-up">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-soft-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="prose-sm text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
          {msg.content}
        </div>
        {msg.candidates && msg.candidates.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {msg.candidates.map((c) => <CandidateCard key={c.id} c={c} />)}
          </div>
        )}
        {msg.followups && msg.followups.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {msg.followups.map((f) => (
              <button
                key={f}
                onClick={() => onFollowup(f)}
                className="text-sm text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-full px-3.5 py-1.5 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-in-up">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 text-[15px] shadow-soft-sm">
        {content}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

function AssistantInner() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedFromQuery = useRef(false)

  const hasConversation = messages.length > 0

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const json = await res.json()
      if (json.error) {
        setMessages((m) => [...m, { role: 'assistant', content: `Sorry — ${json.error}. Please try again.` }])
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: json.answer, candidates: json.candidates, followups: json.followups },
        ])
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong reaching the assistant. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit from ?q= (e.g. from command palette "ask AI instead")
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !startedFromQuery.current) {
      startedFromQuery.current = true
      send(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] -mt-2">
      {/* Empty state — hero */}
      {!hasConversation && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 ai-glow rounded-3xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-soft-lg mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">How can I help you place talent?</h1>
          <p className="mt-3 text-muted-foreground max-w-md text-[15px]">
            I can reason over your candidates and open roles to recommend placements, write interview
            guides, and surface opportunities you haven&apos;t spotted yet.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 w-full max-w-2xl">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon
              return (
                <button
                  key={cap.title}
                  onClick={() => send(cap.prompt)}
                  className="group text-left rounded-2xl border border-border/70 bg-card p-4 hover:shadow-soft hover:border-input transition-all active:scale-[0.99]"
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl mb-3', cap.color)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <p className="font-medium text-[15px]">{cap.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{cap.prompt}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Conversation */}
      {hasConversation && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-1 pb-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage key={i} content={m.content} />
            ) : (
              <AssistantMessage key={i} msg={m} onFollowup={send} />
            )
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-soft-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm pt-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing your candidates and open roles…
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <div className="pt-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="relative flex items-end gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-soft focus-within:border-input focus-within:shadow-soft-lg transition-all"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="Ask anything — “who should I submit to the Amtrak data engineer role?”"
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground max-h-40"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-center text-2xs text-muted-foreground mt-2">
          The assistant reasons over your live candidate and requisition data.
        </p>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <AssistantInner />
    </Suspense>
  )
}
