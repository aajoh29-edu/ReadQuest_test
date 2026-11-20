import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { authService } from '../services/authService';
import { evaluatePasswordStrength, sanitizeErrorMessage } from '../utils/security';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AdventureButton } from '../components/common/ReadQuestButtons';

export const ResetPasswordView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Strip one-time token from browser address bar after capturing into component state
    if (typeof window !== 'undefined' && searchParams.get('token')) {
      window.history.replaceState({}, document.title, '/reset-password');
    }
  }, [searchParams]);

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('This password reset link is missing or expired. Please request a new reset link.');
      return;
    }
    if (!strength.isValid) {
      setError(`Password must include: ${strength.unmetRequirements.join(', ')}.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.confirmPasswordReset({
        token,
        newPassword,
        confirmNewPassword,
      });
      setIsComplete(true);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a New Password"
      subtitle="Use a strong, unique password to keep your ReadQuest account safe."
    >
      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs font-bold text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isComplete ? (
        <div className="space-y-4">
          <div className="bg-[#E3F9F1] border border-[#65D7B2] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#189B73] font-black text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Password Updated</span>
            </div>
            <p className="text-sm font-semibold text-[#171B3A]">
              Your password has been reset. You can now sign in with your new password.
            </p>
          </div>
          <Link to="/login">
            <AdventureButton size="md" showArrow>
              Go to Sign In
            </AdventureButton>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!token && (
            <div className="bg-[#FFF3E8] border border-[#FFC38E] rounded-2xl p-3.5 text-xs font-bold text-[#9A3412]">
              No reset token was found in this link. Please{' '}
              <Link to="/forgot-password" className="underline font-black">
                request a new password reset email
              </Link>
              .
            </div>
          )}

          <div>
            <label
              htmlFor="reset-new-password"
              className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min 10 characters with upper, lower, number, symbol"
                className="w-full pl-10 pr-12 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#5C5E7B] hover:text-[#171B3A] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <p className="text-[11px] font-bold text-[#5C5E7B] mt-1">
                Strength: {strength.label}
                {!strength.isValid && ` — Add: ${strength.unmetRequirements.join(', ')}`}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
              />
            </div>
          </div>

          <AdventureButton
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            disabled={!token}
            className="w-full justify-center"
            showArrow
          >
            {isSubmitting ? 'Resetting Password...' : 'Save New Password'}
          </AdventureButton>
        </form>
      )}
    </AuthLayout>
  );
};
