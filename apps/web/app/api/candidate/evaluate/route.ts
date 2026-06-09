import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateCandidate } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, stage = 'manual' } = await request.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const admin = createAdminClient()

  // Gather everything we know
  const [{ data: candidate }, { data: notes }, { data: lastScore }] = await Promise.all([
    (admin as any)
      .from('candidates')
      .select('full_name, source_job_title, primary_stack, years_experience, availability, rate_floor_hourly, location_city, location_state, personality_summary, personality_scores')
      .eq('id', candidateId)
      .single(),
    (admin as any)
      .from('candidate_notes')
      .select('note_type, content')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(10),
    (admin as any)
      .from('candidate_fit_scores')
      .select('score')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const previousScore = lastScore?.score != null ? Number(lastScore.score) : null

  const evaluation = await evaluateCandidate({
    stage,
    previousScore,
    full_name: candidate.full_name,
    source_job_title: candidate.source_job_title,
    primary_stack: candidate.primary_stack,
    years_experience: candidate.years_experience,
    availability: candidate.availability,
    rate_floor_hourly: candidate.rate_floor_hourly,
    location: [candidate.location_city, candidate.location_state].filter(Boolean).join(', '),
    personality_summary: candidate.personality_summary,
    personality_scores: candidate.personality_scores,
    notes: notes ?? [],
  })

  const delta = previousScore != null ? Number((evaluation.score - previousScore).toFixed(1)) : null

  // Write timeline entry
  await (admin as any).from('candidate_fit_scores').insert({
    candidate_id: candidateId,
    stage,
    score: evaluation.score,
    delta,
    feedback: evaluation.feedback,
    technical_snapshot: evaluation.technical_snapshot,
    personality_snapshot: evaluation.personality_snapshot,
  })

  // Update live score on candidate
  await (admin as any)
    .from('candidates')
    .update({ current_fit_score: evaluation.score })
    .eq('id', candidateId)

  return NextResponse.json({ ...evaluation, delta, previousScore })
}
