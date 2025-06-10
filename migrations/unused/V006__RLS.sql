----------------------------------------------------------------------
-- COMPREHENSIVE RLS & COLUMN‐LEVEL PRIVILEGES SQL FILE FOR ALL TABLES --
----------------------------------------------------------------------

-- Note:  
--   • This file assumes the existence of two PostgreSQL roles:
--       1. access_admin_role  (granted to all users who hold the global “Access Administrator” role)
--       2. user_role          (granted to all other authenticated users, including those with any local roles)
--   • It also assumes a function or configuration that makes the integer ID of the current user available as:
--         current_user_id
--     (e.g. via a custom SQL function or a SET session variable).  
--   • TL_ROLE_ID = 0  (local_roles.id for “Team Lead”)  
--     TU_ROLE_ID = 1  (local_roles.id for “Todo User”)  
--     GA_ROLE_ID = 0  (global_roles.id for “Access Admin”)  
--     USER_ROLE_ID = 1  (global_roles.id for “User”)

------------------------------------------------------------------------
-- 1. TABLE: users
------------------------------------------------------------------------

-- 1.1 Enable Row‐Level Security
ALTER TABLE users
  ENABLE ROW LEVEL SECURITY;

-- 1.2 Column‐Level Privileges
--   • Revoke all default privileges from PUBLIC
--   • Grant SELECT on (id, name, email) to both user_role and access_admin_role
--   • No one gets SELECT on password_hash or two_fa_secret (to keep them secret)
--   • Grant INSERT, UPDATE, DELETE on appropriate columns to access_admin_role
--   • Grant UPDATE on (name, email, password_hash, two_fa_secret) to user_role (RLS will restrict to own row)
REVOKE ALL ON users FROM PUBLIC;

GRANT SELECT (id, name, email)
  ON users
  TO user_role, access_admin_role;

GRANT INSERT
  ON users
  TO access_admin_role;

GRANT UPDATE (name, email, password_hash, two_fa_secret)
  ON users
  TO access_admin_role, user_role;

GRANT DELETE
  ON users
  TO access_admin_role;

-- 1.3 Row‐Level Security Policies for users

-- 1.3.1 SELECT: Access Admin & Normal User may see all rows (columns limited by column grants)
CREATE POLICY users_select_all
  ON users
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 1.3.2 INSERT: Only Access Admin may create new users
CREATE POLICY users_insert_admin_only
  ON users
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 1.3.3 UPDATE:
--   • Access Admin: may update any user’s row (all columns granted above)
--   • Normal User: may update only their own row (all columns granted above except password_hash/two_fa_secret are hidden by RLS)
CREATE POLICY users_update_admin
  ON users
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY users_update_own
  ON users
  FOR UPDATE
  TO user_role
  USING (id = current_user_id)
  WITH CHECK (id = current_user_id);

-- 1.3.4 DELETE: Only Access Admin may delete any user
CREATE POLICY users_delete_admin
  ON users
  FOR DELETE
  TO access_admin_role
  USING (true);

------------------------------------------------------------------------
-- 2. TABLE: teams
------------------------------------------------------------------------

-- 2.1 Enable Row‐Level Security
ALTER TABLE teams
  ENABLE ROW LEVEL SECURITY;

-- 2.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE any team
--   • Team Lead may UPDATE/DELETE only teams they lead (enforced via RLS)
REVOKE ALL ON teams FROM PUBLIC;

GRANT SELECT
  ON teams
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON teams
  TO access_admin_role;

-- 2.3 Row‐Level Security Policies for teams

-- 2.3.1 SELECT: everyone sees all teams
CREATE POLICY teams_select_all
  ON teams
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 2.3.2 INSERT: only Access Admin
CREATE POLICY teams_insert_admin_only
  ON teams
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 2.3.3 UPDATE:
--   • Access Admin: any row
--   • Team Lead: only if they are a Team Lead of that team
CREATE POLICY teams_update_admin
  ON teams
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY teams_update_lead
  ON teams
  FOR UPDATE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id  = teams.id
        AND tm.user_id  = current_user_id
        AND mlr.role_id = TL_ROLE_ID
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id  = teams.id
        AND tm.user_id  = current_user_id
        AND mlr.role_id = TL_ROLE_ID
    )
  );

-- 2.3.4 DELETE:
--   • Access Admin: any row
--   • Team Lead: only if they are a Team Lead of that team
CREATE POLICY teams_delete_admin
  ON teams
  FOR DELETE
  TO access_admin_role
  USING (true);

CREATE POLICY teams_delete_lead
  ON teams
  FOR DELETE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id  = teams.id
        AND tm.user_id  = current_user_id
        AND mlr.role_id = TL_ROLE_ID
    )
  );

------------------------------------------------------------------------
-- 3. TABLE: team_memberships
------------------------------------------------------------------------

-- 3.1 Enable Row‐Level Security
ALTER TABLE team_memberships
  ENABLE ROW LEVEL SECURITY;

-- 3.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE any membership
--   • Team Lead may INSERT/DELETE only for their own team (via RLS)
REVOKE ALL ON team_memberships FROM PUBLIC;

GRANT SELECT
  ON team_memberships
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON team_memberships
  TO access_admin_role;

-- 3.3 Row‐Level Security Policies for team_memberships

-- 3.3.1 SELECT: everyone sees all memberships
CREATE POLICY tm_select_all
  ON team_memberships
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 3.3.2 INSERT:
--   • Access Admin: any row
--   • Team Lead: only if they lead the team in NEW.team_id
CREATE POLICY tm_insert_admin
  ON team_memberships
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

CREATE POLICY tm_insert_lead
  ON team_memberships
  FOR INSERT
  TO user_role
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id  = NEW.team_id
        AND tm2.user_id  = current_user_id
        AND mlr2.role_id = TL_ROLE_ID
    )
  );

-- 3.3.3 UPDATE:
--   • Access Admin: any row
--   • Team Lead & Normal User: no UPDATE
CREATE POLICY tm_update_admin
  ON team_memberships
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

-- 3.3.4 DELETE:
--   • Access Admin: any row
--   • Team Lead: only if they lead the team of that row
CREATE POLICY tm_delete_admin
  ON team_memberships
  FOR DELETE
  TO access_admin_role
  USING (true);

CREATE POLICY tm_delete_lead
  ON team_memberships
  FOR DELETE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id  = team_memberships.team_id
        AND tm2.user_id  = current_user_id
        AND mlr2.role_id = TL_ROLE_ID
    )
  );

-- (Optional) Self‐leave: allow a user to delete their own membership
-- CREATE POLICY tm_delete_self
--   ON team_memberships
--   FOR DELETE
--   TO user_role
--   USING (user_id = current_user_id);

------------------------------------------------------------------------
-- 4. TABLE: statuses
------------------------------------------------------------------------

-- 4.1 Enable Row‐Level Security
ALTER TABLE statuses
  ENABLE ROW LEVEL SECURITY;

-- 4.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE
REVOKE ALL ON statuses FROM PUBLIC;

GRANT SELECT
  ON statuses
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON statuses
  TO access_admin_role;

-- 4.3 Row‐Level Security Policies for statuses

-- 4.3.1 SELECT: everyone sees all statuses
CREATE POLICY statuses_select_all
  ON statuses
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 4.3.2 INSERT: only Access Admin
CREATE POLICY statuses_insert_admin
  ON statuses
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 4.3.3 UPDATE: only Access Admin
CREATE POLICY statuses_update_admin
  ON statuses
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

-- 4.3.4 DELETE: only Access Admin
CREATE POLICY statuses_delete_admin
  ON statuses
  FOR DELETE
  TO access_admin_role
  USING (true);

------------------------------------------------------------------------
-- 5. TABLE: todos
------------------------------------------------------------------------

-- 5.1 Enable Row‐Level Security
ALTER TABLE todos
  ENABLE ROW LEVEL SECURITY;

-- 5.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE any todo
--   • Team Lead and Todo User get INSERT/UPDATE privileges (RLS will restrict to rows in their teams)
REVOKE ALL ON todos FROM PUBLIC;

GRANT SELECT
  ON todos
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON todos
  TO access_admin_role, user_role;

-- 5.3 Row‐Level Security Policies for todos

-- 5.3.1 SELECT: everyone sees all todos
CREATE POLICY todos_select_all
  ON todos
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 5.3.2 INSERT:
--   • Access Admin: any row
--   • Team Lead: only if they lead NEW.team_id
--   • Todo User: only if they belong to NEW.team_id
CREATE POLICY todos_insert_admin
  ON todos
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

CREATE POLICY todos_insert_lead
  ON todos
  FOR INSERT
  TO user_role
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id   = NEW.team_id
        AND tm.user_id   = current_user_id
        AND mlr.role_id  = TL_ROLE_ID
    )
  );

CREATE POLICY todos_insert_member
  ON todos
  FOR INSERT
  TO user_role
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      WHERE tm.team_id = NEW.team_id
        AND tm.user_id = current_user_id
    )
  );

-- 5.3.3 UPDATE:
--   • Access Admin: any row
--   • Team Lead: only if they lead todos.team_id
--   • Todo User: only if they belong to todos.team_id
CREATE POLICY todos_update_admin
  ON todos
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY todos_update_lead
  ON todos
  FOR UPDATE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id   = todos.team_id
        AND tm.user_id   = current_user_id
        AND mlr.role_id  = TL_ROLE_ID
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id   = todos.team_id
        AND tm.user_id   = current_user_id
        AND mlr.role_id  = TL_ROLE_ID
    )
  );

CREATE POLICY todos_update_member
  ON todos
  FOR UPDATE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      WHERE tm.team_id = todos.team_id
        AND tm.user_id = current_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      WHERE tm.team_id = todos.team_id
        AND tm.user_id = current_user_id
    )
  );

-- 5.3.4 DELETE:
--   • Access Admin: any row
--   • Team Lead: only if they lead todos.team_id
--   • Todo User: NO hard deletes; they only set is_deleted=TRUE via UPDATE
CREATE POLICY todos_delete_admin
  ON todos
  FOR DELETE
  TO access_admin_role
  USING (true);

CREATE POLICY todos_delete_lead
  ON todos
  FOR DELETE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm
      JOIN member_local_roles AS mlr
        ON mlr.member_id = tm.id
      WHERE tm.team_id   = todos.team_id
        AND tm.user_id   = current_user_id
        AND mlr.role_id  = TL_ROLE_ID
    )
  );

-- (Optional) If you ever want a Todo User to hard‐delete their own created todos:
-- CREATE POLICY todos_delete_own_if_creator
--   ON todos
--   FOR DELETE
--   TO user_role
--   USING (created_by = current_user_id);

------------------------------------------------------------------------
-- 6. TABLE: global_roles
------------------------------------------------------------------------

-- 6.1 Enable Row‐Level Security
ALTER TABLE global_roles
  ENABLE ROW LEVEL SECURITY;

-- 6.2 Column‐Level Privileges
--   • Everyone can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE
REVOKE ALL ON global_roles FROM PUBLIC;

GRANT SELECT
  ON global_roles
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON global_roles
  TO access_admin_role;

-- 6.3 Row‐Level Security Policies for global_roles

-- 6.3.1 SELECT: everyone sees all global roles
CREATE POLICY gr_select_all
  ON global_roles
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 6.3.2 INSERT: only Access Admin
CREATE POLICY gr_insert_admin
  ON global_roles
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 6.3.3 UPDATE: only Access Admin
CREATE POLICY gr_update_admin
  ON global_roles
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

-- 6.3.4 DELETE: only Access Admin
CREATE POLICY gr_delete_admin
  ON global_roles
  FOR DELETE
  TO access_admin_role
  USING (true);

------------------------------------------------------------------------
-- 7. TABLE: user_global_roles
------------------------------------------------------------------------

-- 7.1 Enable Row‐Level Security
ALTER TABLE user_global_roles
  ENABLE ROW LEVEL SECURITY;

-- 7.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns (view “who is in which global role”)
--   • Only Access Admin may INSERT, UPDATE, DELETE
REVOKE ALL ON user_global_roles FROM PUBLIC;

GRANT SELECT
  ON user_global_roles
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON user_global_roles
  TO access_admin_role;

-- 7.3 Row‐Level Security Policies for user_global_roles

-- 7.3.1 SELECT: everyone sees all assignments
CREATE POLICY ugr_select_all
  ON user_global_roles
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 7.3.2 INSERT: only Access Admin
CREATE POLICY ugr_insert_admin
  ON user_global_roles
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 7.3.3 UPDATE: only Access Admin
CREATE POLICY ugr_update_admin
  ON user_global_roles
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

-- 7.3.4 DELETE: only Access Admin
CREATE POLICY ugr_delete_admin
  ON user_global_roles
  FOR DELETE
  TO access_admin_role
  USING (true);

------------------------------------------------------------------------
-- 8. TABLE: local_roles
------------------------------------------------------------------------

-- 8.1 Enable Row‐Level Security
ALTER TABLE local_roles
  ENABLE ROW LEVEL SECURITY;

-- 8.2 Column‐Level Privileges
--   • Everyone can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE
REVOKE ALL ON local_roles FROM PUBLIC;

GRANT SELECT
  ON local_roles
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON local_roles
  TO access_admin_role;

-- 8.3 Row‐Level Security Policies for local_roles

-- 8.3.1 SELECT: everyone sees all local roles
CREATE POLICY lr_select_all
  ON local_roles
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 8.3.2 INSERT: only Access Admin
CREATE POLICY lr_insert_admin
  ON local_roles
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

-- 8.3.3 UPDATE: only Access Admin
CREATE POLICY lr_update_admin
  ON local_roles
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

-- 8.3.4 DELETE: only Access Admin
CREATE POLICY lr_delete_admin
  ON local_roles
  FOR DELETE
  TO access_admin_role
  USING (true);

------------------------------------------------------------------------
-- 9. TABLE: member_local_roles
------------------------------------------------------------------------

-- 9.1 Enable Row‐Level Security
ALTER TABLE member_local_roles
  ENABLE ROW LEVEL SECURITY;

-- 9.2 Column‐Level Privileges
--   • Everyone (user_role & access_admin_role) can SELECT all columns
--   • Only Access Admin may INSERT, UPDATE, DELETE any local‐role mapping
--   • Team Lead may INSERT/UPDATE/DELETE only for members of teams they lead (via RLS)
REVOKE ALL ON member_local_roles FROM PUBLIC;

GRANT SELECT
  ON member_local_roles
  TO user_role, access_admin_role;

GRANT INSERT, UPDATE, DELETE
  ON member_local_roles
  TO access_admin_role, user_role;

-- 9.3 Row‐Level Security Policies for member_local_roles

-- 9.3.1 SELECT: everyone sees all local role assignments
CREATE POLICY mlr_select_all
  ON member_local_roles
  FOR SELECT
  TO access_admin_role, user_role
  USING (true);

-- 9.3.2 INSERT:
--   • Access Admin: any row
--   • Team Lead: only if they lead the team of the membership referenced by NEW.member_id
CREATE POLICY mlr_insert_admin
  ON member_local_roles
  FOR INSERT
  TO access_admin_role
  WITH CHECK (true);

CREATE POLICY mlr_insert_lead
  ON member_local_roles
  FOR INSERT
  TO user_role
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id = (
        SELECT team_id
        FROM team_memberships
        WHERE id = NEW.member_id
      )
        AND tm2.user_id   = current_user_id
        AND mlr2.role_id  = TL_ROLE_ID
    )
  );

-- 9.3.3 UPDATE:
--   • Access Admin: any row
--   • Team Lead: only if they lead the team of the membership referenced by member_local_roles.member_id
CREATE POLICY mlr_update_admin
  ON member_local_roles
  FOR UPDATE
  TO access_admin_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY mlr_update_lead
  ON member_local_roles
  FOR UPDATE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id = (
        SELECT team_id
        FROM team_memberships
        WHERE id = member_local_roles.member_id
      )
        AND tm2.user_id   = current_user_id
        AND mlr2.role_id  = TL_ROLE_ID
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id = (
        SELECT team_id
        FROM team_memberships
        WHERE id = member_local_roles.member_id
      )
        AND tm2.user_id   = current_user_id
        AND mlr2.role_id  = TL_ROLE_ID
    )
  );

-- 9.3.4 DELETE:
--   • Access Admin: any row
--   • Team Lead: only if they lead the team of the membership referenced by member_local_roles.member_id
CREATE POLICY mlr_delete_admin
  ON member_local_roles
  FOR DELETE
  TO access_admin_role
  USING (true);

CREATE POLICY mlr_delete_lead
  ON member_local_roles
  FOR DELETE
  TO user_role
  USING (
    EXISTS (
      SELECT 1
      FROM team_memberships AS tm2
      JOIN member_local_roles AS mlr2
        ON mlr2.member_id = tm2.id
      WHERE tm2.team_id = (
        SELECT team_id
        FROM team_memberships
        WHERE id = member_local_roles.member_id
      )
        AND tm2.user_id   = current_user_id
        AND mlr2.role_id  = TL_ROLE_ID
    )
  );

----------------------------------------------------------------------
-- END OF RLS & PRIVILEGES SQL FILE
----------------------------------------------------------------------