import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidateId = request.nextUrl.searchParams.get('candidateId')
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('candidate_notes')
    .select('id, created_at, note_type, content, req_id')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, note_type = 'general', content, req_id } = await request.json()
  if (!candidateId || !content?.trim()) {
    return NextResponse.json({ error: 'candidateId and content required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('candidate_notes')
    .insert({ candidate_id: candidateId, author_id: user.id, note_type, content: content.trim(), req_id: req_id ?? null })
    .select('id, created_at, note_type, content, req_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If this is an interview note, advance the pipeline phase (+ keep outreach funnel in sync)
  if (note_type === 'interview' || note_type === 'screen') {
    await (admin as any)
      .from('candidates')
      .update({ pipeline_phase: 'interview_complete', outreach_status: 'stage3_complete' })
      .eq('id', candidateId)
      .in('pipeline_phase', ['awaiting_interview', 'survey_complete', 'screening', 'new'])
  }

  return NextResponse.json({ note: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  await (admin as any).from('candidate_notes').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
