----------------------------------------------------------------------
-- SQL FILE: Create PostgreSQL Roles for RLS Policies
----------------------------------------------------------------------

-- This script creates two group roles that correspond to the RLS policies 
-- defined in the previous SQL file.  These roles should be granted (or set
-- as “current_role”) for each session based on the authenticated user’s 
-- global and local role assignments. 
--
--   • access_admin_role  – must be granted to any database user who is an
--                         “Access Administrator.”
--   • user_role          – must be granted to all other authenticated users,
--                         including those who hold any local roles (Team Lead, 
--                         Todo User) or are plain “User”s.

-- Note: We recommend making these NOINHERIT, NOLOGIN roles (so they cannot
-- be used to log in directly).  Your application or authentication layer
-- will SET ROLE to one of these group roles after verifying the user’s 
-- credentials and looking up their global/local assignments.

----------------------------------------------------------------------
-- 1) DROP EXISTING ROLES IF THEY EXIST
----------------------------------------------------------------------

DROP ROLE IF EXISTS access_admin_role;
DROP ROLE IF EXISTS user_role;

----------------------------------------------------------------------
-- 2) CREATE GROUP ROLE: access_admin_role
----------------------------------------------------------------------

-- This role will be used in RLS policies for “Access Administrator” privileges.
-- It should NOT be able to log in directly; instead, after authenticating,
-- your application logic (or a SECURITY DEFINER wrapper) should do:
--    SET ROLE access_admin_role;
-- whenever the current user is known to have the global “Access Admin” role.
CREATE ROLE access_admin_role
  NOLOGIN
  NOINHERIT
  NOCREATEROLE
  NOCREATEDB
  NOSUPERUSER
  INHERIT;  -- We specify INHERIT = default; NOLOGIN already ensures no direct login.

----------------------------------------------------------------------
-- 3) CREATE GROUP ROLE: user_role
----------------------------------------------------------------------

-- This role will be used in RLS policies for all non‐admin users (global “User,”
-- Team Lead, Todo User).  It also cannot log in directly, and your application
-- must set this role after successful authentication for any ordinary user.
CREATE ROLE user_role
  NOLOGIN
  NOINHERIT
  NOCREATEROLE
  NOCREATEDB
  NOSUPERUSER
  INHERIT;  -- Again, NOLOGIN prevents direct login; INHERIT lets it pick up any lower‐level grants if you choose.

----------------------------------------------------------------------
-- 4) (Optional) ADDITIONAL ROLES FOR LOCAL ROLE “TLS” OR “TU” 
--     If you prefer to create separate DB roles for Team Lead and Todo User
--     instead of checking member_local_roles inside policies, you can 
--     uncomment/create the following:

-- DROP ROLE IF EXISTS team_lead_role;
-- DROP ROLE IF EXISTS todo_user_role;

-- CREATE ROLE team_lead_role
--   NOLOGIN
--   NOINHERIT
--   NOCREATEROLE
--   NOCREATEDB
--   NOSUPERUSER
--   INHERIT;

-- CREATE ROLE todo_user_role
--   NOLOGIN
--   NOINHERIT
--   NOCREATEROLE
--   NOCREATEDB
--   NOSUPERUSER
--   INHERIT;

-- In that alternative setup, you would attach RLS policies to
-- “TO team_lead_role” or “TO todo_user_role” instead of doing EXISTS(...) 
-- checks.  But since our previous SQL used only “user_role” + EXISTS(...),
-- this section can remain commented out unless you choose to switch.

----------------------------------------------------------------------
-- 5) GRANTING these GROUP ROLES to Actual LOGIN Users
----------------------------------------------------------------------

-- The following is an example of how you might grant group membership 
-- to actual login-capable users.  Substitute your real login roles (e.g. 
-- “alice_login,” “bob_login,” etc.) for “<login_user>” and assign them 
-- to "access_admin_role" or "user_role" as appropriate.

-- Example:
--   -- If “alice_login” is a new Access Administrator:
--   GRANT access_admin_role TO alice_login;
--   GRANT user_role         TO alice_login;
--
--   -- If “bob_login” is a normal user (possibly also a Team Lead or Todo User):
--   GRANT user_role TO bob_login;
--
--   -- If “carol_login” needs both Access Admin and User privileges (not common,
--   -- but possible if you want them also to implicitly have “user_role” permissions):
--   GRANT access_admin_role TO carol_login;
--   GRANT user_role         TO carol_login;

-- Note: In addition to granting a group role here, your application must ensure
-- that CURRENT_USER (the login role) does “SET ROLE user_role” or “SET ROLE 
-- access_admin_role” for RLS to take effect in each session.  If your app 
-- never changes role, the login user must itself be one of these group roles.

----------------------------------------------------------------------
-- 6) VERIFY ROLES
----------------------------------------------------------------------

-- You can query pg_roles to confirm creation:
--   SELECT rolname, rolinherit, rolcanlogin 
--     FROM pg_roles 
--     WHERE rolname IN ('access_admin_role', 'user_role');

----------------------------------------------------------------------  
-- End of Role‐Creation SQL File
----------------------------------------------------------------------  
