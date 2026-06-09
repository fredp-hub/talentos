'use client'

import { useState } from 'react'
import { useMatchStore } from '@/stores/matchStore'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import type { RequisitionContext } from '@talentos/types'

const EMPTY_REQ: RequisitionContext = {
  id: '',
  title: '',
  seniority_level: 'mid',
  required_skills: [],
  desired_skills: [],
  client_name: '',
  c2c_rate: 0,
  start_date: '',
}

export function RequisitionSelector() {
  const { activeRequisition, setRequisition, clearMatch } = useMatchStore()
  const [expanded, setExpanded] = useState(!activeRequisition)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [form, setForm] = useState<RequisitionContext>(EMPTY_REQ)

  function handleJsonApply() {
    try {
      const parsed = JSON.parse(jsonInput) as RequisitionContext
      if (!parsed.id || !parsed.title) throw new Error('Missing required fields: id, title')
      setRequisition(parsed)
      setJsonError(null)
      setExpanded(false)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  function handleFormApply() {
    if (!form.id || !form.title) return
    setRequisition({
      ...form,
      required_skills: form.required_skills,
      desired_skills: form.desired_skills,
    })
    setExpanded(false)
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Active Requisition:</span>
          {activeRequisition ? (
            <span className="text-foreground font-semibold">{activeRequisition.title}</span>
          ) : (
            <span className="text-muted-foreground italic">None selected</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {activeRequisition && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearMatch()
                setExpanded(true)
              }}
              className="rounded p-0.5 hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setJsonMode(false)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${!jsonMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setJsonMode(true)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${jsonMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              Paste JSON
            </button>
          </div>

          {jsonMode ? (
            <div className="space-y-2">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{ "id": "req-001", "title": "Senior Java Developer", "seniority_level": "senior", "required_skills": ["Java", "AWS"], "desired_skills": ["Kafka"], "client_name": "Acme Corp", "c2c_rate": 85, "start_date": "2024-09-01" }'
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              <Button size="sm" onClick={handleJsonApply}>Apply</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Req ID *" value={form.id} onChange={(v) => setForm((f) => ({ ...f, id: v }))} />
              <Field label="Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
              <Field label="Client Name" value={form.client_name} onChange={(v) => setForm((f) => ({ ...f, client_name: v }))} />
              <div>
                <label className="text-xs text-muted-foreground">Seniority Level</label>
                <select
                  value={form.seniority_level}
                  onChange={(e) => setForm((f) => ({ ...f, seniority_level: e.target.value }))}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="director_plus">Director+</option>
                </select>
              </div>
              <SkillField
                label="Required Skills (comma-separated) *"
                skills={form.required_skills}
                onChange={(v) => setForm((f) => ({ ...f, required_skills: v }))}
              />
              <SkillField
                label="Desired Skills (comma-separated)"
                skills={form.desired_skills}
                onChange={(v) => setForm((f) => ({ ...f, desired_skills: v }))}
              />
              <Field
                label="C2C Rate ($/hr)"
                value={form.c2c_rate.toString()}
                onChange={(v) => setForm((f) => ({ ...f, c2c_rate: Number(v) || 0 }))}
                type="number"
              />
              <Field label="Start Date" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} type="date" />
              <div className="sm:col-span-2">
                <Button
                  size="sm"
                  onClick={handleFormApply}
                  disabled={!form.id || !form.title}
                >
                  Apply Requisition
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function SkillField({
  label,
  skills,
  onChange,
}: {
  label: string
  skills: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="text"
        value={skills.join(', ')}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="Java, AWS, Docker"
        className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
