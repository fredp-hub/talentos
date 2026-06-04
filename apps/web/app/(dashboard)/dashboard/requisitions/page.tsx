import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NewRequisitionButton } from './new-requisition-button'
import Link from 'next/link'
import { formatDate, capitalize } from '@/lib/utils'
import { MapPin, Calendar, DollarSign, Users, ExternalLink } from 'lucide-react'
import type { Database } from '@talentos/types'

type ReqSummaryRow = Database['public']['Views']['v_requisition_summary']['Row']

function statusVariant(status: string): 'success' | 'default' | 'secondary' {
  if (status === 'open') return 'success'
  if (status === 'filled') return 'default'
  return 'secondary'
}

async function RequisitionList() {
  const supabase = await createClient()
  const { data: rawData } = await supabase
    .from('v_requisition_summary')
    .select('*')
    .order('created_at', { ascending: false })
  const data = rawData as ReqSummaryRow[] | null

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 py-24 text-center text-muted-foreground">
        No requisitions yet — create your first one.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Title</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground hidden md:table-cell">Client</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Rate</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Status</th>
            <th className="text-left py-3 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Candidates</th>
            <th className="text-left py-3 font-medium text-muted-foreground hidden lg:table-cell">Start</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((r) => (
            <tr key={r.id} className="hover:bg-muted/50 transition-colors">
              <td className="py-3 pr-4">
                <Link
                  href={`/dashboard/requisitions/${r.id}`}
                  className="font-medium hover:underline flex items-center gap-1"
                >
                  {r.title}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                {r.ilabor_req_id && (
                  <p className="text-xs text-muted-foreground">{r.ilabor_req_id}</p>
                )}
              </td>
              <td className="py-3 pr-4 hidden md:table-cell text-muted-foreground">
                {r.client_name ?? '—'}
                {r.end_customer && <p className="text-xs">{r.end_customer}</p>}
              </td>
              <td className="py-3 pr-4 hidden lg:table-cell text-muted-foreground">{r.location ?? '—'}</td>
              <td className="py-3 pr-4 hidden sm:table-cell">
                {r.c2c_rate ? `$${r.c2c_rate}/hr` : '—'}
              </td>
              <td className="py-3 pr-4">
                <Badge variant={statusVariant(r.status)}>{capitalize(r.status)}</Badge>
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell text-center">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {r.candidate_count}
                </span>
              </td>
              <td className="py-3 hidden lg:table-cell text-muted-foreground">
                {formatDate(r.start_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default function RequisitionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Requisitions</h2>
          <p className="text-muted-foreground mt-1">Open job requisitions and candidate pipelines.</p>
        </div>
        <NewRequisitionButton />
      </div>

      <Card>
        <CardContent className="pt-4">
          <Suspense fallback={<TableSkeleton />}>
            <RequisitionList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
