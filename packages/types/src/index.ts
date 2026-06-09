// Enums
export type SeniorityLevel =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'director_plus'

export type AssessmentFramework =
  | 'PI_behavioral'
  | 'PI_cognitive'
  | 'hogan_HPI'
  | 'hogan_HDS'
  | 'hogan_MVPI'

export type CertTier = 'foundational' | 'practitioner' | 'advanced'

export type CertStatus =
  | 'not_started'
  | 'in_progress'
  | 'certified'
  | 'expired'

export type UserRole = 'admin' | 'recruiter' | 'client'

export type PlacementStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'terminated'

export type RequisitionStatus = 'open' | 'filled' | 'cancelled'

export type PipelineStage =
  | 'applied'
  | 'phone_screen'
  | 'technical_interview'
  | 'client_submittal'
  | 'placed'

export type CandidateStatus = 'active' | 'placed' | 'inactive' | 'screening'

// Domain types
export type { Candidate, CandidateScore, CandidateWithScore } from './candidate'
export type {
  AssessmentResult,
  AssessmentInvitation,
  AiAptitudeAssessment,
  InvitationStatus,
} from './assessment'
export type { ScoringInputs, RoleWeights, CompositeScore } from './scoring'
export type { Certification, CertModule } from './certification'
export type {
  Placement,
  PlacementWithDetails,
  ThroughputSnapshot,
  KpiDefinition,
} from './placement'

// ──────────────────────────────────────────────────────────────────────────────
// Outreach & Intake types
// ──────────────────────────────────────────────────────────────────────────────

export type OutreachStatus =
  | 'not_contacted'
  | 'outreach_sent'
  | 'replied'
  | 'stage2_started'
  | 'stage2_complete'
  | 'stage3_scheduled'
  | 'stage3_complete'
  | 'submitted'
  | 'placed'
  | 'not_interested'
  | 'unresponsive'

export type WorkType = 'w2_contract' | 'c2c' | 'fulltime' | 'any'
export type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'flexible'
export type AvailabilityWindow = 'immediate' | 'two_weeks' | 'thirty_days' | 'not_looking'
export type CampaignTier = 'A' | 'B' | 'C' | 'unscored'

export type IntakeFormData = {
  work_type: WorkType
  availability: AvailabilityWindow
  primary_stack: string[]
  years_experience: number
  highest_role_summary: string
  remote_preference: RemotePreference
  rate_floor_hourly: number | null
  github_url: string | null
  ai_experience: boolean
  ai_experience_detail: string | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Match Quality Pipeline types
// ──────────────────────────────────────────────────────────────────────────────

export type ScoreDimension = {
  label: string
  score: number       // 0–100
  weight: number      // 0–1, weights across dimensions sum to 1
  rationale: string   // plain-English explanation, 1 sentence
}

export type SkillGap = {
  skill: string
  priority: 'blocker' | 'important' | 'nice-to-have'
  trainable: boolean
  estimated_ramp_weeks: number | null
}

export type MatchResult = {
  candidate_id: string
  requisition_id: string
  composite_score: number                                    // 0–100 final weighted score
  tier: 'A' | 'B' | 'C'                                    // A=75+, B=50–74, C=<50
  dimensions: ScoreDimension[]
  skill_gaps: SkillGap[]
  reverse_compatibility_score: number
  submission_ready: boolean
  rationale_summary: string                                 // 2–3 sentence plain-English summary
  hogan_triggered: boolean                                  // true if seniority = director_plus
  derailer_risk_level: 'none' | 'low' | 'elevated' | 'high' | null
}

export type RequisitionContext = {
  id: string
  title: string
  seniority_level: string
  required_skills: string[]
  desired_skills: string[]
  client_name: string
  c2c_rate: number
  start_date: string
}

// Client & Role
export interface Client {
  id: string
  name: string
  industry: string
  is_active: boolean
  created_at: string
}

export interface Role {
  id: string
  client_id: string
  title: string
  category: string
  weight_personality: number
  weight_cognitive: number
  weight_ai_aptitude: number
  weight_alignment: number
  created_at: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Supabase Database shape
// ──────────────────────────────────────────────────────────────────────────────
// Supabase Database shape
// ──────────────────────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          seniority_level: SeniorityLevel
          status: string
          embedding: number[] | null
          recruiter_id: string | null
          linkedin_url: string | null
          resume_url: string | null
          skills: string[] | null
          desired_rate: number | null
          availability_date: string | null
          work_authorization: string | null
          notes: string | null
          created_at: string
          updated_at: string
          // Outreach & intake fields
          first_name: string | null
          last_name: string | null
          work_type: WorkType | null
          rate_floor_hourly: number | null
          remote_preference: RemotePreference | null
          availability: AvailabilityWindow | null
          available_from: string | null
          primary_stack: string[] | null
          years_experience: number | null
          highest_role_summary: string | null
          ai_experience: boolean
          ai_experience_detail: string | null
          source: string | null
          source_job_id: string | null
          outreach_status: OutreachStatus
          behavioral_notes: string | null
          management_preference: string | null
          project_type_preference: string | null
          ai_match_score: number | null
          campaign_tier: CampaignTier | null
          location_city: string | null
          location_state: string | null
        }
        Insert: {
          full_name: string
          email: string
          phone?: string | null
          seniority_level?: SeniorityLevel
          status?: string
          embedding?: number[] | null
          recruiter_id?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          desired_rate?: number | null
          availability_date?: string | null
          work_authorization?: string | null
          notes?: string | null
          first_name?: string | null
          last_name?: string | null
          work_type?: WorkType | null
          rate_floor_hourly?: number | null
          remote_preference?: RemotePreference | null
          availability?: AvailabilityWindow | null
          available_from?: string | null
          primary_stack?: string[] | null
          years_experience?: number | null
          highest_role_summary?: string | null
          ai_experience?: boolean
          ai_experience_detail?: string | null
          source?: string | null
          source_job_id?: string | null
          outreach_status?: OutreachStatus
          behavioral_notes?: string | null
          management_preference?: string | null
          project_type_preference?: string | null
          ai_match_score?: number | null
          campaign_tier?: CampaignTier | null
          location_city?: string | null
          location_state?: string | null
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          seniority_level?: SeniorityLevel
          status?: string
          embedding?: number[] | null
          recruiter_id?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          desired_rate?: number | null
          availability_date?: string | null
          work_authorization?: string | null
          notes?: string | null
          first_name?: string | null
          last_name?: string | null
          work_type?: WorkType | null
          rate_floor_hourly?: number | null
          remote_preference?: RemotePreference | null
          availability?: AvailabilityWindow | null
          available_from?: string | null
          primary_stack?: string[] | null
          years_experience?: number | null
          highest_role_summary?: string | null
          ai_experience?: boolean
          ai_experience_detail?: string | null
          source?: string | null
          source_job_id?: string | null
          outreach_status?: OutreachStatus
          behavioral_notes?: string | null
          management_preference?: string | null
          project_type_preference?: string | null
          ai_match_score?: number | null
          campaign_tier?: CampaignTier | null
          location_city?: string | null
          location_state?: string | null
        }
      }
      requisitions: {
        Row: {
          id: string
          ilabor_req_id: string | null
          title: string
          client_name: string | null
          end_customer: string | null
          location: string | null
          start_date: string | null
          end_date: string | null
          duration: string | null
          c2c_rate: number | null
          job_description: string | null
          status: RequisitionStatus
          client_id: string | null
          role_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          // Campaign fields
          req_id: string | null
          ats_id: string | null
          customer: string | null
          location_city: string | null
          location_state: string | null
          is_remote: boolean
          is_hybrid: boolean
          bill_rate_hourly: number | null
          campaign_work_type: WorkType | null
          required_skills: string[] | null
          preferred_skills: string[] | null
          num_positions: number
          priority_tier: '1' | '2' | '3' | 'deprioritized' | null
          num_submissions: number
        }
        Insert: {
          ilabor_req_id?: string | null
          title: string
          client_name?: string | null
          end_customer?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          duration?: string | null
          c2c_rate?: number | null
          job_description?: string | null
          status?: RequisitionStatus
          client_id?: string | null
          role_id?: string | null
          created_by?: string | null
          req_id?: string | null
          ats_id?: string | null
          customer?: string | null
          location_city?: string | null
          location_state?: string | null
          is_remote?: boolean
          is_hybrid?: boolean
          bill_rate_hourly?: number | null
          campaign_work_type?: WorkType | null
          required_skills?: string[] | null
          preferred_skills?: string[] | null
          num_positions?: number
          priority_tier?: '1' | '2' | '3' | 'deprioritized' | null
          num_submissions?: number
        }
        Update: {
          ilabor_req_id?: string | null
          title?: string
          client_name?: string | null
          end_customer?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          duration?: string | null
          c2c_rate?: number | null
          job_description?: string | null
          status?: RequisitionStatus
          req_id?: string | null
          ats_id?: string | null
          customer?: string | null
          location_city?: string | null
          location_state?: string | null
          is_remote?: boolean
          is_hybrid?: boolean
          bill_rate_hourly?: number | null
          campaign_work_type?: WorkType | null
          required_skills?: string[] | null
          preferred_skills?: string[] | null
          num_positions?: number
          priority_tier?: '1' | '2' | '3' | 'deprioritized' | null
          num_submissions?: number
        }
      }
      outreach_log: {
        Row: {
          id: string
          created_at: string
          candidate_id: string
          recruiter_id: string | null
          channel: 'email' | 'linkedin' | 'phone' | 'sms' | null
          message_template: string | null
          custom_note: string | null
          status: 'sent' | 'opened' | 'replied' | 'bounced' | 'opted_out' | null
          sent_at: string | null
          replied_at: string | null
          req_id: string | null
        }
        Insert: {
          candidate_id: string
          recruiter_id?: string | null
          channel?: 'email' | 'linkedin' | 'phone' | 'sms' | null
          message_template?: string | null
          custom_note?: string | null
          status?: 'sent' | 'opened' | 'replied' | 'bounced' | 'opted_out' | null
          sent_at?: string | null
          replied_at?: string | null
          req_id?: string | null
        }
        Update: {
          status?: 'sent' | 'opened' | 'replied' | 'bounced' | 'opted_out' | null
          replied_at?: string | null
        }
      }
      intake_tokens: {
        Row: {
          id: string
          candidate_id: string
          token_hash: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          candidate_id: string
          token_hash: string
          expires_at: string
          used_at?: string | null
        }
        Update: {
          used_at?: string | null
        }
      }
      candidate_req_matches: {
        Row: {
          id: string
          created_at: string
          candidate_id: string
          req_id: string
          match_score: number | null
          skill_match_pct: number | null
          rate_aligned: boolean | null
          location_aligned: boolean | null
          work_type_aligned: boolean | null
          ai_rationale: string | null
          status: 'suggested' | 'recruiter_approved' | 'outreach_sent' | 'candidate_interested' | 'submitted' | 'interviewing' | 'offered' | 'placed' | 'rejected' | 'withdrew'
        }
        Insert: {
          candidate_id: string
          req_id: string
          match_score?: number | null
          skill_match_pct?: number | null
          rate_aligned?: boolean | null
          location_aligned?: boolean | null
          work_type_aligned?: boolean | null
          ai_rationale?: string | null
          status?: 'suggested' | 'recruiter_approved' | 'outreach_sent' | 'candidate_interested' | 'submitted' | 'interviewing' | 'offered' | 'placed' | 'rejected' | 'withdrew'
        }
        Update: {
          match_score?: number | null
          skill_match_pct?: number | null
          rate_aligned?: boolean | null
          location_aligned?: boolean | null
          work_type_aligned?: boolean | null
          ai_rationale?: string | null
          status?: 'suggested' | 'recruiter_approved' | 'outreach_sent' | 'candidate_interested' | 'submitted' | 'interviewing' | 'offered' | 'placed' | 'rejected' | 'withdrew'
        }
      }
      req_pipeline: {
        Row: {
          id: string
          candidate_id: string
          requisition_id: string
          stage: PipelineStage
          stage_updated_at: string
          notes: string | null
          outcome: string | null
          created_at: string
        }
        Insert: {
          candidate_id: string
          requisition_id: string
          stage?: PipelineStage
          stage_updated_at?: string
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          stage?: PipelineStage
          stage_updated_at?: string
          notes?: string | null
          outcome?: string | null
        }
      }
      ai_matches: {
        Row: {
          id: string
          candidate_id: string
          requisition_id: string
          fit_score: number | null
          summary: string | null
          gap_analysis: string | null
          interview_questions: string | null
          generated_at: string
        }
        Insert: {
          candidate_id: string
          requisition_id: string
          fit_score?: number | null
          summary?: string | null
          gap_analysis?: string | null
          interview_questions?: string | null
          generated_at?: string
        }
        Update: {
          fit_score?: number | null
          summary?: string | null
          gap_analysis?: string | null
          interview_questions?: string | null
          generated_at?: string
        }
      }
      candidate_scores: {
        Row: {
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
        Insert: {
          candidate_id: string
          overall_score: number
          ai_aptitude_score: number
          personality_fit: number
          cognitive_score: number
          derailer_risk?: number
          is_current?: boolean
          scoring_model_version?: string
          computed_at?: string
        }
        Update: {
          overall_score?: number
          ai_aptitude_score?: number
          personality_fit?: number
          cognitive_score?: number
          derailer_risk?: number
          is_current?: boolean
          scoring_model_version?: string
        }
      }
      assessment_results: {
        Row: {
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
        Insert: {
          candidate_id: string
          framework: AssessmentFramework
          administered_at?: string
          raw_data?: Record<string, unknown>
          personality_fit?: number | null
          cognitive_score?: number | null
          derailer_risk?: number | null
          alignment_score?: number | null
        }
        Update: {
          framework?: AssessmentFramework
          administered_at?: string
          raw_data?: Record<string, unknown>
          personality_fit?: number | null
          cognitive_score?: number | null
          derailer_risk?: number | null
          alignment_score?: number | null
        }
      }
      assessment_invitations: {
        Row: {
          id: string
          candidate_id: string
          framework: AssessmentFramework
          invited_at: string
          completed_at: string | null
          expires_at: string
          token: string
          status: string
        }
        Insert: {
          candidate_id: string
          framework: AssessmentFramework
          invited_at?: string
          completed_at?: string | null
          expires_at?: string
          token?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          status?: string
        }
      }
      ai_aptitude_assessments: {
        Row: {
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
        Insert: {
          candidate_id: string
          prompt_reasoning_score: number
          tool_breadth_score: number
          output_judgment_score: number
          change_tolerance_score: number
          assessed_at?: string
          assessed_by: string
          notes?: string | null
        }
        Update: {
          prompt_reasoning_score?: number
          tool_breadth_score?: number
          output_judgment_score?: number
          change_tolerance_score?: number
          notes?: string | null
        }
      }
      placements: {
        Row: {
          id: string
          candidate_id: string
          client_id: string
          role_id: string
          status: PlacementStatus
          start_date: string | null
          end_date: string | null
          ai_enabled_date: string | null
          baseline_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          client_id: string
          role_id: string
          status?: PlacementStatus
          start_date?: string | null
          end_date?: string | null
          ai_enabled_date?: string | null
          baseline_period_end?: string | null
        }
        Update: {
          status?: PlacementStatus
          start_date?: string | null
          end_date?: string | null
          ai_enabled_date?: string | null
          baseline_period_end?: string | null
        }
      }
      certifications: {
        Row: {
          id: string
          candidate_id: string
          tier: CertTier
          status: CertStatus
          issued_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          tier?: CertTier
          status?: CertStatus
          issued_at?: string | null
          expires_at?: string | null
        }
        Update: {
          tier?: CertTier
          status?: CertStatus
          issued_at?: string | null
          expires_at?: string | null
        }
      }
      cert_modules: {
        Row: {
          id: string
          certification_id: string
          module_key: string
          module_label: string
          score: number | null
          assessed_by: string | null
          assessed_at: string | null
          status: CertStatus
        }
        Insert: {
          certification_id: string
          module_key: string
          module_label: string
          score?: number | null
          assessed_by?: string | null
          assessed_at?: string | null
          status?: CertStatus
        }
        Update: {
          score?: number | null
          assessed_by?: string | null
          assessed_at?: string | null
          status?: CertStatus
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          industry: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          industry?: string
          is_active?: boolean
        }
        Update: {
          name?: string
          industry?: string
          is_active?: boolean
        }
      }
      roles: {
        Row: {
          id: string
          client_id: string
          title: string
          category: string
          weight_personality: number
          weight_cognitive: number
          weight_ai_aptitude: number
          weight_alignment: number
          created_at: string
        }
        Insert: {
          client_id: string
          title: string
          category?: string
          weight_personality?: number
          weight_cognitive?: number
          weight_ai_aptitude?: number
          weight_alignment?: number
        }
        Update: {
          title?: string
          category?: string
          weight_personality?: number
          weight_cognitive?: number
          weight_ai_aptitude?: number
          weight_alignment?: number
        }
      }
      kpi_definitions: {
        Row: {
          id: string
          metric_name: string
          metric_label: string
          unit: string
          source_system: string
          cadence: 'daily' | 'weekly' | 'monthly'
        }
        Insert: {
          metric_name: string
          metric_label: string
          unit: string
          source_system?: string
          cadence?: 'daily' | 'weekly' | 'monthly'
        }
        Update: {
          metric_label?: string
          unit?: string
          source_system?: string
          cadence?: 'daily' | 'weekly' | 'monthly'
        }
      }
      throughput_snapshots: {
        Row: {
          id: string
          placement_id: string
          kpi_definition_id: string
          value: number
          ai_assisted: boolean
          period_start: string
          period_end: string
          recorded_at: string
        }
        Insert: {
          placement_id: string
          kpi_definition_id: string
          value: number
          ai_assisted?: boolean
          period_start: string
          period_end: string
          recorded_at?: string
        }
        Update: {
          value?: number
          ai_assisted?: boolean
          period_start?: string
          period_end?: string
        }
      }
    }
    Views: {
      v_candidate_pipeline: {
        Row: {
          id: string
          full_name: string
          email: string
          seniority_level: SeniorityLevel
          status: string
          overall_score: number | null
          ai_aptitude_score: number | null
          cert_status: CertStatus | null
          cert_tier: CertTier | null
          placement_status: PlacementStatus | null
        }
      }
      v_requisition_summary: {
        Row: {
          id: string
          ilabor_req_id: string | null
          title: string
          client_name: string | null
          end_customer: string | null
          location: string | null
          start_date: string | null
          end_date: string | null
          duration: string | null
          c2c_rate: number | null
          status: RequisitionStatus
          created_at: string
          candidate_count: number
        }
      }
      v_placement_uplift: {
        Row: {
          placement_id: string
          candidate_id: string
          candidate_name: string
          client_name: string
          role_title: string
          baseline_avg: number | null
          post_ai_avg: number | null
          uplift_pct: number | null
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
