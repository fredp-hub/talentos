'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePipeline, useAdvanceStage } from '@/lib/hooks/use-requisitions'
import type { Database } from '@talentos/types'

type PipelineEntry = Database['public']['Tables']['req_pipeline']['Row'] & {
  candidates: {
    id: string
    full_name: string
    seniority_level: string
    desired_rate: number | null
    availability_date: string | null
  } | null
}
import { capitalize, formatDate } from '@/lib/utils'
import { ChevronRight, UserPlus } from 'lucide-react'
import { AddToPipelineModal } from './add-to-pipeline-modal'
import type { PipelineStage } from '@talentos/types'

const STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { key: 'phone_screen', label: 'Phone Screen', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { key: 'technical_interview', label: 'Technical Interview', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  { key: 'client_submittal', label: 'Client Submittal', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { key: 'placed', label: 'Placed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
]

const STAGE_ORDER: PipelineStage[] = [
  'applied',
  'phone_screen',
  'technical_interview',
  'client_submittal',
  'placed',
]

interface PipelineBoardProps {
  requisitionId: string
}

export function PipelineBoard({ requisitionId }: PipelineBoardProps) {
  const { data: rawEntries, isLoading } = usePipeline(requisitionId)
  const entries = rawEntries as PipelineEntry[] | undefined
  const advanceStage = useAdvanceStage()
  const [addOpen, setAddOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((s) => (
          <div key={s.key} className="rounded-lg border bg-muted/30 p-3 min-h-[200px] animate-pulse" />
        ))}
      </div>
    )
  }

  const byStage = Object.fromEntries(
    STAGES.map((s) => [
      s.key,
      (entries ?? []).filter((e) => e.stage === s.key),
    ])
  ) as Record<PipelineStage, PipelineEntry[]>

  function nextStage(current: PipelineStage): PipelineStage | null {
    const idx = STAGE_ORDER.indexOf(current)
    return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {entries?.length ?? 0} candidate{entries?.length !== 1 ? 's' : ''} in pipeline
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGES.map((stage) => {
          const cards = byStage[stage.key] ?? []
          return (
            <div key={stage.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>

              <div className="flex flex-col gap-2 min-h-[120px]">
                {cards.map((entry) => {
                  const candidate = entry.candidates
                  if (!candidate) return null

                  const next = nextStage(entry.stage as PipelineStage)

                  return (
                    <Card key={entry.id} className="text-sm hover:border-primary/50 transition-colors">
                      <CardContent className="p-3 space-y-2">
                        <Link
                          href={`/dashboard/candidates/${candidate.id}`}
                          className="font-medium hover:underline block truncate"
                        >
                          {candidate.full_name}
                        </Link>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{capitalize(candidate.seniority_level)}</p>
                          {candidate.desired_rate && <p>${candidate.desired_rate}/hr</p>}
                          {candidate.availability_date && (
                            <p>Avail: {formatDate(candidate.availability_date)}</p>
                          )}
                        </div>
                        {next && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full h-7 text-xs"
                            disabled={advanceStage.isPending}
                            onClick={() =>
                              advanceStage.mutate({
                                pipeline_id: entry.id,
                                stage: next,
                                requisition_id: requisitionId,
                              })
                            }
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            {STAGES.find((s) => s.key === next)?.label}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <AddToPipelineModal
        requisitionId={requisitionId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
