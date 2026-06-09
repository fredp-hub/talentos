'use client'

import { useState } from 'react'
import { FitScorePanel } from './fit-score-panel'
import { CandidateNotesPanel } from './candidate-notes-panel'

// Coordinates the fit score + notes so an interview note re-evaluates and
// the score panel refreshes immediately.
export function CandidateIntelligence({ candidateId }: { candidateId: string }) {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <>
      <FitScorePanel key={refreshKey} candidateId={candidateId} />
      <CandidateNotesPanel candidateId={candidateId} onEvaluated={() => setRefreshKey((k) => k + 1)} />
    </>
  )
}
