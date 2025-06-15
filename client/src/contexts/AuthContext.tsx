import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { baseUrl } from '../utility/deployment';
import { CrudService } from '../api/crudService';
import { includes } from 'zod/v4';

export interface User {
  id: number;
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
  verify2FA: (user_id: number, code: string) => Promise<boolean>;
  setup2FA: (user_id: number, code: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setIsLoading] = useState(true);
  const [pendingAuth, setPendingAuth] = useState<{email: string, password: string} | null>(null);

  // Run once on mount
  useEffect(() => {
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth', {
        credentials: 'include', // include cookie
      });

      const json = await res.json();
      if (json.status === 'success' && json.data.isAuthenticated) {
        setIsAuthenticated(json.data.isAuthenticated)
        if (!user) {
            const globalRoleResponse = await CrudService.read<GlobalRole[]>(`/user/${json.data.user_id}/global-roles`);
            if (globalRoleResponse.error) throw new Error("[FETCH]: " + globalRoleResponse.error + "\n" + globalRoleResponse.message);
            if (!globalRoleResponse.data || globalRoleResponse.data.status === 'failed') {
              throw new Error("[DATA]: " + (globalRoleResponse.data && 'error' in globalRoleResponse.data ? globalRoleResponse.data.error : 'Unknown error'));
            }

            setUser({
            username: json.data.username,
            roles: [globalRoleResponse.data.data?.[0]?.role_name ?? "User"],
            id: json.data.user_id
          })
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false); // always run this
    }
  };

  checkAuth();
}, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setPendingAuth({ email, password });
    return true;
  };

  const setup2FA = async (user_id: number, code: string): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/signup/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          user_id
        })
      });

      
      if (response.ok) {
        try {
          const data = await response.json();


          console.log(data)

        } catch (err) {
          console.log("Failed to fetch user", err);
        }
        return true;
      }

      setPendingAuth(null);
      return false;
    } catch (error) {
      console.log(error)
    }
  };

  const verify2FA = async (user_id: number, code: string): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          user_id
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
            username: data.data.name,
            roles: [globalRoleResponse.data.data?.[0]?.role_name ?? "User"]
          });
          setIsAuthenticated(true);

          console.log(globalRoleResponse.data.data[0].role_name);

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
    setIsAuthenticated(false);
    fetch(`${url}/logout`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => console.log(data.message));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      token: "",
      login,
      verify2FA,
      setup2FA,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};