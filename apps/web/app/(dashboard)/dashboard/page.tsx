import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getScoreBg, formatScore, capitalize, formatDate } from '@/lib/utils'
import { Users, TrendingUp, Award, Briefcase, UserPlus, ClipboardList } from 'lucide-react'
import type { Database } from '@talentos/types'

type PipelineRow = Database['public']['Views']['v_candidate_pipeline']['Row']

async function DashboardMetrics() {
  const supabase = await createClient()

  const [activeCandidatesRes, scoreDataRes, aiReadyCertsRes, activePlacementsRes] =
    await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('candidate_scores').select('overall_score').eq('is_current', true),
      supabase.from('certifications').select('*', { count: 'exact', head: true }).eq('status', 'certified'),
      supabase.from('placements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

  const activeCandidates = activeCandidatesRes.count
  const aiReadyCerts = aiReadyCertsRes.count
  const activePlacements = activePlacementsRes.count
  const scoreData = scoreDataRes.data as { overall_score: number }[] | null

  const avgScore =
    scoreData && scoreData.length > 0
      ? scoreData.reduce((sum, r) => sum + r.overall_score, 0) / scoreData.length
      : null

  const metrics = [
    {
      label: 'Active Candidates',
      value: activeCandidates ?? 0,
      icon: Users,
      href: '/dashboard/candidates',
    },
    {
      label: 'Avg Overall Score',
      value: avgScore != null ? formatScore(avgScore) : '—',
      icon: TrendingUp,
      href: '/dashboard/candidates',
      scoreValue: avgScore,
    },
    {
      label: 'AI-Ready Certified',
      value: aiReadyCerts ?? 0,
      icon: Award,
      href: '/dashboard/certifications',
    },
    {
      label: 'Active Placements',
      value: activePlacements ?? 0,
      icon: Briefcase,
      href: '/dashboard/placements',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <Link key={m.label} href={m.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    m.scoreValue != null ? getScoreBg(m.scoreValue).split(' ')[1] : ''
                  }`}
                >
                  {m.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

async function RecentCandidates() {
  const supabase = await createClient()
  const { data: rawData } = await supabase
    .from('v_candidate_pipeline')
    .select('*')
    .order('id', { ascending: false })
    .limit(10)
  const data = rawData as PipelineRow[] | null

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No candidates yet — add your first one.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Name</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Seniority</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Score</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Cert</th>
            <th className="text-left py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((c) => (
            <tr key={c.id} className="hover:bg-muted/50 transition-colors">
              <td className="py-3 pr-4">
                <Link
                  href={`/dashboard/candidates/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.full_name}
                </Link>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="text-muted-foreground">
                  {capitalize(c.seniority_level ?? '')}
                </span>
              </td>
              <td className="py-3 pr-4">
                {c.overall_score != null ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreBg(
                      c.overall_score
                    )}`}
                  >
                    {formatScore(c.overall_score)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {c.cert_status ? (
                  <CertBadge status={c.cert_status} />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="py-3">
                <Badge
                  variant={
                    c.status === 'active'
                      ? 'success'
                      : c.status === 'placed'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {capitalize(c.status ?? '')}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CertBadge({ status }: { status: string }) {
  const variants = {
    certified: 'success',
    in_progress: 'warning',
    not_started: 'secondary',
    expired: 'error',
  } as const
  const v = variants[status as keyof typeof variants] ?? 'secondary'
  return <Badge variant={v}>{capitalize(status)}</Badge>
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Metrics */}
      <Suspense fallback={<MetricsSkeleton />}>
        <DashboardMetrics />
      </Suspense>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard/candidates?action=add">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Candidate
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/assessments?action=new">
            <ClipboardList className="mr-2 h-4 w-4" />
            New Assessment
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/placements?action=new">
            <Briefcase className="mr-2 h-4 w-4" />
            New Placement
          </Link>
        </Button>
      </div>

      {/* Recent candidates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Candidates</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/candidates">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <RecentCandidates />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
