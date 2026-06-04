'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAddCandidate } from '@/lib/hooks/use-candidates'
import { Button } from '@/components/ui/button'
import { TagInput } from './tag-input'
import { cn } from '@/lib/utils'
import type { SeniorityLevel } from '@talentos/types'

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  linkedin_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  seniority_level: z.enum(['junior', 'mid', 'senior', 'lead', 'director_plus']),
  desired_rate: z.string().optional(),
  availability_date: z.string().optional(),
  work_authorization: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AddCandidateFormProps {
  onSuccess: (id?: string) => void
}

export function AddCandidateForm({ onSuccess }: AddCandidateFormProps) {
  const mutation = useAddCandidate()
  const [skills, setSkills] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { seniority_level: 'mid' },
  })

  async function onSubmit(values: FormValues) {
    const data = await mutation.mutateAsync({
      full_name: values.full_name,
      email: values.email,
      phone: values.phone || null,
      linkedin_url: values.linkedin_url || null,
      seniority_level: values.seniority_level as SeniorityLevel,
      skills,
      desired_rate: values.desired_rate ? Number(values.desired_rate) : null,
      availability_date: values.availability_date || null,
      work_authorization: values.work_authorization || null,
      notes: values.notes || null,
    })
    onSuccess(data?.id)
  }

  const fieldClass = cn(
    'w-full rounded-md border bg-background px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-sm font-medium">Full Name *</label>
          <input {...register('full_name')} className={fieldClass} placeholder="Jane Smith" />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-sm font-medium">Email *</label>
          <input {...register('email')} type="email" className={fieldClass} placeholder="jane@example.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Phone</label>
          <input {...register('phone')} type="tel" className={fieldClass} placeholder="512-555-0101" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">LinkedIn URL</label>
          <input {...register('linkedin_url')} type="url" className={fieldClass} placeholder="https://linkedin.com/in/..." />
          {errors.linkedin_url && <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Seniority Level</label>
          <select {...register('seniority_level')} className={fieldClass}>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="director_plus">Director+</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Work Authorization</label>
          <select {...register('work_authorization')} className={fieldClass}>
            <option value="">Select…</option>
            <option value="USC">US Citizen</option>
            <option value="GC">Green Card</option>
            <option value="H1B">H1B</option>
            <option value="EAD">EAD</option>
            <option value="TN">TN</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Desired Rate ($/hr)</label>
          <input {...register('desired_rate')} type="number" step="0.01" className={fieldClass} placeholder="95.00" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Availability Date</label>
          <input {...register('availability_date')} type="date" className={fieldClass} />
        </div>

        <div className="space-y-1 col-span-2">
          <label className="text-sm font-medium">Skills</label>
          <TagInput
            value={skills}
            onChange={setSkills}
            placeholder="Type a skill and press Enter…"
          />
        </div>

        <div className="space-y-1 col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className={cn(fieldClass, 'min-h-[72px] resize-y')}
            placeholder="Any relevant context about this candidate…"
          />
        </div>
      </div>

      {mutation.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Adding…' : 'Add Candidate'}
        </Button>
      </div>
    </form>
  )
}
