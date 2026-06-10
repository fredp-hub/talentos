// Keeps outreach_status (campaign comms funnel) and pipeline_phase
// (who's-waiting-on-what tracker) in sync. Changing either one derives
// the other through these maps so the two views never disagree.

export const OUTREACH_TO_PHASE: Record<string, string> = {
  not_contacted: 'new',
  outreach_sent: 'screening',
  replied: 'screening',
  stage2_started: 'awaiting_survey',
  stage2_complete: 'survey_complete',
  stage3_scheduled: 'awaiting_interview',
  stage3_complete: 'interview_complete',
  submitted: 'submitted',
  placed: 'placed',
  not_interested: 'rejected',
  unresponsive: 'on_hold',
}

export const PHASE_TO_OUTREACH: Record<string, string> = {
  new: 'not_contacted',
  screening: 'outreach_sent',
  awaiting_survey: 'stage2_started',
  survey_complete: 'stage2_complete',
  awaiting_interview: 'stage3_scheduled',
  interview_complete: 'stage3_complete',
  awaiting_certification: 'stage3_complete',
  ready_to_submit: 'stage3_complete',
  submitted: 'submitted',
  placed: 'placed',
  rejected: 'not_interested',
  on_hold: 'unresponsive',
}

export function phaseFromOutreach(outreachStatus: string): string {
  return OUTREACH_TO_PHASE[outreachStatus] ?? 'new'
}

export function outreachFromPhase(phase: string): string {
  return PHASE_TO_OUTREACH[phase] ?? 'not_contacted'
}
