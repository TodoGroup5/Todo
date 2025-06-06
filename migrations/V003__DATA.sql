-- Insert users
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
('Yvonne Strahovski', 'yvonne@example.com', 'hashed_pwd_25', '2FA25');

-- Insert teams
INSERT INTO teams (name, description) VALUES
('Engineering', 'Handles all software development'),
('Marketing', 'Responsible for marketing efforts'),
('Support', 'Customer support and services'),
('QA', 'Quality assurance and testing'),
('Design', 'UI/UX and branding');

-- Insert team memberships
INSERT INTO team_memberships (user_id, team_id) VALUES
(1, 1), (2, 1), (3, 2), (4, 3), (5, 1),
(6, 4), (7, 2), (8, 3), (9, 4), (10, 5),
(11, 5), (12, 1), (13, 3), (14, 2), (15, 1);

-- Insert user global roles
INSERT INTO user_global_roles (user_id, role_id) VALUES
(1, 0), (2, 1), (3, 1), (4, 1), (5, 1),
(6, 1), (7, 1), (8, 1), (9, 1), (10, 1),
(11, 1), (12, 1), (13, 1), (14, 1), (15, 1);

-- Insert member local roles
INSERT INTO member_local_roles (member_id, role_id) VALUES
(1, 0), (2, 1), (3, 1), (4, 1), (5, 1),
(6, 1), (7, 0), (8, 1), (9, 1), (10, 1),
(11, 1), (12, 1), (13, 0), (14, 1), (15, 1);

-- Insert todos
INSERT INTO todos (created_by, assigned_to, team_id, title, description, status, due_date, updated_at) VALUES
(1, 1, 1, 'Setup CI/CD', 'Implement CI/CD pipelines for the repo', 0, '2025-07-01', NOW()),
(1, 2, 1, 'Refactor auth module', 'Improve performance and maintainability', 1, '2025-07-15', NOW()),
(2, 3, 2, 'Launch campaign', 'Social media marketing campaign for Q3', 2, '2025-06-20', NOW()),
(3, 4, 3, 'Handle support tickets', 'Respond to open tickets on Zendesk', 1, '2025-06-10', NOW()),
(5, 5, 1, 'Review training material', 'Go over internal training docs', 0, '2025-06-18', NOW()),
(6, 6, 4, 'Run regression tests', 'Automate and run all regression tests', 1, '2025-06-22', NOW()),
(7, 7, 2, 'Prepare newsletter', 'Draft Q2 email newsletter', 2, '2025-06-12', NOW()),
(8, 8, 3, 'Escalate unresolved issues', 'Notify devs of blocked tickets', 0, '2025-06-14', NOW()),
(9, 9, 4, 'Verify bug fixes', 'Manually verify production fixes', 1, '2025-06-19', NOW()),
(10, 10, 5, 'Redesign homepage', 'Create new wireframes and assets', 0, '2025-07-05', NOW()),
(11, 11, 5, 'Brand colour audit', 'Review and document brand palette', 2, '2025-07-03', NOW()),
(12, 12, 1, 'Lint codebase', 'Apply standard linting across all services', 1, '2025-07-10', NOW()),
(13, 13, 3, 'Zendesk metrics dashboard', 'Add support dashboard for response times', 0, '2025-06-30', NOW()),
(14, 14, 2, 'Design ad banners', 'Create new banners for Google Ads', 1, '2025-06-15', NOW()),
(15, 15, 1, 'API documentation update', 'Update Swagger docs and examples', 2, '2025-06-25', NOW());
