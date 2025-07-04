import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminPanel from './AdminPanel';
import TeamLeadPanel from './TeamLeadPanel';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const hasRole = (role: string) => user.roles.includes(role);

  const renderRoleBasedContent = () => {
    if (hasRole('Access Admin')) {
      return <AdminPanel />;
    } else if (hasRole('User')) {
      return <TeamLeadPanel />
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
            <span className="role-badge">{user.roles.join(', ')}</span>
            <button onClick={() => navigate('/settings')} className="btn-secondary">
              Settings
            </button>
            <button onClick={() => {logout(); navigate('/login')  }} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">{renderRoleBasedContent()}</main>
    </div>
  );
};

export default Dashboard;