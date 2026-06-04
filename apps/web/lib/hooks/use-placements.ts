'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function usePlacements() {
  return useQuery({
    queryKey: ['placements'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('placements')
        .select(`
          *,
          candidate:candidates(id, full_name, email),
          client:clients(id, name, industry),
          role:roles(id, title, category)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePlacementUplift() {
  return useQuery({
    queryKey: ['placement-uplift'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('v_placement_uplift')
        .select('*')
      if (error) throw error
      return data
    },
  })
}
