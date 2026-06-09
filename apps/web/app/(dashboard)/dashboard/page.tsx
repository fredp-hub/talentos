import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getScoreColor, formatScore, capitalize } from '@/lib/utils'
import {
  Users, TrendingUp, Award, Briefcase, UserPlus, Sparkles, Mail, ArrowRight, ListChecks,
} from 'lucide-react'
import type { Database } from '@talentos/types'
import { PipelineBreakdown } from '@/components/dashboard/pipeline-breakdown'
import { CampaignFunnel } from '@/components/dashboard/campaign-funnel'

type PipelineRow = Database['public']['Views']['v_candidate_pipeline']['Row']

// ── Top metrics ─────────────────────────────────────────────────────────────

async function Metrics() {
  const supabase = await createClient()
  const [activeRes, scoreRes, certRes, placementRes] = await Promise.all([
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('candidate_scores').select('overall_score').eq('is_current', true),
    supabase.from('certifications').select('*', { count: 'exact', head: true }).eq('status', 'certified'),
    supabase.from('placements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  const scoreData = scoreRes.data as { overall_score: number }[] | null
  const avg = scoreData && scoreData.length > 0 ? scoreData.reduce((s, r) => s + r.overall_score, 0) / scoreData.length : null

  const metrics = [
    { label: 'Active Candidates', value: activeRes.count ?? 0, icon: Users, href: '/dashboard/candidates' },
    { label: 'Avg Score', value: avg != null ? formatScore(avg) : '—', icon: TrendingUp, href: '/dashboard/candidates', accent: avg != null ? getScoreColor(avg) : '' },
    { label: 'AI-Ready Certified', value: certRes.count ?? 0, icon: Award, href: '/dashboard/candidates' },
    { label: 'Active Placements', value: placementRes.count ?? 0, icon: Briefcase, href: '/dashboard/outreach' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <Link key={m.label} href={m.href}>
            <Card className="hover:shadow-soft transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className={`text-3xl font-semibold tracking-tight ${m.accent ?? ''}`}>{m.value}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

// ── Campaign priority counts ─────────────────────────────────────────────────

async function CampaignStats() {
  const supabase = await createClient()
  const q = (status: string) =>
    (supabase as any).from('candidates').select('*', { count: 'exact', head: true }).eq('source', 'ilabor').eq('outreach_status', status)

  const [notContacted, awaiting, stage2, ready] = await Promise.all([
    (supabase as any).from('candidates').select('*', { count: 'exact', head: true }).eq('source', 'ilabor').eq('outreach_status', 'not_contacted').in('campaign_tier', ['A', 'B']),
    q('outreach_sent'),
    q('stage2_complete'),
    q('stage3_complete'),
  ])

  const items = [
    { label: 'Ready to contact', count: notContacted.count ?? 0, href: '/dashboard/outreach?status=not_contacted' },
    { label: 'Awaiting reply', count: awaiting.count ?? 0, href: '/dashboard/outreach?status=outreach_sent' },
    { label: 'Survey complete', count: stage2.count ?? 0, href: '/dashboard/outreach?status=stage2_complete' },
    { label: 'Ready to submit', count: ready.count ?? 0, href: '/dashboard/outreach?status=stage3_complete' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className="rounded-xl border border-border/70 bg-card p-4 hover:shadow-soft transition-shadow">
          <p className="text-2xl font-semibold tracking-tight">{i.count.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{i.label}</p>
        </Link>
      ))}
    </div>
  )
}

// ── Recent candidates ─────────────────────────────────────────────────────────

async function RecentCandidates() {
  const supabase = await createClient()
  const { data: rawData } = await supabase
    .from('v_candidate_pipeline')
    .select('*')
    .order('id', { ascending: false })
    .limit(8)
  const data = rawData as PipelineRow[] | null

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No candidates yet.</p>
  }

  return (
    <div className="divide-y divide-border/70">
      {data.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/candidates/${c.id}`}
          className="flex items-center justify-between py-3 hover:bg-secondary/40 -mx-2 px-2 rounded-lg transition-colors"
        >
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{c.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{c.email}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {c.overall_score != null && (
              <span className={`text-sm font-semibold tabular-nums ${getScoreColor(c.overall_score)}`}>
                {formatScore(c.overall_score)}
              </span>
            )}
            <Badge variant={c.status === 'active' ? 'success' : c.status === 'placed' ? 'default' : 'secondary'}>
              {capitalize(c.status ?? '')}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hero / quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1 text-sm">Here&apos;s what needs your attention today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/candidates/add"><UserPlus className="h-4 w-4" /> Add Candidate</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/assistant"><Sparkles className="h-4 w-4" /> Ask the Assistant</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<CardSkeleton />}>
        <Metrics />
      </Suspense>

      {/* Pipeline + recent, two columns */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Pipeline — who&apos;s waiting on what</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <PipelineBreakdown />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Candidates</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/candidates">All <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <RecentCandidates />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Campaign */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" /> iLabor Campaign
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/outreach">Open campaign <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-20 w-full rounded-2xl" />}>
            <CampaignStats />
          </Suspense>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
            <CardContent><CampaignFunnel /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
