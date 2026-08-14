import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/auth/login`, {
        email,
        password
      });

      const { token, admin } = response.data;
      login(token, admin);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Left Panel - Dark Mode */}
      <div className="login-left">
        <div className="login-system-status">
          <span className="status-dot"></span>
          <span>SYSTEM SECURE // NODES ACTIVE</span>
        </div>

        <div className="login-graphic-container">
          <div className="login-graphic-outer"></div>
          <div className="login-graphic-middle"></div>
          <div className="login-graphic-inner"></div>
          <div className="login-graphic-core">
            <Shield size={20} color="#22d3ee" />
          </div>
        </div>

        <div className="login-text-container">
          <h2>Fortified Access</h2>
          <p>
            Multi-layered threat protection and real-time administrative intelligence.
          </p>
        </div>

        <div className="login-footer-left">
          <span>© 2026 Cybersave Inc.</span>
          <span>V4.12.0-PROD</span>
        </div>
        
        {/* Subtle background grid pattern */}
        <div className="login-grid-bg"></div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-content">
              <Shield size={32} color="#2563eb" />
              Cybersave
            </div>
          </div>
          
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <div className="login-field">
              <label className="login-label">
                Admin Email or Username
              </label>
              <div className="login-input-wrap">
                <div className="login-icon-left">
                  <User size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="admin@cybersave.com"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <div className="login-icon-left active">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-pw"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="login-forgot">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Authenticating...' : 'Sign In to Console'}
            </button>

            <div className="login-sso">
              <p>
                Required to use corporate identity? <a href="#">Login with SSO</a>
              </p>
            </div>
          </form>
        </div>

        <div className="login-footer-right">
          <span><Shield size={12}/> AES-256 Encrypted</span>
          <span>•</span>
          <span>Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
