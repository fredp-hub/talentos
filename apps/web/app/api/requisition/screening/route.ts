import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateScreeningQuestions } from '@/lib/anthropic'

// GET — fetch existing screening questions; auto-generate if none exist
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reqId = request.nextUrl.searchParams.get('reqId')
  if (!reqId) return NextResponse.json({ error: 'reqId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: req } = await (admin as any)
    .from('requisitions')
    .select('id, title, customer, required_skills, preferred_skills, description, screening_questions')
    .eq('id', reqId)
    .single()

  if (!req) return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })

  if (Array.isArray(req.screening_questions) && req.screening_questions.length > 0) {
    return NextResponse.json({ questions: req.screening_questions, generated: false })
  }

  // Auto-generate on first access
  const questions = await generateScreeningQuestions({
    title: req.title,
    customer: req.customer,
    required_skills: req.required_skills,
    preferred_skills: req.preferred_skills,
    description: req.description,
  })

  if (questions.length > 0) {
    await (admin as any).from('requisitions').update({ screening_questions: questions }).eq('id', reqId)
  }

  return NextResponse.json({ questions, generated: true })
}

// POST — force regenerate
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reqId } = await request.json()
  if (!reqId) return NextResponse.json({ error: 'reqId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: req } = await (admin as any)
    .from('requisitions')
    .select('id, title, customer, required_skills, preferred_skills, description')
    .eq('id', reqId)
    .single()

  if (!req) return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })

  const questions = await generateScreeningQuestions({
    title: req.title,
    customer: req.customer,
    required_skills: req.required_skills,
    preferred_skills: req.preferred_skills,
    description: req.description,
  })

  await (admin as any).from('requisitions').update({ screening_questions: questions }).eq('id', reqId)
  return NextResponse.json({ questions, generated: true })
}
