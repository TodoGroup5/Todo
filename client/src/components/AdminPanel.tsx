import React, { useState, useEffect, useCallback } from 'react';
import { CrudService } from '../api/crudService.ts';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role_ids: number[];
  role_names: string[];
}

interface GlobalRole {
  id: number;
  name: string;
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' });

  useEffect(() => {
    fetchUsers();
    fetchGlobalRoles();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await CrudService.read<User[]>('/admin/users');
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); }
      if (response.data == null) return;

      console.log("USERS RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); }

      const usersData = response.data.data ?? [];
      const usersWithRoles: User[] = usersData.filter(u => u.role_ids.length > 0);

      setUsers(usersWithRoles);
    }
    catch (err) { console.log("Failed to fetch users", err); }
    finally { setLoading(false); }

  }, []);

  const fetchGlobalRoles = useCallback(async () => {
    try {
      const response = await CrudService.read<GlobalRole[]>('/global-role/all');
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("ROLES RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }
      
      setGlobalRoles(response.data.data as GlobalRole[] ?? []);
    } catch (err) {
      console.log("Failed to fetch global roles", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchGlobalRoles();
  }, [fetchUsers, fetchGlobalRoles]);

  useEffect(() => {
    console.log('USERS CHANGED')
    console.log(users)
  }, [users])

  const handleRoleChange = async (userId: number, newRoleId: string) => {
    if (!newRoleId) return;
    setUpdateLoading(true);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      if (user.role_ids.length > 0) {
        for (const role_id of user.role_ids) {
          const revokeResponse = await CrudService.delete(`/user/${userId}/global-role/${role_id}/revoke`, '');
          if (revokeResponse.error) { throw new Error("[REVOKE]: " + revokeResponse.error); }
        }
      }

      
      const assignData = {};
      const assignResponse = await CrudService.create(`/user/${userId}/global-role/${newRoleId}/assign`, assignData);
      if (assignResponse.error) { throw new Error("[ASSIGN]: " + assignResponse.error + "\n" + assignResponse.message); return; }
      if (assignResponse.data == null) return;

      console.log("ROLE CHANGE RESPONSE:", assignResponse.data);

      if (assignResponse.data.status === 'failed') { throw new Error("[DATA]: " + assignResponse.data.error); return; }   
      
      fetchUsers();
      const selectedRole = globalRoles.find(role => role.id === parseInt(newRoleId));
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
          ? {
              ...user,
              roles: [
                {
                  role_id: parseInt(newRoleId),
                  role_name: selectedRole.name,
                  user_id: userId
                }
              ]
            }
          : user
        )
      );
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
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password_hash: newUser.password
      };

      const response = await CrudService.create<typeof userData, { user_id: number }>('/user/create', userData);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); }
      if (response.data == null) return;

      console.log("CREATE USER RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); }

      if (newUser.role) {
        const newUserId = response.data.data?.user_id;
        if (newUserId) {
          const assignData = {};
          const roleResponse = await CrudService.create(`/user/${newUserId}/global-role/${newUser.role}/assign`, assignData);
          if (roleResponse.error) {
            console.log("Failed to assign role to new user", roleResponse.error);
          }
        }
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
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("DELETE USER RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      fetchUsers();
    } catch (err) {
      console.log("Failed to delete user", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getUserPrimaryRole = (user: User): string => {
    return user.role_names.length > 0 ? user.role_names[0] : 'No Role';
  };

  const getUserPrimaryRoleId = (user: User): number | undefined => {
    return user.role_ids[0];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
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
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
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
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="userRole">Role</label>
              <select
                id="userRole"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="">Select Role (Optional)</option>
                {globalRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={updateLoading}
            >
              {updateLoading ? 'Adding...' : 'Add User'}
            </button>
          </form>
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
            {users.map(user => (
              <div key={user.id} className="table-row">
                <span>{user.name}</span>
                <span>{user.email}</span>
                <span className="role-badge">{getUserPrimaryRole(user)}</span>
                <span>{formatDate(user.created_at)}</span>
                <div className="table-actions">
                  <select
                    value={getUserPrimaryRoleId(user) || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                    disabled={updateLoading}
                  >
                    <option value="">No Role</option>
                    {globalRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
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
              {/* <span>Role ID</span> */}
              <span>Users Count</span>
            </div>
            {globalRoles.map(role => {
              const usersWithRole = users.filter(user => 
                user.role_ids.some(id => id === role.id)
              ).length;
              
              return (
                <div key={role.id} className="table-row">
                  <span className="role-badge">{role.name}</span>
                  {/* <span>{role.id}</span> */}
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