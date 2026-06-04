import type { SeniorityLevel, UserRole, CandidateStatus } from './index'

export interface Candidate {
  id: string
  full_name: string
  email: string
  phone: string | null
  seniority_level: SeniorityLevel
  status: CandidateStatus
  embedding: number[] | null
  recruiter_id: string | null
  created_at: string
  updated_at: string
}


export interface CandidateScore {
  id: string
  candidate_id: string
  overall_score: number
  ai_aptitude_score: number
  personality_fit: number
  cognitive_score: number
  derailer_risk: number
  is_current: boolean
  scoring_model_version: string
  computed_at: string
}

export interface CandidateWithScore extends Candidate {
  current_score: CandidateScore | null
  recruiter: { id: string; full_name: string; role: UserRole } | null
}
