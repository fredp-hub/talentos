-- ============================================================
-- One-time backfill: derive pipeline_phase from outreach_status
-- so the two trackers agree. App code now keeps them in sync on
-- every write (lib/status-sync.ts).
-- ============================================================

UPDATE candidates SET pipeline_phase = CASE outreach_status
  WHEN 'not_contacted'    THEN 'new'
  WHEN 'outreach_sent'    THEN 'screening'
  WHEN 'replied'          THEN 'screening'
  WHEN 'stage2_started'   THEN 'awaiting_survey'
  WHEN 'stage2_complete'  THEN 'survey_complete'
  WHEN 'stage3_scheduled' THEN 'awaiting_interview'
  WHEN 'stage3_complete'  THEN 'interview_complete'
  WHEN 'submitted'        THEN 'submitted'
  WHEN 'placed'           THEN 'placed'
  WHEN 'not_interested'   THEN 'rejected'
  WHEN 'unresponsive'     THEN 'on_hold'
  ELSE COALESCE(pipeline_phase, 'new')
END
WHERE outreach_status IS NOT NULL;
