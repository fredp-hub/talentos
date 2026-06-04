-- ============================================================
-- Seed Data: 3 Requisitions + 5 Candidates with ATS fields
-- ============================================================

-- Candidates with ATS fields
INSERT INTO candidates (full_name, email, phone, seniority_level, status, skills, desired_rate, availability_date, work_authorization, notes)
VALUES
  (
    'Priya Nair',
    'priya.nair@example.com',
    '512-555-0101',
    'senior',
    'active',
    ARRAY['Java', 'Spring Boot', 'AWS', 'Kubernetes', 'PostgreSQL'],
    110.00,
    CURRENT_DATE + INTERVAL '14 days',
    'H1B',
    'Strong backend engineer, open to remote or Austin, TX. Currently at Cognizant.'
  ),
  (
    'Marcus Webb',
    'marcus.webb@example.com',
    '214-555-0202',
    'mid',
    'active',
    ARRAY['React', 'TypeScript', 'Node.js', 'GraphQL', 'Azure'],
    95.00,
    CURRENT_DATE + INTERVAL '30 days',
    'USC',
    'Full-stack dev, strong UI chops. Open to contract only.'
  ),
  (
    'Aisha Okonkwo',
    'aisha.okonkwo@example.com',
    '713-555-0303',
    'senior',
    'active',
    ARRAY['Salesforce', 'Apex', 'LWC', 'MuleSoft', 'SOQL'],
    125.00,
    CURRENT_DATE + INTERVAL '7 days',
    'GC',
    'Certified Salesforce Architect. Available for immediate start.'
  ),
  (
    'Devon Larson',
    'devon.larson@example.com',
    '469-555-0404',
    'lead',
    'active',
    ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Spark', 'Databricks', 'SQL'],
    140.00,
    CURRENT_DATE + INTERVAL '45 days',
    'USC',
    'Data/ML lead. Currently wrapping up a 12-month engagement at a fintech.'
  ),
  (
    'Sonia Patel',
    'sonia.patel@example.com',
    '832-555-0505',
    'mid',
    'active',
    ARRAY['ServiceNow', 'ITSM', 'JavaScript', 'REST APIs', 'Agile'],
    88.00,
    CURRENT_DATE + INTERVAL '10 days',
    'EAD',
    'ServiceNow developer with 4 years of experience. ITIL certified.'
  )
ON CONFLICT (email) DO NOTHING;

-- Requisitions
INSERT INTO requisitions (ilabor_req_id, title, client_name, end_customer, location, start_date, duration, c2c_rate, job_description, status)
VALUES
  (
    'IL-2024-001',
    'Senior Java Backend Engineer',
    'Hubvia',
    'Capital One',
    'McLean, VA (Remote)',
    CURRENT_DATE + INTERVAL '21 days',
    '12 months',
    115.00,
    'We are seeking a Senior Java Backend Engineer to join a financial services team building high-throughput payment processing systems.

Required Skills:
- 5+ years Java (Java 11+), Spring Boot, Spring Security
- RESTful API design and microservices architecture
- AWS services (ECS, RDS, SQS, Lambda)
- Kubernetes and Docker
- PostgreSQL or other relational databases
- CI/CD (Jenkins, GitLab CI)

Nice to Have:
- Experience with PCI-DSS compliance
- Apache Kafka or similar messaging
- Performance tuning and load testing

The candidate will work directly with the Capital One engineering team. Strong communication skills required as this role involves daily stand-ups with client stakeholders.',
    'open'
  ),
  (
    'IL-2024-002',
    'Salesforce Technical Architect',
    'Hubvia',
    'Nationwide Insurance',
    'Columbus, OH (Hybrid 2 days/week)',
    CURRENT_DATE + INTERVAL '14 days',
    '6 months',
    130.00,
    'Nationwide Insurance is modernizing their Salesforce platform and needs a seasoned Technical Architect to lead the effort.

Required Skills:
- Salesforce Certified Application Architect or System Architect
- Apex, Lightning Web Components, SOQL
- MuleSoft or other integration middleware
- Experience with large-scale Salesforce orgs (1000+ users)
- Strong understanding of Salesforce governance and limits

Nice to Have:
- Insurance industry experience
- Salesforce CPQ or Field Service
- DevOps (Salesforce DX, Copado)

This is a client-facing role. Candidate will lead weekly architecture review sessions with Nationwide''s internal IT leadership.',
    'open'
  ),
  (
    'IL-2024-003',
    'Data Engineer / ML Platform',
    'Hubvia',
    'H-E-B Digital',
    'San Antonio, TX (Onsite)',
    CURRENT_DATE + INTERVAL '30 days',
    '12 months',
    135.00,
    'H-E-B Digital is building out a real-time ML platform to power personalization and supply chain optimization.

Required Skills:
- Python (pandas, numpy, scikit-learn)
- Apache Spark and Databricks
- ML pipeline experience (MLflow, Kubeflow, or similar)
- SQL and data warehouse concepts (dbt, Snowflake or BigQuery)
- Data modeling and ETL/ELT design

Nice to Have:
- TensorFlow or PyTorch for production model serving
- Real-time streaming (Kafka, Flink)
- Experience with recommendation systems

Candidates must be able to work onsite in San Antonio 5 days/week. Strong Python and Spark skills are non-negotiable.',
    'open'
  )
ON CONFLICT DO NOTHING;
