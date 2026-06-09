'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { createRequisition } from '@/app/actions/create-requisition'

interface RequisitionFormProps {
  onSuccess?: (id: string) => void
}

export function RequisitionForm({ onSuccess }: RequisitionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', customer: '', req_id: '', location_city: '', location_state: '',
    is_remote: false, bill_rate_hourly: '', campaign_work_type: '', seniority_level: 'mid',
    required_skills: '', preferred_skills: '', num_positions: '1', priority_tier: '2', description: '',
  })

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const res = await createRequisition({
      title: form.title,
      customer: form.customer,
      req_id: form.req_id || undefined,
      location_city: form.location_city,
      location_state: form.location_state,
      is_remote: form.is_remote,
      bill_rate_hourly: form.bill_rate_hourly ? Number(form.bill_rate_hourly) : null,
      campaign_work_type: form.campaign_work_type || null,
      seniority_level: form.seniority_level,
      required_skills: form.required_skills.split(',').map((s) => s.trim()).filter(Boolean),
      preferred_skills: form.preferred_skills.split(',').map((s) => s.trim()).filter(Boolean),
      num_positions: form.num_positions ? Number(form.num_positions) : 1,
      priority_tier: form.priority_tier,
      description: form.description,
    })
    setSaving(false)
    if (!res.ok) { setError(res.error ?? 'Failed to create requisition'); return }
    if (onSuccess) onSuccess(res.id!)
    else router.push(`/dashboard/requisitions/${res.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
          <Input id="title" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Senior Java Engineer" className="mt-1" />
        </div>

        <div>
          <Label>Customer / Client</Label>
          <Input value={form.customer} onChange={(e) => set('customer', e.target.value)} placeholder="Capital One" className="mt-1" />
        </div>
        <div>
          <Label>Req ID</Label>
          <Input value={form.req_id} onChange={(e) => set('req_id', e.target.value)} placeholder="auto-generated if blank" className="mt-1" />
        </div>

        <div>
          <Label>City</Label>
          <Input value={form.location_city} onChange={(e) => set('location_city', e.target.value)} placeholder="McLean" className="mt-1" />
        </div>
        <div>
          <Label>State</Label>
          <Input value={form.location_state} onChange={(e) => set('location_state', e.target.value)} placeholder="VA" className="mt-1" />
        </div>

        <div>
          <Label>Bill Rate ($/hr)</Label>
          <Input type="number" value={form.bill_rate_hourly} onChange={(e) => set('bill_rate_hourly', e.target.value)} placeholder="115" className="mt-1" />
        </div>
        <div>
          <Label>Seniority</Label>
          <Select value={form.seniority_level} onValueChange={(v) => set('seniority_level', v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="director_plus">Director+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Work Type</Label>
          <Select value={form.campaign_work_type} onValueChange={(v) => set('campaign_work_type', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="w2_contract">W-2 Contract</SelectItem>
              <SelectItem value="c2c">Corp-to-Corp</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Onsite requirement</Label>
          <Select value={form.is_remote ? 'remote' : 'onsite'} onValueChange={(v) => set('is_remote', v === 'remote')}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="onsite">Onsite / Hybrid</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label>Required Skills <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
          <Input value={form.required_skills} onChange={(e) => set('required_skills', e.target.value)} placeholder="Java, AWS, Kafka" className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>Preferred Skills <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
          <Input value={form.preferred_skills} onChange={(e) => set('preferred_skills', e.target.value)} placeholder="Kubernetes, Terraform" className="mt-1" />
        </div>

        <div className="col-span-2">
          <Label>Job Description</Label>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} placeholder="Paste the full job description here…" className="mt-1 resize-none" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Creating…' : 'Create Requisition'}
        </Button>
      </div>
    </form>
  )
}
