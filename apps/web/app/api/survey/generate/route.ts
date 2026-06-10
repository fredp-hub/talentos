import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSurveyQuestions } from '@/lib/anthropic'
import { generateIntakeToken } from '@/app/actions/intake-tokens'

export async function POST(request: NextRequest) {
  // Auth (staff only)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, contextNote } = await request.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const admin = createAdminClient()

  // Load candidate to tailor the survey
  const { data: candidate, error: cErr } = await (admin as any)
    .from('candidates')
    .select('id, full_name, source_job_title, primary_stack, years_experience')
    .eq('id', candidateId)
    .single()

  if (cErr || !candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  // Generate tailored questions via Claude
  const questions = await generateSurveyQuestions({
    full_name: candidate.full_name,
    source_job_title: candidate.source_job_title,
    primary_stack: candidate.primary_stack,
    years_experience: candidate.years_experience,
    context_note: contextNote,
  })

  if (questions.length === 0) {
    return NextResponse.json({ error: 'Could not generate survey questions, please retry' }, { status: 502 })
  }

  // Expire any prior pending survey for this candidate
  await (admin as any)
    .from('candidate_surveys')
    .update({ status: 'expired' })
    .eq('candidate_id', candidateId)
    .eq('status', 'pending')

  // Store the new survey
  const { error: insErr } = await (admin as any)
    .from('candidate_surveys')
    .insert({
      candidate_id: candidateId,
      questions,
      status: 'pending',
      context_note: contextNote ?? null,
    })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Move the candidate to "awaiting survey" in both trackers (only forward from early phases)
  await (admin as any)
    .from('candidates')
    .update({ pipeline_phase: 'awaiting_survey', outreach_status: 'stage2_started' })
    .eq('id', candidateId)
    .in('pipeline_phase', ['new', 'screening'])

  // Generate the public token + link
  const token = await generateIntakeToken(candidateId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/survey/${token}`

  return NextResponse.json({ link, token, questionCount: questions.length })
}
