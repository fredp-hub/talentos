import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { explainFit } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, reqId } = await request.json()
  if (!candidateId || !reqId) {
    return NextResponse.json({ error: 'candidateId and reqId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [{ data: candidate }, { data: req }, { data: openReqs }] = await Promise.all([
    (admin as any)
      .from('candidates')
      .select('full_name, primary_stack, years_experience')
      .eq('id', candidateId)
      .single(),
    (admin as any)
      .from('requisitions')
      .select('title, required_skills')
      .eq('id', reqId)
      .single(),
    (admin as any)
      .from('requisitions')
      .select('id, title, customer, required_skills')
      .eq('status', 'open')
      .neq('id', reqId)
      .limit(25),
  ])

  if (!candidate || !req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await explainFit({
    candidate_name: candidate.full_name,
    candidate_stack: candidate.primary_stack ?? [],
    candidate_years: candidate.years_experience,
    rejected_req_title: req.title,
    rejected_req_skills: req.required_skills ?? [],
    alternative_reqs: (openReqs ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      customer: r.customer,
      skills: r.required_skills ?? [],
    })),
  })

  // Enrich alternatives with customer for display
  const enriched = result.alternatives
    .map((alt) => {
      const full = (openReqs ?? []).find((r: any) => r.id === alt.id)
      if (!full) return null
      return { ...alt, customer: full.customer }
    })
    .filter(Boolean)

  return NextResponse.json({ why: result.why, alternatives: enriched })
}
