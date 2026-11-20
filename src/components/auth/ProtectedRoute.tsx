import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { sanitizeReturnTo } from '../../utils/security';
import { AdventureButton, SecondaryButton } from '../common/ReadQuestButtons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireChildProfile?: boolean;
}

/**
 * Fail-closed route guard.
 * - Loading: displays spinner without exposing protected content.
 * - Unavailable: displays honest service-unavailable notice without simulating access.
 * - Unauthenticated: redirects to /login with sanitized returnTo path.
 * - Unauthorized role: blocks access cleanly with navigation back.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { status, user, errorMessage, refreshAuth } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#7C65E8] border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-extrabold text-[#171B3A]">Checking your ReadQuest session...</p>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-7 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF3E8] text-[#C25E28] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-[#171B3A]">
            Account Service Not Connected
          </h1>
          <p className="text-sm font-semibold text-[#5C5E7B] leading-relaxed">
            {errorMessage ||
              'Authentication and private learning progress require an active ReadQuest backend API server.'}
          </p>
          <p className="text-xs font-medium text-[#6B6E8A] bg-[#FAF9FF] p-3 rounded-2xl border border-[#EEE9FF]">
            You can still browse the public Reading Library catalog while the backend service is offline.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <AdventureButton size="sm" onClick={refreshAuth} icon={<RefreshCw className="w-4 h-4" />}>
              Retry Connection
            </AdventureButton>
            <Link to="/library">
              <SecondaryButton size="sm">Browse Curriculum Library</SecondaryButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    const requestedPath = `${location.pathname}${location.search}`;
    const safeReturnTo = sanitizeReturnTo(requestedPath, '/dashboard');
    return <Navigate to={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-7 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEE9FF] text-[#5843C4] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-[#171B3A]">Access Restricted</h1>
          <p className="text-sm font-semibold text-[#5C5E7B]">
            Your signed-in account ({user.role}) does not have access to this educator or administrative view.
          </p>
          <div className="pt-2">
            <Link to="/dashboard">
              <AdventureButton size="sm">Return to Reader Quests</AdventureButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
