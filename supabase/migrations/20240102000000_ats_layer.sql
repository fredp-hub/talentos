-- ============================================================
-- ATS Layer: Requisitions, Pipeline, AI Matches
-- ============================================================

-- Add ATS columns to existing candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS linkedin_url    TEXT,
  ADD COLUMN IF NOT EXISTS resume_url      TEXT,
  ADD COLUMN IF NOT EXISTS skills          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS desired_rate    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS availability_date DATE,
  ADD COLUMN IF NOT EXISTS work_authorization TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT;

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload/read resumes
CREATE POLICY "auth_upload_resumes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "auth_read_resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');

-- ============================================================
-- REQUISITIONS
-- ============================================================

CREATE TABLE requisitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilabor_req_id  TEXT,
  title          TEXT NOT NULL,
  client_name    TEXT,
  end_customer   TEXT,
  location       TEXT,
  start_date     DATE,
  end_date       DATE,
  duration       TEXT,
  c2c_rate       NUMERIC(10,2),
  job_description TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'filled', 'cancelled')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_requisitions_updated_at
  BEFORE UPDATE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON requisitions
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "recruiter_all" ON requisitions
  USING (auth.user_role() = 'recruiter')
  WITH CHECK (auth.user_role() = 'recruiter');

-- ============================================================
-- PIPELINE ENTRIES (candidate stages on a requisition)
-- ============================================================

CREATE TYPE pipeline_stage AS ENUM (
  'applied',
  'phone_screen',
  'technical_interview',
  'client_submittal',
  'placed'
);

CREATE TABLE req_pipeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requisition_id  UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  stage           pipeline_stage NOT NULL DEFAULT 'applied',
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  outcome         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, requisition_id)
);

CREATE INDEX idx_req_pipeline_req ON req_pipeline(requisition_id);
CREATE INDEX idx_req_pipeline_cand ON req_pipeline(candidate_id);

ALTER TABLE req_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON req_pipeline
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "recruiter_all" ON req_pipeline
  USING (auth.user_role() = 'recruiter')
  WITH CHECK (auth.user_role() = 'recruiter');

-- ============================================================
-- AI MATCHES
-- ============================================================

CREATE TABLE ai_matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requisition_id   UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  fit_score        INTEGER,
  summary          TEXT,
  gap_analysis     TEXT,
  interview_questions TEXT,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, requisition_id)
);

ALTER TABLE ai_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON ai_matches
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "recruiter_all" ON ai_matches
  USING (auth.user_role() = 'recruiter')
  WITH CHECK (auth.user_role() = 'recruiter');

-- ============================================================
-- VIEW: requisition summary with pipeline counts
-- ============================================================

CREATE OR REPLACE VIEW v_requisition_summary AS
SELECT
  r.id,
  r.ilabor_req_id,
  r.title,
  r.client_name,
  r.end_customer,
  r.location,
  r.start_date,
  r.end_date,
  r.duration,
  r.c2c_rate,
  r.status,
  r.created_at,
  COUNT(p.id)::int AS candidate_count
FROM requisitions r
LEFT JOIN req_pipeline p ON p.requisition_id = r.id
GROUP BY r.id;
