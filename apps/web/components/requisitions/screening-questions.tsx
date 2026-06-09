'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, RefreshCw, Copy, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreeningQuestion {
  id: string
  category: 'technical' | 'behavioral' | 'logistics'
  question: string
  look_for: string
}

const CAT_STYLE: Record<string, string> = {
  technical: 'bg-primary/10 text-primary',
  behavioral: 'bg-violet-500/12 text-violet-600',
  logistics: 'bg-amber-500/14 text-amber-700',
}

export function ScreeningQuestions({ requisitionId }: { requisitionId: string }) {
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/requisition/screening?reqId=${requisitionId}`)
        const json = await res.json()
        setQuestions(json.questions ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [requisitionId])

  const regenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/requisition/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId: requisitionId }),
      })
      const json = await res.json()
      setQuestions(json.questions ?? [])
    } finally {
      setRegenerating(false)
    }
  }

  const copyAll = () => {
    const text = questions.map((q, i) => `${i + 1}. ${q.question}\n   (Listen for: ${q.look_for})`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Preparing screening questions…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Screening Questions</p>
            <p className="text-2xs text-muted-foreground">AI-generated phone-screen guide for this role</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyAll}>
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy all'}
          </Button>
          <Button size="sm" variant="outline" onClick={regenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Couldn&apos;t generate questions. Try regenerating.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-2xs font-medium rounded-full px-2 py-0.5 capitalize', CAT_STYLE[q.category])}>
                        {q.category}
                      </span>
                    </div>
                    <p className="text-[15px] font-medium leading-snug">{q.question}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/70">Listen for:</span> {q.look_for}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
