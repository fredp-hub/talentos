'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { outreachFromPhase } from '@/lib/status-sync'

export type PipelinePhase =
  | 'new' | 'screening' | 'awaiting_survey' | 'survey_complete'
  | 'awaiting_interview' | 'interview_complete' | 'awaiting_certification'
  | 'ready_to_submit' | 'submitted' | 'placed' | 'rejected' | 'on_hold'

export const PHASES: { value: PipelinePhase; label: string; waiting: string; color: string }[] = [
  { value: 'new', label: 'New', waiting: 'Needs first review', color: 'bg-secondary text-muted-foreground' },
  { value: 'screening', label: 'Screening', waiting: 'In phone screen', color: 'bg-primary/10 text-primary' },
  { value: 'awaiting_survey', label: 'Awaiting Survey', waiting: 'Waiting on candidate to complete survey', color: 'bg-violet-500/12 text-violet-600' },
  { value: 'survey_complete', label: 'Survey Complete', waiting: 'Survey done — ready to schedule interview', color: 'bg-violet-500/15 text-violet-700' },
  { value: 'awaiting_interview', label: 'Awaiting Interview', waiting: 'Interview scheduled / pending', color: 'bg-amber-500/14 text-amber-700' },
  { value: 'interview_complete', label: 'Interview Done', waiting: 'Interviewed — needs decision', color: 'bg-amber-500/18 text-amber-800' },
  { value: 'awaiting_certification', label: 'Awaiting Cert', waiting: 'Waiting on certification proof', color: 'bg-orange-500/14 text-orange-700' },
  { value: 'ready_to_submit', label: 'Ready to Submit', waiting: 'Cleared — ready to submit to client', color: 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]' },
  { value: 'submitted', label: 'Submitted', waiting: 'Submitted to client', color: 'bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]' },
  { value: 'placed', label: 'Placed', waiting: 'Placed', color: 'bg-[hsl(var(--success))] text-white' },
  { value: 'rejected', label: 'Rejected', waiting: 'Not moving forward', color: 'bg-destructive/10 text-destructive' },
  { value: 'on_hold', label: 'On Hold', waiting: 'Paused', color: 'bg-secondary text-muted-foreground' },
]

export function phaseMeta(phase: string | null) {
  return PHASES.find((p) => p.value === phase) ?? PHASES[0]
}

export function PhaseBadge({ phase, showWaiting }: { phase: string | null; showWaiting?: boolean }) {
  const meta = phaseMeta(phase)
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit', meta.color)}>
        {meta.label}
      </span>
      {showWaiting && <span className="text-2xs text-muted-foreground">{meta.waiting}</span>}
    </span>
  )
}

export function PhaseControl({ candidateId, phase }: { candidateId: string; phase: string | null }) {
  const supabase = createClient()
  const [value, setValue] = useState<string>(phase ?? 'new')
  const [saving, setSaving] = useState(false)

  const update = async (v: string) => {
    setValue(v)
    setSaving(true)
    await (supabase as any)
      .from('candidates')
      .update({ pipeline_phase: v, outreach_status: outreachFromPhase(v) })
      .eq('id', candidateId)
    setSaving(false)
  }

  const meta = phaseMeta(value)

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={update}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHASES.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">{saving ? 'Saving…' : meta.waiting}</span>
    </div>
  )
}
