import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { FloatingBottomNav } from './components/common/FloatingBottomNav';
import { ProfileModal } from './components/common/ProfileModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Footer } from './components/landing/Footer';
import { WelcomeView } from './views/WelcomeView';
import { DashboardView } from './views/DashboardView';
import { LibraryView } from './views/LibraryView';
import { BookLibraryView } from './views/BookLibraryView';
import { BookReaderView } from './views/BookReaderView';
import { ReadAloudView } from './views/ReadAloudView';
import { ActivityPlayerView } from './views/ActivityPlayerView';
import { SessionSummaryView } from './views/SessionSummaryView';
import { ProgressView } from './views/ProgressView';
import { ProfileView } from './views/ProfileView';
import { ParentDashboardView } from './views/ParentDashboardView';
import { TeacherDashboardView } from './views/TeacherDashboardView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { VerifyEmailView } from './views/VerifyEmailView';
import { AccountSettingsView } from './views/AccountSettingsView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsView } from './views/TermsView';
import { LearnerProfile } from './types';

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
