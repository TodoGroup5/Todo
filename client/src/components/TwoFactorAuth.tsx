import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from "react-router-dom";
import OTPQRCode from './OTPQRCode';

const TwoFactorAuth: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { verify2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { otpauthUrl } = location.state || {};
  console.log(otpauthUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await verify2FA(code);
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
    <div className="auth-container">
      <div className="auth-card">
        <OTPQRCode otpauthUrl={otpauthUrl}/>
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

        <div className="demo-info">
          <p><small>Demo: Enter any 6-digit code (e.g., 123456)</small></p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;