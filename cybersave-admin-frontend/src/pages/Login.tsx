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
    <div className="min-h-screen w-full flex bg-[#141B2D]">
      {/* Left Panel - Dark Mode */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-[#0B132B] text-white relative overflow-hidden">
        <div className="absolute top-8 left-8">
          <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM SECURE // NODES ACTIVE</span>
          </div>
        </div>

        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
          <div className="absolute w-full h-full rounded-2xl border border-blue-500/20 bg-blue-500/5"></div>
          <div className="absolute w-3/4 h-3/4 rounded-full border border-cyan-400/30"></div>
          <div className="absolute w-1/2 h-1/2 rounded-full border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.4)]"></div>
          <div className="w-12 h-12 rounded-full bg-[#0B132B] flex items-center justify-center z-10 border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="text-center max-w-md px-8 z-10">
          <h2 className="text-3xl font-bold mb-4">Fortified Access</h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            Multi-layered threat protection and real-time administrative intelligence.
          </p>
        </div>

        <div className="absolute bottom-8 left-8 right-8 flex justify-between text-xs text-slate-500 font-mono">
          <span>© 2026 Cybersave Inc.</span>
          <span>V4.12.0-PROD</span>
        </div>
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex justify-center mb-8">
            <div className="flex items-center text-blue-600 font-bold text-2xl tracking-tight">
              <Shield className="w-8 h-8 mr-2 text-blue-600" />
              Cybersave
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                Admin Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                  placeholder="admin@cybersave.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-blue-200 bg-blue-50/20 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 mt-6"
            >
              {loading ? 'Authenticating...' : 'Sign In to Console'}
            </button>

            <div className="text-center mt-6">
              <p className="text-xs text-slate-500">
                Required to use corporate identity? <a href="#" className="text-blue-600 font-medium">Login with SSO</a>
              </p>
            </div>
          </form>
        </div>

        <div className="absolute bottom-6 flex items-center justify-center space-x-4 text-xs text-slate-400 font-medium">
          <span className="flex items-center"><Shield className="w-3 h-3 mr-1"/> AES-256 Encrypted</span>
          <span>•</span>
          <span>Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
