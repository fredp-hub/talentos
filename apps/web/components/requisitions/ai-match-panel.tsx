'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getScoreBg, capitalize } from '@/lib/utils'
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { Database } from '@talentos/types'

type AiMatchRow = Database['public']['Tables']['ai_matches']['Row'] & {
  candidates: {
    id: string
    full_name: string
    email: string
    seniority_level: string
    skills: string[] | null
    desired_rate: number | null
  } | null
}


interface AiMatchPanelProps {
  requisitionId: string
}

export function AiMatchPanel({ requisitionId }: AiMatchPanelProps) {
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, 'gaps' | 'questions' | null>>({})
  const [detail, setDetail] = useState<Record<string, string>>({})
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['ai-matches', requisitionId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ai_matches')
        .select(`*, candidates (id, full_name, email, seniority_level, skills, desired_rate)`)
        .eq('requisition_id', requisitionId)
        .order('fit_score', { ascending: false })
      if (error) throw error
      return data as AiMatchRow[] | null
    },
  })

  async function runMatch() {
    setRunning(true)
    try {
      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisition_id: requisitionId }),
      })
      if (!res.ok) throw new Error('Match failed')
      queryClient.invalidateQueries({ queryKey: ['ai-matches', requisitionId] })
    } finally {
      setRunning(false)
    }
  }

  async function loadDetail(candidateId: string, type: 'gaps' | 'questions') {
    if (expanded[candidateId] === type) {
      setExpanded((p) => ({ ...p, [candidateId]: null }))
      return
    }

    const existing = matches?.find((m) => m.candidate_id === candidateId)
    const cached = type === 'gaps' ? existing?.gap_analysis : existing?.interview_questions
    if (cached) {
      setDetail((p) => ({ ...p, [`${candidateId}_${type}`]: cached }))
      setExpanded((p) => ({ ...p, [candidateId]: type }))
      return
    }

    setDetailLoading((p) => ({ ...p, [`${candidateId}_${type}`]: true }))
    try {
      const endpoint = type === 'gaps' ? '/api/ai/gaps' : '/api/ai/questions'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, requisition_id: requisitionId }),
      })
      const json = await res.json()
      const text = type === 'gaps' ? json.gap_analysis : json.interview_questions
      setDetail((p) => ({ ...p, [`${candidateId}_${type}`]: text }))
      setExpanded((p) => ({ ...p, [candidateId]: type }))
      queryClient.invalidateQueries({ queryKey: ['ai-matches', requisitionId] })
    } finally {
      setDetailLoading((p) => ({ ...p, [`${candidateId}_${type}`]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {matches?.length
              ? `${matches.length} candidates scored — ranked by fit`
              : 'Run AI matching to score all active candidates against this requisition.'}
          </p>
        </div>
        <Button onClick={runMatch} disabled={running}>
          {running ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scoring…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Run AI Match</>
          )}
        </Button>
      </div>

      {matchesLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {!matchesLoading && matches && matches.length > 0 && (
        <div className="space-y-2">
          {matches.map((m, idx) => {
            const cand = m.candidates as {
              id: string
              full_name: string
              email: string
              seniority_level: string
              skills: string[]
              desired_rate: number | null
            } | null
            if (!cand) return null

            const gapsKey = `${m.candidate_id}_gaps`
            const qKey = `${m.candidate_id}_questions`
            const isExpandedGaps = expanded[m.candidate_id] === 'gaps'
            const isExpandedQ = expanded[m.candidate_id] === 'questions'

            return (
              <Card key={m.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/candidates/${cand.id}`}
                          className="font-semibold hover:underline"
                        >
                          {cand.full_name}
                        </Link>
                        <Badge variant="outline">{capitalize(cand.seniority_level)}</Badge>
                        {cand.desired_rate && (
                          <span className="text-xs text-muted-foreground">${cand.desired_rate}/hr</span>
                        )}
                      </div>
                      {m.summary && (
                        <p className="text-sm text-muted-foreground mt-1">{m.summary}</p>
                      )}
                      {cand.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cand.skills.slice(0, 5).map((s) => (
                            <span
                              key={s}
                              className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                          {cand.skills.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{cand.skills.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {m.fit_score != null && (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${getScoreBg(m.fit_score)}`}
                        >
                          {m.fit_score}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={detailLoading[gapsKey]}
                      onClick={() => loadDetail(m.candidate_id, 'gaps')}
                    >
                      {detailLoading[gapsKey] ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : isExpandedGaps ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      )}
                      Gap Analysis
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={detailLoading[qKey]}
                      onClick={() => loadDetail(m.candidate_id, 'questions')}
                    >
                      {detailLoading[qKey] ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : isExpandedQ ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      )}
                      Interview Questions
                    </Button>
                  </div>

                  {(isExpandedGaps || isExpandedQ) && (
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                      {isExpandedGaps
                        ? detail[gapsKey] ?? m.gap_analysis
                        : detail[qKey] ?? m.interview_questions}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
