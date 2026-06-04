'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { useCandidates, type CandidateFilters } from '@/lib/hooks/use-candidates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddCandidateForm } from './add-candidate-form'
import { getScoreBg, formatScore, capitalize } from '@/lib/utils'
import { UserPlus, Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import type { Database } from '@talentos/types'

type PipelineRow = Database['public']['Views']['v_candidate_pipeline']['Row']

const columnHelper = createColumnHelper<PipelineRow>()

const columns = [
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

export function CandidateTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultOpen = searchParams.get('action') === 'add'

  const [filters, setFilters] = useState<CandidateFilters>({})
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [slideoverOpen, setSlideoverOpen] = useState(defaultOpen)

  const { data, isLoading } = useCandidates({ ...filters, search: search || undefined })

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

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

        <Button onClick={() => setSlideoverOpen(true)}>
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
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
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
          </tbody>
        </table>

        {!isLoading && table.getRowModel().rows.length === 0 && (
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
