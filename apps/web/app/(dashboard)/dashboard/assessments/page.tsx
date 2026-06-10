'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sparkles, Link2, Copy, CheckCircle2, Loader2, ClipboardList, Clock, ArrowUpRight,
} from 'lucide-react'

interface SurveyLite { candidate_id: string; status: string }
interface CandidateRow {
  id: string
  full_name: string
  source_job_title: string | null
  email: string | null
  survey_completed_at: string | null
  personality_summary: string | null
  personality_scores: Record<string, number> | null
}

type Status = 'completed' | 'pending' | 'none'

function avgScore(scores: Record<string, number> | null): number | null {
  if (!scores) return null
  const vals = Object.values(scores)
  if (vals.length === 0) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export default function AssessmentsPage() {
  const supabase = createClient()
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [generating, setGenerating] = useState<string | null>(null)
  const [linkModal, setLinkModal] = useState<{ name: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [candRes, surveyRes] = await Promise.all([
      (supabase as any)
        .from('candidates')
        .select('id, full_name, source_job_title, email, survey_completed_at, personality_summary, personality_scores')
        .order('survey_completed_at', { ascending: false, nullsFirst: false }),
      (supabase as any)
        .from('candidate_surveys')
        .select('candidate_id, status')
        .eq('status', 'pending'),
    ])
    setCandidates(candRes.data ?? [])
    setPendingSet(new Set((surveyRes.data ?? []).map((s: SurveyLite) => s.candidate_id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const statusOf = (c: CandidateRow): Status =>
    c.survey_completed_at ? 'completed' : pendingSet.has(c.id) ? 'pending' : 'none'

  const generate = async (c: CandidateRow) => {
    setGenerating(c.id)
    try {
      const res = await fetch('/api/survey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: c.id }),
      })
      const json = await res.json()
      if (json.link) {
        setLinkModal({ name: c.full_name, link: json.link })
        setPendingSet((s) => new Set(s).add(c.id))
      }
    } finally {
      setGenerating(null)
    }
  }

  const filtered = candidates.filter((c) => {
    const st = statusOf(c)
    if (filter !== 'all' && st !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!c.full_name?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s)) return false
    }
    return true
  })

  const counts = {
    completed: candidates.filter((c) => statusOf(c) === 'completed').length,
    pending: candidates.filter((c) => statusOf(c) === 'pending').length,
    none: candidates.filter((c) => statusOf(c) === 'none').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI-designed personality + skills surveys. Send a link, and results are scored automatically.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Assessed', value: counts.completed, icon: CheckCircle2, color: 'text-[hsl(var(--success))]' },
          { label: 'Awaiting response', value: counts.pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Not started', value: counts.none, icon: ClipboardList, color: 'text-muted-foreground' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All candidates</SelectItem>
            <SelectItem value="completed">Assessed</SelectItem>
            <SelectItem value="pending">Awaiting response</SelectItem>
            <SelectItem value="none">Not started</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-soft-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No candidates match.</TableCell></TableRow>
              ) : (
                filtered.map((c) => {
                  const st = statusOf(c)
                  const score = avgScore(c.personality_scores)
                  return (
                    <TableRow key={c.id} className="hover:bg-secondary/30">
                      <TableCell>
                        <Link href={`/dashboard/candidates/${c.id}`} className="group">
                          <p className="font-medium text-sm flex items-center gap-1">
                            {c.full_name}
                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-xs text-muted-foreground">{c.source_job_title ?? c.email ?? '—'}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {st === 'completed' && <Badge variant="success">Assessed</Badge>}
                        {st === 'pending' && <Badge variant="warning">Awaiting response</Badge>}
                        {st === 'none' && <Badge variant="secondary">Not started</Badge>}
                      </TableCell>
                      <TableCell>
                        {score != null ? <span className="text-sm font-semibold tabular-nums">{score}</span> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.survey_completed_at ? new Date(c.survey_completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {st === 'completed' ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/candidates/${c.id}`}>View results</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant={st === 'pending' ? 'ghost' : 'outline'} onClick={() => generate(c)} disabled={generating === c.id}>
                            {generating === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : st === 'pending' ? <Link2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {st === 'pending' ? 'New link' : 'Send survey'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Link modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLinkModal(null)}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-card shadow-soft-xl p-6 animate-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Survey link for {linkModal.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">Send this to the candidate. Results score automatically and land on their profile.</p>
            <div className="mt-4 rounded-xl border border-border/70 bg-secondary/40 p-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-mono truncate">{linkModal.link}</span>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(linkModal.link); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setLinkModal(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
