import { describe, it, expect } from 'vitest'
import { computeMatchResult } from './compute-match'
import type { CandidateWithAssessments } from './compute-match'
import type { RequisitionContext } from '@talentos/types'

const BASE_REQ: RequisitionContext = {
  id: 'req-001',
  title: 'Senior Java Developer',
  seniority_level: 'senior',
  required_skills: ['Java', 'AWS', 'Docker'],
  desired_skills: ['Kafka', 'Kubernetes'],
  client_name: 'Acme Corp',
  c2c_rate: 85,
  start_date: '2024-09-01',
}

const BASE_CANDIDATE: CandidateWithAssessments = {
  id: 'cand-001',
  full_name: 'Jane Doe',
  seniority_level: 'senior',
  skills: ['Java', 'AWS', 'Docker', 'Spring Boot'],
  personality_fit: 80,
  cognitive_score: 75,
  ai_aptitude_score: 82,
  derailer_risk: 30,
  output_judgment_score: 70,
  pi_behavioral_score: null,
  years_experience: 8,
}

describe('computeMatchResult', () => {
  it('director_plus candidate with HDS > 70 is capped at 85', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      id: 'cand-director',
      full_name: 'Director Dan',
      seniority_level: 'director_plus',
      derailer_risk: 85,
      personality_fit: 95,
      cognitive_score: 95,
      ai_aptitude_score: 95,
    }
    const result = computeMatchResult(candidate, { ...BASE_REQ, seniority_level: 'director_plus' })
    expect(result.composite_score).toBeLessThanOrEqual(85)
    expect(result.hogan_triggered).toBe(true)
    expect(result.derailer_risk_level).toBe('high')
  })

  it('director_plus candidate with HDS <= 70 is NOT capped', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      seniority_level: 'director_plus',
      derailer_risk: 60,
      personality_fit: 95,
      cognitive_score: 95,
      ai_aptitude_score: 95,
    }
    const result = computeMatchResult(candidate, { ...BASE_REQ, seniority_level: 'director_plus' })
    expect(result.hogan_triggered).toBe(true)
    expect(result.derailer_risk_level).toBe('elevated')
    // Score should NOT be capped (elevated but not high)
    expect(result.composite_score).toBeGreaterThan(85)
  })

  it('candidate missing a top-3 required skill gets a blocker gap', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: ['AWS', 'Docker'], // missing Java which is #1 required
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    const javGap = result.skill_gaps.find((g) => g.skill === 'Java')
    expect(javGap).toBeDefined()
    expect(javGap?.priority).toBe('blocker')
  })

  it('composite score correctly weights all four dimensions', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      personality_fit: 100,
      cognitive_score: 100,
      ai_aptitude_score: 100,
      skills: ['Java', 'AWS', 'Docker'],
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    // All skills matched → skill dim = 100 (0.35)
    // ai_aptitude = 100 (0.25), behavioral = 100 (0.25), role alignment = 100 (0.15)
    // composite = 100
    expect(result.composite_score).toBeCloseTo(100, 0)
  })

  it('submission_ready is false when blocker gap exists', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: [], // all required skills missing
      personality_fit: 90,
      cognitive_score: 90,
      ai_aptitude_score: 90,
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    expect(result.submission_ready).toBe(false)
    expect(result.skill_gaps.some((g) => g.priority === 'blocker')).toBe(true)
  })

  it('submission_ready is true for a Tier A candidate with no blockers', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: ['Java', 'AWS', 'Docker'],
      personality_fit: 85,
      cognitive_score: 85,
      ai_aptitude_score: 85,
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    expect(result.tier).toBe('A')
    expect(result.skill_gaps.some((g) => g.priority === 'blocker')).toBe(false)
    expect(result.submission_ready).toBe(true)
  })

  it('desired-only missing skills are nice-to-have, not blockers', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: ['Java', 'AWS', 'Docker'], // no Kafka or Kubernetes (desired only)
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    const kafkaGap = result.skill_gaps.find((g) => g.skill === 'Kafka')
    expect(kafkaGap?.priority).toBe('nice-to-have')
  })

  it('tier is A when composite >= 75', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: ['Java', 'AWS', 'Docker'],
      personality_fit: 80,
      cognitive_score: 80,
      ai_aptitude_score: 80,
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    expect(result.tier).toBe('A')
    expect(result.composite_score).toBeGreaterThanOrEqual(75)
  })

  it('tier is C when composite < 50', () => {
    const candidate: CandidateWithAssessments = {
      ...BASE_CANDIDATE,
      skills: [],
      personality_fit: 20,
      cognitive_score: 20,
      ai_aptitude_score: 20,
    }
    const result = computeMatchResult(candidate, BASE_REQ)
    expect(result.tier).toBe('C')
    expect(result.composite_score).toBeLessThan(50)
  })

  it('derailer_risk_level is null for non-director candidates', () => {
    const result = computeMatchResult(BASE_CANDIDATE, BASE_REQ)
    expect(result.hogan_triggered).toBe(false)
    expect(result.derailer_risk_level).toBeNull()
  })
})
