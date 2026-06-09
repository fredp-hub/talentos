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
