import type { SeniorityLevel } from '@talentos/types'

export interface ScoringInputs {
  personality_fit: number        // 0–100
  cognitive_score: number        // 0–100
  prompt_reasoning_score: number // 0–100
  tool_breadth_score: number     // 0–100
  output_judgment_score: number  // 0–100 — gets 1.4x multiplier inside ai_aptitude
  change_tolerance_score: number // 0–100
  derailer_risk: number          // 0–100
  role_alignment: number         // 0–100
  seniority_level: SeniorityLevel
}

export interface RoleWeights {
  weight_personality: number
  weight_cognitive: number
  weight_ai_aptitude: number
  weight_alignment: number
}

export interface CompositeScore {
  overall_score: number
  ai_aptitude_score: number
  personality_fit: number
  cognitive_score: number
  derailer_risk: number
  role_alignment: number
  scoring_model_version: string
}
