'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SurveyQuestion {
  id: string
  type: 'scale' | 'choice' | 'text'
  category: 'personality' | 'work_style' | 'technical'
  prompt: string
  options?: string[]
  scaleLabels?: [string, string]
}

const CATEGORY_LABEL: Record<string, string> = {
  personality: 'Personality',
  work_style: 'Work Style',
  technical: 'Technical',
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [surveyId, setSurveyId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [responses, setResponses] = useState<Record<string, string | number>>({})
  const [step, setStep] = useState(-1) // -1 = intro
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/survey/validate?token=${token}`)
        if (!res.ok) {
          const j = await res.json()
          setError(j.error ?? 'This link is no longer valid.')
          return
        }
        const json = await res.json()
        setSurveyId(json.surveyId)
        setQuestions(json.questions)
        setFirstName(json.firstName)
      } catch {
        setError('Unable to load your survey. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const setAnswer = useCallback((qid: string, value: string | number) => {
    setResponses((r) => ({ ...r, [qid]: value }))
  }, [])

  const current = questions[step]
  const answered = current ? responses[current.id] !== undefined && responses[current.id] !== '' : false

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, surveyId, responses }),
      })
      if (!res.ok) throw new Error()
      setComplete(true)
    } catch {
      setError('Something went wrong submitting. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── States ─────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
      </Shell>
    )
  }

  if (complete) {
    return (
      <Shell>
        <div className="text-center max-w-sm animate-in-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Thank you{firstName ? `, ${firstName}` : ''}!</h1>
          <p className="text-muted-foreground mt-2">
            Your responses are in. Your recruiter will be in touch with next steps shortly.
          </p>
        </div>
      </Shell>
    )
  }

  // Intro screen
  if (step === -1) {
    return (
      <Shell>
        <div className="text-center max-w-md animate-in-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto mb-5 shadow-soft-lg">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi{firstName ? ` ${firstName}` : ''} — a few quick questions
          </h1>
          <p className="text-muted-foreground mt-3">
            This short survey was tailored just for you. It takes about 3 minutes and helps us match
            you to the right roles. There are no wrong answers.
          </p>
          <Button size="lg" className="mt-8" onClick={() => setStep(0)}>
            Get started <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="text-2xs text-muted-foreground mt-4">{questions.length} questions</p>
        </div>
      </Shell>
    )
  }

  const progress = ((step + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="glass border-b border-border/70 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {current && CATEGORY_LABEL[current.category]}
            </span>
            <span className="text-2xs text-muted-foreground">{step + 1} / {questions.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <div className="flex-1">
          {current && (
            <div key={current.id} className="animate-in-up">
              <h2 className="text-xl font-semibold tracking-tight leading-snug mb-6">{current.prompt}</h2>

              {/* Scale */}
              {current.type === 'scale' && (
                <div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAnswer(current.id, n)}
                        className={cn(
                          'flex-1 aspect-square rounded-2xl border-2 text-lg font-semibold transition-all active:scale-95',
                          responses[current.id] === n
                            ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                            : 'border-border bg-card text-muted-foreground hover:border-input'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {current.scaleLabels && (
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{current.scaleLabels[0]}</span>
                      <span>{current.scaleLabels[1]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Choice */}
              {current.type === 'choice' && (
                <div className="space-y-3">
                  {current.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(current.id, opt)}
                      className={cn(
                        'w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.99]',
                        responses[current.id] === opt
                          ? 'border-primary bg-accent text-accent-foreground font-medium'
                          : 'border-border bg-card text-foreground hover:border-input'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Text */}
              {current.type === 'text' && (
                <Textarea
                  value={(responses[current.id] as string) ?? ''}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  rows={5}
                  placeholder="Type your answer…"
                  className="resize-none text-base"
                  autoFocus
                />
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between gap-3 pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            className={step === 0 ? 'invisible' : ''}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {step < questions.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!answered}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!answered || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 ai-glow">
      {children}
    </div>
  )
}
