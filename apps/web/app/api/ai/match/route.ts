import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { scoreCandidate } from '@/lib/anthropic'
import type { Database } from '@talentos/types'

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type RequisitionRow = Database['public']['Tables']['requisitions']['Row']

export async function POST(req: NextRequest) {
  try {
    const { requisition_id } = await req.json()
    if (!requisition_id) {
      return NextResponse.json({ error: 'requisition_id required' }, { status: 400 })
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

    const [{ data: rawReq }, { data: rawCandidates }] = await Promise.all([
      supabase.from('requisitions').select('*').eq('id', requisition_id).single(),
      supabase
        .from('candidates')
        .select('id, full_name, email, seniority_level, skills, desired_rate, work_authorization, notes, availability_date')
        .eq('status', 'active'),
    ])

    const req_data = rawReq as RequisitionRow | null
    const candidates = rawCandidates as Pick<CandidateRow, 'id' | 'full_name' | 'email' | 'seniority_level' | 'skills' | 'desired_rate' | 'work_authorization' | 'notes' | 'availability_date'>[] | null

    if (!req_data) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
    }
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const jd = req_data.job_description ?? req_data.title

    const results = await Promise.all(
      candidates.map(async (c) => {
        const profile = buildCandidateProfile(c)
        try {
          const { fit_score, summary } = await scoreCandidate(jd, profile)
          return { candidate_id: c.id, fit_score, summary }
        } catch {
          return { candidate_id: c.id, fit_score: 0, summary: 'Scoring unavailable' }
        }
      })
    )

    await supabase.from('ai_matches').upsert(
      results.map((r) => ({
        candidate_id: r.candidate_id,
        requisition_id,
        fit_score: r.fit_score,
        summary: r.summary,
        generated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      { onConflict: 'candidate_id,requisition_id' }
    )

    const candidateMap = Object.fromEntries(candidates.map((c) => [c.id, c]))
    const ranked = results
      .map((r) => ({ ...r, candidate: candidateMap[r.candidate_id] }))
      .sort((a, b) => b.fit_score - a.fit_score)

    return NextResponse.json({ results: ranked })
  } catch (err) {
    console.error('[ai/match]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildCandidateProfile(c: {
  full_name: string
  seniority_level: string
  skills: string[] | null
  desired_rate: number | null
  work_authorization: string | null
  notes: string | null
  availability_date: string | null
}): string {
  return [
    `Name: ${c.full_name}`,
    `Seniority: ${c.seniority_level}`,
    `Skills: ${(c.skills ?? []).join(', ')}`,
    c.desired_rate ? `Desired Rate: $${c.desired_rate}/hr` : null,
    c.work_authorization ? `Work Authorization: ${c.work_authorization}` : null,
    c.availability_date ? `Available: ${c.availability_date}` : null,
    c.notes ? `Notes: ${c.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
