import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClientError } from '../services/apiConfig';
import {
  evaluatePasswordStrength,
  sanitizeErrorMessage,
  validateDisplayName,
  validateEmail,
} from '../utils/security';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AdventureButton } from '../components/common/ReadQuestButtons';

export const SignupView: React.FC = () => {
  const navigate = useNavigate();
  const { register, status } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(password);

  const strengthBarColors = [
    'bg-gray-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-[#7C65E8]',
    'bg-[#189B73]',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    const nameCheck = validateDisplayName(fullName, 2, 60, 'Full name');
    if (!nameCheck.valid && nameCheck.error) {
      nextErrors.fullName = nameCheck.error;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid && emailCheck.error) {
      nextErrors.email = emailCheck.error;
    }

    if (!strength.isValid) {
      nextErrors.password = `Password must include: ${strength.unmetRequirements.join(', ')}.`;
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptedPolicies) {
      nextErrors.acceptedPolicies = 'Please accept the Privacy Policy and Terms of Use.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await register({
        fullName: nameCheck.normalized,
        email: emailCheck.normalized,
        password,
        confirmPassword,
        acceptedPolicies,
      });

      if (response.requiresEmailVerification) {
        setVerificationPendingEmail(emailCheck.normalized);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        setError(err.message);
      } else if (err instanceof ApiClientError && (err.code === 'SERVICE_UNAVAILABLE' || err.code === 'NETWORK_ERROR')) {
        setError(
          'Unable to reach the ReadQuest registration server right now. Please try again once your backend service is connected.'
        );
      } else {
        setError(sanitizeErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationPendingEmail) {
    return (
      <AuthLayout
        title="Check Your Inbox!"
        subtitle="One quick step before your child starts reading."
        mascotMessage="Verify your email address so your family’s progress stays protected."
      >
        <div className="bg-[#E3F9F1] border border-[#65D7B2] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-[#189B73] font-black text-base">
            <CheckCircle2 className="w-5 h-5" />
            <span>Verification Link Sent</span>
          </div>
          <p className="text-sm font-semibold text-[#171B3A] leading-relaxed">
            We sent a verification link to <span className="font-black">{verificationPendingEmail}</span>. Open the link in your inbox to activate your ReadQuest parent account, then add your child’s nickname and reading level.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link to="/login" className="text-sm font-black text-[#5843C4] hover:underline">
            Return to Sign In
          </Link>
          <Link to="/verify-email" className="text-xs font-bold text-[#5C5E7B] hover:text-[#171B3A]">
            Need a new verification link?
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create a Parent Account"
      subtitle="Set up your family account first, then add parent-managed child reader profiles inside."
      mascotMessage="We only ask for a parent or guardian email — never a child’s personal details!"
    >
      {status === 'unavailable' && !error && (
        <div
          role="alert"
          className="bg-[#FFF3E8] border border-[#FFC38E] rounded-2xl p-3.5 text-xs font-bold text-[#9A3412] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            The backend registration service is not currently reachable from this host. Account creation requires an active backend API connection.
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
            htmlFor="signup-name"
            className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
          >
            Parent or Guardian Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-name"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.fullName)}
              maxLength={60}
              required
              placeholder="Your full name"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
            />
          </div>
          {fieldErrors.fullName && (
            <p className="text-xs font-bold text-rose-700 mt-1">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              required
              placeholder="parent@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs font-bold text-rose-700 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              required
              placeholder="At least 10 chars, upper, lower, number, symbol"
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

          {/* Real-time Password Strength Meter */}
          <div className="mt-2 space-y-1.5" aria-live="polite">
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-colors ${
                    strength.score >= step ? strengthBarColors[strength.score] : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-[#5C5E7B]">Strength: {strength.label}</span>
              {!strength.isValid && password.length > 0 && (
                <span className="text-[#9A3412]">
                  Add: {strength.unmetRequirements.join(', ')}
                </span>
              )}
            </div>
          </div>
          {fieldErrors.password && (
            <p className="text-xs font-bold text-rose-700 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              required
              placeholder="Re-enter your password"
              className="w-full pl-10 pr-12 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#5C5E7B] hover:text-[#171B3A] cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs font-bold text-rose-700 mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="flex items-start gap-2.5 text-xs font-semibold text-[#34364B] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPolicies}
              onChange={(e) => setAcceptedPolicies(e.target.checked)}
              className="mt-0.5 rounded border-[#DED5FF] text-[#7C65E8] focus:ring-[#7C65E8] w-4 h-4 cursor-pointer"
            />
            <span>
              I confirm I am a parent, legal guardian, or authorized educator and agree to the{' '}
              <Link to="/privacy" className="text-[#5843C4] font-extrabold hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-[#5843C4] font-extrabold hover:underline">
                Terms of Use
              </Link>
              .
            </span>
          </label>
          {fieldErrors.acceptedPolicies && (
            <p className="text-xs font-bold text-rose-700">{fieldErrors.acceptedPolicies}</p>
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
            {isSubmitting ? 'Creating Account...' : 'Create Parent Account'}
          </AdventureButton>
        </div>
      </form>

      <div className="pt-4 border-t border-[#EEE9FF] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-[#5C5E7B]">
        <span>Already have a ReadQuest account?</span>
        <Link to="/login" className="text-sm font-black text-[#5843C4] hover:underline">
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};
