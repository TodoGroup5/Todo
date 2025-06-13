import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CrudService } from '../api/crudService.ts';

interface User {
  id: number;
  name: string;
  email: string;
  role_ids: number[];
  role_names: string[];
}

interface UserRole {
  user_id: number;
  role_id: number;
  role_name: string;
}

interface GlobalRole {
  id: number;
  name: string;
}

interface LocalRole {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
}

interface UserTeam {
  team_id: number;
  team_name: string;
  team_description: string;
  membership_id: number;
  role_ids: number[];
  role_names: string[];
}

interface TeamMember {
  membership_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role_ids: number[];
  role_names: string[];
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRole[]>([]);
  const [localRoles, setLocalRoles] = useState<LocalRole[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateLoadingTeam, setUpdateLoadingTeam] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' });
  const [newTeam, setNewTeam] = useState({ name: '', description: '', members: [] as User[] });
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<{[teamId: number]: TeamMember[]}>({});
  const [editLoading, setEditLoading] = useState(false);
  
  const dialogRef = useRef<HTMLDialogElement>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await CrudService.customRequest('/user/all', 'GET');
      if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
      if (!response.data || response.data.status === 'failed') {
        throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
      }

      console.log("USERS", response.data);
      const usersData: User[] = Array.isArray(response.data?.data) ? response.data.data : [];
      setUsers(usersData);
    } catch (err) {
      console.log("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobalRoles = useCallback(async () => {
    try {
      const response = await CrudService.read<GlobalRole[]>('/global-role/all');
      if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
      if (!response.data || response.data.status === 'failed') {
        throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
      }

      setGlobalRoles(response.data.data as GlobalRole[] ?? []);
    } catch (err) {
      console.log("Failed to fetch global roles", err);
    }
  }, []);

  const fetchLocalRoles = useCallback(async () => {
    try {
      const response = await CrudService.read<LocalRole[]>('/local-role/all');
      if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
      if (!response.data || response.data.status === 'failed') {
        throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
      }

      setLocalRoles(response.data.data as LocalRole[] ?? []);
    } catch (err) {
      console.log("Failed to fetch local roles", err);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await CrudService.read<Team[]>('/team/all');
      if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
      if (!response.data || response.data.status === 'failed') {
        throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
      }

      setTeams(response.data.data as Team[] ?? []);
    } catch (err) {
      console.log("Failed to fetch teams", err);
    }
  }, []);

  const fetchUserTeams = useCallback(async (userId: number) => {
    try {
      setEditLoading(true);
      const response = await CrudService.read<UserTeam[]>(`/user/${userId}/teams`);
      if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
      if (!response.data || response.data.status === 'failed') {
        throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
      }

      const teams = response.data.data as UserTeam[] ?? [];
      setUserTeams(teams);

      // Fetch team members for each team
      const membersData: {[teamId: number]: TeamMember[]} = {};
      for (const team of teams) {
        try {
          const membersResponse = await CrudService.read<TeamMember[]>(`/team/${team.team_id}/members`);
          if (!membersResponse.error && membersResponse.data?.status !== 'failed') {
            membersData[team.team_id] = membersResponse.data.data as TeamMember[] ?? [];
          }
        } catch (err) {
          console.log(`Failed to fetch members for team ${team.team_id}`, err);
        }
      }
      setAllTeamMembers(membersData);
    } catch (err) {
      console.log("Failed to fetch user teams", err);
    } finally {
      setEditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchGlobalRoles();
    fetchLocalRoles();
    fetchTeams();
  }, [fetchUsers, fetchGlobalRoles, fetchLocalRoles, fetchTeams]);

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    await fetchUserTeams(user.id);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setUpdateLoading(true);
    try {
      const response = await CrudService.delete(`/user/${userId}`, '');
      if (response.error || response.data?.status === 'failed') {
        throw new Error("[DELETE]: " + response.error);
      }
      fetchUsers();
      // Close edit panel if we're editing this user
      if (editingUser?.id === userId) {
        setEditingUser(null);
        setUserTeams([]);
      }
    } catch (err) {
      console.log("Failed to delete user", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateUserGlobalRole = async (userId: number, newRoleIds: number[]) => {
    setUpdateLoading(true);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Revoke existing roles
      for (const roleId of user.role_ids || []) {
        try {
          await CrudService.delete(`/user/${userId}/global-role/${roleId}/revoke`, '');
        } catch (err) {
          console.log(`Failed to revoke role ${roleId}`, err);
        }
      }

      // Assign new roles
      for (const roleId of newRoleIds) {
        try {
          await CrudService.create(`/user/${userId}/global-role/${roleId}/assign`, {});
        } catch (err) {
          console.log(`Failed to assign role ${roleId}`, err);
        }
      }

      await fetchUsers();
      if (editingUser?.id === userId) {
        await fetchUserTeams(userId);
      }
    } catch (err) {
      console.log("Failed to update user global role", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateTeamRole = async (membershipId: number, newRoleIds: number[]) => {
    setEditLoading(true);
    try {
      const response = await CrudService.update(`/team-membership`, membershipId, {
        role_ids: newRoleIds
      });
      
      if (response.error || response.data?.status === 'failed') {
        throw new Error("[UPDATE]: " + response.error);
      }

      if (editingUser) {
        await fetchUserTeams(editingUser.id);
      }
    } catch (err) {
      console.log("Failed to update team role", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddToTeam = async (userId: number, teamId: number) => {
    setEditLoading(true);
    try {
      const response = await CrudService.create('/team-membership/add', {
        user_id: userId,
        team_id: teamId
      });

      if (response.error || response.data?.status === 'failed') {
        throw new Error("[ADD]: " + response.error);
      }

      if (editingUser) {
        await fetchUserTeams(editingUser.id);
      }
    } catch (err) {
      console.log("Failed to add user to team", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveFromTeam = async (membershipId: number) => {
    if (!window.confirm('Are you sure you want to remove this user from the team?')) return;
    setEditLoading(true);
    try {
      const response = await CrudService.delete(`/team-membership/${membershipId}`, '');

      if (response.error || response.data?.status === 'failed') {
        throw new Error("[REMOVE]: " + response.error);
      }

      if (editingUser) {
        await fetchUserTeams(editingUser.id);
      }
    } catch (err) {
      console.log("Failed to remove user from team", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim() || !newTeam.description.trim()) return;
    setUpdateLoadingTeam(true);
    try {
      // API call to create team here
      const teamData = { ...newTeam, members: [] };
      setNewTeam(teamData);
    } catch (err) {
      console.log("Failed to create team", err);
    } finally {
      setUpdateLoadingTeam(false);
    }

    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const handleUserTeamSelect = (e: React.FormEvent, user: User) => {
    e.preventDefault();
    if (!newTeam.members.some(member => member.id === user.id)) {
      setNewTeam(prev => ({ ...prev, members: [...prev.members, user] }));
    }
  };

  const handleTeamCreation = () => {
    // API call to add members with roles
    setNewTeam({ name: '', description: '', members: [] });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) return;
    setUpdateLoading(true);
    try {
      const response = await CrudService.create('/user/create', {
        name: newUser.name,
        email: newUser.email,
        password_hash: newUser.password,
      });

      if (response.error || response.data?.status === 'failed') throw new Error("[CREATE]: " + response.error);

      const userId = (response.data.data as { id: string }).id;
      if (newUser.role && userId) {
        const roleResponse = await CrudService.create(`/user/${userId}/global-role/${newUser.role}/assign`, {});
        if (roleResponse.error) console.log("Failed to assign role to new user", roleResponse.error);
      }

      fetchUsers();
      setNewUser({ name: '', email: '', password: '', role: '' });
    } catch (err) {
      console.log("Failed to create user", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getUserPrimaryRole = (roleNames: string[]): string => {
    return roleNames?.length ? roleNames.join(', ') : 'No Role';
  };

  const getAvailableTeams = () => {
    if (!editingUser) return teams;
    const userTeamIds = userTeams.map(ut => ut.team_id);
    return teams.filter(team => !userTeamIds.includes(team.id));
  };

  if (loading) return <div className="dashboard-content">Loading users...</div>;

  return (
    <div className="dashboard-content">
      <div className="admin-panel">
        <h2>User & Role Management</h2>

        <div className="panel-section">
          <h3>Add New User</h3>
          <form onSubmit={handleAddUser} className="todo-form">
            <div className="form-group">
              <label htmlFor="userName">Name</label>
              <input
                id="userName"
                type="text"
                placeholder="Full Name"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="userEmail">Email</label>
              <input
                id="userEmail"
                type="email"
                placeholder="Email Address"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="userPassword">Password</label>
              <input
                id="userPassword"
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="userRole">Role</label>
              <select
                id="userRole"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
              >
                <option value="">Select Role (Optional)</option>
                {globalRoles.map(role => (
                  <option key={role.id} value={role.id.toString()}>{role.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={updateLoading}
            >
              {updateLoading ? "Adding..." : "Add User"}
            </button>
          </form>
        </div>

        <div className="panel-section">
          <h3>All Users</h3>
          <div className="users-table">
            <div className="table-header">
              <span>Name</span>
              <span>Email</span>
              <span>Global Roles</span>
              <span>Actions</span>
            </div>
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <span>{user.name}</span>
                <span>{user.email}</span>
                <span className="role-badge">{getUserPrimaryRole(user.role_names || [])}</span>
                <div className="table-actions">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="btn-secondary"
                    disabled={updateLoading}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="btn-danger"
                    disabled={updateLoading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editingUser && (
          <div className="panel-section">
            <h3>Edit User: {editingUser.name}</h3>
            
            <div className="edit-section">
              <h4>Global Roles</h4>
              <div className="role-selection">
                <label className="radio-label">
                  <input
                    type="radio"
                    name={`global-role-${editingUser.id}`}
                    value=""
                    checked={!editingUser.role_ids?.length}
                    onChange={() => handleUpdateUserGlobalRole(editingUser.id, [])}
                    disabled={updateLoading}
                  />
                  No Role
                </label>
                {globalRoles.map(role => (
                  <label key={role.id} className="radio-label">
                    <input
                      type="radio"
                      name={`global-role-${editingUser.id}`}
                      value={role.id}
                      checked={editingUser.role_ids?.includes(role.id) || false}
                      onChange={() => handleUpdateUserGlobalRole(editingUser.id, [role.id])}
                      disabled={updateLoading}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="edit-section">
              <h4>Team Memberships</h4>
              {editLoading ? (
                <div>Loading team memberships...</div>
              ) : (
                <>
                  {userTeams.map((userTeam) => (
                    <div key={userTeam.membership_id} className="team-membership">
                      <div className="team-info">
                        <strong>{userTeam.team_name}</strong>
                        <p>{userTeam.team_description}</p>
                      </div>
                      
                      <div className="team-roles">
                        <label>Roles in this team:</label>
                        <div className="role-selection">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`team-role-${userTeam.membership_id}`}
                              value=""
                              checked={!userTeam.role_ids?.length}
                              onChange={() => handleUpdateTeamRole(userTeam.membership_id, [])}
                              disabled={editLoading}
                            />
                            No Role
                          </label>
                          {localRoles.map(role => (
                            <label key={role.id} className="radio-label">
                              <input
                                type="radio"
                                name={`team-role-${userTeam.membership_id}`}
                                value={role.id}
                                checked={userTeam.role_ids?.includes(role.id) || false}
                                onChange={() => handleUpdateTeamRole(userTeam.membership_id, [role.id])}
                                disabled={editLoading}
                              />
                              {role.name}
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFromTeam(userTeam.membership_id)}
                        className="btn-danger"
                        disabled={editLoading}
                      >
                        Remove from Team
                      </button>
                    </div>
                  ))}

                  {getAvailableTeams().length > 0 && (
                    <div className="add-to-team">
                      <h5>Add to Team</h5>
                      {getAvailableTeams().map(team => (
                        <div key={team.id} className="team-option">
                          <span>{team.name} - {team.description}</span>
                          <button
                            onClick={() => handleAddToTeam(editingUser.id, team.id)}
                            className="btn-secondary"
                            disabled={editLoading}
                          >
                            Add to Team
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => {
                setEditingUser(null);
                setUserTeams([]);
                setAllTeamMembers({});
              }}
              className="btn-secondary"
            >
              Close Edit Panel
            </button>
          </div>
        )}

        <div className="panel-section">
          <h3>Create New Team</h3>
          <form onSubmit={handleAddTeam} className="todo-form">
            <div className="form-group">
              <label htmlFor="teamName">Team Name</label>
              <input
                id="teamName"
                type="text"
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => {
                  setNewTeam({ ...newTeam, name: e.target.value });
                }}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                placeholder="Description"
                value={newTeam.description}
                onChange={(e) => {
                  setNewTeam({ ...newTeam, description: e.target.value });
                }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={updateLoadingTeam}
            >
              {updateLoadingTeam ? "Adding..." : "Add Team"}
            </button>
          </form>
        </div>

        {/* Modal for selecting users */}
        <div className="panel-section">
          <dialog ref={dialogRef} className="team-dialog">
            <form method="dialog" className="dialog-footer">
              <div style={{ display: "flex" }}>
                <h4 className="dialog-title">Select Users for the Team</h4>
                <button className="close-button">Close</button>
              </div>
            </form>
            <ul className="user-list">
              {users.map((user) => (
                <li key={user.id}>
                  <button className="user-button" onClick={(e) => {handleUserTeamSelect(e, user)}}>
                    {user.name}
                  </button>
                </li>
              ))}
            </ul>
            <form method="dialog" className="dialog-footer">
              <button className="close-button">Close</button>
            </form>
          </dialog>
        </div>

        <div className='panel-section'>
          {newTeam.members?.length > 0 && (
            <div className="team-members-section">
              <h4>Current Team Members</h4>
              <ul className="team-member-list">
                {newTeam.members.map((member) => (
                  <li key={member.id} className="team-member" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>{member.name}</span>
                    <select defaultValue="" style={{ marginLeft: 'auto' }}>
                      <option value="" disabled>Select role</option>
                      {localRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              <button onClick={() => {handleTeamCreation()}}>create team</button>
            </div>
          )}
        </div>

        <div className="panel-section">
          <h3>Role Management</h3>
          <div className="users-table">
            <div className="table-header">
              <span>Role Name</span>
              <span>Users Count</span>
            </div>
            {globalRoles.map(role => {
              const usersWithRole = users.filter(user => 
                user.role_ids?.includes(role.id)
              ).length;

              return (
                <div key={role.id} className="table-row">
                  <span className="role-badge">{role.name}</span>
                  <span>{usersWithRole} users</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;