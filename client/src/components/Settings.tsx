import React, { useState, useEffect } from 'react';
import { CrudService } from '../api/crudService.ts';

interface UserSettings {
  id: number;
  name: string;
  email: string;
  two_fa_secret: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  user_id: number;
  role_id: number;
  role_name: string;
}

const Settings: React.FC = () => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // You'll need to get this from your auth context/token
  const currentUserId = 1; // Replace with actual user ID from auth

  useEffect(() => {
    fetchUserSettings();
    fetchUserRoles();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await CrudService.read(`/user/${currentUserId}`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("USER SETTINGS:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      const userData = response.data.data;
      if (userData && userData.length > 0) {
        setUserSettings(userData[0]);
        setFormData(prev => ({
          ...prev,
          name: userData[0].name,
          email: userData[0].email
        }));
      }
    } catch (err) {
      console.log("Failed to fetch user settings", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const response = await CrudService.read(`/user/${currentUserId}/global-roles`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("USER ROLES:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setUserRoles(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch user roles", err);
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
    if (formData.name.length < 2) {
      setErrorMessage('Name must be at least 2 characters long');
      setUpdateLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      setUpdateLoading(false);
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      const response = await CrudService.update('/user', currentUserId, updateData);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("UPDATE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      // Refresh user settings
      fetchUserSettings();
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      console.log("Failed to update profile", err);
      setErrorMessage('Failed to update profile');
    } finally {
      setUpdateLoading(false);
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
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
      // You'll need to create a custom endpoint for password changes
      // as it requires special handling with password hashing
      const response = await CrudService.customRequest('/user/change-password', 'POST', {
        user_id: currentUserId,
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      });

      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("PASSWORD CHANGE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setSuccessMessage('Password updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      console.log("Failed to update password", err);
      setErrorMessage('Failed to update password');
    } finally {
      setUpdateLoading(false);
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleToggle2FA = async () => {
    const twoFactorEnabled = !!userSettings?.two_fa_secret;
    
    if (!twoFactorEnabled) {
      setShowQR(true);
    } else {
      try {
        // Remove 2FA secret by updating user with null value
        const response = await CrudService.update('/user', currentUserId, {
          two_fa_secret: null
        });

        if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
        if (response.data == null) return;

        console.log("2FA DISABLE RESPONSE:", response.data);

        if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

        fetchUserSettings(); // Refresh to get updated data
        setSuccessMessage('Two-factor authentication disabled');
      } catch (err) {
        console.log("Failed to disable 2FA", err);
        setErrorMessage('Failed to disable 2FA');
      }
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleEnable2FA = async () => {
    if (twoFactorCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit code');
      return;
    }

    try {
      const response = await CrudService.update('/user', currentUserId, {
        two_fa_secret: 'DEMO_SECRET_' + Date.now()
      });

      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("2FA ENABLE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      fetchUserSettings(); // Refresh to get updated data
      setShowQR(false);
      setTwoFactorCode('');
      setSuccessMessage('Two-factor authentication enabled successfully!');
    } catch (err) {
      console.log("Failed to enable 2FA", err);
      setErrorMessage('Failed to enable 2FA');
    }
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPrimaryRole = (): string => {
    if (userRoles.length === 0) return 'User';
    return userRoles[0].role_name;
  };

  if (loading) return <div className="dashboard-content">Loading settings...</div>;

  if (!userSettings) return <div className="dashboard-content">Error loading user settings</div>;

  const twoFactorEnabled = !!userSettings.two_fa_secret;

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
          <div className="todo-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter name"
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
              Status: <strong style={{ color: twoFactorEnabled ? '#38a169' : '#c53030' }}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </strong>
            </p>
            
            {!showQR ? (
              <button 
                onClick={handleToggle2FA}
                className={twoFactorEnabled ? 'btn-secondary' : 'btn-primary'}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
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
                    <small style={{ color: '#718096' }}>Demo: Use any 6-digit code</small>
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
              <strong>Name:</strong>
              <span>{userSettings.name}</span>
            </div>
            <div className="table-row">
              <strong>Email:</strong>
              <span>{userSettings.email}</span>
            </div>
            <div className="table-row">
              <strong>Role:</strong>
              <span className="role-badge">{getPrimaryRole()}</span>
            </div>
            <div className="table-row">
              <strong>Account Created:</strong>
              <span>{formatDate(userSettings.created_at)}</span>
            </div>
            <div className="table-row">
              <strong>Last Updated:</strong>
              <span>{formatDate(userSettings.updated_at)}</span>
            </div>
            <div className="table-row">
              <strong>2FA Status:</strong>
              <span style={{ color: twoFactorEnabled ? '#38a169' : '#c53030' }}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;