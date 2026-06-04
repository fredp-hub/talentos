import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Building2 } from 'lucide-react'
import { capitalize, formatDate } from '@/lib/utils'
import { RequisitionTabs } from './requisition-tabs'
import type { Database } from '@talentos/types'

type RequisitionRow = Database['public']['Tables']['requisitions']['Row']

function statusVariant(status: string): 'success' | 'default' | 'secondary' {
  if (status === 'open') return 'success'
  if (status === 'filled') return 'default'
  return 'secondary'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RequisitionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawReq } = await supabase
    .from('requisitions')
    .select('*')
    .eq('id', id)
    .single()
  const req = rawReq as RequisitionRow | null

  if (!req) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
          <Link href="/dashboard/requisitions">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Requisitions
          </Link>
        </Button>
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{req.title}</h1>
              <Badge variant={statusVariant(req.status)}>{capitalize(req.status)}</Badge>
            </div>
            {req.ilabor_req_id && (
              <p className="text-sm text-muted-foreground mt-0.5">Req ID: {req.ilabor_req_id}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-muted-foreground">
          {(req.client_name || req.end_customer) && (
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {req.client_name}
              {req.end_customer && ` → ${req.end_customer}`}
            </span>
          )}
          {req.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {req.location}
            </span>
          )}
          {req.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(req.start_date)}
              {req.end_date && ` – ${formatDate(req.end_date)}`}
            </span>
          )}
          {req.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {req.duration}
            </span>
          )}
          {req.c2c_rate && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              ${req.c2c_rate}/hr C2C
            </span>
          )}
        </div>
      </div>

      {/* Tabs: Pipeline | AI Matching | Details */}
      <RequisitionTabs requisitionId={id} jobDescription={req.job_description} />
    </div>
  )
}
