---------- Table Definitions ----------

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(256) UNIQUE NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    two_fa_secret VARCHAR(256),
    two_fa_saved BOOLEAN NOT NULL DEFAULT FALSE -- Whether they successfully logged in at least once with the given 2FA secret
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    description VARCHAR(512) NOT NULL
);

CREATE TABLE IF NOT EXISTS team_memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    team_id INTEGER NOT NULL,
    title VARCHAR(256) NOT NULL,
    description VARCHAR(2048) NOT NULL,
    status INTEGER NOT NULL,
    due_date DATE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_global_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS local_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS member_local_roles (
    member_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (member_id, role_id)
);

---------- Add starter data ----------

INSERT INTO users (id, name, email, password_hash) VALUES (0, 'Deleted User', '', '');
INSERT INTO statuses (id, name) VALUES (0, 'TODO'), (1, 'IN PROGRESS'), (2, 'DONE');
INSERT INTO global_roles (id, name) VALUES (0, 'Access Admin'), (1, 'User');
INSERT INTO local_roles (id, name) VALUES (0, 'Team Lead'), (1, 'Todo User');

---------- Constraints ----------

ALTER TABLE team_memberships ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE team_memberships ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE team_memberships ADD CONSTRAINT unq_user_team UNIQUE (user_id, team_id);

ALTER TABLE todos ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE todos ADD CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES team_memberships(id) ON DELETE SET NULL;
ALTER TABLE todos ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE todos ADD CONSTRAINT fk_status FOREIGN KEY (status) REFERENCES statuses(id) ON UPDATE CASCADE;

ALTER TABLE user_global_roles ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_global_roles ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES global_roles(id) ON UPDATE CASCADE;

ALTER TABLE member_local_roles ADD CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES team_memberships(id) ON DELETE CASCADE;
ALTER TABLE member_local_roles ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES local_roles(id) ON UPDATE CASCADE;

---------- Triggers ----------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();