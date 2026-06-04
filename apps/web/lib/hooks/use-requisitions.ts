'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database, RequisitionStatus, PipelineStage } from '@talentos/types'

type RequisitionInsert = Database['public']['Tables']['requisitions']['Insert']
type RequisitionRow = Database['public']['Tables']['requisitions']['Row']
type ReqSummaryRow = Database['public']['Views']['v_requisition_summary']['Row']
type PipelineRow = Database['public']['Tables']['req_pipeline']['Row'] & {
  candidates: {
    id: string
    full_name: string
    email: string
    phone: string | null
    seniority_level: string
    skills: string[] | null
    desired_rate: number | null
    availability_date: string | null
    work_authorization: string | null
  } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

export function useRequisitions(status?: RequisitionStatus) {
  return useQuery({
    queryKey: ['requisitions', status],
    queryFn: async () => {
      const supabase = createClient()
      let query = db(supabase).from('v_requisition_summary').select('*').order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) throw error
      return data as ReqSummaryRow[]
    },
  })
}

export function useRequisition(id: string) {
  return useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await db(supabase).from('requisitions').select('*').eq('id', id).single()
      if (error) throw error
      return data as RequisitionRow | null
    },
    enabled: !!id,
  })
}

export function useCreateRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<RequisitionInsert, 'created_by'>) => {
      const supabase = createClient()
      const { data, error } = await db(supabase).from('requisitions').insert(input).select().single()
      if (error) throw error
      return data as RequisitionRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    },
  })
}

export function useUpdateRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & Database['public']['Tables']['requisitions']['Update']) => {
      const supabase = createClient()
      const { data, error } = await db(supabase).from('requisitions').update(update).eq('id', id).select().single()
      if (error) throw error
      return data as RequisitionRow | null
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['requisition', vars.id] })
    },
  })
}

export function usePipeline(requisition_id: string) {
  return useQuery({
    queryKey: ['pipeline', requisition_id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await db(supabase)
        .from('req_pipeline')
        .select('*, candidates(id, full_name, email, phone, seniority_level, skills, desired_rate, availability_date, work_authorization)')
        .eq('requisition_id', requisition_id)
        .order('stage_updated_at', { ascending: false })
      if (error) throw error
      return data as PipelineRow[]
    },
    enabled: !!requisition_id,
  })
}

export function useAddToPipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      candidate_id,
      requisition_id,
    }: {
      candidate_id: string
      requisition_id: string
    }) => {
      const supabase = createClient()
      const { data, error } = await db(supabase)
        .from('req_pipeline')
        .insert({ candidate_id, requisition_id, stage: 'applied' })
        .select()
        .single()
      if (error) throw error
      return data as Database['public']['Tables']['req_pipeline']['Row']
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', vars.requisition_id] })
      queryClient.invalidateQueries({ queryKey: ['candidate-pipeline', vars.candidate_id] })
    },
  })
}

export function useAdvanceStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pipeline_id,
      stage,
      requisition_id,
    }: {
      pipeline_id: string
      stage: PipelineStage
      requisition_id: string
    }) => {
      const supabase = createClient()
      const { data, error } = await db(supabase)
        .from('req_pipeline')
        .update({ stage, stage_updated_at: new Date().toISOString() })
        .eq('id', pipeline_id)
        .select()
        .single()
      if (error) throw error
      return data as Database['public']['Tables']['req_pipeline']['Row']
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', vars.requisition_id] })
    },
  })
}

export function useCandidatePipeline(candidate_id: string) {
  return useQuery({
    queryKey: ['candidate-pipeline', candidate_id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await db(supabase)
        .from('req_pipeline')
        .select('*, requisitions(id, title, client_name, status)')
        .eq('candidate_id', candidate_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Array<Database['public']['Tables']['req_pipeline']['Row'] & {
        requisitions: { id: string; title: string; client_name: string | null; status: string } | null
      }>
    },
    enabled: !!candidate_id,
  })
}
