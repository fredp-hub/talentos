import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// The assistant returns structured JSON so the UI can render candidate cards
interface AssistantResponse {
  answer: string
  candidates: { id: string; name: string; reason: string }[]
  followups: string[]
}

const SYSTEM_PROMPT = `You are the AI talent strategist inside TalentOS, a staffing platform. You help recruiters make placement decisions, find the right candidates, write interview questions, and surface insights they would not have thought of themselves.

You are given a CONTEXT block with real candidates and open requisitions from the recruiter's database. Reason ONLY over the data provided — never invent candidates or requisitions that are not in the context.

When you recommend candidates, cite them by their exact id from the context. Be specific about WHY each is a fit (skills matched, experience, rate alignment, availability). Be honest about gaps and risks.

When asked for interview questions, tailor them to the specific candidate + role, mixing technical depth with behavioral signal. When asked for things the recruiter "didn't think of," proactively flag: underutilized strong candidates, rate/margin risks, candidates going stale, and non-obvious role matches.

A 30% gross margin is required: a candidate's pay rate must be at or below 70% of a requisition's bill rate. Flag any recommendation that would break this.

Always respond with STRICT JSON in exactly this shape, no markdown fences:
{
  "answer": "Your prose answer in clear, concise language. Use short paragraphs. This is the main response.",
  "candidates": [{"id": "uuid-from-context", "name": "Full Name", "reason": "one sentence on why"}],
  "followups": ["A suggested next question", "Another suggested next question"]
}
The "candidates" array should only include candidates you are actively recommending (omit or leave empty otherwise). Provide 2-3 "followups" that are natural next steps.`

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history } = await request.json()
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  // Gather context from the database (capped for token budget)
  const admin = createAdminClient()
  const [candRes, reqRes] = await Promise.all([
    (admin as any)
      .from('candidates')
      .select('id, full_name, primary_stack, years_experience, rate_floor_hourly, availability, work_type, remote_preference, ai_experience, campaign_tier, ai_match_score, outreach_status, source_job_title, location_city, location_state')
      .order('ai_match_score', { ascending: false, nullsFirst: false })
      .limit(80),
    (admin as any)
      .from('requisitions')
      .select('id, req_id, title, customer, required_skills, preferred_skills, bill_rate_hourly, location_city, location_state, is_remote, campaign_work_type, priority_tier, status')
      .eq('status', 'open')
      .limit(40),
  ])

  const candidates = candRes.data ?? []
  const requisitions = reqRes.data ?? []

  // Compact context representation to save tokens
  const candidateContext = candidates.map((c: any) => ({
    id: c.id,
    name: c.full_name,
    stack: c.primary_stack ?? [],
    years: c.years_experience,
    rate: c.rate_floor_hourly,
    availability: c.availability,
    work_type: c.work_type,
    remote: c.remote_preference,
    ai: c.ai_experience,
    tier: c.campaign_tier,
    score: c.ai_match_score,
    status: c.outreach_status,
    background: c.source_job_title,
    location: [c.location_city, c.location_state].filter(Boolean).join(', '),
  }))

  const reqContext = requisitions.map((r: any) => ({
    id: r.id,
    req_id: r.req_id,
    title: r.title,
    customer: r.customer,
    required: r.required_skills ?? [],
    preferred: r.preferred_skills ?? [],
    bill_rate: r.bill_rate_hourly,
    max_pay: r.bill_rate_hourly ? Math.round(r.bill_rate_hourly * 0.7) : null,
    location: [r.location_city, r.location_state].filter(Boolean).join(', '),
    remote: r.is_remote,
    work_type: r.campaign_work_type,
    tier: r.priority_tier,
  }))

  const contextBlock = `CONTEXT
=== CANDIDATES (${candidateContext.length}) ===
${JSON.stringify(candidateContext)}

=== OPEN REQUISITIONS (${reqContext.length}) ===
${JSON.stringify(reqContext)}`

  // Build message history
  const messages: Anthropic.MessageParam[] = []
  if (Array.isArray(history)) {
    for (const h of history.slice(-6)) {
      if (h.role && h.content) messages.push({ role: h.role, content: String(h.content) })
    }
  }
  messages.push({
    role: 'user',
    content: `${contextBlock}\n\n---\n\nRECRUITER REQUEST: ${message}`,
  })

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text = completion.content[0]?.type === 'text' ? completion.content[0].text : '{}'

    let parsed: AssistantResponse
    try {
      // Strip any accidental markdown fences
      const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // Fallback: treat whole text as prose answer
      parsed = { answer: text, candidates: [], followups: [] }
    }

    // Enrich recommended candidates with live data for rich cards
    const enriched = (parsed.candidates ?? [])
      .map((rec) => {
        const full = candidates.find((c: any) => c.id === rec.id)
        if (!full) return null
        return {
          id: full.id,
          name: full.full_name,
          reason: rec.reason,
          stack: full.primary_stack ?? [],
          tier: full.campaign_tier,
          score: full.ai_match_score,
          availability: full.availability,
          rate: full.rate_floor_hourly,
          background: full.source_job_title,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      answer: parsed.answer ?? '',
      candidates: enriched,
      followups: parsed.followups ?? [],
    })
  } catch (err) {
    const m = err instanceof Error ? err.message : 'Assistant error'
    return NextResponse.json({ error: m }, { status: 500 })
  }
}
