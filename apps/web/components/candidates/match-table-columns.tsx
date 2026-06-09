'use client'

import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type Row,
} from '@tanstack/react-table'
import { useState } from 'react'
import { useMatchStore } from '@/stores/matchStore'
import { useCandidates, type CandidateFilters } from '@/lib/hooks/use-candidates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddCandidateForm } from './add-candidate-form'
import { getScoreBg, formatScore, capitalize } from '@/lib/utils'
import { UserPlus, Search, ChevronUp, ChevronDown, X, Zap } from 'lucide-react'
import type { Database, MatchResult } from '@talentos/types'

type PipelineRow = Database['public']['Views']['v_candidate_pipeline']['Row']

const columnHelper = createColumnHelper<PipelineRow>()

const baseColumns = [
  columnHelper.accessor('full_name', {
    header: 'Name',
    cell: (info) => (
      <div>
        <p className="font-medium">{info.getValue()}</p>
        <p className="text-xs text-muted-foreground">{info.row.original.email}</p>
      </div>
    ),
  }),
  columnHelper.accessor('seniority_level', {
    header: 'Seniority',
    cell: (info) => <span className="text-muted-foreground">{capitalize(info.getValue() ?? '')}</span>,
  }),
  columnHelper.accessor('overall_score', {
    header: 'Overall Score',
    cell: (info) => {
      const score = info.getValue()
      if (score == null) return <span className="text-muted-foreground">—</span>
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreBg(score)}`}>
          {formatScore(score)}
        </span>
      )
    },
  }),
  columnHelper.accessor('ai_aptitude_score', {
    header: 'AI Aptitude',
    cell: (info) => {
      const score = info.getValue()
      if (score == null) return <span className="text-muted-foreground">—</span>
      return <span className="font-mono text-sm">{formatScore(score)}</span>
    },
  }),
  columnHelper.accessor('cert_status', {
    header: 'Cert Status',
    cell: (info) => {
      const status = info.getValue()
      if (!status) return <span className="text-muted-foreground text-xs">—</span>
      const variants = {
        certified: 'success',
        in_progress: 'warning',
        not_started: 'secondary',
        expired: 'error',
      } as const
      const v = variants[status as keyof typeof variants] ?? 'secondary'
      return <Badge variant={v}>{capitalize(status)}</Badge>
    },
  }),
  columnHelper.accessor('placement_status', {
    header: 'Placement',
    cell: (info) => {
      const status = info.getValue()
      if (!status) return <span className="text-muted-foreground text-xs">—</span>
      return (
        <Badge variant={status === 'active' ? 'success' : 'secondary'}>
          {capitalize(status)}
        </Badge>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue()
      const variants = {
        active: 'success',
        placed: 'default',
        screening: 'warning',
        inactive: 'secondary',
      } as const
      const v = variants[status as keyof typeof variants] ?? 'secondary'
      return <Badge variant={v}>{capitalize(status ?? '')}</Badge>
    },
  }),
]

function MatchScorePill({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
    score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score.toFixed(1)}
    </span>
  )
}

function buildMatchColumns(matchResults: Record<string, MatchResult>) {
  return [
    columnHelper.accessor('id', {
      id: 'composite_score',
      header: 'Match Score',
      cell: (info) => {
        const r = matchResults[info.getValue()]
        if (!r) return <span className="text-muted-foreground text-xs">—</span>
        return <MatchScorePill score={r.composite_score} />
      },
    }),
    columnHelper.accessor('id', {
      id: 'match_tier',
      header: 'Tier',
      cell: (info) => {
        const r = matchResults[info.getValue()]
        if (!r) return <span className="text-muted-foreground text-xs">—</span>
        const styles = { A: 'bg-emerald-500 text-white', B: 'bg-amber-500 text-white', C: 'bg-red-500 text-white' }
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${styles[r.tier]}`}>
            {r.tier}
          </span>
        )
      },
    }),
    columnHelper.accessor('id', {
      id: 'top_gap',
      header: 'Top Gap',
      cell: (info) => {
        const r = matchResults[info.getValue()]
        if (!r) return <span className="text-muted-foreground text-xs">—</span>
        const blocker = r.skill_gaps.find((g) => g.priority === 'blocker')
        if (!blocker) return <span className="text-emerald-600 text-xs font-medium">None</span>
        return (
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">{blocker.skill}</span>
        )
      },
    }),
    columnHelper.accessor('id', {
      id: 'submission_ready',
      header: 'Submission',
      cell: (info) => {
        const r = matchResults[info.getValue()]
        if (!r) return <span className="text-muted-foreground text-xs">—</span>
        return r.submission_ready ? (
          <Badge variant="success">Ready</Badge>
        ) : (
          <Badge variant="error">Not Ready</Badge>
        )
      },
    }),
  ]
}

// Tier-grouped rows for display when match results exist
type TierGroup = { tier: 'A' | 'B' | 'C'; rows: Row<PipelineRow>[] }

function groupByTier(
  rows: Row<PipelineRow>[],
  matchResults: Record<string, MatchResult>,
): TierGroup[] {
  const groups: Record<string, Row<PipelineRow>[]> = { A: [], B: [], C: [], unscored: [] }
  for (const row of rows) {
    const r = matchResults[row.original.id]
    if (r) {
      groups[r.tier].push(row)
    } else {
      groups['unscored'].push(row)
    }
  }
  const result: TierGroup[] = []
  for (const tier of ['A', 'B', 'C'] as const) {
    if (groups[tier].length) result.push({ tier, rows: groups[tier] })
  }
  return result
}

export function MatchCandidateTable() {
  const router = useRouter()
  const { activeRequisition, matchResults, isScoring, setMatchResult, setScoring } = useMatchStore()
  const [filters, setFilters] = useState<CandidateFilters>({})
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [slideoverOpen, setSlideoverOpen] = useState(false)

  const { data, isLoading } = useCandidates({ ...filters, search: search || undefined })

  const hasMatchResults = Object.keys(matchResults).length > 0
  const columns = activeRequisition
    ? [...baseColumns, ...buildMatchColumns(matchResults)]
    : baseColumns

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  async function runMatch() {
    if (!activeRequisition || !data?.length) return
    setScoring(true)
    try {
      await Promise.all(
        data.map(async (candidate) => {
          try {
            const res = await fetch('/api/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ candidate_id: candidate.id, requisition: activeRequisition }),
            })
            if (res.ok) {
              const result = await res.json() as MatchResult
              setMatchResult(candidate.id, result)
            }
          } catch {
            // Skip individual failures
          }
        })
      )
    } finally {
      setScoring(false)
    }
  }

  const allRows = table.getRowModel().rows
  const tieredGroups = hasMatchResults ? groupByTier(allRows, matchResults) : null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm flex-1 min-w-48">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <select
          value={filters.seniority_level ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              seniority_level: (e.target.value as CandidateFilters['seniority_level']) || undefined,
            }))
          }
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Seniority</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="director_plus">Director+</option>
        </select>

        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value as CandidateFilters['status']) || undefined,
            }))
          }
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="placed">Placed</option>
          <option value="screening">Screening</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.cert_status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              cert_status: (e.target.value as CandidateFilters['cert_status']) || undefined,
            }))
          }
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Certs</option>
          <option value="certified">Certified</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
          <option value="expired">Expired</option>
        </select>

        {activeRequisition && (
          <Button onClick={runMatch} disabled={isScoring || isLoading} variant="default">
            <Zap className="mr-2 h-4 w-4" />
            {isScoring ? 'Scoring…' : 'Run Match'}
          </Button>
        )}

        <Button onClick={() => setSlideoverOpen(true)} variant={activeRequisition ? 'outline' : 'default'}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tieredGroups ? (
              tieredGroups.map(({ tier, rows }) => (
                <>
                  <tr key={`tier-${tier}`} className="bg-muted/30 sticky top-0">
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Tier {tier} — {rows.length} candidate{rows.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/candidates/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))
            ) : (
              allRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/candidates/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!isLoading && allRows.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No candidates match your filters.
          </div>
        )}
      </div>

      {/* Slide-over */}
      {slideoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setSlideoverOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Candidate</h2>
              <button
                onClick={() => setSlideoverOpen(false)}
                className="rounded-md p-1.5 hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AddCandidateForm onSuccess={() => setSlideoverOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
