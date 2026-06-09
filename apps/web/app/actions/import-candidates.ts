'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface CSVCandidateRow {
  full_name?: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  location_city?: string
  location_state?: string
  source_job_title?: string
  years_experience?: string | number
  primary_stack?: string // comma-separated
  rate_floor_hourly?: string | number
  work_type?: string
  remote_preference?: string
  availability?: string
  ai_experience?: string | boolean
  source?: string
  source_job_id?: string
}

export interface ImportSummary {
  total: number
  inserted: number
  updated: number
  skipped: number
  errors: { row: number; email: string; message: string }[]
}

function normalizeRow(row: CSVCandidateRow) {
  const firstName = row.first_name ?? row.full_name?.split(' ')[0] ?? ''
  const lastName =
    row.last_name ??
    (row.full_name
      ? row.full_name.substring(row.full_name.indexOf(' ') + 1)
      : '')
  const fullName = row.full_name ?? `${firstName} ${lastName}`.trim()

  const primaryStack =
    typeof row.primary_stack === 'string'
      ? row.primary_stack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : (row.primary_stack as unknown as string[] | undefined) ?? []

  const aiExp =
    row.ai_experience === true ||
    row.ai_experience === 'true' ||
    row.ai_experience === '1' ||
    row.ai_experience === 'yes'

  return {
    full_name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    email: row.email?.trim().toLowerCase(),
    phone: row.phone ?? null,
    location_city: row.location_city ?? null,
    location_state: row.location_state ?? null,
    source_job_title: row.source_job_title ?? null,
    years_experience: row.years_experience ? Number(row.years_experience) : null,
    primary_stack: primaryStack,
    rate_floor_hourly: row.rate_floor_hourly ? Number(row.rate_floor_hourly) : null,
    work_type: row.work_type ?? null,
    remote_preference: row.remote_preference ?? null,
    availability: row.availability ?? 'not_looking',
    ai_experience: aiExp,
    source: row.source ?? 'ilabor',
    source_job_id: row.source_job_id ?? null,
    outreach_status: 'not_contacted' as const,
    campaign_tier: 'unscored' as const,
  }
}

const BATCH_SIZE = 50

export async function importCandidates(rows: CSVCandidateRow[]): Promise<ImportSummary> {
  const supabase = createAdminClient()
  const summary: ImportSummary = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  // Process in batches
  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE)
    const normalized = batch.map(normalizeRow)

    // Check existing emails in this batch
    const emails = normalized.map((r) => r.email).filter(Boolean)
    const { data: existing } = await (supabase as any)
      .from('candidates')
      .select('id, email')
      .in('email', emails)

    const existingEmails = new Set<string>(
      (existing ?? []).map((r: { email: string }) => r.email?.toLowerCase())
    )

    const toInsert = normalized.filter((r) => r.email && !existingEmails.has(r.email))
    const toUpdate = normalized.filter((r) => r.email && existingEmails.has(r.email))

    // Insert new candidates
    if (toInsert.length > 0) {
      const { error } = await (supabase as any)
        .from('candidates')
        .insert(toInsert)

      if (error) {
        toInsert.forEach((r, idx) => {
          summary.errors.push({
            row: batchStart + idx + 1,
            email: r.email,
            message: error.message,
          })
        })
      } else {
        summary.inserted += toInsert.length
      }
    }

    // Update existing candidates (upsert by email — only fill nulls)
    for (const candidate of toUpdate) {
      const { error } = await (supabase as any)
        .from('candidates')
        .update({
          // Only update campaign-specific fields, don't overwrite core profile
          location_city: candidate.location_city,
          location_state: candidate.location_state,
          source_job_title: candidate.source_job_title,
          years_experience: candidate.years_experience,
          primary_stack: candidate.primary_stack,
          rate_floor_hourly: candidate.rate_floor_hourly,
          work_type: candidate.work_type,
          remote_preference: candidate.remote_preference,
          availability: candidate.availability,
          ai_experience: candidate.ai_experience,
          source: candidate.source,
          source_job_id: candidate.source_job_id,
        })
        .eq('email', candidate.email)

      if (error) {
        summary.errors.push({
          row: batchStart + toInsert.length + 1,
          email: candidate.email,
          message: error.message,
        })
      } else {
        summary.updated++
      }
    }
  }

  return summary
}
