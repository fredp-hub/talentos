'use client'

import { useEffect, useRef, useState } from 'react'
import { useMatchStore } from '@/stores/matchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import type { MatchResult, ScoreDimension, SkillGap } from '@talentos/types'

interface MatchPanelProps {
  candidateId: string
  candidateName: string
}

export function MatchPanel({ candidateId, candidateName }: MatchPanelProps) {
  const { activeRequisition, matchResults, setMatchResult } = useMatchStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  const result = matchResults[candidateId]

  useEffect(() => {
    if (!activeRequisition || result || ranRef.current) return
    ranRef.current = true
    setLoading(true)
    fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, requisition: activeRequisition }),
    })
      .then((r) => r.json())
      .then((data: MatchResult) => {
        setMatchResult(candidateId, data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to compute match score.')
        setLoading(false)
      })
  }, [activeRequisition, candidateId, result, setMatchResult])

  if (!activeRequisition) return null

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (!result) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <CardTitle>
            Match Quality — {activeRequisition.title}
          </CardTitle>
          <SubmissionReadyBadge result={result} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Composite score */}
        <div className="flex items-center gap-4">
          <ScorePill score={result.composite_score} size="lg" />
          <TierBadge tier={result.tier} />
        </div>

        {/* Rationale callout */}
        <RationaleCallout summary={result.rationale_summary} />

        {/* Dimension bars */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Score Breakdown</h4>
          {result.dimensions.map((d) => (
            <DimensionBar key={d.label} dimension={d} />
          ))}
        </div>

        {/* Skill gap table */}
        {result.skill_gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Skill Gaps</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Skill</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Trainable</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ramp Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.skill_gaps.map((gap) => (
                    <GapRow key={gap.skill} gap={gap} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Derailer panel */}
        {result.hogan_triggered && (
          <DerailerPanel
            riskLevel={result.derailer_risk_level}
            candidateName={candidateName}
          />
        )}
      </CardContent>
    </Card>
  )
}

function SubmissionReadyBadge({ result }: { result: MatchResult }) {
  if (result.submission_ready) {
    return (
      <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1">
        <CheckCircle2 className="h-4 w-4" />
        Submission Ready
      </Badge>
    )
  }

  const reason = (() => {
    const blocker = result.skill_gaps.find((g) => g.priority === 'blocker')
    if (blocker) return `Blocker gap: ${blocker.skill}`
    if (result.derailer_risk_level === 'high') return 'High derailer risk'
    if (result.derailer_risk_level === 'elevated') return 'Elevated derailer risk'
    if (result.tier === 'C') return 'Tier C — score below 50'
    return 'Not ready'
  })()

  return (
    <Badge variant="error" className="flex items-center gap-1.5 px-3 py-1">
      <XCircle className="h-4 w-4" />
      Not Ready · {reason}
    </Badge>
  )
}

function ScorePill({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  const color =
    score >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
    score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  const sizeClass = size === 'lg' ? 'text-3xl px-5 py-2' : 'text-sm px-2.5 py-0.5'
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${color} ${sizeClass}`}>
      {score.toFixed(1)}
    </span>
  )
}

function TierBadge({ tier }: { tier: 'A' | 'B' | 'C' }) {
  const styles = {
    A: 'bg-emerald-500 text-white',
    B: 'bg-amber-500 text-white',
    C: 'bg-red-500 text-white',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${styles[tier]}`}>
      Tier {tier}
    </span>
  )
}

function RationaleCallout({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(summary).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg bg-muted/50 border p-4 relative">
      <p className="text-sm leading-relaxed pr-8">{summary}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 w-7 p-0"
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

function DimensionBar({ dimension }: { dimension: ScoreDimension }) {
  const [showRationale, setShowRationale] = useState(false)
  const color =
    dimension.score >= 75 ? 'bg-emerald-500' :
    dimension.score >= 50 ? 'bg-amber-500' :
    'bg-red-500'

  return (
    <div>
      <button
        onClick={() => setShowRationale((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left group"
      >
        <span className="text-sm w-36 shrink-0 font-medium group-hover:text-primary transition-colors">
          {dimension.label}
        </span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${dimension.score}%` }}
          />
        </div>
        <span className="text-sm font-mono w-10 text-right">{dimension.score}</span>
      </button>
      {showRationale && (
        <p className="text-xs text-muted-foreground mt-1 pl-[144px]">{dimension.rationale}</p>
      )}
    </div>
  )
}

function GapRow({ gap }: { gap: SkillGap }) {
  const priorityStyles = {
    blocker: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'nice-to-have': 'bg-secondary text-secondary-foreground',
  }

  return (
    <tr>
      <td className="px-3 py-2 font-medium">{gap.skill}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityStyles[gap.priority]}`}>
          {gap.priority}
        </span>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{gap.trainable ? 'Yes' : 'No'}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {gap.estimated_ramp_weeks != null ? `${gap.estimated_ramp_weeks}w` : '—'}
      </td>
    </tr>
  )
}

function DerailerPanel({
  riskLevel,
  candidateName,
}: {
  riskLevel: 'none' | 'low' | 'elevated' | 'high' | null
  candidateName: string
}) {
  const level = riskLevel ?? 'none'

  const config = {
    none: {
      color: 'border-emerald-300 dark:border-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: null,
      text: `${candidateName}'s derailer risk is within acceptable range.`,
    },
    low: {
      color: 'border-emerald-300 dark:border-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: null,
      text: `${candidateName} shows low derailer risk — proceed with standard oversight.`,
    },
    elevated: {
      color: 'border-amber-300 dark:border-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      text: `${candidateName} has elevated derailer risk. Monitor interpersonal dynamics closely.`,
    },
    high: {
      color: 'border-red-300 dark:border-red-700',
      badge: 'bg-red-100 text-red-700',
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      text: `${candidateName} has high derailer risk (HDS >70). Overall match score capped at 85.`,
    },
  }[level]

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${config.color}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span className="text-sm font-semibold">Hogan Derailer Assessment (Director+)</span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${config.badge}`}>
          {level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{config.text}</p>
    </div>
  )
}
