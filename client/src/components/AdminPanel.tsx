import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CrudService } from '../api/crudService.ts';

interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  two_fa_secret: string;
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

interface UserWithRoles extends User {
  roles: UserRole[];
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRole[]>([]);
  const [localRoles, setLocalRoles] = useState<LocalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateLoadingTeam, setUpdateLoadingTeam] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' });
  const [newTeam, setNewTeam] = useState({ name: '', description: '', members: [] as UserWithRoles[] });
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
      const usersWithRoles: UserWithRoles[] = [];

      for (const user of usersData) {
        const rolesResponse = await CrudService.read(`/user/${user.id}/global-roles`);
        let userRoles: UserRole[] = [];

        if (!rolesResponse.error && rolesResponse.data?.status !== 'failed') {
          userRoles = rolesResponse.data.data as UserRole[] ?? [];
        }

        usersWithRoles.push({ ...user, roles: userRoles });
      }

      setUsers(usersWithRoles);
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

  useEffect(() => {
    fetchUsers();
    fetchGlobalRoles();
    fetchLocalRoles();
  }, [fetchUsers, fetchGlobalRoles, fetchLocalRoles]);

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

  const handleUserTeamSelect = (e: React.FormEvent, user: UserWithRoles) => {
    e.preventDefault();
    if (!newTeam.members.some(member => member.id === user.id)) {
      setNewTeam(prev => ({ ...prev, members: [...prev.members, user] }));
    }
  };

  const handleTeamCreation = () => {
    // API call to add members with roles
    setNewTeam({ name: '', description: '', members: [] });
  };

  const handleRoleChange = async (userId: number, newRoleId: string) => {
    if (!newRoleId) return;
    setUpdateLoading(true);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      for (const role of user.roles) {
        const revokeResponse = await CrudService.delete(`/user/${userId}/global-role/${role.role_id}/revoke`, '');
        if (revokeResponse.error) throw new Error("[REVOKE]: " + revokeResponse.error);
      }

      const assignResponse = await CrudService.create(`/user/${userId}/global-role/${newRoleId}/assign`, {});
      if (assignResponse.error || assignResponse.data?.status === 'failed') {
        throw new Error("[ASSIGN]: " + assignResponse.error);
      }

      await fetchUsers();
    } catch (err) {
      console.log("Failed to change user role", err);
    } finally {
      setUpdateLoading(false);
    }
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

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setUpdateLoading(true);
    try {
      const response = await CrudService.delete('/user', userId);
      if (response.error || response.data?.status === 'failed') throw new Error("[DELETE]: " + response.error);
      fetchUsers();
    } catch (err) {
      console.log("Failed to delete user", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getUserPrimaryRole = (roles: UserRole[]): string => {
    return roles.length ? roles[0].role_name : 'No Role';
  };

  const getUserPrimaryRoleId = (roles: UserRole[]): string => {
    return roles.length ? roles[0].role_id.toString() : '';
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
                type=""
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
          <h3>Existing Users</h3>
          <div className="users-table">
            <div className="table-header">
              <span>Name</span>
              <span>Email</span>
              <span>Current Role</span>
              <span>Actions</span>
            </div>
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <span>{user.name}</span>
                <span>{user.email}</span>
                <span className="role-badge">{getUserPrimaryRole(user.roles)}</span>
                <div className="table-actions">
                  <select
                    value={getUserPrimaryRoleId(user.roles)}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                    disabled={updateLoading}
                  >
                    <option value="">No Role</option>
                    {globalRoles.map(role => (
                      <option key={role.id} value={role.id.toString()}>{role.name}</option>
                    ))}
                  </select>
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

        <div className="panel-section">
          <h3>Role Management</h3>
          <div className="users-table">
            <div className="table-header">
              <span>Role Name</span>
              <span>Users Count</span>
            </div>
            {globalRoles.map(role => {
              const usersWithRole = users.filter(user => 
                user.roles.some(userRole => userRole.role_id === role.id)
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