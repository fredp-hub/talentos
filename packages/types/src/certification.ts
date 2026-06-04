import type { CertTier, CertStatus } from './index'

export interface Certification {
  id: string
  candidate_id: string
  tier: CertTier
  status: CertStatus
  issued_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface CertModule {
  id: string
  certification_id: string
  module_key: string
  module_label: string
  score: number | null
  assessed_by: string | null
  assessed_at: string | null
  status: CertStatus
}
