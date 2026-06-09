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
CREATE UNIQUE INDEX IF NOT EXISTS idx_requisitions_req_id ON requisitions(req_id) WHERE req_id IS NOT NULL;

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

-- ── Seed: Randstad requisitions ────────────────────────────
-- Tier 1 — highest GP priority
INSERT INTO requisitions (
  req_id, title, client_name, customer, location_city, location_state,
  bill_rate_hourly, c2c_rate, campaign_work_type, required_skills, preferred_skills,
  is_remote, priority_tier, status, num_positions
)
VALUES
  ('158525','Sr. PM Data & AI Products','GCOM Software','GCOM Software','New York','NY',
   140,140,'c2c',ARRAY['program management','data products','AI','stakeholder management'],
   ARRAY['product roadmap','agile','executive communication'],false,'1','open',1),

  ('158477','Senior Backend Engineer - Distributed Systems','Randstad','Amtrak','Washington','DC',
   65,65,'w2_contract',ARRAY['Java','distributed systems','microservices','Kafka'],
   ARRAY['AWS','Kubernetes','Spring Boot'],false,'1','open',1),

  ('158671','Data Engineer - AI Platform','Randstad','Amtrak','Washington','DC',
   65,65,'w2_contract',ARRAY['Python','Spark','Databricks','data pipelines'],
   ARRAY['AI/ML','Azure','dbt'],false,'1','open',1),

  ('158670','Lead Data Engineer - Databricks & AI','Randstad','Amtrak','Washington','DC',
   65,65,'w2_contract',ARRAY['Databricks','Python','Spark','SQL'],
   ARRAY['Delta Lake','MLflow','AI/ML'],false,'1','open',1),

  ('158621','.Net Developer','Randstad','Sacramento County','Sacramento','CA',
   75,75,'w2_contract',ARRAY['.NET','C#','SQL Server','REST APIs'],
   ARRAY['Azure','Blazor','Entity Framework'],false,'1','open',1),

  ('158822','Senior SRE Engineer','Randstad','Amtrak','Washington','DC',
   85,85,'w2_contract',ARRAY['SRE','Kubernetes','Terraform','CI/CD'],
   ARRAY['AWS','Prometheus','Go'],false,'1','open',1),

  ('158754','Senior AI Engineer - Agentic Systems','Randstad','Elevance Health','Mason','OH',
   80,80,'w2_contract',ARRAY['LLMs','RAG','LangChain','Python'],
   ARRAY['agentic systems','OpenAI API','vector databases'],false,'1','open',1),

  ('158753','Senior AI Engineer - Agentic Systems','Randstad','Elevance Health','Mason','OH',
   80,80,'w2_contract',ARRAY['LLMs','RAG','LangChain','Python'],
   ARRAY['agentic systems','OpenAI API','vector databases'],false,'1','open',2),

  ('158591','Salesforce Technical Lead Architect','Randstad','Medtronic','Minneapolis','MN',
   80,80,'w2_contract',ARRAY['Salesforce','Apex','LWC','Health Cloud'],
   ARRAY['CPQ','Sales Cloud','integration'],false,'1','open',1),

  ('158701','React Developer','Randstad','Cargill','Wayzata','MN',
   77,77,'w2_contract',ARRAY['React','TypeScript','JavaScript','REST APIs'],
   ARRAY['Next.js','GraphQL','AWS'],false,'1','open',1),

-- Tier 2 — low competition door openers
  ('158930','EITS Security Architect','GCOM Software','GCOM Software','New York','NY',
   110,110,'c2c',ARRAY['security architecture','SIEM','ZTA','cloud security'],
   ARRAY['IAM','NIST','SOC 2'],false,'2','open',1),

  ('158530','Oracle Finance Systems Lead','Randstad','Allspring Global','Charlotte','NC',
   85,85,'w2_contract',ARRAY['Oracle EBS','Oracle Finance','SQL','finance systems'],
   ARRAY['Oracle Cloud','integration','reporting'],false,'2','open',1),

  ('158828','UC Contact Center Engineer II','Randstad','Chewy','Plantation','FL',
   90,90,'w2_contract',ARRAY['Unified Communications','contact center','VoIP','Cisco'],
   ARRAY['Genesys','AWS Connect','API integration'],false,'2','open',1),

  ('158397','Principal Data Architect','Randstad','Amtrak','Washington','DC',
   85,85,'w2_contract',ARRAY['data architecture','SQL','data modeling','cloud platforms'],
   ARRAY['Databricks','Azure','governance'],false,'2','open',1),

  ('158630','AI Technologist - RAG GenAI','Randstad','Medtronic','Minneapolis','MN',
   80,80,'w2_contract',ARRAY['RAG','GenAI','LLMs','Python'],
   ARRAY['LangChain','vector databases','healthcare AI'],false,'2','open',1),

  ('159532','Solutions Architect - Cloud AI','Randstad','CVS Health','Hartford','CT',
   75,75,'w2_contract',ARRAY['solutions architecture','cloud','AI','AWS'],
   ARRAY['Azure','GCP','healthcare'],true,'2','open',1),

  ('159024','Network Security Engineer','Randstad','UC Davis Health','Rancho Cordova','CA',
   80,80,'w2_contract',ARRAY['network security','firewall','VPN','SIEM'],
   ARRAY['Palo Alto','cloud security','HIPAA'],false,'2','open',1)

ON CONFLICT (req_id) DO UPDATE SET
  title              = EXCLUDED.title,
  bill_rate_hourly   = EXCLUDED.bill_rate_hourly,
  required_skills    = EXCLUDED.required_skills,
  preferred_skills   = EXCLUDED.preferred_skills,
  priority_tier      = EXCLUDED.priority_tier;
