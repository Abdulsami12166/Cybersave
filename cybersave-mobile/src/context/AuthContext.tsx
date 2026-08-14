import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout as logoutAction } from '../redux/slices/authSlice';
import { setAuthToken, apiClient } from '../api/client';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  register: async () => false,
  login: async () => false,
  verifyOtp: async () => false,
  resendOtp: async () => false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const reduxAuth = useSelector((state: any) => state.auth);

  const [user, setUser] = useState<User | null>(reduxAuth?.user || null);
  const [token, setToken] = useState<string | null>(reduxAuth?.token || null);

  useEffect(() => {
    if (reduxAuth?.user) setUser(reduxAuth.user);
    else setUser(null);

    if (reduxAuth?.token) {
      setToken(reduxAuth.token);
      setAuthToken(reduxAuth.token);
    } else {
      setToken(null);
      setAuthToken(null);
    }
  }, [reduxAuth]);

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const res = await apiClient.post('/auth/register', { email, password, fullName });
      return !!res.data.success;
    } catch (e) {
      console.error('Register error:', e);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      return !!res.data.success;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await apiClient.post('/auth/verify-otp', { email, otp });
      if (res.data.accessToken) {
        setUser(res.data.user);
        setToken(res.data.accessToken);
        setAuthToken(res.data.accessToken);
        dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Verify OTP error:', e);
      return false;
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const res = await apiClient.post('/auth/resend-otp', { email });
      return !!res.data.success;
    } catch (e) {
      console.error('Resend OTP error:', e);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    dispatch(logoutAction());
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, register, login, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
