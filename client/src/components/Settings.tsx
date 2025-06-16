import React, { useState, useEffect } from 'react';
import { CrudService } from '../api/crudService.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

type UserInfo = {
  "id": number,
  "name": string,
  "email": string,
  "password_hash": string,
  "two_fa_secret": string,
  "role_ids": number[],
  "role_names": string[]
};

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await CrudService.read<UserInfo[]>(`/user/${user.id}`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("USER SETTINGS:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      const userData = response.data.data;
      if (userData != null && userData?.length > 0) {
        setUserInfo(userData[0]);
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

      const response = await CrudService.update('/user', user.id, updateData);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("UPDATE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      fetchUserInfo();
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

  const getPrimaryRole = (): string => {
    if ((userInfo?.role_names?.length ?? 0) === 0) return 'User';
    return userInfo.role_names[0];
  };

  if (loading) return <div className="dashboard-content">Loading settings...</div>;

  if (!userInfo) return <div className="dashboard-content">Error loading user settings</div>;

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
          <h3>Account Information</h3>
          <div className="users-table">
            <div className="table-row">
              <strong>Name:</strong>
              <span>{userInfo.name}</span>
            </div>
            <div className="table-row">
              <strong>Email:</strong>
              <span>{userInfo.email}</span>
            </div>
            <div className="table-row">
              <strong>Role:</strong>
              <span className="role-badge">{getPrimaryRole()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;