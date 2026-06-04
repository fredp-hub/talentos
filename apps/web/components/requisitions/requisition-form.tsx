'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateRequisition } from '@/lib/hooks/use-requisitions'

interface RequisitionFormProps {
  onSuccess?: (id: string) => void
}

export function RequisitionForm({ onSuccess }: RequisitionFormProps) {
  const router = useRouter()
  const create = useCreateRequisition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string) || undefined

    try {
      const req = await create.mutateAsync({
        title: fd.get('title') as string,
        ilabor_req_id: get('ilabor_req_id') ?? null,
        client_name: get('client_name') ?? null,
        end_customer: get('end_customer') ?? null,
        location: get('location') ?? null,
        start_date: get('start_date') ?? null,
        end_date: get('end_date') ?? null,
        duration: get('duration') ?? null,
        c2c_rate: fd.get('c2c_rate') ? Number(fd.get('c2c_rate')) : null,
        job_description: get('job_description') ?? null,
        status: 'open',
      })
      if (req) {
        if (onSuccess) {
          onSuccess(req.id)
        } else {
          router.push(`/dashboard/requisitions/${req.id}`)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create requisition')
    }
  }

  const fieldClass = 'mt-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input id="title" name="title" required placeholder="Senior Java Engineer" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="ilabor_req_id">iLabor Req ID</Label>
          <Input id="ilabor_req_id" name="ilabor_req_id" placeholder="IL-2024-001" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="client_name">Client Name</Label>
          <Input id="client_name" name="client_name" placeholder="Hubvia" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="end_customer">End Customer</Label>
          <Input id="end_customer" name="end_customer" placeholder="Capital One" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="McLean, VA (Remote)" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" name="start_date" type="date" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" name="end_date" type="date" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" name="duration" placeholder="12 months" className={fieldClass} />
        </div>

        <div>
          <Label htmlFor="c2c_rate">C2C Rate ($/hr)</Label>
          <Input id="c2c_rate" name="c2c_rate" type="number" step="0.01" placeholder="115.00" className={fieldClass} />
        </div>

        <div className="col-span-2">
          <Label htmlFor="job_description">Job Description</Label>
          <Textarea
            id="job_description"
            name="job_description"
            rows={8}
            placeholder="Paste the full job description here..."
            className="mt-1"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create Requisition'}
        </Button>
      </div>
    </form>
  )
}
