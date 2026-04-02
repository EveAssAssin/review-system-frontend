import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { User, Employee } from '../types';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (appNumber: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then((res) => {
          setUser(res.data.user);
          setEmployee(res.data.employee);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (appNumber: string) => {
    const res = await authApi.login({ app_number: appNumber });
    const { user, token, employee } = res.data;
    localStorage.setItem('token', token);
    setUser(user);
    setEmployee(employee);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setEmployee(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, employee, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
