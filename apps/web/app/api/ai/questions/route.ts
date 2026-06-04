import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateInterviewQuestions } from '@/lib/anthropic'
import type { Database } from '@talentos/types'

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type RequisitionRow = Database['public']['Tables']['requisitions']['Row']

export async function POST(req: NextRequest) {
  try {
    const { candidate_id, requisition_id } = await req.json()
    if (!candidate_id || !requisition_id) {
      return NextResponse.json({ error: 'candidate_id and requisition_id required' }, { status: 400 })
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

    const [{ data: rawCandidate }, { data: rawRequisition }] = await Promise.all([
      supabase
        .from('candidates')
        .select('full_name, seniority_level, skills, desired_rate, work_authorization, notes, availability_date')
        .eq('id', candidate_id)
        .single(),
      supabase.from('requisitions').select('*').eq('id', requisition_id).single(),
    ])

    const candidate = rawCandidate as Pick<CandidateRow, 'full_name' | 'seniority_level' | 'skills' | 'desired_rate' | 'work_authorization' | 'notes' | 'availability_date'> | null
    const requisition = rawRequisition as RequisitionRow | null

    if (!candidate || !requisition) {
      return NextResponse.json({ error: 'Candidate or requisition not found' }, { status: 404 })
    }

    const profile = [
      `Name: ${candidate.full_name}`,
      `Seniority: ${candidate.seniority_level}`,
      `Skills: ${(candidate.skills ?? []).join(', ')}`,
      candidate.desired_rate ? `Desired Rate: $${candidate.desired_rate}/hr` : null,
      candidate.work_authorization ? `Work Authorization: ${candidate.work_authorization}` : null,
      candidate.notes ? `Notes: ${candidate.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const jd = requisition.job_description ?? requisition.title
    const interview_questions = await generateInterviewQuestions(jd, profile)

    await supabase
      .from('ai_matches')
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { candidate_id, requisition_id, interview_questions, generated_at: new Date().toISOString() } as any,
        { onConflict: 'candidate_id,requisition_id' }
      )

    return NextResponse.json({ interview_questions })
  } catch (err) {
    console.error('[ai/questions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
