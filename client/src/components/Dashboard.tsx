import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminPanel from './AdminPanel';
import TeamLeadPanel from './TeamLeadPanel';
import UserPanel from './UserPanel';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const hasRole = (role: string) => user.roles.includes(role);

  const renderRoleBasedContent = () => {
    if (hasRole('access_admin')) {
      return <AdminPanel />;
    } else if (hasRole('team_lead')) {
      return <TeamLeadPanel />;
    } else if (hasRole('todo_user')) {
      return <UserPanel />;
    }
    return <div>No role assigned</div>;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user.username}</span>
            <span className="role-badge">
              {user.roles.join(', ')}
            </span>
            <button onClick={logout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {renderRoleBasedContent()}
      </main>
    </div>
  );
};

export default Dashboard;