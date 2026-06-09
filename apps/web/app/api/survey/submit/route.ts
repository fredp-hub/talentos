import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken, markTokenUsed } from '@/app/actions/intake-tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreSurveyResponses } from '@/lib/anthropic'

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

  // Roll up to candidate profile
  await (admin as any)
    .from('candidates')
    .update({
      personality_summary: scoring.ai_summary,
      personality_scores: scoring.personality_scores,
      survey_completed_at: now,
    })
    .eq('id', validated.candidateId)

  await markTokenUsed(validated.tokenId)

  return NextResponse.json({ success: true })
}
