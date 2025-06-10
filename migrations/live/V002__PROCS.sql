---------- Index ----------
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


---------- RBAC Summary ----------

-- There are two types of user 'role' systems:
-- - Global roles: {Access Administrator, User}
--    - Access Administrator:
--       - These users are allowed to manage other user's accounts, as well as their allocations to teams.
--       - They can change both the global and local roles of other users, create and delete user accounts,
--         update other users' account passwords and disable their 2FA (but should not be able to view the
--         password/2FA hash directly if possible), create teams, and assign roles within those teams.
--       - They can also create new statuses, as well as global and local roles.
--       - In effect, they can do almost anything on the system.
--    - User (Normal):
--       - Can view everything (todos, teams, roles, statuses etc.) except other users' secret values (password, 2FA).
--       - Can only update their own user details, unless they have local team roles as members of one or more teams (see local roles below).
-- - Local roles: {Team Lead, TODO User}
--    - Team Lead:
--       - Have full control of the corresponding team for which they are a Team Lead, but cannot edit team members' accounts.
--       - Cannot create new teams, but can delete the team they are a leader of. Can add/remove team members dynamically,
--         and create/delete/update todo items for their team.
--    - TODO User:
--       - Can view & edit all TODO items for teams which they are a part of, and mark todo items as 'is_deleted' (but not DELETE the item permanently),
--         as well as create & assign TODOs to other members of the team.




---------- Utils ----------

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INT;
BEGIN
    BEGIN
        v_user_id := current_setting('app.current_user_id')::INT;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Current user ID (app.current_user_id) is not set';
    END;

    RETURN v_user_id;
END;
$$;


---------- Helper Functions for RBAC Checks ----------

-- Check if current user is valid and exists
CREATE OR REPLACE FUNCTION check_current_user_exists()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM users WHERE id = v_current_user_id;
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Current user ID % does not exist', v_current_user_id;
    END IF;
END;
$$;

-- Check if current user has a specific global role
CREATE OR REPLACE FUNCTION current_user_has_global_role(p_role_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_count INT;
BEGIN
    PERFORM check_current_user_exists();
    SELECT COUNT(*)
    INTO v_count
    FROM user_global_roles ugr
    JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE ugr.user_id = v_current_user_id AND gr.name = p_role_name;
    RETURN v_count > 0;
END;
$$;

-- Check if current user has a specific local role on a given team
CREATE OR REPLACE FUNCTION current_user_has_local_role(p_team_id INT, p_role_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_count INT;
BEGIN
    PERFORM check_current_user_exists();
    SELECT COUNT(*)
    INTO v_count
    FROM team_memberships tm
    JOIN member_local_roles mlr ON tm.id = mlr.member_id
    JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.user_id = v_current_user_id
      AND tm.team_id = p_team_id
      AND lr.name = p_role_name;
    RETURN v_count > 0;
END;
$$;

-- Check if current user is Access Administrator (global admin)
CREATE OR REPLACE FUNCTION current_user_is_access_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN current_user_has_global_role('Access Administrator');
END;
$$;

-- Check if current user is normal user
CREATE OR REPLACE FUNCTION current_user_is_normal_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN current_user_has_global_role('User');
END;
$$;


---------- Users Procedures ----------

CREATE OR REPLACE FUNCTION create_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_two_fa_secret VARCHAR DEFAULT NULL
)
RETURNS TABLE(user_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only Access Administrator can create users
    -- IF NOT current_user_is_access_admin() THEN
    --     RAISE EXCEPTION 'Permission denied: Only Access Administrator can create users';
    -- END IF;

    RETURN QUERY
    INSERT INTO users (name, email, password_hash, two_fa_secret)
    VALUES (p_name, p_email, p_password_hash, p_two_fa_secret)
    RETURNING id;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (id INTEGER, name VARCHAR, email VARCHAR, role_ids INTEGER[], role_names VARCHAR[])
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- All users can view user list but password and 2FA are not exposed here
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.email,
        ARRAY_AGG(ugr.role_id ORDER BY ugr.role_id DESC) AS role_ids,
        ARRAY_AGG(gr.name ORDER BY ugr.role_id DESC) AS role_names
    FROM users u
    LEFT JOIN user_global_roles ugr ON u.id = ugr.user_id
    LEFT JOIN global_roles gr ON ugr.role_id = gr.id
    GROUP BY u.id, u.name, u.email;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_secrets_by_email(p_email VARCHAR)
RETURNS TABLE (id INTEGER, name VARCHAR, email VARCHAR, password_hash VARCHAR, two_fa_secret VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    -- Only System can view user secrets
    IF v_current_user_id <> -1 THEN
        RAISE EXCEPTION 'Permission denied: Cannot view users'' secret info';
    END IF;

    RETURN QUERY
    SELECT u.id, u.name, u.email, u.password_hash, u.two_fa_secret
    FROM users u
    WHERE u.email = p_email;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_secrets(p_user_id INTEGER)
RETURNS TABLE (id INTEGER, name VARCHAR, email VARCHAR, password_hash VARCHAR, two_fa_secret VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    -- Only System can view user secrets
    IF v_current_user_id <> -1 THEN
        RAISE EXCEPTION 'Permission denied: Cannot view users'' secret info';
    END IF;

    RETURN QUERY
    SELECT u.id, u.name, u.email, u.password_hash, u.two_fa_secret
    FROM users u
    WHERE u.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    email VARCHAR,
    role_ids INTEGER[],
    role_names VARCHAR[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Normal users can only view their own user info unless they have local roles for other teams
    IF v_current_user_id <> p_user_id
       AND NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Cannot view other users'' details';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.email,
        ARRAY_AGG(ugr.role_id ORDER BY ugr.role_id DESC) AS role_ids,
        ARRAY_AGG(gr.name ORDER BY ugr.role_id DESC) AS role_names
    FROM users u
    LEFT JOIN user_global_roles ugr ON u.id = ugr.user_id
    LEFT JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE u.id = p_user_id
    GROUP BY u.id, u.name, u.email;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    email VARCHAR,
    role_ids INTEGER[],
    role_names VARCHAR[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or the user himself can get details by email
    IF NOT current_user_is_access_admin() THEN
        IF NOT EXISTS (
            SELECT 1 FROM users
            WHERE id = v_current_user_id AND email = p_email
        ) THEN
            RAISE EXCEPTION 'Permission denied: Cannot view other users by email';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.email,
        ARRAY_AGG(ugr.role_id ORDER BY ugr.role_id DESC) AS role_ids,
        ARRAY_AGG(gr.name ORDER BY ugr.role_id DESC) AS role_names
    FROM users u
    LEFT JOIN user_global_roles ugr ON u.id = ugr.user_id
    LEFT JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE u.email = p_email
    GROUP BY u.id, u.name, u.email;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_teams(p_user_id INTEGER)
RETURNS TABLE (
    team_id INTEGER,
    team_name VARCHAR,
    team_description VARCHAR,
    membership_id INTEGER,
    role_ids INTEGER[],
    role_names VARCHAR[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- User can only see their own team memberships, or Access Administrator can see all
    IF v_current_user_id <> p_user_id
       AND NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Cannot view other users'' team memberships';
    END IF;

    RETURN QUERY
    SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.description AS team_description,
        tm.id AS membership_id,
        ARRAY_AGG(mlr.role_id ORDER BY mlr.role_id DESC) AS role_ids,
        ARRAY_AGG(lr.name ORDER BY mlr.role_id DESC) AS role_names
    FROM team_memberships tm
    JOIN teams t ON tm.team_id = t.id
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.user_id = p_user_id
    GROUP BY t.id, t.name, t.description, tm.id;
END;
$$;

CREATE OR REPLACE PROCEDURE update_user(
    p_user_id INTEGER,
    p_name VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_password_hash VARCHAR DEFAULT NULL,
    p_two_fa_secret VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can update other users
    -- Normal user can update only own details except password_hash and two_fa_secret
    IF v_current_user_id <> p_user_id THEN
        IF NOT current_user_is_access_admin() THEN
            RAISE EXCEPTION 'Permission denied: Cannot update other users'' details';
        END IF;
    ELSE
        -- If current user updating self, deny updating password_hash and 2FA here for normal users
        IF (p_password_hash IS NOT NULL OR p_two_fa_secret IS NOT NULL)
           AND NOT current_user_is_access_admin() THEN
            RAISE EXCEPTION 'Permission denied: Cannot update password or 2FA secret';
        END IF;
    END IF;

    UPDATE users
    SET
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        password_hash = CASE WHEN current_user_is_access_admin()
                             THEN COALESCE(p_password_hash, password_hash)
                             ELSE password_hash END,
        two_fa_secret = CASE WHEN current_user_is_access_admin()
                             THEN COALESCE(p_two_fa_secret, two_fa_secret)
                             ELSE two_fa_secret END
    WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_user(p_user_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can delete users
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can delete users';
    END IF;

    DELETE FROM users WHERE id = p_user_id;
END;
$$;


---------- Teams Procedures ----------

CREATE OR REPLACE FUNCTION create_team(
    p_name VARCHAR,
    p_description VARCHAR DEFAULT NULL
)
RETURNS TABLE(team_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or normal users can create teams?
    -- Assuming normal users can create teams (no restrictions specified)
    RETURN QUERY
    INSERT INTO teams (name, description)
    VALUES (p_name, p_description)
    RETURNING id;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_teams()
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    description VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    RETURN QUERY SELECT id, name, description FROM teams;
END;
$$;

CREATE OR REPLACE FUNCTION get_team_by_id(p_team_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    description VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    RETURN QUERY
    SELECT id, name, description
    FROM teams
    WHERE id = p_team_id;
END;
$$;

CREATE OR REPLACE PROCEDURE update_team(
    p_team_id INTEGER,
    p_name VARCHAR DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or team members with Admin role can update
    IF NOT current_user_is_access_admin()
       AND NOT current_user_has_local_role(p_team_id, 'Admin') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team Admin can update team';
    END IF;

    UPDATE teams
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description)
    WHERE id = p_team_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_team(p_team_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or team Admin can delete
    IF NOT current_user_is_access_admin()
       AND NOT current_user_has_local_role(p_team_id, 'Admin') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team Admin can delete team';
    END IF;

    DELETE FROM teams WHERE id = p_team_id;
END;
$$;


---------- Team Membership Procedures ----------

CREATE OR REPLACE FUNCTION add_user_to_team(
    p_user_id INTEGER,
    p_team_id INTEGER
)
RETURNS TABLE(membership_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or team Admin can add members
    IF NOT current_user_is_access_admin()
       AND NOT current_user_has_local_role(p_team_id, 'Admin') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team Admin can add members';
    END IF;

    RETURN QUERY
    INSERT INTO team_memberships (user_id, team_id)
    VALUES (p_user_id, p_team_id)
    RETURNING id;
END;
$$;

CREATE OR REPLACE PROCEDURE remove_user_from_team(
    p_membership_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id INTO v_team_id FROM team_memberships WHERE id = p_membership_id;
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Team membership not found';
    END IF;

    -- Only Access Administrator or team Admin can remove members
    IF NOT current_user_is_access_admin()
       AND NOT current_user_has_local_role(v_team_id, 'Admin') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team Admin can remove members';
    END IF;

    DELETE FROM team_memberships WHERE id = p_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_team_members(p_team_id INTEGER)
RETURNS TABLE (
    membership_id INTEGER,
    user_id INTEGER,
    user_name VARCHAR,
    user_email VARCHAR,
    role_ids INTEGER[],
    role_names VARCHAR[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or team members can view members list
    IF NOT current_user_is_access_admin()
       AND NOT EXISTS (
           SELECT 1
           FROM team_memberships tm
           JOIN member_local_roles mlr ON tm.id = mlr.member_id
           JOIN local_roles lr ON mlr.role_id = lr.id
           WHERE tm.user_id = v_current_user_id
             AND tm.team_id = p_team_id
             AND lr.name IN ('Admin','Member')
       ) THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team members can view team members';
    END IF;

    RETURN QUERY
    SELECT
        tm.id AS membership_id,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        ARRAY_AGG(mlr.role_id ORDER BY mlr.role_id DESC) AS role_ids,
        ARRAY_AGG(lr.name ORDER BY mlr.role_id DESC) AS role_names
    FROM team_memberships tm
    JOIN users u ON tm.user_id = u.id
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.team_id = p_team_id
    GROUP BY tm.id, u.id, u.name, u.email;
END;
$$;

CREATE OR REPLACE PROCEDURE update_member_roles(
    p_membership_id INTEGER,
    p_role_ids INTEGER[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id INTO v_team_id FROM team_memberships WHERE id = p_membership_id;
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Team membership not found';
    END IF;

    -- Only Access Administrator or team Admin can update roles
    IF NOT current_user_is_access_admin()
       AND NOT current_user_has_local_role(v_team_id, 'Admin') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or team Admin can update member roles';
    END IF;

    DELETE FROM member_local_roles WHERE member_id = p_membership_id;

    IF p_role_ids IS NOT NULL THEN
        INSERT INTO member_local_roles (member_id, role_id)
        SELECT p_membership_id, unnest(p_role_ids);
    END IF;
END;
$$;