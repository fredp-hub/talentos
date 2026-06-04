-- ============================================================
-- TalentOS Initial Schema
-- ============================================================

-- Enable pgvector for candidate embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE seniority_level AS ENUM ('junior', 'mid', 'senior', 'lead', 'director_plus');
CREATE TYPE assessment_framework AS ENUM ('PI_behavioral', 'PI_cognitive', 'hogan_HPI', 'hogan_HDS', 'hogan_MVPI');
CREATE TYPE cert_tier AS ENUM ('foundational', 'practitioner', 'advanced');
CREATE TYPE cert_status AS ENUM ('not_started', 'in_progress', 'certified', 'expired');
CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'client');
CREATE TYPE placement_status AS ENUM ('pending', 'active', 'completed', 'terminated');
CREATE TYPE candidate_status AS ENUM ('active', 'placed', 'inactive', 'screening');
CREATE TYPE invitation_status AS ENUM ('pending', 'completed', 'expired', 'cancelled');

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
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  phone            TEXT,
  seniority_level  seniority_level NOT NULL DEFAULT 'mid',
  status           candidate_status NOT NULL DEFAULT 'screening',
  embedding        vector(1536),
  recruiter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- PLACEMENTS
-- ============================================================

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

-- ============================================================
-- KPI DEFINITIONS & THROUGHPUT
-- ============================================================

CREATE TABLE kpi_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   TEXT NOT NULL UNIQUE,
  metric_label  TEXT NOT NULL,
  unit          TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'manual',
  cadence       TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily', 'weekly', 'monthly'))
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
LEFT JOIN candidate_scores cs
  ON cs.candidate_id = c.id AND cs.is_current = true
LEFT JOIN certifications cert
  ON cert.candidate_id = c.id
LEFT JOIN placements p
  ON p.candidate_id = c.id
  AND p.status = 'active';

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
JOIN candidates c ON c.id = p.candidate_id
JOIN clients cl   ON cl.id = p.client_id
JOIN roles r      ON r.id = p.role_id
LEFT JOIN throughput_snapshots ts ON ts.placement_id = p.id
GROUP BY p.id, p.candidate_id, c.full_name, cl.name, r.title;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_aptitude_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE throughput_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: get role from JWT metadata
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'recruiter'
  );
$$ LANGUAGE sql STABLE;

-- ADMIN: full access to everything
CREATE POLICY "admin_all" ON candidates         USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON candidate_scores   USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON assessment_results USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON assessment_invitations USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON ai_aptitude_assessments USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON certifications     USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON cert_modules       USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON placements         USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON clients            USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON roles              USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON kpi_definitions    USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');
CREATE POLICY "admin_all" ON throughput_snapshots USING (auth.user_role() = 'admin') WITH CHECK (auth.user_role() = 'admin');

-- RECRUITER: own candidates + related data
CREATE POLICY "recruiter_own_candidates" ON candidates
  USING (auth.user_role() = 'recruiter' AND recruiter_id = auth.uid())
  WITH CHECK (auth.user_role() = 'recruiter' AND recruiter_id = auth.uid());

CREATE POLICY "recruiter_scores" ON candidate_scores
  USING (auth.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_assessments" ON assessment_results
  USING (auth.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_ai_assessments" ON ai_aptitude_assessments
  USING (auth.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_certs" ON certifications
  USING (auth.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_placements" ON placements
  USING (auth.user_role() = 'recruiter' AND EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = candidate_id AND c.recruiter_id = auth.uid()
  ));

CREATE POLICY "recruiter_clients_read" ON clients
  USING (auth.user_role() IN ('recruiter', 'admin'));

CREATE POLICY "recruiter_roles_read" ON roles
  USING (auth.user_role() IN ('recruiter', 'admin'));

-- CLIENT: read-only on their own placements/certs/throughput
CREATE POLICY "client_placements_read" ON placements
  USING (auth.user_role() = 'client' AND EXISTS (
    SELECT 1 FROM clients cl
    WHERE cl.id = client_id
      AND cl.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
  ));

CREATE POLICY "client_throughput_read" ON throughput_snapshots
  USING (auth.user_role() = 'client' AND EXISTS (
    SELECT 1 FROM placements p
    JOIN clients cl ON cl.id = p.client_id
    WHERE p.id = placement_id
      AND cl.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
  ));
