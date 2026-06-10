-- ============================================================
-- TalentOS Complete Schema
-- Run this once in a fresh Supabase project
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE seniority_level      AS ENUM ('junior','mid','senior','lead','director_plus');
CREATE TYPE assessment_framework AS ENUM ('PI_behavioral','PI_cognitive','hogan_HPI','hogan_HDS','hogan_MVPI');
CREATE TYPE cert_tier            AS ENUM ('foundational','practitioner','advanced');
CREATE TYPE cert_status          AS ENUM ('not_started','in_progress','certified','expired');
CREATE TYPE user_role            AS ENUM ('admin','recruiter','client');
CREATE TYPE placement_status     AS ENUM ('pending','active','completed','terminated');
CREATE TYPE candidate_status     AS ENUM ('active','placed','inactive','screening');
CREATE TYPE invitation_status    AS ENUM ('pending','completed','expired','cancelled');
CREATE TYPE pipeline_stage       AS ENUM ('applied','phone_screen','technical_interview','client_submittal','placed');

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  industry    TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT '',
  weight_personality  NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  weight_cognitive    NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  weight_ai_aptitude  NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  weight_alignment    NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CANDIDATES
-- ============================================================

CREATE TABLE candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  phone               TEXT,
  seniority_level     seniority_level NOT NULL DEFAULT 'mid',
  status              candidate_status NOT NULL DEFAULT 'screening',
  embedding           vector(1536),
  recruiter_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- ATS fields
  linkedin_url        TEXT,
  resume_url          TEXT,
  skills              TEXT[] NOT NULL DEFAULT '{}',
  desired_rate        NUMERIC(10,2),
  availability_date   DATE,
  work_authorization  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CANDIDATE SCORES
-- ============================================================

CREATE TABLE candidate_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id           UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  overall_score          NUMERIC(5,2) NOT NULL,
  ai_aptitude_score      NUMERIC(5,2) NOT NULL,
  personality_fit        NUMERIC(5,2) NOT NULL,
  cognitive_score        NUMERIC(5,2) NOT NULL,
  derailer_risk          NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_current             BOOLEAN NOT NULL DEFAULT true,
  scoring_model_version  TEXT NOT NULL DEFAULT 'v1.0.0',
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_scores_current ON candidate_scores(candidate_id) WHERE is_current = true;

-- ============================================================
-- ASSESSMENT RESULTS
-- ============================================================

CREATE TABLE assessment_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  framework        assessment_framework NOT NULL,
  administered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_data         JSONB NOT NULL DEFAULT '{}',
  personality_fit  NUMERIC(5,2),
  cognitive_score  NUMERIC(5,2),
  derailer_risk    NUMERIC(5,2),
  alignment_score  NUMERIC(5,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assessment_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  framework     assessment_framework NOT NULL,
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  token         TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status        invitation_status NOT NULL DEFAULT 'pending'
);

-- ============================================================
-- AI APTITUDE ASSESSMENTS
-- ============================================================

CREATE TABLE ai_aptitude_assessments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id            UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  prompt_reasoning_score  NUMERIC(5,2) NOT NULL,
  tool_breadth_score      NUMERIC(5,2) NOT NULL,
  output_judgment_score   NUMERIC(5,2) NOT NULL,
  change_tolerance_score  NUMERIC(5,2) NOT NULL,
  assessed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessed_by             UUID NOT NULL REFERENCES auth.users(id),
  notes                   TEXT
);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================

CREATE TABLE certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tier          cert_tier NOT NULL DEFAULT 'foundational',
  status        cert_status NOT NULL DEFAULT 'not_started',
  issued_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cert_modules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id  UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  module_key        TEXT NOT NULL,
  module_label      TEXT NOT NULL,
  score             NUMERIC(5,2),
  assessed_by       UUID REFERENCES auth.users(id),
  assessed_at       TIMESTAMPTZ,
  status            cert_status NOT NULL DEFAULT 'not_started'
);

-- ============================================================
-- KPI DEFINITIONS & PLACEMENTS
-- ============================================================

CREATE TABLE kpi_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   TEXT NOT NULL UNIQUE,
  metric_label  TEXT NOT NULL,
  unit          TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'manual',
  cadence       TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily','weekly','monthly'))
);

CREATE TABLE placements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id         UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role_id              UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status               placement_status NOT NULL DEFAULT 'pending',
  start_date           DATE,
  end_date             DATE,
  ai_enabled_date      DATE,
  baseline_period_end  DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE throughput_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id        UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  kpi_definition_id   UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  value               NUMERIC(12,4) NOT NULL,
  ai_assisted         BOOLEAN NOT NULL DEFAULT false,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ATS: REQUISITIONS
-- ============================================================

CREATE TABLE requisitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilabor_req_id   TEXT,
  title           TEXT NOT NULL,
  client_name     TEXT,
  end_customer    TEXT,
  location        TEXT,
  start_date      DATE,
  end_date        DATE,
  duration        TEXT,
  c2c_rate        NUMERIC(10,2),
  job_description TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','filled','cancelled')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ATS: PIPELINE (candidate stages on a requisition)
-- ============================================================

CREATE TABLE req_pipeline (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requisition_id   UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  stage            pipeline_stage NOT NULL DEFAULT 'applied',
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT,
  outcome          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, requisition_id)
);

CREATE INDEX idx_req_pipeline_req  ON req_pipeline(requisition_id);
CREATE INDEX idx_req_pipeline_cand ON req_pipeline(candidate_id);

-- ============================================================
-- ATS: AI MATCHES (scoring cache)
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

-- ============================================================
-- STORAGE: Resume bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_resumes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "auth_read_resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_requisitions_updated_at
  BEFORE UPDATE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_candidate_pipeline AS
SELECT
  c.id,
  c.full_name,
  c.email,
  c.seniority_level,
  c.status,
  cs.overall_score,
  cs.ai_aptitude_score,
  cert.status      AS cert_status,
  cert.tier        AS cert_tier,
  p.status         AS placement_status
FROM candidates c
LEFT JOIN candidate_scores cs   ON cs.candidate_id = c.id AND cs.is_current = true
LEFT JOIN certifications cert   ON cert.candidate_id = c.id
LEFT JOIN placements p          ON p.candidate_id = c.id AND p.status = 'active';

CREATE OR REPLACE VIEW v_placement_uplift AS
SELECT
  p.id            AS placement_id,
  p.candidate_id,
  c.full_name     AS candidate_name,
  cl.name         AS client_name,
  r.title         AS role_title,
  AVG(ts.value) FILTER (WHERE NOT ts.ai_assisted)  AS baseline_avg,
  AVG(ts.value) FILTER (WHERE ts.ai_assisted)      AS post_ai_avg,
  CASE
    WHEN AVG(ts.value) FILTER (WHERE NOT ts.ai_assisted) > 0
    THEN ROUND(
      (AVG(ts.value) FILTER (WHERE ts.ai_assisted) -
       AVG(ts.value) FILTER (WHERE NOT ts.ai_assisted)) /
       AVG(ts.value) FILTER (WHERE NOT ts.ai_assisted) * 100, 2)
    ELSE NULL
  END AS uplift_pct
FROM placements p
JOIN candidates c  ON c.id = p.candidate_id
JOIN clients cl    ON cl.id = p.client_id
JOIN roles r       ON r.id = p.role_id
LEFT JOIN throughput_snapshots ts ON ts.placement_id = p.id
GROUP BY p.id, p.candidate_id, c.full_name, cl.name, r.title;

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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE candidates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_aptitude_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_modules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE throughput_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE req_pipeline            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_matches              ENABLE ROW LEVEL SECURITY;

-- Helper: extract role from JWT user_metadata (must live in public, not auth)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'recruiter'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ADMIN: full access
CREATE POLICY "admin_all" ON candidates              USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON candidate_scores        USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON assessment_results      USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON assessment_invitations  USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON ai_aptitude_assessments USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON certifications          USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON cert_modules            USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON placements              USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON clients                 USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON roles                   USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON kpi_definitions         USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON throughput_snapshots    USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON requisitions            USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON req_pipeline            USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "admin_all" ON ai_matches              USING (public.user_role() = 'admin') WITH CHECK (public.user_role() = 'admin');

-- RECRUITER: own candidates + all ATS data
CREATE POLICY "recruiter_own_candidates" ON candidates
  USING (public.user_role() = 'recruiter' AND recruiter_id = auth.uid())
  WITH CHECK (public.user_role() = 'recruiter' AND recruiter_id = auth.uid());

CREATE POLICY "recruiter_scores" ON candidate_scores
  USING (public.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_assessments" ON assessment_results
  USING (public.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_ai_assessments" ON ai_aptitude_assessments
  USING (public.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_certs" ON certifications
  USING (public.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_placements" ON placements
  USING (public.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_clients_read" ON clients
  USING (public.user_role() IN ('recruiter','admin'));

CREATE POLICY "recruiter_roles_read" ON roles
  USING (public.user_role() IN ('recruiter','admin'));

CREATE POLICY "recruiter_requisitions" ON requisitions
  USING (public.user_role() = 'recruiter')
  WITH CHECK (public.user_role() = 'recruiter');

CREATE POLICY "recruiter_pipeline" ON req_pipeline
  USING (public.user_role() = 'recruiter')
  WITH CHECK (public.user_role() = 'recruiter');

CREATE POLICY "recruiter_ai_matches" ON ai_matches
  USING (public.user_role() = 'recruiter')
  WITH CHECK (public.user_role() = 'recruiter');

-- CLIENT: read-only on their own placements
CREATE POLICY "client_placements_read" ON placements
  USING (public.user_role() = 'client' AND EXISTS (
    SELECT 1 FROM clients cl
    WHERE cl.id = client_id
      AND cl.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
  ));

CREATE POLICY "client_throughput_read" ON throughput_snapshots
  USING (public.user_role() = 'client' AND EXISTS (
    SELECT 1 FROM placements p
    JOIN clients cl ON cl.id = p.client_id
    WHERE p.id = placement_id
      AND cl.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
  ));

-- (Seed data removed — real data only. See 20240112000000_remove_all_mock_data.sql)
