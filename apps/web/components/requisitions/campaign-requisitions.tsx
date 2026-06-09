'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Loader2, Users, ChevronRight, Star, Sparkles } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface CampaignReq {
  id: string
  req_id: string | null
  title: string
  customer: string | null
  location_city: string | null
  location_state: string | null
  bill_rate_hourly: number | null
  campaign_work_type: string | null
  priority_tier: string | null
  status: string | null
  num_positions: number | null
  required_skills: string[] | null
  is_remote: boolean | null
}

interface MatchedCandidate {
  id: string
  candidate_id: string
  match_score: number
  skill_match_pct: number
  rate_aligned: boolean
  status: string
  candidates: {
    full_name: string
    campaign_tier: string | null
    primary_stack: string[] | null
  } | null
}

const TIER_STYLE: Record<string, string> = {
  '1': 'bg-green-100 text-green-700 border-green-200',
  '2': 'bg-blue-100 text-blue-700 border-blue-200',
  '3': 'bg-gray-100 text-gray-600 border-gray-200',
  deprioritized: 'bg-red-50 text-red-400 border-red-100',
}

const CANDIDATE_TIER_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-gray-100 text-gray-600',
}

// ── Slide-over detail panel ────────────────────────────────────────────────

function ReqDetail({ req, onClose }: { req: CampaignReq; onClose: () => void }) {
  const supabase = createClient()
  const [matches, setMatches] = useState<MatchedCandidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('candidate_req_matches')
        .select('id, candidate_id, match_score, skill_match_pct, rate_aligned, status, candidates(full_name, campaign_tier, primary_stack)')
        .eq('req_id', req.id)
        .order('match_score', { ascending: false })
        .limit(20)
      setMatches(data ?? [])
      setLoading(false)
    }
    load()
  }, [req.id])

  const [explain, setExplain] = useState<Record<string, { loading: boolean; why?: string; alternatives?: { id: string; title: string; customer?: string | null; reason: string }[] }>>({})

  const approveMatch = async (matchId: string) => {
    await (supabase as any)
      .from('candidate_req_matches')
      .update({ status: 'recruiter_approved' })
      .eq('id', matchId)
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'recruiter_approved' } : m))
    )
  }

  const explainFit = async (candidateId: string) => {
    setExplain((e) => ({ ...e, [candidateId]: { loading: true } }))
    try {
      const res = await fetch('/api/requisition/explain-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, reqId: req.id }),
      })
      const json = await res.json()
      setExplain((e) => ({ ...e, [candidateId]: { loading: false, why: json.why, alternatives: json.alternatives } }))
    } catch {
      setExplain((e) => ({ ...e, [candidateId]: { loading: false, why: 'Could not analyze — please retry.' } }))
    }
  }

  return (
    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="text-base">{req.title}</SheetTitle>
        <p className="text-sm text-gray-500">
          {req.customer ?? 'Client TBD'}
          {req.location_city ? ` · ${req.location_city}, ${req.location_state}` : ''}
          {req.bill_rate_hourly ? ` · $${req.bill_rate_hourly}/hr` : ''}
        </p>
      </SheetHeader>

      {/* Job details */}
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Req ID', value: req.req_id },
            { label: 'Positions', value: req.num_positions ?? 1 },
            { label: 'Work type', value: req.campaign_work_type?.replace('_', ' ') },
            { label: 'Remote', value: req.is_remote ? 'Yes' : 'No' },
            { label: 'Priority', value: `Tier ${req.priority_tier}` },
            { label: 'Status', value: req.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium capitalize">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {req.required_skills && req.required_skills.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Required skills</p>
            <div className="flex flex-wrap gap-1">
              {req.required_skills.map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Matched Candidates
            {!loading && <span className="ml-2 text-xs font-normal text-gray-400">{matches.length}</span>}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No matches yet. Candidates generate matches when they complete Stage 2.
            </p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.id} className="border border-border/70 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.candidates?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.candidates?.primary_stack?.slice(0, 3).join(', ') ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.candidates?.campaign_tier && (
                        <Badge className={`text-xs ${CANDIDATE_TIER_STYLE[m.candidates.campaign_tier] ?? ''}`}>
                          {m.candidates.campaign_tier}
                        </Badge>
                      )}
                      <span className="text-sm font-mono">{Math.round(m.match_score)}</span>
                      {m.status === 'suggested' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1.5 text-xs"
                          onClick={() => approveMatch(m.id)}
                          title="Approve for submission"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Badge className="text-xs bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" variant="outline">✓</Badge>
                      )}
                    </div>
                  </div>

                  {/* Why / better-fit assistant */}
                  <div className="mt-1.5">
                    <button
                      onClick={() => explainFit(m.candidate_id)}
                      className="text-2xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      {explain[m.candidate_id]?.loading ? 'Analyzing…' : 'Why / better fit?'}
                    </button>

                    {explain[m.candidate_id] && !explain[m.candidate_id].loading && (
                      <div className="mt-2 rounded-lg bg-secondary/50 p-2.5 text-xs space-y-2 animate-in-up">
                        {explain[m.candidate_id].why && (
                          <p className="text-foreground/80">{explain[m.candidate_id].why}</p>
                        )}
                        {explain[m.candidate_id].alternatives && explain[m.candidate_id].alternatives!.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Better-fit roles</p>
                            {explain[m.candidate_id].alternatives!.map((alt) => (
                              <a
                                key={alt.id}
                                href={`/dashboard/requisitions/${alt.id}`}
                                className="block rounded-md bg-card border border-border/70 px-2 py-1.5 hover:border-input transition-colors"
                              >
                                <span className="font-medium">{alt.title}</span>
                                {alt.customer && <span className="text-muted-foreground"> · {alt.customer}</span>}
                                <span className="block text-muted-foreground mt-0.5">{alt.reason}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SheetContent>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────

export function CampaignRequisitions() {
  const supabase = createClient()
  const [reqs, setReqs] = useState<CampaignReq[]>([])
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CampaignReq | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('requisitions')
      .select('id, req_id, title, customer, location_city, location_state, bill_rate_hourly, campaign_work_type, priority_tier, status, num_positions, required_skills, is_remote')
      .not('req_id', 'is', null)
      .order('priority_tier', { ascending: true })
      .order('bill_rate_hourly', { ascending: false })

    setReqs(data ?? [])

    // Get match counts
    if (data && data.length > 0) {
      const ids = data.map((r: CampaignReq) => r.id)
      const { data: counts } = await (supabase as any)
        .from('candidate_req_matches')
        .select('req_id')
        .in('req_id', ids)

      const countMap: Record<string, number> = {}
      for (const row of counts ?? []) {
        countMap[row.req_id] = (countMap[row.req_id] ?? 0) + 1
      }
      setMatchCounts(countMap)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = reqs.filter((r) => {
    if (tierFilter !== 'all' && r.priority_tier !== tierFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!r.title?.toLowerCase().includes(s) && !r.customer?.toLowerCase().includes(s) && !r.req_id?.includes(s)) return false
    }
    return true
  })

  const approvedCounts: Record<string, number> = {}

  // Indicator color based on match count
  const matchIndicator = (id: string) => {
    const count = matchCounts[id] ?? 0
    if (count >= 3) return 'bg-green-400'
    if (count >= 1) return 'bg-amber-400'
    return 'bg-red-300'
  }

  return (
    <>
      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search title, customer, req ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="1">Priority 1</SelectItem>
            <SelectItem value="2">Priority 2</SelectItem>
            <SelectItem value="3">Priority 3</SelectItem>
            <SelectItem value="deprioritized">Deprioritized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-2 py-3" />
                <th className="text-left py-3 px-4 font-medium text-gray-500">Req / Title</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500 hidden md:table-cell">Customer</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500 hidden lg:table-cell">Location</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Rate</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Tier</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Matches</span>
                </th>
                <th className="py-3 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-10">
                    No campaign requisitions match the current filters
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(r)}
                  >
                    <td className="pl-3">
                      <div className={`h-2 w-2 rounded-full ${matchIndicator(r.id)}`} title={`${matchCounts[r.id] ?? 0} matches`} />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400">#{r.req_id}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 hidden md:table-cell">{r.customer ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden lg:table-cell">
                      {r.is_remote ? '🌐 Remote' : [r.location_city, r.location_state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">${r.bill_rate_hourly ?? '—'}/hr</span>
                      <p className="text-xs text-gray-400">max pay ${r.bill_rate_hourly ? Math.round(r.bill_rate_hourly * 0.7) : '—'}/hr</p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={`text-xs border ${TIER_STYLE[r.priority_tier ?? '3'] ?? TIER_STYLE['3']}`} variant="outline">
                        P{r.priority_tier}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-mono">
                        {matchCounts[r.id] ?? 0}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail slide-over */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <ReqDetail req={selected} onClose={() => setSelected(null)} />}
      </Sheet>
    </>
  )
}
