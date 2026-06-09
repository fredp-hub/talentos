'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Copy, CheckCircle2, Link2, Loader2, ThumbsUp, AlertTriangle } from 'lucide-react'

interface Survey {
  id: string
  status: string
  completed_at: string | null
  ai_summary: string | null
  personality_scores: Record<string, number> | null
  technical_summary: string | null
  fit_highlights: string[] | null
  fit_concerns: string[] | null
}

const SCORE_LABELS: Record<string, string> = {
  communication: 'Communication',
  ownership: 'Ownership',
  adaptability: 'Adaptability',
  collaboration: 'Collaboration',
  technical_depth: 'Technical Depth',
}

export function SurveyResultsPanel({ candidateId }: { candidateId: string }) {
  const supabase = createClient()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingExists, setPendingExists] = useState(false)

  const load = async () => {
    const { data } = await (supabase as any)
      .from('candidate_surveys')
      .select('id, status, completed_at, ai_summary, personality_scores, technical_summary, fit_highlights, fit_concerns')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.status === 'completed') setSurvey(data)
    else if (data?.status === 'pending') setPendingExists(true)
    setLoading(false)
  }

  useEffect(() => { load() }, [candidateId])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/survey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      const json = await res.json()
      if (json.link) {
        setLink(json.link)
        setPendingExists(true)
      }
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return null

  // ── Completed: show AI read ──────────────────────────────
  if (survey) {
    const scores = survey.personality_scores ?? {}
    return (
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">AI Survey Read</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {survey.ai_summary && (
            <p className="text-[15px] leading-relaxed text-foreground/90">{survey.ai_summary}</p>
          )}

          {Object.keys(scores).length > 0 && (
            <div className="space-y-2.5">
              {Object.entries(scores).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-32 shrink-0">{SCORE_LABELS[key] ?? key}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-sm font-medium tabular-nums w-8 text-right">{val}</span>
                </div>
              ))}
            </div>
          )}

          {survey.technical_summary && (
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Technical</p>
              <p className="text-sm text-foreground/90">{survey.technical_summary}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {survey.fit_highlights && survey.fit_highlights.length > 0 && (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-[hsl(var(--success))] mb-2 flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> Strengths
                </p>
                <ul className="space-y-1.5">
                  {survey.fit_highlights.map((h, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex gap-2">
                      <span className="text-[hsl(var(--success))]">•</span>{h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {survey.fit_concerns && survey.fit_concerns.length > 0 && (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Watch-outs
                </p>
                <ul className="space-y-1.5">
                  {survey.fit_concerns.map((c, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex gap-2">
                      <span className="text-amber-500">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {survey.completed_at && (
            <p className="text-2xs text-muted-foreground">
              Completed {new Date(survey.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── No completed survey: offer to generate ───────────────
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">AI Personality Survey</CardTitle>
      </CardHeader>
      <CardContent>
        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Survey link generated — send it to the candidate. Results appear here once completed.
            </p>
            <div className="rounded-xl border border-border/70 bg-secondary/40 p-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-mono truncate">{link}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {pendingExists
                ? 'A survey link is already active for this candidate. Generate a fresh one if needed.'
                : 'Generate a tailored personality + skills survey for this candidate. AI writes the questions and scores the responses.'}
            </p>
            <Button onClick={generate} disabled={generating} className="shrink-0">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {pendingExists ? 'New link' : 'Generate survey'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
