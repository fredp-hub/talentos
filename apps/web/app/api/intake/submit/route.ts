import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken, markTokenUsed } from '@/app/actions/intake-tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { matchCandidateToRequisitions } from '@talentos/scoring-engine'
import type { MatchCandidateInput, MatchRequisitionInput } from '@talentos/scoring-engine'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, ...intakeData } = body

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const validated = await validateIntakeToken(token)
  if (!validated) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Update candidate profile with intake data
  const updatePayload: Record<string, unknown> = {
    availability: intakeData.availability,
    rate_floor_hourly: intakeData.rate_floor_hourly ? Number(intakeData.rate_floor_hourly) : null,
    work_type: intakeData.work_type,
    remote_preference: intakeData.remote_preference,
    primary_stack: intakeData.primary_stack,
    years_experience: intakeData.years_experience ? Number(intakeData.years_experience) : null,
    highest_role_summary: intakeData.highest_role_summary,
    ai_experience: intakeData.ai_experience,
    ai_experience_detail: intakeData.ai_experience_detail,
    behavioral_notes: intakeData.behavioral_notes,
    outreach_status: 'stage2_complete',
  }

  if (intakeData.available_from) {
    updatePayload.available_from = intakeData.available_from
  }

  const { error: updateErr } = await (supabase as any)
    .from('candidates')
    .update(updatePayload)
    .eq('id', validated.candidateId)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }

  // Mark token as used
  await markTokenUsed(validated.tokenId)

  // Run AI matching against all active requisitions
  try {
    const { data: reqs } = await (supabase as any)
      .from('requisitions')
      .select(
        'id, title, required_skills, preferred_skills, bill_rate_hourly, is_remote, is_hybrid, location_city, location_state, campaign_work_type',
      )
      .eq('status', 'open')

    if (reqs && reqs.length > 0) {
      const candidateInput: MatchCandidateInput = {
        primary_stack: intakeData.primary_stack ?? [],
        years_experience: Number(intakeData.years_experience) || 0,
        rate_floor_hourly: intakeData.rate_floor_hourly ? Number(intakeData.rate_floor_hourly) : null,
        remote_preference: intakeData.remote_preference,
        work_type: intakeData.work_type,
        availability: intakeData.availability,
        location_city: null,
        location_state: null,
        ai_experience: intakeData.ai_experience === true,
      }

      const reqInputs: MatchRequisitionInput[] = reqs.map((r: any) => ({
        id: r.id,
        title: r.title,
        required_skills: r.required_skills,
        preferred_skills: r.preferred_skills,
        bill_rate_hourly: r.bill_rate_hourly,
        is_remote: r.is_remote ?? false,
        is_hybrid: r.is_hybrid ?? false,
        location_city: r.location_city,
        location_state: r.location_state,
        campaign_work_type: r.campaign_work_type,
      }))

      const matches = matchCandidateToRequisitions(candidateInput, reqInputs)

      if (matches.length > 0) {
        // Upsert match records
        const matchRows = matches.map((m) => ({
          candidate_id: validated.candidateId,
          req_id: m.req_id,
          match_score: m.match_score,
          skill_match_pct: m.skill_match_pct,
          rate_aligned: m.rate_aligned,
          location_aligned: m.location_aligned,
          work_type_aligned: m.work_type_aligned,
          ai_rationale: m.ai_rationale,
          status: 'suggested',
        }))

        await (supabase as any)
          .from('candidate_req_matches')
          .upsert(matchRows, { onConflict: 'candidate_id,req_id' })

        // Update candidate campaign_tier with best match tier
        const bestTier = matches[0].tier
        const bestScore = matches[0].match_score

        await (supabase as any)
          .from('candidates')
          .update({ campaign_tier: bestTier, ai_match_score: bestScore })
          .eq('id', validated.candidateId)
      } else {
        // No matches — still update tier
        await (supabase as any)
          .from('candidates')
          .update({ campaign_tier: 'C', ai_match_score: 0 })
          .eq('id', validated.candidateId)
      }
    }
  } catch (matchErr) {
    // Non-fatal — profile was saved, matching just failed silently
    console.error('Matching error after intake submit:', matchErr)
  }

  return NextResponse.json({ success: true })
}
