import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { baseUrl } from '../utility/deployment';
import { CrudService } from '../api/crudService';

export interface User {
  id: string;
  username: string;
  roles: string[];
}

interface GlobalRole {
  user_id: number;
  role_id: number;
  role_name: string;
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
const url = baseUrl();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{email: string, password: string} | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setPendingAuth({ email, password });
    return true;
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: pendingAuth.email, 
          twoFactorToken: code 
        })
      });

      // setUser({
      //   id: '1',
      //   username: "alice@example.com",
      //   roles: ["Access Admin"]
      // });

      // return true;
      
      if (response.ok) {
        try {
          const data = await response.json();

          const globalRoleResponse = await CrudService.read<GlobalRole[]>(`/user/${data.data.user_id}/global-roles`);
          if (globalRoleResponse.error) throw new Error("[FETCH]: " + globalRoleResponse.error + "\n" + globalRoleResponse.message);
          if (!globalRoleResponse.data || globalRoleResponse.data.status === 'failed') {
            throw new Error("[DATA]: " + (globalRoleResponse.data && 'error' in globalRoleResponse.data ? globalRoleResponse.data.error : 'Unknown error'));
          }

          setUser({
            id: data.data.user_id,
            username: data.data.email,
            roles: [globalRoleResponse.data.data?.[0]?.role_name ?? "User"]
          });

          console.log(data.data.email, globalRoleResponse.data.data[0].role_name);

        } catch (err) {
          console.log("Failed to fetch global roles", err);
        }
        return true;
      }

      setPendingAuth(null);
      return false;
    } catch (error) {
      console.log(error)
    }
  };

  const logout = () => {
    setUser(null);
    setPendingAuth(null);
  };

  const isAuthenticated = true;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      token: "",
      login,
      verify2FA,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};