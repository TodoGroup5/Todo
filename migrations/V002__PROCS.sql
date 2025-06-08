---------- Summary ----------
-- Users:
--  - create_user
--  - get_user_by_id
--  - get_user_by_email
--  - update_user
--  - delete_user

-- Teams:
--  - create_team
--  - get_team_by_id
--  - update_team
--  - delete_team

-- Members:
--  - add_team_member
--  - get_team_membership
--  - get_team_members
--  - remove_team_member

-- Statuses:
--  - create_status
--  - get_all_statuses
--  - get_status_by_id
--  - get_status_by_name
--  - update_status
--  - delete_status

-- Todos:
--  - create_todo
--  - get_todo_by_id
--  - get_user_todos
--  - get_member_todos
--  - get_team_todos
--  - update_todo
--  - delete_todo

-- Roles - Global:
--  - create_global_role
--  - get_all_global_roles
--  - get_global_role_by_id
--  - get_global_role_by_name
--  - update_global_role
--  - delete_global_role
--  - assign_global_role
--  - get_user_global_roles
--  - revoke_global_role

-- Roles - Local:
--  - create_local_role
--  - get_all_local_roles
--  - get_local_role_by_id
--  - get_local_role_by_name
--  - update_local_role
--  - delete_local_role
--  - assign_local_role
--  - get_member_local_roles
--  - revoke_local_role



---------- Users Procedures ----------
CREATE OR REPLACE PROCEDURE create_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_two_fa_secret VARCHAR DEFAULT NULL
)
AS $$
BEGIN
    INSERT INTO users (name, email, password_hash, two_fa_secret) VALUES (p_name, p_email, p_password_hash, p_two_fa_secret);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF users AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM users;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id INTEGER)
RETURNS TABLE (id INTEGER, name VARCHAR, email VARCHAR, password_hash VARCHAR, two_fa_secret VARCHAR, role_id INTEGER, role_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.password_hash, u.two_fa_secret, ugr.role_id, gr.name AS role_name
    FROM users u
    LEFT JOIN user_global_roles ugr ON u.id = ugr.user_id
    LEFT JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
RETURNS TABLE (id INTEGER, name VARCHAR, email VARCHAR, password_hash VARCHAR, two_fa_secret VARCHAR, role_id INTEGER, role_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.password_hash, u.two_fa_secret, ugr.role_id, gr.name AS role_name FROM users u
    LEFT JOIN user_global_roles ugr ON u.id = ugr.user_id
    LEFT JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_user_teams(p_user_id INTEGER)
RETURNS TABLE (
    team_id INTEGER,
    team_name VARCHAR,
    team_description VARCHAR,
    membership_id INTEGER,
    role_id INTEGER,
    role_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.description AS team_description,
        tm.id AS membership_id,
        mlr.role_id,
        lr.name AS role_name
    FROM team_memberships tm
    JOIN teams t ON tm.team_id = t.id
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_user(
    p_user_id INTEGER,
    p_name VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_password_hash VARCHAR DEFAULT NULL,
    p_two_fa_secret VARCHAR DEFAULT NULL
)
AS $$
BEGIN
    UPDATE users
    SET
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        password_hash = COALESCE(p_password_hash, password_hash),
        two_fa_secret = COALESCE(p_two_fa_secret, two_fa_secret)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_user(p_user_id INTEGER)
AS $$
BEGIN
    DELETE FROM users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;



---------- Teams Procedures ----------

CREATE OR REPLACE PROCEDURE create_team(p_name VARCHAR, p_description VARCHAR)
AS $$
BEGIN
    INSERT INTO teams (name, description) VALUES (p_name, p_description);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_all_teams()
RETURNS SETOF teams AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM teams;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_team_by_id(p_team_id INTEGER)
RETURNS SETOF teams AS $$
DECLARE
    result teams%ROWTYPE;
BEGIN
    SELECT * INTO result FROM teams WHERE id = p_team_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_team(
    p_team_id INTEGER,
    p_name VARCHAR DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL
)
AS $$
BEGIN
    UPDATE teams
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description)
    WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_team(p_team_id INTEGER)
AS $$
BEGIN
    DELETE FROM teams WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql;



---------- Team Memberships Procedures ----------

CREATE OR REPLACE PROCEDURE add_team_member(p_user_id INTEGER, p_team_id INTEGER)
AS $$
BEGIN
    INSERT INTO team_memberships (user_id, team_id) VALUES (p_user_id, p_team_id);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_team_membership(p_user_id INTEGER, p_team_id INTEGER)
RETURNS TABLE (id INTEGER, user_id INTEGER, team_id INTEGER, role_id INTEGER, role_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT tm.id, tm.user_id, tm.team_id, mlr.role_id, lr.name AS role_name
    FROM team_memberships tm
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.user_id = p_user_id AND tm.team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_team_members(p_team_id INTEGER)
RETURNS TABLE (id INTEGER, user_id INTEGER, team_id INTEGER, user_name VARCHAR, user_email VARCHAR, role_id INTEGER, role_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT tm.id, tm.user_id, tm.team_id, u.name, u.email, mlr.role_id, lr.name AS role_name
    FROM team_memberships tm
    JOIN users u ON tm.user_id = u.id
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE remove_team_member(p_user_id INTEGER, p_team_id INTEGER)
AS $$
BEGIN
    DELETE FROM team_memberships WHERE user_id = p_user_id AND team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;



---------- Statuses Procedures ----------

CREATE OR REPLACE PROCEDURE create_status(p_name VARCHAR)
AS $$
BEGIN
    INSERT INTO statuses (name) VALUES (p_name);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_all_statuses()
RETURNS SETOF statuses AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM statuses;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_status_by_id(p_status_id INTEGER)
RETURNS SETOF statuses AS $$
DECLARE
    result statuses%ROWTYPE;
BEGIN
    SELECT * INTO result FROM statuses WHERE id = p_status_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_status_by_name(p_name VARCHAR)
RETURNS SETOF statuses AS $$
DECLARE
    result statuses%ROWTYPE;
BEGIN
    SELECT * INTO result FROM statuses WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_status(p_status_id INTEGER, p_name VARCHAR)
AS $$
BEGIN
    UPDATE statuses SET name = p_name WHERE id = p_status_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_status(p_status_id INTEGER)
AS $$
BEGIN
    DELETE FROM statuses WHERE id = p_status_id;
END;
$$ LANGUAGE plpgsql;



---------- Todos Procedures ----------

CREATE OR REPLACE PROCEDURE create_todo(
    p_created_by INTEGER,
    p_team_id INTEGER,
    p_title VARCHAR,
    p_description VARCHAR,
    p_status INTEGER,
    p_assigned_to INTEGER DEFAULT NULL,
    p_due_date DATE DEFAULT NULL
)
AS $$
BEGIN
    INSERT INTO todos (created_by, assigned_to, team_id, title, description, status, due_date, updated_at)
    VALUES (p_created_by, p_assigned_to, p_team_id, p_title, p_description, p_status, p_due_date, NOW());
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_todo_by_id(p_todo_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    created_by INTEGER,
    assigned_to INTEGER,
    team_id INTEGER,
    title VARCHAR,
    description VARCHAR,
    status_id INTEGER,
    status_name VARCHAR,
    due_date DATE,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.created_by,
        t.assigned_to,
        t.team_id,
        t.title,
        t.description,
        t.status AS status_id,
        s.name AS status_name,
        t.due_date,
        t.is_deleted,
        t.created_at,
        t.updated_at,
        t.completed_at
    FROM todos t
    JOIN statuses s ON t.status = s.id
    WHERE t.id = p_todo_id AND t.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_todos(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    created_by INTEGER,
    assigned_to INTEGER,
    team_id INTEGER,
    title VARCHAR,
    description VARCHAR,
    status_id INTEGER,
    status_name VARCHAR,
    due_date DATE,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.created_by,
        t.assigned_to,
        t.team_id,
        t.title,
        t.description,
        t.status AS status_id,
        s.name AS status_name,
        t.due_date,
        t.is_deleted,
        t.created_at,
        t.updated_at,
        t.completed_at
    FROM todos t
    JOIN statuses s ON t.status = s.id
    LEFT JOIN team_memberships tm ON t.assigned_to = tm.id
    WHERE (t.created_by = p_user_id OR tm.user_id = p_user_id)
      AND t.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_member_todos(p_team_id INTEGER, p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    created_by INTEGER,
    assigned_to INTEGER,
    team_id INTEGER,
    title VARCHAR,
    description VARCHAR,
    status_id INTEGER,
    status_name VARCHAR,
    due_date DATE,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.created_by,
        t.assigned_to,
        t.team_id,
        t.title,
        t.description,
        t.status AS status_id,
        s.name AS status_name,
        t.due_date,
        t.is_deleted,
        t.created_at,
        t.updated_at,
        t.completed_at
    FROM todos t
    JOIN statuses s ON t.status = s.id
    LEFT JOIN team_memberships tm ON t.assigned_to = tm.id
    WHERE t.team_id = p_team_id
      AND (t.created_by = p_user_id OR tm.user_id = p_user_id)
      AND t.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_team_todos(p_team_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    created_by INTEGER,
    assigned_to INTEGER,
    team_id INTEGER,
    title VARCHAR,
    description VARCHAR,
    status_id INTEGER,
    status_name VARCHAR,
    due_date DATE,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.created_by,
        t.assigned_to,
        t.team_id,
        t.title,
        t.description,
        t.status AS status_id,
        s.name AS status_name,
        t.due_date,
        t.is_deleted,
        t.created_at,
        t.updated_at,
        t.completed_at
    FROM todos t
    JOIN statuses s ON t.status = s.id
    WHERE t.team_id = p_team_id AND t.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_todo(
    p_todo_id INTEGER,
    p_assigned_to INTEGER DEFAULT NULL,
    p_title VARCHAR DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL,
    p_status INTEGER DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_completed_at TIMESTAMP DEFAULT NULL
)
AS $$
BEGIN
    UPDATE todos
    SET
        assigned_to = COALESCE(p_assigned_to, assigned_to),
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        status = COALESCE(p_status, status),
        due_date = COALESCE(p_due_date, due_date),
        completed_at = COALESCE(p_completed_at, completed_at),
        updated_at = NOW()
    WHERE id = p_todo_id AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_todo(p_todo_id INTEGER)
AS $$
BEGIN
    UPDATE todos SET is_deleted = TRUE WHERE id = p_todo_id;
END;
$$ LANGUAGE plpgsql;



---------- Global Roles Procedures ----------

CREATE OR REPLACE PROCEDURE create_global_role(p_name VARCHAR)
AS $$
BEGIN
    INSERT INTO global_roles (name) VALUES (p_name);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_global_role_by_id(p_role_id INTEGER)
RETURNS SETOF global_roles AS $$
DECLARE
    result global_roles%ROWTYPE;
BEGIN
    SELECT * INTO result FROM global_roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_global_role_by_name(p_name VARCHAR)
RETURNS SETOF global_roles AS $$
DECLARE
    result global_roles%ROWTYPE;
BEGIN
    SELECT * INTO result FROM global_roles WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_global_role(p_role_id INTEGER, p_name VARCHAR)
AS $$
BEGIN
    UPDATE global_roles SET name = p_name WHERE id = p_role_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_global_role(p_role_id INTEGER)
AS $$
BEGIN
    DELETE FROM global_roles WHERE id = p_role_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE assign_global_role(p_user_id INTEGER, p_role_id INTEGER)
AS $$
BEGIN
    INSERT INTO user_global_roles (user_id, role_id) VALUES (p_user_id, p_role_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_global_roles()
RETURNS SETOF global_roles AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM global_roles;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_global_roles(p_user_id INTEGER)
RETURNS TABLE (user_id INTEGER, role_id INTEGER, role_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ugr.user_id, ugr.role_id, gr.name
    FROM user_global_roles ugr
    JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE ugr.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE revoke_global_role(p_user_id INTEGER, p_role_id INTEGER)
AS $$
BEGIN
    DELETE FROM user_global_roles WHERE user_id = p_user_id AND role_id = p_role_id;
END;
$$ LANGUAGE plpgsql;



---------- Local Roles Procedures ----------

CREATE OR REPLACE PROCEDURE create_local_role(p_name VARCHAR)
AS $$
BEGIN
    INSERT INTO local_roles (name) VALUES (p_name);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_local_role_by_id(p_role_id INTEGER)
RETURNS SETOF local_roles AS $$
DECLARE
    result local_roles%ROWTYPE;
BEGIN
    SELECT * INTO result FROM local_roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_local_roles()
RETURNS SETOF local_roles AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM local_roles;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_local_role_by_name(p_name VARCHAR)
RETURNS SETOF local_roles AS $$
DECLARE
    result local_roles%ROWTYPE;
BEGIN
    SELECT * INTO result FROM local_roles WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE update_local_role(p_role_id INTEGER, p_name VARCHAR)
AS $$
BEGIN
    UPDATE local_roles SET name = p_name WHERE id = p_role_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE delete_local_role(p_role_id INTEGER)
AS $$
BEGIN
    DELETE FROM local_roles WHERE id = p_role_id;
END;
$$ LANGUAGE plpgsql;