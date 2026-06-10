import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Building2 } from 'lucide-react'
import { capitalize, formatDate } from '@/lib/utils'
import { RequisitionTabs } from './requisition-tabs'
import { RequisitionActions } from '@/components/requisitions/requisition-actions'
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
            {(req.ilabor_req_id || (req as { req_id?: string }).req_id) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Req ID: {req.ilabor_req_id ?? (req as { req_id?: string }).req_id}
              </p>
            )}
          </div>
          <RequisitionActions
            requisition={{
              id: req.id,
              title: req.title,
              customer: (req as { customer?: string | null }).customer ?? null,
              client_name: req.client_name,
              req_id: (req as { req_id?: string | null }).req_id ?? null,
              location_city: (req as { location_city?: string | null }).location_city ?? null,
              location_state: (req as { location_state?: string | null }).location_state ?? null,
              is_remote: (req as { is_remote?: boolean | null }).is_remote ?? null,
              bill_rate_hourly: (req as { bill_rate_hourly?: number | null }).bill_rate_hourly ?? null,
              campaign_work_type: (req as { campaign_work_type?: string | null }).campaign_work_type ?? null,
              seniority_level: (req as { seniority_level?: string | null }).seniority_level ?? null,
              required_skills: (req as { required_skills?: string[] | null }).required_skills ?? null,
              preferred_skills: (req as { preferred_skills?: string[] | null }).preferred_skills ?? null,
              num_positions: (req as { num_positions?: number | null }).num_positions ?? null,
              priority_tier: (req as { priority_tier?: string | null }).priority_tier ?? null,
              description: (req as { description?: string | null }).description ?? null,
            }}
          />
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
