import type { SeniorityLevel, ScoreDimension, SkillGap, MatchResult, RequisitionContext } from '@talentos/types'

// Skill complexity → estimated weeks to ramp
const RAMP_WEEKS: Record<string, number> = {
  jira: 4,
  confluence: 3,
  aws: 16,
  agile: 8,
  sql: 10,
  python: 20,
  'power bi': 6,
  powerbi: 6,
  java: 18,
  javascript: 14,
  typescript: 10,
  react: 12,
  angular: 14,
  vue: 10,
  node: 12,
  docker: 8,
  kubernetes: 16,
  terraform: 12,
  azure: 16,
  gcp: 16,
  salesforce: 20,
  servicenow: 16,
  tableau: 6,
  spark: 14,
  kafka: 12,
  mongodb: 8,
  postgresql: 8,
  mysql: 8,
  graphql: 8,
  rest: 4,
}

export interface CandidateWithAssessments {
  id: string
  full_name: string
  seniority_level: SeniorityLevel
  skills: string[] | null
  // from candidate_scores (is_current)
  personality_fit: number | null
  cognitive_score: number | null
  ai_aptitude_score: number | null
  derailer_risk: number | null
  // from ai_aptitude_assessments (latest)
  output_judgment_score: number | null
  // from assessment_results (latest PI behavioral or similar)
  pi_behavioral_score: number | null
  // years of experience proxy — derived from assessment notes or null
  years_experience: number | null
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(Math.max(v, min), max)
}

function normalizeSkill(s: string): string {
  return s.toLowerCase().trim()
}

function estimateRampWeeks(skill: string): number | null {
  return RAMP_WEEKS[normalizeSkill(skill)] ?? null
}

function computeSkillAlignment(
  candidateSkills: string[],
  requiredSkills: string[],
): number {
  if (requiredSkills.length === 0) return 100
  const normalizedCandidate = candidateSkills.map(normalizeSkill)
  let matched = 0
  for (const req of requiredSkills) {
    const norm = normalizeSkill(req)
    // exact or partial match
    if (normalizedCandidate.some((s) => s === norm || s.includes(norm) || norm.includes(s))) {
      matched++
    } else {
      // partial credit: check word overlap
      const reqWords = norm.split(/\s+/)
      const hasPartial = normalizedCandidate.some((s) =>
        reqWords.some((w) => w.length > 3 && s.includes(w))
      )
      if (hasPartial) matched += 0.5
    }
  }
  return clamp((matched / requiredSkills.length) * 100)
}

function computeRoleAlignment(
  seniorityLevel: SeniorityLevel,
  reqSeniorityLevel: string,
  yearsExperience: number | null,
): number {
  const seniorityOrder: Record<SeniorityLevel, number> = {
    junior: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    director_plus: 5,
  }
  const candidateRank = seniorityOrder[seniorityLevel] ?? 2
  const reqNorm = reqSeniorityLevel.toLowerCase().replace(/[^a-z_]/g, '_')
  const reqRank = seniorityOrder[reqNorm as SeniorityLevel] ?? 2

  const diff = Math.abs(candidateRank - reqRank)
  let base = diff === 0 ? 100 : diff === 1 ? 75 : diff === 2 ? 45 : 20

  // years experience bonus (if available)
  if (yearsExperience != null) {
    const thresholds: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 10, 5: 14 }
    const threshold = thresholds[reqRank] ?? 6
    if (yearsExperience >= threshold) base = Math.min(base + 10, 100)
  }
  return base
}

function computeDerailerRiskLevel(
  derailerRisk: number,
): 'none' | 'low' | 'elevated' | 'high' {
  if (derailerRisk < 40) return 'none'
  if (derailerRisk < 60) return 'low'
  if (derailerRisk <= 70) return 'elevated'
  return 'high'
}

export function computeMatchResult(
  candidate: CandidateWithAssessments,
  requisition: RequisitionContext,
): MatchResult {
  const candidateSkills = candidate.skills ?? []
  const requiredSkills = requisition.required_skills
  const desiredSkills = requisition.desired_skills

  // ── Dimension 1: Skill Alignment (0.35) ──────────────────────────────────
  const skillScore = computeSkillAlignment(candidateSkills, requiredSkills)
  const skillDimension: ScoreDimension = {
    label: 'Skill Alignment',
    score: Math.round(skillScore),
    weight: 0.35,
    rationale: `Matched ${Math.round((skillScore / 100) * requiredSkills.length)} of ${requiredSkills.length} required skills.`,
  }

  // ── Dimension 2: Cognitive Aptitude (0.25) ───────────────────────────────
  // Uses ai_aptitude_score which already incorporates 1.4× output_judgment multiplier
  const cognitiveRaw = candidate.ai_aptitude_score ?? candidate.cognitive_score ?? 50
  const cognitiveDimension: ScoreDimension = {
    label: 'Cognitive Aptitude',
    score: Math.round(clamp(cognitiveRaw)),
    weight: 0.25,
    rationale:
      candidate.ai_aptitude_score != null
        ? 'Derived from AI aptitude score including 1.4× output judgment multiplier.'
        : 'Derived from cognitive assessment score.',
  }

  // ── Dimension 3: Behavioral Fit (0.25) ───────────────────────────────────
  const behavioralRaw = candidate.personality_fit ?? candidate.pi_behavioral_score ?? 50
  const behavioralDimension: ScoreDimension = {
    label: 'Behavioral Fit',
    score: Math.round(clamp(behavioralRaw)),
    weight: 0.25,
    rationale: 'PI behavioral profile match to role archetype.',
  }

  // ── Dimension 4: Role Alignment (0.15) ───────────────────────────────────
  const roleAlignScore = computeRoleAlignment(
    candidate.seniority_level,
    requisition.seniority_level,
    candidate.years_experience,
  )
  const roleAlignDimension: ScoreDimension = {
    label: 'Role Alignment',
    score: Math.round(roleAlignScore),
    weight: 0.15,
    rationale: `Candidate seniority (${candidate.seniority_level}) vs requisition target (${requisition.seniority_level}).`,
  }

  const dimensions = [skillDimension, cognitiveDimension, behavioralDimension, roleAlignDimension]

  // ── Composite score ───────────────────────────────────────────────────────
  let compositeScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)

  // ── Hogan / derailer logic ────────────────────────────────────────────────
  const hoganTriggered = candidate.seniority_level === 'director_plus'
  const derailerRisk = candidate.derailer_risk ?? 0
  const derailerRiskLevel = hoganTriggered ? computeDerailerRiskLevel(derailerRisk) : null

  if (hoganTriggered && derailerRisk > 70) {
    compositeScore = Math.min(compositeScore, 85)
  }

  compositeScore = clamp(compositeScore)
  const compositeRounded = Math.round(compositeScore * 10) / 10

  // ── Tier ─────────────────────────────────────────────────────────────────
  const tier: 'A' | 'B' | 'C' =
    compositeRounded >= 75 ? 'A' : compositeRounded >= 50 ? 'B' : 'C'

  // ── Skill gaps ───────────────────────────────────────────────────────────
  const normalizedCandidate = candidateSkills.map(normalizeSkill)
  const top3Required = requiredSkills.slice(0, 3).map(normalizeSkill)

  const skill_gaps: SkillGap[] = []

  for (const req of requiredSkills) {
    const norm = normalizeSkill(req)
    const matched = normalizedCandidate.some(
      (s) => s === norm || s.includes(norm) || norm.includes(s)
    )
    if (!matched) {
      const rampWeeks = estimateRampWeeks(req)
      skill_gaps.push({
        skill: req,
        priority: top3Required.includes(norm) ? 'blocker' : 'important',
        trainable: rampWeeks != null && rampWeeks <= 12,
        estimated_ramp_weeks: rampWeeks,
      })
    }
  }

  for (const desired of desiredSkills) {
    const norm = normalizeSkill(desired)
    const matched = normalizedCandidate.some(
      (s) => s === norm || s.includes(norm) || norm.includes(s)
    )
    if (!matched) {
      const rampWeeks = estimateRampWeeks(desired)
      skill_gaps.push({
        skill: desired,
        priority: 'nice-to-have',
        trainable: rampWeeks != null && rampWeeks <= 12,
        estimated_ramp_weeks: rampWeeks,
      })
    }
  }

  // ── Submission ready ──────────────────────────────────────────────────────
  const hasBlockerGap = skill_gaps.some((g) => g.priority === 'blocker')
  const derailerOk =
    !hoganTriggered ||
    derailerRiskLevel === 'none' ||
    derailerRiskLevel === 'low'

  const submission_ready = (tier === 'A' || tier === 'B') && !hasBlockerGap && derailerOk

  // ── Rationale summary ─────────────────────────────────────────────────────
  const topDimension = [...dimensions].sort((a, b) => b.score - a.weight * 100 - (a.score - b.score))[0]
  const topBlocker = skill_gaps.find((g) => g.priority === 'blocker')

  const rationale_summary = [
    `${candidate.full_name} is a ${tier === 'A' ? 'strong' : tier === 'B' ? 'moderate' : 'weak'} match for ${requisition.title} with a composite score of ${compositeRounded}.`,
    `Their primary strength is ${topDimension?.label.toLowerCase() ?? 'overall fit'} (${topDimension?.score ?? 0}/100).`,
    topBlocker
      ? `The key gap is ${topBlocker.skill}${topBlocker.estimated_ramp_weeks ? `, estimated ${topBlocker.estimated_ramp_weeks} weeks to ramp` : ''}.`
      : 'No blocking skill gaps identified.',
  ].join(' ')

  // reverse_compatibility_score: % of candidate skills the role also uses
  const reverseScore =
    candidateSkills.length === 0
      ? 0
      : clamp(
          (candidateSkills.filter((cs) =>
            [...requiredSkills, ...desiredSkills].some(
              (rs) =>
                normalizeSkill(cs) === normalizeSkill(rs) ||
                normalizeSkill(cs).includes(normalizeSkill(rs))
            )
          ).length /
            candidateSkills.length) *
            100
        )

  return {
    candidate_id: candidate.id,
    requisition_id: requisition.id,
    composite_score: compositeRounded,
    tier,
    dimensions,
    skill_gaps,
    reverse_compatibility_score: Math.round(reverseScore),
    submission_ready,
    rationale_summary,
    hogan_triggered: hoganTriggered,
    derailer_risk_level: derailerRiskLevel,
  }
}
