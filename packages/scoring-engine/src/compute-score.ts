import type { ScoringInputs, RoleWeights, CompositeScore } from './types'

const SCORING_MODEL_VERSION = process.env['SCORING_MODEL_VERSION'] ?? 'v1.0.0'

// output_judgment_score carries extra weight within the ai_aptitude composite
const OUTPUT_JUDGMENT_MULTIPLIER = 1.4

// Director+ candidates are penalized when derailer risk is high
const DIRECTOR_DERAILER_THRESHOLD = 70
const DIRECTOR_MAX_SCORE_WHEN_DERAILED = 85

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max)
}

function computeAiAptitude(inputs: ScoringInputs): number {
  const { prompt_reasoning_score, tool_breadth_score, output_judgment_score, change_tolerance_score } =
    inputs

  // output_judgment_score boosted by 1.4x before averaging, then clamped to 100
  const boosted_output_judgment = clamp(output_judgment_score * OUTPUT_JUDGMENT_MULTIPLIER)

  const raw =
    (prompt_reasoning_score + tool_breadth_score + boosted_output_judgment + change_tolerance_score) / 4

  return clamp(raw)
}

export function computeScore(inputs: ScoringInputs, weights: RoleWeights): CompositeScore {
  const totalWeight =
    weights.weight_personality +
    weights.weight_cognitive +
    weights.weight_ai_aptitude +
    weights.weight_alignment

  // Guard: weights must sum to 1.0 (allow floating-point tolerance)
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    throw new Error(
      `Role weights must sum to 1.0 — got ${totalWeight.toFixed(4)}. ` +
        `(personality=${weights.weight_personality}, cognitive=${weights.weight_cognitive}, ` +
        `ai_aptitude=${weights.weight_ai_aptitude}, alignment=${weights.weight_alignment})`
    )
  }

  const ai_aptitude_score = computeAiAptitude(inputs)

  const raw_overall =
    inputs.personality_fit * weights.weight_personality +
    inputs.cognitive_score * weights.weight_cognitive +
    ai_aptitude_score * weights.weight_ai_aptitude +
    inputs.role_alignment * weights.weight_alignment

  let overall_score = clamp(raw_overall)

  // Director+ penalty cap: if derailer_risk > 70, overall score cannot exceed 85
  if (
    inputs.seniority_level === 'director_plus' &&
    inputs.derailer_risk > DIRECTOR_DERAILER_THRESHOLD
  ) {
    overall_score = Math.min(overall_score, DIRECTOR_MAX_SCORE_WHEN_DERAILED)
  }

  return {
    overall_score: Math.round(overall_score * 10) / 10,
    ai_aptitude_score: Math.round(ai_aptitude_score * 10) / 10,
    personality_fit: Math.round(inputs.personality_fit * 10) / 10,
    cognitive_score: Math.round(inputs.cognitive_score * 10) / 10,
    derailer_risk: Math.round(inputs.derailer_risk * 10) / 10,
    role_alignment: Math.round(inputs.role_alignment * 10) / 10,
    scoring_model_version: SCORING_MODEL_VERSION,
  }
}
