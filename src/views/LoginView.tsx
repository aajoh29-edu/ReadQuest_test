import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClientError } from '../services/apiConfig';
import { sanitizeErrorMessage, sanitizeReturnTo, validateEmail } from '../utils/security';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AdventureButton } from '../components/common/ReadQuestButtons';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, status } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const safeReturnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/dashboard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nextFieldErrors: { email?: string; password?: string } = {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      nextFieldErrors.email = emailCheck.error;
    }
    if (!password) {
      nextFieldErrors.password = 'Please enter your password.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login({ email: emailCheck.normalized, password });
      navigate(safeReturnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'RATE_LIMITED') {
          setError(
            err.retryAfterSeconds
              ? `Too many sign-in attempts. Please wait ${err.retryAfterSeconds} seconds and try again.`
              : 'Too many sign-in attempts. Please wait a moment and try again.'
          );
        } else if (err.code === 'SERVICE_UNAVAILABLE' || err.code === 'NETWORK_ERROR') {
          setError(
            'Unable to reach the ReadQuest authentication server right now. Please try again when your backend service is connected.'
          );
        } else if (err.code === 'UNAUTHORIZED') {
          setError('Email or password did not match our records. Please try again.');
        } else {
          setError(sanitizeErrorMessage(err));
        }
      } else {
        setError(sanitizeErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back to ReadQuest!"
      subtitle="Your reading adventures are waiting."
      mascotMessage="Parents and educators sign in here to manage reader profiles and view learning progress."
    >
      {status === 'unavailable' && !error && (
        <div
          role="alert"
          className="bg-[#FFF3E8] border border-[#FFC38E] rounded-2xl p-3.5 text-xs font-bold text-[#9A3412] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            The backend authentication service is not currently reachable from this host. Form submission will send credentials securely to the configured API endpoint once connected.
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs font-bold text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
          >
            Parent or Educator Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              required
              placeholder="parent@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
            />
          </div>
          {fieldErrors.email && (
            <p id="login-email-error" className="text-xs font-bold text-rose-700 mt-1">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-black uppercase tracking-wider text-[#171B3A]"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-extrabold text-[#5843C4] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              required
              placeholder="Enter your password"
              className="w-full pl-10 pr-12 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#5C5E7B] hover:text-[#171B3A] hover:bg-[#FAF9FF] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="login-password-error" className="text-xs font-bold text-rose-700 mt-1">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="pt-2">
          <AdventureButton
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            className="w-full justify-center"
            showArrow
          >
            {isSubmitting ? 'Signing In...' : 'Sign In to ReadQuest'}
          </AdventureButton>
        </div>
      </form>

      <div className="pt-4 border-t border-[#EEE9FF] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-[#5C5E7B]">
        <span>New to ReadQuest?</span>
        <Link
          to="/signup"
          className="text-sm font-black text-[#5843C4] hover:underline"
        >
          Create Parent Account
        </Link>
      </div>
    </AuthLayout>
  );
};
