-- ============================================================
-- AI-designed candidate surveys
-- Role-specific personality + technical questions, AI-scored,
-- linked back to the candidate profile.
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_surveys (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT now(),
  completed_at       TIMESTAMPTZ,
  candidate_id       UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- AI-generated question set (array of {id, type, prompt, options?})
  questions          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Candidate answers keyed by question id
  responses          JSONB,

  -- AI scoring output
  ai_summary         TEXT,
  personality_scores JSONB,   -- {communication, ownership, adaptability, collaboration, ...}
  technical_summary  TEXT,
  fit_highlights     TEXT[],
  fit_concerns       TEXT[],

  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  context_note       TEXT      -- optional recruiter note used to tailor questions
);

ALTER TABLE candidate_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all" ON candidate_surveys
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_surveys_candidate ON candidate_surveys(candidate_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON candidate_surveys(status);

-- Personality summary fields on candidate (AI-derived from survey)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS personality_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS personality_scores JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMPTZ;
