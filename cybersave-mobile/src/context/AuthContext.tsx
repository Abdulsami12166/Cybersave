import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout as logoutAction } from '../redux/slices/authSlice';
import { setAuthToken } from '../api/client';
import { authorize, logout as appAuthLogout } from 'react-native-app-auth';

// ponytail: keep keycloak config inline and simple
const keycloakConfig = {
  issuer: process.env.KEYCLOAK_ISSUER || 'https://your-keycloak.com/realms/cybersave',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'Cybersave-app',
  redirectUrl: process.env.KEYCLOAK_REDIRECT_URI || 'cybersave://oauthredirect',
  scopes: ['openid', 'profile', 'email', 'phone'],
};

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
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const reduxAuth = useSelector((state: any) => state.auth);

  const [user, setUser] = useState<User | null>(reduxAuth?.user || null);
  const [token, setToken] = useState<string | null>(reduxAuth?.token || null);
  const [idToken, setIdToken] = useState<string | null>(reduxAuth?.idToken || null);

  useEffect(() => {
    if (reduxAuth?.user) {
      setUser(reduxAuth.user);
    } else {
      setUser(null);
    }
    if (reduxAuth?.token) {
      setToken(reduxAuth.token);
      setAuthToken(reduxAuth.token);
    } else {
      setToken(null);
      setAuthToken(null);
    }
    if (reduxAuth?.idToken) {
      setIdToken(reduxAuth.idToken);
    }
  }, [reduxAuth]);

  const login = async () => {
    try {
      const authState = await authorize(keycloakConfig);
      // Extract sub from jwt or just use dummy user until backend /me call
      const userData = { id: 'keycloak-user', email: 'user@keycloak' } as User;
      
      setUser(userData);
      setToken(authState.accessToken);
      setIdToken(authState.idToken);
      setAuthToken(authState.accessToken);
      
      dispatch(setCredentials({ 
        user: userData as any, 
        accessToken: authState.accessToken, 
        refreshToken: authState.refreshToken,
        idToken: authState.idToken 
      }));
      return true;
    } catch (error) {
      console.error('Keycloak Login Error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (idToken) {
        await appAuthLogout(keycloakConfig, {
          idToken: idToken,
          postLogoutRedirectUrl: keycloakConfig.redirectUrl,
        });
      }
    } catch (err) {
      console.error('Keycloak Logout Error:', err);
    } finally {
      setUser(null);
      setToken(null);
      setIdToken(null);
      setAuthToken(null);
      dispatch(logoutAction());
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
