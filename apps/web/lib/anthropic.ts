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

// ── Requisition screening questions ─────────────────────────────────────────

export interface ScreeningQuestion {
  id: string
  category: 'technical' | 'behavioral' | 'logistics'
  question: string
  look_for: string // what a good answer demonstrates
}

export async function generateScreeningQuestions(params: {
  title: string
  customer?: string | null
  required_skills?: string[] | null
  preferred_skills?: string[] | null
  description?: string | null
}): Promise<ScreeningQuestion[]> {
  const { title, customer, required_skills, preferred_skills, description } = params
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You write phone-screen interview questions for a staffing recruiter. Generate 6-8 questions that a recruiter (not a deep technical expert) can ask to screen a candidate for a specific role. Mix:
- technical (validate core required skills at the right depth)
- behavioral (work style, ownership, collaboration)
- logistics (availability, rate, onsite/remote, work authorization)

For each question include what a strong answer should demonstrate, so the recruiter knows what to listen for.

Return STRICT JSON, no markdown fences:
{"questions":[{"id":"s1","category":"technical","question":"...","look_for":"..."}]}`,
    messages: [{
      role: 'user',
      content: `Role: ${title}${customer ? ` at ${customer}` : ''}. Required skills: ${(required_skills ?? []).join(', ') || 'n/a'}. Preferred: ${(preferred_skills ?? []).join(', ') || 'n/a'}.${description ? ` Description: ${description}` : ''}`,
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

// ── Candidate evaluation (evolving fit score + snapshot) ────────────────────

export interface CandidateEvaluation {
  score: number // 0-100 overall fit at this stage
  feedback: string // why the score moved / current read
  technical_snapshot: string
  personality_snapshot: string
}

export async function evaluateCandidate(params: {
  stage: 'resume' | 'survey' | 'interview' | 'manual'
  previousScore: number | null
  full_name: string
  source_job_title?: string | null
  primary_stack?: string[] | null
  years_experience?: number | null
  availability?: string | null
  rate_floor_hourly?: number | null
  location?: string | null
  personality_summary?: string | null
  personality_scores?: Record<string, number> | null
  notes?: { type: string; content: string }[]
}): Promise<CandidateEvaluation> {
  const {
    stage, previousScore, full_name, source_job_title, primary_stack, years_experience,
    availability, rate_floor_hourly, location, personality_summary, personality_scores, notes,
  } = params

  const stageGuidance: Record<string, string> = {
    resume: 'Base your read on the resume/profile data only (skills, experience, role history). Personality and interview data are not yet available.',
    survey: 'The candidate has completed a personality + skills survey. Weight the new personality signal alongside the resume.',
    interview: 'Interview notes are now available. Weight demonstrated behavior and answers heavily — this is the strongest signal.',
    manual: 'Give a complete current snapshot using every piece of data available.',
  }

  const profile = {
    role: source_job_title,
    stack: primary_stack ?? [],
    years: years_experience,
    availability,
    rate: rate_floor_hourly,
    location,
    personality_summary,
    personality_scores,
    notes: notes ?? [],
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    system: `You are evaluating a staffing candidate's overall quality as a placeable hire, producing a fit score 0-100. ${stageGuidance[stage]}

${previousScore != null ? `Their previous score was ${previousScore}. Explain in your feedback what changed and why the score moved up or down.` : 'This is their first evaluation.'}

Be honest and specific — a recruiter relies on this to decide who to push. Return STRICT JSON, no markdown fences:
{
  "score": 0-100,
  "feedback": "1-2 sentences on the current read and what drove any change.",
  "technical_snapshot": "1-2 sentences on technical strength.",
  "personality_snapshot": "1-2 sentences on personality/work style (say 'No survey or interview data yet' if none)."
}`,
    messages: [{
      role: 'user',
      content: `Candidate: ${full_name}\nStage: ${stage}\nData: ${JSON.stringify(profile, null, 2)}`,
    }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try {
    const p = JSON.parse(clean)
    return {
      score: Math.max(0, Math.min(100, Number(p.score) || 0)),
      feedback: p.feedback ?? '',
      technical_snapshot: p.technical_snapshot ?? '',
      personality_snapshot: p.personality_snapshot ?? '',
    }
  } catch {
    return { score: previousScore ?? 50, feedback: 'Evaluation unavailable — please retry.', technical_snapshot: '', personality_snapshot: '' }
  }
}

// ── Rejection / better-fit explanation ──────────────────────────────────────

export async function explainFit(params: {
  candidate_name: string
  candidate_stack: string[]
  candidate_years: number | null
  rejected_req_title: string
  rejected_req_skills: string[]
  alternative_reqs: { id: string; title: string; customer: string | null; skills: string[] }[]
}): Promise<{ why: string; alternatives: { id: string; title: string; reason: string }[] }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `A recruiter is reviewing why a candidate is not the right fit for a given requisition, and what roles might suit them better. Be candid and concrete. Recommend alternatives ONLY from the provided list, citing them by id.

Return STRICT JSON, no markdown fences:
{"why":"1-2 sentences on why this candidate is not the strongest fit for the role.","alternatives":[{"id":"req-id","title":"Role Title","reason":"one sentence why it fits better"}]}`,
    messages: [{
      role: 'user',
      content: JSON.stringify(params),
    }],
  })
  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return { why: 'Analysis unavailable — please retry.', alternatives: [] }
  }
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
