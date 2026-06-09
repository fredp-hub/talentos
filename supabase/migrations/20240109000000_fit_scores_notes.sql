-- ============================================================
-- Evolving fit scores, candidate notes, screening questions,
-- and explicit pipeline phase tracking.
-- ============================================================

-- ── Requisition screening questions (AI-generated) ─────────
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS screening_questions JSONB;

-- ── Candidate notes (interview / general) ──────────────────
CREATE TABLE IF NOT EXISTS candidate_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users(id),
  note_type    TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'interview', 'reference', 'screen')),
  content      TEXT NOT NULL,
  req_id       TEXT  -- optional: which requisition this note relates to
);

ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON candidate_notes
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate ON candidate_notes(candidate_id);

-- ── Evolving fit score timeline ────────────────────────────
-- One row per evaluation stage. Score evolves: resume → survey → interview.
CREATE TABLE IF NOT EXISTS candidate_fit_scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT now(),
  candidate_id       UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage              TEXT NOT NULL CHECK (stage IN ('resume', 'survey', 'interview', 'manual')),
  score              NUMERIC(5,2) NOT NULL,
  delta              NUMERIC(5,2),          -- change vs previous stage
  feedback           TEXT,                  -- AI explanation of this stage's read
  technical_snapshot TEXT,
  personality_snapshot TEXT
);

ALTER TABLE candidate_fit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON candidate_fit_scores
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_fit_scores_candidate ON candidate_fit_scores(candidate_id, created_at);

-- ── Explicit pipeline phase on candidate ───────────────────
-- Answers "what is this candidate waiting on right now?"
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pipeline_phase TEXT
  DEFAULT 'new'
  CHECK (pipeline_phase IN (
    'new', 'screening', 'awaiting_survey', 'survey_complete',
    'awaiting_interview', 'interview_complete', 'awaiting_certification',
    'ready_to_submit', 'submitted', 'placed', 'rejected', 'on_hold'
  ));

-- Current live fit score (latest from timeline) for fast list/sort
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_fit_score NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_candidates_pipeline_phase ON candidates(pipeline_phase);
