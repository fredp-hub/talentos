'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  UserPlus, Loader2, CheckCircle2, Copy, ArrowRight, Link2, Upload, X,
} from 'lucide-react'
import { addCandidate } from '@/app/actions/add-candidate'

const COMMON_SKILLS = [
  'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'AWS', 'Azure', 'GCP',
  'Kubernetes', 'SQL', 'Spark', 'Databricks', 'LLMs', 'RAG', '.NET', 'C#',
  'Salesforce', 'Go', 'Terraform', 'Kafka',
]

export default function AddCandidatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [surveyLink, setSurveyLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location_city: '', location_state: '',
    source_job_title: '', linkedin_url: '', years_experience: '', rate_floor_hourly: '',
    work_type: '', remote_preference: '', availability: '', notes: '',
  })
  const [stack, setStack] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const toggleSkill = (s: string) =>
    setStack((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const addCustomSkill = () => {
    const t = skillInput.trim()
    if (t && !stack.includes(t)) setStack((p) => [...p, t])
    setSkillInput('')
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const res = await addCandidate({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      location_city: form.location_city,
      location_state: form.location_state,
      source_job_title: form.source_job_title,
      linkedin_url: form.linkedin_url,
      primary_stack: stack,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      rate_floor_hourly: form.rate_floor_hourly ? Number(form.rate_floor_hourly) : null,
      work_type: form.work_type || null,
      remote_preference: form.remote_preference || null,
      availability: form.availability || null,
      notes: form.notes,
    })
    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to add candidate')
      if (res.duplicate && res.candidateId) setCreatedId(res.candidateId)
      return
    }
    setCreatedId(res.candidateId!)
  }

  const generateSurveyLink = async () => {
    if (!createdId) return
    setGeneratingLink(true)
    try {
      const res = await fetch('/api/intake/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: createdId }),
      })
      const json = await res.json()
      setSurveyLink(json.link)
    } finally {
      setGeneratingLink(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (createdId && !error) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center">
          <CardContent className="pt-10 pb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] mx-auto mb-5">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Candidate added</h2>
            <p className="mt-2 text-muted-foreground">
              {form.full_name} is now in your database. Send them a personality + skills survey to
              complete their profile.
            </p>

            {!surveyLink ? (
              <Button onClick={generateSurveyLink} disabled={generatingLink} className="mt-6 mx-auto">
                {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Generate survey link
              </Button>
            ) : (
              <div className="mt-6 rounded-xl border border-border/70 bg-secondary/40 p-3 flex items-center gap-2 text-left">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-mono truncate">{surveyLink}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(surveyLink)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/candidates/${createdId}`}>
                  View profile <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreatedId(null); setSurveyLink(null)
                  setForm({ full_name: '', email: '', phone: '', location_city: '', location_state: '', source_job_title: '', linkedin_url: '', years_experience: '', rate_floor_hourly: '', work_type: '', remote_preference: '', availability: '', notes: '' })
                  setStack([])
                }}
              >
                Add another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add a candidate</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a profile manually, or{' '}
            <Link href="/dashboard/candidates/import" className="text-primary hover:underline inline-flex items-center gap-1">
              <Upload className="h-3 w-3" /> bulk import a CSV
            </Link>
            .
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          {error}
          {createdId && (
            <Link href={`/dashboard/candidates/${createdId}`} className="underline font-medium">
              View existing
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Identity */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Jordan Rivera" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jordan@email.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(555) 123-4567" />
            </Field>
            <Field label="LinkedIn URL">
              <Input value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/…" />
            </Field>
            <Field label="City">
              <Input value={form.location_city} onChange={(e) => set('location_city', e.target.value)} placeholder="Austin" />
            </Field>
            <Field label="State">
              <Input value={form.location_state} onChange={(e) => set('location_state', e.target.value)} placeholder="TX" />
            </Field>
          </div>

          <div className="border-t border-border/70" />

          {/* Professional */}
          <Field label="Current / most recent title">
            <Input value={form.source_job_title} onChange={(e) => set('source_job_title', e.target.value)} placeholder="Senior Data Engineer" />
          </Field>

          {/* Skills */}
          <div>
            <Label className="mb-2 block">Tech stack</Label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    stack.includes(s)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-input'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                placeholder="Add another skill…"
              />
              <Button type="button" variant="outline" onClick={addCustomSkill} disabled={!skillInput.trim()}>Add</Button>
            </div>
            {stack.filter((s) => !COMMON_SKILLS.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stack.filter((s) => !COMMON_SKILLS.includes(s)).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => toggleSkill(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Years experience">
              <Input type="number" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} placeholder="8" />
            </Field>
            <Field label="Rate floor ($/hr)">
              <Input type="number" value={form.rate_floor_hourly} onChange={(e) => set('rate_floor_hourly', e.target.value)} placeholder="75" />
            </Field>
            <Field label="Availability">
              <Select value={form.availability} onValueChange={(v) => set('availability', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="two_weeks">2 weeks</SelectItem>
                  <SelectItem value="thirty_days">30 days</SelectItem>
                  <SelectItem value="not_looking">Not looking</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Work type">
              <Select value={form.work_type} onValueChange={(v) => set('work_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="w2_contract">W-2 Contract</SelectItem>
                  <SelectItem value="c2c">Corp-to-Corp</SelectItem>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location preference">
              <Select value={form.remote_preference} onValueChange={(v) => set('remote_preference', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Anything worth remembering about this candidate…" className="resize-none" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" asChild><Link href="/dashboard/candidates">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add candidate
        </Button>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
