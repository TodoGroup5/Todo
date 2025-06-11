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
  login: (email: string, password: string) => Promise<boolean>;
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
  const [pendingAuth, setPendingAuth] = useState<{email: string, password: string} | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setPendingAuth({ email, password });
    return true;
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    try {
      // Simulate API call
      const response = await fetch('http://localhost:3000/api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: pendingAuth.email, 
          twoFactorToken: code 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.data.user_id,
          username: data.data.email,
          roles: ['todo_user']
        });
        setToken("ddd");
        setPendingAuth(null);
        return true;
      }
      return false;
    } catch (error) {
      console.log(error)
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
      roles: userRoles[username] || ['access_admin']
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