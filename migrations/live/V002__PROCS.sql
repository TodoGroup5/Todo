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
--  - add_user_to_team
--  - get_team_membership
--  - get_team_members
--  - remove_user_from_team

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

-- Check if current user is a member of a given team
CREATE OR REPLACE FUNCTION current_user_is_member_of_team(p_team_id INTEGER)
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
    WHERE tm.user_id = v_current_user_id AND tm.team_id = p_team_id;
    RETURN v_count > 0;
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
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    -- PERFORM check_current_user_exists();

    -- Only System & Access Administrator can create users
    IF v_current_user_id <> -1 AND NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can create users';
    END IF;

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
    -- Only System can view user secrets. -1 is conventionally used for system
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
    -- Only System can view user secrets. -1 is conventionally used for system
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

    -- Normal users can only view their own user info unless they have local roles for other teams, or are Access Admin
    -- IF v_current_user_id <> p_user_id
    --     AND NOT current_user_is_access_admin() THEN
    --     RAISE EXCEPTION 'Permission denied: Cannot view other users'' details';
    -- END IF;

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
    -- IF NOT current_user_is_access_admin() THEN
    --     IF NOT EXISTS (
    --         SELECT 1 FROM users
    --         WHERE id = v_current_user_id AND email = p_email
    --     ) THEN
    --         RAISE EXCEPTION 'Permission denied: Cannot view other users by email';
    --     END IF;
    -- END IF;

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
    v_is_admin BOOLEAN := current_user_is_access_admin();
BEGIN
    -- Skip existence check if called by the System user
    IF v_current_user_id <> -1 THEN
        PERFORM check_current_user_exists();
    END IF;

    -- Permission checks
    IF v_current_user_id = -1 THEN
        -- System user: full access, no restrictions
        NULL;

    ELSIF v_current_user_id <> p_user_id THEN
        -- User updating someone else
        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Permission denied: Cannot update other users'' details';
        END IF;

    ELSE
        -- User updating self
        IF (p_password_hash IS NOT NULL OR p_two_fa_secret IS NOT NULL)
            AND NOT v_is_admin THEN
            RAISE EXCEPTION 'Permission denied: Cannot update password or 2FA secret';
        END IF;
    END IF;

    -- Apply the update
    UPDATE users
    SET
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        password_hash = CASE
            WHEN v_current_user_id = -1 OR v_is_admin THEN COALESCE(p_password_hash, password_hash)
            ELSE password_hash
        END,
        two_fa_secret = CASE
            WHEN v_current_user_id = -1 OR v_is_admin THEN COALESCE(p_two_fa_secret, two_fa_secret)
            ELSE two_fa_secret
        END
    WHERE id = p_user_id;
END;
$$;


-- CREATE OR REPLACE PROCEDURE update_user(
--     p_user_id INTEGER,
--     p_name VARCHAR DEFAULT NULL,
--     p_email VARCHAR DEFAULT NULL,
--     p_password_hash VARCHAR DEFAULT NULL,
--     p_two_fa_secret VARCHAR DEFAULT NULL
-- )
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--     v_current_user_id INT := get_current_user_id();
-- BEGIN
--     -- PERFORM check_current_user_exists();

--     -- Only Access Administrator can update other users
--     -- Normal user can update only own details except password_hash and two_fa_secret
--     IF v_current_user_id <> p_user_id AND v_current_user_id <> -1 THEN
--         IF NOT current_user_is_access_admin() THEN
--             RAISE EXCEPTION 'Permission denied: Cannot update other users'' details';
--         END IF;
--     ELSE
--         -- If current user updating self, deny updating password_hash and 2FA here for normal users
--         IF (p_password_hash IS NOT NULL OR p_two_fa_secret IS NOT NULL)
--             AND NOT current_user_is_access_admin() THEN
--             RAISE EXCEPTION 'Permission denied: Cannot update password or 2FA secret';
--         END IF;
--     END IF;

--     UPDATE users
--     SET
--         name = COALESCE(p_name, name),
--         email = COALESCE(p_email, email),
--         password_hash = CASE WHEN current_user_is_access_admin()
--                                  THEN COALESCE(p_password_hash, password_hash)
--                                  ELSE password_hash END,
--         two_fa_secret = CASE WHEN current_user_is_access_admin()
--                                  THEN COALESCE(p_two_fa_secret, two_fa_secret)
--                                  ELSE two_fa_secret END
--     WHERE id = p_user_id;
-- END;
-- $$;

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

    -- Only Access Administrator can create teams
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can create teams';
    END IF;

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

    -- Only Access Administrator or team Lead can update
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(p_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can update team';
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

    -- Only Access Administrator or team Lead can delete
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(p_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can delete team';
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

    -- Only Access Administrator or team Lead can add members
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(p_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can add members';
    END IF;

    RETURN QUERY
    INSERT INTO team_memberships (user_id, team_id)
    VALUES (p_user_id, p_team_id)
    RETURNING id;
END;
$$;

CREATE OR REPLACE FUNCTION get_team_membership(
    p_membership_id INTEGER
)
RETURNS TABLE (
    id INTEGER,
    user_id INTEGER,
    team_id INTEGER,
    role_ids INTEGER[],
    role_names VARCHAR[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_membership_user_id INTEGER;
    v_membership_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT tm.user_id, tm.team_id
    INTO v_membership_user_id, v_membership_team_id
    FROM team_memberships tm
    WHERE tm.id = p_membership_id;

    IF v_membership_user_id IS NULL THEN
        RAISE EXCEPTION 'Team membership ID % not found', p_membership_id;
    END IF;

    -- Only Access Administrator, Team Lead of the team, or the user himself can view their own membership
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_membership_team_id, 'Team Lead')
        AND NOT (v_current_user_id = v_membership_user_id) THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to view this team membership.';
    END IF;

    RETURN QUERY
    SELECT
        tm.id,
        tm.user_id,
        tm.team_id,
        ARRAY_AGG(mlr.role_id ORDER BY mlr.role_id DESC) AS role_ids,
        ARRAY_AGG(lr.name ORDER BY mlr.role_id DESC) AS role_names
    FROM team_memberships tm
    LEFT JOIN member_local_roles mlr ON tm.id = mlr.member_id
    LEFT JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE tm.id = p_membership_id
    GROUP BY tm.id, tm.user_id, tm.team_id;
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

    -- Only Access Administrator or team Lead can remove members
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can remove members';
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

    -- Only Access Administrator or a member of the team can view members list
    IF NOT current_user_is_access_admin()
        AND NOT current_user_is_member_of_team(p_team_id) THEN
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

    -- Only Access Administrator or team Lead can update roles
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can update member roles';
    END IF;

    DELETE FROM member_local_roles WHERE member_id = p_membership_id;

    IF p_role_ids IS NOT NULL THEN
        INSERT INTO member_local_roles (member_id, role_id)
        SELECT p_membership_id, unnest(p_role_ids);
    END IF;
END;
$$;


---------- Statuses Procedures ----------

CREATE OR REPLACE PROCEDURE create_status(p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can create statuses
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can create statuses';
    END IF;

    INSERT INTO statuses (name) VALUES (p_name);
END;
$$;


CREATE OR REPLACE FUNCTION get_all_statuses()
RETURNS SETOF statuses
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    RETURN QUERY
    SELECT * FROM statuses;
END;
$$;


CREATE OR REPLACE FUNCTION get_status_by_id(p_status_id INTEGER)
RETURNS SETOF statuses
LANGUAGE plpgsql
AS $$
DECLARE
    result statuses%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM statuses WHERE id = p_status_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;


CREATE OR REPLACE FUNCTION get_status_by_name(p_name VARCHAR)
RETURNS SETOF statuses
LANGUAGE plpgsql
AS $$
DECLARE
    result statuses%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM statuses WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;


CREATE OR REPLACE PROCEDURE update_status(p_status_id INTEGER, p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can update statuses
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can update statuses';
    END IF;

    UPDATE statuses SET name = p_name WHERE id = p_status_id;
END;
$$;


CREATE OR REPLACE PROCEDURE delete_status(p_status_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can delete statuses
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can delete statuses';
    END IF;

    DELETE FROM statuses WHERE id = p_status_id;
END;
$$;


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
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_assigned_user_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    -- Ensure the creator is the current user
    IF v_current_user_id <> p_created_by THEN
        RAISE EXCEPTION 'Permission denied: Cannot create todo for another user.';
    END IF;

    -- Check if current user is Access Administrator, Team Lead, or TODO User for the team
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(p_team_id, 'Team Lead')
        AND NOT current_user_has_local_role(p_team_id, 'TODO User') THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to create todos for this team.';
    END IF;

    -- If assigned to is provided, verify they are a member of the team
    IF p_assigned_to IS NOT NULL THEN
        SELECT user_id INTO v_assigned_user_id FROM team_memberships WHERE id = p_assigned_to;
        IF v_assigned_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM team_memberships WHERE id = p_assigned_to AND team_id = p_team_id) THEN
            RAISE EXCEPTION 'Invalid assigned_to: Provided assigned_to ID is not a member of the specified team.';
        END IF;
    END IF;

    INSERT INTO todos (created_by, assigned_to, team_id, title, description, status, due_date, updated_at)
    VALUES (p_created_by, p_assigned_to, p_team_id, p_title, p_description, p_status, p_due_date, NOW());
END;
$$;


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
    completed_at TIMESTAMP)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_todo_team_id INTEGER;
    v_todo_assigned_to_user_id INTEGER;
    v_todo_created_by_user_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT t.team_id, tm_assigned.user_id, t.created_by
    INTO v_todo_team_id, v_todo_assigned_to_user_id, v_todo_created_by_user_id
    FROM todos t
    LEFT JOIN team_memberships tm_assigned ON t.assigned_to = tm_assigned.id
    WHERE t.id = p_todo_id;

    IF v_todo_team_id IS NULL THEN
        RAISE EXCEPTION 'Todo with ID % not found or is deleted.', p_todo_id;
    END IF;

    -- Access Check: Access Admin, Team Lead, TODO User of the team, or the user involved in the todo
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_todo_team_id, 'Team Lead')
        AND NOT current_user_has_local_role(v_todo_team_id, 'TODO User')
        AND NOT (v_current_user_id = v_todo_created_by_user_id) -- if current user created it
        AND NOT (v_current_user_id = v_todo_assigned_to_user_id) THEN -- if todo is assigned to current user
        RAISE EXCEPTION 'Permission denied: Not authorized to view this todo.';
    END IF;

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
$$;

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
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or the user themselves can view their todos
    IF v_current_user_id <> p_user_id AND NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Cannot view other users'' todos';
    END IF;

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
$$;


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
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator, Team Lead of the team, TODO User of the team, or the user themselves can view their todos within this team.
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(p_team_id, 'Team Lead')
        AND NOT current_user_has_local_role(p_team_id, 'TODO User')
        AND NOT (v_current_user_id = p_user_id AND current_user_is_member_of_team(p_team_id)) THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to view todos for this member in this team.';
    END IF;

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
$$;


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
    completed_at TIMESTAMP)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or a member of the team can view team todos
    IF NOT current_user_is_access_admin()
        AND NOT current_user_is_member_of_team(p_team_id) THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to view todos for this team.';
    END IF;

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
$$;


CREATE OR REPLACE PROCEDURE update_todo(
    p_todo_id INTEGER,
    p_assigned_to INTEGER DEFAULT NULL,
    p_title VARCHAR DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL,
    p_status INTEGER DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_completed_at TIMESTAMP DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_todo_team_id INTEGER;
    v_old_completed_at TIMESTAMP;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id, completed_at INTO v_todo_team_id, v_old_completed_at FROM todos WHERE id = p_todo_id;

    IF v_todo_team_id IS NULL THEN
        RAISE EXCEPTION 'Todo with ID % not found or is deleted.', p_todo_id;
    END IF;

    -- Check if current user is Access Administrator, Team Lead, or TODO User for the team
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_todo_team_id, 'Team Lead')
        AND NOT current_user_has_local_role(v_todo_team_id, 'TODO User') THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to update this todo.';
    END IF;

    -- Specific check for TODO User: they cannot unset completed_at
    IF current_user_has_local_role(v_todo_team_id, 'TODO User') AND
       v_old_completed_at IS NOT NULL AND p_completed_at IS NULL THEN
        RAISE EXCEPTION 'Permission denied: TODO User cannot un-complete todos.';
    END IF;

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
$$;


CREATE OR REPLACE PROCEDURE delete_todo(p_todo_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_todo_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id INTO v_todo_team_id FROM todos WHERE id = p_todo_id;

    IF v_todo_team_id IS NULL THEN
        RAISE EXCEPTION 'Todo with ID % not found or already deleted.', p_todo_id;
    END IF;

    -- Check if current user is Access Administrator, Team Lead, or TODO User for the team
    -- TODO User can only mark as is_deleted, which this procedure does.
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_todo_team_id, 'Team Lead')
        AND NOT current_user_has_local_role(v_todo_team_id, 'TODO User') THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to mark this todo as deleted.';
    END IF;

    UPDATE todos SET is_deleted = TRUE WHERE id = p_todo_id;
END;
$$;


---------- Global Roles Procedures ----------

CREATE OR REPLACE PROCEDURE create_global_role(p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can create global roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can create global roles';
    END IF;

    INSERT INTO global_roles (name) VALUES (p_name);
END;
$$;


CREATE OR REPLACE FUNCTION get_all_global_roles()
RETURNS SETOF global_roles
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    RETURN QUERY
    SELECT * FROM global_roles;
END;
$$;


CREATE OR REPLACE FUNCTION get_global_role_by_id(p_role_id INTEGER)
RETURNS SETOF global_roles
LANGUAGE plpgsql
AS $$
DECLARE
    result global_roles%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM global_roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;


CREATE OR REPLACE FUNCTION get_global_role_by_name(p_name VARCHAR)
RETURNS SETOF global_roles
LANGUAGE plpgsql
AS $$
DECLARE
    result global_roles%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM global_roles WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;


CREATE OR REPLACE PROCEDURE update_global_role(p_role_id INTEGER, p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can update global roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can update global roles';
    END IF;

    UPDATE global_roles SET name = p_name WHERE id = p_role_id;
END;
$$;


CREATE OR REPLACE PROCEDURE delete_global_role(p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can delete global roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can delete global roles';
    END IF;

    DELETE FROM global_roles WHERE id = p_role_id;
END;
$$;


CREATE OR REPLACE PROCEDURE assign_global_role(p_user_id INTEGER, p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can assign global roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can assign global roles';
    END IF;

    INSERT INTO user_global_roles (user_id, role_id) VALUES (p_user_id, p_role_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_global_roles(p_user_id INTEGER)
RETURNS TABLE (user_id INTEGER, role_id INTEGER, role_name VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator or the user themselves can view their global roles
    IF v_current_user_id <> p_user_id AND NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Cannot view other users'' global roles';
    END IF;

    RETURN QUERY
    SELECT ugr.user_id, ugr.role_id, gr.name
    FROM user_global_roles ugr
    JOIN global_roles gr ON ugr.role_id = gr.id
    WHERE ugr.user_id = p_user_id;
END;
$$;


CREATE OR REPLACE PROCEDURE revoke_global_role(p_user_id INTEGER, p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can revoke global roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can revoke global roles';
    END IF;

    DELETE FROM user_global_roles WHERE user_id = p_user_id AND role_id = p_role_id;
END;
$$;


---------- Local Roles Procedures ----------

CREATE OR REPLACE PROCEDURE create_local_role(p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can create local roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can create local roles';
    END IF;

    INSERT INTO local_roles (name) VALUES (p_name);
END;
$$;


CREATE OR REPLACE FUNCTION get_all_local_roles()
RETURNS SETOF local_roles
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    RETURN QUERY
    SELECT * FROM local_roles;
END;
$$;


CREATE OR REPLACE FUNCTION get_local_role_by_id(p_role_id INTEGER)
RETURNS SETOF local_roles
LANGUAGE plpgsql
AS $$
DECLARE
    result local_roles%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM local_roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;

CREATE OR REPLACE FUNCTION get_local_role_by_name(p_name VARCHAR)
RETURNS SETOF local_roles
LANGUAGE plpgsql
AS $$
DECLARE
    result local_roles%ROWTYPE;
BEGIN
    PERFORM check_current_user_exists();

    SELECT * INTO result FROM local_roles WHERE name = p_name;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    RETURN NEXT result;
END;
$$;


CREATE OR REPLACE PROCEDURE update_local_role(p_role_id INTEGER, p_name VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can update local roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can update local roles';
    END IF;

    UPDATE local_roles SET name = p_name WHERE id = p_role_id;
END;
$$;


CREATE OR REPLACE PROCEDURE delete_local_role(p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_current_user_exists();

    -- Only Access Administrator can delete local roles
    IF NOT current_user_is_access_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator can delete local roles';
    END IF;

    DELETE FROM local_roles WHERE id = p_role_id;
END;
$$;

CREATE OR REPLACE PROCEDURE assign_local_role(p_member_id INTEGER, p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id INTO v_team_id FROM team_memberships WHERE id = p_member_id;
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Team membership not found for member ID %', p_member_id;
    END IF;

    -- Only Access Administrator or Team Lead of the team can assign local roles
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can assign local roles.';
    END IF;

    INSERT INTO member_local_roles (member_id, role_id) VALUES (p_member_id, p_role_id);
END;
$$;


CREATE OR REPLACE FUNCTION get_member_local_roles(p_member_id INTEGER)
RETURNS TABLE (member_id INTEGER, role_id INTEGER, role_name VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_team_id INTEGER;
    v_member_user_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT tm.team_id, tm.user_id
    INTO v_team_id, v_member_user_id
    FROM team_memberships tm
    WHERE tm.id = p_member_id;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Team membership not found for member ID %', p_member_id;
    END IF;

    -- Only Access Administrator, Team Lead of the team, or the member themselves can view their local roles.
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_team_id, 'Team Lead')
        AND NOT (v_current_user_id = v_member_user_id) THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to view this member''s local roles.';
    END IF;

    RETURN QUERY
    SELECT mlr.member_id, mlr.role_id, lr.name
    FROM member_local_roles mlr
    JOIN local_roles lr ON mlr.role_id = lr.id
    WHERE mlr.member_id = p_member_id;
END;
$$;


CREATE OR REPLACE PROCEDURE revoke_local_role(p_member_id INTEGER, p_role_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_id INT := get_current_user_id();
    v_team_id INTEGER;
BEGIN
    PERFORM check_current_user_exists();

    SELECT team_id INTO v_team_id FROM team_memberships WHERE id = p_member_id;
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Team membership not found for member ID %', p_member_id;
    END IF;

    -- Only Access Administrator or Team Lead of the team can revoke local roles
    IF NOT current_user_is_access_admin()
        AND NOT current_user_has_local_role(v_team_id, 'Team Lead') THEN
        RAISE EXCEPTION 'Permission denied: Only Access Administrator or Team Lead can revoke local roles.';
    END IF;

    DELETE FROM member_local_roles WHERE member_id = p_member_id AND role_id = p_role_id;
END;
$$;
