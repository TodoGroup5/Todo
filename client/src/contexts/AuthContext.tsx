import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{username: string, password: string} | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    setPendingAuth({ username, password });
    return true;
    
    try {
      // Simulate API call
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        setPendingAuth({ username, password });
        return true;
      }
      return false;
    } catch (error) {
      // Simulate successful login for demo
      setPendingAuth({ username, password });
      return true;
    }
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    if (!pendingAuth) return false;

        const mockUser = getMockUser(pendingAuth.username);
      setUser(mockUser);
      setToken('mock-jwt-token-' + Date.now());
      setPendingAuth(null);
      return true;

    try {
      // Simulate API call
      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: pendingAuth.username, 
          password: pendingAuth.password, 
          code 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        setPendingAuth(null);
        return true;
      }
      return false;
    } catch (error) {
      // Simulate successful 2FA for demo
      const mockUser = getMockUser(pendingAuth.username);
      setUser(mockUser);
      setToken('mock-jwt-token-' + Date.now());
      setPendingAuth(null);
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPendingAuth(null);
  };

  const getMockUser = (username: string): User => {
    const userRoles: Record<string, string[]> = {
      'greg': ['access_admin'],
      'dino': ['team_lead'],
      'cindi': ['todo_user']
    };

    return {
      id: '1',
      username,
      roles: userRoles[username] || ['todo_user']
    };
  }; 

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      login,
      verify2FA,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};