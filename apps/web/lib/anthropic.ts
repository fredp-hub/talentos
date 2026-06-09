import Anthropic from '@anthropic-ai/sdk'

// Server-side only — never import in client components
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function scoreCandidate(
  jobDescription: string,
  candidateProfile: string
): Promise<{ fit_score: number; summary: string }> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:
      'You are a technical recruiter AI. Score a candidate 0-100 for fit against a job description. Return ONLY valid JSON: {"fit_score": 85, "summary": "one sentence"}. No preamble, no markdown.',
    messages: [
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE:\n${candidateProfile}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  return JSON.parse(text)
}

export async function generateGapAnalysis(
  jobDescription: string,
  candidateProfile: string
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system:
      'You are a technical recruiter. Write a concise gap analysis comparing a candidate to a job. Use exactly 3 sections: **Strengths**, **Gaps**, **Recommendation**. Plain text, no markdown fences.',
    messages: [
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE:\n${candidateProfile}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export async function generateOutreachMessage(params: {
  first_name: string
  source_job_title: string
  primary_stack: string[]
  req_title: string
  customer: string
  location: string
  rate: number
  duration?: string
}): Promise<string> {
  const { first_name, source_job_title, primary_stack, req_title, customer, location, rate, duration } = params
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `You are a recruiter writing a personalized outreach message to a tech professional.
Write a message that is:
- Under 5 sentences total
- Opens with something specific to their background (their previous role/stack)
- Mentions the specific job opportunity with title, company, location, and rate
- Has one clear call to action
- Does NOT use phrases like "I came across your profile" or "hope this finds you well"
- Feels like it came from a real person, not a template
- Tone: direct, professional, respectful of their time
Return ONLY the message text, no subject line, no signature placeholder.`,
    messages: [{
      role: 'user',
      content: `Candidate background: ${source_job_title}, tech stack: ${primary_stack.join(', ')}. Target role: ${req_title} at ${customer}, ${location}, $${rate}/hr${duration ? `, ${duration}` : ''}. Candidate name: ${first_name}.`,
    }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export async function generateMatchRationale(params: {
  candidate_name: string
  matched_skills: string[]
  total_required: number
  rate_floor: number
  availability: string
}): Promise<string> {
  const { candidate_name, matched_skills, total_required, rate_floor, availability } = params
  return `Strong match: ${matched_skills.length} of ${total_required} required skills covered (${matched_skills.slice(0, 3).join(', ')}), rate-aligned at $${rate_floor}/hr, ${availability.replace('_', ' ')} availability.`
}

// ── AI-designed candidate surveys ──────────────────────────────────────────

export interface SurveyQuestion {
  id: string
  type: 'scale' | 'choice' | 'text'
  category: 'personality' | 'work_style' | 'technical'
  prompt: string
  options?: string[]
  scaleLabels?: [string, string]
}

export async function generateSurveyQuestions(params: {
  full_name: string
  source_job_title?: string | null
  primary_stack?: string[] | null
  years_experience?: number | null
  context_note?: string | null
}): Promise<SurveyQuestion[]> {
  const { full_name, source_job_title, primary_stack, years_experience, context_note } = params

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1600,
    system: `You design short, sharp candidate surveys for a staffing platform. Generate a tailored set of 8-10 questions for one specific candidate that blends:
- Personality & work-style (how they operate, handle ambiguity, collaborate, take ownership)
- Role-specific technical depth (based on their stack and seniority)

Rules:
- Keep it under 10 questions — completion rate matters.
- Prefer 'scale' and 'choice' questions over 'text' (max 2 text questions).
- Scale questions are 1-5 with two short labels [low, high].
- Make technical questions genuinely probing for their level — not trivia.
- Make personality questions reveal behavior, not self-flattery.

Return STRICT JSON, no markdown fences, in exactly this shape:
{"questions":[{"id":"q1","type":"scale","category":"work_style","prompt":"...","scaleLabels":["Rarely","Always"]},{"id":"q2","type":"choice","category":"technical","prompt":"...","options":["A","B","C","D"]},{"id":"q3","type":"text","category":"personality","prompt":"..."}]}`,
    messages: [{
      role: 'user',
      content: `Candidate: ${full_name}. Current/recent role: ${source_job_title ?? 'unknown'}. Tech stack: ${(primary_stack ?? []).join(', ') || 'unknown'}. Years experience: ${years_experience ?? 'unknown'}.${context_note ? ` Recruiter context: ${context_note}` : ''}`,
    }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try {
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed.questions) ? parsed.questions : []
  } catch {
    return []
  }
}

export interface SurveyScoring {
  ai_summary: string
  personality_scores: Record<string, number>
  technical_summary: string
  fit_highlights: string[]
  fit_concerns: string[]
}

export async function scoreSurveyResponses(params: {
  full_name: string
  source_job_title?: string | null
  questions: SurveyQuestion[]
  responses: Record<string, string | number>
}): Promise<SurveyScoring> {
  const { full_name, source_job_title, questions, responses } = params

  const qa = questions.map((q) => ({
    category: q.category,
    prompt: q.prompt,
    answer: responses[q.id] ?? '(no answer)',
  }))

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You analyze a candidate's survey responses for a staffing recruiter. Produce an honest, useful read on personality, work style, and technical depth. Be specific and candid — flag concerns, don't just flatter.

Return STRICT JSON, no markdown fences, in exactly this shape:
{
  "ai_summary": "2-3 sentence overall read on this candidate as a hire.",
  "personality_scores": {"communication": 0-100, "ownership": 0-100, "adaptability": 0-100, "collaboration": 0-100, "technical_depth": 0-100},
  "technical_summary": "1-2 sentences on demonstrated technical depth.",
  "fit_highlights": ["short strength", "short strength"],
  "fit_concerns": ["short concern or watch-out"]
}`,
    messages: [{
      role: 'user',
      content: `Candidate: ${full_name} (${source_job_title ?? 'role unknown'}).\n\nSurvey Q&A:\n${JSON.stringify(qa, null, 2)}`,
    }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return {
      ai_summary: 'Survey completed — automatic analysis unavailable.',
      personality_scores: {},
      technical_summary: '',
      fit_highlights: [],
      fit_concerns: [],
    }
  }
}

export async function generateInterviewQuestions(
  jobDescription: string,
  candidateProfile: string
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system:
      'You are a technical recruiter. Generate 8-10 targeted interview questions tailored to this specific candidate vs. this specific job. Mix technical and behavioral. Format as a numbered list. No preamble.',
    messages: [
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE:\n${candidateProfile}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
