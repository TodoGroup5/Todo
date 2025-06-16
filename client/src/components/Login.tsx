import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrudService } from '../api/crudService.ts';

interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

interface loginResponse {
  qrCodeUrl: string;
  user_id: number,
  email: string,
}

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [setup2FAMessage, set2FAMessage] = useState('');
  const navigate = useNavigate();
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [signupData, setSignupData] = useState<SignupData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });

  const handleLoginSubmit = async () => {
    setLoading(true);
    setError('');

    const signInData = {
      email: loginData.email,
      password: loginData.password,
    };

    if (!signInData.email || !signInData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await CrudService.create<typeof signInData, loginResponse>('/login', signInData);
      
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
      }
      
      if (response.data == null) {
        throw new Error("No response data received");
      }

      console.log("LOGIN RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
      }

      console.log("QR URL: ", response.data.data.qrCodeUrl);

      navigate("/2fa", {
        state: {
          qrCodeUrl: response.data.data.qrCodeUrl, 
          user_id: response.data.data.user_id 
        }
      })
      
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoginData({ email: '', password: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!signupData.name || !signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (signupData.name.length < 3) {
      setError('Username must be at least 3 characters long');
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (signupData.password.length < 8) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password
      };

      const response = await CrudService.create<typeof userData, {user_id:string}>('/signup', userData);
      
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
      }
      
      if (response.data == null) {
        throw new Error("No response data received");
      }

      console.log("SIGNUP RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
      }
      
      setSuccessMessage('Account created successfully! Please log in.');
      setSignupData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user'
      });
      
      set2FAMessage('Account created successfully. Set up 2FA by scanning the QR code.');
    } catch (err) {
      console.log("Could not create user account", err);
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setLoginData({ email: '', password: '' });
    setSignupData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user'
    });
  };

  const handleLoginInputChange = (field: keyof typeof loginData, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignupInputChange = (field: keyof SignupData, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLogin ? 'Login' : 'Create Account'}</h2>

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {isLogin ? (       
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="text"
                  value={loginData.email}
                  onChange={(e) => handleLoginInputChange('email', e.target.value)}
                  disabled={loading}
                  placeholder="Enter your email address"
                  maxLength={256}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => handleLoginInputChange('password', e.target.value)}
                  disabled={loading}
                  placeholder="Enter your password"
                  maxLength={256}
                />
              </div>

              <button 
                onClick={handleLoginSubmit}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          ) : (
           <>
           {setup2FAMessage.length=== 0 &&(
             <div className="auth-form">
              <div className="form-group">
                <label htmlFor="signup-username">Username</label>
                <input
                  id="signup-username"
                  type="text"
                  value={signupData.name}
                  onChange={(e) => handleSignupInputChange('name', e.target.value)}
                  disabled={loading}
                  placeholder="Choose a username"
                  maxLength={64}
                />
              </div>

              <div className="form-group">
                <label htmlFor="signup-email">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => handleSignupInputChange('email', e.target.value)}
                  disabled={loading}
                  placeholder="Enter your email"
                  maxLength={256}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => handleSignupInputChange('password', e.target.value)}
                  disabled={loading}
                  placeholder="Create a password"
                  maxLength={256}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => handleSignupInputChange('confirmPassword', e.target.value)}
                  disabled={loading}
                  placeholder="Confirm your password"
                  maxLength={256}
                />
              </div>

                <button 
                onClick={handleSignupSubmit}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

            </div>
           )}
           </>
          )}
          
          <div className="toggle-section">
            <p className="toggle-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={toggleMode}
                className="btn-link"
                style={{ marginLeft: '0.5rem' }}
              >
                {isLogin ? 'Sign up here' : 'Login here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;