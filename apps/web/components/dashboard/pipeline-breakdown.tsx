'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PHASES } from '@/components/candidates/pipeline-phase'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Phases worth surfacing as "action needed" on the dashboard, in order
const TRACKED: { phase: string; actionable?: boolean }[] = [
  { phase: 'new', actionable: true },
  { phase: 'screening' },
  { phase: 'awaiting_survey', actionable: true },
  { phase: 'survey_complete', actionable: true },
  { phase: 'awaiting_interview' },
  { phase: 'interview_complete', actionable: true },
  { phase: 'awaiting_certification', actionable: true },
  { phase: 'ready_to_submit', actionable: true },
  { phase: 'submitted' },
]

export function PipelineBreakdown() {
  const supabase = createClient()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('candidates')
        .select('pipeline_phase')
        .not('pipeline_phase', 'in', '("placed","rejected","on_hold")')
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        const p = row.pipeline_phase ?? 'new'
        map[p] = (map[p] ?? 0) + 1
      }
      setCounts(map)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No candidates in the active pipeline yet.</p>
  }

  return (
    <div className="space-y-2.5">
      {TRACKED.map(({ phase, actionable }) => {
        const meta = PHASES.find((p) => p.value === phase)!
        const count = counts[phase] ?? 0
        if (count === 0) return null
        return (
          <Link
            key={phase}
            href={`/dashboard/candidates`}
            className="flex items-center gap-3 group"
          >
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-40 justify-center shrink-0', meta.color)}>
              {meta.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70 transition-all"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-8 text-right">{count}</span>
            {actionable && count > 0 && (
              <span className="text-2xs text-primary opacity-0 group-hover:opacity-100 transition-opacity w-24">
                {meta.waiting}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
