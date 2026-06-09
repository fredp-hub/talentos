'use client'

import { create } from 'zustand'
import type { MatchResult, RequisitionContext } from '@talentos/types'

interface MatchStore {
  activeRequisition: RequisitionContext | null
  matchResults: Record<string, MatchResult>   // keyed by candidate_id
  isScoring: boolean
  setRequisition: (req: RequisitionContext) => void
  setMatchResult: (candidateId: string, result: MatchResult) => void
  setScoring: (val: boolean) => void
  clearMatch: () => void
}

export const useMatchStore = create<MatchStore>((set) => ({
  activeRequisition: null,
  matchResults: {},
  isScoring: false,
  setRequisition: (req) => set({ activeRequisition: req }),
  setMatchResult: (candidateId, result) =>
    set((state) => ({
      matchResults: { ...state.matchResults, [candidateId]: result },
    })),
  setScoring: (val) => set({ isScoring: val }),
  clearMatch: () => set({ activeRequisition: null, matchResults: {}, isScoring: false }),
}))
