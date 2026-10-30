import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, signIn, signUp, resetPassword, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authModalMode === 'signin') {
        await signIn(email, password);
      } else if (authModalMode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const res = await signUp(email, password, fullName);
        if (res.needEmailConfirm) {
          setSuccessMessage('Registration successful! Please check your email to confirm your account before logging in.');
        }
      } else if (authModalMode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage('Password reset link sent! Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-[#27272a] bg-[#111114] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#71717a] hover:bg-[#18181b] hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            {authModalMode === 'signin' && 'Sign in to CodeEase'}
            {authModalMode === 'signup' && 'Create your CodeEase Account'}
            {authModalMode === 'forgot' && 'Reset your Password'}
          </h2>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            {authModalMode === 'signin' && 'Enter your credentials to resume your coding tracks and earn XP.'}
            {authModalMode === 'signup' && 'Start leveling up, unlock sequential coding challenges, and get certified.'}
            {authModalMode === 'forgot' && "Enter your email address and we'll send you a recovery link."}
          </p>
        </div>

        {/* Database Unconfigured Warning if needed */}
        {!isConfigured && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Supabase Credentials Not Yet Configured</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Authentication requires <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> to be set in your environment variables.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#ccc3d7] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-[#71717a]" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full rounded-lg border border-[#27272a] bg-[#18181b] py-2 pl-9 pr-3 text-xs text-white placeholder-[#71717a] focus:border-[#a78bfa] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#ccc3d7] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-[#71717a]" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full rounded-lg border border-[#27272a] bg-[#18181b] py-2 pl-9 pr-3 text-xs text-white placeholder-[#71717a] focus:border-[#a78bfa] focus:outline-none"
              />
            </div>
          </div>

          {authModalMode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#ccc3d7]">
                  Password
                </label>
                {authModalMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => openAuthModal('forgot')}
                    className="text-[11px] text-[#a78bfa] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-[#71717a]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#27272a] bg-[#18181b] py-2 pl-9 pr-3 text-xs text-white placeholder-[#71717a] focus:border-[#a78bfa] focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#6d28d9] py-2.5 px-4 text-xs font-medium text-white shadow-sm shadow-[#6d28d9]/30 hover:bg-[#8b5cf6] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              <>
                {authModalMode === 'signin' && 'Sign In'}
                {authModalMode === 'signup' && 'Create Account'}
                {authModalMode === 'forgot' && 'Send Recovery Email'}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-6 border-t border-[#27272a] pt-4 text-center text-xs text-[#a1a1aa]">
          {authModalMode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => openAuthModal('signup')}
                className="font-medium text-[#a78bfa] hover:underline"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => openAuthModal('signin')}
                className="font-medium text-[#a78bfa] hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
