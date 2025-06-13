import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
// import { useAuth } from './contexts/AuthContext.tsx';
import Login from './components/Login.tsx';
import TwoFactorAuth from './components/TwoFactorAuth.tsx';
import Dashboard from './components/Dashboard.tsx';
import './App.css';
import Settings from './components/Settings.tsx';
import { CrudService } from './api/crudService.ts';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = async ({ children }) => {

  // const { isAuthenticated } = useAuth();
  type AuthResponse = { isAuthenticated: true, user_id: number, email: string } | { isAuthenticated: false };
  const res = await CrudService.read<AuthResponse>('/auth')
  // const AUTH_PAGES = ['/login', '/2fa'];

  const isAuthenticated = res?.data?.status === "success" && res?.data?.data?.isAuthenticated;

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
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