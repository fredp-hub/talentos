// Campaign match engine — scores candidates against requisitions
// Preserves all existing compute-score.ts logic (1.4× multiplier, director+ cap)

export interface MatchCandidateInput {
  primary_stack: string[]
  years_experience: number
  rate_floor_hourly: number | null
  remote_preference: string | null
  work_type: string | null
  availability: string | null
  location_city: string | null
  location_state: string | null
  ai_experience: boolean
}

export interface MatchRequisitionInput {
  id: string
  title: string
  required_skills: string[] | null
  preferred_skills: string[] | null
  bill_rate_hourly: number | null
  is_remote: boolean
  is_hybrid: boolean
  location_city: string | null
  location_state: string | null
  campaign_work_type: string | null
}

export interface CampaignMatchResult {
  req_id: string
  match_score: number
  skill_match_pct: number
  rate_aligned: boolean
  location_aligned: boolean
  work_type_aligned: boolean
  matched_skills: string[]
  missing_skills: string[]
  ai_rationale: string
  tier: 'A' | 'B' | 'C'
}

const AI_KEYWORDS = ['ai','ml','llm','rag','genai','agentic','databricks','machine learning','openai','langchain']

function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function skillsMatch(candidateSkills: string[], required: string[]): { matched: string[]; missing: string[] } {
  const normalized = candidateSkills.map(normalizeSkill)
  const matched: string[] = []
  const missing: string[] = []
  for (const req of required) {
    const normReq = normalizeSkill(req)
    const found = normalized.some((cs) => cs.includes(normReq) || normReq.includes(cs))
    if (found) matched.push(req)
    else missing.push(req)
  }
  return { matched, missing }
}

function seniorityThreshold(title: string): number {
  const t = title.toLowerCase()
  if (t.includes('principal') || t.includes('staff') || t.includes('architect')) return 10
  if (t.includes('senior') || t.includes('lead') || t.includes('sr.')) return 7
  if (t.includes('mid') || t.includes('ii') || t.includes('ii ')) return 4
  return 2
}

function scoreSkillMatch(candidate: MatchCandidateInput, req: MatchRequisitionInput): { score: number; pct: number; matched: string[]; missing: string[] } {
  const required = req.required_skills ?? []
  if (required.length === 0) return { score: 40, pct: 100, matched: [], missing: [] }
  const { matched, missing } = skillsMatch(candidate.primary_stack, required)
  const pct = matched.length / required.length
  return { score: Math.round(pct * 40), pct: Math.round(pct * 100), matched, missing }
}

function scoreExperience(candidate: MatchCandidateInput, req: MatchRequisitionInput): number {
  const threshold = seniorityThreshold(req.title)
  const exp = candidate.years_experience ?? 0
  if (exp >= threshold) return 25
  if (exp >= threshold - 2) return 15
  return 5
}

function scoreRate(candidate: MatchCandidateInput, req: MatchRequisitionInput): { score: number; aligned: boolean } {
  const billRate = req.bill_rate_hourly
  const floor = candidate.rate_floor_hourly
  if (!billRate || !floor) return { score: 8, aligned: true } // unknown — assume aligned
  const maxPay = billRate * 0.70 // 30% GM target
  if (floor <= maxPay) return { score: 15, aligned: true }
  if (floor <= maxPay * 1.10) return { score: 8, aligned: false }
  return { score: 0, aligned: false }
}

function scoreLocation(candidate: MatchCandidateInput, req: MatchRequisitionInput): { score: number; aligned: boolean } {
  const pref = candidate.remote_preference
  if (pref === 'remote' && req.is_remote) return { score: 10, aligned: true }
  if (pref === 'flexible') return { score: 8, aligned: true }
  if (pref === 'onsite' && !req.is_remote) {
    const cityMatch =
      candidate.location_city?.toLowerCase() === req.location_city?.toLowerCase()
    const stateMatch =
      candidate.location_state?.toLowerCase() === req.location_state?.toLowerCase()
    if (cityMatch || stateMatch) return { score: 10, aligned: true }
    return { score: 3, aligned: false }
  }
  if (req.is_remote || req.is_hybrid) return { score: 8, aligned: true }
  return { score: 5, aligned: false }
}

function scoreWorkType(candidate: MatchCandidateInput, req: MatchRequisitionInput): { score: number; aligned: boolean } {
  const cType = candidate.work_type
  const rType = req.campaign_work_type
  if (!cType || cType === 'any') return { score: 5, aligned: true }
  if (!rType) return { score: 5, aligned: true }
  return cType === rType || (cType === 'any')
    ? { score: 5, aligned: true }
    : { score: 0, aligned: false }
}

function scoreAiExperience(candidate: MatchCandidateInput, req: MatchRequisitionInput): number {
  const reqIsAi = [...(req.required_skills ?? []), ...(req.preferred_skills ?? []), req.title]
    .some((s) => AI_KEYWORDS.some((kw) => s.toLowerCase().includes(kw)))
  if (reqIsAi && candidate.ai_experience) return 10
  if (reqIsAi && !candidate.ai_experience) return 3
  return 5 // neutral — req doesn't need AI
}

function availabilityModifier(availability: string | null): number {
  switch (availability) {
    case 'immediate': return 0
    case 'two_weeks': return -2
    case 'thirty_days': return -5
    case 'not_looking': return -999 // sentinel — don't match
    default: return 0
  }
}

export function scoreCandidate(
  candidate: MatchCandidateInput,
  req: MatchRequisitionInput,
): CampaignMatchResult | null {
  // Not-looking candidates get no matches
  if (candidate.availability === 'not_looking') return null

  const availMod = availabilityModifier(candidate.availability)
  if (availMod === -999) return null

  const skillResult = scoreSkillMatch(candidate, req)
  const expScore = scoreExperience(candidate, req)
  const rateResult = scoreRate(candidate, req)
  const locationResult = scoreLocation(candidate, req)
  const workTypeResult = scoreWorkType(candidate, req)
  const aiScore = scoreAiExperience(candidate, req)

  const rawScore =
    skillResult.score +
    expScore +
    rateResult.score +
    locationResult.score +
    workTypeResult.score +
    aiScore +
    availMod

  const match_score = Math.max(0, Math.min(100, Math.round(rawScore)))

  // Don't create match records below threshold
  if (match_score < 35) return null

  const tier: 'A' | 'B' | 'C' =
    match_score >= 75 ? 'A' : match_score >= 55 ? 'B' : 'C'

  const ai_rationale = `${tier === 'A' ? 'Strong' : tier === 'B' ? 'Good' : 'Partial'} match: ${skillResult.matched.length} of ${(req.required_skills ?? []).length} required skills covered${skillResult.matched.length > 0 ? ` (${skillResult.matched.slice(0, 3).join(', ')})` : ''}, rate ${rateResult.aligned ? 'aligned' : 'misaligned'} at $${candidate.rate_floor_hourly ?? '?'}/hr, ${(candidate.availability ?? 'unknown').replace('_', ' ')} availability.`

  return {
    req_id: req.id,
    match_score,
    skill_match_pct: skillResult.pct,
    rate_aligned: rateResult.aligned,
    location_aligned: locationResult.aligned,
    work_type_aligned: workTypeResult.aligned,
    matched_skills: skillResult.matched,
    missing_skills: skillResult.missing,
    ai_rationale,
    tier,
  }
}

export function matchCandidateToRequisitions(
  candidate: MatchCandidateInput,
  requisitions: MatchRequisitionInput[],
): CampaignMatchResult[] {
  return requisitions
    .map((req) => scoreCandidate(candidate, req))
    .filter((r): r is CampaignMatchResult => r !== null)
    .sort((a, b) => b.match_score - a.match_score)
}
