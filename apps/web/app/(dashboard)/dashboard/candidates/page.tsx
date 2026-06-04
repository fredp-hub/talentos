import { Suspense } from 'react'
import { CandidateTable } from '@/components/candidates/candidate-table'
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
        <h2 className="text-2xl font-bold tracking-tight">Candidate Pipeline</h2>
        <p className="text-muted-foreground mt-1">
          Manage and track all candidates through your staffing workflow.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <CandidateTable />
      </Suspense>
    </div>
  )
}
