import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { sanitizeErrorMessage, validateEmail } from '../utils/security';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AdventureButton } from '../components/common/ReadQuestButtons';

export const VerifyEmailView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token') || '');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (typeof window !== 'undefined' && searchParams.get('token')) {
      window.history.replaceState({}, document.title, '/verify-email');
    }

    let mounted = true;
    authService
      .verifyEmail(token)
      .then((res) => {
        if (!mounted) return;
        setVerifyStatus('verified');
        setVerifyMessage(res.message || 'Your email address has been verified!');
      })
      .catch((err) => {
        if (!mounted) return;
        setVerifyStatus('error');
        setVerifyMessage(sanitizeErrorMessage(err, 'Verification link is invalid or expired.'));
      });

    return () => {
      mounted = false;
    };
  }, [token, searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    const check = validateEmail(resendEmail);
    if (!check.valid) {
      setResendError(check.error || 'Please enter a valid email address.');
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerificationEmail(check.normalized);
      setResendSent(true);
    } catch (err) {
      setResendError(sanitizeErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Confirming your parent or educator email keeps your family’s account secure."
    >
      {verifyStatus === 'verifying' && (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-4 border-[#7C65E8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-extrabold text-[#171B3A]">Verifying your email link...</p>
        </div>
      )}

      {verifyStatus === 'verified' && (
        <div className="space-y-4">
          <div className="bg-[#E3F9F1] border border-[#65D7B2] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#189B73] font-black text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Email Verified</span>
            </div>
            <p className="text-sm font-semibold text-[#171B3A]">{verifyMessage}</p>
          </div>
          <Link to="/login">
            <AdventureButton size="md" showArrow>
              Continue to Sign In
            </AdventureButton>
          </Link>
        </div>
      )}

      {(verifyStatus === 'error' || verifyStatus === 'idle') && (
        <div className="space-y-5">
          {verifyStatus === 'error' && verifyMessage && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs font-bold text-rose-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verifyMessage}</span>
            </div>
          )}

          {resendSent ? (
            <div className="bg-[#E3F9F1] border border-[#65D7B2] rounded-2xl p-4 text-xs font-bold text-[#189B73]">
              If that email matches an unverified ReadQuest account, we’ve sent a fresh verification link.
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-3" noValidate>
              <label
                htmlFor="resend-email"
                className="block text-xs font-black uppercase tracking-wider text-[#171B3A]"
              >
                Resend Verification Link
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  placeholder="parent@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
                />
              </div>
              {resendError && <p className="text-xs font-bold text-rose-700">{resendError}</p>}
              <AdventureButton type="submit" size="md" isLoading={isResending} className="w-full justify-center">
                {isResending ? 'Sending...' : 'Send Verification Email'}
              </AdventureButton>
            </form>
          )}

          <div className="text-center">
            <Link to="/login" className="text-xs font-extrabold text-[#5843C4] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
