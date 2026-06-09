create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  requisition_id text not null,
  composite_score numeric(5,2) not null,
  tier text check (tier in ('A', 'B', 'C')) not null,
  dimensions jsonb not null default '[]',
  skill_gaps jsonb not null default '[]',
  reverse_compatibility_score numeric(5,2),
  submission_ready boolean default false,
  rationale_summary text,
  hogan_triggered boolean default false,
  derailer_risk_level text check (derailer_risk_level in ('none', 'low', 'elevated', 'high')),
  scored_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_match_results_candidate on match_results(candidate_id);
create index if not exists idx_match_results_requisition on match_results(requisition_id);
create index if not exists idx_match_results_tier on match_results(tier);

alter table match_results enable row level security;

-- Uses the same public.is_staff() helper defined in 20240104000000_relax_rls.sql
create policy "staff_all" on match_results
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Client role has no access to match results
