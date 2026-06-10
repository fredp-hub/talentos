'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface CreateRequisitionInput {
  title: string
  client_name?: string
  customer?: string
  req_id?: string
  location_city?: string
  location_state?: string
  is_remote?: boolean
  bill_rate_hourly?: number | null
  campaign_work_type?: string | null
  seniority_level?: string | null
  required_skills?: string[]
  preferred_skills?: string[]
  num_positions?: number | null
  priority_tier?: string | null
  description?: string
}

export interface CreateRequisitionResult {
  ok: boolean
  id?: string
  error?: string
}

export async function createRequisition(input: CreateRequisitionInput): Promise<CreateRequisitionResult> {
  const supabase = createAdminClient()

  if (!input.title?.trim()) return { ok: false, error: 'Title is required' }

  // Generate a req_id if none provided so it appears consistently in lists
  const reqId = input.req_id?.trim() || `R-${Date.now().toString().slice(-6)}`

  const { data, error } = await (supabase as any)
    .from('requisitions')
    .insert({
      title: input.title.trim(),
      client_name: input.client_name?.trim() || input.customer?.trim() || 'Internal',
      customer: input.customer?.trim() || input.client_name?.trim() || null,
      req_id: reqId,
      location_city: input.location_city?.trim() || null,
      location_state: input.location_state?.trim() || null,
      is_remote: input.is_remote ?? false,
      bill_rate_hourly: input.bill_rate_hourly ?? null,
      c2c_rate: input.bill_rate_hourly ?? null,
      campaign_work_type: input.campaign_work_type || null,
      required_skills: input.required_skills ?? [],
      preferred_skills: input.preferred_skills ?? [],
      num_positions: input.num_positions ?? 1,
      priority_tier: input.priority_tier || '2',
      description: input.description?.trim() || null,
      seniority_level: input.seniority_level || null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function updateRequisition(
  id: string,
  input: CreateRequisitionInput,
): Promise<CreateRequisitionResult> {
  const supabase = createAdminClient()
  if (!id) return { ok: false, error: 'Missing requisition id' }
  if (!input.title?.trim()) return { ok: false, error: 'Title is required' }

  const { error } = await (supabase as any)
    .from('requisitions')
    .update({
      title: input.title.trim(),
      client_name: input.client_name?.trim() || input.customer?.trim() || 'Internal',
      customer: input.customer?.trim() || input.client_name?.trim() || null,
      location_city: input.location_city?.trim() || null,
      location_state: input.location_state?.trim() || null,
      is_remote: input.is_remote ?? false,
      bill_rate_hourly: input.bill_rate_hourly ?? null,
      c2c_rate: input.bill_rate_hourly ?? null,
      campaign_work_type: input.campaign_work_type || null,
      required_skills: input.required_skills ?? [],
      preferred_skills: input.preferred_skills ?? [],
      num_positions: input.num_positions ?? 1,
      priority_tier: input.priority_tier || '2',
      description: input.description?.trim() || null,
      seniority_level: input.seniority_level || null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, id }
}

export async function deleteRequisition(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  if (!id) return { ok: false, error: 'Missing requisition id' }
  const { error } = await (supabase as any).from('requisitions').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setRequisitionStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('requisitions').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
