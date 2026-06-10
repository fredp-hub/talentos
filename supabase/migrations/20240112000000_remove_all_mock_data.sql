-- ============================================================
-- Remove ALL remaining mock/seed data before real data entry.
--  - 5 demo candidates (@example.com) and everything attached
--  - 3 demo requisitions (IL-2024-001/002/003)
-- Explicit child deletes included in case any FK lacks CASCADE.
-- ============================================================

-- Child rows tied to demo candidates
WITH demo AS (SELECT id FROM candidates WHERE email LIKE '%@example.com')
DELETE FROM cert_modules WHERE certification_id IN (
  SELECT id FROM certifications WHERE candidate_id IN (SELECT id FROM demo)
);

DELETE FROM certifications        WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM candidate_scores      WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM assessment_results    WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM ai_aptitude_assessments WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM placements            WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM req_pipeline          WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM match_results         WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM outreach_log          WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM intake_tokens         WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM candidate_req_matches WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM candidate_surveys     WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM candidate_notes       WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');
DELETE FROM candidate_fit_scores  WHERE candidate_id IN (SELECT id FROM candidates WHERE email LIKE '%@example.com');

-- The demo candidates themselves
DELETE FROM candidates WHERE email LIKE '%@example.com';

-- Demo requisitions (children first)
DELETE FROM req_pipeline WHERE requisition_id IN (
  SELECT id FROM requisitions WHERE ilabor_req_id IN ('IL-2024-001','IL-2024-002','IL-2024-003')
);
DELETE FROM candidate_req_matches WHERE req_id IN (
  SELECT id FROM requisitions WHERE ilabor_req_id IN ('IL-2024-001','IL-2024-002','IL-2024-003')
);
DELETE FROM requisitions WHERE ilabor_req_id IN ('IL-2024-001','IL-2024-002','IL-2024-003');
