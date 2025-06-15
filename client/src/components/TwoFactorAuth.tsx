import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from "react-router-dom";
import OTPQRCode from './OTPQRCode';

const TwoFactorAuth: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { verify2FA, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user_id = location.state?.user_id ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await verify2FA(user_id, code);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <>
    {isAuthenticated ? (<div>
            <h1>You are already authenticated</h1>
            <button onClick={()=> navigate('/dashboard')}>
                Go back to dashboard
            </button>
        </div>):
    (
      <>
      {user_id ? (
        <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="123456"
              maxLength={6}
              required
              disabled={loading}
              className="code-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

      </div>
    </div>
      ):(
        <div>
            <h1>Please login first</h1>
            <button onClick={()=> navigate('/login')}>
                Go back to dashboard
            </button>
        </div>
      )}
      </>
    )}
    </>
  );
};

export default TwoFactorAuth;