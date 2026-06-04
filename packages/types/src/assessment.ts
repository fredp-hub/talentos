import type { AssessmentFramework } from './index'

export interface AssessmentResult {
  id: string
  candidate_id: string
  framework: AssessmentFramework
  administered_at: string
  raw_data: Record<string, unknown>
  personality_fit: number | null
  cognitive_score: number | null
  derailer_risk: number | null
  alignment_score: number | null
  created_at: string
}

export interface AssessmentInvitation {
  id: string
  candidate_id: string
  framework: AssessmentFramework
  invited_at: string
  completed_at: string | null
  expires_at: string
  token: string
  status: InvitationStatus
}

export type InvitationStatus = 'pending' | 'completed' | 'expired' | 'cancelled'

export interface AiAptitudeAssessment {
  id: string
  candidate_id: string
  prompt_reasoning_score: number
  tool_breadth_score: number
  output_judgment_score: number
  change_tolerance_score: number
  assessed_at: string
  assessed_by: string
  notes: string | null
}
