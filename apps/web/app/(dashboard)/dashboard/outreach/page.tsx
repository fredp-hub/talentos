'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Copy, Send, Link2, RefreshCw, Users, Mail, CheckCircle2, TrendingUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type OutreachStatus =
  | 'not_contacted' | 'outreach_sent' | 'replied' | 'stage2_started'
  | 'stage2_complete' | 'stage3_scheduled' | 'stage3_complete'
  | 'submitted' | 'placed' | 'not_interested' | 'unresponsive'

interface Candidate {
  id: string
  full_name: string
  first_name: string | null
  source_job_title: string | null
  primary_stack: string[] | null
  rate_floor_hourly: number | null
  outreach_status: OutreachStatus
  campaign_tier: string | null
  ai_match_score: number | null
  email: string | null
  location_city: string | null
  location_state: string | null
}

interface Requisition {
  id: string
  req_id: string | null
  title: string
  customer: string | null
  bill_rate_hourly: number | null
}

const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-100 text-gray-600',
  outreach_sent: 'bg-blue-100 text-blue-700',
  replied: 'bg-indigo-100 text-indigo-700',
  stage2_started: 'bg-purple-100 text-purple-700',
  stage2_complete: 'bg-violet-100 text-violet-700',
  stage3_scheduled: 'bg-amber-100 text-amber-700',
  stage3_complete: 'bg-orange-100 text-orange-700',
  submitted: 'bg-emerald-100 text-emerald-700',
  placed: 'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-600',
  unresponsive: 'bg-rose-100 text-rose-600',
}

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: 'Not Contacted',
  outreach_sent: 'Outreach Sent',
  replied: 'Replied',
  stage2_started: 'Stage 2 Started',
  stage2_complete: 'Stage 2 Complete',
  stage3_scheduled: 'Interview Scheduled',
  stage3_complete: 'Interview Complete',
  submitted: 'Submitted',
  placed: 'Placed',
  not_interested: 'Not Interested',
  unresponsive: 'Unresponsive',
}

const TIER_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-gray-100 text-gray-600 border-gray-200',
  unscored: 'bg-gray-50 text-gray-400 border-gray-100',
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const supabase = createClient()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedReq, setSelectedReq] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messageModal, setMessageModal] = useState<{ candidateId: string; message: string } | null>(null)
  const [intakeLink, setIntakeLink] = useState<{ candidateId: string; link: string } | null>(null)
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [generatingLink, setGeneratingLink] = useState<Set<string>>(new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [candResult, reqResult] = await Promise.all([
      (supabase as any)
        .from('candidates')
        .select('id, full_name, first_name, source_job_title, primary_stack, rate_floor_hourly, outreach_status, campaign_tier, ai_match_score, email, location_city, location_state')
        .eq('source', 'ilabor')
        .order('ai_match_score', { ascending: false }),
      (supabase as any)
        .from('requisitions')
        .select('id, req_id, title, customer, bill_rate_hourly')
        .eq('status', 'open')
        .order('title'),
    ])
    setCandidates(candResult.data ?? [])
    setRequisitions(reqResult.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const stats = {
    total: candidates.length,
    contacted: candidates.filter((c) => c.outreach_status !== 'not_contacted').length,
    replied: candidates.filter((c) => ['replied', 'stage2_started', 'stage2_complete', 'stage3_scheduled', 'stage3_complete', 'submitted', 'placed'].includes(c.outreach_status)).length,
    placed: candidates.filter((c) => c.outreach_status === 'placed').length,
  }

  const filtered = candidates.filter((c) => {
    if (statusFilter !== 'all' && c.outreach_status !== statusFilter) return false
    if (tierFilter !== 'all' && c.campaign_tier !== tierFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!c.full_name?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s) && !c.source_job_title?.toLowerCase().includes(s)) return false
    }
    return true
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((c) => c.id)))
  }

  const generateMessage = async (candidateId: string) => {
    if (!selectedReq) return
    setGenerating((prev) => new Set(prev).add(candidateId))
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, reqId: selectedReq }),
      })
      const json = await res.json()
      setMessageModal({ candidateId, message: json.message })
      await loadData() // Refresh status
    } finally {
      setGenerating((prev) => { const n = new Set(prev); n.delete(candidateId); return n })
    }
  }

  const generateIntakeLink = async (candidateId: string) => {
    setGeneratingLink((prev) => new Set(prev).add(candidateId))
    try {
      const res = await fetch('/api/intake/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      const json = await res.json()
      setIntakeLink({ candidateId, link: json.link })
    } finally {
      setGeneratingLink((prev) => { const n = new Set(prev); n.delete(candidateId); return n })
    }
  }

  const bulkGenerate = async () => {
    if (!selectedReq || selected.size === 0) return
    setBulkGenerating(true)
    try {
      await fetch('/api/outreach/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: Array.from(selected), reqId: selectedReq }),
      })
      await loadData()
      setSelected(new Set())
    } finally {
      setBulkGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">iLabor database — {candidates.length} candidates</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={stats.total} icon={Users} color="text-gray-400" />
        <StatCard label="Contacted" value={stats.contacted} icon={Mail} color="text-blue-500" />
        <StatCard label="Responded" value={stats.replied} icon={TrendingUp} color="text-indigo-500" />
        <StatCard label="Placed" value={stats.placed} icon={CheckCircle2} color="text-green-500" />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search name, email, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="A">Tier A</SelectItem>
              <SelectItem value="B">Tier B</SelectItem>
              <SelectItem value="C">Tier C</SelectItem>
              <SelectItem value="unscored">Unscored</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-3 items-center border-t pt-3">
          <Select value={selectedReq} onValueChange={setSelectedReq}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select requisition for outreach…" />
            </SelectTrigger>
            <SelectContent>
              {requisitions.map((r) => (
                <SelectItem key={r.id} value={r.req_id ?? r.id}>
                  {r.title} {r.customer ? `· ${r.customer}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <Button
              onClick={bulkGenerate}
              disabled={!selectedReq || bulkGenerating}
              className="gap-2"
            >
              {bulkGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Send className="h-4 w-4" /> Generate for {selected.size} selected</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stack</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                    No candidates match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{c.full_name}</p>
                        <p className="text-xs text-gray-400">{c.source_job_title ?? c.email ?? '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.campaign_tier ? (
                        <Badge className={`text-xs border ${TIER_COLORS[c.campaign_tier] ?? TIER_COLORS.unscored}`} variant="outline">
                          {c.campaign_tier}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {c.ai_match_score ? `${Math.round(c.ai_match_score)}` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[c.outreach_status] ?? STATUS_COLORS.not_contacted}`}>
                        {STATUS_LABELS[c.outreach_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-gray-500 max-w-[180px] truncate">
                        {c.primary_stack?.slice(0, 4).join(', ') ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {c.rate_floor_hourly ? `$${c.rate_floor_hourly}/hr` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={!selectedReq || generating.has(c.id)}
                          onClick={() => generateMessage(c.id)}
                          title="Generate outreach message"
                        >
                          {generating.has(c.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={generatingLink.has(c.id)}
                          onClick={() => generateIntakeLink(c.id)}
                          title="Generate intake link"
                        >
                          {generatingLink.has(c.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Link2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Message modal */}
      <Dialog open={!!messageModal} onOpenChange={() => setMessageModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generated Outreach Message</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {messageModal?.message}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (messageModal?.message) navigator.clipboard.writeText(messageModal.message)
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button size="sm" onClick={() => setMessageModal(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Intake link modal */}
      <Dialog open={!!intakeLink} onOpenChange={() => setIntakeLink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Candidate Intake Link</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Share this link with the candidate. It expires in 30 days.</p>
          <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-700 break-all">
            {intakeLink?.link}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (intakeLink?.link) navigator.clipboard.writeText(intakeLink.link)
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" /> Copy Link
            </Button>
            <Button size="sm" onClick={() => setIntakeLink(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
