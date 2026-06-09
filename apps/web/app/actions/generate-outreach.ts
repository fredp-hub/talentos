'use server'

import { generateOutreachMessage } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'

export interface GenerateOutreachParams {
  candidateId: string
  reqId: string // TEXT req_id from requisitions
  channel?: 'email' | 'linkedin' | 'sms' | 'phone'
}

export interface GeneratedOutreach {
  message: string
  outreach_log_id: string
}

export async function generateAndLogOutreach(
  params: GenerateOutreachParams,
): Promise<GeneratedOutreach> {
  const supabase = createAdminClient()

  // Fetch candidate
  const { data: candidate, error: cErr } = await (supabase as any)
    .from('candidates')
    .select(
      'first_name, full_name, source_job_title, primary_stack, rate_floor_hourly',
    )
    .eq('id', params.candidateId)
    .single()

  if (cErr || !candidate) throw new Error('Candidate not found')

  // Fetch requisition by text req_id field
  const { data: req, error: rErr } = await (supabase as any)
    .from('requisitions')
    .select('id, title, customer, location_city, location_state, bill_rate_hourly, campaign_work_type')
    .eq('req_id', params.reqId)
    .single()

  if (rErr || !req) throw new Error('Requisition not found')

  const firstName =
    candidate.first_name ?? candidate.full_name?.split(' ')[0] ?? 'there'
  const location = [req.location_city, req.location_state].filter(Boolean).join(', ') || 'Remote'
  const rate = req.bill_rate_hourly ? Math.round(req.bill_rate_hourly * 0.70) : 0

  const message = await generateOutreachMessage({
    first_name: firstName,
    source_job_title: candidate.source_job_title ?? 'your field',
    primary_stack: candidate.primary_stack ?? [],
    req_title: req.title,
    customer: req.customer ?? 'our client',
    location,
    rate,
  })

  // Log the outreach
  const { data: logEntry, error: logErr } = await (supabase as any)
    .from('outreach_log')
    .insert({
      candidate_id: params.candidateId,
      channel: params.channel ?? 'email',
      message_template: message,
      status: 'sent',
      sent_at: new Date().toISOString(),
      req_id: params.reqId,
    })
    .select('id')
    .single()

  if (logErr) throw new Error(`Failed to log outreach: ${logErr.message}`)

  // Update candidate outreach_status
  await (supabase as any)
    .from('candidates')
    .update({ outreach_status: 'outreach_sent' })
    .eq('id', params.candidateId)
    .eq('outreach_status', 'not_contacted') // only advance if still pristine

  return { message, outreach_log_id: logEntry.id }
}

export async function bulkGenerateOutreach(
  candidateIds: string[],
  reqId: string,
  channel: 'email' | 'linkedin' = 'email',
): Promise<{ success: number; failed: number; results: GeneratedOutreach[] }> {
  const results: GeneratedOutreach[] = []
  let failed = 0

  // Sequential to avoid Claude rate limits
  for (const candidateId of candidateIds) {
    try {
      const result = await generateAndLogOutreach({ candidateId, reqId, channel })
      results.push(result)
    } catch {
      failed++
    }
  }

  return { success: results.length, failed, results }
}
