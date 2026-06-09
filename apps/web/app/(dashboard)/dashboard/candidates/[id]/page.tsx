import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreRadar } from '@/components/candidates/score-radar'
import { AssessmentStatusBadge } from '@/components/assessments/assessment-status-badge'
import { CandidateAtsSection } from '@/components/candidates/candidate-ats-section'
import { getScoreBg, capitalize, formatDate, formatScore } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, Linkedin, ExternalLink } from 'lucide-react'
import { MatchPanel } from '@/components/candidates/match-panel'
import { CampaignPanel } from '@/components/candidates/campaign-panel'
import { SurveyResultsPanel } from '@/components/candidates/survey-results-panel'
import { CandidateIntelligence } from '@/components/candidates/candidate-intelligence'
import { PhaseControl } from '@/components/candidates/pipeline-phase'
import type { Database, AssessmentFramework } from '@talentos/types'

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type ScoreRow = Database['public']['Tables']['candidate_scores']['Row']
type AssessmentRow = Database['public']['Tables']['assessment_results']['Row']
type AiAssessmentRow = Database['public']['Tables']['ai_aptitude_assessments']['Row']
type CertRow = Database['public']['Tables']['certifications']['Row']
type CertModuleRow = Database['public']['Tables']['cert_modules']['Row']

interface PlacementWithDetails {
  id: string
  status: string
  start_date: string | null
  end_date: string | null
  ai_enabled_date: string | null
  client: { name: string } | null
  role: { title: string } | null
}

interface ReqPipelineEntry {
  id: string
  stage: string
  created_at: string
  requisitions: {
    id: string
    title: string
    client_name: string | null
    status: string
  } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CandidateProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    candidateRes,
    scoresRes,
    assessmentsRes,
    aiAssessmentRes,
    certRes,
    certModulesRes,
    placementsRes,
    reqPipelineRes,
  ] = await Promise.all([
    supabase.from('candidates').select('*').eq('id', id).single(),
    supabase.from('candidate_scores').select('*').eq('candidate_id', id).eq('is_current', true).maybeSingle(),
    supabase.from('assessment_results').select('*').eq('candidate_id', id).order('administered_at', { ascending: false }),
    supabase.from('ai_aptitude_assessments').select('*').eq('candidate_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('certifications').select('*').eq('candidate_id', id).maybeSingle(),
    supabase.from('cert_modules').select('*').eq('certification_id', id),
    supabase.from('placements').select('id, status, start_date, end_date, ai_enabled_date, client:clients(name), role:roles(title)').eq('candidate_id', id).order('created_at', { ascending: false }),
    supabase.from('req_pipeline').select('id, stage, created_at, requisitions(id, title, client_name, status)').eq('candidate_id', id).order('created_at', { ascending: false }),
  ])

  const candidate = candidateRes.data as CandidateRow | null
  const score = scoresRes.data as ScoreRow | null
  const assessments = assessmentsRes.data as AssessmentRow[] | null
  const aiAssessment = aiAssessmentRes.data as AiAssessmentRow | null
  const certification = certRes.data as CertRow | null
  const certModules = certModulesRes.data as CertModuleRow[] | null
  const placements = placementsRes.data as PlacementWithDetails[] | null
  const reqPipeline = reqPipelineRes.data as ReqPipelineEntry[] | null

  if (!candidate) notFound()

  const derailerRisk = score?.derailer_risk ?? 0
  const showDerailerPanel = candidate.seniority_level === 'director_plus'

  const certProgressPct = (() => {
    if (!certModules || certModules.length === 0) return 0
    const done = certModules.filter((m) => m.status === 'certified').length
    return Math.round((done / certModules.length) * 100)
  })()

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/candidates">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Candidates
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{candidate.full_name}</h1>
          <p className="text-muted-foreground">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-muted-foreground text-sm">{candidate.phone}</p>
          )}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge variant="secondary">{capitalize(candidate.seniority_level)}</Badge>
            <Badge
              variant={
                candidate.status === 'active'
                  ? 'success'
                  : candidate.status === 'placed'
                  ? 'default'
                  : 'secondary'
              }
            >
              {capitalize(candidate.status)}
            </Badge>
            {candidate.work_authorization && (
              <Badge variant="outline">{candidate.work_authorization}</Badge>
            )}
            {candidate.desired_rate && (
              <Badge variant="outline">${candidate.desired_rate}/hr</Badge>
            )}
            {candidate.availability_date && (
              <Badge variant="outline">Avail: {formatDate(candidate.availability_date)}</Badge>
            )}
            {(candidate.location_city || candidate.location_state) && (
              <Badge variant="outline">
                📍 {[candidate.location_city, candidate.location_state].filter(Boolean).join(', ')}
              </Badge>
            )}
          </div>

          {/* Pipeline phase */}
          <div className="mt-4">
            <PhaseControl candidateId={id} phase={(candidate as { pipeline_phase?: string }).pipeline_phase ?? 'new'} />
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {candidate.skills.map((s: string) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {score && (
          <div
            className={`flex flex-col items-center justify-center rounded-2xl px-8 py-4 shadow-soft-sm ${getScoreBg(
              score.overall_score
            )}`}
          >
            <span className="text-4xl font-bold">{formatScore(score.overall_score)}</span>
            <span className="text-xs font-medium mt-1">Overall Score</span>
          </div>
        )}
      </div>

      {/* ATS section: resume + notes */}
      <CandidateAtsSection
        candidateId={id}
        resumeUrl={candidate.resume_url}
        notes={candidate.notes}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Score Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            {score ? (
              <ScoreRadar
                personality_fit={score.personality_fit}
                cognitive_score={score.cognitive_score}
                ai_aptitude_score={score.ai_aptitude_score}
                role_alignment={0}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No scores yet — complete assessments to generate.
              </div>
            )}
            {score && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Personality Fit', value: score.personality_fit },
                  { label: 'Cognitive', value: score.cognitive_score },
                  { label: 'AI Aptitude', value: score.ai_aptitude_score },
                  { label: 'Derailer Risk', value: score.derailer_risk },
                ].map((d) => (
                  <div key={d.label} className="flex justify-between">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-mono font-medium">{formatScore(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certification */}
        <Card>
          <CardHeader>
            <CardTitle>Certification</CardTitle>
          </CardHeader>
          <CardContent>
            {certification ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize">{certification.tier} Tier</p>
                    <p className="text-sm text-muted-foreground">
                      {certification.expires_at
                        ? `Expires ${formatDate(certification.expires_at)}`
                        : 'No expiry set'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      certification.status === 'certified'
                        ? 'success'
                        : certification.status === 'in_progress'
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {capitalize(certification.status)}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Module Progress</span>
                    <span>{certProgressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${certProgressPct}%` }}
                    />
                  </div>
                </div>
                {certModules && certModules.length > 0 && (
                  <div className="space-y-1 divide-y">
                    {certModules.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span>{m.module_label}</span>
                        <Badge
                          variant={
                            m.status === 'certified'
                              ? 'success'
                              : m.status === 'in_progress'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {m.score != null ? formatScore(m.score) : capitalize(m.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No certification record found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {aiAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>AI Aptitude Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Prompt Reasoning', value: aiAssessment.prompt_reasoning_score },
                { label: 'Tool Breadth', value: aiAssessment.tool_breadth_score },
                { label: 'Output Judgment', value: aiAssessment.output_judgment_score },
                { label: 'Change Tolerance', value: aiAssessment.change_tolerance_score },
              ].map((d) => (
                <div key={d.label} className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{formatScore(d.value)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Assessed {formatDate(aiAssessment.assessed_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {assessments && assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {assessments.map((a) => (
                <div key={a.id} className="py-2">
                  <AssessmentStatusBadge
                    framework={a.framework as AssessmentFramework}
                    score={a.personality_fit ?? a.cognitive_score}
                  />
                  <p className="text-xs text-muted-foreground">{formatDate(a.administered_at)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showDerailerPanel && (
        <Card
          className={
            derailerRisk > 70
              ? 'border-red-300 dark:border-red-700'
              : derailerRisk > 60
              ? 'border-amber-300 dark:border-amber-700'
              : ''
          }
        >
          <CardHeader className="flex flex-row items-center gap-2">
            {derailerRisk > 60 && (
              <AlertTriangle
                className={`h-5 w-5 ${derailerRisk > 70 ? 'text-red-500' : 'text-amber-500'}`}
              />
            )}
            <CardTitle>Derailer Risk (Director+)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className={`text-3xl font-bold ${
                  derailerRisk > 70
                    ? 'text-red-600'
                    : derailerRisk > 60
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {formatScore(derailerRisk)}
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      derailerRisk > 70 ? 'bg-red-500' : derailerRisk > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${derailerRisk}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {derailerRisk > 70
                    ? 'High risk — overall score capped at 85'
                    : derailerRisk > 60
                    ? 'Elevated risk — monitor closely'
                    : 'Within acceptable range'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Quality Panel — auto-triggers if activeRequisition in store */}
      <MatchPanel candidateId={id} candidateName={candidate.full_name} />

      {/* Evolving fit score + recruiter notes */}
      <CandidateIntelligence candidateId={id} />

      {/* AI personality survey — generate link or view AI read */}
      <SurveyResultsPanel candidateId={id} />

      {/* Campaign / Outreach panel — renders only for iLabor campaign candidates */}
      <CampaignPanel candidateId={id} />

      {/* Requisition Pipeline History */}
      {reqPipeline && reqPipeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requisition Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border ml-3 space-y-4">
              {reqPipeline.map((entry) => (
                <li key={entry.id} className="pl-6">
                  <span className="absolute -left-1.5 flex h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {entry.requisitions ? (
                        <Link
                          href={`/dashboard/requisitions/${entry.requisitions.id}`}
                          className="font-medium hover:underline"
                        >
                          {entry.requisitions.title}
                        </Link>
                      ) : (
                        <p className="font-medium">Unknown Requisition</p>
                      )}
                      {entry.requisitions?.client_name && (
                        <p className="text-xs text-muted-foreground">
                          {entry.requisitions.client_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Added {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">{capitalize(entry.stage.replace('_', ' '))}</Badge>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Post-Placement History */}
      <Card>
        <CardHeader>
          <CardTitle>Placement History</CardTitle>
        </CardHeader>
        <CardContent>
          {placements && placements.length > 0 ? (
            <ol className="relative border-l border-border ml-3 space-y-6">
              {placements.map((p) => (
                <li key={p.id} className="pl-6">
                  <span className="absolute -left-1.5 flex h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {p.role?.title ?? 'Unknown Role'} at {p.client?.name ?? 'Unknown Client'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.start_date)} —{' '}
                        {p.end_date ? formatDate(p.end_date) : 'Present'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        p.status === 'active'
                          ? 'success'
                          : p.status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {capitalize(p.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No placements on record.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
