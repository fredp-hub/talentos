export interface ScoringInputs {
  personality_fit: number
  cognitive_score: number
  prompt_reasoning_score: number
  tool_breadth_score: number
  output_judgment_score: number
  change_tolerance_score: number
  derailer_risk: number
  role_alignment: number
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
