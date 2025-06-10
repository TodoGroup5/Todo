---------- Role-based Access Control SQL ----------


----- Helper Functions for Privileges -----
CREATE OR REPLACE FUNCTION has_global_role(p_user_id INT, p_role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_global_roles ugr
    JOIN global_roles gr ON gr.id = ugr.role_id
    WHERE ugr.user_id = p_user_id AND gr.name = p_role_name
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION has_local_role(p_user_id INT, p_team_id INT, p_role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN member_local_roles mlr ON mlr.member_id = tm.id
    JOIN local_roles lr ON lr.id = mlr.role_id
    WHERE tm.user_id = p_user_id AND tm.team_id = p_team_id
      AND lr.name = p_role_name
  );
END;
$$ LANGUAGE plpgsql STABLE;


ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;




----- RLS Policies -----
CREATE POLICY todos_policy ON todos
FOR ALL
USING (
  has_global_role(current_setting('app.user_id')::INT, 'Access Admin')
  OR has_local_role(current_setting('app.user_id')::INT, team_id, 'Team Lead')
  OR has_local_role(current_setting('app.user_id')::INT, team_id, 'Todo User')
);

CREATE POLICY users_policy ON users
FOR SELECT USING (
  current_setting('app.user_id')::INT = id
  OR has_global_role(current_setting('app.user_id')::INT, 'Access Admin')
);

CREATE POLICY users_update_policy ON users
FOR UPDATE USING (
  current_setting('app.user_id')::INT = id
  OR has_global_role(current_setting('app.user_id')::INT, 'Access Admin')
);

CREATE POLICY memberships_policy ON team_memberships
FOR SELECT USING (
  current_setting('app.user_id')::INT = user_id
  OR has_global_role(current_setting('app.user_id')::INT, 'Access Admin')
  OR has_local_role(current_setting('app.user_id')::INT, team_id, 'Team Lead')
);

CREATE POLICY statuses_policy ON statuses
FOR ALL
USING (
  has_global_role(current_setting('app.user_id')::INT, 'Access Admin')
  OR has_global_role(current_setting('app.user_id')::INT, 'User')
);

ALTER TABLE global_roles ENABLE ROW LEVEL SECURITY;
      WHERE ugr.user_id = current_setting('app.user_id')::int
        AND gr.name = 'Access Admin'
    )
  );


-- TODOS: Team Leads and TODO Users for their own teams
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY view_edit_todos_in_team_policy ON todos
  FOR SELECT, UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN member_local_roles mlr ON tm.id = mlr.member_id
      JOIN local_roles lr ON mlr.role_id = lr.id
      WHERE tm.team_id = todos.team_id
        AND tm.user_id = current_setting('app.user_id')::int
        AND lr.name IN ('Team Lead', 'Todo User')
    )
  );

CREATE POLICY create_todos_if_team_member_policy ON todos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = current_setting('app.user_id')::int
        AND tm.team_id = todos.team_id
    )
  );

CREATE POLICY allow_team_lead_delete_policy ON todos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN member_local_roles mlr ON tm.id = mlr.member_id
      JOIN local_roles lr ON mlr.role_id = lr.id
      WHERE tm.team_id = todos.team_id
        AND tm.user_id = current_setting('app.user_id')::int
        AND lr.name = 'Team Lead'
    )
  );

-- GLOBAL ROLES & USER GLOBAL ROLES: only Admins
ALTER TABLE user_global_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admin_user_global_roles ON user_global_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_global_roles ugr
      JOIN global_roles gr ON ugr.role_id = gr.id
      WHERE ugr.user_id = current_setting('app.user_id')::int
        AND gr.name = 'Access Admin'
    )
  );

ALTER TABLE global_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admin_manage_global_roles ON global_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_global_roles ugr
      JOIN global_roles gr ON ugr.role_id = gr.id
      WHERE ugr.user_id = current_setting('app.user_id')::int
        AND gr.name = 'Access Admin'
    )
  );

-- LOCAL ROLES & MEMBER LOCAL ROLES: Only Admins
ALTER TABLE member_local_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admin_member_local_roles ON member_local_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_global_roles ugr
      JOIN global_roles gr ON ugr.role_id = gr.id
      WHERE ugr.user_id = current_setting('app.user_id')::int
        AND gr.name = 'Access Admin'
    )
  );

ALTER TABLE local_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admin_manage_local_roles ON local_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_global_roles ugr
      JOIN global_roles gr ON ugr.role_id = gr.id
      WHERE ugr.user_id = current_setting('app.user_id')::int
        AND gr.name = 'Access Admin'
    )
  );
