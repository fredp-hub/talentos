import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken } from '@/app/actions/intake-tokens'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const validated = await validateIntakeToken(token)
  if (!validated) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: candidate }, { data: survey }] = await Promise.all([
    (admin as any)
      .from('candidates')
      .select('first_name, full_name')
      .eq('id', validated.candidateId)
      .single(),
    (admin as any)
      .from('candidate_surveys')
      .select('id, questions, status')
      .eq('candidate_id', validated.candidateId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!survey) return NextResponse.json({ error: 'No active survey for this link' }, { status: 404 })

  return NextResponse.json({
    surveyId: survey.id,
    questions: survey.questions,
    firstName: candidate?.first_name ?? candidate?.full_name?.split(' ')[0] ?? null,
  })
}
