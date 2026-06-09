import { Suspense } from 'react'
import { MatchCandidateTable } from '@/components/candidates/match-table-columns'
import { RequisitionSelector } from '@/components/candidates/requisition-selector'
import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search, filter, and match your full talent pool.
        </p>
      </div>
      <RequisitionSelector />
      <Suspense fallback={<TableSkeleton />}>
        <MatchCandidateTable />
      </Suspense>
    </div>
  )
}
