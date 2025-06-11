import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // assuming you're using react-router
import type { ReactNode } from 'react';
import { baseUrl } from '../utility/deployment';
import { CrudService } from '../api/crudService';

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
  const [pendingAuth, setPendingAuth] = useState<{ email: string; password: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const navigate = useNavigate();
  // const navigate = _ => null;

  const location = useLocation();

  const login = async (email: string, password: string): Promise<boolean> => {
    setPendingAuth({ email, password });
    return true;
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    // return true;

    try {
      const response = await fetch(`${url}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingAuth?.email,
          twoFactorToken: code,
        }),
        credentials: 'include', // <-- include HttpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.data.user_id,
          username: data.data.email,
          roles: ['access_admin'],
        });
        setPendingAuth(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setPendingAuth(null);
  };

  // Check auth status on load
  useEffect(() => {
    const checkAuth = async () => {
      try {

        type AuthResponse = { isAuthenticated: true, user_id: number, email: string } | { isAuthenticated: false };
        const res = await CrudService.read<AuthResponse>('/auth')
        const AUTH_PAGES = ['/login', '/2fa'];

        if (res.status === 200 && res?.data?.data?.isAuthenticated) {
          console.log(`>>> AUTHENTICATED <<< `)

          // If user is on /login and they are already logged in, redirect to /dashboard
          if (AUTH_PAGES.includes(location.pathname)) {
            navigate('/dashboard', { replace: true });
          }
        } else {
          console.log(`>>> NOT AUTHENTICATED <<< `)

          // Not authenticated: redirect unless already on /login
          if (!AUTH_PAGES.includes(location.pathname)) {
            navigate('/login', { replace: true });
          }
        }
        setAuthChecked(true);
      } catch (err) {
        console.error('Error checking auth:', err);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [location.pathname, navigate]);

  const isAuthenticated = !!user;

  // Avoid rendering children until auth check is done
  if (!authChecked) return null; // or a loading spinner

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token: '',
        login,
        verify2FA,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
