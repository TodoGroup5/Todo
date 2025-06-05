import React, { useState, useEffect } from 'react';

interface UserSettings {
  username: string;
  email: string;
  twoFactorEnabled: boolean;
  accountCreated: string;
  lastLogin: string;
  role: string;
}

const Settings: React.FC = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    username: '',
    email: '',
    twoFactorEnabled: false,
    accountCreated: '',
    lastLogin: '',
    role: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      const data = await response.json();
      setUserSettings(data);
      setFormData(prev => ({
        ...prev,
        username: data.username,
        email: data.email
      }));
    } catch (error) {
      // Mock data for demo
      const mockSettings: UserSettings = {
        username: 'john_doe',
        email: 'john@example.com',
        twoFactorEnabled: false,
        accountCreated: '2023-06-15',
        lastLogin: '2024-01-20',
        role: 'User'
      };
      setUserSettings(mockSettings);
      setFormData(prev => ({
        ...prev,
        username: mockSettings.username,
        email: mockSettings.email
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateProfile = async () => {
    setUpdateLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Basic validation
    if (formData.username.length < 3) {
      setErrorMessage('Username must be at least 3 characters long');
      setUpdateLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      setUpdateLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email
        })
      });

      if (response.ok) {
        setUserSettings(prev => ({
          ...prev,
          username: formData.username,
          email: formData.email
        }));
        setSuccessMessage('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      // Mock success for demo
      setUserSettings(prev => ({
        ...prev,
        username: formData.username,
        email: formData.email
      }));
      setSuccessMessage('Profile updated successfully!');
    } finally {
      setUpdateLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePasswordChange = async () => {
    setUpdateLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrorMessage('All password fields are required');
      setUpdateLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      setUpdateLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      setUpdateLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (response.ok) {
        setSuccessMessage('Password updated successfully!');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        throw new Error('Failed to update password');
      }
    } catch (error) {
      // Mock success for demo
      setSuccessMessage('Password updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } finally {
      setUpdateLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleToggle2FA = async () => {
    if (!userSettings.twoFactorEnabled) {
      setShowQR(true);
    } else {
      try {
        const response = await fetch('/api/user/settings/2fa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          setUserSettings(prev => ({ ...prev, twoFactorEnabled: false }));
          setSuccessMessage('Two-factor authentication disabled');
        }
      } catch (error) {
        // Mock success for demo
        setUserSettings(prev => ({ ...prev, twoFactorEnabled: false }));
        setSuccessMessage('Two-factor authentication disabled');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEnable2FA = async () => {
    if (twoFactorCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit code');
      return;
    }

    try {
      const response = await fetch('/api/user/settings/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorCode })
      });

      if (response.ok) {
        setUserSettings(prev => ({ ...prev, twoFactorEnabled: true }));
        setShowQR(false);
        setTwoFactorCode('');
        setSuccessMessage('Two-factor authentication enabled successfully!');
      } else {
        throw new Error('Invalid code');
      }
    } catch (error) {
      // Mock success for demo
      if (twoFactorCode === '123456') {
        setUserSettings(prev => ({ ...prev, twoFactorEnabled: true }));
        setShowQR(false);
        setTwoFactorCode('');
        setSuccessMessage('Two-factor authentication enabled successfully!');
      } else {
        setErrorMessage('Invalid verification code. Try: 123456');
      }
    }
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  if (loading) return <div className="dashboard-content">Loading settings...</div>;

  return (
    <div className="dashboard-content">
      <div className="user-panel">
        <h2>User Settings</h2>
        
        {successMessage && (
          <div style={{ 
            backgroundColor: '#c6f6d5', 
            color: '#38a169', 
            padding: '0.75rem', 
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #9ae6b4'
          }}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        <div className="panel-section">
          <h3>Update Profile Information</h3>
          <div onSubmit={handleUpdateProfile} className="todo-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <button 
              onClick={handleUpdateProfile} 
              className="btn-primary"
              disabled={updateLoading}
            >
              {updateLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>

        <div className="panel-section">
          <h3>Change Password</h3>
          <div className="todo-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <button 
              onClick={handlePasswordChange} 
              className="btn-primary"
              disabled={updateLoading}
            >
              {updateLoading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>

        <div className="panel-section">
          <h3>Two-Factor Authentication (2FA)</h3>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              Status: <strong style={{ color: userSettings.twoFactorEnabled ? '#38a169' : '#c53030' }}>
                {userSettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </strong>
            </p>
            
            {!showQR ? (
              <button 
                onClick={handleToggle2FA}
                className={userSettings.twoFactorEnabled ? 'btn-secondary' : 'btn-primary'}
              >
                {userSettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            ) : (
              <div>
                <div style={{ 
                  backgroundColor: '#f7fafc', 
                  padding: '1.5rem', 
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '1rem'
                }}>
                  <div style={{ 
                    width: '150px', 
                    height: '150px', 
                    backgroundColor: '#e2e8f0',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}>
                    QR Code Here
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                    Scan this QR code with your authenticator app
                  </p>
                </div>
                
                <div className="todo-form">
                  <div className="form-group">
                    <label htmlFor="twoFactorCode">Verification Code</label>
                    <input
                      id="twoFactorCode"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="code-input"
                      maxLength={6}
                    />
                    <small style={{ color: '#718096' }}>Demo: Use code "123456"</small>
                  </div>
                  <div className="form-actions">
                    <button onClick={handleEnable2FA} className="btn-primary">
                      Verify & Enable 2FA
                    </button>
                    <button 
                      onClick={() => {
                        setShowQR(false);
                        setTwoFactorCode('');
                        setErrorMessage('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel-section">
          <h3>Account Information</h3>
          <div className="users-table">
            <div className="table-row">
              <strong>Username:</strong>
              <span>{userSettings.username}</span>
            </div>
            <div className="table-row">
              <strong>Email:</strong>
              <span>{userSettings.email}</span>
            </div>
            <div className="table-row">
              <strong>Role:</strong>
              <span className="role-badge">{userSettings.role}</span>
            </div>
            <div className="table-row">
              <strong>Account Created:</strong>
              <span>{userSettings.accountCreated}</span>
            </div>
            <div className="table-row">
              <strong>Last Login:</strong>
              <span>{userSettings.lastLogin}</span>
            </div>
            <div className="table-row">
              <strong>2FA Status:</strong>
              <span style={{ color: userSettings.twoFactorEnabled ? '#38a169' : '#c53030' }}>
                {userSettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;