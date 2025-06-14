import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from "react-router-dom";
import OTPQRCode from './OTPQRCode';

const Setup2FA: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setup2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const otpauthURL = location.state?.qrCodeData?.qrCodeUrl ?? "";
  const user_id = location.state?.qrCodeData?.user_id ?? "";

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (code.length !== 6) {
       setError('Please enter a 6-digit code');
       return;
     }
 
     setLoading(true);
     setError('');
 
     try {
       const success = await setup2FA(user_id, code);
       if (success) {
         navigate('/login');
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
    {otpauthURL.length> 0 ? (<div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
        <OTPQRCode otpauthUrl={otpauthURL}/>
          <div className="form-group">  
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
    </div>)
    :
    (
        <div>
            <h1>Please complete registration by setting up two factor authentication!</h1>
            <button onClick={()=> navigate('/login')}>
                Go back to landing page
            </button>
        </div>
    )}
    </>
  );
};

export default Setup2FA;