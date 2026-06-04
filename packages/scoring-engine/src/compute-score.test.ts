import { describe, it, expect } from 'vitest'
import { computeScore } from './compute-score'
import type { ScoringInputs, RoleWeights } from './types'

const BASE_WEIGHTS: RoleWeights = {
  weight_personality: 0.25,
  weight_cognitive: 0.25,
  weight_ai_aptitude: 0.25,
  weight_alignment: 0.25,
}

const BASE_INPUTS: ScoringInputs = {
  personality_fit: 80,
  cognitive_score: 75,
  prompt_reasoning_score: 70,
  tool_breadth_score: 65,
  output_judgment_score: 60,
  change_tolerance_score: 55,
  derailer_risk: 30,
  role_alignment: 78,
  seniority_level: 'senior',
}

describe('computeScore', () => {
  it('returns a version-stamped result', () => {
    const result = computeScore(BASE_INPUTS, BASE_WEIGHTS)
    expect(result.scoring_model_version).toMatch(/^v\d+\.\d+\.\d+$/)
  })

  it('computes overall_score as weighted composite', () => {
    const result = computeScore(BASE_INPUTS, BASE_WEIGHTS)
    // ai_aptitude: (70 + 65 + min(60*1.4,100) + 55) / 4 = (70+65+84+55)/4 = 274/4 = 68.5
    // overall: (80 + 75 + 68.5 + 78) * 0.25 = 75.375
    expect(result.overall_score).toBeCloseTo(75.4, 1)
  })

  it('applies 1.4x multiplier to output_judgment_score inside ai_aptitude', () => {
    const inputs: ScoringInputs = {
      ...BASE_INPUTS,
      prompt_reasoning_score: 0,
      tool_breadth_score: 0,
      output_judgment_score: 50, // should become 70 after 1.4x
      change_tolerance_score: 0,
    }
    const result = computeScore(inputs, BASE_WEIGHTS)
    // ai_aptitude = (0 + 0 + 70 + 0) / 4 = 17.5
    expect(result.ai_aptitude_score).toBeCloseTo(17.5, 1)
  })

  it('clamps output_judgment_score contribution to 100 after multiplier', () => {
    const inputs: ScoringInputs = {
      ...BASE_INPUTS,
      output_judgment_score: 90, // 90 * 1.4 = 126 → clamped to 100
      prompt_reasoning_score: 0,
      tool_breadth_score: 0,
      change_tolerance_score: 0,
    }
    const result = computeScore(inputs, BASE_WEIGHTS)
    // ai_aptitude = (0 + 0 + 100 + 0) / 4 = 25
    expect(result.ai_aptitude_score).toBeCloseTo(25, 1)
  })

  it('clamps overall_score to 100', () => {
    const maxInputs: ScoringInputs = {
      personality_fit: 100,
      cognitive_score: 100,
      prompt_reasoning_score: 100,
      tool_breadth_score: 100,
      output_judgment_score: 100,
      change_tolerance_score: 100,
      derailer_risk: 0,
      role_alignment: 100,
      seniority_level: 'senior',
    }
    const result = computeScore(maxInputs, BASE_WEIGHTS)
    expect(result.overall_score).toBe(100)
  })

  it('clamps overall_score to 0 minimum', () => {
    const minInputs: ScoringInputs = {
      personality_fit: 0,
      cognitive_score: 0,
      prompt_reasoning_score: 0,
      tool_breadth_score: 0,
      output_judgment_score: 0,
      change_tolerance_score: 0,
      derailer_risk: 0,
      role_alignment: 0,
      seniority_level: 'junior',
    }
    const result = computeScore(minInputs, BASE_WEIGHTS)
    expect(result.overall_score).toBe(0)
  })

  describe('director_plus derailer penalty', () => {
    it('caps score at 85 when derailer_risk > 70 for director_plus', () => {
      const inputs: ScoringInputs = {
        ...BASE_INPUTS,
        personality_fit: 100,
        cognitive_score: 100,
        role_alignment: 100,
        derailer_risk: 75,
        seniority_level: 'director_plus',
      }
      const result = computeScore(inputs, BASE_WEIGHTS)
      expect(result.overall_score).toBeLessThanOrEqual(85)
    })

    it('does NOT cap score when derailer_risk <= 70 for director_plus', () => {
      const inputs: ScoringInputs = {
        ...BASE_INPUTS,
        personality_fit: 100,
        cognitive_score: 100,
        role_alignment: 100,
        derailer_risk: 70,
        seniority_level: 'director_plus',
      }
      const result = computeScore(inputs, BASE_WEIGHTS)
      expect(result.overall_score).toBeGreaterThan(85)
    })

    it('does NOT apply director cap to senior seniority even with high derailer_risk', () => {
      const inputs: ScoringInputs = {
        ...BASE_INPUTS,
        personality_fit: 100,
        cognitive_score: 100,
        role_alignment: 100,
        derailer_risk: 90,
        seniority_level: 'senior',
      }
      const result = computeScore(inputs, BASE_WEIGHTS)
      expect(result.overall_score).toBeGreaterThan(85)
    })
  })

  describe('weight validation', () => {
    it('throws when weights do not sum to 1.0', () => {
      const badWeights: RoleWeights = {
        weight_personality: 0.3,
        weight_cognitive: 0.3,
        weight_ai_aptitude: 0.3,
        weight_alignment: 0.3,
      }
      expect(() => computeScore(BASE_INPUTS, badWeights)).toThrow(/sum to 1\.0/)
    })

    it('accepts weights within floating-point tolerance of 1.0', () => {
      const tolerantWeights: RoleWeights = {
        weight_personality: 0.25,
        weight_cognitive: 0.25,
        weight_ai_aptitude: 0.2500001,
        weight_alignment: 0.2499999,
      }
      expect(() => computeScore(BASE_INPUTS, tolerantWeights)).not.toThrow()
    })
  })

  it('passes through personality_fit, cognitive_score, derailer_risk unchanged', () => {
    const result = computeScore(BASE_INPUTS, BASE_WEIGHTS)
    expect(result.personality_fit).toBe(BASE_INPUTS.personality_fit)
    expect(result.cognitive_score).toBe(BASE_INPUTS.cognitive_score)
    expect(result.derailer_risk).toBe(BASE_INPUTS.derailer_risk)
    expect(result.role_alignment).toBe(BASE_INPUTS.role_alignment)
  })

  it('handles asymmetric weights correctly', () => {
    const aiHeavyWeights: RoleWeights = {
      weight_personality: 0.1,
      weight_cognitive: 0.1,
      weight_ai_aptitude: 0.7,
      weight_alignment: 0.1,
    }
    const result = computeScore(BASE_INPUTS, aiHeavyWeights)
    // ai_aptitude = 68.5, weighted more heavily
    expect(result.overall_score).toBeGreaterThan(0)
    expect(result.overall_score).toBeLessThanOrEqual(100)
  })
})
