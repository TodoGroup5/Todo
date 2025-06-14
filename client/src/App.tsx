import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import Login from './components/Login.tsx';
import TwoFactorAuth from './components/TwoFactorAuth.tsx';
import Dashboard from './components/Dashboard.tsx';
import './App.css';
import Settings from './components/Settings.tsx';
import Setup2FA from './components/Setup2FA.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup-2fa" element={<Setup2FA />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            <Route path="/settings" element={<Settings />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;