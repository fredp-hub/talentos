'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface AddCandidateInput {
  full_name: string
  email: string
  phone?: string
  location_city?: string
  location_state?: string
  source_job_title?: string
  linkedin_url?: string
  primary_stack?: string[]
  years_experience?: number | null
  rate_floor_hourly?: number | null
  work_type?: string | null
  remote_preference?: string | null
  availability?: string | null
  notes?: string
}

export interface AddCandidateResult {
  ok: boolean
  candidateId?: string
  error?: string
  duplicate?: boolean
}

export async function addCandidate(input: AddCandidateInput): Promise<AddCandidateResult> {
  const supabase = createAdminClient()
  const email = input.email.trim().toLowerCase()

  if (!input.full_name?.trim()) return { ok: false, error: 'Name is required' }
  if (!email) return { ok: false, error: 'Email is required' }

  // Duplicate check
  const { data: existing } = await (supabase as any)
    .from('candidates')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { ok: false, duplicate: true, candidateId: existing.id, error: 'A candidate with this email already exists' }
  }

  const firstName = input.full_name.trim().split(' ')[0]
  const lastName = input.full_name.trim().substring(input.full_name.trim().indexOf(' ') + 1) || null

  const { data, error } = await (supabase as any)
    .from('candidates')
    .insert({
      full_name: input.full_name.trim(),
      first_name: firstName,
      last_name: lastName,
      email,
      phone: input.phone || null,
      location_city: input.location_city || null,
      location_state: input.location_state || null,
      source_job_title: input.source_job_title || null,
      linkedin_url: input.linkedin_url || null,
      primary_stack: input.primary_stack ?? [],
      years_experience: input.years_experience ?? null,
      rate_floor_hourly: input.rate_floor_hourly ?? null,
      work_type: input.work_type || null,
      remote_preference: input.remote_preference || null,
      availability: input.availability || 'not_looking',
      notes: input.notes || null,
      source: 'manual',
      outreach_status: 'not_contacted',
      campaign_tier: 'unscored',
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, candidateId: data.id }
}
