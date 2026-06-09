'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2,
  Circle,
  Clock,
  Mail,
  Phone,
  Star,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface CampaignCandidate {
  id: string
  first_name: string | null
  full_name: string
  outreach_status: string | null
  campaign_tier: string | null
  ai_match_score: number | null
  primary_stack: string[] | null
  years_experience: number | null
  rate_floor_hourly: number | null
  work_type: string | null
  remote_preference: string | null
  availability: string | null
  ai_experience: boolean | null
  highest_role_summary: string | null
  behavioral_notes: string | null
}

interface MatchRow {
  id: string
  match_score: number
  skill_match_pct: number
  rate_aligned: boolean
  location_aligned: boolean
  work_type_aligned: boolean
  ai_rationale: string | null
  status: string
  requisitions: {
    id: string
    title: string
    customer: string | null
    location_city: string | null
    location_state: string | null
    bill_rate_hourly: number | null
    req_id: string | null
  } | null
}

interface OutreachEntry {
  id: string
  created_at: string
  channel: string | null
  status: string | null
  message_template: string | null
  req_id: string | null
}

// ── Skill category colors ──────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string> = {
  // Cloud → blue
  aws: 'bg-blue-100 text-blue-700',
  azure: 'bg-blue-100 text-blue-700',
  gcp: 'bg-blue-100 text-blue-700',
  // AI/ML → purple
  llm: 'bg-purple-100 text-purple-700',
  llms: 'bg-purple-100 text-purple-700',
  rag: 'bg-purple-100 text-purple-700',
  langchain: 'bg-purple-100 text-purple-700',
  openai: 'bg-purple-100 text-purple-700',
  'machine learning': 'bg-purple-100 text-purple-700',
  databricks: 'bg-purple-100 text-purple-700',
  // Data → green
  spark: 'bg-green-100 text-green-700',
  kafka: 'bg-green-100 text-green-700',
  sql: 'bg-green-100 text-green-700',
  postgresql: 'bg-green-100 text-green-700',
  snowflake: 'bg-green-100 text-green-700',
  dbt: 'bg-green-100 text-green-700',
}

function skillColor(skill: string): string {
  return SKILL_CATEGORIES[skill.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

// ── Outreach stepper ───────────────────────────────────────────────────────

const STAGES = [
  { key: 'not_contacted', label: 'Not Contacted' },
  { key: 'outreach_sent', label: 'Outreach Sent' },
  { key: 'replied', label: 'Replied' },
  { key: 'stage2_complete', label: 'Stage 2 Done' },
  { key: 'stage3_complete', label: 'Stage 3 Done' },
  { key: 'submitted', label: 'Submitted' },
]

const STAGE_ORDER: Record<string, number> = {
  not_contacted: 0,
  outreach_sent: 1,
  replied: 2,
  stage2_started: 2,
  stage2_complete: 3,
  stage3_scheduled: 4,
  stage3_complete: 4,
  submitted: 5,
  placed: 5,
}

function StatusStepper({ status }: { status: string | null }) {
  const currentIdx = STAGE_ORDER[status ?? 'not_contacted'] ?? 0
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  done
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Clock className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              </div>
              <span className={`text-[9px] text-center leading-tight ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`h-0.5 w-6 mb-4 ${i < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tier badge ─────────────────────────────────────────────────────────────

const TIER_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-gray-100 text-gray-600 border-gray-200',
  unscored: 'bg-gray-50 text-gray-400 border-gray-100',
}

// ── Match card ─────────────────────────────────────────────────────────────

function MatchCard({ match, onApprove }: { match: MatchRow; onApprove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const req = match.requisitions

  const tier = match.match_score >= 75 ? 'A' : match.match_score >= 55 ? 'B' : 'C'

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-gray-900">{req?.title ?? 'Unknown'}</p>
            <p className="text-xs text-gray-500">
              {req?.customer ?? ''}
              {req?.location_city ? ` · ${req.location_city}, ${req?.location_state}` : ''}
              {req?.bill_rate_hourly ? ` · $${req.bill_rate_hourly}/hr` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-xs border ${TIER_STYLE[tier]}`} variant="outline">
              {tier}
            </Badge>
            <span className="font-bold text-sm tabular-nums">{Math.round(match.match_score)}</span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {match.rate_aligned && (
            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Rate ✓</span>
          )}
          {match.location_aligned && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Location ✓</span>
          )}
          {match.work_type_aligned && (
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">Work type ✓</span>
          )}
          <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
            {Math.round(match.skill_match_pct)}% skills
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 bg-gray-50 space-y-3">
          {match.ai_rationale && (
            <p className="text-xs text-gray-600 italic">"{match.ai_rationale}"</p>
          )}
          <div className="flex gap-2">
            {match.status === 'suggested' && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onApprove(match.id)}
              >
                <Star className="h-3 w-3 mr-1" />
                Approve for Submission
              </Button>
            )}
            {match.status === 'recruiter_approved' && (
              <Badge className="text-xs bg-green-100 text-green-700">Approved</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function CampaignPanel({ candidateId }: { candidateId: string }) {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<CampaignCandidate | null>(null)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [outreachLog, setOutreachLog] = useState<OutreachEntry[]>([])
  const [behavioralNotes, setBehavioralNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [candRes, matchRes, outreachRes] = await Promise.all([
        (supabase as any)
          .from('candidates')
          .select('id, first_name, full_name, outreach_status, campaign_tier, ai_match_score, primary_stack, years_experience, rate_floor_hourly, work_type, remote_preference, availability, ai_experience, highest_role_summary, behavioral_notes')
          .eq('id', candidateId)
          .single(),
        (supabase as any)
          .from('candidate_req_matches')
          .select('id, match_score, skill_match_pct, rate_aligned, location_aligned, work_type_aligned, ai_rationale, status, requisitions(id, title, customer, location_city, location_state, bill_rate_hourly, req_id)')
          .eq('candidate_id', candidateId)
          .order('match_score', { ascending: false })
          .limit(10),
        (supabase as any)
          .from('outreach_log')
          .select('id, created_at, channel, status, message_template, req_id')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setCandidate(candRes.data ?? null)
      setBehavioralNotes(candRes.data?.behavioral_notes ?? '')
      setMatches(matchRes.data ?? [])
      setOutreachLog(outreachRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [candidateId])

  const saveNotes = async () => {
    setSaving(true)
    await (supabase as any)
      .from('candidates')
      .update({ behavioral_notes: behavioralNotes })
      .eq('id', candidateId)
    setSaving(false)
  }

  const approveMatch = async (matchId: string) => {
    await (supabase as any)
      .from('candidate_req_matches')
      .update({ status: 'recruiter_approved' })
      .eq('id', matchId)
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'recruiter_approved' } : m))
    )
  }

  if (loading || !candidate) return null

  // Only render if this candidate has campaign data
  const hasCampaignData =
    candidate.outreach_status ||
    (candidate.primary_stack && candidate.primary_stack.length > 0) ||
    matches.length > 0

  if (!hasCampaignData) return null

  const displayName = candidate.first_name ?? candidate.full_name.split(' ')[0]

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Profile</h3>
        {candidate.campaign_tier && (
          <Badge className={`border ${TIER_STYLE[candidate.campaign_tier] ?? TIER_STYLE.unscored}`} variant="outline">
            Tier {candidate.campaign_tier}
          </Badge>
        )}
        {candidate.ai_match_score != null && (
          <span className="text-sm text-gray-500">
            Best match: <strong>{Math.round(candidate.ai_match_score)}</strong>
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Candidate info ─────────────────────────────── */}
        <div className="space-y-5">
          {/* Outreach stepper */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Outreach Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusStepper status={candidate.outreach_status} />
            </CardContent>
          </Card>

          {/* Tech stack */}
          {candidate.primary_stack && candidate.primary_stack.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.primary_stack.map((skill) => (
                    <span
                      key={skill}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${skillColor(skill)}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                {candidate.ai_experience && (
                  <p className="text-xs text-purple-600 mt-2 font-medium">✦ AI/LLM experience confirmed</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Work preferences */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Work Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Availability', value: candidate.availability?.replace('_', ' ') },
                  { label: 'Rate Floor', value: candidate.rate_floor_hourly ? `$${candidate.rate_floor_hourly}/hr` : null },
                  { label: 'Work Type', value: candidate.work_type?.replace('_', ' ') },
                  { label: 'Location', value: candidate.remote_preference },
                  { label: 'Experience', value: candidate.years_experience ? `${candidate.years_experience} yrs` : null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700 capitalize">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              {candidate.highest_role_summary && (
                <p className="mt-3 text-xs text-gray-500 italic border-t pt-3">
                  "{candidate.highest_role_summary}"
                </p>
              )}
            </CardContent>
          </Card>

          {/* Behavioral notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stage 3 Notes (Recruiter)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                rows={4}
                value={behavioralNotes}
                onChange={(e) => setBehavioralNotes(e.target.value)}
                placeholder="Notes from the Stage 3 call — management style, culture fit, project preferences, red flags…"
                className="text-sm resize-none"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={saveNotes}
                disabled={saving}
                className="h-7 text-xs"
              >
                {saving ? 'Saving…' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Outreach log */}
          {outreachLog.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Outreach Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                  {outreachLog.map((entry) => (
                    <li key={entry.id} className="pl-4">
                      <span className="absolute -left-1 flex h-2 w-2 rounded-full bg-blue-400 mt-1" />
                      <p className="text-xs font-medium text-gray-700 capitalize">
                        {entry.channel ?? 'message'} · {entry.status ?? 'sent'}
                        {entry.req_id ? ` · req ${entry.req_id}` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(entry.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {entry.message_template && (
                        <button
                          onClick={() => navigator.clipboard.writeText(entry.message_template!)}
                          className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-2.5 w-2.5" /> Copy message
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Match intelligence ────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Matched Requisitions
                {matches.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">{matches.length} matches</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No matches yet — candidate completes Stage 2 to trigger matching.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => (
                    <MatchCard key={m.id} match={m} onApprove={approveMatch} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
