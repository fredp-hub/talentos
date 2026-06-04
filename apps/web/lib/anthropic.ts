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
