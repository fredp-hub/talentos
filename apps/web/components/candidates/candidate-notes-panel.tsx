'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MessageSquarePlus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  created_at: string
  note_type: 'general' | 'interview' | 'reference' | 'screen'
  content: string
  req_id: string | null
}

const TYPE_STYLE: Record<string, string> = {
  interview: 'bg-primary/10 text-primary',
  screen: 'bg-violet-500/12 text-violet-600',
  reference: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  general: 'bg-secondary text-muted-foreground',
}

const TYPE_LABEL: Record<string, string> = {
  interview: 'Interview', screen: 'Screen', reference: 'Reference', general: 'General',
}

export function CandidateNotesPanel({ candidateId, onEvaluated }: { candidateId: string; onEvaluated?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<Note['note_type']>('general')
  const [saving, setSaving] = useState(false)
  const [reevaluating, setReevaluating] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/candidate/notes?candidateId=${candidateId}`)
    const json = await res.json()
    setNotes(json.notes ?? [])
  }, [candidateId])

  useEffect(() => { load() }, [load])

  const addNote = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/candidate/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, note_type: noteType, content }),
      })
      const json = await res.json()
      if (json.note) setNotes((n) => [json.note, ...n])
      const wasInterview = noteType === 'interview' || noteType === 'screen'
      setContent('')

      // Interview/screen notes are strong signal → re-evaluate fit at interview stage
      if (wasInterview) {
        setReevaluating(true)
        await fetch('/api/candidate/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId, stage: 'interview' }),
        })
        setReevaluating(false)
        onEvaluated?.()
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteNote = async (id: string) => {
    await fetch(`/api/candidate/notes?id=${id}`, { method: 'DELETE' })
    setNotes((n) => n.filter((x) => x.id !== id))
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Composer */}
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={noteType} onValueChange={(v) => setNoteType(v as Note['note_type'])}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="screen">Phone Screen</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
              </SelectContent>
            </Select>
            {(noteType === 'interview' || noteType === 'screen') && (
              <span className="text-2xs text-primary inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Updates fit score
              </span>
            )}
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Add an interview takeaway, screen note, or general observation…"
            className="resize-none bg-card"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={addNote} disabled={saving || !content.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
              {reevaluating ? 'Re-evaluating…' : 'Add note'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="group flex gap-3">
                <span className={cn('text-2xs font-medium rounded-full px-2 py-0.5 h-fit shrink-0', TYPE_STYLE[n.note_type])}>
                  {TYPE_LABEL[n.note_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-fit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
