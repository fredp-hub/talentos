'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Loader2, FileText, ClipboardList, MessageSquareText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FitScore {
  id: string
  created_at: string
  stage: 'resume' | 'survey' | 'interview' | 'manual'
  score: number
  delta: number | null
  feedback: string | null
  technical_snapshot: string | null
  personality_snapshot: string | null
}

const STAGE_META: Record<string, { label: string; icon: React.ElementType }> = {
  resume: { label: 'Resume', icon: FileText },
  survey: { label: 'Survey', icon: ClipboardList },
  interview: { label: 'Interview', icon: MessageSquareText },
  manual: { label: 'Snapshot', icon: Sparkles },
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-[hsl(var(--success))]'
  if (score >= 50) return 'text-[hsl(38_92%_42%)]'
  return 'text-destructive'
}

function scoreRing(score: number): string {
  if (score >= 75) return 'hsl(var(--success))'
  if (score >= 50) return 'hsl(38 92% 50%)'
  return 'hsl(var(--destructive))'
}

export function FitScorePanel({ candidateId }: { candidateId: string }) {
  const supabase = createClient()
  const [scores, setScores] = useState<FitScore[]>([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('candidate_fit_scores')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: true })
    setScores(data ?? [])
    setLoading(false)
  }, [candidateId])

  useEffect(() => { load() }, [load])

  const evaluate = async () => {
    setEvaluating(true)
    try {
      const stage = scores.length === 0 ? 'resume' : 'manual'
      await fetch('/api/candidate/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, stage }),
      })
      await load()
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) return null

  const latest = scores[scores.length - 1]
  const current = latest?.score ?? null
  const pct = current ?? 0
  const circumference = 2 * Math.PI * 36

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Fit Score</CardTitle>
        </div>
        <Button size="sm" onClick={evaluate} disabled={evaluating}>
          {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {scores.length === 0 ? 'Evaluate' : 'Re-evaluate'}
        </Button>
      </CardHeader>

      <CardContent>
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No evaluation yet. Click <span className="font-medium text-foreground">Evaluate</span> for an
            AI snapshot of this candidate&apos;s technical and personality fit. The score evolves as they
            complete a survey and interviews.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Current score ring + latest snapshot */}
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke={scoreRing(pct)}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (pct / 100) * circumference}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold tabular-nums', scoreColor(pct))}>{Math.round(pct)}</span>
                  <span className="text-2xs text-muted-foreground">/ 100</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {latest?.technical_snapshot && (
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Technical</p>
                    <p className="text-sm text-foreground/90">{latest.technical_snapshot}</p>
                  </div>
                )}
                {latest?.personality_snapshot && (
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Personality</p>
                    <p className="text-sm text-foreground/90">{latest.personality_snapshot}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Score history
              </p>
              <ol className="relative border-l border-border/70 ml-3 space-y-4">
                {scores.map((s) => {
                  const meta = STAGE_META[s.stage]
                  const Icon = meta.icon
                  return (
                    <li key={s.id} className="pl-6">
                      <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{meta.label}</span>
                        <span className={cn('text-sm font-bold tabular-nums', scoreColor(s.score))}>
                          {Math.round(s.score)}
                        </span>
                        {s.delta != null && s.delta !== 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 text-2xs font-semibold rounded-full px-1.5 py-0.5',
                              s.delta > 0
                                ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {s.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {s.delta > 0 ? '+' : ''}{s.delta}
                          </span>
                        )}
                        {s.delta === 0 && (
                          <span className="inline-flex items-center text-2xs text-muted-foreground">
                            <Minus className="h-3 w-3" />
                          </span>
                        )}
                        <span className="ml-auto text-2xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {s.feedback && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.feedback}</p>}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
