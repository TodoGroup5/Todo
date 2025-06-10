-- Insert users (expanded from 25 to 60 users)
INSERT INTO users (name, email, password_hash, two_fa_secret) VALUES
('Alice Smith', 'alice@example.com', 'hashed_pwd_1', '2FA1'),
('Bob Jones', 'bob@example.com', 'hashed_pwd_2', '2FA2'),
('Charlie Brown', 'charlie@example.com', 'hashed_pwd_3', NULL),
('Diana Prince', 'diana@example.com', 'hashed_pwd_4', '2FA4'),
('Ethan Hunt', 'ethan@example.com', 'hashed_pwd_5', NULL),
('Fiona Gallagher', 'fiona@example.com', 'hashed_pwd_6', NULL),
('George Costanza', 'george@example.com', 'hashed_pwd_7', '2FA7'),
('Hannah Baker', 'hannah@example.com', 'hashed_pwd_8', NULL),
('Ian Malcolm', 'ian@example.com', 'hashed_pwd_9', NULL),
('Jane Doe', 'jane@example.com', 'hashed_pwd_10', '2FA10'),
('Kyle Reese', 'kyle@example.com', 'hashed_pwd_11', NULL),
('Laura Palmer', 'laura@example.com', 'hashed_pwd_12', NULL),
('Michael Scott', 'michael@example.com', 'hashed_pwd_13', '2FA13'),
('Nancy Drew', 'nancy@example.com', 'hashed_pwd_14', NULL),
('Oscar Isaac', 'oscar@example.com', 'hashed_pwd_15', NULL),
('Pam Beesly', 'pam@example.com', 'hashed_pwd_16', NULL),
('Quentin Coldwater', 'quentin@example.com', 'hashed_pwd_17', NULL),
('Rachel Green', 'rachel@example.com', 'hashed_pwd_18', '2FA18'),
('Steve Rogers', 'steve@example.com', 'hashed_pwd_19', NULL),
('Tina Belcher', 'tina@example.com', 'hashed_pwd_20', NULL),
('Uma Thurman', 'uma@example.com', 'hashed_pwd_21', NULL),
('Victor Stone', 'victor@example.com', 'hashed_pwd_22', NULL),
('Wendy Testaburger', 'wendy@example.com', 'hashed_pwd_23', NULL),
('Xander Cage', 'xander@example.com', 'hashed_pwd_24', NULL),
('Yvonne Strahovski', 'yvonne@example.com', 'hashed_pwd_25', '2FA25'),
('Arnold Schwarzenegger', 'arnold@example.com', 'hashed_pwd_26', '2FA26'),
('Betty White', 'betty@example.com', 'hashed_pwd_27', NULL),
('Carl Sagan', 'carl@example.com', 'hashed_pwd_28', '2FA28'),
('Dolly Parton', 'dolly@example.com', 'hashed_pwd_29', NULL),
('Eddie Murphy', 'eddie@example.com', 'hashed_pwd_30', NULL),
('Frank Sinatra', 'frank@example.com', 'hashed_pwd_31', '2FA31'),
('Grace Hopper', 'grace@example.com', 'hashed_pwd_32', '2FA32'),
('Hugh Jackman', 'hugh@example.com', 'hashed_pwd_33', NULL),
('Irene Adler', 'irene@example.com', 'hashed_pwd_34', NULL),
('Jack Sparrow', 'jack@example.com', 'hashed_pwd_35', '2FA35'),
('Kate Winslet', 'kate@example.com', 'hashed_pwd_36', NULL),
('Leonardo DiCaprio', 'leo@example.com', 'hashed_pwd_37', NULL),
('Morgan Freeman', 'morgan@example.com', 'hashed_pwd_38', '2FA38'),
('Natalie Portman', 'natalie@example.com', 'hashed_pwd_39', NULL),
('Owen Wilson', 'owen@example.com', 'hashed_pwd_40', NULL),
('Penelope Cruz', 'penelope@example.com', 'hashed_pwd_41', '2FA41'),
('Quentin Tarantino', 'qtarantino@example.com', 'hashed_pwd_42', NULL),
('Robert Downey Jr', 'rdj@example.com', 'hashed_pwd_43', '2FA43'),
('Scarlett Johansson', 'scarlett@example.com', 'hashed_pwd_44', NULL),
('Tom Hanks', 'tom@example.com', 'hashed_pwd_45', '2FA45'),
('Uma Killbill', 'ukill@example.com', 'hashed_pwd_46', NULL),
('Vin Diesel', 'vin@example.com', 'hashed_pwd_47', NULL),
('Will Smith', 'will@example.com', 'hashed_pwd_48', '2FA48'),
('Xena Warrior', 'xena@example.com', 'hashed_pwd_49', NULL),
('Yoda Master', 'yoda@example.com', 'hashed_pwd_50', '2FA50'),
('Zendaya Coleman', 'zendaya@example.com', 'hashed_pwd_51', NULL),
('Adam Driver', 'adam@example.com', 'hashed_pwd_52', '2FA52'),
('Blake Lively', 'blake@example.com', 'hashed_pwd_53', NULL),
('Chris Evans', 'chris@example.com', 'hashed_pwd_54', NULL),
('Daisy Ridley', 'daisy@example.com', 'hashed_pwd_55', '2FA55'),
('Emma Stone', 'emma@example.com', 'hashed_pwd_56', NULL),
('Florence Pugh', 'florence@example.com', 'hashed_pwd_57', NULL),
('Gal Gadot', 'gal@example.com', 'hashed_pwd_58', '2FA58'),
('Henry Cavill', 'henry@example.com', 'hashed_pwd_59', NULL),
('Idris Elba', 'idris@example.com', 'hashed_pwd_60', '2FA60');

-- Insert teams (expanded to include more departments)
INSERT INTO teams (name, description) VALUES
('Engineering', 'Handles all software development'),
('Marketing', 'Responsible for marketing efforts'),
('Support', 'Customer support and services'),
('QA', 'Quality assurance and testing'),
('Design', 'UI/UX and branding'),
('Sales', 'Sales and business development'),
('HR', 'Human resources and recruitment'),
('DevOps', 'Infrastructure and deployment'),
('Data Science', 'Analytics and machine learning'),
('Product', 'Product management and strategy'),
('Security', 'Information security and compliance'),
('Finance', 'Accounting and financial planning');

-- Insert team memberships (extensive cross-team participation including team leads)
INSERT INTO team_memberships (user_id, team_id) VALUES
-- Engineering team (Alice is team lead, also in Product and DevOps)
(1, 1), (1, 10), (1, 8), -- Alice: Engineering lead + Product + DevOps
(2, 1), (5, 1), (12, 1), (26, 1), (32, 1), (43, 1), (52, 1), (59, 1),
-- Marketing team (George is team lead, also in Sales and Design)
(7, 2), (7, 6), (7, 5), -- George: Marketing lead + Sales + Design
(3, 2), (14, 2), (18, 2), (27, 2), (38, 2), (44, 2), (51, 2), (56, 2),
-- Support team (Diana is team lead, also in HR and QA)
(4, 3), (4, 7), (4, 4), -- Diana: Support lead + HR + QA
(8, 3), (13, 3), (19, 3), (29, 3), (35, 3), (41, 3), (47, 3), (53, 3),
-- QA team (Fiona is team lead, also in Engineering and Security)
(6, 4), (6, 1), (6, 11), -- Fiona: QA lead + Engineering + Security
(9, 4), (16, 4), (22, 4), (30, 4), (36, 4), (46, 4), (54, 4), (60, 4),
-- Design team (Jane is team lead, also in Marketing and Product)
(10, 5), (10, 2), (10, 10), -- Jane: Design lead + Marketing + Product
(11, 5), (20, 5), (25, 5), (31, 5), (39, 5), (45, 5), (55, 5),
-- Sales team (Michael is team lead, also in Marketing and Finance)
(13, 6), (13, 2), (13, 12), -- Michael: Sales lead + Marketing + Finance
(17, 6), (21, 6), (28, 6), (34, 6), (40, 6), (48, 6), (57, 6),
-- HR team (Nancy is team lead, also in Support and Finance)
(14, 7), (14, 3), (14, 12), -- Nancy: HR lead + Support + Finance
(23, 7), (33, 7), (37, 7), (42, 7), (49, 7), (58, 7),
-- DevOps team (Oscar is team lead, also in Engineering and Security)
(15, 8), (15, 1), (15, 11), -- Oscar: DevOps lead + Engineering + Security
(24, 8), (50, 8),
-- Data Science team
(50, 9), (45, 9), (38, 9), (32, 9), (28, 9),
-- Product team
(43, 10), (39, 10), (35, 10), (31, 10),
-- Security team
(58, 11), (54, 11), (48, 11),
-- Finance team
(57, 12), (53, 12), (49, 12),
-- Additional individual memberships (avoiding duplicates)
(16, 1), (17, 1), (18, 1), (19, 1), (20, 1), (21, 1), (22, 1), (23, 1), (24, 1), (25, 1),
(33, 2), (34, 2), (35, 2), (36, 2), (37, 2), (40, 2), (41, 2), (42, 2),
(15, 3), (16, 3), (17, 3), (18, 3), (20, 3), (21, 3), (22, 3), (24, 3), (25, 3),
(26, 4), (27, 4), (28, 4), (31, 4), (32, 4), (33, 4), (34, 4), (35, 4),
(26, 5), (27, 5), (28, 5), (29, 5), (30, 5), (32, 5), (33, 5), (34, 5),
(29, 6), (30, 6), (31, 6), (32, 6), (33, 6), (35, 6), (36, 6), (38, 6),
(26, 7), (27, 7), (28, 7), (29, 7), (30, 7), (31, 7), (32, 7), (34, 7),
(26, 8), (27, 8), (28, 8), (29, 8), (30, 8), (31, 8), (32, 8), (33, 8),
(26, 9), (27, 9), (29, 9), (30, 9), (31, 9), (33, 9), (34, 9), (36, 9),
(26, 10), (27, 10), (28, 10), (29, 10), (30, 10), (32, 10), (33, 10), (34, 10),
(26, 11), (27, 11), (28, 11), (29, 11), (30, 11), (31, 11), (32, 11), (33, 11),
(26, 12), (27, 12), (28, 12), (29, 12), (30, 12), (31, 12), (32, 12), (33, 12);

-- Insert user global roles (expanded)
INSERT INTO user_global_roles (user_id, role_id) VALUES
-- Admin users (role_id = 0)
(1, 0), (4, 0), (7, 0), (10, 0), (13, 0), (14, 0), (15, 0), (26, 0), (38, 0), (50, 0),
-- Regular users (role_id = 1)
(2, 1), (3, 1), (5, 1), (6, 1), (8, 1), (9, 1), (11, 1), (12, 1), (16, 1), (17, 1),
(18, 1), (19, 1), (20, 1), (21, 1), (22, 1), (23, 1), (24, 1), (25, 1), (27, 1), (28, 1),
(29, 1), (30, 1), (31, 1), (32, 1), (33, 1), (34, 1), (35, 1), (36, 1), (37, 1), (39, 1),
(40, 1), (41, 1), (42, 1), (43, 1), (44, 1), (45, 1), (46, 1), (47, 1), (48, 1), (49, 1),
(51, 1), (52, 1), (53, 1), (54, 1), (55, 1), (56, 1), (57, 1), (58, 1), (59, 1), (60, 1);

-- Insert member local roles (team lead = role_id 0, member = role_id 1)
INSERT INTO member_local_roles (member_id, role_id) VALUES
-- Team leads (role_id = 0)
(1, 0), (7, 0), (4, 0), (6, 0), (10, 0), (13, 0), (14, 0), (15, 0),
-- Cross-team lead memberships (role_id = 1 when they're not the lead)
(2, 1), (3, 1), (5, 1), (8, 1), (9, 1), (11, 1), (12, 1), (16, 1), (17, 1), (18, 1),
(19, 1), (20, 1), (21, 1), (22, 1), (23, 1), (24, 1), (25, 1), (26, 1), (27, 1), (28, 1),
(29, 1), (30, 1), (31, 1), (32, 1), (33, 1), (34, 1), (35, 1), (36, 1), (37, 1), (38, 1),
(39, 1), (40, 1), (41, 1), (42, 1), (43, 1), (44, 1), (45, 1), (46, 1), (47, 1), (48, 1),
(49, 1), (50, 1), (51, 1), (52, 1), (53, 1), (54, 1), (55, 1), (56, 1), (57, 1), (58, 1),
(59, 1), (60, 1);

-- Insert extensive todos (100+ todos across all teams and statuses)
INSERT INTO todos (created_by, assigned_to, team_id, title, description, status, due_date, updated_at) VALUES
-- Engineering todos
(1, 1, 1, 'Setup CI/CD', 'Implement CI/CD pipelines for the repo', 0, '2025-07-01', NOW()),
(1, 2, 1, 'Refactor auth module', 'Improve performance and maintainability', 1, '2025-07-15', NOW()),
(1, 5, 1, 'Database migration', 'Migrate from MySQL to PostgreSQL', 0, '2025-08-01', NOW()),
(2, 12, 1, 'API rate limiting', 'Implement rate limiting for public APIs', 1, '2025-06-25', NOW()),
(5, 15, 1, 'Code review automation', 'Setup automated code review tools', 2, '2025-06-20', NOW()),
(12, 26, 1, 'Performance optimization', 'Optimize database queries for dashboard', 0, '2025-07-10', NOW()),
(15, 32, 1, 'Security audit', 'Complete security audit of payment system', 1, '2025-06-30', NOW()),
(26, 43, 1, 'Microservices migration', 'Break monolith into microservices', 0, '2025-08-15', NOW()),
(32, 52, 1, 'API documentation', 'Update and expand API documentation', 1, '2025-07-05', NOW()),
(43, 59, 1, 'Integration testing', 'Implement comprehensive integration tests', 2, '2025-06-18', NOW()),
(52, 1, 1, 'Bug fix sprint', 'Address critical bugs in production', 1, '2025-06-12', NOW()),
(59, 2, 1, 'Feature flag system', 'Implement feature flag management', 0, '2025-07-20', NOW()),

-- Marketing todos
(7, 3, 2, 'Launch campaign', 'Social media marketing campaign for Q3', 2, '2025-06-20', NOW()),
(7, 14, 2, 'Brand guidelines update', 'Refresh brand guidelines for 2025', 0, '2025-07-01', NOW()),
(3, 18, 2, 'Email automation', 'Setup automated email marketing flows', 1, '2025-06-28', NOW()),
(14, 27, 2, 'Influencer outreach', 'Partner with tech influencers for product launch', 0, '2025-07-15', NOW()),
(18, 38, 2, 'Content calendar', 'Plan Q3 content calendar across all channels', 1, '2025-06-25', NOW()),
(27, 44, 2, 'SEO optimization', 'Improve website SEO and search rankings', 2, '2025-06-15', NOW()),
(38, 51, 2, 'Product videos', 'Create demo videos for new features', 0, '2025-07-08', NOW()),
(44, 56, 2, 'Market research', 'Conduct competitive analysis for Q3 strategy', 1, '2025-06-30', NOW()),
(51, 7, 2, 'Event planning', 'Organize tech conference booth and presentations', 0, '2025-08-01', NOW()),
(56, 3, 2, 'Newsletter redesign', 'Redesign monthly newsletter template', 1, '2025-06-22', NOW()),

-- Support todos
(4, 8, 3, 'Handle support tickets', 'Respond to open tickets on Zendesk', 1, '2025-06-10', NOW()),
(4, 13, 3, 'Knowledge base update', 'Update FAQ and troubleshooting guides', 0, '2025-06-20', NOW()),
(8, 19, 3, 'Customer feedback analysis', 'Analyze and categorize recent customer feedback', 1, '2025-06-15', NOW()),
(13, 29, 3, 'Support automation', 'Implement chatbot for common queries', 0, '2025-07-05', NOW()),
(19, 35, 3, 'Training materials', 'Create training materials for new support staff', 2, '2025-06-12', NOW()),
(29, 41, 3, 'Escalation procedures', 'Document escalation procedures for complex issues', 1, '2025-06-25', NOW()),
(35, 47, 3, 'Customer satisfaction survey', 'Deploy quarterly satisfaction survey', 0, '2025-06-30', NOW()),
(41, 53, 3, 'Support metrics dashboard', 'Create dashboard for support team metrics', 1, '2025-07-10', NOW()),
(47, 4, 3, 'Priority ticket review', 'Review and prioritize high-impact tickets', 2, '2025-06-08', NOW()),
(53, 8, 3, 'Feedback loop improvement', 'Improve feedback loop between support and dev teams', 0, '2025-06-28', NOW()),

-- QA todos
(6, 9, 4, 'Run regression tests', 'Automate and run all regression tests', 1, '2025-06-22', NOW()),
(6, 16, 4, 'Test plan creation', 'Create comprehensive test plans for new features', 0, '2025-06-25', NOW()),
(9, 22, 4, 'Bug verification', 'Verify fixes for reported bugs in staging', 1, '2025-06-18', NOW()),
(16, 30, 4, 'Performance testing', 'Conduct load testing for new API endpoints', 2, '2025-06-15', NOW()),
(22, 36, 4, 'Mobile testing', 'Test mobile app on various devices and OS versions', 0, '2025-07-01', NOW()),
(30, 46, 4, 'Accessibility testing', 'Ensure compliance with WCAG 2.1 guidelines', 1, '2025-06-30', NOW()),
(36, 54, 4, 'Security testing', 'Perform security testing on authentication flows', 0, '2025-07-15', NOW()),
(46, 60, 4, 'Usability testing', 'Conduct user testing sessions for new UI', 1, '2025-06-28', NOW()),
(54, 6, 4, 'Test automation framework', 'Expand automated testing framework', 2, '2025-06-20', NOW()),
(60, 9, 4, 'Cross-browser testing', 'Test compatibility across different browsers', 0, '2025-06-22', NOW()),

-- Design todos
(10, 11, 5, 'Redesign homepage', 'Create new wireframes and assets', 0, '2025-07-05', NOW()),
(10, 20, 5, 'Brand colour audit', 'Review and document brand palette', 2, '2025-07-03', NOW()),
(11, 25, 5, 'Mobile app redesign', 'Redesign mobile app user interface', 1, '2025-07-20', NOW()),
(20, 31, 5, 'Icon system update', 'Create consistent icon system across products', 0, '2025-06-30', NOW()),
(25, 39, 5, 'User flow optimization', 'Optimize user flows for better conversion', 1, '2025-07-10', NOW()),
(31, 45, 5, 'Design system documentation', 'Document complete design system', 2, '2025-06-25', NOW()),
(39, 55, 5, 'Accessibility improvements', 'Improve design accessibility standards', 0, '2025-07-08', NOW()),
(45, 10, 5, 'Prototype new features', 'Create interactive prototypes for upcoming features', 1, '2025-06-20', NOW()),
(55, 11, 5, 'Marketing materials design', 'Design assets for marketing campaigns', 0, '2025-06-15', NOW()),

-- Sales todos
(13, 17, 6, 'Q3 sales strategy', 'Develop comprehensive Q3 sales strategy', 0, '2025-06-30', NOW()),
(13, 21, 6, 'Lead qualification', 'Qualify incoming leads from marketing campaigns', 1, '2025-06-12', NOW()),
(17, 28, 6, 'Client presentations', 'Prepare presentations for enterprise clients', 0, '2025-06-25', NOW()),
(21, 34, 6, 'Pipeline management', 'Update and manage sales pipeline in CRM', 1, '2025-06-15', NOW()),
(28, 40, 6, 'Contract negotiations', 'Negotiate terms with potential enterprise clients', 2, '2025-06-18', NOW()),
(34, 48, 6, 'Sales training', 'Conduct product training for new sales reps', 0, '2025-07-01', NOW()),
(40, 57, 6, 'Customer success handoff', 'Improve handoff process to customer success', 1, '2025-06-20', NOW()),
(48, 13, 6, 'Quarterly business review', 'Prepare QBR presentations for key accounts', 0, '2025-06-28', NOW()),

-- HR todos
(14, 23, 7, 'Recruitment drive', 'Launch recruitment campaign for engineering roles', 1, '2025-06-20', NOW()),
(14, 33, 7, 'Employee handbook update', 'Update employee handbook with new policies', 0, '2025-07-01', NOW()),
(23, 37, 7, 'Performance reviews', 'Conduct quarterly performance review cycle', 2, '2025-06-15', NOW()),
(33, 42, 7, 'Onboarding improvements', 'Improve new employee onboarding process', 1, '2025-06-25', NOW()),
(37, 49, 7, 'Benefits enrollment', 'Facilitate annual benefits enrollment period', 0, '2025-06-30', NOW()),
(42, 58, 7, 'Diversity initiatives', 'Plan and implement diversity and inclusion programs', 1, '2025-07-10', NOW()),
(49, 14, 7, 'Exit interview analysis', 'Analyze exit interview feedback and trends', 0, '2025-06-18', NOW()),

-- DevOps todos
(15, 24, 8, 'Infrastructure scaling', 'Scale infrastructure for increased traffic', 1, '2025-06-22', NOW()),
(15, 50, 8, 'Monitoring improvements', 'Enhance application monitoring and alerting', 0, '2025-07-01', NOW()),
(24, 56, 8, 'Disaster recovery', 'Implement disaster recovery procedures', 1, '2025-06-30', NOW()),
(50, 15, 8, 'Container orchestration', 'Migrate to Kubernetes for container management', 2, '2025-06-20', NOW()),
(56, 24, 8, 'Security hardening', 'Harden server security configurations', 0, '2025-07-05', NOW()),

-- Data Science todos
(50, 45, 9, 'Customer churn prediction', 'Build ML model to predict customer churn', 1, '2025-07-15', NOW()),
(45, 38, 9, 'A/B testing framework', 'Implement statistical A/B testing framework', 0, '2025-06-25', NOW()),
(38, 32, 9, 'Data pipeline optimization', 'Optimize ETL pipelines for better performance', 1, '2025-07-01', NOW()),
(32, 28, 9, 'Revenue forecasting', 'Create revenue forecasting models', 2, '2025-06-18', NOW()),
(28, 50, 9, 'User behavior analysis', 'Analyze user behavior patterns for product insights', 0, '2025-06-30', NOW()),

-- Product todos
(43, 39, 10, 'Product roadmap Q3', 'Define and prioritize Q3 product roadmap', 1, '2025-06-20', NOW()),
(39, 35, 10, 'User research study', 'Conduct user research for new feature validation', 0, '2025-06-28', NOW()),
(35, 31, 10, 'Feature specification', 'Write detailed specifications for upcoming features', 1, '2025-07-05', NOW()),
(31, 43, 10, 'Competitive analysis', 'Analyze competitor features and market positioning', 2, '2025-06-15', NOW()),
(43, 1, 10, 'Product metrics review', 'Review and analyze key product metrics', 0, '2025-06-25', NOW()),

-- Security todos
(58, 54, 11, 'Security policy update', 'Update company security policies and procedures', 1, '2025-06-30', NOW()),
(54, 48, 11, 'Penetration testing', 'Conduct quarterly penetration testing', 0, '2025-07-10', NOW()),
(48, 58, 11, 'Compliance audit', 'Complete SOC 2 compliance audit', 1, '2025-07-20', NOW()),
(58, 6, 11, 'Security training', 'Conduct security awareness training for all staff', 2, '2025-06-12', NOW()),

-- Finance todos
(57, 53, 12, 'Budget planning Q4', 'Plan Q4 budget allocation across departments', 1, '2025-06-25', NOW()),
(53, 49, 12, 'Financial reporting', 'Prepare monthly financial reports', 0, '2025-06-15', NOW()),
(49, 57, 12, 'Expense analysis', 'Analyze department expenses for cost optimization', 1, '2025-06-30', NOW()),
(57, 13, 12, 'Revenue recognition', 'Review revenue recognition procedures', 2, '2025-06-20', NOW()),

-- Cross-team collaboration todos (team leads assigning to other teams)
(1, 7, 2, 'Technical marketing content', 'Create technical content for marketing campaigns', 1, '2025-06-22', NOW()),
(7, 1, 1, 'Landing page optimization', 'Optimize landing pages for better performance', 0, '2025-07-01', NOW()),
(4, 6, 4, 'QA for support tools', 'Quality assurance for new support dashboard', 1, '2025-06-20', NOW()),
(6, 4, 3, 'Bug report process', 'Improve bug reporting process from QA to support', 0, '2025-06-25', NOW()),
(10, 13, 6, 'Sales collateral design', 'Design sales presentation templates and materials', 1, '2025-06-18', NOW()),
(13, 10, 5, 'Product showcase design', 'Design materials for product demonstrations', 2, '2025-06-12', NOW()),
(14, 15, 8, 'HR system deployment', 'Deploy new HR management system', 0, '2025-07-05', NOW()),
(15, 14, 7, 'Infrastructure for remote work', 'Setup infrastructure to support remote workforce', 1, '2025-06-28', NOW());