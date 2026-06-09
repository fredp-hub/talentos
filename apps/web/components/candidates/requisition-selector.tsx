'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useMatchStore } from '@/stores/matchStore'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, FileText, Plus } from 'lucide-react'
import type { RequisitionContext } from '@talentos/types'

interface ReqRow {
  id: string
  req_id: string | null
  title: string
  customer: string | null
  client_name: string | null
  seniority_level: string | null
  required_skills: string[] | null
  preferred_skills: string[] | null
  bill_rate_hourly: number | null
  c2c_rate: number | null
  start_date: string | null
}

function deriveSeniority(title: string, stored: string | null): string {
  if (stored) return stored
  const t = title.toLowerCase()
  if (t.includes('director') || t.includes('vp') || t.includes('head of')) return 'director_plus'
  if (t.includes('principal') || t.includes('lead') || t.includes('staff')) return 'lead'
  if (t.includes('senior') || t.includes('sr.')) return 'senior'
  if (t.includes('junior') || t.includes('jr.')) return 'junior'
  return 'mid'
}

function toContext(r: ReqRow): RequisitionContext {
  return {
    id: r.id,
    title: r.title,
    seniority_level: deriveSeniority(r.title, r.seniority_level),
    required_skills: r.required_skills ?? [],
    desired_skills: r.preferred_skills ?? [],
    client_name: r.customer ?? r.client_name ?? '',
    c2c_rate: r.bill_rate_hourly ?? r.c2c_rate ?? 0,
    start_date: r.start_date ?? '',
  }
}

export function RequisitionSelector() {
  const supabase = createClient()
  const { activeRequisition, setRequisition, clearMatch } = useMatchStore()
  const [reqs, setReqs] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('requisitions')
        .select('id, req_id, title, customer, client_name, seniority_level, required_skills, preferred_skills, bill_rate_hourly, c2c_rate, start_date')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      setReqs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const onSelect = (id: string) => {
    const r = reqs.find((x) => x.id === id)
    if (r) setRequisition(toContext(r))
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-muted-foreground">Match against:</span>
        </div>

        <div className="flex-1 min-w-[240px] max-w-md">
          <Select value={activeRequisition?.id ?? ''} onValueChange={onSelect}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={loading ? 'Loading requisitions…' : 'Select an active requisition…'} />
            </SelectTrigger>
            <SelectContent>
              {reqs.length === 0 && !loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No open requisitions yet</div>
              ) : (
                reqs.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}{r.customer ? ` · ${r.customer}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {activeRequisition && (
          <Button variant="ghost" size="sm" onClick={clearMatch}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}

        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link href="/dashboard/requisitions"><Plus className="h-4 w-4" /> New requisition</Link>
        </Button>
      </div>

      {activeRequisition && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{activeRequisition.seniority_level.replace('_', ' ')}</span>
          {activeRequisition.c2c_rate > 0 && <span>· ${activeRequisition.c2c_rate}/hr bill</span>}
          {activeRequisition.required_skills.length > 0 && (
            <span>· needs {activeRequisition.required_skills.slice(0, 4).join(', ')}</span>
          )}
        </div>
      )}
    </div>
  )
}
