'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface IntakeData {
  availability: string
  available_from: string
  rate_floor_hourly: string
  work_type: string
  remote_preference: string
  primary_stack: string[]
  years_experience: string
  highest_role_summary: string
  ai_experience: boolean
  ai_experience_detail: string
  behavioral_notes: string
  management_preference: string
  project_type_preference: string
}

interface CandidatePreview {
  first_name: string
  source_job_title: string | null
  outreach_req_title: string | null
  outreach_customer: string | null
  outreach_rate: number | null
}

const STEPS = [
  'Role Preview',
  'Availability',
  'Tech Stack',
  'Experience',
  'Work Preferences',
  'AI Experience',
] as const

const AVAILABILITY_OPTIONS = [
  { value: 'immediate', label: 'Immediately available' },
  { value: 'two_weeks', label: 'Available in 2 weeks' },
  { value: 'thirty_days', label: 'Available in ~30 days' },
  { value: 'not_looking', label: "Not looking right now" },
]

const WORK_TYPE_OPTIONS = [
  { value: 'w2_contract', label: 'W-2 Contract' },
  { value: 'c2c', label: 'Corp-to-Corp (C2C)' },
  { value: 'fulltime', label: 'Full-time' },
  { value: 'any', label: 'Open to any' },
]

const REMOTE_OPTIONS = [
  { value: 'remote', label: 'Remote only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site preferred' },
  { value: 'flexible', label: 'Flexible / open' },
]

const COMMON_SKILLS = [
  'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'AWS', 'Azure', 'GCP',
  'Kubernetes', 'Docker', 'SQL', 'PostgreSQL', 'Spark', 'Databricks', 'LLMs',
  'RAG', 'LangChain', 'Terraform', 'Kafka', '.NET', 'C#', 'Go', 'Rust',
  'Salesforce', 'Power BI', 'Tableau', 'Agile', 'Scrum',
]

// ── Main Component ─────────────────────────────────────────────────────────

export default function IntakePage() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<CandidatePreview | null>(null)
  const [skillInput, setSkillInput] = useState('')

  const [data, setData] = useState<IntakeData>({
    availability: '',
    available_from: '',
    rate_floor_hourly: '',
    work_type: '',
    remote_preference: '',
    primary_stack: [],
    years_experience: '',
    highest_role_summary: '',
    ai_experience: false,
    ai_experience_detail: '',
    behavioral_notes: '',
    management_preference: '',
    project_type_preference: '',
  })

  // Validate token and load candidate preview
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/intake/validate?token=${token}`)
        if (!res.ok) {
          setError('This link has expired or is invalid. Please contact your recruiter.')
          return
        }
        const json = await res.json()
        setCandidate(json.candidate)
      } catch {
        setError('Unable to load this page. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    validate()
  }, [token])

  const toggleSkill = useCallback((skill: string) => {
    setData((prev) => ({
      ...prev,
      primary_stack: prev.primary_stack.includes(skill)
        ? prev.primary_stack.filter((s) => s !== skill)
        : [...prev.primary_stack, skill],
    }))
  }, [])

  const addCustomSkill = useCallback(() => {
    const trimmed = skillInput.trim()
    if (!trimmed || data.primary_stack.includes(trimmed)) return
    setData((prev) => ({ ...prev, primary_stack: [...prev.primary_stack, trimmed] }))
    setSkillInput('')
  }, [skillInput, data.primary_stack])

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true // role preview, always can proceed
      case 1: return !!data.availability
      case 2: return data.primary_stack.length >= 1
      case 3: return !!data.years_experience && !!data.highest_role_summary
      case 4: return !!data.work_type && !!data.remote_preference && !!data.rate_floor_hourly
      case 5: return true // AI screen optional
      default: return true
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setComplete(true)
    } catch {
      setError('Something went wrong submitting. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
          <p className="text-gray-500 mb-6">
            Thanks{candidate?.first_name ? `, ${candidate.first_name}` : ''}. Your profile
            is updated and we&apos;ll be in touch with next steps shortly.
          </p>
          <p className="text-xs text-gray-400">You can close this window.</p>
        </div>
      </div>
    )
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-lg mx-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            TalentOS · Candidate Intake
          </p>
          <div className="mt-2">
            <Progress value={progress} className="h-1.5" />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{STEPS[step]}</span>
            <span className="text-xs text-gray-400">
              {step + 1} / {STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-6 mt-4">

          {/* Step 0 — Role Preview */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Hi{candidate?.first_name ? ` ${candidate.first_name}` : ''}! 👋
              </h1>
              <p className="text-gray-500 mb-6">
                Your recruiter sent you this quick form to capture your availability and
                preferences. It takes about 3 minutes.
              </p>
              {candidate?.outreach_req_title && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-1">
                    Open Opportunity
                  </p>
                  <p className="font-semibold text-gray-900">{candidate.outreach_req_title}</p>
                  {candidate.outreach_customer && (
                    <p className="text-sm text-gray-600">{candidate.outreach_customer}</p>
                  )}
                  {candidate.outreach_rate && (
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      Up to ${candidate.outreach_rate}/hr
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-400">
                Your information is shared only with your recruiter.
              </p>
            </div>
          )}

          {/* Step 1 — Availability */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">When are you available?</h2>
              <p className="text-sm text-gray-500 mb-6">Select your current availability</p>
              <div className="space-y-3">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, availability: opt.value }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      data.availability === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {data.availability && data.availability !== 'not_looking' && data.availability !== 'immediate' && (
                <div className="mt-4">
                  <Label className="text-sm text-gray-600">Specific start date (optional)</Label>
                  <Input
                    type="date"
                    value={data.available_from}
                    onChange={(e) => setData((d) => ({ ...d, available_from: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Tech Stack */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your tech stack</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select all that apply — or add your own
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      data.primary_stack.includes(skill)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {/* Custom skill input */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add another skill…"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
                />
                <Button variant="outline" onClick={addCustomSkill} disabled={!skillInput.trim()}>
                  Add
                </Button>
              </div>
              {data.primary_stack.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {data.primary_stack
                    .filter((s) => !COMMON_SKILLS.includes(s))
                    .map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                        <button
                          className="ml-1 hover:text-red-500"
                          onClick={() => toggleSkill(s)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {data.primary_stack.length} selected
              </p>
            </div>
          )}

          {/* Step 3 — Experience */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your experience</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about your background</p>
              <div className="space-y-4">
                <div>
                  <Label>Years of professional experience</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 8"
                    value={data.years_experience}
                    onChange={(e) => setData((d) => ({ ...d, years_experience: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Most recent / highest role</Label>
                  <Textarea
                    placeholder="e.g. Senior Data Engineer at Accenture — led a 6-person team building real-time data pipelines on AWS"
                    value={data.highest_role_summary}
                    onChange={(e) =>
                      setData((d) => ({ ...d, highest_role_summary: e.target.value }))
                    }
                    rows={4}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Work Preferences */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Work preferences</h2>
              <p className="text-sm text-gray-500 mb-6">Help us find the right fit</p>
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">Contract type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setData((d) => ({ ...d, work_type: opt.value }))}
                        className={`text-sm px-3 py-2.5 rounded-xl border-2 transition-all ${
                          data.work_type === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Location preference</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {REMOTE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setData((d) => ({ ...d, remote_preference: opt.value }))}
                        className={`text-sm px-3 py-2.5 rounded-xl border-2 transition-all ${
                          data.remote_preference === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Target hourly rate ($/hr)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="75"
                      value={data.rate_floor_hourly}
                      onChange={(e) =>
                        setData((d) => ({ ...d, rate_floor_hourly: e.target.value }))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — AI Experience */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">AI & emerging tech</h2>
              <p className="text-sm text-gray-500 mb-6">
                Many of our clients are actively building AI solutions
              </p>
              <div className="space-y-5">
                <div>
                  <Label className="mb-3 block">
                    Do you have hands-on experience with AI/ML or LLM technologies?
                  </Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setData((d) => ({ ...d, ai_experience: true }))}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        data.ai_experience
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() =>
                        setData((d) => ({ ...d, ai_experience: false, ai_experience_detail: '' }))
                      }
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        !data.ai_experience
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Not yet
                    </button>
                  </div>
                </div>

                {data.ai_experience && (
                  <div>
                    <Label>Briefly describe your AI experience</Label>
                    <Textarea
                      placeholder="e.g. Built a RAG pipeline using LangChain + Pinecone for document Q&A at my last client"
                      value={data.ai_experience_detail}
                      onChange={(e) =>
                        setData((d) => ({ ...d, ai_experience_detail: e.target.value }))
                      }
                      rows={4}
                      className="mt-1 resize-none"
                    />
                  </div>
                )}

                <div>
                  <Label>Anything else you want your recruiter to know? (optional)</Label>
                  <Textarea
                    placeholder="Project type preferences, travel restrictions, contract length preferences…"
                    value={data.behavioral_notes}
                    onChange={(e) =>
                      setData((d) => ({ ...d, behavioral_notes: e.target.value }))
                    }
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center py-4 gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 ml-auto"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="ml-auto bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
