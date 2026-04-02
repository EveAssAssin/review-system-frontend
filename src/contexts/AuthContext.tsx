import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

type Role = 'super_admin' | 'pr_admin' | 'user';

interface User {
  id: string;
  name: string;
  role: Role;
  erpid: string;
  employee_id?: string;
}

interface AuthContextType {
  user: User | null;
  employee: any | null;
  isLoading: boolean;
  login: (appNumber: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isPrAdmin: boolean;
  canManageReviews: boolean; // super_admin 或 pr_admin
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then(res => {
          setUser(res.data.user);
          setEmployee(res.data.employee);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (appNumber: string) => {
    const res = await authApi.login({ app_number: appNumber });
    const { user, token, employee } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setEmployee(employee);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setEmployee(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isPrAdmin = user?.role === 'pr_admin';
  const canManageReviews = isSuperAdmin || isPrAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      employee, 
      isLoading, 
      login, 
      logout, 
      isSuperAdmin, 
      isPrAdmin, 
      canManageReviews 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
