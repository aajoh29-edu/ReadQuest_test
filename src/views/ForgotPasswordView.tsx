import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { sanitizeErrorMessage, validateEmail } from '../utils/security';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AdventureButton } from '../components/common/ReadQuestButtons';

export const ForgotPasswordView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(emailCheck.normalized);
      setSubmitted(true);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter the email on your parent or educator account and we’ll send a reset link."
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

      {submitted ? (
        <div className="space-y-4">
          <div className="bg-[#E3F9F1] border border-[#65D7B2] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#189B73] font-black text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Check Your Email</span>
            </div>
            <p className="text-sm font-semibold text-[#171B3A] leading-relaxed">
              If an account exists for that email address, we have sent a password reset link that expires shortly for your security.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block text-sm font-black text-[#5843C4] hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-xs font-black uppercase tracking-wider text-[#171B3A] mb-1.5"
            >
              Account Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7C65E8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="parent@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C65E8] focus:outline-hidden text-sm font-bold text-[#171B3A]"
              />
            </div>
          </div>

          <AdventureButton
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            className="w-full justify-center"
            showArrow
          >
            {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
          </AdventureButton>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs font-extrabold text-[#5843C4] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
