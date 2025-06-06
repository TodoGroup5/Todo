import React, { useState, useEffect } from 'react';

interface UserRole {
  id: string;
  username: string;
  roles: string[];
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', role: 'todo_user' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setUsers([
        { id: '1', username: 'admin', roles: ['access_admin'] },
        { id: '2', username: 'teamlead', roles: ['team_lead'] },
        { id: '3', username: 'user', roles: ['todo_user'] },
        { id: '4', username: 'john_doe', roles: ['todo_user'] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, roles: [newRole] }
          : user
      ));
    } catch (error) {
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, roles: [newRole] }
          : user
      ));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim()) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      const user = await response.json();
      setUsers([...users, user]);
    } catch (error) {
      const mockUser: UserRole = {
        id: Date.now().toString(),
        username: newUser.username,
        roles: [newUser.role]
      };
      setUsers([...users, mockUser]);
    }

    setNewUser({ username: '', role: 'todo_user' });
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="admin-panel">
      <h2>Role Management</h2>
      
      {/* <div className="panel-section">
        <h3>Add New User</h3>
        <form onSubmit={handleAddUser} className="add-user-form">
          <input
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            required
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
          >
            <option value="todo_user">Todo User</option>
            <option value="team_lead">Team Lead</option>
            <option value="access_admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary">Add User</button>
        </form>
      </div> */}

      <div className="panel-section">
        <h3>Existing Users</h3>
        <div className="users-table">
          <div className="table-header">
            <span>Username</span>
            <span>Current Role</span>
            <span>Actions</span>
          </div>
          {users.map(user => (
            <div key={user.id} className="table-row">
              <span>{user.username}</span>
              <span className="role-badge">{user.roles[0]}</span>
              <select
                value={user.roles[0]}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                className="role-select"
              >
                <option value="todo_user">Todo User</option>
                <option value="team_lead">Team Lead</option>
                <option value="access_admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;