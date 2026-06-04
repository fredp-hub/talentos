'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CandidateStatus, SeniorityLevel, CertStatus, Database } from '@talentos/types'

type PipelineRow = Database['public']['Views']['v_candidate_pipeline']['Row']
type CandidateRow = Database['public']['Tables']['candidates']['Row']

export interface CandidateFilters {
  status?: CandidateStatus
  seniority_level?: SeniorityLevel
  cert_status?: CertStatus
  search?: string
}

export function useCandidates(filters: CandidateFilters = {}) {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from('v_candidate_pipeline').select('*')

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.seniority_level) query = query.eq('seniority_level', filters.seniority_level)
      if (filters.cert_status) query = query.eq('cert_status', filters.cert_status)
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('full_name')
      if (error) throw error
      return data as PipelineRow[]
    },
  })
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('candidates')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as CandidateRow | null
    },
    enabled: !!id,
  })
}

export function useAddCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      full_name: string
      email: string
      phone?: string | null
      linkedin_url?: string | null
      seniority_level: SeniorityLevel
      skills?: string[]
      desired_rate?: number | null
      availability_date?: string | null
      work_authorization?: string | null
      notes?: string | null
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('candidates')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...input, status: 'screening', skills: input.skills ?? [] } as any)
        .select()
        .single()
      if (error) throw error
      return data as CandidateRow | null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...update
    }: {
      id: string
      skills?: string[] | null
      desired_rate?: number | null
      availability_date?: string | null
      work_authorization?: string | null
      linkedin_url?: string | null
      resume_url?: string | null
      notes?: string | null
      status?: string
    }) => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('candidates')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CandidateRow | null
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['candidate', vars.id] })
    },
  })
}
