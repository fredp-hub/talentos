'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2 } from 'lucide-react'

interface FunnelStage {
  label: string
  count: number
  color: string
}

export function CampaignFunnel() {
  const supabase = createClient()
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('candidates')
        .select('outreach_status')
        .eq('source', 'ilabor')

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        counts[row.outreach_status ?? 'not_contacted'] = (counts[row.outreach_status ?? 'not_contacted'] ?? 0) + 1
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      const contacted = total - (counts['not_contacted'] ?? 0)
      const replied = Object.entries(counts)
        .filter(([k]) => !['not_contacted', 'outreach_sent', 'not_interested', 'unresponsive'].includes(k))
        .reduce((a, [, v]) => a + v, 0)
      const stage2Done = Object.entries(counts)
        .filter(([k]) => ['stage2_complete', 'stage3_scheduled', 'stage3_complete', 'submitted', 'placed'].includes(k))
        .reduce((a, [, v]) => a + v, 0)
      const stage3Done = Object.entries(counts)
        .filter(([k]) => ['stage3_complete', 'submitted', 'placed'].includes(k))
        .reduce((a, [, v]) => a + v, 0)
      const submitted = (counts['submitted'] ?? 0) + (counts['placed'] ?? 0)

      setStages([
        { label: 'Database', count: total, color: '#e2e8f0' },
        { label: 'Contacted', count: contacted, color: '#93c5fd' },
        { label: 'Replied', count: replied, color: '#818cf8' },
        { label: 'Stage 2 ✓', count: stage2Done, color: '#6ee7b7' },
        { label: 'Stage 3 ✓', count: stage3Done, color: '#34d399' },
        { label: 'Submitted', count: submitted, color: '#10b981' },
      ])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const max = stages[0]?.count || 1

  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20 text-right">{s.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(s.count / max) * 100}%`,
                backgroundColor: s.color,
              }}
            />
          </div>
          <span className="text-xs font-mono text-gray-600 w-10">{s.count.toLocaleString()}</span>
          {s.label !== 'Database' && (
            <span className="text-xs text-gray-400 w-10">
              {max > 0 ? Math.round((s.count / max) * 100) : 0}%
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
