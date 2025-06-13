-- Insert users (simplified to 3 users)
INSERT INTO users (name, email, password_hash, two_fa_secret) VALUES
('Alice Smith', 'alice@example.com', '$2b$10$XRRPo3.cCB2BrmFG1zS8U.QoSAjYQjg.L45dAD6MiwmvELZWwd7KK', 'NUXXG43ONQSTSJTNF5JE6I2SMRZEW3RD'),
('Bob Jones', 'bob@example.com', '$2b$10$XRRPo3.cCB2BrmFG1zS8U.QoSAjYQjg.L45dAD6MiwmvELZWwd7KK', 'NUXXG43ONQSTSJTNF5JE6I2SMRZEW3RD'),
('Charlie Brown', 'charlie@example.com', '$2b$10$XRRPo3.cCB2BrmFG1zS8U.QoSAjYQjg.L45dAD6MiwmvELZWwd7KK', 'NUXXG43ONQSTSJTNF5JE6I2SMRZEW3RD');

-- Insert teams (just one team for simplicity)
INSERT INTO teams (name, description) VALUES
('Engineering', 'Handles all software development'),
('Infrasturcture', 'Handles all infra'),
('Security', 'Handles all security'),
('Production Support', 'Handles all production support');


-- Insert team memberships 
INSERT INTO team_memberships (user_id, team_id) VALUES
(2, 1), -- Bob (team lead) in Engineering
(3, 1), -- Charlie (todo user) in Engineering
(2, 3), -- Bob (team lead) in Engineering
(3, 3); -- Charlie (todo user) in Engineering

-- Insert user global roles
INSERT INTO user_global_roles (user_id, role_id) VALUES
-- Admin user (role_id = 0)
(1, 0), -- Alice is admin
-- Regular users (role_id = 1)
(2, 1), -- Bob is regular user
(3, 1); -- Charlie is regular user

-- Insert member local roles
INSERT INTO member_local_roles (member_id, role_id) VALUES
-- Team lead (role_id = 0)
(1, 0), -- Bob is team lead (member_id corresponds to team_memberships table)
-- Regular member (role_id = 1)
(2, 1); -- Charlie is regular member

-- Insert todos (3 todos for Charlie)
INSERT INTO todos (created_by, assigned_to, team_id, title, description, status, due_date, updated_at) VALUES
(2, 2, 1, 'Setup CI/CD', 'Implement CI/CD pipelines for the repo', 0, '2025-07-01', NOW()),
(2, 2, 1, 'Refactor auth module', 'Improve performance and maintainability', 1, '2025-07-15', NOW()),
(2, 2, 1, 'Database migration', 'Migrate from MySQL to PostgreSQL', 0, '2025-08-01', NOW());