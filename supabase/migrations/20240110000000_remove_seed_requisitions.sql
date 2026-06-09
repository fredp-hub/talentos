-- ============================================================
-- Remove seeded placeholder requisitions (Randstad/iLabor demo data).
-- candidate_req_matches rows referencing them cascade-delete.
-- ============================================================

DELETE FROM requisitions
WHERE req_id IN (
  '158525','158477','158671','158670','158621','158822','158754','158753',
  '158591','158701','158930','158530','158828','158397','158630','159532','159024'
);

-- Support manual create form capturing seniority for matching
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS seniority_level TEXT;
-- Description used by screening-question generation + create form
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS description TEXT;
