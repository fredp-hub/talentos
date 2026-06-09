import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeMatchResult } from '@talentos/scoring-engine'
import type { CandidateWithAssessments } from '@talentos/scoring-engine'
import type { Database, RequisitionContext, SeniorityLevel } from '@talentos/types'

// POST /api/match
// Body: { candidate_id: string, requisition: RequisitionContext }
// Returns: MatchResult

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { candidate_id: string; requisition: RequisitionContext }
    const { candidate_id, requisition } = body

    if (!candidate_id || !requisition) {
      return NextResponse.json({ error: 'candidate_id and requisition are required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list: Array<{ name: string; value: string; options?: object }>) => {
            try {
              list.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
              )
            } catch {}
          },
        },
      }
    )

    // Fetch candidate + assessments (explicit casts to avoid Supabase select-narrowing issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [candidateRes, scoreRes, aiAssessRes] = await Promise.all([
      sb.from('candidates').select('id, full_name, seniority_level, skills').eq('id', candidate_id).single(),
      sb.from('candidate_scores').select('personality_fit, cognitive_score, ai_aptitude_score, derailer_risk').eq('candidate_id', candidate_id).eq('is_current', true).maybeSingle(),
      sb.from('ai_aptitude_assessments').select('output_judgment_score').eq('candidate_id', candidate_id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
    ]) as [
      { data: { id: string; full_name: string; seniority_level: SeniorityLevel; skills: string[] | null } | null },
      { data: { personality_fit: number; cognitive_score: number; ai_aptitude_score: number; derailer_risk: number } | null },
      { data: { output_judgment_score: number } | null },
    ]

    if (!candidateRes.data) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const cRow = candidateRes.data
    const sRow = scoreRes.data
    const aRow = aiAssessRes.data

    const candidate: CandidateWithAssessments = {
      id: cRow.id,
      full_name: cRow.full_name,
      seniority_level: cRow.seniority_level,
      skills: cRow.skills,
      personality_fit: sRow?.personality_fit ?? null,
      cognitive_score: sRow?.cognitive_score ?? null,
      ai_aptitude_score: sRow?.ai_aptitude_score ?? null,
      derailer_risk: sRow?.derailer_risk ?? null,
      output_judgment_score: aRow?.output_judgment_score ?? null,
      pi_behavioral_score: null,
      years_experience: null,
    }

    const result = computeMatchResult(candidate, requisition)

    // Upsert into match_results (table not in Database type — use explicit cast)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('match_results')
      .upsert(
        {
          candidate_id,
          requisition_id: requisition.id,
          composite_score: result.composite_score,
          tier: result.tier,
          dimensions: result.dimensions,
          skill_gaps: result.skill_gaps,
          reverse_compatibility_score: result.reverse_compatibility_score,
          submission_ready: result.submission_ready,
          rationale_summary: result.rationale_summary,
          hogan_triggered: result.hogan_triggered,
          derailer_risk_level: result.derailer_risk_level ?? null,
          scored_at: new Date().toISOString(),
        },
        { onConflict: 'candidate_id,requisition_id' }
      )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[match]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
