import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { FloatingBottomNav } from './components/common/FloatingBottomNav';
import { ProfileModal } from './components/common/ProfileModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Footer } from './components/landing/Footer';
import { LearnerProfile } from './types';

const WelcomeView = lazy(() => import('./views/WelcomeView').then(({ WelcomeView }) => ({ default: WelcomeView })));
const DashboardView = lazy(() => import('./views/DashboardView').then(({ DashboardView }) => ({ default: DashboardView })));
const LibraryView = lazy(() => import('./views/LibraryView').then(({ LibraryView }) => ({ default: LibraryView })));
const BookLibraryView = lazy(() => import('./views/BookLibraryView').then(({ BookLibraryView }) => ({ default: BookLibraryView })));
const BookReaderView = lazy(() => import('./views/BookReaderView').then(({ BookReaderView }) => ({ default: BookReaderView })));
const ReadAloudView = lazy(() => import('./views/ReadAloudView').then(({ ReadAloudView }) => ({ default: ReadAloudView })));
const ActivityPlayerView = lazy(() => import('./views/ActivityPlayerView').then(({ ActivityPlayerView }) => ({ default: ActivityPlayerView })));
const SessionSummaryView = lazy(() => import('./views/SessionSummaryView').then(({ SessionSummaryView }) => ({ default: SessionSummaryView })));
const ProgressView = lazy(() => import('./views/ProgressView').then(({ ProgressView }) => ({ default: ProgressView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(({ ProfileView }) => ({ default: ProfileView })));
const ParentDashboardView = lazy(() => import('./views/ParentDashboardView').then(({ ParentDashboardView }) => ({ default: ParentDashboardView })));
const TeacherDashboardView = lazy(() => import('./views/TeacherDashboardView').then(({ TeacherDashboardView }) => ({ default: TeacherDashboardView })));
const LoginView = lazy(() => import('./views/LoginView').then(({ LoginView }) => ({ default: LoginView })));
const SignupView = lazy(() => import('./views/SignupView').then(({ SignupView }) => ({ default: SignupView })));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView').then(({ ForgotPasswordView }) => ({ default: ForgotPasswordView })));
const ResetPasswordView = lazy(() => import('./views/ResetPasswordView').then(({ ResetPasswordView }) => ({ default: ResetPasswordView })));
const VerifyEmailView = lazy(() => import('./views/VerifyEmailView').then(({ VerifyEmailView }) => ({ default: VerifyEmailView })));
const AccountSettingsView = lazy(() => import('./views/AccountSettingsView').then(({ AccountSettingsView }) => ({ default: AccountSettingsView })));
const PrivacyPolicyView = lazy(() => import('./views/PrivacyPolicyView').then(({ PrivacyPolicyView }) => ({ default: PrivacyPolicyView })));
const TermsView = lazy(() => import('./views/TermsView').then(({ TermsView }) => ({ default: TermsView })));

function RouteLoadingState() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-12 w-12 rounded-full border-4 border-[#DED5FF] border-t-[#7C65E8] motion-safe:animate-spin"
        aria-hidden="true"
      />
      <p className="font-extrabold text-[#5843C4]">Opening your next reading adventure...</p>
    </div>
  );
}

function AppShell() {
  const { activeChild, updateChildProfile, refreshAuth } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleSaveProfile = async (updates: Partial<LearnerProfile>) => {
    if (!activeChild) return;
    await updateChildProfile(activeChild.id, {
      displayName: updates.name,
      avatar: updates.avatar,
      avatarName: updates.avatarName,
      readingLevelId: updates.readingLevelId,
      ageBandOrGrade: updates.gradeLevel,
    });
  };

  return (
    <div className="min-h-screen readquest-bg flex flex-col text-[#34364B] selection:bg-[#FFAE80]/40 relative">
      {/* Global Navigation Header */}
      <Navbar onOpenProfileModal={() => setIsProfileModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoadingState />}>
          <Routes>
          {/* Public Landing, Curriculum Library & Policy Routes */}
          <Route path="/" element={<WelcomeView />} />
          <Route path="/welcome" element={<WelcomeView />} />
          <Route path="/library" element={<LibraryView />} />
          <Route path="/books" element={<BookLibraryView />} />
          <Route path="/books/:bookId" element={<BookReaderView />} />
          <Route path="/privacy" element={<PrivacyPolicyView />} />
          <Route path="/terms" element={<TermsView />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/signup" element={<SignupView />} />
          <Route path="/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="/verify-email" element={<VerifyEmailView />} />

          {/* Protected Learner & Family Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView
                  profile={activeChild}
                  onRefreshProfile={refreshAuth}
                  onOpenProfileModal={() => setIsProfileModalOpen(true)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:lessonId"
            element={
              <ProtectedRoute>
                <ActivityPlayerView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/read-aloud/:activityId"
            element={
              <ProtectedRoute>
                <ReadAloudView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary/:sessionId"
            element={
              <ProtectedRoute>
                <SessionSummaryView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileView onRefreshGlobalProfile={refreshAuth} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountSettingsView />
              </ProtectedRoute>
            }
          />

          {/* Role-Protected Adult & Educator Portals */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <ParentDashboardView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboardView />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Floating Mobile Bottom Navigation Bar */}
      <FloatingBottomNav />

      {/* ReadQuest Footer */}
      <Footer />

      {/* Profile Customizer Modal (Authenticated Child Only) */}
      {activeChild && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={activeChild}
          onSaveProfile={handleSaveProfile}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
