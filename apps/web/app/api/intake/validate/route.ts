import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken } from '@/app/actions/intake-tokens'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const validated = await validateIntakeToken(token)
  if (!validated) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: candidate } = await (supabase as any)
    .from('candidates')
    .select('first_name, full_name, source_job_title')
    .eq('id', validated.candidateId)
    .single()

  return NextResponse.json({
    candidate: {
      first_name: candidate?.first_name ?? candidate?.full_name?.split(' ')[0] ?? null,
      source_job_title: candidate?.source_job_title ?? null,
      outreach_req_title: null,
      outreach_customer: null,
      outreach_rate: null,
    },
  })
}
