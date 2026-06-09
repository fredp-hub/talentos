import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { NewRequisitionButton } from './new-requisition-button'
import { CampaignRequisitions } from '@/components/requisitions/campaign-requisitions'

function TableSkeleton() {
  return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
}

export default function RequisitionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Requisitions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Open roles you&apos;re sourcing for — sorted by priority and match count.
          </p>
        </div>
        <NewRequisitionButton />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CampaignRequisitions />
      </Suspense>
    </div>
  )
}
