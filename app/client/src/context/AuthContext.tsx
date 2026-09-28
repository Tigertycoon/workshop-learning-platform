import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken } from '../api';

interface User {
  id: number;
  username: string;
  role: 'kind' | 'admin';
  group_id: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  register: (username: string, pin: string) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('workshop_token');
    if (token) {
      api.me()
        .then(data => setUser(data.user))
        .catch(() => setToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pin: string) => {
    const data = await api.login(username, pin);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, pin: string) => {
    const data = await api.register(username, pin);
    setToken(data.token);
    setUser(data.user);
  };

  const joinGroup = async (code: string) => {
    const data = await api.joinGroup(code);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, joinGroup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
