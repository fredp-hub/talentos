-- ============================================================
-- Outreach & Intake System
-- Additive migration — does not drop any existing columns/tables
-- ============================================================

-- ── Extend existing candidates table ───────────────────────
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS work_type TEXT
  CHECK (work_type IN ('w2_contract', 'c2c', 'fulltime', 'any'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rate_floor_hourly NUMERIC(8,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS remote_preference TEXT
  CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'flexible'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS availability TEXT
  CHECK (availability IN ('immediate', 'two_weeks', 'thirty_days', 'not_looking'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS primary_stack TEXT[];
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS highest_role_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_experience BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_experience_detail TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ilabor';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source_job_id TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'not_contacted'
  CHECK (outreach_status IN (
    'not_contacted','outreach_sent','replied','stage2_started',
    'stage2_complete','stage3_scheduled','stage3_complete',
    'submitted','placed','not_interested','unresponsive'
  ));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS behavioral_notes TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS management_preference TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS project_type_preference TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_match_score NUMERIC(5,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS campaign_tier TEXT
  CHECK (campaign_tier IN ('A','B','C','unscored'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location_state TEXT;

-- Backfill first_name/last_name from full_name where possible
UPDATE candidates
  SET first_name = split_part(full_name, ' ', 1),
      last_name   = substr(full_name, length(split_part(full_name, ' ', 1)) + 2)
  WHERE first_name IS NULL AND full_name IS NOT NULL;

-- ── Extend existing requisitions table ─────────────────────
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS req_id TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS ats_id TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS customer TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS is_hybrid BOOLEAN DEFAULT false;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS bill_rate_hourly NUMERIC(8,2);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS campaign_work_type TEXT
  CHECK (campaign_work_type IN ('w2_contract','c2c','fulltime'));
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS preferred_skills TEXT[];
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS num_positions INTEGER DEFAULT 1;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS priority_tier TEXT
  CHECK (priority_tier IN ('1','2','3','deprioritized'));
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS num_submissions INTEGER DEFAULT 0;

-- Backfill bill_rate_hourly from c2c_rate
UPDATE requisitions SET bill_rate_hourly = c2c_rate WHERE bill_rate_hourly IS NULL AND c2c_rate IS NOT NULL;
-- Backfill customer from end_customer
UPDATE requisitions SET customer = end_customer WHERE customer IS NULL AND end_customer IS NOT NULL;

-- Unique index on req_id so we can upsert
-- NOTE: must NOT be a partial index — ON CONFLICT requires a full unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_requisitions_req_id ON requisitions(req_id);

-- ── New table: outreach_log ─────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES auth.users(id),
  channel      TEXT CHECK (channel IN ('email','linkedin','phone','sms')),
  message_template TEXT,
  custom_note  TEXT,
  status       TEXT CHECK (status IN ('sent','opened','replied','bounced','opted_out')),
  sent_at      TIMESTAMPTZ,
  replied_at   TIMESTAMPTZ,
  req_id       TEXT
);

ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all" ON outreach_log
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ── New table: intake_tokens ────────────────────────────────
CREATE TABLE IF NOT EXISTS intake_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;

-- Public read by token hash (service role used in server actions)
CREATE POLICY "staff_all" ON intake_tokens
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ── New table: candidate_req_matches ───────────────────────
CREATE TABLE IF NOT EXISTS candidate_req_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  candidate_id        UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  req_id              UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  match_score         NUMERIC(5,2),
  skill_match_pct     NUMERIC(5,2),
  rate_aligned        BOOLEAN,
  location_aligned    BOOLEAN,
  work_type_aligned   BOOLEAN,
  ai_rationale        TEXT,
  status              TEXT DEFAULT 'suggested' CHECK (status IN (
    'suggested','recruiter_approved','outreach_sent',
    'candidate_interested','submitted','interviewing',
    'offered','placed','rejected','withdrew'
  )),
  UNIQUE(candidate_id, req_id)
);

ALTER TABLE candidate_req_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all" ON candidate_req_matches
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_crm_candidate ON candidate_req_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_crm_req ON candidate_req_matches(req_id);
CREATE INDEX IF NOT EXISTS idx_crm_score ON candidate_req_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_outreach_status ON candidates(outreach_status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);

-- (Requisition seed data removed — real data only. See 20240110/20240112 cleanup migrations.)
