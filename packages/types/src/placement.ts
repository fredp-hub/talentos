import type { PlacementStatus } from './index'

export interface Placement {
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

export interface PlacementWithDetails extends Placement {
  candidate: { id: string; full_name: string; email: string } | null
  client: { id: string; name: string; industry: string } | null
  role: { id: string; title: string; category: string } | null
}

export interface ThroughputSnapshot {
  id: string
  placement_id: string
  kpi_definition_id: string
  value: number
  ai_assisted: boolean
  period_start: string
  period_end: string
  recorded_at: string
}

export interface KpiDefinition {
  id: string
  metric_name: string
  metric_label: string
  unit: string
  source_system: string
  cadence: 'daily' | 'weekly' | 'monthly'
}
