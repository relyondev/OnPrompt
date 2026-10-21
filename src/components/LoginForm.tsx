import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sun, Moon, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import OnPromptLogo from './OnPromptLogo';

const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(error.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F9FF] dark:bg-[#0B1F44] flex flex-col items-center justify-center p-4 relative page-enter">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute right-6 top-6 w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm transition-transform hover:scale-105"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-yellow-400" />}
      </button>

      <div className="max-w-xs w-full space-y-6">
        {/* Brand lockup */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <OnPromptLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1F44] dark:text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            On Prompt
          </h1>
          <p className="text-xs font-medium text-[#4B6080] dark:text-[#C4D5EC] mt-0.5">by Relyon Dev</p>
          <p className="mt-2 text-xs text-[#4B6080] dark:text-[#C4D5EC] max-w-xs mx-auto leading-relaxed">
            Sign in to access your prompts — clear prompts, bright ideas.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 rounded-2xl shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Prominent Google / Workspace Sign-in Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            id="google-signin-btn"
            className="w-full bg-white dark:bg-[#122C54] border border-[#DCEBFF] dark:border-[#29466D] text-[#0B1F44] dark:text-white py-3 px-4 rounded-xl hover:bg-[#F4F9FF] dark:hover:bg-[#1A3D6B] hover:border-[#6B7F9E] focus:outline-none focus:ring-2 focus:ring-[#0057D6]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2.5 font-medium text-xs group"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* Secure indicator */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fast, secure single sign-on</span>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
            Supports personal @gmail.com & Google Workspace
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
