import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken, markTokenUsed } from '@/app/actions/intake-tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreSurveyResponses, evaluateCandidate } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const { token, surveyId, responses } = await request.json()
  if (!token || !surveyId || !responses) {
    return NextResponse.json({ error: 'token, surveyId and responses required' }, { status: 400 })
  }

  const validated = await validateIntakeToken(token)
  if (!validated) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })

  const admin = createAdminClient()

  // Load the survey + candidate
  const { data: survey } = await (admin as any)
    .from('candidate_surveys')
    .select('id, questions, candidate_id')
    .eq('id', surveyId)
    .eq('candidate_id', validated.candidateId)
    .single()

  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

  const { data: candidate } = await (admin as any)
    .from('candidates')
    .select('full_name, source_job_title')
    .eq('id', validated.candidateId)
    .single()

  // AI scoring
  const scoring = await scoreSurveyResponses({
    full_name: candidate?.full_name ?? 'Candidate',
    source_job_title: candidate?.source_job_title,
    questions: survey.questions,
    responses,
  })

  const now = new Date().toISOString()

  // Persist survey results
  await (admin as any)
    .from('candidate_surveys')
    .update({
      responses,
      status: 'completed',
      completed_at: now,
      ai_summary: scoring.ai_summary,
      personality_scores: scoring.personality_scores,
      technical_summary: scoring.technical_summary,
      fit_highlights: scoring.fit_highlights,
      fit_concerns: scoring.fit_concerns,
    })
    .eq('id', surveyId)

  // Roll up to candidate profile + advance pipeline phase
  await (admin as any)
    .from('candidates')
    .update({
      personality_summary: scoring.ai_summary,
      personality_scores: scoring.personality_scores,
      survey_completed_at: now,
      pipeline_phase: 'survey_complete',
    })
    .eq('id', validated.candidateId)

  await markTokenUsed(validated.tokenId)

  // Re-evaluate fit with the new personality signal (survey stage)
  try {
    const { data: c } = await (admin as any)
      .from('candidates')
      .select('full_name, source_job_title, primary_stack, years_experience, availability, rate_floor_hourly, location_city, location_state')
      .eq('id', validated.candidateId)
      .single()

    const { data: last } = await (admin as any)
      .from('candidate_fit_scores')
      .select('score')
      .eq('candidate_id', validated.candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const prev = last?.score != null ? Number(last.score) : null

    const evalResult = await evaluateCandidate({
      stage: 'survey',
      previousScore: prev,
      full_name: c?.full_name ?? 'Candidate',
      source_job_title: c?.source_job_title,
      primary_stack: c?.primary_stack,
      years_experience: c?.years_experience,
      availability: c?.availability,
      rate_floor_hourly: c?.rate_floor_hourly,
      location: [c?.location_city, c?.location_state].filter(Boolean).join(', '),
      personality_summary: scoring.ai_summary,
      personality_scores: scoring.personality_scores,
    })

    await (admin as any).from('candidate_fit_scores').insert({
      candidate_id: validated.candidateId,
      stage: 'survey',
      score: evalResult.score,
      delta: prev != null ? Number((evalResult.score - prev).toFixed(1)) : null,
      feedback: evalResult.feedback,
      technical_snapshot: evalResult.technical_snapshot,
      personality_snapshot: evalResult.personality_snapshot,
    })
    await (admin as any).from('candidates').update({ current_fit_score: evalResult.score }).eq('id', validated.candidateId)
  } catch {
    // non-fatal
  }

  return NextResponse.json({ success: true })
}
